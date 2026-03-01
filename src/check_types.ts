
import { Prisma } from '@prisma/client';

type ContactPayload = Prisma.ContactGetPayload<{}>;

const nameKey: keyof ContactPayload = 'name';
const levelKey: keyof ContactPayload = 'level';
