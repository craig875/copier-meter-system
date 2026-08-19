import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const user = await prisma.user.findFirst({ where: { email: 'craig@pancom.co.za' } });
if (!user) { console.error('User not found'); process.exit(1); }
console.log('Found user:', user.email);

const financeKeys = [
  'finance.billing.view',
  'finance.billing.process',
  'finance.billing.save',
  'finance.billing.delete',
  'finance.lookup.view',
  'finance.lookup.manage',
  'finance.exclusions.view',
  'finance.exclusions.manage',
];

for (const permissionKey of financeKeys) {
  await prisma.userPermissionOverride.upsert({
    where: { userId_permissionKey: { userId: user.id, permissionKey } },
    update: { effect: 'GRANT' },
    create: { userId: user.id, permissionKey, effect: 'GRANT' },
  });
  console.log('Granted:', permissionKey);
}

console.log('Done — granted', financeKeys.length, 'finance permissions to', user.email);
await prisma.$disconnect();