import prisma from './prisma';

export async function getActiveScheduledTemplates() {
  return prisma.scheduledTemplate.findMany({
    where: { isActive: true },
  });
}

export async function queueScheduledMessagesForNow(
  ministryId: string,
  now: Date = new Date()
) {
  const templates = await getActiveScheduledTemplates();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requestsToCreate = templates.map((template: any) => {
    return prisma.messageRequest.create({
      data: {
        ministryId,
        programName: template.name,
        messageContent: template.messageContent,
        targetSegments: template.targetSegments,
        sendImmediately: false,
        scheduledAt: now,
        status: 'SCHEDULED',
      },
    });
  });

  if (!requestsToCreate.length) {
    return [];
  }

  const created = await prisma.$transaction(requestsToCreate);
  return created;
}

