import React, { useState, useMemo } from 'react';
import { 
  CalendarClock, 
  Search, 
  AlertTriangle, 
  Flame, 
  Calendar, 
  CheckCircle2, 
  MinusCircle, 
  AlertOctagon, 
  Barcode, 
  Package, 
  ExternalLink 
} from 'lucide-react';
import { BatchWithProduct, ProductWithBatches, ExpirationStatus } from '../../types';
import { getStatusLabel, storageService } from '../../services/storage';
import { firestoreSyncService } from '../../services/firestoreSync';
import { useAuth } from '../../contexts/AuthContext';
import { soundService } from '../../services/sound';

interface ExpirationsViewProps {
  batchesWithProduct: BatchWithProduct[];
  productsWithBatches: ProductWithBatches[];
  onRefresh: () => void;
  onSelectProduct: (product: ProductWithBatches) => void;
}

type ExpirationFilterTab = 'all' | 'expired' | 'today' | '3d' | '7d' | '30d' | 'safe';

export const ExpirationsView: React.FC<ExpirationsViewProps> = ({
  batchesWithProduct,
  productsWithBatches,
  onRefresh,
  onSelectProduct,
}) => {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<ExpirationFilterTab>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [quickAdjustBatch, setQuickAdjustBatch] = useState<{ batch: BatchWithProduct; action: 'sell' | 'waste' } | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<string>('1');

  // Breakdown counts
  const counts = useMemo(() => {
    const res = {
      all: 0,
      expired: 0,
      today: 0,
      '3d': 0,
      '7d': 0,
      '30d': 0,
      safe: 0,
    };

    for (const b of batchesWithProduct) {
      if (b.quantity <= 0) continue;
      res.all++;
      const d = b.daysRemaining;
      if (d < 0) res.expired++;
      else if (d === 0) res.today++;
      else if (d <= 3) res['3d']++;
      else if (d <= 7) res['7d']++;
      else if (d <= 30) res['30d']++;
      else res.safe++;
    }

    return res;
  }, [batchesWithProduct]);

  // Filtered batches
  const filteredBatches = useMemo(() => {
    return batchesWithProduct.filter(item => {
      if (item.quantity <= 0) return false;

      // Search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchesName = item.product.name.toLowerCase().includes(query);
        const matchesLot = item.lotNumber?.toLowerCase().includes(query);
        const matchesBarcode = item.product.barcode?.toLowerCase().includes(query);
        if (!matchesName && !matchesLot && !matchesBarcode) return false;
      }

      // Filter tab
      const d = item.daysRemaining;
      if (activeTab === 'expired') return d < 0;
      if (activeTab === 'today') return d === 0;
      if (activeTab === '3d') return d >= 1 && d <= 3;
      if (activeTab === '7d') return d >= 4 && d <= 7;
      if (activeTab === '30d') return d >= 8 && d <= 30;
      if (activeTab === 'safe') return d > 30;

      return true;
    });
  }, [batchesWithProduct, activeTab, searchTerm]);

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

  const tabsConfig: { id: ExpirationFilterTab; label: string; count: number; badgeColor: string }[] = [
    { id: 'all', label: 'Todos los lotes', count: counts.all, badgeColor: 'bg-[#F8F9F6] text-[#78847C]' },
    { id: 'expired', label: 'Vencidos', count: counts.expired, badgeColor: 'bg-[#FCEBE5] text-[#C6533A]' },
    { id: 'today', label: 'Vencen hoy', count: counts.today, badgeColor: 'bg-[#FFF3D9] text-[#A66B16]' },
    { id: '3d', label: 'Próx. 3 días', count: counts['3d'], badgeColor: 'bg-[#FFF3D9] text-[#A66B16]' },
    { id: '7d', label: 'Próx. 7 días', count: counts['7d'], badgeColor: 'bg-[#FFF3D9] text-[#A66B16]' },
    { id: '30d', label: 'Próx. 30 días', count: counts['30d'], badgeColor: 'bg-[#E8F3E9] text-[#246B4D]' },
    { id: 'safe', label: 'Sin vencimiento próximo', count: counts.safe, badgeColor: 'bg-[#E8F3E9] text-[#246B4D]' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Title */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#78847C]">
          SEGUIMIENTO CRONOLÓGICO
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#174A36] tracking-tight mt-1 flex items-center gap-2.5">
          <CalendarClock className="w-7 h-7 text-[#246B4D]" />
          <span>Control de Vencimientos</span>
        </h1>
        <p className="text-sm text-[#78847C] mt-0.5">
          Clasificación temporal para priorizar la rotación y reducir pérdidas
        </p>
      </div>

      {/* Segmented Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {tabsConfig.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                isActive 
                  ? 'bg-[#246B4D] text-white shadow-xs' 
                  : 'bg-white border border-[#E7EBE5] text-[#78847C] hover:text-[#174A36] hover:bg-[#F8F9F6]'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono tabular-nums ${
                isActive ? 'bg-white/20 text-white font-bold' : tab.badgeColor
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Filter */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#78847C] absolute left-3.5 top-3.5 pointer-events-none" />
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Buscar lote o producto en esta categoría..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E7EBE5] rounded-2xl text-xs sm:text-sm text-[#24372F] placeholder-[#78847C] focus:outline-none focus:border-[#246B4D] shadow-xs"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-3 text-xs text-[#78847C] hover:text-[#174A36]"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Batches List */}
      {filteredBatches.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-[#E7EBE5] space-y-2 shadow-xs">
          <CheckCircle2 className="w-10 h-10 text-[#246B4D] mx-auto opacity-70" />
          <h3 className="text-base font-bold text-[#174A36]">No hay lotes en esta categoría</h3>
          <p className="text-xs text-[#78847C]">
            {searchTerm ? 'No hay coincidencias con tu búsqueda.' : 'No tenés productos con este rango de caducidad.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBatches.map(item => {
            const days = item.daysRemaining;
            const isExpired = days < 0;
            const isUrgent = days >= 0 && days <= 2;
            const borderLeft = isExpired 
              ? 'border-l-4 border-l-[#78847C]' 
              : isUrgent 
              ? 'border-l-4 border-l-[#C6533A]' 
              : 'border-l-4 border-l-[#A66B16]';

            const statusInfo = getStatusLabel(item.status, item.daysRemaining);
            const matchingProduct = productsWithBatches.find(p => p.id === item.productId);

            return (
              <div
                key={item.id}
                className={`p-4 sm:p-5 rounded-2xl bg-white border border-[#E7EBE5] hover:border-[#246B4D]/30 transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${borderLeft}`}
              >
                {/* Product & Batch Info */}
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm sm:text-base font-bold text-[#174A36]">
                      {item.product.name}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusInfo.badgeClass}`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 text-xs text-[#78847C] flex-wrap">
                    <span className="text-[#246B4D] font-medium">{item.product.category}</span>
                    <span>·</span>
                    <span className="font-mono text-[#24372F]">
                      {item.lotNumber ? `Lote: ${item.lotNumber}` : 'Sin código de lote'}
                    </span>
                    <span>·</span>
                    <span className="font-mono font-bold text-[#174A36] tabular-nums">
                      {item.quantity} {item.product.unit}
                    </span>
                    {item.product.barcode && (
                      <>
                        <span>·</span>
                        <span className="font-mono flex items-center gap-1 text-[#78847C]">
                          <Barcode className="w-3 h-3" />
                          {item.product.barcode}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right side: Dates & Fast Stock Deduction */}
                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                  <div className="text-left sm:text-right">
                    <span className="text-[11px] text-[#78847C] block font-mono">
                      Vence: {item.expirationDate}
                    </span>
                    <span className="text-xs font-mono font-bold text-[#174A36] tabular-nums">
                      {item.daysRemaining < 0
                        ? `-${Math.abs(item.daysRemaining)} días`
                        : item.daysRemaining === 0
                        ? 'Hoy'
                        : `${item.daysRemaining} días`}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenAdjust(item, 'sell')}
                      className="px-2.5 py-1.5 rounded-xl bg-[#EAF3EC] hover:bg-[#246B4D] hover:text-white text-xs text-[#246B4D] font-semibold transition flex items-center gap-1"
                      title="Registrar venta de este lote"
                    >
                      <MinusCircle className="w-3.5 h-3.5" />
                      <span>Venta</span>
                    </button>

                    <button
                      onClick={() => handleOpenAdjust(item, 'waste')}
                      className="px-2.5 py-1.5 rounded-xl bg-[#FCEBE5] hover:bg-[#C6533A] hover:text-white text-xs text-[#C6533A] font-semibold transition flex items-center gap-1"
                      title="Registrar merma o retiro"
                    >
                      <AlertOctagon className="w-3.5 h-3.5" />
                      <span>Merma</span>
                    </button>

                    {matchingProduct && (
                      <button
                        onClick={() => onSelectProduct(matchingProduct)}
                        className="p-1.5 rounded-xl text-[#78847C] hover:text-[#174A36] hover:bg-[#F8F9F6] transition"
                        title="Ver ficha completa del producto"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Adjust Dialog */}
      {quickAdjustBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl bg-white border border-[#E7EBE5] p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#174A36]">
              {quickAdjustBatch.action === 'sell' ? 'Registrar Venta de Lote' : 'Registrar Merma'}
            </h3>
            <p className="text-xs text-[#78847C]">
              {quickAdjustBatch.batch.product.name} (Lote: {quickAdjustBatch.batch.lotNumber || 'S/N'}). Quedan {quickAdjustBatch.batch.quantity} {quickAdjustBatch.batch.product.unit}.
            </p>

            <div>
              <label htmlFor="exp-adjust-quantity" className="block text-xs font-semibold text-[#174A36] mb-1.5">
                Cantidad a descontar ({quickAdjustBatch.batch.product.unit}):
              </label>
              <input
                id="exp-adjust-quantity"
                type="number"
                step="any"
                min="1"
                max={quickAdjustBatch.batch.quantity}
                value={adjustAmount}
                onChange={e => setAdjustAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F8F9F6] border border-[#E7EBE5] rounded-2xl text-sm text-[#24372F] font-mono focus:outline-none focus:border-[#246B4D]"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setQuickAdjustBatch(null)}
                className="px-4 py-2 text-xs font-semibold text-[#78847C] hover:text-[#174A36] rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAdjust}
                className={`px-4 py-2 text-xs font-semibold text-white rounded-xl transition ${
                  quickAdjustBatch.action === 'sell' 
                    ? 'bg-[#246B4D] hover:bg-[#174A36]' 
                    : 'bg-[#C6533A] hover:bg-[#a93f28]'
                }`}
              >
                Confirmar Descuento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
