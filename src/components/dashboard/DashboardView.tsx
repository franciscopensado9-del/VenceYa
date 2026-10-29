import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Plus, 
  ArrowRight, 
  Tag, 
  Check, 
  Copy, 
  Sparkles, 
  Store,
  ChevronRight,
  Package,
  Layers,
  Camera,
  X
} from 'lucide-react';
import { 
  ProductWithBatches, 
  BatchWithProduct, 
  SalesSuggestion, 
  ActiveTab, 
  StoreSettings 
} from '../../types';
import { calculateDaysRemaining, storageService } from '../../services/storage';
import { soundService } from '../../services/sound';
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
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  productsWithBatches,
  batchesWithProduct,
  suggestions,
  settings,
  setActiveTab,
  onOpenScan,
  onOpenManualAdd,
  onSelectProduct,
  onRefresh,
  isDemoMode = false,
  onOpenDemo,
  onExitDemo,
}) => {
  const [selectedPromoBatch, setSelectedPromoBatch] = useState<BatchWithProduct | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [checkedBatchIds, setCheckedBatchIds] = useState<Set<string>>(new Set());

  // Real calculations based on active batches
  const activeBatches = batchesWithProduct.filter(b => b.quantity > 0);

  // 1. "Vencen pronto" (<= 2 days or already expired)
  const expiringSoonBatches = activeBatches.filter(b => b.daysRemaining <= 2);

  // 2. "Para revisar" (3 to 7 days)
  const toReviewBatches = activeBatches.filter(b => b.daysRemaining >= 3 && b.daysRemaining <= 7);

  // 3. "En orden" (> 7 days)
  const inOrderBatches = activeBatches.filter(b => b.daysRemaining > 7);

  // Total expired batches count for secondary badge
  const expiredBatches = activeBatches.filter(b => b.daysRemaining < 0);

  // Recommended action items (first batches in PEPS order that need attention)
  const recommendedBatches = activeBatches
    .filter(b => b.daysRemaining <= 7)
    .slice(0, 8);

  // Quick checkmark action to register quick review or sale
  const handleToggleCheck = (batchId: string) => {
    const next = new Set(checkedBatchIds);
    if (next.has(batchId)) {
      next.delete(batchId);
    } else {
      next.add(batchId);
      soundService.playScanSuccess();
    }
    setCheckedBatchIds(next);
  };

  const handleCopyWhatsApp = (batch: BatchWithProduct) => {
    const salePrice = batch.product.salePrice;
    let promoPrice = salePrice ? Math.round(salePrice * 0.8) : undefined;

    let text = `🔥 ¡Oferta en ${settings.storeName}! ${batch.product.name}.\n`;
    if (salePrice && promoPrice) {
      text += `Antes: $${salePrice.toLocaleString('es-AR')} ➔ ¡AHORA: $${promoPrice.toLocaleString('es-AR')} (20% OFF)!\n`;
    }
    text += `Quedan ${batch.quantity} ${batch.product.unit} por vencimiento próximo (${batch.expirationDate}). ¡Aprovechá hoy en el local!`;

    navigator.clipboard.writeText(text);
    setCopiedId(batch.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Helper to format date in Spanish: e.g. "13 oct"
  const formatShortDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const m = months[parseInt(month, 10) - 1] || month;
    return `${parseInt(day, 10)} ${m}`;
  };

  const { userProfile } = useAuth();
  const userName = userProfile?.displayName ? userProfile.displayName.split(' ')[0] : 'Comerciante';

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Top Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#78847C]">
            {userProfile?.storeName ? userProfile.storeName.toUpperCase() : 'TU COMERCIO, AL DÍA'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#174A36] tracking-tight mt-1">
            Buen día, {userName}.
          </h1>
          <p className="text-sm text-[#78847C] mt-0.5">
            Esto es lo que pasa con tus productos hoy.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {!isDemoMode && onOpenDemo && (
            <button
              type="button"
              onClick={onOpenDemo}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-[#EAF3EC] hover:bg-[#D5E8D7] text-[#246B4D] border border-[#D5E8D7] px-3.5 py-2.5 rounded-2xl font-semibold text-xs shadow-xs transition active:scale-95 whitespace-nowrap min-h-[44px]"
              title="Cargar productos de prueba"
            >
              <Sparkles className="w-4 h-4 text-[#246B4D]" />
              <span>Probar demo</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenScan}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-white hover:bg-[#F8F9F6] text-[#246B4D] border border-[#E7EBE5] px-3.5 py-2.5 rounded-2xl font-semibold text-xs shadow-xs transition active:scale-95 whitespace-nowrap min-h-[44px]"
          >
            <Camera className="w-4 h-4" />
            <span>Escanear código</span>
          </button>

          <button
            type="button"
            onClick={onOpenManualAdd}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-[#246B4D] hover:bg-[#174A36] text-white px-4 py-2.5 rounded-2xl font-semibold text-xs shadow-xs transition active:scale-95 whitespace-nowrap min-h-[44px]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Agregar producto</span>
          </button>
        </div>
      </div>

      {/* 3 Summary KPI Cards (Matching Screenshot) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {/* Card 1: Vencen pronto */}
        <div 
          onClick={() => setActiveTab('expirations')}
          className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E7EBE5] hover:border-[#246B4D]/30 transition shadow-xs cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[#174A36]">Vencen pronto</span>
              <span className="w-2 h-2 rounded-full bg-[#C6533A]" />
            </div>
            <div className="w-9 h-9 rounded-2xl bg-[#FCEBE5] text-[#C6533A] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-4">
            <div className="text-3xl sm:text-4xl font-bold text-[#174A36] font-mono tabular-nums">
              {expiringSoonBatches.length}
            </div>
            <div className="text-xs text-[#78847C] mt-1">
              En los próximos 2 días
              {expiredBatches.length > 0 && ` (${expiredBatches.length} vencidos)`}
            </div>
          </div>
        </div>

        {/* Card 2: Para revisar */}
        <div 
          onClick={() => setActiveTab('expirations')}
          className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E7EBE5] hover:border-[#246B4D]/30 transition shadow-xs cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[#174A36]">Para revisar</span>
              <span className="w-2 h-2 rounded-full bg-[#A66B16]" />
            </div>
            <div className="w-9 h-9 rounded-2xl bg-[#FFF3D9] text-[#A66B16] flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-4">
            <div className="text-3xl sm:text-4xl font-bold text-[#174A36] font-mono tabular-nums">
              {toReviewBatches.length}
            </div>
            <div className="text-xs text-[#78847C] mt-1">
              Vencen en 3 a 7 días
            </div>
          </div>
        </div>

        {/* Card 3: En orden */}
        <div 
          onClick={() => setActiveTab('expirations')}
          className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E7EBE5] hover:border-[#246B4D]/30 transition shadow-xs cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[#174A36]">En orden</span>
              <span className="w-2 h-2 rounded-full bg-[#246B4D]" />
            </div>
            <div className="w-9 h-9 rounded-2xl bg-[#E8F3E9] text-[#246B4D] flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-4">
            <div className="text-3xl sm:text-4xl font-bold text-[#174A36] font-mono tabular-nums">
              {inOrderBatches.length}
            </div>
            <div className="text-xs text-[#78847C] mt-1">
              Más de 7 días
            </div>
          </div>
        </div>
      </div>

      {/* Acción recomendada Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-[#174A36]">
                Acción recomendada
              </h2>
              {recommendedBatches.length > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FCEBE5] text-[#C6533A] font-mono tabular-nums">
                  {recommendedBatches.length} para revisar
                </span>
              )}
            </div>
            <p className="text-xs text-[#78847C] mt-0.5">
              Empezá por lo que vence primero.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('alerts')}
            className="text-xs font-semibold text-[#246B4D] hover:text-[#174A36] flex items-center gap-1 transition"
          >
            <span>Ver alertas</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Rows of items or useful empty states */}
        {productsWithBatches.length === 0 ? (
          <div className="p-8 sm:p-12 text-center rounded-3xl bg-white border border-[#E7EBE5] space-y-3.5 shadow-xs">
            <div className="w-14 h-14 rounded-3xl bg-[#EAF3EC] text-[#246B4D] flex items-center justify-center mx-auto shadow-2xs">
              <Package className="w-7 h-7 stroke-[2]" />
            </div>
            <h3 className="text-lg font-bold text-[#174A36]">Todavía no tenés productos registrados</h3>
            <p className="text-xs sm:text-sm text-[#78847C] max-w-md mx-auto leading-relaxed">
              Comenzá agregando tu primer producto para controlar sus fechas de vencimiento y recibir alertas antes de que venzan. También podés probar la demo con productos de ejemplo.
            </p>
            <div className="flex items-center justify-center gap-2.5 pt-3 flex-wrap">
              <button
                type="button"
                onClick={onOpenManualAdd}
                className="px-5 py-2.5 bg-[#246B4D] hover:bg-[#174A36] text-white text-xs font-bold rounded-2xl transition shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Agregar mi primer producto</span>
              </button>
              <button
                type="button"
                onClick={onOpenScan}
                className="px-4 py-2.5 bg-white hover:bg-[#F8F9F6] text-[#246B4D] border border-[#E7EBE5] text-xs font-semibold rounded-2xl transition shadow-xs flex items-center gap-1.5"
              >
                <Camera className="w-4 h-4" />
                <span>Escanear código</span>
              </button>
              {!isDemoMode && onOpenDemo && (
                <button
                  type="button"
                  onClick={onOpenDemo}
                  className="px-4 py-2.5 bg-[#EAF3EC] hover:bg-[#D5E8D7] text-[#246B4D] border border-[#D5E8D7] text-xs font-semibold rounded-2xl transition shadow-xs flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 text-[#246B4D]" />
                  <span>Probar demo</span>
                </button>
              )}
            </div>
          </div>
        ) : recommendedBatches.length === 0 ? (
          <div className="p-10 text-center rounded-3xl bg-white border border-[#E7EBE5] space-y-2">
            <CheckCircle2 className="w-10 h-10 text-[#246B4D] mx-auto opacity-70" />
            <h3 className="text-base font-bold text-[#174A36]">¡Todo al día en tu comercio!</h3>
            <p className="text-xs text-[#78847C] max-w-sm mx-auto">
              No hay productos con vencimiento en los próximos 7 días que requieran acción inmediata.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recommendedBatches.map(batch => {
              const days = batch.daysRemaining;
              const isExpired = days < 0;
              const isUrgent = days >= 0 && days <= 2;
              const matchingProduct = productsWithBatches.find(p => p.id === batch.productId);
              const isChecked = checkedBatchIds.has(batch.id);

              // Border left accent color
              const borderLeftClass = isExpired
                ? 'border-l-4 border-l-[#78847C]'
                : isUrgent
                ? 'border-l-4 border-l-[#C6533A]'
                : 'border-l-4 border-l-[#A66B16]';

              // Concentric target dot color
              const ringColor = isExpired ? '#78847C' : isUrgent ? '#C6533A' : '#A66B16';

              // Date text description
              const dateDesc = isExpired
                ? `Venció el ${formatShortDate(batch.expirationDate)} · ${formatShortDate(batch.expirationDate)}`
                : days === 0
                ? `Vence hoy · ${formatShortDate(batch.expirationDate)}`
                : days === 1
                ? `Vence en 1 día · ${formatShortDate(batch.expirationDate)}`
                : `Vence en ${days} días · ${formatShortDate(batch.expirationDate)}`;

              // Recommendation text
              let recommendationText = '';
              if (isExpired) {
                recommendationText = 'Retirar del stock. No vender.';
              } else if (days <= 1) {
                recommendationText = batch.product.salePrice 
                  ? `Descuento sugerido: 20% (Promo $${Math.round(batch.product.salePrice * 0.8).toLocaleString('es-AR')}) o 2x1.`
                  : 'Descuento sugerido: 20% o 2x1.';
              } else if (days <= 3) {
                recommendationText = 'Descuento sugerido: 15% para acelerar rotación.';
              } else {
                recommendationText = 'Priorizar rotación PEPS al frente de góndola.';
              }

              return (
                <div
                  key={batch.id}
                  className={`p-4 sm:p-5 rounded-2xl bg-white border border-[#E7EBE5] hover:border-[#246B4D]/30 transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${borderLeftClass} ${
                    isChecked ? 'opacity-50 bg-[#F8F9F6]' : ''
                  }`}
                >
                  {/* Left Info Group */}
                  <div className="flex items-start gap-3.5">
                    {/* Concentric target ring dot */}
                    <div className="pt-1 shrink-0">
                      <div 
                        className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                        style={{ borderColor: ringColor }}
                      >
                        <div 
                          className="w-1.5 h-1.5 rounded-full" 
                          style={{ backgroundColor: ringColor }} 
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      {/* Title & Quantity pill */}
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => matchingProduct && onSelectProduct(matchingProduct)}
                          className="text-sm sm:text-base font-bold text-[#174A36] hover:text-[#246B4D] transition text-left"
                        >
                          {batch.product.name}
                        </button>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#F8F9F6] border border-[#E7EBE5] text-[#78847C] font-mono tabular-nums">
                          {batch.quantity} {batch.product.unit}
                        </span>
                      </div>

                      {/* Expiry date subtitle */}
                      <div className="text-xs text-[#78847C]">
                        {dateDesc}
                      </div>

                      {/* Recommendation text */}
                      <div className="flex items-center gap-1.5 text-xs text-[#78847C] pt-0.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#246B4D] shrink-0" />
                        <span>{recommendationText}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Action Buttons */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-center shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E7EBE5]">
                    {/* Status Badge */}
                    <div className="shrink-0">
                      {isExpired ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F8F9F6] border border-[#E7EBE5] text-[#78847C]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#78847C]" />
                          <span>Vencido</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FCEBE5] text-[#C6533A]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C6533A]" />
                          <span>Urgente</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Promo button */}
                      {!isExpired && (
                        <button
                          type="button"
                          onClick={() => setSelectedPromoBatch(batch)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E7EBE5] hover:border-[#246B4D] hover:bg-[#EAF3EC] text-xs font-medium text-[#174A36] transition"
                        >
                          <Tag className="w-3.5 h-3.5 text-[#246B4D]" />
                          <span>Crear promo</span>
                        </button>
                      )}

                      {/* Checkmark review button */}
                      <button
                        type="button"
                        onClick={() => handleToggleCheck(batch.id)}
                        className={`w-8 h-8 rounded-xl border flex items-center justify-center transition ${
                          isChecked 
                            ? 'bg-[#246B4D] text-white border-[#246B4D]' 
                            : 'border-[#E7EBE5] text-[#78847C] hover:text-[#246B4D] hover:border-[#246B4D] hover:bg-[#EAF3EC]'
                        }`}
                        title={isChecked ? 'Revisado' : 'Marcar como revisado'}
                      >
                        <Check className="w-4 h-4 stroke-[2.2]" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Promo / WhatsApp Quick Modal */}
      {selectedPromoBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white border border-[#E7EBE5] rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7EBE5]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#EAF3EC] text-[#246B4D] flex items-center justify-center">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#174A36]">Crear Promoción Relámpago</h3>
                  <p className="text-xs text-[#78847C]">{selectedPromoBatch.product.name}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPromoBatch(null)}
                className="p-1 rounded-lg text-[#78847C] hover:text-[#174A36]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#F8F9F6] border border-[#E7EBE5] space-y-2 text-xs text-[#24372F]">
              <div className="flex justify-between font-mono">
                <span className="text-[#78847C]">Precio regular:</span>
                <span className="font-bold text-[#174A36]">
                  {selectedPromoBatch.product.salePrice ? `$${selectedPromoBatch.product.salePrice.toLocaleString('es-AR')}` : 'No definido'}
                </span>
              </div>
              {selectedPromoBatch.product.salePrice && (
                <>
                  <div className="flex justify-between font-mono">
                    <span className="text-[#246B4D] font-semibold">Con 15% OFF:</span>
                    <span className="font-bold text-[#174A36]">
                      ${Math.round(selectedPromoBatch.product.salePrice * 0.85).toLocaleString('es-AR')}
                    </span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span className="text-[#246B4D] font-semibold">Con 20% OFF (Recomendado):</span>
                    <span className="font-bold text-[#246B4D]">
                      ${Math.round(selectedPromoBatch.product.salePrice * 0.8).toLocaleString('es-AR')}
                    </span>
                  </div>
                </>
              )}
              <div className="pt-2 border-t border-[#E7EBE5] text-[11px] text-[#78847C]">
                Stock a liquidar: <strong className="text-[#174A36]">{selectedPromoBatch.quantity} {selectedPromoBatch.product.unit}</strong> (Vence: {selectedPromoBatch.expirationDate}).
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedPromoBatch(null)}
                className="px-4 py-2 text-xs font-semibold text-[#78847C] hover:text-[#174A36] rounded-xl"
              >
                Cerrar
              </button>

              <button
                type="button"
                onClick={() => handleCopyWhatsApp(selectedPromoBatch)}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#246B4D] hover:bg-[#174A36] rounded-xl transition shadow-xs"
              >
                {copiedId === selectedPromoBatch.id ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>¡Copiado para WhatsApp!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar Texto para WhatsApp</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
