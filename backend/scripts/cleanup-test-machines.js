import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning up test machines...');

  // Test machine serial numbers from seed file
  const testSerialNumbers = [
    'CPR-001',
    'CPR-002',
    'CPR-003',
    'CPR-004',
    'CPR-005',
    'CPR-006',
    'CPR-007',
    'CPR-008',
    'CPR-009',
    'CPR-010',
  ];

  // Find machines with these serial numbers
  const machines = await prisma.machine.findMany({
    where: {
      machineSerialNumber: {
        in: testSerialNumbers,
      },
    },
    include: {
      readings: true,
    },
  });

  console.log(`Found ${machines.length} test machines to delete`);

  // Delete readings first (cascade should handle this, but being explicit)
  for (const machine of machines) {
    if (machine.readings.length > 0) {
      await prisma.reading.deleteMany({
        where: {
          machineId: machine.id,
        },
      });
      console.log(`Deleted ${machine.readings.length} readings for ${machine.machineSerialNumber}`);
    }
  }

  // Delete machines
  const result = await prisma.machine.deleteMany({
    where: {
      machineSerialNumber: {
        in: testSerialNumbers,
      },
    },
  });

  console.log(`Deleted ${result.count} test machines`);
  console.log('Cleanup complete!');
}

main()
  .catch((e) => {
    console.error('Cleanup failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
