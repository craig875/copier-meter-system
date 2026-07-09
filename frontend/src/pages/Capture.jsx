import { useState, useMemo, useEffect, useRef, useCallback, memo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { readingsApi } from '../services/api';
import toast from 'react-hot-toast';
import { trimLeading } from '../utils/string';
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
  FileText,
  X,
  Trash2,
  MessageSquare,
  Unlock
} from 'lucide-react';
import clsx from 'clsx';
import ReadingUnchangedConfirmModal from '../components/ReadingUnchangedConfirmModal';
import {
  findUnchangedCountersForReadings,
  applyUnchangedReasons,
} from '../utils/readingUnchanged';

const MeterInput = memo(function MeterInput({
  value,
  onChange,
  previous,
  previousMonthLabel,
  error,
  disabled = false,
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    /** Capture phase so we win over browser spin/step defaults (incl. some numeric-like text fields). */
    const blockArrowStep = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    el.addEventListener('keydown', blockArrowStep, true);
    return () => el.removeEventListener('keydown', blockArrowStep, true);
  }, []);

  return (
    <div className="space-y-1">
      <input
        ref={inputRef}
        type="text"
        pattern="[0-9]*"
        enterKeyHint="done"
        autoComplete="off"
        value={value === '' || value == null ? '' : String(value)}
        onChange={(e) => onChange(trimLeading(e.target.value.replace(/\D/g, '')))}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        disabled={disabled}
        className={clsx(
          'meter-reading-input w-24 px-2 py-1 text-center border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          error ? 'border-red-500 bg-red-50' : 'border-gray-300',
          disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''
        )}
      />
      {previous != null && (
        <p className="text-xs text-gray-400 text-center" title="Previous month's reading">
          {previousMonthLabel ? `${previousMonthLabel}: ` : 'Prev: '}
          {previous.toLocaleString()}
        </p>
      )}
      {error && (
        <div className="text-xs text-red-600 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <AlertTriangle className="h-3 w-3" />
            <span className="font-semibold">Error:</span>
          </div>
          <p className="text-[10px] leading-tight break-words max-w-[100px] mx-auto">{error}</p>
        </div>
      )}
    </div>
  );
});

function readingFieldValue(field, currentReading, editedFields) {
  if (editedFields?.[field] !== undefined) {
    return editedFields[field] ?? '';
  }
  return currentReading?.[field] ?? '';
}

