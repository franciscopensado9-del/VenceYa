import React, { useState } from 'react';
import { 
  Sparkles, 
  Tag, 
  TrendingDown, 
  AlertTriangle, 
  Flame, 
  Copy, 
  Check, 
  ExternalLink, 
  Percent, 
  DollarSign, 
  Share2,
  PackageCheck
} from 'lucide-react';
import { SalesSuggestion, ProductWithBatches, StoreSettings } from '../../types';

interface SuggestionsViewProps {
  suggestions: SalesSuggestion[];
  productsWithBatches: ProductWithBatches[];
  settings: StoreSettings;
  onSelectProduct: (product: ProductWithBatches) => void;
}

export const SuggestionsView: React.FC<SuggestionsViewProps> = ({
  suggestions,
  productsWithBatches,
  settings,
  onSelectProduct,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  // Calculate estimated total revenue at risk (sum of quantity * salePrice for items <= 7 days)
  const totalRevenueAtRisk = suggestions.reduce((acc, s) => {
    if (s.salePrice && s.daysRemaining >= 0 && s.daysRemaining <= 7) {
      return acc + (s.quantity * s.salePrice);
    }
    return acc;
  }, 0);

  const handleCopyWhatsApp = (suggestion: SalesSuggestion) => {
    let text = `🔥 *OFERTA ESPECIAL EN ${settings.storeName.toUpperCase()}*\n`;
    text += `📦 *${suggestion.productName}*\n`;
    
    if (suggestion.salePrice && suggestion.discounts && suggestion.discounts.length > 0) {
      const best = suggestion.discounts[2] || suggestion.discounts[0]; // 20%
      text += `💰 Precio Regular: $${suggestion.salePrice.toLocaleString('es-AR')}\n`;
      text += `🏷️ *Precio Promo: $${best.promoPrice.toLocaleString('es-AR')} (${best.percentage}% OFF)*\n`;
    }

    text += `📅 Vencimiento corto: ${suggestion.expirationDate}\n`;
    text += `⚡ Stock disponible: ${suggestion.quantity} ${suggestion.unit}\n`;
    text += `📍 ¡Pasá por nuestro local antes de que se agote!`;

    navigator.clipboard.writeText(text);
    setCopiedId(suggestion.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filteredSuggestions = suggestions.filter(s => {
    if (filterType === 'all') return true;
    return s.type === filterType;
  });

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Title */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#78847C]">
          ESTRATEGIAS ANTICIPADAS
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#174A36] tracking-tight mt-1 flex items-center gap-2.5">
          <Sparkles className="w-7 h-7 text-[#246B4D]" />
          <span>Sugerencias para Reducir Pérdidas</span>
        </h1>
        <p className="text-sm text-[#78847C] mt-0.5">
          Recomendaciones comerciales calculadas con datos reales de tus lotes y precios
        </p>
      </div>

      {/* Strategic Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-[#E7EBE5] shadow-xs">
          <span className="text-xs text-[#78847C] block mb-1">Mercadería en Riesgo Inmediato</span>
          <span className="text-2xl sm:text-3xl font-bold text-[#A66B16] font-mono tabular-nums">
            ${totalRevenueAtRisk.toLocaleString('es-AR')}
          </span>
          <span className="text-[11px] text-[#78847C] block mt-1">Valor de venta en lotes ≤ 7 días</span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#E7EBE5] shadow-xs">
          <span className="text-xs text-[#78847C] block mb-1">Recupero Potencial (con 15% OFF)</span>
          <span className="text-2xl sm:text-3xl font-bold text-[#246B4D] font-mono tabular-nums">
            ${Math.round(totalRevenueAtRisk * 0.85).toLocaleString('es-AR')}
          </span>
          <span className="text-[11px] text-[#78847C] block mt-1">Capital rescatable antes de vencer</span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#E7EBE5] shadow-xs">
          <span className="text-xs text-[#78847C] block mb-1">Sugerencias Activas</span>
          <span className="text-2xl sm:text-3xl font-bold text-[#174A36] font-mono tabular-nums">
            {suggestions.length}
          </span>
          <span className="text-[11px] text-[#78847C] block mt-1">Artículos con propuesta de acción</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3.5 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition ${
            filterType === 'all' 
              ? 'bg-[#246B4D] text-white shadow-xs' 
              : 'bg-white border border-[#E7EBE5] text-[#78847C] hover:bg-[#F8F9F6]'
          }`}
        >
          Todas ({suggestions.length})
        </button>
        <button
          onClick={() => setFilterType('discount_urgent')}
          className={`px-3.5 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition ${
            filterType === 'discount_urgent' 
              ? 'bg-[#246B4D] text-white shadow-xs' 
              : 'bg-white border border-[#E7EBE5] text-[#78847C] hover:bg-[#F8F9F6]'
          }`}
        >
          Liquidación urgente (0-1 día)
        </button>
        <button
          onClick={() => setFilterType('discount_moderate')}
          className={`px-3.5 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition ${
            filterType === 'discount_moderate' 
              ? 'bg-[#246B4D] text-white shadow-xs' 
              : 'bg-white border border-[#E7EBE5] text-[#78847C] hover:bg-[#F8F9F6]'
          }`}
        >
          Descuentos sugeridos (≤3 días)
        </button>
        <button
          onClick={() => setFilterType('pack_promo')}
          className={`px-3.5 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition ${
            filterType === 'pack_promo' 
              ? 'bg-[#246B4D] text-white shadow-xs' 
              : 'bg-white border border-[#E7EBE5] text-[#78847C] hover:bg-[#F8F9F6]'
          }`}
        >
          Alto stock / Combos
        </button>
        <button
          onClick={() => setFilterType('withdraw_waste')}
          className={`px-3.5 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition ${
            filterType === 'withdraw_waste' 
              ? 'bg-[#246B4D] text-white shadow-xs' 
              : 'bg-white border border-[#E7EBE5] text-[#78847C] hover:bg-[#F8F9F6]'
          }`}
        >
          Retiro por vencimiento
        </button>
      </div>

      {/* Suggestions List */}
      {filteredSuggestions.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-[#E7EBE5] space-y-2 shadow-xs">
          <PackageCheck className="w-10 h-10 text-[#246B4D] mx-auto opacity-70" />
          <h3 className="text-base font-semibold text-[#174A36]">No hay sugerencias en esta categoría</h3>
          <p className="text-xs text-[#78847C]">
            Los lotes restantes tienen rotación holgada o no requieren acción inmediata.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSuggestions.map(sugg => {
            const isWithdraw = sugg.type === 'withdraw_waste';
            const isUrgent = sugg.type === 'discount_urgent';
            const matchingProduct = productsWithBatches.find(p => p.id === sugg.productId);

            return (
              <div
                key={sugg.id}
                className={`p-5 sm:p-6 rounded-3xl border space-y-4 transition bg-white shadow-xs ${
                  isWithdraw
                    ? 'border-[#FCEBE5] bg-[#FFF8F7]'
                    : isUrgent
                    ? 'border-[#FFF3D9] bg-[#FFFCF5]'
                    : 'border-[#E7EBE5]'
                }`}
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className={`text-xs font-bold uppercase tracking-wider block ${
                      isWithdraw ? 'text-[#C6533A]' : isUrgent ? 'text-[#A66B16]' : 'text-[#246B4D]'
                    }`}>
                      {sugg.title}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-[#174A36] mt-0.5">
                      {sugg.productName}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-mono">
                    <span className="px-2.5 py-1 rounded-xl bg-[#F8F9F6] border border-[#E7EBE5] text-[#78847C]">
                      Stock: <strong className="text-[#174A36]">{sugg.quantity} {sugg.unit}</strong>
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-[#F8F9F6] border border-[#E7EBE5] text-[#78847C]">
                      Vence: <strong className="text-[#174A36]">{sugg.expirationDate}</strong>
                    </span>
                  </div>
                </div>

                {/* Recommendation prose */}
                <div className="space-y-1.5 text-xs text-[#78847C]">
                  <p className="leading-relaxed">{sugg.description}</p>
                  <p className="text-[#174A36] font-medium leading-relaxed bg-[#F8F9F6] p-2.5 rounded-xl border border-[#E7EBE5]">
                    👉 <strong className="font-semibold text-[#174A36]">Acción sugerida:</strong> {sugg.recommendation}
                  </p>
                </div>

                {/* Discount options table if prices exist */}
                {sugg.discounts && sugg.discounts.length > 0 && (
                  <div className="p-4 rounded-2xl bg-[#F8F9F6] border border-[#E7EBE5] space-y-2.5">
                    <div className="flex items-center justify-between text-xs text-[#78847C]">
                      <span className="font-semibold text-[#174A36] flex items-center gap-1.5">
                        <Percent className="w-3.5 h-3.5 text-[#246B4D]" />
                        Simulador de Descuentos para Recuperar Capital:
                      </span>
                      <span className="font-mono text-[#78847C]">
                        Precio Regular: ${sugg.salePrice?.toLocaleString('es-AR')}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                      {sugg.discounts.map(d => (
                        <div
                          key={d.percentage}
                          className="p-3 rounded-2xl bg-white border border-[#E7EBE5] text-center space-y-1 shadow-xs"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-[#246B4D]">{d.percentage}% OFF</span>
                            <span className="text-[11px] text-[#78847C] font-mono">
                              Ahorro: ${d.savingsPerUnit.toLocaleString('es-AR')}
                            </span>
                          </div>
                          <div className="text-lg font-bold font-mono text-[#174A36] tabular-nums">
                            ${d.promoPrice.toLocaleString('es-AR')}
                          </div>
                          <div className="text-[10px] text-[#78847C] font-mono">
                            Total a cobrar: ${d.totalRecoverable.toLocaleString('es-AR')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer Actions */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#E7EBE5]">
                  <div className="flex items-center gap-2">
                    {matchingProduct && (
                      <button
                        onClick={() => onSelectProduct(matchingProduct)}
                        className="px-3.5 py-2 rounded-2xl bg-[#F8F9F6] hover:bg-[#E7EBE5] text-xs font-semibold text-[#174A36] border border-[#E7EBE5] transition flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-[#246B4D]" />
                        <span>Ver Lotes y Producto</span>
                      </button>
                    )}
                  </div>

                  {!isWithdraw && (
                    <button
                      type="button"
                      onClick={() => handleCopyWhatsApp(sugg)}
                      className="px-4 py-2.5 rounded-2xl bg-[#246B4D] hover:bg-[#174A36] text-white text-xs font-semibold transition shadow-xs flex items-center gap-1.5 active:scale-95"
                    >
                      {copiedId === sugg.id ? (
                        <>
                          <Check className="w-4 h-4 stroke-[2.5]" />
                          <span>¡Texto copiado para WhatsApp!</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Copiar Oferta para WhatsApp</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
