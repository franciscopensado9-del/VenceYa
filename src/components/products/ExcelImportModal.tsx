import React, { useState, useRef, useMemo } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  AlertOctagon, 
  Info, 
  Layers, 
  Package, 
  Calendar, 
  ArrowRight, 
  ArrowLeft, 
  Edit3, 
  Trash2, 
  Check, 
  RefreshCw, 
  FileCheck,
  ShieldCheck,
  Eye,
  Filter
} from 'lucide-react';
import { ProductWithBatches, Product, Batch } from '../../types';
import { 
  RawParsedSheet, 
  ColumnMappingState, 
  ParsedRowResult, 
  ConsolidationResult, 
  StandardField, 
  STANDARD_FIELDS, 
  readExcelFile, 
  autoDetectField, 
  processAndConsolidateRows, 
  downloadExcelTemplate 
} from '../../services/excelImport';
import { storageService } from '../../services/storage';
import { firestoreSyncService } from '../../services/firestoreSync';
import { useAuth } from '../../contexts/AuthContext';
import { soundService } from '../../services/sound';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingProducts: ProductWithBatches[];
  onImportComplete: () => void;
}

type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing' | 'success';

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  existingProducts,
  onImportComplete,
}) => {
  const { userProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Flow step
  const [step, setStep] = useState<ImportStep>('upload');

  // File & Raw Data state
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isReadingFile, setIsReadingFile] = useState<boolean>(false);
  const [rawSheet, setRawSheet] = useState<RawParsedSheet | null>(null);

  // Column Mapping state
  const [columnMapping, setColumnMapping] = useState<ColumnMappingState>({});

  // Preview & Processing state
  const [consolidation, setConsolidation] = useState<ConsolidationResult | null>(null);
  const [previewFilter, setPreviewFilter] = useState<'all' | 'valid' | 'issues' | 'excluded'>('all');
  const [editingRowNumber, setEditingRowNumber] = useState<number | null>(null);
  const [editedRows, setEditedRows] = useState<Record<number, Partial<ParsedRowResult>>>({});

  // Final Import state
  const [importProgress, setImportProgress] = useState<number>(0);
  const [importResult, setImportResult] = useState<{
    productsSaved: number;
    batchesSaved: number;
    errors: string[];
  } | null>(null);

  if (!isOpen) return null;

  // --- STEP 1: FILE SELECTION & READING ---

  const handleProcessFile = async (selectedFile: File) => {
    setParseError(null);
    setIsReadingFile(true);
    setFile(selectedFile);

    try {
      const parsed = await readExcelFile(selectedFile);
      setRawSheet(parsed);

      // Auto-detect columns
      const initialMapping: ColumnMappingState = {};
      parsed.headers.forEach(h => {
        initialMapping[h] = autoDetectField(h);
      });
      setColumnMapping(initialMapping);

      soundService.playScanSuccess();
      setStep('mapping');
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Error al leer el archivo.');
    } finally {
      setIsReadingFile(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const dropped = e.dataTransfer.files[0];
      handleProcessFile(dropped);
    }
  };

  // --- STEP 2: COLUMN MAPPING ---

  const handleMappingChange = (header: string, field: StandardField | 'ignore') => {
    setColumnMapping(prev => ({
      ...prev,
      [header]: field,
    }));
  };

  // Check if required fields are mapped
  const mappedFields = useMemo(() => {
    return new Set(Object.values(columnMapping));
  }, [columnMapping]);

  const hasRequiredFields = mappedFields.has('product_name') && 
                            mappedFields.has('quantity') && 
                            mappedFields.has('expiration_date');

  const missingRequiredLabels = useMemo(() => {
    const missing: string[] = [];
    if (!mappedFields.has('product_name')) missing.push('Nombre del Producto');
    if (!mappedFields.has('quantity')) missing.push('Cantidad / Stock');
    if (!mappedFields.has('expiration_date')) missing.push('Fecha de Vencimiento');
    return missing;
  }, [mappedFields]);

  const handleContinueToPreview = () => {
    if (!rawSheet || !hasRequiredFields) return;

    // Process rows into consolidation
    const result = processAndConsolidateRows(
      rawSheet.rows,
      columnMapping,
      existingProducts
    );
    setConsolidation(result);
    setStep('preview');
  };

  // --- STEP 3: PREVIEW, EDIT & TOGGLE EXCLUSION ---

  const handleToggleRowExclusion = (rowNum: number) => {
    if (!consolidation) return;
    const updatedPreview = consolidation.previewRows.map(r => {
      if (r.rowNumber === rowNum) {
        return { ...r, isExcluded: !r.isExcluded };
      }
      return r;
    });

    // Re-consolidate with excluded rows filtered
    const reprocessed = processAndConsolidateRows(
      rawSheet?.rows || [],
      columnMapping,
      existingProducts
    );
    // Apply exclusion state
    reprocessed.previewRows = updatedPreview;
    
    // Recount
    const validAndIncluded = updatedPreview.filter(r => !r.isExcluded && r.status === 'valid');
    reprocessed.validRowsCount = validAndIncluded.length;
    
    setConsolidation(reprocessed);
  };

  const handleSaveInlineEdit = (rowNum: number, field: keyof ParsedRowResult, value: any) => {
    if (!consolidation || !rawSheet) return;

    // Update raw sheet row
    const rawRowIdx = rowNum - 2;
    if (rawSheet.rows[rawRowIdx]) {
      // Find which excel header corresponds to field
      let targetHeader: string | undefined;
      for (const [hdr, mappedField] of Object.entries(columnMapping)) {
        if (
          (field === 'productName' && mappedField === 'product_name') ||
          (field === 'quantity' && mappedField === 'quantity') ||
          (field === 'expirationDate' && mappedField === 'expiration_date') ||
          (field === 'lotNumber' && mappedField === 'lot_number')
        ) {
          targetHeader = hdr;
          break;
        }
      }
      if (targetHeader) {
        rawSheet.rows[rawRowIdx][targetHeader] = value;
      }
    }

    // Reprocess
    const reprocessed = processAndConsolidateRows(
      rawSheet.rows,
      columnMapping,
      existingProducts
    );
    setConsolidation(reprocessed);
    setEditingRowNumber(null);
  };

  // Filtered rows for preview
  const displayPreviewRows = useMemo(() => {
    if (!consolidation) return [];
    return consolidation.previewRows.filter(r => {
      if (previewFilter === 'all') return true;
      if (previewFilter === 'valid') return r.status === 'valid' && !r.isExcluded;
      if (previewFilter === 'issues') return r.status !== 'valid';
      if (previewFilter === 'excluded') return r.isExcluded;
      return true;
    });
  }, [consolidation, previewFilter]);

  // --- STEP 4: CONFIRM & EXECUTE IMPORT ---

  const handleConfirmImport = async () => {
    if (!consolidation) return;
    setStep('importing');
    setImportProgress(10);

    const productsToSave = consolidation.productsToSave;
    const batchesToSave = consolidation.batchesToSave;

    try {
      setImportProgress(30);

      // 1. Save in local storage (handles demo mode or local cache seamlessly)
      storageService.bulkImport(productsToSave, batchesToSave);
      setImportProgress(60);

      // 2. Save in Firestore if user is logged in and not in demo mode
      let cloudErrors: string[] = [];
      let productsSaved = productsToSave.length;
      let batchesSaved = batchesToSave.length;

      if (userProfile?.storeId && !storageService.isDemoActive()) {
        const cloudRes = await firestoreSyncService.bulkImportProductsAndBatches(
          userProfile.storeId,
          productsToSave,
          batchesToSave
        );
        productsSaved = cloudRes.productsSaved;
        batchesSaved = cloudRes.batchesSaved;
        cloudErrors = cloudRes.errors;
      }

      setImportProgress(100);
      soundService.playScanSuccess();

      setImportResult({
        productsSaved,
        batchesSaved,
        errors: cloudErrors,
      });

      setStep('success');
      onImportComplete();
    } catch (err) {
      console.error('Import error:', err);
      setImportResult({
        productsSaved: 0,
        batchesSaved: 0,
        errors: [err instanceof Error ? err.message : 'Error al guardar en el servidor.'],
      });
      setStep('success');
    }
  };

  const handleReset = () => {
    setFile(null);
    setRawSheet(null);
    setColumnMapping({});
    setConsolidation(null);
    setParseError(null);
    setImportResult(null);
    setStep('upload');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-white border border-[#E7EBE5] rounded-3xl shadow-2xl my-auto overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-[#E7EBE5] flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#EAF3EC] text-[#246B4D] flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#246B4D] block truncate">
                ASISTENTE DE INVENTARIO
              </span>
              <h2 className="text-base sm:text-lg font-bold text-[#174A36] truncate">
                Importar inventario desde Excel o CSV
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-2xl text-[#78847C] hover:text-[#174A36] hover:bg-[#F8F9F6] transition shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="px-5 py-2.5 bg-[#F8F9F6] border-b border-[#E7EBE5] flex items-center justify-between text-xs font-semibold text-[#78847C] overflow-x-auto">
          <div className="flex items-center gap-2">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
              step === 'upload' ? 'bg-[#246B4D] text-white' : 'bg-[#EAF3EC] text-[#246B4D]'
            }`}>1</span>
            <span className={step === 'upload' ? 'text-[#174A36] font-bold' : ''}>Cargar Archivo</span>
          </div>

          <ArrowRight className="w-3.5 h-3.5 opacity-40 shrink-0 mx-2" />

          <div className="flex items-center gap-2">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
              step === 'mapping' ? 'bg-[#246B4D] text-white' : step === 'preview' || step === 'success' ? 'bg-[#EAF3EC] text-[#246B4D]' : 'bg-[#E7EBE5] text-[#78847C]'
            }`}>2</span>
            <span className={step === 'mapping' ? 'text-[#174A36] font-bold' : ''}>Asignar Columnas</span>
          </div>

          <ArrowRight className="w-3.5 h-3.5 opacity-40 shrink-0 mx-2" />

          <div className="flex items-center gap-2">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
              step === 'preview' || step === 'importing' ? 'bg-[#246B4D] text-white' : step === 'success' ? 'bg-[#EAF3EC] text-[#246B4D]' : 'bg-[#E7EBE5] text-[#78847C]'
            }`}>3</span>
            <span className={step === 'preview' ? 'text-[#174A36] font-bold' : ''}>Vista Previa y Control</span>
          </div>

          <ArrowRight className="w-3.5 h-3.5 opacity-40 shrink-0 mx-2" />

          <div className="flex items-center gap-2">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
              step === 'success' ? 'bg-[#246B4D] text-white' : 'bg-[#E7EBE5] text-[#78847C]'
            }`}>4</span>
            <span className={step === 'success' ? 'text-[#174A36] font-bold' : ''}>Completado</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-sm text-[#24372F]">

          {/* ================= STEP 1: UPLOAD ================= */}
          {step === 'upload' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Informative Value Prop */}
              <div className="p-4 rounded-2xl bg-[#EAF3EC] border border-[#D5E8D7] text-[#174A36] space-y-1">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-[#246B4D]" />
                  ¿Ya tenés tu inventario en Excel?
                </h3>
                <p className="text-xs text-[#24372F] leading-relaxed">
                  Importalo a VenceYa y evitá cargar tus productos manualmente uno por uno. El asistente reconocerá automáticamente las columnas y agrupará múltiples fechas de vencimiento de un mismo producto en lotes separados.
                </p>
              </div>

              {/* Upload Dropzone */}
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-8 sm:p-12 border-2 border-dashed rounded-3xl text-center cursor-pointer transition flex flex-col items-center justify-center space-y-3.5 ${
                  isDragging 
                    ? 'border-[#246B4D] bg-[#EAF3EC]/50 scale-[0.99]' 
                    : 'border-[#E7EBE5] hover:border-[#246B4D]/50 hover:bg-[#F8F9F6]'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx,.xls,.csv"
                  onChange={e => {
                    if (e.target.value && e.target.files && e.target.files[0]) {
                      handleProcessFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                <div className="w-16 h-16 rounded-3xl bg-[#EAF3EC] text-[#246B4D] flex items-center justify-center shadow-xs">
                  {isReadingFile ? (
                    <RefreshCw className="w-7 h-7 animate-spin" />
                  ) : (
                    <Upload className="w-7 h-7 stroke-[2]" />
                  )}
                </div>

                <div>
                  <h4 className="text-base font-bold text-[#174A36]">
                    {isReadingFile ? 'Leyendo archivo...' : 'Hacé clic para seleccionar o arrastrá tu archivo aquí'}
                  </h4>
                  <p className="text-xs text-[#78847C] mt-1">
                    Formatos compatibles: <strong>.xlsx</strong>, <strong>.xls</strong> o <strong>.csv</strong> (hasta 10 MB)
                  </p>
                </div>

                <button
                  type="button"
                  className="px-5 py-2.5 rounded-2xl bg-[#246B4D] hover:bg-[#174A36] text-white text-xs font-bold transition shadow-xs min-h-[44px]"
                >
                  Seleccionar archivo desde el dispositivo
                </button>
              </div>

              {/* Error message if parse failed */}
              {parseError && (
                <div className="p-4 rounded-2xl bg-[#FFF8F7] border border-[#FCEBE5] text-xs text-[#C6533A] flex items-start gap-2.5">
                  <AlertOctagon className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">No se pudo procesar el archivo</span>
                    <span className="leading-relaxed">{parseError}</span>
                  </div>
                </div>
              )}

              {/* Template Download Option */}
              <div className="p-4 sm:p-5 rounded-3xl bg-[#F8F9F6] border border-[#E7EBE5] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-[#174A36]">¿Preferís usar nuestra plantilla de ejemplo?</h4>
                  <p className="text-xs text-[#78847C]">
                    Descargá la plantilla oficial con columnas ordenadas y ejemplos de productos con múltiples lotes.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={downloadExcelTemplate}
                  className="px-4 py-2.5 rounded-2xl border border-[#246B4D] bg-white hover:bg-[#EAF3EC] text-[#246B4D] text-xs font-bold transition flex items-center justify-center gap-2 shrink-0 min-h-[44px] shadow-xs active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar plantilla de Excel</span>
                </button>
              </div>

              {/* Security guarantee */}
              <div className="flex items-center gap-2 text-[11px] text-[#78847C] pt-2">
                <ShieldCheck className="w-4 h-4 text-[#246B4D] shrink-0" />
                <span>
                  <strong>Seguridad garantizada:</strong> Tu archivo se procesa de forma segura en tu navegador. No se ejecutan macros y tus datos se aíslan estrictamente en tu cuenta.
                </span>
              </div>
            </div>
          )}

          {/* ================= STEP 2: MAPPING ================= */}
          {step === 'mapping' && rawSheet && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E7EBE5]">
                <div>
                  <h3 className="text-base font-bold text-[#174A36]">
                    Reconocimiento y asignación de columnas
                  </h3>
                  <p className="text-xs text-[#78847C] mt-0.5">
                    Verificá qué campo de VenceYa corresponde a cada columna de tu archivo.
                  </p>
                </div>
                <span className="text-xs font-mono px-3 py-1 bg-[#F8F9F6] border border-[#E7EBE5] rounded-xl text-[#174A36]">
                  {rawSheet.totalRows} filas detectadas
                </span>
              </div>

              {/* Required fields reminder banner */}
              {!hasRequiredFields && (
                <div className="p-3.5 rounded-2xl bg-[#FFF8F7] border border-[#FCEBE5] text-xs text-[#C6533A] flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Faltan asignar columnas obligatorias:</span>
                    <p className="mt-0.5">{missingRequiredLabels.join(', ')}.</p>
                  </div>
                </div>
              )}

              {/* Mapping table */}
              <div className="rounded-2xl border border-[#E7EBE5] overflow-hidden bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8F9F6] border-b border-[#E7EBE5] text-[#78847C] font-semibold">
                      <tr>
                        <th className="py-3 px-4">Columna en tu archivo</th>
                        <th className="py-3 px-4">Campo en VenceYa</th>
                        <th className="py-3 px-4">Ejemplo en tu archivo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E7EBE5]">
                      {rawSheet.headers.map(header => {
                        const currentField = columnMapping[header] || 'ignore';
                        const sampleVal = rawSheet.rows[0] ? String(rawSheet.rows[0][header] || '-') : '-';
                        const sampleVal2 = rawSheet.rows[1] ? String(rawSheet.rows[1][header] || '-') : '';

                        return (
                          <tr key={header} className="hover:bg-[#F8F9F6]/60 transition">
                            <td className="py-3 px-4 font-semibold text-[#174A36]">
                              {header}
                            </td>
                            <td className="py-2.5 px-4">
                              <select
                                value={currentField}
                                onChange={e => handleMappingChange(header, e.target.value as any)}
                                className={`w-full max-w-xs px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#246B4D] ${
                                  currentField !== 'ignore'
                                    ? 'bg-[#EAF3EC] border-[#246B4D] text-[#174A36]'
                                    : 'bg-white border-[#E7EBE5] text-[#78847C]'
                                }`}
                              >
                                <option value="ignore">-- Ignorar columna / No importar --</option>
                                <optgroup label="Campos Obligatorios">
                                  {STANDARD_FIELDS.filter(f => f.required).map(f => (
                                    <option key={f.id} value={f.id}>
                                      ★ {f.label} (Obligatorio)
                                    </option>
                                  ))}
                                </optgroup>
                                <optgroup label="Campos Opcionales">
                                  {STANDARD_FIELDS.filter(f => !f.required).map(f => (
                                    <option key={f.id} value={f.id}>
                                      {f.label}
                                    </option>
                                  ))}
                                </optgroup>
                              </select>
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] text-[#78847C] max-w-xs truncate">
                              <span>{sampleVal}</span>
                              {sampleVal2 && <span className="text-[#A0ABA3]"> | {sampleVal2}</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Requirement #5 Educational note */}
              <div className="p-3.5 rounded-2xl bg-[#FFFCF5] border border-[#FFF3D9] text-xs text-[#A66B16] flex items-start gap-2.5">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Manejo de múltiples lotes:</strong> Si un mismo producto se repite en varias filas con distintas fechas de vencimiento, VenceYa lo agrupará como un único producto con sus respectivos lotes independientes.
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 3: PREVIEW ================= */}
          {step === 'preview' && consolidation && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#F8F9F6] border border-[#E7EBE5] text-center">
                  <span className="text-[11px] text-[#78847C] block">Filas en Archivo</span>
                  <span className="text-xl font-bold font-mono text-[#174A36]">
                    {consolidation.totalRowsProcessed}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#EAF3EC] border border-[#D5E8D7] text-center">
                  <span className="text-[11px] text-[#246B4D] block font-semibold">Productos Únicos</span>
                  <span className="text-xl font-bold font-mono text-[#174A36]">
                    {consolidation.uniqueProductsCount}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#EAF3EC] border border-[#D5E8D7] text-center">
                  <span className="text-[11px] text-[#246B4D] block font-semibold">Lotes a Registrar</span>
                  <span className="text-xl font-bold font-mono text-[#246B4D]">
                    {consolidation.totalBatchesCount}
                  </span>
                </div>

                <div className={`p-3.5 rounded-2xl border text-center ${
                  consolidation.errorRowsCount > 0 
                    ? 'bg-[#FFF8F7] border-[#FCEBE5] text-[#C6533A]' 
                    : 'bg-[#F8F9F6] border-[#E7EBE5] text-[#78847C]'
                }`}>
                  <span className="text-[11px] block">Requieren Revisión</span>
                  <span className="text-xl font-bold font-mono">
                    {consolidation.errorRowsCount}
                  </span>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center justify-between gap-2 border-b border-[#E7EBE5] pb-2 overflow-x-auto">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                      previewFilter === 'all'
                        ? 'bg-[#246B4D] text-white'
                        : 'bg-[#F8F9F6] text-[#78847C] hover:bg-[#E7EBE5]'
                    }`}
                  >
                    Todos ({consolidation.previewRows.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreviewFilter('valid')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                      previewFilter === 'valid'
                        ? 'bg-[#246B4D] text-white'
                        : 'bg-[#F8F9F6] text-[#78847C] hover:bg-[#E7EBE5]'
                    }`}
                  >
                    Válidos ({consolidation.validRowsCount})
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreviewFilter('issues')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                      previewFilter === 'issues'
                        ? 'bg-[#246B4D] text-white'
                        : 'bg-[#F8F9F6] text-[#78847C] hover:bg-[#E7EBE5]'
                    }`}
                  >
                    Con Observaciones ({consolidation.errorRowsCount})
                  </button>
                </div>

                <span className="text-[11px] text-[#78847C] hidden sm:inline">
                  Podés editar o desmarcar filas antes de confirmar.
                </span>
              </div>

              {/* Rows List / Table */}
              <div className="rounded-2xl border border-[#E7EBE5] overflow-hidden bg-white shadow-xs max-h-96 overflow-y-auto">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8F9F6] border-b border-[#E7EBE5] text-[#78847C] font-semibold sticky top-0 z-10">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">Inc.</th>
                        <th className="py-2.5 px-3">Fila</th>
                        <th className="py-2.5 px-3">Producto</th>
                        <th className="py-2.5 px-3">Cantidad</th>
                        <th className="py-2.5 px-3">Vencimiento</th>
                        <th className="py-2.5 px-3">Lote</th>
                        <th className="py-2.5 px-3">Precios</th>
                        <th className="py-2.5 px-3">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E7EBE5]">
                      {displayPreviewRows.map(r => {
                        const isValid = r.status === 'valid';
                        const isEditing = editingRowNumber === r.rowNumber;

                        return (
                          <tr 
                            key={r.rowNumber} 
                            className={`transition ${
                              r.isExcluded 
                                ? 'opacity-40 bg-[#F8F9F6]' 
                                : !isValid 
                                ? 'bg-[#FFF8F7]' 
                                : 'hover:bg-[#F8F9F6]/60'
                            }`}
                          >
                            {/* Checkbox include */}
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={!r.isExcluded}
                                onChange={() => handleToggleRowExclusion(r.rowNumber)}
                                className="rounded text-[#246B4D] focus:ring-[#246B4D] cursor-pointer"
                                title={r.isExcluded ? 'Incluir en importación' : 'Excluir de importación'}
                              />
                            </td>

                            <td className="py-2.5 px-3 font-mono text-[11px] text-[#78847C]">
                              #{r.rowNumber}
                            </td>

                            {/* Product Name */}
                            <td className="py-2.5 px-3">
                              {isEditing ? (
                                <input
                                  type="text"
                                  defaultValue={r.productName}
                                  onBlur={e => handleSaveInlineEdit(r.rowNumber, 'productName', e.target.value)}
                                  className="px-2 py-1 bg-white border border-[#246B4D] rounded text-xs w-full"
                                  autoFocus
                                />
                              ) : (
                                <div>
                                  <span className="font-bold text-[#174A36] block">
                                    {r.productName || <em className="text-[#C6533A]">Sin nombre</em>}
                                  </span>
                                  <span className="text-[10px] text-[#78847C]">
                                    {r.brand && `${r.brand} • `}{r.category}
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* Quantity */}
                            <td className="py-2.5 px-3 font-mono font-bold text-[#174A36]">
                              {isEditing ? (
                                <input
                                  type="number"
                                  defaultValue={r.quantity}
                                  onBlur={e => handleSaveInlineEdit(r.rowNumber, 'quantity', Number(e.target.value))}
                                  className="px-2 py-1 bg-white border border-[#246B4D] rounded text-xs w-20"
                                />
                              ) : (
                                <span>{r.quantity} {r.unit}</span>
                              )}
                            </td>

                            {/* Expiration Date */}
                            <td className="py-2.5 px-3 font-mono">
                              {isEditing ? (
                                <input
                                  type="date"
                                  defaultValue={r.expirationDate}
                                  onBlur={e => handleSaveInlineEdit(r.rowNumber, 'expirationDate', e.target.value)}
                                  className="px-2 py-1 bg-white border border-[#246B4D] rounded text-xs"
                                />
                              ) : (
                                <span className={!r.expirationDate ? 'text-[#C6533A] font-bold' : 'text-[#174A36]'}>
                                  {r.expirationDate || 'Inválida'}
                                </span>
                              )}
                            </td>

                            {/* Lot */}
                            <td className="py-2.5 px-3 font-mono text-[11px] text-[#78847C]">
                              {r.lotNumber || 'Auto'}
                            </td>

                            {/* Prices */}
                            <td className="py-2.5 px-3 font-mono text-[11px] text-[#78847C]">
                              {r.salePrice ? `$${r.salePrice.toLocaleString('es-AR')}` : '-'}
                            </td>

                            {/* Status & Messages */}
                            <td className="py-2.5 px-3">
                              {isValid ? (
                                <div className="flex items-center gap-1.5 text-[#246B4D] font-semibold text-[11px]">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Listo</span>
                                </div>
                              ) : (
                                <div className="space-y-0.5">
                                  {r.errors.map((err, i) => (
                                    <span key={i} className="text-[10px] text-[#C6533A] font-medium block">
                                      ⚠️ {err}
                                    </span>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() => setEditingRowNumber(isEditing ? null : r.rowNumber)}
                                    className="text-[10px] text-[#246B4D] font-bold hover:underline"
                                  >
                                    {isEditing ? 'Listo' : 'Corregir'}
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 4: IMPORTING PROGRESS ================= */}
          {step === 'importing' && (
            <div className="py-12 text-center space-y-4 animate-in fade-in">
              <div className="w-14 h-14 rounded-3xl bg-[#EAF3EC] text-[#246B4D] flex items-center justify-center mx-auto shadow-xs animate-spin">
                <RefreshCw className="w-7 h-7 stroke-[2]" />
              </div>
              <h3 className="text-lg font-bold text-[#174A36]">Guardando inventario en tu comercio...</h3>
              <p className="text-xs text-[#78847C] max-w-sm mx-auto">
                Registrando productos y lotes con aislamiento seguro en Firebase. Por favor no cierres la ventana.
              </p>

              <div className="w-full max-w-xs mx-auto bg-[#E7EBE5] rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-[#246B4D] h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* ================= STEP 5: SUCCESS ================= */}
          {step === 'success' && importResult && (
            <div className="py-8 text-center space-y-5 animate-in fade-in">
              <div className="w-16 h-16 rounded-3xl bg-[#EAF3EC] text-[#246B4D] flex items-center justify-center mx-auto shadow-xs">
                <Check className="w-8 h-8 stroke-[2.5]" />
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-[#174A36]">¡Importación completada con éxito!</h3>
                <p className="text-xs text-[#78847C] mt-1">
                  Tu inventario ya está disponible y sincronizado con el control de vencimientos de VenceYa.
                </p>
              </div>

              <div className="grid grid-cols-2 max-w-sm mx-auto gap-3 pt-2">
                <div className="p-4 rounded-2xl bg-[#F8F9F6] border border-[#E7EBE5]">
                  <span className="text-xs text-[#78847C] block">Productos Guardados</span>
                  <span className="text-2xl font-bold font-mono text-[#174A36]">
                    {importResult.productsSaved}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#EAF3EC] border border-[#D5E8D7]">
                  <span className="text-xs text-[#246B4D] block font-semibold">Lotes Activos</span>
                  <span className="text-2xl font-bold font-mono text-[#246B4D]">
                    {importResult.batchesSaved}
                  </span>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="p-4 rounded-2xl bg-[#FFF8F7] border border-[#FCEBE5] text-left text-xs text-[#C6533A] max-w-md mx-auto space-y-1">
                  <span className="font-bold">Advertencias durante la sincronización:</span>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {importResult.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-5 border-t border-[#E7EBE5] bg-[#F8F9F6] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div>
            {step === 'mapping' && (
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="px-4 py-2.5 rounded-2xl border border-[#E7EBE5] bg-white text-xs font-semibold text-[#78847C] hover:bg-[#F8F9F6] transition flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver a cargar archivo</span>
              </button>
            )}

            {step === 'preview' && (
              <button
                type="button"
                onClick={() => setStep('mapping')}
                className="px-4 py-2.5 rounded-2xl border border-[#E7EBE5] bg-white text-xs font-semibold text-[#78847C] hover:bg-[#F8F9F6] transition flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Modificar columnas</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step === 'upload' && (
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2.5 rounded-2xl border border-[#E7EBE5] bg-white hover:bg-[#F8F9F6] text-xs font-bold text-[#78847C] transition min-h-[44px]"
              >
                Cancelar
              </button>
            )}

            {step === 'mapping' && (
              <button
                type="button"
                disabled={!hasRequiredFields}
                onClick={handleContinueToPreview}
                className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-[#246B4D] hover:bg-[#174A36] disabled:opacity-50 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 min-h-[44px] shadow-xs active:scale-95"
              >
                <span>Continuar a Vista Previa</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {step === 'preview' && consolidation && (
              <button
                type="button"
                disabled={consolidation.validRowsCount === 0}
                onClick={handleConfirmImport}
                className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-[#246B4D] hover:bg-[#174A36] disabled:opacity-50 text-white text-xs font-bold transition flex items-center justify-center gap-2 min-h-[44px] shadow-xs active:scale-95"
              >
                <FileCheck className="w-4 h-4 stroke-[2.2]" />
                <span>Confirmar importación ({consolidation.validRowsCount} filas)</span>
              </button>
            )}

            {step === 'success' && (
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-[#246B4D] hover:bg-[#174A36] text-white text-xs font-bold transition min-h-[44px] shadow-xs active:scale-95"
              >
                Ver inventario importado
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
