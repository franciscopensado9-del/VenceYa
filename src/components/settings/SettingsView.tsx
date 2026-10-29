import React, { useState, useRef } from 'react';
import { 
  Settings as SettingsIcon, 
  Store, 
  Bell, 
  Download, 
  Upload, 
  RotateCcw, 
  Trash2, 
  FileSpreadsheet, 
  Check, 
  Volume2, 
  Info, 
  Smartphone,
  HardDrive
} from 'lucide-react';
import { StoreSettings } from '../../types';
import { storageService } from '../../services/storage';
import { soundService } from '../../services/sound';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { ConfirmModal } from '../common/ConfirmModal';

interface SettingsViewProps {
  settings: StoreSettings;
  onUpdateSettings: (settings: StoreSettings) => void;
  onRefreshData: () => void;
  isDemoMode?: boolean;
  onOpenDemo?: () => void;
  onExitDemo?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onRefreshData,
  isDemoMode = false,
  onOpenDemo,
  onExitDemo,
}) => {
  const [storeName, setStoreName] = useState(settings.storeName);
  const [businessType, setBusinessType] = useState(settings.businessType);
  const [soundAlerts, setSoundAlerts] = useState(settings.soundAlerts);
  const [thresholds, setThresholds] = useState(settings.alertThresholds);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Modals & File inputs
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showSeedConfirm, setShowSeedConfirm] = useState(false);
  const [importMessage, setImportMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSaveStore = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: StoreSettings = {
      ...settings,
      storeName: storeName.trim() || 'Mi Almacén',
      businessType: businessType.trim() || 'Almacén y Kiosco',
      soundAlerts,
      alertThresholds: thresholds,
    };
    onUpdateSettings(updated);
    soundService.playSuccessChime();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleExportJson = () => {
    const jsonStr = storageService.exportDataJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VenceYa_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    soundService.playSuccessChime();
  };

  const handleExportCsv = () => {
    const csvStr = storageService.exportDataCsv();
    const blob = new Blob(['\uFEFF' + csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VenceYa_Inventario_Lotes_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    soundService.playSuccessChime();
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const result = storageService.importDataJson(content);
        if (result.success) {
          setImportMessage({ text: result.message, isError: false });
          soundService.playSuccessChime();
          onRefreshData();
        } else {
          setImportMessage({ text: result.message, isError: true });
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmResetSeed = () => {
    storageService.resetDemoData();
    setShowSeedConfirm(false);
    soundService.playSuccessChime();
    onRefreshData();
  };

  const handleConfirmClearAll = () => {
    storageService.clearAllData();
    setShowClearConfirm(false);
    onRefreshData();
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-4xl animate-in fade-in duration-200">
      {/* Title */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#78847C]">
          PREFERENCIAS DEL SISTEMA
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#174A36] tracking-tight mt-1 flex items-center gap-2.5">
          <SettingsIcon className="w-7 h-7 text-[#246B4D]" />
          <span>Configuración del Comercio</span>
        </h1>
        <p className="text-sm text-[#78847C] mt-0.5">
          Ajustá la identidad de tu local, parámetros de avisos y copias de seguridad
        </p>
      </div>

      {/* Section 1: Store Profile Form */}
      <form onSubmit={handleSaveStore} className="p-6 sm:p-7 rounded-3xl bg-white border border-[#E7EBE5] shadow-xs space-y-6">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[#E7EBE5]">
          <div className="w-8 h-8 rounded-xl bg-[#EAF3EC] text-[#246B4D] flex items-center justify-center">
            <Store className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#174A36]">Datos de tu Comercio</h2>
            <p className="text-xs text-[#78847C]">Información visible en cabeceras y reportes</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="store-name" className="block text-xs font-semibold text-[#174A36] mb-1.5">
              Nombre de la Tienda / Almacén
            </label>
            <input
              id="store-name"
              type="text"
              value={storeName}
              onChange={e => setStoreName(e.target.value)}
              placeholder="Ej. Kiosco El Paso, Autoservicio San Martín"
              className="w-full px-4 py-2.5 bg-[#F8F9F6] border border-[#E7EBE5] rounded-2xl text-sm text-[#24372F] placeholder-[#78847C]/60 focus:outline-none focus:border-[#246B4D] focus:bg-white transition"
            />
          </div>

          <div>
            <label htmlFor="business-type" className="block text-xs font-semibold text-[#174A36] mb-1.5">
              Rubro Comercial
            </label>
            <input
              id="business-type"
              type="text"
              value={businessType}
              onChange={e => setBusinessType(e.target.value)}
              placeholder="Ej. Almacén, Kiosco, Dietética, Fiambrería"
              className="w-full px-4 py-2.5 bg-[#F8F9F6] border border-[#E7EBE5] rounded-2xl text-sm text-[#24372F] placeholder-[#78847C]/60 focus:outline-none focus:border-[#246B4D] focus:bg-white transition"
            />
          </div>
        </div>

        {/* Section 2: Anticipation Thresholds */}
        <div className="pt-4 border-t border-[#E7EBE5] space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#246B4D]" />
            <h3 className="text-sm font-bold text-[#174A36]">
              Anticipaciones de Vencimiento para Alertas
            </h3>
          </div>
          <p className="text-xs text-[#78847C]">
            Elegí con cuántos días de antelación querés que el sistema genere avisos para actuar antes del vencimiento:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <label className="flex items-center gap-3 p-3 rounded-2xl bg-[#F8F9F6] border border-[#E7EBE5] cursor-pointer hover:bg-white transition">
              <input
                type="checkbox"
                checked={thresholds.today}
                onChange={e => setThresholds({ ...thresholds, today: e.target.checked })}
                className="w-4 h-4 rounded text-[#246B4D] focus:ring-[#246B4D] border-[#E7EBE5]"
              />
              <span className="text-xs font-medium text-[#24372F]">El mismo día del vencimiento (Crítica)</span>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-2xl bg-[#F8F9F6] border border-[#E7EBE5] cursor-pointer hover:bg-white transition">
              <input
                type="checkbox"
                checked={thresholds.days1}
                onChange={e => setThresholds({ ...thresholds, days1: e.target.checked })}
                className="w-4 h-4 rounded text-[#246B4D] focus:ring-[#246B4D] border-[#E7EBE5]"
              />
              <span className="text-xs font-medium text-[#24372F]">1 día antes (Urgente)</span>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-2xl bg-[#F8F9F6] border border-[#E7EBE5] cursor-pointer hover:bg-white transition">
              <input
                type="checkbox"
                checked={thresholds.days3}
                onChange={e => setThresholds({ ...thresholds, days3: e.target.checked })}
                className="w-4 h-4 rounded text-[#246B4D] focus:ring-[#246B4D] border-[#E7EBE5]"
              />
              <span className="text-xs font-medium text-[#24372F]">3 días antes (Promoción recomendada)</span>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-2xl bg-[#F8F9F6] border border-[#E7EBE5] cursor-pointer hover:bg-white transition">
              <input
                type="checkbox"
                checked={thresholds.days7}
                onChange={e => setThresholds({ ...thresholds, days7: e.target.checked })}
                className="w-4 h-4 rounded text-[#246B4D] focus:ring-[#246B4D] border-[#E7EBE5]"
              />
              <span className="text-xs font-medium text-[#24372F]">7 días antes (Revisión de rotación)</span>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-2xl bg-[#F8F9F6] border border-[#E7EBE5] cursor-pointer hover:bg-white transition">
              <input
                type="checkbox"
                checked={thresholds.days30}
                onChange={e => setThresholds({ ...thresholds, days30: e.target.checked })}
                className="w-4 h-4 rounded text-[#246B4D] focus:ring-[#246B4D] border-[#E7EBE5]"
              />
              <span className="text-xs font-medium text-[#24372F]">30 días antes (Planificación mensual)</span>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-2xl bg-[#F8F9F6] border border-[#E7EBE5] cursor-pointer hover:bg-white transition">
              <input
                type="checkbox"
                checked={soundAlerts}
                onChange={e => setSoundAlerts(e.target.checked)}
                className="w-4 h-4 rounded text-[#246B4D] focus:ring-[#246B4D] border-[#E7EBE5]"
              />
              <span className="text-xs font-medium text-[#24372F] flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-[#246B4D]" />
                <span>Sonidos de escáner y confirmación táctil</span>
              </span>
            </label>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#246B4D] hover:bg-[#174A36] text-white text-xs font-semibold transition shadow-xs active:scale-95"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>¡Cambios Guardados!</span>
              </>
            ) : (
              <span>Guardar Configuración</span>
            )}
          </button>
        </div>
      </form>

      {/* Section 2: Data Management, Backup & Restore */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white border border-[#E7EBE5] shadow-xs space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[#E7EBE5]">
          <div className="w-8 h-8 rounded-xl bg-[#EAF3EC] text-[#246B4D] flex items-center justify-center">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#174A36]">Copia de Seguridad y Exportación</h2>
            <p className="text-xs text-[#78847C]">Tus datos están guardados de forma privada en el almacenamiento local de este navegador</p>
          </div>
        </div>

        {importMessage && (
          <div className={`p-3.5 rounded-2xl text-xs flex items-center gap-2 ${
            importMessage.isError 
              ? 'bg-[#FCEBE5] border border-[#F5C2B6] text-[#C6533A]' 
              : 'bg-[#E8F3E9] border border-[#CDE5D1] text-[#246B4D]'
          }`}>
            <Info className="w-4 h-4 shrink-0" />
            <span>{importMessage.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          {/* Export JSON */}
          <button
            type="button"
            onClick={handleExportJson}
            className="flex items-center justify-between p-4 rounded-2xl bg-[#F8F9F6] border border-[#E7EBE5] hover:border-[#246B4D] text-left transition group shadow-xs hover:bg-white"
          >
            <div>
              <div className="text-sm font-semibold text-[#174A36] group-hover:text-[#246B4D] transition">
                Exportar Copia de Seguridad
              </div>
              <p className="text-xs text-[#78847C] mt-0.5">
                Descargá un archivo JSON con todos tus productos y lotes.
              </p>
            </div>
            <Download className="w-5 h-5 text-[#78847C] group-hover:text-[#246B4D] shrink-0 ml-3" />
          </button>

          {/* Export CSV (Excel) */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center justify-between p-4 rounded-2xl bg-[#F8F9F6] border border-[#E7EBE5] hover:border-[#246B4D] text-left transition group shadow-xs hover:bg-white"
          >
            <div>
              <div className="text-sm font-semibold text-[#174A36] group-hover:text-[#246B4D] transition">
                Exportar Planilla Excel (CSV)
              </div>
              <p className="text-xs text-[#78847C] mt-0.5">
                Tabla para abrir en Excel o Google Sheets con días y costos.
              </p>
            </div>
            <FileSpreadsheet className="w-5 h-5 text-[#78847C] group-hover:text-[#246B4D] shrink-0 ml-3" />
          </button>

          {/* Import JSON */}
          <label className="flex items-center justify-between p-4 rounded-2xl bg-[#F8F9F6] border border-[#E7EBE5] hover:border-[#246B4D] text-left transition group cursor-pointer shadow-xs hover:bg-white">
            <div>
              <div className="text-sm font-semibold text-[#174A36] group-hover:text-[#246B4D] transition">
                Restaurar Copia de Seguridad
              </div>
              <p className="text-xs text-[#78847C] mt-0.5">
                Subí un archivo de respaldo JSON para recuperar tus registros.
              </p>
            </div>
            <Upload className="w-5 h-5 text-[#78847C] group-hover:text-[#246B4D] shrink-0 ml-3" />
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />
          </label>

          {/* Demo Mode Action */}
          {isDemoMode ? (
            <div className="p-4 rounded-2xl bg-[#FFF3D9] border border-[#FBEAC4] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-[#A66B16]">
                    Estás en Modo Demostración
                  </div>
                  <p className="text-xs text-[#A66B16]/90 mt-0.5">
                    Podés reiniciar los productos de ejemplo o volver a tus datos reales.
                  </p>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-[#A66B16] animate-pulse" />
              </div>
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    storageService.resetDemoData();
                    soundService.playSuccessChime();
                    onRefreshData();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#F8F9F6] border border-[#FBEAC4] text-xs font-semibold text-[#A66B16] transition shadow-2xs flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restablecer demo original</span>
                </button>
                {onExitDemo && (
                  <button
                    type="button"
                    onClick={onExitDemo}
                    className="px-3.5 py-2 rounded-xl bg-[#246B4D] hover:bg-[#174A36] text-white text-xs font-bold transition shadow-xs"
                  >
                    Salir de demo y volver a mis datos
                  </button>
                )}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenDemo}
              className="flex items-center justify-between p-4 rounded-2xl bg-[#F8F9F6] border border-[#E7EBE5] hover:border-[#246B4D] text-left transition group shadow-xs hover:bg-white"
            >
              <div>
                <div className="text-sm font-semibold text-[#174A36] group-hover:text-[#246B4D] transition flex items-center gap-2">
                  <span>Probar Modo Demostración</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF3EC] text-[#246B4D]">
                    Seguro
                  </span>
                </div>
                <p className="text-xs text-[#78847C] mt-0.5">
                  Carga 13 productos argentinos de prueba en un entorno separado sin alterar tus datos reales.
                </p>
              </div>
              <RotateCcw className="w-5 h-5 text-[#78847C] group-hover:text-[#246B4D] shrink-0 ml-3" />
            </button>
          )}
        </div>

        {/* Clear database action */}
        <div className="pt-3 border-t border-[#E7EBE5] flex items-center justify-between">
          <span className="text-xs text-[#78847C]">
            ¿Querés empezar de cero con una base completamente vacía?
          </span>
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="text-xs text-[#C6533A] hover:underline flex items-center gap-1.5 transition font-semibold"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Vaciar todos los datos</span>
          </button>
        </div>
      </div>

      {/* Section 3: PWA & Device Status */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white border border-[#E7EBE5] shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[#E7EBE5]">
          <div className="w-8 h-8 rounded-xl bg-[#EAF3EC] text-[#246B4D] flex items-center justify-center">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#174A36]">Aplicación Web Progresiva (PWA)</h2>
            <p className="text-xs text-[#78847C]">Instalación rápida en celular y computadora sin app store</p>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#F8F9F6] border border-[#E7EBE5] space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-[#E8F3E9] text-[#246B4D] shrink-0">
              <Check className="w-4 h-4" />
            </div>
            <div className="text-xs text-[#78847C] leading-relaxed">
              <strong className="text-[#174A36] block mb-0.5">Ventajas de instalar VenceYa:</strong>
              • Funciona incluso sin internet o si se corta la conexión en el comercio.<br />
              • Acceso directo con ícono desde la pantalla de inicio de tu celular o escritorio.<br />
              • Cámara y escáner listos en un solo toque sin abrir el navegador.
            </div>
          </div>

          <div className="pt-2">
            <PWAInstallButton variant="full" />
          </div>
        </div>
      </div>

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={showSeedConfirm}
        title="Restaurar Datos de Demostración"
        message="¿Querés volver a cargar el catálogo inicial de demostración con productos típicos de almacén argentino (lácteos, fiambres, panadería)? Los cambios actuales se reemplazarán."
        confirmText="Cargar Datos Demo"
        isDestructive={false}
        onConfirm={handleConfirmResetSeed}
        onCancel={() => setShowSeedConfirm(false)}
      />

      <ConfirmModal
        isOpen={showClearConfirm}
        title="Vaciar Base de Datos"
        message="¿Estás completamente seguro de que querés borrar TODOS los productos y lotes? Esta acción eliminará permanentemente los datos guardados en este navegador."
        confirmText="Sí, vaciar base de datos"
        isDestructive={true}
        onConfirm={handleConfirmClearAll}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
};
