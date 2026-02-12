import prisma from '../config/database.js';
import { repositories } from '../repositories/index.js';
import { getPreviousMonth } from '../utils/date.utils.js';
import { calculateReadingMetrics } from '../utils/reading.utils.js';
import { ValidationError } from '../utils/errors.js';

/**
 * Import Service - Business logic for importing machines and readings
 * Single Responsibility: Import operations
 */
export class ImportService {
  constructor(repos = repositories) {
    this.machineRepo = repos.machine;
    this.readingRepo = repos.reading;
    this.customerRepo = repos.customer;
  }

  /**
   * Import machines and readings from data array
   * @param {Array} data
   * @param {number} year
   * @param {number} month
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async importMachines(data, year, month, branch, userId) {
    if (!Array.isArray(data) || data.length === 0) {
      throw new ValidationError('Import data must be a non-empty array');
    }

    if (!branch) {
      throw new ValidationError('Branch is required');
    }

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      readingsCreated: 0,
    };

    const readingYear = year || new Date().getFullYear();
    const readingMonth = month ? parseInt(month) : new Date().getMonth() + 1;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2;

      try {
        // ... validation ...
        if (!row.machineSerialNumber || !row.machineSerialNumber.trim()) {
          results.errors.push({
            row: rowNumber,
            machineSerialNumber: row.machineSerialNumber || 'N/A',
            error: 'Serial number is required',
          });
          results.skipped++;
          continue;
        }

        const machineSerialNumber = row.machineSerialNumber.trim();

        // Determine meter types
        const monoEnabled = row.monoEnabled?.toLowerCase().trim() === 'yes';
        const colourEnabled = row.colourEnabled?.toLowerCase().trim() === 'yes';
        const scanEnabled = row.scanEnabled?.toLowerCase().trim() === 'yes';

        // Resolve model from "Make ModelName" string
        let modelId = null;
        if (row.model?.trim()) {
          const modelStr = row.model.trim();
          const firstSpace = modelStr.indexOf(' ');
          const makeName = firstSpace > 0 ? modelStr.slice(0, firstSpace) : modelStr;
          const modelName = firstSpace > 0 ? modelStr.slice(firstSpace + 1) : modelStr;
          const found = await prisma.model.findFirst({
            where: {
              make: { name: makeName },
              name: modelName,
            },
          });
          if (found) modelId = found.id;
        }

        // Resolve customer - find or create by name
        let customerId = null;
        const customerName = row.customer?.trim();
        const machineBranch = row.branch ? row.branch.toUpperCase() : branch;
        if (customerName) {
          let customer = await prisma.customer.findFirst({
            where: { name: customerName, OR: [{ branch: machineBranch }, { branch: null }] },
          });
          if (!customer) {
            customer = await prisma.customer.create({
              data: { name: customerName, branch: machineBranch || null },
            });
          }
          customerId = customer.id;
        }

        const machineData = {
          machineSerialNumber,
          customerId,
          modelId,
          contractReference: row.contractReference?.trim() || null,
          monoEnabled,
          colourEnabled,
          scanEnabled,
          isActive: true,
          branch: row.branch ? row.branch.toUpperCase() : branch,
        };

        // Upsert machine
        const existingMachine = await this.machineRepo.findBySerialNumber(machineSerialNumber);
        let machine;
        if (existingMachine) {
          machine = await this.machineRepo.update(existingMachine.id, machineData);
          results.updated++;
        } else {
          machine = await this.machineRepo.create(machineData);
          results.created++;
        }

        // Create reading if provided
        const hasMonoReading = row.monoReading != null && row.monoReading !== '';
        const hasColourReading = row.colourReading != null && row.colourReading !== '';
        const hasScanReading = row.scanReading != null && row.scanReading !== '';
        const hasReadings = hasMonoReading || hasColourReading || hasScanReading;

        if (hasReadings) {
          const readingYearValue = parseInt(row.year) || readingYear;
          const readingMonthValue = parseInt(row.month) || readingMonth;

          const readingInput = {
            monoReading: hasMonoReading && monoEnabled ? parseInt(row.monoReading) : null,
            colourReading: hasColourReading && colourEnabled ? parseInt(row.colourReading) : null,
            scanReading: hasScanReading && scanEnabled ? parseInt(row.scanReading) : null,
          };

          // Get previous reading for usage calculation
          const prev = getPreviousMonth(readingYearValue, readingMonthValue);
          const prevReading = await this.readingRepo.findByMachineIdAndYearMonth(
            machine.id,
            prev.year,
            prev.month
          );

          const metrics = calculateReadingMetrics(readingInput, prevReading);

          const readingData = {
            machineId: machine.id,
            year: readingYearValue,
            month: readingMonthValue,
            monoReading: readingInput.monoReading,
            colourReading: readingInput.colourReading,
            scanReading: readingInput.scanReading,
            monoUsage: metrics.monoUsage,
            colourUsage: metrics.colourUsage,
            scanUsage: metrics.scanUsage,
            capturedBy: userId,
            branch: machine.branch,
          };

          // Check if reading exists
          const existingReading = await this.readingRepo.findByMachineIdAndYearMonth(
            machine.id,
            readingYearValue,
            readingMonthValue
          );

          if (!existingReading) {
            await this.readingRepo.create(readingData);
            results.readingsCreated++;
          }
        }
      } catch (error) {
        results.errors.push({
          row: rowNumber,
          machineSerialNumber: row.machineSerialNumber || 'N/A',
          error: error.message || 'Unknown error',
        });
        results.skipped++;
      }
    }

    return {
      message: 'Import completed',
      results,
    };
  }

  /**
   * Import readings for existing machines
   * @param {Array} data - Array of reading data objects
   * @param {number} year - Year for readings
   * @param {number} month - Month for readings
   * @param {string} branch - Branch for readings
   * @param {string} userId - User ID importing the readings
   * @returns {Promise<Object>}
   */
  async importReadings(data, year, month, branch, userId) {
    if (!Array.isArray(data) || data.length === 0) {
      throw new ValidationError('Import data must be a non-empty array');
    }

    if (!branch) {
      throw new ValidationError('Branch is required');
    }

    const targetYear = parseInt(year);
    const targetMonth = parseInt(month);

    if (!targetYear || targetYear < 2000 || targetYear > 2100) {
      throw new ValidationError('Valid year is required');
    }

    if (!targetMonth || targetMonth < 1 || targetMonth > 12) {
      throw new ValidationError('Valid month (1-12) is required');
    }

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    // Get previous month for usage calculation
    const prev = getPreviousMonth(targetYear, targetMonth);

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2;

      try {
        // Validate required fields
        if (!row.machineSerialNumber || !row.machineSerialNumber.trim()) {
          results.errors.push({
            row: rowNumber,
            machineSerialNumber: row.machineSerialNumber || 'N/A',
            error: 'Machine serial number is required',
          });
          results.skipped++;
          continue;
        }

        const machineSerialNumber = row.machineSerialNumber.trim();

        // Find machine by serial number
        const machine = await this.machineRepo.findBySerialNumber(machineSerialNumber);
        if (!machine) {
          results.errors.push({
            row: rowNumber,
            machineSerialNumber,
            error: `Machine with serial number "${machineSerialNumber}" not found`,
          });
          results.skipped++;
          continue;
        }

        // Validate machine belongs to the specified branch
        if (machine.branch !== branch) {
          results.errors.push({
            row: rowNumber,
            machineSerialNumber,
            error: `Machine belongs to branch ${machine.branch}, not ${branch}`,
          });
          results.skipped++;
          continue;
        }

        // Parse readings (allow null/empty for disabled meters)
        const monoReading = row.monoReading != null && row.monoReading !== '' 
          ? parseInt(row.monoReading) 
          : null;
        const colourReading = row.colourReading != null && row.colourReading !== '' 
          ? parseInt(row.colourReading) 
          : null;
        const scanReading = row.scanReading != null && row.scanReading !== '' 
          ? parseInt(row.scanReading) 
          : null;

        // Validate at least one reading is provided
        if (monoReading === null && colourReading === null && scanReading === null) {
          results.errors.push({
            row: rowNumber,
            machineSerialNumber,
            error: 'At least one reading (mono, colour, or scan) is required',
          });
          results.skipped++;
          continue;
        }

        // Validate readings are within meter capabilities
        if (monoReading !== null && !machine.monoEnabled) {
          results.errors.push({
            row: rowNumber,
            machineSerialNumber,
            error: 'Mono reading provided but machine does not have mono enabled',
          });
          results.skipped++;
          continue;
        }

        if (colourReading !== null && !machine.colourEnabled) {
          results.errors.push({
            row: rowNumber,
            machineSerialNumber,
            error: 'Colour reading provided but machine does not have colour enabled',
          });
          results.skipped++;
          continue;
        }

        if (scanReading !== null && !machine.scanEnabled) {
          results.errors.push({
            row: rowNumber,
            machineSerialNumber,
            error: 'Scan reading provided but machine does not have scan enabled',
          });
          results.skipped++;
          continue;
        }

        // Get previous reading for usage calculation
        const prevReading = await this.readingRepo.findByMachineIdAndYearMonth(
          machine.id,
          prev.year,
          prev.month
        );

        const readingInput = {
          monoReading: machine.monoEnabled ? monoReading : null,
          colourReading: machine.colourEnabled ? colourReading : null,
          scanReading: machine.scanEnabled ? scanReading : null,
        };

        const metrics = calculateReadingMetrics(readingInput, prevReading);

        const readingData = {
          machineId: machine.id,
          year: targetYear,
          month: targetMonth,
          monoReading: readingInput.monoReading,
          colourReading: readingInput.colourReading,
          scanReading: readingInput.scanReading,
          monoUsage: metrics.monoUsage,
          colourUsage: metrics.colourUsage,
          scanUsage: metrics.scanUsage,
          capturedBy: userId,
          branch: branch,
        };

        // Check if reading already exists
        const existingReading = await this.readingRepo.findByMachineIdAndYearMonth(
          machine.id,
          targetYear,
          targetMonth
        );

        if (existingReading) {
          // Update existing reading
          await this.readingRepo.update(existingReading.id, readingData);
          results.updated++;
        } else {
          // Create new reading
          await this.readingRepo.create(readingData);
          results.created++;
        }
      } catch (error) {
        results.errors.push({
          row: rowNumber,
          machineSerialNumber: row.machineSerialNumber || 'N/A',
          error: error.message || 'Unknown error',
        });
        results.skipped++;
      }
    }

