import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const machines = await prisma.machine.findMany();
  console.log(`Total machines: ${machines.length}`);
  
  if (machines.length === 0) {
    console.log('No machines found in database');
  } else {
    machines.forEach(m => {
      console.log(`- ${m.machineSerialNumber} (Active: ${m.isActive}, Decommissioned: ${m.isDecommissioned})`);
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
