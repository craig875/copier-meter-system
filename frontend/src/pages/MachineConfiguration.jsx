import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { makesApi, modelsApi, consumablesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Printer,
  Package,
  Upload,
  Download,
  FileSpreadsheet,
} from 'lucide-react';

const MachineConfiguration = () => {
  const queryClient = useQueryClient();
  const { effectiveBranch } = useAuth();
  const [expandedMakes, setExpandedMakes] = useState(new Set());
  const [expandedModels, setExpandedModels] = useState(new Set());
  const [editingMake, setEditingMake] = useState(null);
  const [editingModel, setEditingModel] = useState(null);
  const [editingModelName, setEditingModelName] = useState('');
  const [editingModelPaperSize, setEditingModelPaperSize] = useState('A4');
  const [editingModelType, setEditingModelType] = useState('mono');
  const [editingModelMachineLife, setEditingModelMachineLife] = useState('');
  const [editingPart, setEditingPart] = useState(null);
  const [showMakeForm, setShowMakeForm] = useState(false);
  const [showModelForm, setShowModelForm] = useState(null); // makeId
  const [showPartForm, setShowPartForm] = useState(null); // modelId
  const [makeForm, setMakeForm] = useState({ name: '' });
  const [modelForm, setModelForm] = useState({ makeId: '', name: '', paperSize: 'A4', modelType: 'mono', machineLife: '' });
  const [partForm, setPartForm] = useState({
    partName: '',
    itemCode: '',
    partType: 'general',
    tonerColor: '',
    expectedYield: '',
    costRand: '',
    meterType: 'mono',
  });
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importErrors, setImportErrors] = useState([]);

  const { data: makesData, isLoading } = useQuery({
    queryKey: ['makes'],
    queryFn: () => makesApi.getAll(),
  });
  const { data: partsData } = useQuery({
    queryKey: ['model-parts-all', effectiveBranch],
    queryFn: () => consumablesApi.getModelPartsAll(effectiveBranch),
  });

  const makes = makesData?.makes || [];
  const allParts = partsData?.parts || [];
  const partsByModel = allParts.reduce((acc, p) => {
    const mid = p.modelId || p.model?.id;
    if (!mid) return acc;
    if (!acc[mid]) acc[mid] = [];
    acc[mid].push(p);
    return acc;
  }, {});

  const createMake = useMutation({
    mutationFn: makesApi.create,
    onSuccess: () => {
      toast.success('Make added');
      setShowMakeForm(false);
      setMakeForm({ name: '' });
      queryClient.invalidateQueries(['makes']);
    },
    onError: (e) => toast.error(e?.response?.data?.error || 'Failed'),
  });

  const updateMake = useMutation({
    mutationFn: ({ id, data }) => makesApi.update(id, data),
    onSuccess: () => {
      toast.success('Make updated');
      setEditingMake(null);
      queryClient.invalidateQueries(['makes']);
    },
    onError: (e) => toast.error(e?.response?.data?.error || 'Failed'),
  });

  const deleteMake = useMutation({
    mutationFn: makesApi.delete,
    onSuccess: () => {
      toast.success('Make deleted');
      queryClient.invalidateQueries(['makes']);
      queryClient.invalidateQueries(['model-parts-all']);
    },
    onError: (e) => toast.error(e?.response?.data?.error || 'Failed'),
  });

  const createModel = useMutation({
    mutationFn: modelsApi.create,
    onSuccess: () => {
      toast.success('Model added');
      setShowModelForm(null);
      setModelForm({ makeId: '', name: '', paperSize: 'A4', modelType: 'mono', machineLife: '' });
      queryClient.invalidateQueries(['makes']);
    },
    onError: (e) => toast.error(e?.response?.data?.error || 'Failed'),
  });

  const updateModel = useMutation({
    mutationFn: ({ id, data }) => modelsApi.update(id, data),
    onSuccess: () => {
      toast.success('Model updated');
      setEditingModel(null);
      queryClient.invalidateQueries(['makes']);
    },
    onError: (e) => toast.error(e?.response?.data?.error || 'Failed'),
  });

  const deleteModel = useMutation({
    mutationFn: modelsApi.delete,
    onSuccess: () => {
      toast.success('Model deleted');
      queryClient.invalidateQueries(['makes']);
      queryClient.invalidateQueries(['model-parts-all']);
    },
    onError: (e) => toast.error(e?.response?.data?.error || 'Failed'),
  });

  const createPart = useMutation({
    mutationFn: consumablesApi.createModelPart,
    onSuccess: () => {
      toast.success('Part added');
      setShowPartForm(null);
      resetPartForm();
      queryClient.invalidateQueries(['model-parts-all']);
    },
    onError: (e) => toast.error(e?.response?.data?.error || 'Failed'),
  });

  const updatePart = useMutation({
    mutationFn: ({ id, data }) => consumablesApi.updateModelPart(id, data),
    onSuccess: () => {
      toast.success('Part updated');
      setEditingPart(null);
      queryClient.invalidateQueries(['model-parts-all']);
    },
    onError: (e) => toast.error(e?.response?.data?.error || 'Failed'),
  });

  const deletePart = useMutation({
    mutationFn: consumablesApi.deleteModelPart,
    onSuccess: () => {
      toast.success('Part deleted');
      queryClient.invalidateQueries(['model-parts-all']);
    },
    onError: (e) => toast.error(e?.response?.data?.error || 'Failed'),
  });

  const importMakeModelParts = useMutation({
    mutationFn: ({ data, branch }) => makesApi.import(data, branch),
    onSuccess: (res) => {
      const r = res?.results || res;
      toast.success(
        `Import complete: ${r.makesCreated || 0} makes, ${r.modelsCreated || 0} models, ${r.partsCreated || 0} parts created, ${r.partsUpdated || 0} parts updated`
      );
      if ((r.errors || []).length > 0) {
        toast(`${r.errors.length} row(s) had errors`, { icon: '⚠️' });
      }
      queryClient.invalidateQueries(['makes']);
      queryClient.invalidateQueries(['model-parts-all']);
      setImportFile(null);
      setImportPreview(null);
      setShowImport(false);
    },
    onError: (e) => toast.error(e?.response?.data?.error || 'Failed'),
  });

  const resetPartForm = () => {
    setPartForm({
      partName: '',
      itemCode: '',
      partType: 'general',
      tonerColor: '',
      expectedYield: '',
      costRand: '',
      meterType: 'mono',
    });
  };

  const toggleMake = (id) => {
    setExpandedMakes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleModel = (id) => {
    setExpandedModels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else current += char;
    }
    result.push(current.trim());
    return result;
  };

  const handleImportFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setImportFile(f);
    setImportErrors([]);
    setImportPreview(null);
    if (!f.name.endsWith('.csv')) {
      setImportErrors(['Please upload a CSV file']);
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target.result;
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        if (lines.length < 2) {
          setImportErrors(['CSV must have header and at least one data row']);
          return;
        }
        const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/^"|"$/g, '').trim());
        const hasMake = headers.some((h) => h === 'make');
        const hasModel = headers.some((h) => h === 'model');
        if (!hasMake || !hasModel) {
          setImportErrors(['CSV must have "make" and "model" columns']);
          return;
        }
        const data = [];
        for (let i = 1; i < lines.length; i++) {
          const vals = parseCSVLine(lines[i]).map((v) => v.replace(/^"|"$/g, '').trim());
          const row = {};
          headers.forEach((h, idx) => {
            row[h] = vals[idx] ?? '';
          });
          if (row.make?.trim() && row.model?.trim()) data.push(row);
        }
        setImportPreview({
          headers,
          data: data.slice(0, 10),
          totalRows: data.length,
          fullData: data,
        });
      } catch (err) {
        setImportErrors([`Parse error: ${err.message}`]);
      }
    };
    reader.readAsText(f);
  };

  const runImport = () => {
    if (!importPreview?.fullData?.length) {
      toast.error('No data to import');
      return;
    }
    importMakeModelParts.mutate({
      data: importPreview.fullData,
      branch: effectiveBranch || 'JHB',
    });
  };

  const downloadTemplate = () => {
    const headers = 'make,model,paper_size,model_type,machine_life,part_name,item_code,part_type,toner_color,expected_yield,cost_rand,meter_type';
    const example = 'Canon,iR-ADV C5535,A4,colour,,Drum Unit,DR-101,general,,50000,1500,mono\nCanon,iR-ADV C5535,A4,colour,,Cyan Toner,CT-C,toner,cyan,15000,800,colour';
    const csv = `${headers}\n${example}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'makes-models-parts-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Import section */}
      <div className="liquid-glass rounded-xl p-6">
        <button
          type="button"
          onClick={() => setShowImport(!showImport)}
          className="flex items-center gap-2 text-gray-700 hover:text-red-600"
        >
          {showImport ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          <Upload className="h-5 w-5" />
          Import makes, models & parts
        </button>
        {showImport && (
          <div className="mt-4 space-y-4 border-t pt-4">
            <p className="text-sm text-gray-500">
              Upload a CSV with columns: make, model, paper_size (A3/A4), model_type (mono/colour), machine_life, part_name, item_code, part_type (general/toner), toner_color (black/cyan/magenta/yellow), expected_yield, cost_rand, meter_type (mono/colour/total). Rows with make+model but no part_name create makes/models only.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={downloadTemplate}
                className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
              >
                <Download className="h-4 w-4" />
                Download template
              </button>
              <label className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50 cursor-pointer">
                <FileSpreadsheet className="h-4 w-4" />
                Choose CSV
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleImportFileChange}
                />
              </label>
              {importFile && (
                <span className="text-sm text-gray-600">{importFile.name}</span>
              )}
            </div>
            {importErrors.length > 0 && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {importErrors.map((e, i) => (
                  <p key={i}>{e}</p>
                ))}
              </div>
            )}
            {importPreview && (
              <>
                <div className="text-sm text-gray-600">
                  Preview: {importPreview.totalRows} row(s). First {importPreview.data?.length || 0} shown.
                </div>
                <div className="overflow-x-auto max-h-48 overflow-y-auto border rounded">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        {importPreview.headers?.map((h) => (
                          <th key={h} className="px-2 py-1 text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.data?.map((row, i) => (
                        <tr key={i} className="border-t">
                          {importPreview.headers?.map((h) => (
                            <td key={h} className="px-2 py-1">{row[h] ?? '-'}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  type="button"
                  onClick={runImport}
                  disabled={importMakeModelParts.isPending || !importPreview.fullData?.length}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {importMakeModelParts.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Import {importPreview.totalRows} row(s)
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="liquid-glass rounded-xl p-6">
        <p className="text-gray-600 mb-4">
          Configure machine makes, models, and consumable parts. Client-level machines are then assigned a make and model when adding or editing in <strong>Meter Readings → Machines</strong>.
        </p>

        {showMakeForm && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-2">Add make</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={makeForm.name}
                onChange={(e) => setMakeForm({ name: e.target.value })}
                placeholder="e.g. Canon, Olivetti"
                className="flex-1 px-3 py-2 border rounded-lg"
              />
              <button
                onClick={() => createMake.mutate(makeForm)}
                disabled={!makeForm.name.trim() || createMake.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Add
              </button>
              <button onClick={() => setShowMakeForm(false)} className="px-4 py-2 border rounded-lg">
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {makes.map((make) => (
            <div key={make.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <div
                className="flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 cursor-pointer"
                onClick={() => toggleMake(make.id)}
              >
                <div className="flex items-center gap-2">
                  {expandedMakes.has(make.id) ? (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-500" />
                  )}
                  <Printer className="h-5 w-5 text-red-600" />
                  {editingMake === make.id ? (
                    <input
                      type="text"
                      defaultValue={make.name}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v && v !== make.name) updateMake.mutate({ id: make.id, data: { name: v } });
                        setEditingMake(null);
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                      onClick={(e) => e.stopPropagation()}
                      className="px-2 py-1 border rounded"
                      autoFocus
                    />
                  ) : (
                    <span className="font-medium">{make.name}</span>
                  )}
                </div>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setEditingMake(make.id)}
                    className="p-2 text-gray-500 hover:text-red-600"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      const modelCount = make.models?.length ?? 0;
                      const msg = modelCount > 0
                        ? `Delete ${make.name}? This will also delete ${modelCount} model(s) and their parts.`
                        : `Delete ${make.name}?`;
                      if (window.confirm(msg)) deleteMake.mutate(make.id);
                    }}
                    className="p-2 text-gray-500 hover:text-red-600"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowModelForm(make.id); setModelForm({ makeId: make.id, name: '', paperSize: 'A4', modelType: 'mono', machineLife: '' }); }}
                    className="flex items-center gap-1 px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                  >
                    <Plus className="h-4 w-4" /> Add model
                  </button>
                </div>
              </div>

              {expandedMakes.has(make.id) && (
                <div className="border-t bg-gray-50/50 p-4 space-y-3">
                  {showModelForm === make.id && (
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <input
                        type="text"
                        value={modelForm.name}
                        onChange={(e) => setModelForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="Model name (e.g. iR-ADV C5535)"
                        className="flex-1 min-w-[180px] px-3 py-2 border rounded-lg"
                      />
                      <select
                        value={modelForm.paperSize}
                        onChange={(e) => setModelForm((f) => ({ ...f, paperSize: e.target.value }))}
                        className="px-3 py-2 border rounded-lg"
                      >
                        <option value="A3">A3</option>
                        <option value="A4">A4</option>
                      </select>
                      <select
                        value={modelForm.modelType}
                        onChange={(e) => setModelForm((f) => ({ ...f, modelType: e.target.value }))}
                        className="px-3 py-2 border rounded-lg"
                      >
                        <option value="mono">Mono</option>
                        <option value="colour">Colour</option>
                      </select>
                      <input
                        type="number"
                        min="1"
                        value={modelForm.machineLife}
                        onChange={(e) => setModelForm((f) => ({ ...f, machineLife: e.target.value }))}
                        placeholder="Machine life"
                        className="w-28 px-3 py-2 border rounded-lg"
                      />
                      <button
                        onClick={() => createModel.mutate({ ...modelForm, makeId: make.id, machineLife: modelForm.machineLife || null })}
                        disabled={!modelForm.name.trim() || createModel.isPending}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg"
                      >
                        Add
                      </button>
                      <button onClick={() => setShowModelForm(null)} className="px-4 py-2 border rounded-lg">Cancel</button>
                    </div>
                  )}
                  {(make.models || []).map((model) => (
                    <div key={model.id} className="border rounded-lg bg-white overflow-hidden">
                      <div
                        className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-gray-50"
                        onClick={() => toggleModel(model.id)}
                      >
                        <div className="flex items-center gap-2">
                          {expandedModels.has(model.id) ? (
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-500" />
                          )}
                          {editingModel === model.id ? (
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <input
                                value={editingModelName}
                                onChange={(e) => setEditingModelName(e.target.value)}
                                onBlur={() => {
                                  const nameChanged = editingModelName.trim() && editingModelName !== model.name;
                                  const paperChanged = editingModelPaperSize !== (model.paperSize || 'A4');
                                  const typeChanged = editingModelType !== (model.modelType || 'mono');
                                  const currentLife = model.machineLife != null ? String(model.machineLife) : '';
                                  const lifeChanged = editingModelMachineLife !== currentLife;
                                  if (nameChanged || paperChanged || typeChanged || lifeChanged) {
                                    updateModel.mutate({
                                      id: model.id,
                                      data: {
                                        ...(nameChanged && { name: editingModelName.trim() }),
                                        ...(paperChanged && { paperSize: editingModelPaperSize }),
                                        ...(typeChanged && { modelType: editingModelType }),
                                        ...(lifeChanged && { machineLife: editingModelMachineLife ? Number(editingModelMachineLife) : null }),
                                      },
                                    });
                                  }
                                  setEditingModel(null);
                                }}
                                onKeyDown={(e) => e.key === 'Enter' && (document.activeElement?.blur?.())}
                                className="px-2 py-1 border rounded text-sm w-40"
                                autoFocus
                              />
                              <select
                                value={editingModelPaperSize}
                                onChange={(e) => setEditingModelPaperSize(e.target.value)}
                                className="px-2 py-1 border rounded text-sm"
                              >
                                <option value="A3">A3</option>
                                <option value="A4">A4</option>
                              </select>
                              <select
                                value={editingModelType}
                                onChange={(e) => setEditingModelType(e.target.value)}
                                className="px-2 py-1 border rounded text-sm"
                              >
                                <option value="mono">Mono</option>
                                <option value="colour">Colour</option>
                              </select>
                              <input
                                type="number"
                                min="1"
                                value={editingModelMachineLife}
                                onChange={(e) => setEditingModelMachineLife(e.target.value)}
                                placeholder="Machine life"
                                className="w-24 px-2 py-1 border rounded text-sm"
                              />
                            </div>
                          ) : (
                            <span className="font-medium">
                              {make.name} {model.name}
                              <span className="ml-2 text-xs font-normal text-gray-500">
                                ({model.paperSize || 'A4'} · {model.modelType === 'colour' ? 'Colour' : 'Mono'}
                                {model.machineLife != null ? ` · ${model.machineLife.toLocaleString()}` : ''})
                              </span>
                            </span>
                          )}
                          <span className="text-xs text-gray-500">({(partsByModel[model.id] || []).length} parts)</span>
                        </div>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => { setShowPartForm(model.id); setShowModelForm(null); resetPartForm(); }}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                          >
                            <Plus className="h-3 w-3" /> Add part
                          </button>
                          <button
                            onClick={() => {
                              setEditingModel(model.id);
                              setEditingModelName(model.name);
                              setEditingModelPaperSize(model.paperSize || 'A4');
                              setEditingModelType(model.modelType || 'mono');
                              setEditingModelMachineLife(model.machineLife != null ? String(model.machineLife) : '');
                            }}
                            className="p-1 text-gray-500 hover:text-red-600"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              const partCount = (partsByModel[model.id] || []).length;
                              const msg = partCount > 0
                                ? `Delete ${model.name}? This will also delete ${partCount} part(s). Assigned machines will be unassigned.`
                                : `Delete ${model.name}? Assigned machines will be unassigned.`;
                              if (window.confirm(msg)) deleteModel.mutate(model.id);
                            }}
                            className="p-1 text-gray-500 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {expandedModels.has(model.id) && (
                        <div className="border-t p-4 space-y-2">
                          {showPartForm === model.id && (
                            <div className="p-4 bg-amber-50 rounded-lg space-y-3 mb-4">
                              <h4 className="font-medium">Add consumable part</h4>
                              <div className="grid grid-cols-2 gap-3">
                                <input
                                  placeholder="Part name (e.g. Black Toner)"
                                  value={partForm.partName}
                                  onChange={(e) => setPartForm((f) => ({ ...f, partName: e.target.value }))}
                                  className="px-3 py-2 border rounded-lg"
                                />
                                <input
                                  placeholder="Item code"
                                  value={partForm.itemCode}
                                  onChange={(e) => setPartForm((f) => ({ ...f, itemCode: e.target.value }))}
                                  className="px-3 py-2 border rounded-lg"
                                />
                                <select
                                  value={partForm.partType}
                                  onChange={(e) => setPartForm((f) => ({ ...f, partType: e.target.value, tonerColor: e.target.value === 'toner' ? f.tonerColor : '' }))}
                                  className="px-3 py-2 border rounded-lg"
                                >
                                  <option value="general">General</option>
                                  <option value="toner">Toner</option>
                                </select>
                                {partForm.partType === 'toner' && (
                                  <select
                                    value={partForm.tonerColor}
                                    onChange={(e) => setPartForm((f) => ({ ...f, tonerColor: e.target.value }))}
                                    className="px-3 py-2 border rounded-lg"
                                  >
                                    <option value="">Select colour...</option>
                                    <option value="black">Black</option>
                                    <option value="cyan">Cyan</option>
                                    <option value="magenta">Magenta</option>
                                    <option value="yellow">Yellow</option>
                                  </select>
                                )}
                                <input
                                  type="number"
                                  placeholder="Expected yield (clicks)"
                                  value={partForm.expectedYield}
                                  onChange={(e) => setPartForm((f) => ({ ...f, expectedYield: e.target.value }))}
                                  className="px-3 py-2 border rounded-lg"
                                />
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="Cost (Rand)"
                                  value={partForm.costRand}
                                  onChange={(e) => setPartForm((f) => ({ ...f, costRand: e.target.value }))}
                                  className="px-3 py-2 border rounded-lg"
                                />
                                <select
                                  value={partForm.meterType}
                                  onChange={(e) => setPartForm((f) => ({ ...f, meterType: e.target.value }))}
                                  className="px-3 py-2 border rounded-lg"
                                >
                                  <option value="mono">Mono</option>
                                  <option value="colour">Colour</option>
                                  <option value="total">Total (mono + colour)</option>
                                </select>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => createPart.mutate({
                                    modelId: model.id,
                                    partName: partForm.partName.trim(),
                                    itemCode: partForm.itemCode?.trim() || null,
                                    partType: partForm.partType,
                                    tonerColor: partForm.partType === 'toner' && partForm.tonerColor ? partForm.tonerColor : null,
                                    expectedYield: parseInt(partForm.expectedYield, 10) || 0,
                                    costRand: parseFloat(partForm.costRand) || 0,
                                    meterType: partForm.meterType,
                                    branch: effectiveBranch || 'JHB',
                                  })}
                                  disabled={!partForm.partName.trim() || createPart.isPending}
                                  className="px-4 py-2 bg-red-600 text-white rounded-lg"
                                >
                                  Add part
                                </button>
                                <button onClick={() => setShowPartForm(null)} className="px-4 py-2 border rounded-lg">Cancel</button>
                              </div>
                            </div>
                          )}
                          {(partsByModel[model.id] || []).map((p) => (
                            <div
                              key={p.id}
                              className="flex items-center justify-between px-4 py-2 bg-gray-50 rounded text-sm"
                            >
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-gray-500" />
                                <span className="font-medium">{p.partName}</span>
                                {p.itemCode && <span className="text-gray-500 text-xs">{p.itemCode}</span>}
                                <span className="text-gray-500">
                                  ({p.partType}{p.partType === 'toner' && p.tonerColor ? ` · ${p.tonerColor.charAt(0).toUpperCase() + p.tonerColor.slice(1)}` : ''})
                                </span>
                                <span className="text-gray-500">Yield: {p.expectedYield?.toLocaleString()} • R{Number(p.costRand || 0).toFixed(2)}</span>
                              </div>
                              <div className="flex gap-1">
                                <button onClick={() => setEditingPart(p)} className="p-1 text-gray-500 hover:text-red-600">
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => window.confirm('Delete part?') && deletePart.mutate(p.id)}
                                  className="p-1 text-gray-500 hover:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                          {(partsByModel[model.id] || []).length === 0 && showPartForm !== model.id && (
                            <p className="text-gray-500 text-sm py-2">No parts configured. Click &quot;Add part&quot; to add toners and consumables.</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {(make.models || []).length === 0 && showModelForm !== make.id && (
                    <p className="text-gray-500 text-sm py-2">No models. Click &quot;Add model&quot; to add one.</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {!showMakeForm && (
          <button
            onClick={() => setShowMakeForm(true)}
            className="mt-4 flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-red-500 hover:text-red-600"
          >
            <Plus className="h-5 w-5" />
            Add make
          </button>
        )}
      </div>

      {editingPart && (
        <PartEditModal
          part={editingPart}
          onClose={() => setEditingPart(null)}
          onSave={(formData) => {
            updatePart.mutate({
              id: editingPart.id,
              data: {
                partName: formData.partName,
                itemCode: formData.itemCode?.trim() || null,
                partType: formData.partType,
                tonerColor: formData.partType === 'toner' && formData.tonerColor ? formData.tonerColor : null,
                expectedYield: parseInt(formData.expectedYield, 10) || 0,
                costRand: parseFloat(formData.costRand) || 0,
                meterType: formData.meterType,
              },
            });
            setEditingPart(null);
          }}
        />
      )}
    </div>
  );
};

const PartEditModal = ({ part, onClose, onSave }) => {
  const [form, setForm] = useState({
    partName: part.partName,
    itemCode: part.itemCode || '',
    partType: part.partType,
    tonerColor: part.tonerColor || '',
    expectedYield: String(part.expectedYield || ''),
    costRand: String(Number(part.costRand) || ''),
    meterType: part.meterType || 'mono',
  });
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="liquid-glass rounded-xl p-6 max-w-md w-full">
        <h3 className="font-semibold mb-4">Edit part</h3>
        <div className="space-y-3">
          <input
            value={form.partName}
            onChange={(e) => setForm((f) => ({ ...f, partName: e.target.value }))}
            placeholder="Part name"
            className="w-full px-3 py-2 border rounded-lg"
          />
          <input
            value={form.itemCode}
            onChange={(e) => setForm((f) => ({ ...f, itemCode: e.target.value }))}
            placeholder="Item code"
            className="w-full px-3 py-2 border rounded-lg"
          />
          <select value={form.partType} onChange={(e) => setForm((f) => ({ ...f, partType: e.target.value, tonerColor: e.target.value === 'toner' ? f.tonerColor : '' }))} className="w-full px-3 py-2 border rounded-lg">
            <option value="general">General</option>
            <option value="toner">Toner</option>
          </select>
          {form.partType === 'toner' && (
            <select value={form.tonerColor} onChange={(e) => setForm((f) => ({ ...f, tonerColor: e.target.value }))} className="w-full px-3 py-2 border rounded-lg">
              <option value="">Select colour...</option>
              <option value="black">Black</option>
              <option value="cyan">Cyan</option>
              <option value="magenta">Magenta</option>
              <option value="yellow">Yellow</option>
            </select>
          )}
          <select value={form.meterType} onChange={(e) => setForm((f) => ({ ...f, meterType: e.target.value }))} className="w-full px-3 py-2 border rounded-lg">
            <option value="mono">Mono</option>
            <option value="colour">Colour</option>
            <option value="total">Total (mono + colour)</option>
          </select>
          <input
            type="number"
            value={form.expectedYield}
            onChange={(e) => setForm((f) => ({ ...f, expectedYield: e.target.value }))}
            placeholder="Expected yield"
            className="w-full px-3 py-2 border rounded-lg"
          />
          <input
            type="number"
            step="0.01"
            value={form.costRand}
            onChange={(e) => setForm((f) => ({ ...f, costRand: e.target.value }))}
            placeholder="Cost (Rand)"
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={() => onSave(form)} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg">
            Save
          </button>
          <button onClick={onClose} className="px-4 py-2 border rounded-lg">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default MachineConfiguration;
