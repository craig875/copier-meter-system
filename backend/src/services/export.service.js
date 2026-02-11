import ExcelJS from 'exceljs';

/**
 * Generate Excel export for meter readings
 * @param {Array} machines - All machines
 * @param {Map} currentReadingMap - Map of machineId -> current reading
 * @param {number} year - Year
 * @param {number} month - Month
 * @returns {Buffer} Excel file buffer
 */
export const generateExcelExport = async (
  machines,
  currentReadingMap,
  year,
  month
) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Systems';
  workbook.created = new Date();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const worksheetName = `Meter Readings - ${monthNames[month - 1]} ${year}`;
  const worksheet = workbook.addWorksheet(worksheetName);

  // Define columns
  worksheet.columns = [
    { header: 'Code', key: 'machineSerialNumber', width: 22 },
    { header: 'Mono', key: 'monoReading', width: 15 },
    { header: 'Colour', key: 'colourReading', width: 15 },
    { header: 'Scan', key: 'scanReading', width: 15 },
  ];

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };

  // Add data rows
  for (const machine of machines) {
    const current = currentReadingMap.get(machine.id);

    worksheet.addRow({
      machineSerialNumber: machine.machineSerialNumber || '',
      monoReading: machine.monoEnabled ? (current?.monoReading ?? '') : '',
      colourReading: machine.colourEnabled ? (current?.colourReading ?? '') : '',
      scanReading: machine.scanEnabled ? (current?.scanReading ?? '') : '',
    });
  }

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

/**
 * Generate Excel export for meter readings split by branch
 * Creates separate worksheets for each branch
 * @param {Object} branchData - Object with branch keys containing { machines, currentReadingMap }
 * @param {number} year - Year
 * @param {number} month - Month
 * @returns {Buffer} Excel file buffer
 */
export const generateExcelExportSplitByBranch = async (
  branchData,
  year,
  month
) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Systems';
  workbook.created = new Date();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Create a worksheet for each branch
  for (const [branch, { machines, currentReadingMap }] of Object.entries(branchData)) {
    const worksheetName = `${branch} - ${monthNames[month - 1]} ${year}`;
    const worksheet = workbook.addWorksheet(worksheetName);

    // Define columns
    worksheet.columns = [
      { header: 'Code', key: 'machineSerialNumber', width: 22 },
      { header: 'Mono', key: 'monoReading', width: 15 },
      { header: 'Colour', key: 'colourReading', width: 15 },
      { header: 'Scan', key: 'scanReading', width: 15 },
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Add data rows
    for (const machine of machines) {
      const current = currentReadingMap.get(machine.id);

      worksheet.addRow({
        machineSerialNumber: machine.machineSerialNumber || '',
        monoReading: machine.monoEnabled ? (current?.monoReading ?? '') : '',
        colourReading: machine.colourEnabled ? (current?.colourReading ?? '') : '',
        scanReading: machine.scanEnabled ? (current?.scanReading ?? '') : '',
      });
    }
  }

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};
