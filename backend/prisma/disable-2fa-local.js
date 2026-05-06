import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function databaseLooksLocal(url) {
  if (!url || typeof url !== 'string') return false;
  return (
    url.includes('localhost') ||
    url.includes('127.0.0.1') ||
    url.includes('[::1]') ||
    url.includes('@::1')
  );
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!databaseLooksLocal(url)) {
    console.error(
      'Refusing to run: DATABASE_URL must point at a local database (localhost / 127.0.0.1).'
    );
    process.exit(1);
  }

  const result = await prisma.user.updateMany({
    data: { twoFactorEnabled: false, twoFactorSecret: null },
  });

  console.log(`Disabled 2FA and cleared secrets for ${result.count} user(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
