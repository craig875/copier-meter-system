import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { readingsApi } from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { 
  Save, 
  AlertTriangle, 
  CheckCircle, 
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Download,
  FileSpreadsheet,
  X,
  Trash2,
  MessageSquare,
  Unlock
} from 'lucide-react';
import clsx from 'clsx';

const Capture = () => {
  const queryClient = useQueryClient();
  const { isAdmin, effectiveBranch } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [search, setSearch] = useState('');
  const [editedReadings, setEditedReadings] = useState({});
  const [errors, setErrors] = useState({});

  const { data, isLoading, error, isError } = useQuery({
    queryKey: ['readings', year, month, effectiveBranch],
    queryFn: () => readingsApi.get(year, month, false, effectiveBranch),
    enabled: !!year && !!month, // Ensure query runs when year/month are set
  });

  // Debug logging
  console.log('Capture query state:', { isLoading, isError, error, year, month, data });

  const unlockMutation = useMutation({
    mutationFn: () => readingsApi.unlock(year, month, effectiveBranch),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Month unlocked');
      queryClient.invalidateQueries(['readings', year, month, effectiveBranch]);
    },
    onError: (error) => {
      const msg = error.response?.data?.message || error.response?.data?.error || 'Failed to unlock';
      toast.error(msg);
    },
  });

  const submitMutation = useMutation({
    mutationFn: (readings) => readingsApi.submit({ year, month, readings, branch: effectiveBranch }),
    onSuccess: (response) => {
      const { savedCount, skippedCount, skippedSerialNumbers } = response.data;
      toast.success(`Saved ${savedCount} readings${skippedCount ? `. ${skippedCount} skipped (wrong branch)` : ''}`);
      if (skippedCount > 0 && skippedSerialNumbers?.length) {
        toast(`Skipped: ${skippedSerialNumbers.slice(0, 3).join(', ')}${skippedSerialNumbers.length > 3 ? '...' : ''}`, { icon: '⚠️' });
      }
      setEditedReadings({});
      setErrors({});
      queryClient.invalidateQueries(['readings', year, month, effectiveBranch]);
    },
    onError: (error) => {
      const fieldErrors = error.response?.data?.errors;
      const mainError = error.response?.data?.error || 'Failed to save readings';
      if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
        const newErrors = {};
        fieldErrors.forEach(err => {
          if (err.machineId && err.field) {
            newErrors[`${err.machineId}-${err.field}`] = err.message;
          }
        });
        setErrors(newErrors);
        toast.error('Validation errors - check highlighted fields');
      } else {
        toast.error(mainError);
      }
    },
  });

  // Backend returns: { year, month, data, summary, isLocked, submission }
  // Axios wraps it: { data: { year, month, data, summary, isLocked, submission }, status, ... }
  // React Query's data is the axios response, so data.data is: { year, month, data, summary, isLocked, submission }
  const machines = data?.data?.data || [];
  const summary = data?.data?.summary || {};
  const isLocked = data?.data?.isLocked || false;
  const submission = data?.data?.submission;
  const progressPercent = summary.totalMachines > 0 
    ? Math.round((summary.capturedCount / summary.totalMachines) * 100)
    : 0;
  const isComplete = summary.totalMachines > 0 && summary.capturedCount === summary.totalMachines;

  const filteredMachines = useMemo(() => {
    if (!search) return machines;
    const searchLower = search.toLowerCase();
    return machines.filter(m => 
      m.machine.machineSerialNumber.toLowerCase().includes(searchLower) ||
      m.machine.customer?.toLowerCase().includes(searchLower) ||
      m.machine.contractReference?.toLowerCase().includes(searchLower)
    );
  }, [machines, search]);

  const handleReadingChange = (machineId, field, value) => {
    // Prevent changes if month is locked
    if (isLocked) {
      toast.error('This month has been submitted and is locked for editing');
      return;
    }

    // Handle note field differently (it's a string, not a number)
    if (field === 'note') {
      setEditedReadings(prev => ({
        ...prev,
        [machineId]: {
          ...prev[machineId],
          [field]: value === '' ? null : value,
        },
      }));
      return;
    }

    const numValue = value === '' ? null : parseInt(value, 10);
    if (value !== '' && isNaN(numValue)) return;

    setEditedReadings(prev => ({
      ...prev,
      [machineId]: {
        ...prev[machineId],
        [field]: numValue,
      },
    }));

    // Clear error for this field
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[`${machineId}-${field}`];
      return newErrors;
    });
  };

  const getReadingValue = (machineId, field, currentReading) => {
    if (editedReadings[machineId]?.[field] !== undefined) {
      return editedReadings[machineId][field] ?? '';
    }
    return currentReading?.[field] ?? '';
  };

  const handleSave = () => {
    // Prevent saving if month is locked
    if (isLocked) {
      toast.error('This month has been submitted and is locked for editing');
      return;
    }

    const readingsToSubmit = [];

    Object.entries(editedReadings).forEach(([machineId, values]) => {
      const machine = machines.find(m => m.machine.id === machineId);
      if (!machine) return;

      const reading = {
        machineId,
        monoReading: values.monoReading !== undefined ? values.monoReading : machine.currentReading?.monoReading,
        colourReading: values.colourReading !== undefined ? values.colourReading : machine.currentReading?.colourReading,
        scanReading: values.scanReading !== undefined ? values.scanReading : machine.currentReading?.scanReading,
        note: values.note !== undefined ? values.note : machine.currentReading?.note,
      };

      // Only include if at least one value is set (including note)
      if (reading.monoReading != null || reading.colourReading != null || reading.scanReading != null || reading.note) {
        readingsToSubmit.push(reading);
      }
    });

    if (readingsToSubmit.length === 0) {
      toast.error('No readings or notes to save');
      return;
    }

    submitMutation.mutate(readingsToSubmit);
  };

  const handleSaveSingle = async (machineId) => {
    // Prevent saving if month is locked
    if (isLocked) {
      toast.error('This month has been submitted and is locked for editing');
      return;
    }

    const machine = machines.find(m => m.machine.id === machineId);
    if (!machine) return;

    const editedValues = editedReadings[machineId];
    if (!editedValues) {
      toast.error('No changes to save for this machine');
      return;
    }

    const reading = {
      machineId,
      monoReading: editedValues.monoReading !== undefined ? editedValues.monoReading : machine.currentReading?.monoReading,
      colourReading: editedValues.colourReading !== undefined ? editedValues.colourReading : machine.currentReading?.colourReading,
      scanReading: editedValues.scanReading !== undefined ? editedValues.scanReading : machine.currentReading?.scanReading,
      note: editedValues.note !== undefined ? editedValues.note : machine.currentReading?.note,
    };

    // Only include if at least one value is set (including note)
    if (reading.monoReading == null && reading.colourReading == null && reading.scanReading == null && !reading.note) {
      toast.error('Please provide at least one reading value or a note');
      return;
    }

    try {
      await readingsApi.submit({ year, month, readings: [reading], branch: effectiveBranch });
      toast.success(`Saved readings for ${machine.machine.machineSerialNumber}`);
      
      // Remove this machine from editedReadings
      setEditedReadings(prev => {
        const newEdited = { ...prev };
        delete newEdited[machineId];
        return newEdited;
      });
      
      // Clear any errors for this machine
      setErrors(prev => {
        const newErrors = { ...prev };
        Object.keys(newErrors).forEach(key => {
          if (key.startsWith(`${machineId}-`)) {
            delete newErrors[key];
          }
        });
        return newErrors;
      });
      
      queryClient.invalidateQueries(['readings', year, month, effectiveBranch]);
    } catch (error) {
      if (error.response?.data?.errors) {
        const newErrors = {};
        error.response.data.errors.forEach(err => {
          newErrors[`${err.machineId}-${err.field}`] = err.message;
        });
        setErrors(prev => ({ ...prev, ...newErrors }));
        toast.error('Validation errors - check highlighted fields');
      } else {
        toast.error(error.response?.data?.error || 'Failed to save readings');
      }
    }
  };

  const handleCancelMachine = (machineId) => {
    // Clear all edited readings for this machine
    setEditedReadings(prev => {
      const newEdited = { ...prev };
      delete newEdited[machineId];
      return newEdited;
    });
    
    // Clear all errors for this machine
    setErrors(prev => {
      const newErrors = { ...prev };
      Object.keys(newErrors).forEach(key => {
        if (key.startsWith(`${machineId}-`)) {
          delete newErrors[key];
        }
      });
      return newErrors;
    });
    
    toast.success('Cleared all input for this machine');
  };

  const handleDeleteReading = async (machineId) => {
    // Prevent deletion if month is locked
    if (isLocked) {
      toast.error('This month has been submitted and is locked for editing');
      return;
    }

    const machine = machines.find(m => m.machine.id === machineId);
    if (!machine) return;

    // Confirm deletion
    if (!window.confirm(`Are you sure you want to delete the reading for ${machine.machine.machineSerialNumber}? This action cannot be undone.`)) {
      return;
    }

    try {
      await readingsApi.delete(machineId, year, month);
      toast.success(`Deleted reading for ${machine.machine.machineSerialNumber}`);
      
      // Clear any edited readings for this machine
      setEditedReadings(prev => {
        const newEdited = { ...prev };
        delete newEdited[machineId];
        return newEdited;
      });
      
      // Clear any errors for this machine
      setErrors(prev => {
        const newErrors = { ...prev };
        Object.keys(newErrors).forEach(key => {
          if (key.startsWith(`${machineId}-`)) {
            delete newErrors[key];
          }
        });
        return newErrors;
      });
      
      queryClient.invalidateQueries(['readings', year, month, effectiveBranch]);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete reading');
    }
  };

  const handleSubmitAndExport = async () => {
    // First, save any pending changes
    if (Object.keys(editedReadings).length > 0) {
      const readingsToSubmit = [];

      Object.entries(editedReadings).forEach(([machineId, values]) => {
        const machine = machines.find(m => m.machine.id === machineId);
        if (!machine) return;

        const reading = {
          machineId,
          monoReading: values.monoReading !== undefined ? values.monoReading : machine.currentReading?.monoReading,
          colourReading: values.colourReading !== undefined ? values.colourReading : machine.currentReading?.colourReading,
          scanReading: values.scanReading !== undefined ? values.scanReading : machine.currentReading?.scanReading,
          note: values.note !== undefined ? values.note : machine.currentReading?.note,
        };

        if (reading.monoReading != null || reading.colourReading != null || reading.scanReading != null || reading.note) {
          readingsToSubmit.push(reading);
        }
      });

      if (readingsToSubmit.length > 0) {
        try {
          await readingsApi.submit({ year, month, readings: readingsToSubmit, branch: effectiveBranch });
          setEditedReadings({});
          queryClient.invalidateQueries(['readings', year, month, effectiveBranch]);
        } catch (error) {
          toast.error('Failed to save readings before export');
          return;
        }
      }
    }

    // Then export
    try {
      const response = await readingsApi.export(year, month, effectiveBranch);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `meter-readings-${effectiveBranch || 'all'}-${year}-${String(month).padStart(2, '0')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Excel file exported successfully! Month has been locked.');
      // Refresh to get locked status
      queryClient.invalidateQueries(['readings', year, month, effectiveBranch]);
    } catch (error) {
      toast.error('Failed to export readings');
    }
  };

  const changeMonth = (delta) => {
    let newMonth = month + delta;
    let newYear = year;

    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }

    setMonth(newMonth);
    setYear(newYear);
    setEditedReadings({});
    setErrors({});
  };

  const monthName = new Date(year, month - 1).toLocaleString('default', { 
    month: 'long', 
    year: 'numeric' 
  });

  const hasChanges = Object.keys(editedReadings).length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Monthly Capture</h1>
          <p className="text-gray-500">Enter meter readings for each machine</p>
          {isLocked && submission && (
            <div className="mt-2 flex items-center justify-between gap-4 text-sm bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                <span className="text-yellow-800">
                  This month has been submitted and is locked for editing. Submitted on{' '}
                  {new Date(submission.submittedAt).toLocaleDateString()}
                </span>
              </div>
              {isAdmin && effectiveBranch && (
                <button
                  onClick={() => {
                    if (window.confirm('Unlock this month for editing? Anyone will be able to modify the readings.')) {
                      unlockMutation.mutate();
                    }
                  }}
                  disabled={unlockMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 text-sm font-medium transition-colors"
                >
                  <Unlock className="h-4 w-4" />
                  {unlockMutation.isPending ? 'Unlocking...' : 'Unlock'}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Month Navigation */}
          <div className="flex items-center bg-white/35 backdrop-blur-2xl backdrop-saturate-150 rounded-lg shadow-md border border-white/70">
            <button
              onClick={() => changeMonth(-1)}
              className="p-2 hover:bg-gray-100 rounded-l-lg"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="px-4 py-2 font-medium min-w-[160px] text-center">
              {monthName}
            </span>
            <button
              onClick={() => changeMonth(1)}
              className="p-2 hover:bg-gray-100 rounded-r-lg"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Submit & Export Button - Show when 100% complete OR if admin (even if not complete), but hide if locked */}
          {/* Regular users can only export when 100% complete. Admins can export anytime. */}
          {!isLocked && (isComplete || isAdmin) ? (
            <div className="flex items-center gap-2">
              {isComplete ? (
                // Show export button for all users when 100% complete
                <button
                  onClick={handleSubmitAndExport}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Submit & Export Excel
                </button>
              ) : (
                // Show export button only for admins when not complete
                <>
                  <button
                    onClick={handleSubmitAndExport}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                    title="Admin: Export available even if not 100% complete"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export Excel (Admin)
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!hasChanges || submitMutation.isPending || isLocked}
                    className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {submitMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              )}
            </div>
          ) : (
            /* Save Button - Show when not complete (for regular users) or when locked */
            !isLocked && (
              <button
                onClick={handleSave}
                disabled={!hasChanges || submitMutation.isPending || isLocked}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="h-4 w-4 mr-2" />
                {submitMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            )
          )}
        </div>
      </div>

      {/* Summary Bar - glass */}
      <div className="bg-white/35 backdrop-blur-2xl backdrop-saturate-150 rounded-xl shadow-xl border border-white/70 p-4">
        <div className="flex flex-wrap items-center gap-6 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Total:</span>
            <span className="font-semibold">{summary.totalMachines}</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-gray-500">Captured:</span>
            <span className="font-semibold text-green-600">{summary.capturedCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <span className="text-gray-500">Pending:</span>
            <span className="font-semibold text-yellow-600">{summary.pendingCount}</span>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className={clsx(
              'h-3 rounded-full transition-all duration-500',
              isComplete ? 'bg-green-600' : 'bg-red-600'
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-sm text-gray-500">
            {isComplete ? (
              <span className="text-green-600 font-semibold">✓ Capture Complete - Ready to Export</span>
            ) : (
              <span>Progress: {progressPercent}%</span>
            )}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search machines..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Readings Table - glass */}
      <div className="bg-white/35 backdrop-blur-2xl backdrop-saturate-150 rounded-xl shadow-xl border border-white/70 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Machine
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mono
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Colour
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Scan
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Note/Comment
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredMachines.map(({ machine, currentReading, previousReading }) => (
                <tr 
                  key={machine.id}
                  className={clsx(
                    editedReadings[machine.id] && 'bg-blue-50'
                  )}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{machine.machineSerialNumber}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {machine.customer || '-'}
                  </td>
                  <td className="px-4 py-3">
                    {machine.monoEnabled ? (
                      <MeterInput
                        value={getReadingValue(machine.id, 'monoReading', currentReading)}
                        onChange={(v) => handleReadingChange(machine.id, 'monoReading', v)}
                        previous={previousReading?.monoReading}
                        error={errors[`${machine.id}-monoReading`]}
                      />
                    ) : (
                      <span className="text-gray-400 text-center block">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {machine.colourEnabled ? (
                      <MeterInput
                        value={getReadingValue(machine.id, 'colourReading', currentReading)}
                        onChange={(v) => handleReadingChange(machine.id, 'colourReading', v)}
                        previous={previousReading?.colourReading}
                        error={errors[`${machine.id}-colourReading`]}
                        disabled={isLocked}
                      />
                    ) : (
                      <span className="text-gray-400 text-center block">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {machine.scanEnabled ? (
                      <MeterInput
                        value={getReadingValue(machine.id, 'scanReading', currentReading)}
                        onChange={(v) => handleReadingChange(machine.id, 'scanReading', v)}
                        previous={previousReading?.scanReading}
                        error={errors[`${machine.id}-scanReading`]}
                        disabled={isLocked}
                      />
                    ) : (
                      <span className="text-gray-400 text-center block">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <textarea
                      value={getReadingValue(machine.id, 'note', currentReading) || ''}
                      onChange={(e) => handleReadingChange(machine.id, 'note', e.target.value)}
                      disabled={isLocked}
                      placeholder="Add note..."
                      maxLength={500}
                      rows={2}
                      className={clsx(
                        'w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none',
                        errors[`${machine.id}-note`] ? 'border-red-500 bg-red-50' : 'border-gray-300',
                        isLocked ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''
                      )}
                    />
                    {errors[`${machine.id}-note`] && (
                      <p className="text-xs text-red-600 mt-1">{errors[`${machine.id}-note`]}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {currentReading ? (
                      // Check if reading has actual values (not just a note)
                      (currentReading.monoReading != null || 
                       currentReading.colourReading != null || 
                       currentReading.scanReading != null) ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Done
                        </span>
                      ) : (
                        // Has reading record but only note, no actual readings
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Note Only
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {editedReadings[machine.id] && (
                        <button
                          onClick={() => handleSaveSingle(machine.id)}
                          disabled={submitMutation.isPending || isLocked}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title={isLocked ? "This month is locked" : "Save this machine's readings"}
                        >
                          <Save className="h-3 w-3 mr-1" />
                          Save
                        </button>
                      )}
                      {(editedReadings[machine.id] || Object.keys(errors).some(key => key.startsWith(`${machine.id}-`))) && (
                        <button
                          onClick={() => handleCancelMachine(machine.id)}
                          disabled={isLocked}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title={isLocked ? "This month is locked" : "Cancel and clear all input for this machine"}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Cancel
                        </button>
                      )}
                      {isAdmin && currentReading && (
                        <button
                          onClick={() => handleDeleteReading(machine.id)}
                          disabled={isLocked}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title={isLocked ? "This month is locked" : "Delete this machine's reading (Admin only)"}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const MeterInput = ({ value, onChange, previous, error, disabled = false }) => {
  return (
    <div className="space-y-1">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={clsx(
          'w-24 px-2 py-1 text-center border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          error ? 'border-red-500 bg-red-50' : 'border-gray-300',
          disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''
        )}
        min="0"
      />
      {previous != null && (
        <p className="text-xs text-gray-400 text-center">Prev: {previous.toLocaleString()}</p>
      )}
      {error && (
        <div className="text-xs text-red-600 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <AlertTriangle className="h-3 w-3" />
            <span className="font-semibold">Error:</span>
          </div>
          <p className="text-[10px] leading-tight break-words max-w-[100px] mx-auto">
            {error}
          </p>
        </div>
      )}
    </div>
  );
};

export default Capture;
