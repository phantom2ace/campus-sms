import { DeliveryStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import { normalizeGhanaPhone } from '@/lib/phoneNormalizer';
import { sendBulkSms } from '@/lib/texify';
import { format } from 'date-fns';

export async function sendRequestMessages(requestId: string) {
  const request = await prisma.messageRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new Error('Request not found');
  }

  // Ensure arrays are initialized if null (though Prisma usually returns empty arrays for String[])
  // Cast to any to bypass stale type definition if needed
  const r = request as any;
  const targetSegments = r.targetSegments || [];
  const targetLevels = r.targetLevels || [];
  const specificPhoneNumbers = r.specificPhoneNumbers || [];

  if (targetSegments.length === 0 && targetLevels.length === 0 && specificPhoneNumbers.length === 0) {
    throw new Error('Request has no target segments, levels, or specific numbers');
  }

  const whereClause: any = {
    isActive: true,
  };

  // If the request belongs to a specific ministry, only target members of that ministry.
  // Exception: Administration (Admin) can target everyone.
  const ministry = await prisma.ministry.findUnique({
    where: { id: request.ministryId },
  });

  if (ministry && ministry.name !== 'Administration') {
    whereClause.ministries = {
      some: { id: ministry.id },
    };
  }

  const conditions: any[] = [];

  if (targetSegments.length > 0) {
    conditions.push({
      segment: {
        name: { in: targetSegments },
      },
    });
  }

  if (targetLevels.length > 0) {
    conditions.push({
      level: { in: targetLevels },
    });
  }

  if (specificPhoneNumbers.length > 0) {
    conditions.push({
      phone: { in: specificPhoneNumbers },
    });
  }

  // Only add OR condition if there are actual conditions to filter by
  // If no segments, levels, or specific numbers are provided, we shouldn't be here (checked above)
  // BUT if specific numbers are provided but don't match contacts, we still want to query contacts that match segments/levels if any
  // If specific numbers ONLY, and no segments/levels, we only want contacts matching those numbers.
  // The logic is: (In Segment) OR (In Level) OR (Is Specific Number)
  if (conditions.length > 0) {
    whereClause.OR = conditions;
  } else {
    // Should be unreachable due to check at line 21, but for safety:
    // If no conditions, DO NOT match all contacts. Match none.
    // However, since we throw error if all are empty, we can assume at least one exists.
    // But if arrays are non-empty but conditions not pushed (e.g. empty strings?), we might have issues.
    // Let's force a failure condition if logic slips through.
    whereClause.OR = [{ id: 'NEVER_MATCH' }]; 
  }

  const contacts = await prisma.contact.findMany({
    where: whereClause,
    select: {
      id: true,
      phone: true,
    },
  });

  const contactPhones = new Set(contacts.map((c: { phone: string }) => c.phone));
  
  // Filter out any specific numbers that were already found as contacts
  // This avoids duplicates if a number is both in a segment and manually added
  const adhocNumbers = (specificPhoneNumbers as string[]).filter(
    (num) => !contactPhones.has(num)
  );

  const recipients = Array.from(new Set([...Array.from(contactPhones), ...adhocNumbers]));

  if (!recipients.length) {
    throw new Error('No active contacts or valid numbers for selected targets');
  }

  const sendResult = await sendBulkSms(recipients, request.messageContent);
  const texifyRef =
    typeof sendResult.id === 'string' ? sendResult.id : null;
  const now = new Date();

  const deliveryData = [
    ...contacts.map((contact: { id: string; phone: string }) => ({
      requestId,
      contactId: contact.id,
      recipientPhone: contact.phone,
      status: DeliveryStatus.PENDING,
      texifyRef,
      sentAt: now,
    })),
    ...adhocNumbers.map((phone) => ({
      requestId,
      contactId: null,
      recipientPhone: phone,
      status: DeliveryStatus.PENDING,
      texifyRef,
      sentAt: now,
    })),
  ];

  await prisma.$transaction([
    prisma.messageRequest.update({
      where: { id: requestId },
      data: {
        status: 'SENT',
        sentAt: now,
        creditsUsed: recipients.length,
      },
    }),
    // @ts-ignore - DeliveryStatus enum might cause type issues with string 'PENDING'
    prisma.deliveryRecord.createMany({
      data: deliveryData,
      skipDuplicates: true,
    }),
  ]);

  return {
    requestId,
    recipients: recipients.length,
    texifyRef,
  };
}

export async function resendFailedDeliveries(requestId: string) {
  const request = await prisma.messageRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new Error('Request not found');
  }

  const failedDeliveries = await prisma.deliveryRecord.findMany({
    where: {
      requestId,
      status: 'FAILED',
    },
    include: { contact: true },
  });

  if (!failedDeliveries.length) {
    return {
      requestId,
      recipients: 0,
    };
  }

  const recipients = Array.from(
    new Set<string>(
      failedDeliveries
        .filter((d) => d.contact !== null)
        .map((d) => d.contact!.phone)
    )
  );

  const sendResult = await sendBulkSms(recipients, request.messageContent);
  const texifyRef =
    typeof sendResult.id === 'string' ? sendResult.id : null;
  const now = new Date();

  await prisma.$transaction([
    prisma.deliveryRecord.updateMany({
      where: {
        id: {
          in: failedDeliveries.map((d) => d.id),
        },
      },
      data: {
        status: DeliveryStatus.PENDING,
        texifyRef,
        sentAt: now,
      },
    }),
    prisma.messageRequest.update({
      where: { id: requestId },
      data: {
        status: 'PARTIALLY_FAILED',
      },
    }),
  ]);

  return {
    requestId,
    recipients: recipients.length,
    texifyRef,
  };
}
