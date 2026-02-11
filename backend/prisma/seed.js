import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: adminPassword,
      name: 'System Admin',
      role: 'admin',
    },
  });
  console.log('Created admin user:', admin.email);

  // Create management user
  const managementPassword = await bcrypt.hash('management123', 12);
  const management = await prisma.user.upsert({
    where: { email: 'management@example.com' },
    update: {},
    create: {
      email: 'management@example.com',
      passwordHash: managementPassword,
      name: 'Management User',
      role: 'management',
    },
  });
  console.log('Created management user:', management.email);

  // Create regular user
  const userPassword = await bcrypt.hash('user123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      passwordHash: userPassword,
      name: 'Regular User',
      role: 'user',
    },
  });
  console.log('Created regular user:', user.email);

  // Create meter user
  const meterUserPassword = await bcrypt.hash('meter123', 12);
  const meterUser = await prisma.user.upsert({
    where: { email: 'meter@example.com' },
    update: {},
    create: {
      email: 'meter@example.com',
      passwordHash: meterUserPassword,
      name: 'Meter User',
      role: 'meter_user',
      branch: 'JHB',
    },
  });
  console.log('Created meter user:', meterUser.email);

  // Create sales agent
  const salesAgentPassword = await bcrypt.hash('sales123', 12);
  const salesAgent = await prisma.user.upsert({
    where: { email: 'sales@example.com' },
    update: {},
    create: {
      email: 'sales@example.com',
      passwordHash: salesAgentPassword,
      name: 'Sales Agent',
      role: 'sales_agent',
      branch: 'JHB',
    },
  });
  console.log('Created sales agent:', salesAgent.email);

  // Create sample machines
  const machines = [
    {
      machineSerialNumber: 'CPR-001',
      customer: 'Reception Area Copier',
      model: 'Canon iR-ADV C5535',
      contractReference: 'CTR-2024-001',
      monoEnabled: true,
      colourEnabled: true,
      scanEnabled: true,
    },
    {
      machineSerialNumber: 'CPR-002',
      customer: 'Finance Department',
      model: 'Xerox VersaLink C7030',
      contractReference: 'CTR-2024-001',
      monoEnabled: true,
      colourEnabled: true,
      scanEnabled: true,
    },
    {
      machineSerialNumber: 'CPR-003',
      customer: 'HR Department',
      model: 'HP LaserJet Pro M404dn',
      contractReference: 'CTR-2024-002',
      monoEnabled: true,
      colourEnabled: false,
      scanEnabled: false,
    },
    {
      machineSerialNumber: 'CPR-004',
      customer: 'Marketing Department',
      model: 'Konica Minolta bizhub C658',
      contractReference: 'CTR-2024-003',
      monoEnabled: true,
      colourEnabled: true,
      scanEnabled: true,
    },
    {
      machineSerialNumber: 'CPR-005',
      customer: 'IT Department',
      model: 'Brother MFC-L8900CDW',
      contractReference: 'CTR-2024-002',
      monoEnabled: true,
      colourEnabled: true,
      scanEnabled: false,
    },
    {
      machineSerialNumber: 'CPR-006',
      customer: 'Sales Floor - East',
      model: 'Ricoh MP C4504',
      contractReference: 'CTR-2024-004',
      monoEnabled: true,
      colourEnabled: true,
      scanEnabled: true,
    },
    {
      machineSerialNumber: 'CPR-007',
      customer: 'Sales Floor - West',
      model: 'Ricoh MP C4504',
      contractReference: 'CTR-2024-004',
      monoEnabled: true,
      colourEnabled: true,
      scanEnabled: true,
    },
    {
      machineSerialNumber: 'CPR-008',
      customer: 'Warehouse Office',
      model: 'HP LaserJet Pro M404dn',
      contractReference: 'CTR-2024-005',
      monoEnabled: true,
      colourEnabled: false,
      scanEnabled: false,
    },
    {
      machineSerialNumber: 'CPR-009',
      customer: 'Executive Suite',
      model: 'Canon imageRUNNER ADVANCE DX C5860i',
      contractReference: 'CTR-2024-006',
      monoEnabled: true,
      colourEnabled: true,
      scanEnabled: true,
    },
    {
      machineSerialNumber: 'CPR-010',
      customer: 'Legal Department',
      model: 'Xerox AltaLink C8155',
      contractReference: 'CTR-2024-007',
      monoEnabled: true,
      colourEnabled: true,
      scanEnabled: true,
    },
  ];

  for (const machineData of machines) {
    const machine = await prisma.machine.upsert({
      where: { machineSerialNumber: machineData.machineSerialNumber },
      update: machineData,
      create: machineData,
    });
    console.log('Created machine:', machine.machineSerialNumber);
  }

  // Create some historical readings for last month
  const now = new Date();
  const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

  const allMachines = await prisma.machine.findMany();

  for (const machine of allMachines) {
    const reading = {
      machineId: machine.id,
      year: lastMonthYear,
      month: lastMonth,
      monoReading: machine.monoEnabled ? Math.floor(Math.random() * 50000) + 10000 : null,
      colourReading: machine.colourEnabled ? Math.floor(Math.random() * 20000) + 5000 : null,
      scanReading: machine.scanEnabled ? Math.floor(Math.random() * 10000) + 1000 : null,
        monoUsage: machine.monoEnabled ? Math.floor(Math.random() * 3000) + 500 : null,
        colourUsage: machine.colourEnabled ? Math.floor(Math.random() * 1500) + 200 : null,
        scanUsage: machine.scanEnabled ? Math.floor(Math.random() * 800) + 100 : null,
        capturedBy: admin.id,
    };

    await prisma.reading.upsert({
      where: {
        machineId_year_month: {
          machineId: machine.id,
          year: lastMonthYear,
          month: lastMonth,
        },
      },
      update: reading,
      create: reading,
    });
  }

  console.log('Created historical readings for last month');
  console.log('Seeding completed!');
  console.log('\nTest credentials:');
  console.log('  Admin: admin@example.com / admin123');
  console.log('  User:  user@example.com / user123');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
