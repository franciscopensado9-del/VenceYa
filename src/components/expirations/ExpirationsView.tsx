import React, { useState, useMemo } from 'react';
import { 
  CalendarClock, 
  Search, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Package, 
  X,
  ArrowRight
} from 'lucide-react';
import { BatchWithProduct, ProductWithBatches } from '../../types';
import { storageService } from '../../services/storage';
import { firestoreSyncService } from '../../services/firestoreSync';
import { useAuth } from '../../contexts/AuthContext';
import { soundService } from '../../services/sound';

interface ExpirationsViewProps {
  batchesWithProduct: BatchWithProduct[];
  productsWithBatches: ProductWithBatches[];
  onRefresh: () => void;
  onSelectProduct: (product: ProductWithBatches) => void;
}

type ExpirationUrgencyTab = 'all' | 'expired' | 'soon' | 'safe';

export const ExpirationsView: React.FC<ExpirationsViewProps> = ({
  batchesWithProduct,
  productsWithBatches,
  onRefresh,
  onSelectProduct,
}) => {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<ExpirationUrgencyTab>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [quickAdjustBatch, setQuickAdjustBatch] = useState<{ batch: BatchWithProduct; action: 'sell' | 'waste' } | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<string>('1');

  // Breakdown by the 3 requested urgency tiers
  const activeBatches = useMemo(() => {
    return batchesWithProduct.filter(b => b.quantity > 0);
  }, [batchesWithProduct]);

  const counts = useMemo(() => {
    const res = {
      all: activeBatches.length,
      expired: 0,
      soon: 0,
      safe: 0,
    };

    for (const b of activeBatches) {
      if (b.daysRemaining < 0) res.expired++;
      else if (b.daysRemaining <= 7) res.soon++;
      else res.safe++;
    }

    return res;
  }, [activeBatches]);

  // Filter batches
  const filteredBatches = useMemo(() => {
    return activeBatches.filter(item => {
      // Search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchesName = item.product.name.toLowerCase().includes(query);
        const matchesLot = item.lotNumber?.toLowerCase().includes(query);
        const matchesBarcode = item.product.barcode?.toLowerCase().includes(query);
        if (!matchesName && !matchesLot && !matchesBarcode) return false;
      }

      // 3 urgency tiers
      if (activeTab === 'expired') return item.daysRemaining < 0;
      if (activeTab === 'soon') return item.daysRemaining >= 0 && item.daysRemaining <= 7;
      if (activeTab === 'safe') return item.daysRemaining > 7;

      return true;
    }).sort((a, b) => {
      // Sort strictly by PEPS (earliest expiration first)
      return a.expirationDate.localeCompare(b.expirationDate);
    });
  }, [activeBatches, activeTab, searchTerm]);

  const handleOpenAdjust = (batch: BatchWithProduct, action: 'sell' | 'waste') => {
    setQuickAdjustBatch({ batch, action });
    setAdjustAmount('1');
  };

  const handleConfirmAdjust = () => {
    if (!quickAdjustBatch) return;
    const amount = Number(adjustAmount);
    if (isNaN(amount) || amount <= 0) return;

    storageService.updateBatchQuantity(quickAdjustBatch.batch.id, -amount);
    if (userProfile?.storeId && !storageService.isDemoActive()) {
      firestoreSyncService.updateBatchQuantity(userProfile.storeId, quickAdjustBatch.batch.id, -amount)
        .catch(err => console.warn('Adjust qty cloud err:', err));
    }
    soundService.playScanSuccess();
    setQuickAdjustBatch(null);
    onRefresh();
  };

  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const m = months[parseInt(parts[1], 10) - 1] || parts[1];
    return `${parseInt(parts[2], 10)} ${m} ${parts[0]}`;
  };

  const getUrgencyBadge = (days: number) => {
    if (days < 0) {
      return {
        label: `Venció hace ${Math.abs(days)}d`,
        colorClass: 'bg-[#FCEBE5] text-[#C6533A]',
      };
    }
    if (days === 0) {
      return {
        label: 'Vence hoy',
        colorClass: 'bg-[#FCEBE5] text-[#C6533A]',
      };
    }
    if (days === 1) {
      return {
        label: 'Vence mañana',
        colorClass: 'bg-[#FFF3D9] text-[#A66B16]',
      };
    }
    if (days <= 7) {
      return {
        label: `Vence en ${days}d`,
        colorClass: 'bg-[#FFF3D9] text-[#A66B16]',
      };
    }
    return {
      label: `En ${days}d`,
      colorClass: 'bg-[#EAF3EC] text-[#246B4D]',
    };
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#174A36] tracking-tight">
          Vencimientos
        </h1>
        <p className="text-xs sm:text-sm text-[#78847C] mt-0.5">
          Organizados por orden de urgencia para priorizar su rotación.
        </p>
      </div>

      {/* 3 Urgency Tabs + Search */}
      <div className="p-3.5 sm:p-4 rounded-3xl bg-white border border-[#E7EBE5] space-y-3 shadow-xs">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#78847C] absolute left-3.5 top-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por producto o lote..."
            className="w-full pl-10 pr-9 py-2.5 bg-[#F8F9F6] border border-[#E7EBE5] rounded-2xl text-xs sm:text-sm text-[#24372F] placeholder-[#78847C] focus:outline-none focus:border-[#246B4D] focus:bg-white transition"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-[#78847C] hover:text-[#174A36] p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 3 Urgency Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition min-h-[40px] flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-[#174A36] text-white shadow-2xs'
                : 'bg-[#F8F9F6] text-[#78847C] hover:text-[#174A36]'
            }`}
          >
            <span>Todos</span>
            <span className="font-mono text-[11px] opacity-80">({counts.all})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('expired')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition min-h-[40px] flex items-center gap-1.5 ${
              activeTab === 'expired'
                ? 'bg-[#C6533A] text-white shadow-2xs'
                : counts.expired > 0
                ? 'bg-[#FCEBE5] text-[#C6533A] hover:bg-[#F9DDD3]'
                : 'bg-[#F8F9F6] text-[#78847C] hover:text-[#174A36]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Vencidos</span>
            <span className="font-mono text-[11px] font-bold">({counts.expired})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('soon')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition min-h-[40px] flex items-center gap-1.5 ${
              activeTab === 'soon'
                ? 'bg-[#A66B16] text-white shadow-2xs'
                : counts.soon > 0
                ? 'bg-[#FFF3D9] text-[#A66B16] hover:bg-[#FBEAC4]'
                : 'bg-[#F8F9F6] text-[#78847C] hover:text-[#174A36]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Vencen pronto (0 a 7d)</span>
            <span className="font-mono text-[11px] font-bold">({counts.soon})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('safe')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition min-h-[40px] flex items-center gap-1.5 ${
              activeTab === 'safe'
                ? 'bg-[#246B4D] text-white shadow-2xs'
                : 'bg-[#F8F9F6] text-[#78847C] hover:text-[#174A36]'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Sin urgencia (&gt;7d)</span>
            <span className="font-mono text-[11px]">({counts.safe})</span>
          </button>
        </div>
      </div>

      {/* Batches List */}
      {filteredBatches.length === 0 ? (
        <div className="p-10 text-center rounded-3xl bg-white border border-[#E7EBE5] space-y-2 shadow-xs">
          <CalendarClock className="w-10 h-10 text-[#78847C] mx-auto opacity-40" />
          <h3 className="text-base font-bold text-[#174A36]">
            {searchTerm
              ? 'No se encontraron lotes con esa búsqueda'
              : activeTab === 'expired'
              ? '¡Excelente! No tenés lotes vencidos'
              : activeTab === 'soon'
              ? 'No tenés productos que venzan en los próximos 7 días'
              : 'No hay lotes en esta categoría'}
          </h3>
          <p className="text-xs text-[#78847C]">
            {activeTab === 'expired' || activeTab === 'soon'
              ? 'Todo tu inventario está protegido.'
              : 'Podés consultar otras categorías o buscar otro producto.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredBatches.map(batch => {
            const urgency = getUrgencyBadge(batch.daysRemaining);
            const parentProduct = productsWithBatches.find(p => p.id === batch.product.id);

            return (
              <div
                key={batch.id}
                onClick={() => {
                  if (parentProduct) onSelectProduct(parentProduct);
                }}
                className="p-4 rounded-2xl sm:rounded-3xl bg-white border border-[#E7EBE5] hover:border-[#246B4D]/40 transition shadow-xs cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                role="button"
                tabIndex={0}
              >
                {/* Product Name & Lot */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${urgency.colorClass}`}>
                      {urgency.label}
                    </span>
                    <span className="text-xs text-[#78847C] truncate">
                      {batch.product.category}
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-[#174A36] group-hover:text-[#246B4D] transition mt-1 truncate">
                    {batch.product.name}
                  </h3>

                  <div className="flex items-center gap-2 text-xs text-[#78847C] mt-0.5">
                    {batch.lotNumber && (
                      <span>Lote: <strong className="font-mono text-[#24372F]">{batch.lotNumber}</strong></span>
                    )}
                    {batch.lotNumber && <span className="text-[#E7EBE5]">·</span>}
                    <span>Vence: <strong className="text-[#24372F]">{formatShortDate(batch.expirationDate)}</strong></span>
                  </div>
                </div>

                {/* Stock & Quick Adjust */}
                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E7EBE5]">
                  <div className="text-left sm:text-right">
                    <div className="text-sm sm:text-base font-bold font-mono text-[#174A36] tabular-nums">
                      {batch.quantity} <span className="text-xs font-normal text-[#78847C]">{batch.product.unit}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleOpenAdjust(batch, 'sell')}
                      className="px-2.5 py-1.5 rounded-xl bg-[#EAF3EC] hover:bg-[#246B4D] hover:text-white text-xs font-semibold text-[#246B4D] transition min-h-[38px] active:scale-95"
                      title="Registrar venta de este lote"
                    >
                      Venta
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenAdjust(batch, 'waste')}
                      className="px-2.5 py-1.5 rounded-xl bg-[#F8F9F6] hover:bg-[#FCEBE5] text-xs font-semibold text-[#78847C] hover:text-[#C6533A] transition min-h-[38px] active:scale-95"
                      title="Registrar merma o descarte"
                    >
                      Baja
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Adjust Dialog */}
      {quickAdjustBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#174A36]">
              {quickAdjustBatch.action === 'sell' ? 'Registrar Venta' : 'Registrar Baja de Lote'}
            </h3>
            <p className="text-xs text-[#78847C]">
              {quickAdjustBatch.batch.product.name} (Stock: {quickAdjustBatch.batch.quantity})
            </p>

            <div>
              <label className="block text-xs font-semibold text-[#24372F] mb-1">
                Cantidad a descontar
              </label>
              <input
                type="number"
                min="1"
                max={quickAdjustBatch.batch.quantity}
                value={adjustAmount}
                onChange={e => setAdjustAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F8F9F6] border border-[#E7EBE5] rounded-xl text-sm font-mono font-bold text-[#174A36] focus:outline-none focus:border-[#246B4D]"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setQuickAdjustBatch(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#E7EBE5] text-xs font-semibold text-[#78847C] hover:bg-[#F8F9F6]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAdjust}
                className="flex-1 py-2.5 rounded-xl bg-[#246B4D] hover:bg-[#174A36] text-white text-xs font-bold transition shadow-xs"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