const CaptureMachineRow = memo(function CaptureMachineRow({
  machine,
  currentReading,
  previousReading,
  previousMonthLabel,
  editedFields,
  monoError,
  colourError,
  scanError,
  noteError,
  isLocked,
  isElevated,
  savePending,
  onReadingChange,
  onSaveSingle,
  onCancelMachine,
  onDeleteReading,
}) {
  const mid = machine.id;
  return (
    <tr
      data-machine-id={mid}
      className={clsx(editedFields && Object.keys(editedFields).length > 0 && 'bg-blue-50')}
    >
      <td className="px-4 py-3">
        <span className="font-medium text-gray-900">{machine.machineSerialNumber}</span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">
        {machine.customer?.name || '-'}
      </td>
      <td className="px-4 py-3">
        {machine.monoEnabled ? (
          <MeterInput
            value={readingFieldValue('monoReading', currentReading, editedFields)}
            onChange={(v) => onReadingChange(mid, 'monoReading', v)}
            previous={previousReading?.monoReading}
            previousMonthLabel={previousMonthLabel}
            error={monoError}
            disabled={isLocked}
          />
        ) : (
          <span className="text-gray-400 text-center block">-</span>
        )}
      </td>
      <td className="px-4 py-3">
        {machine.colourEnabled ? (
          <MeterInput
            value={readingFieldValue('colourReading', currentReading, editedFields)}
            onChange={(v) => onReadingChange(mid, 'colourReading', v)}
            previous={previousReading?.colourReading}
            previousMonthLabel={previousMonthLabel}
            error={colourError}
            disabled={isLocked}
          />
        ) : (
          <span className="text-gray-400 text-center block">-</span>
        )}
      </td>
      <td className="px-4 py-3">
        {machine.scanEnabled ? (
          <MeterInput
            value={readingFieldValue('scanReading', currentReading, editedFields)}
            onChange={(v) => onReadingChange(mid, 'scanReading', v)}
            previous={previousReading?.scanReading}
            previousMonthLabel={previousMonthLabel}
            error={scanError}
            disabled={isLocked}
          />
        ) : (
          <span className="text-gray-400 text-center block">-</span>
        )}
      </td>
      <td className="px-4 py-3">
        <textarea
          value={readingFieldValue('note', currentReading, editedFields) || ''}
          onChange={(e) => onReadingChange(mid, 'note', trimLeading(e.target.value))}
          disabled={isLocked}
          placeholder="Add note..."
          maxLength={500}
          rows={2}
          className={clsx(
            'w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none',
            noteError ? 'border-red-500 bg-red-50' : 'border-gray-300',
            isLocked ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''
          )}
        />
        {noteError && <p className="text-xs text-red-600 mt-1">{noteError}</p>}
      </td>
      <td className="px-4 py-3 text-center">
        {currentReading ? (
          (currentReading.monoReading != null ||
            currentReading.colourReading != null ||
            currentReading.scanReading != null) ? (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
              <CheckCircle className="h-3 w-3 mr-1" />
              Done
            </span>
          ) : (
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
        <div className="flex flex-wrap items-center justify-center gap-2">
          {editedFields && Object.keys(editedFields).length > 0 && (
            <button
              type="button"
              onClick={() => onSaveSingle(mid)}
              disabled={savePending || isLocked}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={isLocked ? 'This month is locked' : "Save this machine's readings"}
            >
              <Save className="h-3 w-3 mr-1" />
              Save
            </button>
          )}
          {((editedFields && Object.keys(editedFields).length > 0) ||
            [monoError, colourError, scanError, noteError].some(Boolean)) && (
            <button
              type="button"
              onClick={() => onCancelMachine(mid)}
              disabled={isLocked}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={isLocked ? 'This month is locked' : 'Cancel and clear all input for this machine'}
            >
              <X className="h-3 w-3 mr-1" />
              Cancel
            </button>
          )}
          {isElevated && currentReading && (
            <button
              type="button"
              onClick={() => onDeleteReading(mid)}
              disabled={isLocked}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={isLocked ? 'This month is locked' : "Delete this machine's reading (Admin only)"}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Delete
            </button>
          )}
        </div>
      </td>
    </tr>
  );
});

const Capture = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isElevated, effectiveBranch, updateSelectedBranch, canSwitchBranches } = useAuth();
  const now = new Date();
  const urlYear = searchParams.get('year');
  const urlMonth = searchParams.get('month');
  const urlBranch = searchParams.get('branch');
  const highlightMachineId = searchParams.get('machineId');
  const [year, setYear] = useState(urlYear ? parseInt(urlYear, 10) : now.getFullYear());
  const [month, setMonth] = useState(urlMonth ? parseInt(urlMonth, 10) : now.getMonth() + 1);
  const [search, setSearch] = useState('');
  const [editedReadings, setEditedReadings] = useState({});
  const [errors, setErrors] = useState({});
  const [unchangedModal, setUnchangedModal] = useState(null);

  const queryBranch = urlBranch && canSwitchBranches ? urlBranch : effectiveBranch;

  const { data, isLoading, error, isError } = useQuery({
    queryKey: ['readings', year, month, queryBranch],
    queryFn: () => readingsApi.get(year, month, false, queryBranch),
    enabled: !!year && !!month && queryBranch != null,
  });

  const unlockMutation = useMutation({
    mutationFn: () => readingsApi.unlock(year, month, queryBranch),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Month unlocked');
      queryClient.invalidateQueries(['readings', year, month, queryBranch]);
    },
    onError: (error) => {
      const msg = error.response?.data?.message || error.response?.data?.error || 'Failed to unlock';
      toast.error(msg);
    },
  });

  const submitMutation = useMutation({
    mutationFn: (readings) => readingsApi.submit({ year, month, readings, branch: queryBranch }),
    onSuccess: (response) => {
      const { savedCount, skippedCount, skippedSerialNumbers } = response.data;
      toast.success(`Saved ${savedCount} readings${skippedCount ? `. ${skippedCount} skipped (wrong branch)` : ''}`);
      if (skippedCount > 0 && skippedSerialNumbers?.length) {
        toast(`Skipped: ${skippedSerialNumbers.slice(0, 3).join(', ')}${skippedSerialNumbers.length > 3 ? '...' : ''}`, { icon: '⚠️' });
      }
      setEditedReadings({});
      setErrors({});
      queryClient.invalidateQueries(['readings', year, month, queryBranch]);
      queryClient.invalidateQueries(['toner-alerts']);
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
  const machinesRef = useRef(machines);
  machinesRef.current = machines;
  const editedReadingsRef = useRef(editedReadings);
  editedReadingsRef.current = editedReadings;
  const summary = data?.data?.summary || {};
  const isLocked = data?.data?.isLocked || false;
  const submission = data?.data?.submission;
  const progressPercent = summary.totalMachines > 0 
    ? Math.round((summary.capturedCount / summary.totalMachines) * 100)
    : 0;
  const isComplete = summary.totalMachines > 0 && summary.capturedCount === summary.totalMachines;

  // Sync year/month/branch from URL when they change (e.g. from notification link)
  useEffect(() => {
    if (urlYear && urlMonth) {
      const y = parseInt(urlYear, 10);
      const m = parseInt(urlMonth, 10);
      if (!isNaN(y) && y >= 2000 && y <= 2100) setYear(y);
      if (!isNaN(m) && m >= 1 && m <= 12) setMonth(m);
    }
    if (urlBranch && canSwitchBranches && (urlBranch === 'JHB' || urlBranch === 'CT')) {
      updateSelectedBranch(urlBranch);
    }
  }, [urlYear, urlMonth, urlBranch, canSwitchBranches, updateSelectedBranch]);

  // Scroll to machine row when arriving from notification link
  useEffect(() => {
    if (!highlightMachineId || machines.length === 0) return;
    const timer = setTimeout(() => {
      const row = document.querySelector(`[data-machine-id="${highlightMachineId}"]`);
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row.classList.add('ring-2', 'ring-red-400', 'ring-offset-2');
        setTimeout(() => row.classList.remove('ring-2', 'ring-red-400', 'ring-offset-2'), 3000);
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete('machineId');
          return next;
        }, { replace: true });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [highlightMachineId, machines.length, setSearchParams]);

  const filteredMachines = useMemo(() => {
    if (!search) return machines;
    const searchLower = search.toLowerCase();
    return machines.filter(m => 
      m.machine.machineSerialNumber.toLowerCase().includes(searchLower) ||
      m.machine.customer?.name?.toLowerCase().includes(searchLower) ||
      m.machine.contractReference?.toLowerCase().includes(searchLower)
    );
  }, [machines, search]);

  const handleReadingChange = useCallback((machineId, field, value) => {
    if (isLocked) {
      toast.error('This month has been submitted and is locked for editing');
      return;
    }

    if (field === 'note') {
      setEditedReadings((prev) => ({
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

    setEditedReadings((prev) => ({
      ...prev,
      [machineId]: {
        ...prev[machineId],
        [field]: numValue,
      },
    }));

    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[`${machineId}-${field}`];
      return newErrors;
    });
  }, [isLocked]);

  const buildReadingsToSubmit = useCallback(() => {
    const readingsToSubmit = [];

    Object.entries(editedReadings).forEach(([machineId, values]) => {
      const entry = machines.find((m) => m.machine.id === machineId);
      if (!entry) return;

      const reading = {
        machineId,
        monoReading: values.monoReading !== undefined ? values.monoReading : entry.currentReading?.monoReading,
        colourReading: values.colourReading !== undefined ? values.colourReading : entry.currentReading?.colourReading,
        scanReading: values.scanReading !== undefined ? values.scanReading : entry.currentReading?.scanReading,
        note: values.note !== undefined ? values.note : entry.currentReading?.note,
      };

      if (reading.monoReading != null || reading.colourReading != null || reading.scanReading != null || reading.note) {
        readingsToSubmit.push(reading);
      }
    });

    return readingsToSubmit;
  }, [editedReadings, machines]);

  const machinesByIdForUnchanged = useMemo(() => {
    const map = new Map();
    for (const entry of machines) {
      map.set(entry.machine.id, {
        machine: entry.machine,
        previousReading: entry.previousReading,
      });
    }
    return map;
  }, [machines]);

  const submitReadingsWithUnchangedCheck = useCallback((readingsToSubmit, onAfterSuccess) => {
    const unchangedItems = findUnchangedCountersForReadings(readingsToSubmit, machinesByIdForUnchanged);
    if (unchangedItems.length > 0) {
      setUnchangedModal({ readings: readingsToSubmit, items: unchangedItems, onAfterSuccess });
      return;
    }
    if (onAfterSuccess) {
      onAfterSuccess(readingsToSubmit);
      return;
    }
    submitMutation.mutate(readingsToSubmit);
  }, [machinesByIdForUnchanged, submitMutation]);

  const handleUnchangedConfirm = useCallback(async (reasonByKey) => {
    if (!unchangedModal) return;
    const readingsWithReasons = applyUnchangedReasons(unchangedModal.readings, reasonByKey);
    const { onAfterSuccess } = unchangedModal;
    setUnchangedModal(null);

    if (onAfterSuccess) {
      try {
        await readingsApi.submit({ year, month, readings: readingsWithReasons, branch: queryBranch });
        onAfterSuccess();
        queryClient.invalidateQueries(['readings', year, month, queryBranch]);
        queryClient.invalidateQueries(['toner-alerts']);
      } catch (error) {
        if (error.response?.data?.errors) {
          const newErrors = {};
          error.response.data.errors.forEach((err) => {
            newErrors[`${err.machineId}-${err.field}`] = err.message;
          });
          setErrors((prev) => ({ ...prev, ...newErrors }));
          toast.error('Validation errors - check highlighted fields');
        } else {
          toast.error(error.response?.data?.error || 'Failed to save readings');
        }
      }
      return;
    }

    submitMutation.mutate(readingsWithReasons);
  }, [unchangedModal, submitMutation, year, month, queryBranch, queryClient]);

  const handleUnchangedCancel = useCallback(() => {
    unchangedModal?.onCancel?.();
    setUnchangedModal(null);
  }, [unchangedModal]);

  const handleSave = () => {
    // Prevent saving if month is locked
    if (isLocked) {
      toast.error('This month has been submitted and is locked for editing');
      return;
    }

    const readingsToSubmit = buildReadingsToSubmit();

    if (readingsToSubmit.length === 0) {
      toast.error('No readings or notes to save');
      return;
    }

    submitReadingsWithUnchangedCheck(readingsToSubmit);
  };

  const handleSaveSingle = useCallback(
    async (machineId) => {
      if (isLocked) {
        toast.error('This month has been submitted and is locked for editing');
        return;
      }

      const machine = machinesRef.current.find((m) => m.machine.id === machineId);
      if (!machine) return;

      const editedValues = editedReadingsRef.current[machineId];
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

    const unchangedItems = findUnchangedCountersForReadings(
      [reading],
      new Map([[machineId, { machine: machine.machine, previousReading: machine.previousReading }]])
    );

    if (unchangedItems.length > 0) {
      setUnchangedModal({
        readings: [reading],
        items: unchangedItems,
        onAfterSuccess: () => {
          setEditedReadings((prev) => {
            const newEdited = { ...prev };
            delete newEdited[machineId];
            return newEdited;
          });
          setErrors((prev) => {
            const newErrors = { ...prev };
            Object.keys(newErrors).forEach((key) => {
              if (key.startsWith(`${machineId}-`)) {
                delete newErrors[key];
              }
            });
            return newErrors;
          });
          toast.success(`Saved readings for ${machine.machine.machineSerialNumber}`);
        },
      });
      return;
    }

    try {
      await readingsApi.submit({ year, month, readings: [reading], branch: queryBranch });
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
      
      queryClient.invalidateQueries(['readings', year, month, queryBranch]);
      queryClient.invalidateQueries(['toner-alerts']);
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
  },
  [isLocked, year, month, queryBranch, queryClient]
);

  const handleCancelMachine = useCallback((machineId) => {
    setEditedReadings((prev) => {
      const newEdited = { ...prev };
      delete newEdited[machineId];
      return newEdited;
    });

    setErrors((prev) => {
      const newErrors = { ...prev };
      Object.keys(newErrors).forEach((key) => {
        if (key.startsWith(`${machineId}-`)) {
          delete newErrors[key];
        }
      });
      return newErrors;
    });

    toast.success('Cleared all input for this machine');
  }, []);

  const handleDeleteReading = useCallback(
    async (machineId) => {
      if (isLocked) {
        toast.error('This month has been submitted and is locked for editing');
        return;
      }

      const machine = machinesRef.current.find((m) => m.machine.id === machineId);
      if (!machine) return;

      if (!window.confirm(`Are you sure you want to delete the reading for ${machine.machine.machineSerialNumber}? This action cannot be undone.`)) {
        return;
      }

      try {
        await readingsApi.delete(machineId, year, month);
        toast.success(`Deleted reading for ${machine.machine.machineSerialNumber}`);

        setEditedReadings((prev) => {
          const newEdited = { ...prev };
          delete newEdited[machineId];
          return newEdited;
        });

        setErrors((prev) => {
          const newErrors = { ...prev };
          Object.keys(newErrors).forEach((key) => {
            if (key.startsWith(`${machineId}-`)) {
              delete newErrors[key];
            }
          });
          return newErrors;
        });

        queryClient.invalidateQueries(['readings', year, month, queryBranch]);
        queryClient.invalidateQueries(['toner-alerts']);
      } catch (error) {
        toast.error(error.response?.data?.error || 'Failed to delete reading');
      }
    },
    [isLocked, year, month, queryBranch, queryClient]
  );

  const handleSubmitAndExport = async (format = 'xlsx') => {
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
          await readingsApi.submit({ year, month, readings: readingsToSubmit, branch: queryBranch });
          setEditedReadings({});
          queryClient.invalidateQueries(['readings', year, month, queryBranch]);
          queryClient.invalidateQueries(['toner-alerts']);
        } catch (error) {
          toast.error('Failed to save readings before export');
          return;
        }
      }
    }

    // Then export (format is passed as argument: 'xlsx' or 'txt')
    const ext = format === 'txt' ? 'txt' : 'xlsx';
    try {
      const response = await readingsApi.export(year, month, queryBranch, format);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `meter-readings-${queryBranch || 'all'}-${year}-${String(month).padStart(2, '0')}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`${format === 'txt' ? 'Text' : 'Excel'} file exported successfully! Month has been locked.`);
      // Refresh to get locked status
      queryClient.invalidateQueries(['readings', year, month, queryBranch]);
      queryClient.invalidateQueries(['toner-alerts']);
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

  const previousMonthLabel = useMemo(() => {
    const prevM = month === 1 ? 12 : month - 1;
    const prevY = month === 1 ? year - 1 : year;
    return new Date(prevY, prevM - 1).toLocaleString('default', { month: 'short', year: 'numeric' });
  }, [year, month]);

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
            <div data-tour="capture-locked" className="mt-2 flex items-center justify-between gap-4 text-sm bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                <span className="text-yellow-800">
                  This month has been submitted and is locked for editing. Submitted on{' '}
                  {new Date(submission.submittedAt).toLocaleDateString()}
                </span>
              </div>
              {isElevated && queryBranch && (
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
          <div data-tour="month-nav" className="flex items-center liquid-glass rounded-lg">
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
          {!isLocked && (isComplete || isElevated) ? (
            <div data-tour="submit-buttons" className="flex items-center gap-2">
              {isComplete ? (
                // Show export buttons for all users when 100% complete
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSubmitAndExport('xlsx')}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export Excel
                  </button>
                  <button
                    onClick={() => handleSubmitAndExport('txt')}
                    className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-md"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Export Text
                  </button>
                </div>
              ) : (
                // Show export buttons only for admins when not complete
                <>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSubmitAndExport('xlsx')}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                      title="Admin: Export available even if not 100% complete"
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export Excel
                    </button>
                    <button
                      onClick={() => handleSubmitAndExport('txt')}
                      className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-md"
                      title="Admin: Export available even if not 100% complete"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Export Text
                    </button>
                  </div>
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
              <div data-tour="submit-buttons" className="inline">
              <button
                onClick={handleSave}
                disabled={!hasChanges || submitMutation.isPending || isLocked}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="h-4 w-4 mr-2" />
                {submitMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
              </div>
            )
          )}
        </div>
      </div>

      {/* Summary Bar - glass */}
      <div data-tour="summary-bar" className="liquid-glass rounded-xl p-4">
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
      <div data-tour="search-machines" className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search machines..."
          value={search}
          onChange={(e) => setSearch(trimLeading(e.target.value))}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Readings Table - glass */}
      <div data-tour="readings-table" className="liquid-glass rounded-xl overflow-hidden">
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
                <CaptureMachineRow
                  key={machine.id}
                  machine={machine}
                  currentReading={currentReading}
                  previousReading={previousReading}
                  previousMonthLabel={previousMonthLabel}
                  editedFields={editedReadings[machine.id]}
                  monoError={errors[`${machine.id}-monoReading`]}
                  colourError={errors[`${machine.id}-colourReading`]}
                  scanError={errors[`${machine.id}-scanReading`]}
                  noteError={errors[`${machine.id}-note`]}
                  isLocked={isLocked}
                  isElevated={isElevated}
                  savePending={submitMutation.isPending}
                  onReadingChange={handleReadingChange}
                  onSaveSingle={handleSaveSingle}
                  onCancelMachine={handleCancelMachine}
                  onDeleteReading={handleDeleteReading}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {unchangedModal && (
        <ReadingUnchangedConfirmModal
          items={unchangedModal.items}
          defaultReasons={unchangedModal.defaultReasons}
          onConfirm={handleUnchangedConfirm}
          onCancel={handleUnchangedCancel}
          isSubmitting={submitMutation.isPending}
        />
      )}
    </div>
  );
};

export default Capture;
