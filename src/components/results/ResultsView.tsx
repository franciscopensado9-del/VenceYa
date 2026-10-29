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
    </div>
  );
};