    return {
      message: 'Readings import completed',
      results,
    };
  }

  /**
   * Import makes, models, and model parts from data array
   * CSV columns: make, model, paper_size, model_type, machine_life, part_name, item_code, part_type, toner_color, expected_yield, cost_rand, meter_type, branch
   * - make + model required for each row
   * - part_name optional; if empty, only create/upsert make and model
   * @param {Array} data
   * @param {string} branch - Default branch for parts (JHB or CT)
   * @returns {Promise<Object>}
   */
  async importMakeModelParts(data, branch) {
    if (!Array.isArray(data) || data.length === 0) {
      throw new ValidationError('Import data must be a non-empty array');
    }

    const partBranch = (branch || 'JHB').toUpperCase();
    if (partBranch !== 'JHB' && partBranch !== 'CT') {
      throw new ValidationError('Branch must be JHB or CT');
    }

    const results = {
      makesCreated: 0,
      modelsCreated: 0,
      partsCreated: 0,
      partsUpdated: 0,
      skipped: 0,
      errors: [],
    };

    const makeCache = new Map();
    const modelCache = new Map();

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2;

      try {
        const makeName = (row.make || row.Make || '').trim();
        const modelName = (row.model || row.Model || '').trim();

        if (!makeName || !modelName) {
          results.errors.push({
            row: rowNumber,
            error: 'Make and model are required',
          });
          results.skipped++;
          continue;
        }

        let make = makeCache.get(makeName);
        if (!make) {
          make = await prisma.make.findUnique({ where: { name: makeName } });
          if (!make) {
            make = await prisma.make.create({ data: { name: makeName } });
            results.makesCreated++;
          }
          makeCache.set(makeName, make);
        }

        const modelKey = `${make.id}:${modelName}`;
        let model = modelCache.get(modelKey);
        if (!model) {
          model = await prisma.model.findFirst({
            where: { makeId: make.id, name: modelName },
          });
          if (!model) {
            const paperSize = ['A3', 'A4'].includes(String(row.paper_size || 'A4').toUpperCase())
              ? String(row.paper_size || 'A4').toUpperCase()
              : 'A4';
            const modelType = ['mono', 'colour'].includes(String(row.model_type || 'mono').toLowerCase())
              ? String(row.model_type || 'mono').toLowerCase()
              : 'mono';
            const machineLife = row.machine_life != null && row.machine_life !== '' ? parseInt(row.machine_life) : null;

            model = await prisma.model.create({
              data: {
                makeId: make.id,
                name: modelName,
                paperSize,
                modelType,
                machineLife: !isNaN(machineLife) ? machineLife : null,
              },
            });
            results.modelsCreated++;
          }
          modelCache.set(modelKey, model);
        }

        const partName = (row.part_name || row.partName || '').trim();
        if (!partName) continue;

        const expectedYield = parseInt(row.expected_yield || row.expectedYield);
        const costRand = parseFloat(row.cost_rand || row.costRand);
        if (isNaN(expectedYield) || expectedYield < 0) {
          results.errors.push({
            row: rowNumber,
            make: makeName,
            model: modelName,
            part: partName,
            error: 'Expected yield must be a valid non-negative number',
          });
          results.skipped++;
          continue;
        }
        if (isNaN(costRand) || costRand < 0) {
          results.errors.push({
            row: rowNumber,
            make: makeName,
            model: modelName,
            part: partName,
            error: 'Cost (R) must be a valid non-negative number',
          });
          results.skipped++;
          continue;
        }

        const partType = ['general', 'toner'].includes(String(row.part_type || row.partType || 'general').toLowerCase())
          ? String(row.part_type || row.partType || 'general').toLowerCase()
          : 'general';
        const tonerColors = ['black', 'cyan', 'magenta', 'yellow'];
        const tonerColorVal = String(row.toner_color || row.tonerColor || '').toLowerCase();
        const tonerColor = tonerColors.includes(tonerColorVal) ? tonerColorVal : null;
        const meterTypes = ['mono', 'colour', 'total'];
        const meterTypeVal = String(row.meter_type || row.meterType || 'mono').toLowerCase();
        const meterType = meterTypes.includes(meterTypeVal) ? meterTypeVal : 'mono';
        const itemCode = (row.item_code || row.itemCode || '').trim() || null;

        // Use row branch if provided and valid, else use request branch
        const rowBranch = (row.branch || row.Branch || '').toString().toUpperCase();
        const partBranchForRow = rowBranch === 'JHB' || rowBranch === 'CT' ? rowBranch : partBranch;

        const existingPart = await prisma.modelPart.findFirst({
          where: {
            modelId: model.id,
            partName,
            branch: partBranchForRow,
          },
        });

        const partData = {
          modelId: model.id,
          partName,
          itemCode,
          partType,
          tonerColor,
          expectedYield,
          costRand,
          meterType,
          branch: partBranchForRow,
          isActive: true,
        };

        if (existingPart) {
          await prisma.modelPart.update({
            where: { id: existingPart.id },
            data: partData,
          });
          results.partsUpdated++;
        } else {
          await prisma.modelPart.create({
            data: partData,
          });
          results.partsCreated++;
        }
      } catch (error) {
        results.errors.push({
          row: rowNumber,
          error: error.message || 'Unknown error',
        });
        results.skipped++;
      }
    }

    return {
      message: 'Makes, models and parts import completed',
      results,
    };
  }
}
