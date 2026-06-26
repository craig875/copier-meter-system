/**
 * Export makes, models, model parts, and machines (with customer + model assignments)
 * from the database to CSV files that can be imported into the live environment.
 *
 * Uses DATABASE_URL from .env (your local/test database).
 * Outputs:
 *   - makes-models-parts-export.csv  (Machine Configuration → Import)
 *   - machines-export.csv           (Machines → Import)
 *
 * Run: node prisma/export-makes-models-parts.js
 * Or: npm run export:makes
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

const MAKES_CSV_HEADERS = 'make,model,paper_size,model_type,machine_life,part_name,item_code,part_type,toner_color,expected_yield,cost_rand,meter_type,branch';
const MACHINES_CSV_HEADERS = 'Serial Number,Customer,Model,Contract Reference,Mono Enabled,Colour Enabled,Scan Enabled,Branch';

function escapeCsv(value) {
  if (value == null || value === '') return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function main() {
  console.log('Exporting makes, models, model parts, and machines...\n');

  // --- Export makes, models, model parts ---
  const makes = await prisma.make.findMany({
    include: {
      models: {
        include: { modelParts: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  const rows = [];

  for (const make of makes) {
    for (const model of make.models) {
      const paperSize = model.paperSize || 'A4';
      const modelType = model.modelType || 'mono';
      const machineLife = model.machineLife != null ? model.machineLife : '';

      if (model.modelParts.length === 0) {
        rows.push({
          make: make.name,
          model: model.name,
          paper_size: paperSize,
          model_type: modelType,
          machine_life: machineLife,
          part_name: '',
          item_code: '',
          part_type: '',
          toner_color: '',
          expected_yield: '',
          cost_rand: '',
          meter_type: '',
          branch: 'JHB',
        });
      } else {
        for (const part of model.modelParts) {
          rows.push({
            make: make.name,
            model: model.name,
            paper_size: paperSize,
            model_type: modelType,
            machine_life: machineLife,
            part_name: part.partName,
            item_code: part.itemCode || '',
            part_type: part.partType || 'general',
            toner_color: part.tonerColor || '',
            expected_yield: part.expectedYield,
            cost_rand: Number(part.costRand),
            meter_type: part.meterType || 'mono',
            branch: part.branch || 'JHB',
          });
        }
      }
    }
  }

  const makesCsvLines = [MAKES_CSV_HEADERS];
  for (const r of rows) {
    makesCsvLines.push(
      [
        escapeCsv(r.make),
        escapeCsv(r.model),
        escapeCsv(r.paper_size),
        escapeCsv(r.model_type),
        escapeCsv(r.machine_life),
        escapeCsv(r.part_name),
        escapeCsv(r.item_code),
        escapeCsv(r.part_type),
        escapeCsv(r.toner_color),
        escapeCsv(r.expected_yield),
        escapeCsv(r.cost_rand),
        escapeCsv(r.meter_type),
        escapeCsv(r.branch),
      ].join(',')
    );
  }

  const makesPath = join(__dirname, '..', 'makes-models-parts-export.csv');
  writeFileSync(makesPath, makesCsvLines.join('\n'), 'utf8');
  console.log(`Exported ${rows.length} makes/models/parts rows to ${makesPath}`);

  // --- Export machines (with customer + model assignments) ---
  const machines = await prisma.machine.findMany({
    include: {
      model: { include: { make: true } },
      customer: true,
    },
    orderBy: { machineSerialNumber: 'asc' },
  });

  const machineRows = [];
  for (const m of machines) {
    const modelStr = m.model
      ? `${(m.model.make?.name || '').trim()} ${(m.model.name || '').trim()}`.trim()
      : '';
    machineRows.push({
      machineSerialNumber: m.machineSerialNumber,
      customer: m.customer?.name || '',
      model: modelStr,
      contractReference: m.contractReference || '',
      monoEnabled: m.monoEnabled ? 'yes' : 'no',
      colourEnabled: m.colourEnabled ? 'yes' : 'no',
      scanEnabled: m.scanEnabled ? 'yes' : 'no',
      branch: m.branch || 'JHB',
    });
  }

  const machinesCsvLines = [MACHINES_CSV_HEADERS];
  for (const r of machineRows) {
    machinesCsvLines.push(
      [
        escapeCsv(r.machineSerialNumber),
        escapeCsv(r.customer),
        escapeCsv(r.model),
        escapeCsv(r.contractReference),
        escapeCsv(r.monoEnabled),
        escapeCsv(r.colourEnabled),
        escapeCsv(r.scanEnabled),
        escapeCsv(r.branch),
      ].join(',')
    );
  }

  const machinesPath = join(__dirname, '..', 'machines-export.csv');
  writeFileSync(machinesPath, machinesCsvLines.join('\n'), 'utf8');
  console.log(`Exported ${machineRows.length} machines to ${machinesPath}`);

  console.log(`\nNext steps:`);
  console.log(`1. Log in to your LIVE app as admin`);
  console.log(`2. Import makes/models/parts: Admin Tools → Machine Configuration → Import → upload makes-models-parts-export.csv`);
  console.log(`3. Import machines: Meter Readings → Machines → Import → upload machines-export.csv`);
  console.log(`4. (Import makes/models/parts FIRST so model assignments work)`);
}

main()
  .catch((e) => {
    console.error('Export failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
