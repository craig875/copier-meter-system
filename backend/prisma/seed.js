import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user (always update password so demo credentials work after re-seed)
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { passwordHash: adminPassword, name: 'System Admin', role: 'admin' },
    create: {
      email: 'admin@example.com',
      passwordHash: adminPassword,
      name: 'System Admin',
      role: 'admin',
    },
  });
  console.log('Created admin user:', admin.email);

  // Create management user (always update password so demo credentials work after re-seed)
  const managementPassword = await bcrypt.hash('management123', 12);
  const management = await prisma.user.upsert({
    where: { email: 'management@example.com' },
    update: { passwordHash: managementPassword, name: 'Management User', role: 'management' },
    create: {
      email: 'management@example.com',
      passwordHash: managementPassword,
      name: 'Management User',
      role: 'management',
    },
  });
  console.log('Created management user:', management.email);

  // Create regular user (always update password so demo credentials work after re-seed)
  const userPassword = await bcrypt.hash('user123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: { passwordHash: userPassword, name: 'Regular User', role: 'user' },
    create: {
      email: 'user@example.com',
      passwordHash: userPassword,
      name: 'Regular User',
      role: 'user',
    },
  });
  console.log('Created regular user:', user.email);

  // Create meter user (always update password so demo credentials work after re-seed)
  const meterUserPassword = await bcrypt.hash('meter123', 12);
  const meterUser = await prisma.user.upsert({
    where: { email: 'meter@example.com' },
    update: { passwordHash: meterUserPassword, name: 'Meter User', role: 'meter_user', branch: 'JHB' },
    create: {
      email: 'meter@example.com',
      passwordHash: meterUserPassword,
      name: 'Meter User',
      role: 'meter_user',
      branch: 'JHB',
    },
  });
  console.log('Created meter user:', meterUser.email);

  // Create sales agent (always update password so demo credentials work after re-seed)
  const salesAgentPassword = await bcrypt.hash('sales123', 12);
  const salesAgent = await prisma.user.upsert({
    where: { email: 'sales@example.com' },
    update: { passwordHash: salesAgentPassword, name: 'Sales Agent', role: 'sales_agent', branch: 'JHB' },
    create: {
      email: 'sales@example.com',
      passwordHash: salesAgentPassword,
      name: 'Sales Agent',
      role: 'sales_agent',
      branch: 'JHB',
    },
  });
  console.log('Created sales agent:', salesAgent.email);

  // Create capturer (capture-only, no customers/consumables)
  const capturerPassword = await bcrypt.hash('capturer123', 12);
  const capturer = await prisma.user.upsert({
    where: { email: 'capturer@example.com' },
    update: { passwordHash: capturerPassword, name: 'Capturer', role: 'capturer', branch: 'JHB' },
    create: {
      email: 'capturer@example.com',
      passwordHash: capturerPassword,
      name: 'Capturer',
      role: 'capturer',
      branch: 'JHB',
    },
  });
  console.log('Created capturer:', capturer.email);

  // Create sample customers (find or create by name)
  const customerNames = [
    'Reception Area Copier',
    'Finance Department',
    'HR Department',
    'Marketing Department',
    'IT Department',
    'Sales Floor - East',
    'Sales Floor - West',
    'Warehouse Office',
    'Executive Suite',
    'Legal Department',
  ];
  const customerMap = {};
  for (const name of customerNames) {
    let customer = await prisma.customer.findFirst({ where: { name, branch: 'JHB' } });
    if (!customer) {
      customer = await prisma.customer.create({ data: { name, branch: 'JHB' } });
    }
    customerMap[name] = customer.id;
  }
  console.log('Created/verified customers');

  // Create sample machines (no makes/models - add via Admin Tools → Machine Configuration)
  const machines = [
    { machineSerialNumber: 'CPR-001', customerName: 'Reception Area Copier', contractReference: 'CTR-2024-001', monoEnabled: true, colourEnabled: true, scanEnabled: true },
    { machineSerialNumber: 'CPR-002', customerName: 'Finance Department', contractReference: 'CTR-2024-001', monoEnabled: true, colourEnabled: true, scanEnabled: true },
    { machineSerialNumber: 'CPR-003', customerName: 'HR Department', contractReference: 'CTR-2024-002', monoEnabled: true, colourEnabled: false, scanEnabled: false },
    { machineSerialNumber: 'CPR-004', customerName: 'Marketing Department', contractReference: 'CTR-2024-003', monoEnabled: true, colourEnabled: true, scanEnabled: true },
    { machineSerialNumber: 'CPR-005', customerName: 'IT Department', contractReference: 'CTR-2024-002', monoEnabled: true, colourEnabled: true, scanEnabled: false },
    { machineSerialNumber: 'CPR-006', customerName: 'Sales Floor - East', contractReference: 'CTR-2024-004', monoEnabled: true, colourEnabled: true, scanEnabled: true },
    { machineSerialNumber: 'CPR-007', customerName: 'Sales Floor - West', contractReference: 'CTR-2024-004', monoEnabled: true, colourEnabled: true, scanEnabled: true },
    { machineSerialNumber: 'CPR-008', customerName: 'Warehouse Office', contractReference: 'CTR-2024-005', monoEnabled: true, colourEnabled: false, scanEnabled: false },
    { machineSerialNumber: 'CPR-009', customerName: 'Executive Suite', contractReference: 'CTR-2024-006', monoEnabled: true, colourEnabled: true, scanEnabled: true },
    { machineSerialNumber: 'CPR-010', customerName: 'Legal Department', contractReference: 'CTR-2024-007', monoEnabled: true, colourEnabled: true, scanEnabled: true },
  ];

  for (const m of machines) {
    const { customerName, ...rest } = m;
    const machineData = { ...rest, customerId: customerMap[customerName] || null };
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
  console.log('(Add makes/models via Admin Tools → Machine Configuration)');
  console.log('Seeding completed!');
  console.log('\nTest credentials:');
  console.log('  Admin: admin@example.com / admin123');
  console.log('  Meter User: meter@example.com / meter123');
  console.log('  Capturer: capturer@example.com / capturer123');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
