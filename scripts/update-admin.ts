
import '@/lib/env';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  const args = process.argv.slice(2);
  const email = args[0];
  const password = args[1];

  if (!email || !password) {
    console.error('Usage: npx tsx scripts/update-admin.ts <email> <new_password>');
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
      },
    });
    console.log(`Successfully updated password for user: ${user.email}`);
  } catch (error) {
    console.error(`Error updating user: ${error}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
