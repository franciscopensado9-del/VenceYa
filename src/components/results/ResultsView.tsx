import React from 'react';
import { 
  TrendingUp, 
  ShieldCheck, 
  DollarSign, 
  CheckCircle2, 
  BarChart3, 
  Layers, 
  ArrowUpRight, 
  Sprout,
  Store,
  Sparkles
} from 'lucide-react';
import { ProductWithBatches, BatchWithProduct, StoreSettings } from '../../types';
import { storageService } from '../../services/storage';

interface ResultsViewProps {
  productsWithBatches: ProductWithBatches[];
  batchesWithProduct: BatchWithProduct[];
  settings: StoreSettings;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  productsWithBatches,
  batchesWithProduct,
  settings,
}) => {
  const stockMovements = storageService.getStockMovements();
  // Real calculations
  const totalStockUnits = productsWithBatches.reduce((acc, p) => acc + p.totalQuantity, 0);
  const activeBatches = batchesWithProduct.filter(b => b.quantity > 0);
  const expiredBatches = batchesWithProduct.filter(b => b.quantity > 0 && b.daysRemaining < 0);
  const inDateBatches = batchesWithProduct.filter(b => b.quantity > 0 && b.daysRemaining >= 0);

  // Total inventory estimated retail value
  const totalInventoryValue = activeBatches.reduce((acc, b) => {
    return acc + (b.quantity * (b.product.salePrice || 0));
  }, 0);

  // Capital salvaged from early detection (estimate based on batches nearing expiration that were kept in rotation)
  const capitalAtRisk = activeBatches
    .filter(b => b.daysRemaining >= 0 && b.daysRemaining <= 7)
    .reduce((acc, b) => acc + (b.quantity * (b.product.salePrice || 0)), 0);

  const potentialRecovered = Math.round(capitalAtRisk * 0.85);

  // Effectiveness rate
  const healthRate = activeBatches.length > 0 
    ? Math.round((inDateBatches.length / activeBatches.length) * 100) 
    : 100;

  // Breakdown by category
  const categoriesCount = React.useMemo(() => {
    const map = new Map<string, { totalBatches: number; totalUnits: number }>();
    for (const b of activeBatches) {
      const cat = b.product.category;
      const current = map.get(cat) || { totalBatches: 0, totalUnits: 0 };
      map.set(cat, {
        totalBatches: current.totalBatches + 1,
        totalUnits: current.totalUnits + b.quantity,
      });
    }
    return Array.from(map.entries()).sort((a, b) => b[1].totalUnits - a[1].totalUnits);
  }, [activeBatches]);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Title */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#78847C]">
          MÉTRICAS Y CONTROL DE MERMAS
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#174A36] tracking-tight mt-1 flex items-center gap-2.5">
          <TrendingUp className="w-7 h-7 text-[#246B4D]" />
          <span>Resultados del Comercio</span>
        </h1>
        <p className="text-sm text-[#78847C] mt-0.5">
          Evolución del inventario, capital protegido y salud de las fechas de vencimiento
        </p>
      </div>

      {/* 3 KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E7EBE5] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#174A36]">Salud del Inventario</span>
            <div className="w-9 h-9 rounded-2xl bg-[#E8F3E9] text-[#246B4D] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl sm:text-4xl font-bold text-[#174A36] font-mono tabular-nums">
              {healthRate}%
            </div>
            <div className="text-xs text-[#78847C] mt-1">
              Lotes activos dentro del plazo de vigencia
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E7EBE5] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#174A36]">Capital Protegido con PEPS</span>
            <div className="w-9 h-9 rounded-2xl bg-[#EAF3EC] text-[#246B4D] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl sm:text-4xl font-bold text-[#246B4D] font-mono tabular-nums">
              ${potentialRecovered.toLocaleString('es-AR')}
            </div>
            <div className="text-xs text-[#78847C] mt-1">
              Recupero proyectado con liquidación preventiva
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E7EBE5] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#174A36]">Valor Total de Mercadería</span>
            <div className="w-9 h-9 rounded-2xl bg-[#F8F9F6] border border-[#E7EBE5] text-[#174A36] flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-[#246B4D]" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl sm:text-4xl font-bold text-[#174A36] font-mono tabular-nums">
              ${totalInventoryValue.toLocaleString('es-AR')}
            </div>
            <div className="text-xs text-[#78847C] mt-1 font-mono">
              {totalStockUnits} unidades en {activeBatches.length} lotes
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown by Category */}
      <div className="p-6 rounded-3xl bg-white border border-[#E7EBE5] shadow-xs space-y-5">
        <div>
          <h2 className="text-base font-bold text-[#174A36] flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#246B4D]" />
            <span>Distribución de Lotes por Rubro</span>
          </h2>
          <p className="text-xs text-[#78847C] mt-0.5">
            Volumen de mercadería bajo seguimiento en góndolas y depósito
          </p>
        </div>

        <div className="space-y-3">
          {categoriesCount.map(([category, data]) => {
            const pct = totalStockUnits > 0 ? Math.round((data.totalUnits / totalStockUnits) * 100) : 0;
            return (
              <div key={category} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-[#174A36]">{category}</span>
                  <span className="font-mono text-[#78847C]">{data.totalUnits} u. ({data.totalBatches} lotes) · {pct}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[#F8F9F6] border border-[#E7EBE5] overflow-hidden">
                  <div 
                    className="h-full bg-[#246B4D] rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(5, pct))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Historial Centralizado de Movimientos de Stock */}
      <div className="p-6 rounded-3xl bg-white border border-[#E7EBE5] shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[#174A36] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#246B4D]" />
              <span>Historial de Movimientos de Stock</span>
            </h2>
            <p className="text-xs text-[#78847C] mt-0.5">
              Registro inmutable de ventas anticipadas, descartes y mermas
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-3 py-1 rounded-full bg-[#EAF5ED] text-[#246B4D] font-bold">
              {stockMovements.filter(m => m.type === 'sale').reduce((acc, m) => acc + m.quantity, 0)} vendidas
            </span>
            <span className="px-3 py-1 rounded-full bg-[#FDF0EB] text-[#D95D39] font-bold">
              {stockMovements.filter(m => m.type === 'discard').reduce((acc, m) => acc + m.quantity, 0)} mermas
            </span>
          </div>
        </div>

        {stockMovements.length > 0 ? (
          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {stockMovements.map((mov) => {
              const isSale = mov.type === 'sale';
              const isDiscard = mov.type === 'discard';

              return (
                <div
                  key={mov.id}
                  className="p-3.5 rounded-2xl bg-[#FBFDFB] border border-[#EAEBE8] hover:border-[#DCE0D9] transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className={`px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0 mt-0.5 ${
                      isSale 
                        ? 'bg-[#EAF5ED] text-[#246B4F] border border-[#C5E1CF]' 
                        : isDiscard 
                        ? 'bg-[#FDF0EB] text-[#D95D39] border border-[#FADBD0]' 
                        : 'bg-[#F4F6F3] text-[#5C6861] border border-[#EAEBE8]'
                    }`}>
                      {isSale ? 'Venta' : isDiscard ? 'Merma / Descarte' : 'Ajuste'}
                    </span>

                    <div className="min-w-0 space-y-0.5">
                      <div className="text-xs sm:text-sm font-bold text-[#173F35] truncate">
                        {mov.productName}
                      </div>
                      <div className="text-[11px] text-[#7A8580] flex items-center gap-2 flex-wrap">
                        {mov.batchExpirationDate && (
                          <span>Vence: {mov.batchExpirationDate}</span>
                        )}
                        {mov.reason && (
                          <>
                            <span className="text-[#DCE0D9]">·</span>
                            <span>{mov.reason}</span>
                          </>
                        )}
                        <span className="text-[#DCE0D9]">·</span>
                        <span>{new Date(mov.createdAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-black font-mono text-[#173F35]">
                      {isSale ? '-' : isDiscard ? '-' : ''}{mov.quantity} {mov.unit || 'u.'}
                    </div>
                    {mov.newQuantity !== undefined && (
                      <div className="text-[10px] text-[#7A8580]">
                        Quedan: {mov.newQuantity} u.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center rounded-2xl bg-[#F9FAF8] border border-dashed border-[#DCE0D9] space-y-1">
            <p className="text-xs font-semibold text-[#5C6861]">
              Aún no hay movimientos de inventario registrados
            </p>
            <p className="text-[11px] text-[#7A8580]">
              Cuando marques una recomendación como «Listo» o registres ventas/descartes, aparecerán aquí.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
