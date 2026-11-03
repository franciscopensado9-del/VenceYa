import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  Tag, 
  Copy, 
  Check, 
  ArrowRight,
  Flame,
  CheckCircle2
} from 'lucide-react';
import { SalesSuggestion, ProductWithBatches, StoreSettings, Batch, PromotionType } from '../../types';

interface SuggestionsViewProps {
  suggestions: SalesSuggestion[];
  productsWithBatches: ProductWithBatches[];
  settings: StoreSettings;
  onSelectProduct: (product: ProductWithBatches) => void;
  onOpenPromotion?: (product: ProductWithBatches, batch?: Batch, discount?: number, type?: PromotionType) => void;
}

export const SuggestionsView: React.FC<SuggestionsViewProps> = ({
  suggestions,
  productsWithBatches,
  settings,
  onSelectProduct,
  onOpenPromotion,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sort suggestions by priority: lowest daysRemaining first, then highest stock
  const sortedSuggestions = useMemo(() => {
    return [...suggestions].sort((a, b) => {
      if (a.daysRemaining !== b.daysRemaining) {
        return a.daysRemaining - b.daysRemaining;
      }
      return b.quantity - a.quantity;
    });
  }, [suggestions]);

  const topSuggestion = sortedSuggestions[0];
  const otherSuggestions = sortedSuggestions.slice(1);

  const handleCopyWhatsApp = (suggestion: SalesSuggestion) => {
    let text = `🔥 *OFERTA EN ${settings.storeName.toUpperCase()}*\n`;
    text += `📦 *${suggestion.productName}*\n`;
    
    if (suggestion.salePrice && suggestion.discounts && suggestion.discounts.length > 0) {
      const best = suggestion.discounts[2] || suggestion.discounts[0]; // ~20%
      text += `💰 Precio Regular: $${suggestion.salePrice.toLocaleString('es-AR')}\n`;
      text += `🏷️ *Precio Promo: $${best.promoPrice.toLocaleString('es-AR')} (${best.percentage}% OFF)*\n`;
    }

    text += `📅 Vencimiento próximo: ${suggestion.expirationDate}\n`;
    text += `⚡ Stock disponible: ${suggestion.quantity} ${suggestion.unit}\n`;
    text += `¡Aprovechá hoy en nuestro local!`;

    navigator.clipboard.writeText(text);
    setCopiedId(suggestion.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-150">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#174A36] tracking-tight">
          Sugerencias y Promociones
        </h1>
        <p className="text-xs sm:text-sm text-[#78847C] mt-0.5">
          Estrategias inteligentes para vender antes de que la mercadería venza.
        </p>
      </div>

      {sortedSuggestions.length === 0 ? (
        <div className="p-10 text-center rounded-3xl bg-white border border-[#E7EBE5] space-y-2 shadow-xs">
          <CheckCircle2 className="w-10 h-10 text-[#246B4D] mx-auto opacity-70" />
          <h3 className="text-base font-bold text-[#174A36]">Todo tu inventario está al día</h3>
          <p className="text-xs text-[#78847C] max-w-sm mx-auto">
            No hay productos con vencimiento corto que requieran promociones urgentes en este momento.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* 1. Recomendación más importante (Featured Card) */}
          {topSuggestion && (() => {
            const parentProduct = productsWithBatches.find(p => p.id === topSuggestion.productId);
            const matchingBatch = parentProduct?.batches.find(b => b.id === topSuggestion.batchId);
            const isCritical = topSuggestion.daysRemaining <= 1;

            return (
              <div className="p-5 sm:p-6 rounded-3xl bg-white border-2 border-[#246B4D] shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#EAF3EC] text-[#246B4D] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Recomendación Principal</span>
                    </span>
                    <span className={`text-xs font-bold ${isCritical ? 'text-[#C6533A]' : 'text-[#A66B16]'}`}>
                      {topSuggestion.daysRemaining <= 0 ? 'Vence hoy' : `Vence en ${topSuggestion.daysRemaining} días`}
                    </span>
                  </div>

                  <span className="text-xs text-[#78847C]">
                    Stock: <strong className="text-[#174A36] font-mono">{topSuggestion.quantity} {topSuggestion.unit}</strong>
                  </span>
                </div>

                {/* Product Name & Short Rationale */}
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-[#174A36]">
                    {topSuggestion.productName}
                  </h2>
                  <p className="text-xs sm:text-sm text-[#24372F] mt-1.5 bg-[#F8F9F6] p-3 rounded-2xl border border-[#E7EBE5] leading-relaxed">
                    💡 <strong>¿Por qué se sugiere?</strong> {topSuggestion.recommendation || topSuggestion.description}
                  </p>
                </div>

                {/* Price and CTA Button */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {topSuggestion.salePrice && (
                    <div className="text-xs text-[#24372F]">
                      Precio regular: <span className="font-mono line-through text-[#78847C]">${topSuggestion.salePrice.toLocaleString('es-AR')}</span>
                      {topSuggestion.discounts && topSuggestion.discounts.length > 0 && (
                        <span className="ml-2 font-bold text-[#246B4D] font-mono text-sm">
                          ➔ Promo: ${topSuggestion.discounts[0].promoPrice.toLocaleString('es-AR')} ({topSuggestion.discounts[0].percentage}% OFF)
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyWhatsApp(topSuggestion)}
                      className="px-3.5 py-2.5 rounded-xl border border-[#E7EBE5] hover:bg-[#F8F9F6] text-xs font-semibold text-[#174A36] transition flex items-center gap-1.5 min-h-[44px]"
                    >
                      {copiedId === topSuggestion.id ? <Check className="w-4 h-4 text-[#246B4D]" /> : <Copy className="w-4 h-4 text-[#78847C]" />}
                      <span>{copiedId === topSuggestion.id ? 'Copiado' : 'Copiar texto'}</span>
                    </button>

                    {parentProduct && onOpenPromotion && (
                      <button
                        type="button"
                        onClick={() => onOpenPromotion(
                          parentProduct, 
                          matchingBatch, 
                          topSuggestion.discounts?.[0]?.percentage || 20
                        )}
                        className="px-5 py-2.5 rounded-xl bg-[#246B4D] hover:bg-[#174A36] text-white text-xs font-bold transition flex items-center gap-2 shadow-xs min-h-[44px] active:scale-95"
                      >
                        <Tag className="w-4 h-4" />
                        <span>Crear promoción</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 2. Otras recomendaciones */}
          {otherSuggestions.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold text-[#174A36]">
                Otras sugerencias ({otherSuggestions.length})
              </h3>

              <div className="space-y-2.5">
                {otherSuggestions.map(suggestion => {
                  const parentProduct = productsWithBatches.find(p => p.id === suggestion.productId);
                  const matchingBatch = parentProduct?.batches.find(b => b.id === suggestion.batchId);

                  return (
                    <div
                      key={suggestion.id}
                      className="p-4 rounded-2xl sm:rounded-3xl bg-white border border-[#E7EBE5] hover:border-[#246B4D]/30 transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-bold text-[#A66B16]">
                            Vence en {suggestion.daysRemaining}d
                          </span>
                          <span className="text-[#E7EBE5]">·</span>
                          <span className="text-[#78847C]">
                            Stock: {suggestion.quantity} {suggestion.unit}
                          </span>
                        </div>

                        <h4 className="text-sm sm:text-base font-bold text-[#174A36] truncate">
                          {suggestion.productName}
                        </h4>

                        <p className="text-xs text-[#78847C] line-clamp-1">
                          {suggestion.recommendation || suggestion.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E7EBE5]">
                        {parentProduct && onOpenPromotion && (
                          <button
                            type="button"
                            onClick={() => onOpenPromotion(
                              parentProduct, 
                              matchingBatch, 
                              suggestion.discounts?.[0]?.percentage || 20
                            )}
                            className="px-4 py-2 rounded-xl bg-[#EAF3EC] hover:bg-[#246B4D] hover:text-white text-xs font-bold text-[#246B4D] transition flex items-center gap-1.5 min-h-[40px] active:scale-95"
                          >
                            <Tag className="w-3.5 h-3.5" />
                            <span>Crear promo</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
