import React from 'react';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Plus, 
  Camera, 
  ArrowRight, 
  FileSpreadsheet, 
  Sparkles,
  Layers,
  Tag
} from 'lucide-react';
import { 
  ProductWithBatches, 
  BatchWithProduct, 
  SalesSuggestion, 
  ActiveTab, 
  StoreSettings,
  Batch,
  PromotionType
} from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface DashboardViewProps {
  productsWithBatches: ProductWithBatches[];
  batchesWithProduct: BatchWithProduct[];
  suggestions: SalesSuggestion[];
  settings: StoreSettings;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenScan: () => void;
  onOpenManualAdd: () => void;
  onSelectProduct: (product: ProductWithBatches) => void;
  onRefresh: () => void;
  isDemoMode?: boolean;
  onOpenDemo?: () => void;
  onExitDemo?: () => void;
  onOpenPromotion?: (product: ProductWithBatches, batch?: Batch, discount?: number, type?: PromotionType) => void;
  onOpenSavedPromotions?: () => void;
  onOpenExcelImport?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  productsWithBatches,
  batchesWithProduct,
  settings,
  setActiveTab,
  onOpenScan,
  onOpenManualAdd,
  onSelectProduct,
  isDemoMode = false,
  onOpenDemo,
  onOpenPromotion,
  onOpenExcelImport,
}) => {
  const { userProfile } = useAuth();

  // Active batches with stock > 0
  const activeBatches = batchesWithProduct.filter(b => b.quantity > 0);

  // 1. Vencidos (daysRemaining < 0)
  const expiredBatches = activeBatches.filter(b => b.daysRemaining < 0);

  // 2. Próximos a vencer (0 to 7 days)
  const expiringSoonBatches = activeBatches.filter(b => b.daysRemaining >= 0 && b.daysRemaining <= 7);

  // 3. En orden (> 7 days)
  const inOrderBatches = activeBatches.filter(b => b.daysRemaining > 7);

  // Urgent products for "Necesitan atención" (max 3)
  // Products that have at least one batch with daysRemaining <= 7 or expired, sorted by earliest expiration date
  const urgentProducts = productsWithBatches
    .filter(p => p.batches.length > 0 && p.daysRemaining !== undefined && p.daysRemaining <= 7)
    .sort((a, b) => {
      const aMin = a.daysRemaining ?? 9999;
      const bMin = b.daysRemaining ?? 9999;
      return aMin - bMin;
    })
    .slice(0, 3);

  const storeDisplayName = settings.storeName || userProfile?.storeName || 'Tu Comercio';
  const hasProducts = productsWithBatches.length > 0;

  // Format short date helper: e.g. "15 may"
  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const m = months[parseInt(parts[1], 10) - 1] || parts[1];
    return `${parseInt(parts[2], 10)} ${m}`;
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-150">
      {/* 1. Saludo breve y acciones principales */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#174A36] tracking-tight">
            ¡Hola, {storeDisplayName}!
          </h1>
          <p className="text-xs sm:text-sm text-[#78847C] mt-1">
            Control de vencimientos y stock para tu comercio.
          </p>
        </div>

        {/* Acciones principales: Agregar producto + Escanear código */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={onOpenScan}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-white hover:bg-[#F8F9F6] text-[#246B4D] border border-[#E7EBE5] px-4 py-2.5 rounded-2xl font-semibold text-xs transition active:scale-95 min-h-[44px] shadow-2xs whitespace-nowrap"
          >
            <Camera className="w-4 h-4" />
            <span>Escanear código</span>
          </button>

          <button
            type="button"
            onClick={onOpenManualAdd}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-[#246B4D] hover:bg-[#174A36] text-white px-5 py-2.5 rounded-2xl font-bold text-xs shadow-xs transition active:scale-95 min-h-[44px] whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Agregar producto</span>
          </button>
        </div>
      </div>

      {/* 2. Tres indicadores compactos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Indicador 1: Vencidos */}
        <div 
          onClick={() => setActiveTab('expirations')}
          className="p-5 rounded-3xl bg-white border border-[#E7EBE5] hover:border-[#C6533A]/40 transition shadow-xs cursor-pointer flex flex-col justify-between"
          role="button"
          tabIndex={0}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#78847C]">Vencidos</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              expiredBatches.length > 0 ? 'bg-[#FCEBE5] text-[#C6533A]' : 'bg-[#F8F9F6] text-[#78847C]'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl sm:text-3xl font-extrabold font-mono tabular-nums ${
              expiredBatches.length > 0 ? 'text-[#C6533A]' : 'text-[#174A36]'
            }`}>
              {expiredBatches.length}
            </div>
            <div className="text-[11px] text-[#78847C] mt-0.5">
              {expiredBatches.length === 1 ? '1 lote vencido' : `${expiredBatches.length} lotes vencidos`}
            </div>
          </div>
        </div>

        {/* Indicador 2: Próximos a vencer */}
        <div 
          onClick={() => setActiveTab('expirations')}
          className="p-5 rounded-3xl bg-white border border-[#E7EBE5] hover:border-[#A66B16]/40 transition shadow-xs cursor-pointer flex flex-col justify-between"
          role="button"
          tabIndex={0}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#78847C]">Próximos a vencer</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              expiringSoonBatches.length > 0 ? 'bg-[#FFF3D9] text-[#A66B16]' : 'bg-[#F8F9F6] text-[#78847C]'
            }`}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl sm:text-3xl font-extrabold font-mono tabular-nums ${
              expiringSoonBatches.length > 0 ? 'text-[#A66B16]' : 'text-[#174A36]'
            }`}>
              {expiringSoonBatches.length}
            </div>
            <div className="text-[11px] text-[#78847C] mt-0.5">
              En los próximos 7 días
            </div>
          </div>
        </div>

        {/* Indicador 3: En orden */}
        <div 
          onClick={() => setActiveTab('expirations')}
          className="p-5 rounded-3xl bg-white border border-[#E7EBE5] hover:border-[#246B4D]/40 transition shadow-xs cursor-pointer flex flex-col justify-between"
          role="button"
          tabIndex={0}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#78847C]">En orden</span>
            <div className="w-8 h-8 rounded-xl bg-[#EAF3EC] text-[#246B4D] flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-[#174A36]">
              {inOrderBatches.length}
            </div>
            <div className="text-[11px] text-[#78847C] mt-0.5">
              Más de 7 días de vigencia
            </div>
          </div>
        </div>
      </div>

      {/* 3. Sección "Necesitan atención" o Estado Vacío */}
      {!hasProducts ? (
        /* Estado vacío único y claro si no hay productos registrados */
        <div className="p-8 sm:p-12 text-center rounded-3xl bg-white border border-[#E7EBE5] space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-3xl bg-[#EAF3EC] text-[#246B4D] flex items-center justify-center mx-auto shadow-2xs">
            <Layers className="w-7 h-7 stroke-[2]" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#174A36]">
              Todavía no tenés productos registrados
            </h2>
            <p className="text-xs sm:text-sm text-[#78847C] max-w-md mx-auto mt-1 leading-relaxed">
              Comenzá cargando tu inventario para controlar las fechas de caducidad y reducir pérdidas en tu comercio.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={onOpenManualAdd}
              className="w-full sm:w-auto px-6 py-3 bg-[#246B4D] hover:bg-[#174A36] text-white text-xs font-bold rounded-2xl transition shadow-xs flex items-center justify-center gap-2 min-h-[44px] active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Agregar producto</span>
            </button>

            {onOpenExcelImport && (
              <button
                type="button"
                onClick={onOpenExcelImport}
                className="w-full sm:w-auto px-5 py-3 bg-white hover:bg-[#F8F9F6] text-[#246B4D] border border-[#E7EBE5] text-xs font-bold rounded-2xl transition shadow-2xs flex items-center justify-center gap-2 min-h-[44px] active:scale-95"
              >
                <FileSpreadsheet className="w-4 h-4 text-[#246B4D]" />
                <span>Importar desde Excel</span>
              </button>
            )}
          </div>

          {/* Acción secundaria para explorar demo */}
          {!isDemoMode && onOpenDemo && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onOpenDemo}
                className="text-xs text-[#78847C] hover:text-[#246B4D] transition underline-offset-4 hover:underline"
              >
                ¿Querés ver cómo funciona primero? Probar modo demostración
              </button>
            </div>
          )}
        </div>
      ) : urgentProducts.length > 0 ? (
        /* Listado de máximo 3 productos prioritarios que necesitan atención */
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#174A36]">
                Necesitan atención
              </h2>
              <p className="text-xs text-[#78847C]">
                Productos vencidos o próximos a vencer prioritarios
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('expirations')}
              className="text-xs font-bold text-[#246B4D] hover:text-[#174A36] hover:underline flex items-center gap-1 min-h-[44px] px-2"
            >
              <span>Ver todos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {urgentProducts.map(product => {
              const earliestBatch = product.earliestBatch;
              const days = product.daysRemaining ?? 0;
              const isExpired = days < 0;
              const isToday = days === 0;

              return (
                <div
                  key={product.id}
                  onClick={() => onSelectProduct(product)}
                  className="p-4 sm:p-5 rounded-3xl bg-white border border-[#E7EBE5] hover:border-[#246B4D]/30 transition shadow-xs cursor-pointer flex flex-col justify-between space-y-3 group"
                  role="button"
                  tabIndex={0}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-[11px] font-medium text-[#78847C] truncate">
                        {product.category}
                      </span>
                      <span className={`text-[11px] font-bold ${
                        isExpired 
                          ? 'text-[#C6533A]' 
                          : isToday 
                          ? 'text-[#C6533A]' 
                          : 'text-[#A66B16]'
                      }`}>
                        {isExpired
                          ? `Venció hace ${Math.abs(days)}d`
                          : isToday
                          ? 'Vence hoy'
                          : `Vence en ${days}d`}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-[#174A36] group-hover:text-[#246B4D] transition line-clamp-1">
                      {product.name}
                    </h3>

                    <div className="text-xs text-[#24372F] flex items-center gap-2">
                      <span>Stock: <strong className="font-mono">{product.totalQuantity}</strong> {product.unit}</span>
                      <span className="text-[#E7EBE5]">·</span>
                      <span className="text-[#78847C]">{formatShortDate(earliestBatch?.expirationDate || '')}</span>
                    </div>
                  </div>

                  {/* Acciones limpias */}
                  <div className="pt-2 border-t border-[#E7EBE5] flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#246B4D] group-hover:underline">
                      Ver detalle →
                    </span>

                    {onOpenPromotion && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenPromotion(product, earliestBatch);
                        }}
                        className="px-2.5 py-1 rounded-xl bg-[#EAF3EC] hover:bg-[#D5E8D7] text-[#246B4D] text-[11px] font-bold transition flex items-center gap-1 active:scale-95"
                        title="Crear promoción"
                      >
                        <Tag className="w-3 h-3" />
                        <span>Promo</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Mensaje sencillo y positivo si no hay productos urgentes */
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E7EBE5] text-center space-y-2 shadow-xs">
          <div className="w-10 h-10 rounded-2xl bg-[#EAF3EC] text-[#246B4D] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
          </div>
          <h3 className="text-base font-bold text-[#174A36]">
            Todo tu inventario está en orden
          </h3>
          <p className="text-xs text-[#78847C] max-w-sm mx-auto">
            No tenés productos vencidos ni próximos a vencer en los próximos 7 días.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className="text-xs font-bold text-[#246B4D] hover:underline"
            >
              Ver catálogo de productos →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
