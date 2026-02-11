import prisma from '../src/config/database.js';

/**
 * Script to move all existing machines to Cape Town (CT) branch
 */
async function moveMachinesToCT() {
  try {
    console.log('Starting to move all machines to Cape Town (CT) branch...');
    
    // Update all machines to CT branch
    const result = await prisma.machine.updateMany({
      where: {}, // Update all machines
      data: {
        branch: 'CT',
      },
    });
    
    console.log(`✅ Successfully moved ${result.count} machines to Cape Town (CT) branch`);
    
    // Verify the update
    const ctMachines = await prisma.machine.count({
      where: { branch: 'CT' },
    });
    
    const jhbMachines = await prisma.machine.count({
      where: { branch: 'JHB' },
    });
    
    console.log('\nBranch distribution:');
    console.log(`  Cape Town (CT): ${ctMachines} machines`);
    console.log(`  Johannesburg (JHB): ${jhbMachines} machines`);
    
  } catch (error) {
    console.error('❌ Error moving machines:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
moveMachinesToCT()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
