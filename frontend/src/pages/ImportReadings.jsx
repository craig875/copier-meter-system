import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { readingsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { 
  Upload, 
  X, 
  Download,
  FileSpreadsheet,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ImportReadings = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { isAdmin, selectedBranch, effectiveBranch } = useAuth();
  const [file, setFile] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [branch, setBranch] = useState(effectiveBranch || 'JHB');
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState([]);

  // CSV parsing function - handles quoted values
  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErrors([]);
    setPreview(null);

    // Parse CSV file - accept CSV files or Excel files
    if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv') || selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target.result;
          const lines = text.split(/\r?\n/).filter(line => line.trim());
          
          console.log('CSV parsing - Total lines:', lines.length);
          
          if (lines.length < 2) {
            setErrors(['CSV file must have at least a header row and one data row']);
            return;
          }

          // Parse header - handle quoted values
          const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/^"|"$/g, '').trim());
          
          console.log('CSV parsing - Headers:', headers);
          
          // Check for required header - be more flexible with header names
          const hasSerialNumber = headers.some(h => 
            h.includes('serial') || h.includes('machine')
          );
          
          if (!hasSerialNumber) {
            setErrors(['CSV must have a "Serial Number" or "Machine Serial Number" column. Found headers: ' + headers.join(', ')]);
            return;
          }

          // Parse data rows
          const data = [];
          for (let i = 1; i < Math.min(lines.length, 6); i++) { // Preview first 5 rows
            const values = parseCSVLine(lines[i]).map(v => v.replace(/^"|"$/g, '').trim());
            const row = {};
            // Store both the mapped values and the original header-value pairs for preview
            headers.forEach((header, index) => {
              const value = values[index] || '';
              // Store original header-value pair for preview display
              row[header] = value;
              
              // Also store mapped values for import - be flexible with header matching
              if (header.includes('serial') || header.includes('machine')) {
                row.machineSerialNumber = value;
              } else if (header.includes('mono')) {
                row.monoReading = value;
              } else if (header.includes('colour') || header.includes('color')) {
                row.colourReading = value;
              } else if (header.includes('scan')) {
                row.scanReading = value;
              }
            });
            
            // Check if we have a serial number (using any variation)
            const hasSerialNumber = row.machineSerialNumber || 
              Object.keys(row).some(key => 
                (key.includes('serial') || key.includes('machine')) && row[key]
              );
            
            if (hasSerialNumber) {
              // Ensure machineSerialNumber is set even if header name was different
              if (!row.machineSerialNumber) {
                const serialKey = Object.keys(row).find(key => 
                  (key.includes('serial') || key.includes('machine')) && row[key]
                );
                if (serialKey) {
                  row.machineSerialNumber = row[serialKey];
                }
              }
              data.push(row);
            }
          }
          
          console.log('CSV parsing - Preview data rows:', data.length);
          console.log('CSV parsing - Sample row:', data[0]);
          
          if (data.length === 0) {
            setErrors(['No valid data rows found. Please check that your CSV has a Serial Number column and at least one data row.']);
            return;
          }
          
          setPreview({ headers, data, totalRows: lines.length - 1 });
        } catch (error) {
          setErrors([`Error parsing CSV: ${error.message}`]);
        }
      };
      reader.readAsText(selectedFile);
    } else {
      setErrors([`Please upload a CSV file. File type: ${selectedFile.type}, File name: ${selectedFile.name}`]);
    }
  };

  const importMutation = useMutation({
    mutationFn: ({ data, year, month, branch }) => readingsApi.import(data, year, month, branch),
    onSuccess: (response) => {
      const results = response.data.results;
      toast.success(
        `Import complete: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped`
      );

      if (results.errors.length > 0) {
        console.warn('Import errors:', results.errors);
        toast(`${results.errors.length} rows had errors. Check console for details.`, { icon: '⚠️' });
      }

      queryClient.invalidateQueries(['readings']);
      queryClient.invalidateQueries(['machines']);
      setImporting(false);
      setFile(null);
      setPreview(null);
    },
    onError: (error) => {
      console.error('Import error:', error);
      toast.error(error.response?.data?.error || 'Failed to import readings');
      if (error.response?.data?.details) {
        setErrors([error.response.data.details]);
      }
      setImporting(false);
    },
  });

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    if (!branch) {
      toast.error('Please select a branch');
      return;
    }

    setImporting(true);
    setErrors([]);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const text = event.target.result;
          const lines = text.split('\n').filter(line => line.trim());
          
          if (lines.length < 2) {
            toast.error('CSV file must have at least a header row and one data row');
            setImporting(false);
            return;
          }

          // Parse header - handle quoted values
          const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/^"|"$/g, '').trim());
          
          if (!headers.includes('serial number') && !headers.includes('machine serial number')) {
            toast.error('CSV must have a "Serial Number" or "Machine Serial Number" column');
            setImporting(false);
            return;
          }

          // Parse all data rows
          const data = [];
          for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]).map(v => v.replace(/^"|"$/g, '').trim());
            const row = {};
            headers.forEach((header, index) => {
              const value = values[index] || '';
              switch (header) {
                case 'serial number':
                case 'machine serial number':
                  row.machineSerialNumber = value;
                  break;
                case 'mono reading':
                  row.monoReading = value === '' ? null : value;
                  break;
                case 'colour reading':
                case 'color reading':
                  row.colourReading = value === '' ? null : value;
                  break;
                case 'scan reading':
                  row.scanReading = value === '' ? null : value;
                  break;
              }
            });
            if (row.machineSerialNumber) {
              data.push(row);
            }
          }

          if (data.length === 0) {
            toast.error('No valid data rows found');
            setImporting(false);
            return;
          }

          // Import data
          importMutation.mutate({ data, year, month, branch });
        } catch (error) {
          console.error('File parse error:', error);
          toast.error('Failed to parse file');
          setImporting(false);
        }
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('File read error:', error);
      toast.error('Failed to read file');
      setImporting(false);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Previous Readings</h1>
          <p className="text-gray-500">Import meter readings for previous months to establish a starting point</p>
        </div>
        <button
          onClick={() => navigate('/meter-readings')}
          className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <X className="h-5 w-5 mr-2" />
          Cancel
        </button>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">CSV Format Required:</h3>
            <p className="text-sm text-blue-800 mb-2">Columns (in order):</p>
            <ol className="text-sm text-blue-800 list-decimal list-inside space-y-1">
              <li>Serial Number (required) - Must match existing machine serial number</li>
              <li>Mono Reading (optional) - Leave empty if machine doesn't have mono</li>
              <li>Colour Reading (optional) - Leave empty if machine doesn't have colour</li>
              <li>Scan Reading (optional) - Leave empty if machine doesn't have scan</li>
            </ol>
            <p className="text-sm text-blue-800 mt-3">
              <strong>Note:</strong> Machines must already exist in the system. Readings will be created or updated for the selected month/year.
            </p>
          </div>
          <button
            onClick={() => {
              const csv = 'Serial Number,Mono Reading,Colour Reading,Scan Reading\nCPR-001,50000,20000,5000';
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = 'readings-import-template.csv';
              link.click();
              window.URL.revokeObjectURL(url);
            }}
            className="flex items-center px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            <Download className="h-3 w-3 mr-1" />
            Download Template
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
        {/* Year, Month, Branch Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Year *
            </label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              min="2000"
              max="2100"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Month *
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              required
            >
              {monthNames.map((name, index) => (
                <option key={index + 1} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Branch *
            </label>
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              required
            >
              <option value="JHB">Johannesburg (JHB)</option>
              <option value="CT">Cape Town (CT)</option>
            </select>
          </div>
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select CSV File *
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>

        {/* Preview */}
        {preview && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Preview (first 5 rows of {preview.totalRows} total rows):
            </h3>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {preview.headers.map((header, index) => (
                      <th key={index} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {preview.data.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {preview.headers.map((header, colIndex) => (
                        <td key={colIndex} className="px-3 py-2 text-sm text-gray-900">
                          {row[header] || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-red-800 mb-2">Errors:</h3>
            <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Import Button */}
        <div className="flex justify-end gap-3">
          <button
            onClick={() => navigate('/meter-readings')}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={importing}
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!file || importing || !branch}
            className="flex items-center px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Import Readings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportReadings;
