import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Package, 
  Camera,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles,
  MoreVertical,
  PlusCircle,
  Edit3,
  Trash2
} from 'lucide-react';
import { ProductWithBatches, Product, Batch } from '../../types';
import { getStatusLabel, storageService } from '../../services/storage';
import { firestoreSyncService } from '../../services/firestoreSync';
import { useAuth } from '../../contexts/AuthContext';
import { ConfirmModal } from '../common/ConfirmModal';
import { BatchModal } from './BatchModal';

interface ProductsViewProps {
  productsWithBatches: ProductWithBatches[];
  onRefresh: () => void;
  onOpenManualAdd: () => void;
  onOpenScan: () => void;
  onSelectProduct: (product: ProductWithBatches) => void;
  onEditProduct: (product: Product) => void;
  isDemoMode?: boolean;
  onOpenDemo?: () => void;
  onOpenPromotion?: (product: ProductWithBatches, batch?: Batch) => void;
  onOpenExcelImport?: () => void;
}

type SortOption = 'peps' | 'name_asc' | 'name_desc' | 'stock_desc' | 'stock_asc';

export const ProductsView: React.FC<ProductsViewProps> = ({
  productsWithBatches,
  onRefresh,
  onOpenManualAdd,
  onOpenScan,
  onSelectProduct,
  onEditProduct,
  isDemoMode = false,
  onOpenDemo,
  onOpenExcelImport,
}) => {
  const { userProfile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('peps');
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [productToDelete, setProductToDelete] = useState<ProductWithBatches | null>(null);
  const [productForNewBatch, setProductForNewBatch] = useState<ProductWithBatches | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Active filter count
  const activeFilterCount = (selectedCategory !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0) + (sortBy !== 'peps' ? 1 : 0);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    return productsWithBatches.filter(item => {
      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesBarcode = item.barcode?.toLowerCase().includes(query);
        const matchesCategory = item.category.toLowerCase().includes(query);
        const matchesLot = item.batches.some(b => b.lotNumber?.toLowerCase().includes(query));
        if (!matchesName && !matchesBarcode && !matchesCategory && !matchesLot) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'expired' && item.status !== 'expired') return false;
        if (statusFilter === 'urgent' && item.status !== 'today' && item.status !== 'warning_3d') return false;
        if (statusFilter === 'warning' && item.status !== 'warning_7d' && item.status !== 'warning_30d') return false;
        if (statusFilter === 'good' && item.status !== 'good') return false;
        if (statusFilter === 'no_batches' && item.batches.length > 0) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'peps') {
        if (!a.earliestBatch && !b.earliestBatch) return 0;
        if (!a.earliestBatch) return 1;
        if (!b.earliestBatch) return -1;
        return a.earliestBatch.expirationDate.localeCompare(b.earliestBatch.expirationDate);
      }
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
      if (sortBy === 'stock_desc') return b.totalQuantity - a.totalQuantity;
      if (sortBy === 'stock_asc') return a.totalQuantity - b.totalQuantity;
      return 0;
    });
  }, [productsWithBatches, searchTerm, selectedCategory, statusFilter, sortBy]);

  const categories = useMemo(() => {
    const set = new Set(productsWithBatches.map(p => p.category));
    return Array.from(set).sort();
  }, [productsWithBatches]);

  const handleConfirmDelete = () => {
    if (!productToDelete) return;
    const prodId = productToDelete.id;
    storageService.deleteProduct(prodId);
    if (userProfile?.storeId && !storageService.isDemoActive()) {
      firestoreSyncService.deleteProduct(userProfile.storeId, prodId)
        .catch(err => console.warn('Product cloud delete err:', err));
    }
    setProductToDelete(null);
    onRefresh();
  };

  const clearAllFilters = () => {
    setSelectedCategory('all');
    setStatusFilter('all');
    setSortBy('peps');
    setSearchTerm('');
  };

  // Helper to format short date
  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const m = months[parseInt(parts[1], 10) - 1] || parts[1];
    return `${parseInt(parts[2], 10)} ${m} ${parts[0]}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#174A36] tracking-tight">
            Productos
          </h1>
          <p className="text-xs sm:text-sm text-[#78847C] mt-0.5">
            {productsWithBatches.length} {productsWithBatches.length === 1 ? 'artículo registrado' : 'artículos registrados'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
          {onOpenExcelImport && (
            <button
              type="button"
              onClick={onOpenExcelImport}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[44px] rounded-2xl bg-white hover:bg-[#F8F9F6] text-[#246B4D] border border-[#E7EBE5] text-xs font-semibold transition active:scale-95 shadow-2xs whitespace-nowrap"
              title="Importar productos y lotes desde Excel o CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#246B4D]" />
              <span>Importar Excel</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenScan}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[44px] rounded-2xl bg-white hover:bg-[#F8F9F6] text-[#246B4D] border border-[#E7EBE5] text-xs font-semibold transition active:scale-95 shadow-2xs whitespace-nowrap"
          >
            <Camera className="w-4 h-4" />
            <span>Escanear</span>
          </button>

          <button
            type="button"
            onClick={onOpenManualAdd}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-2xl bg-[#246B4D] hover:bg-[#174A36] text-white text-xs font-bold transition shadow-xs active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nuevo Producto</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-3.5 sm:p-4 rounded-3xl bg-white border border-[#E7EBE5] space-y-3 shadow-xs">
        <div className="flex items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#78847C] absolute left-3.5 top-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar producto o código..."
              className="w-full pl-10 pr-9 py-2.5 bg-[#F8F9F6] border border-[#E7EBE5] rounded-2xl text-xs sm:text-sm text-[#24372F] placeholder-[#78847C] focus:outline-none focus:border-[#246B4D] focus:bg-white transition"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-[#78847C] hover:text-[#174A36] p-1"
                aria-label="Limpiar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Toggle Secondary Filters Button */}
          <button
            type="button"
            onClick={() => setShowFilters(prev => !prev)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 min-h-[44px] rounded-2xl border text-xs font-semibold transition shrink-0 ${
              showFilters || activeFilterCount > 0
                ? 'bg-[#EAF3EC] text-[#174A36] border-[#D5E8D7]'
                : 'bg-white text-[#78847C] hover:text-[#174A36] border-[#E7EBE5]'
            }`}
          >
            <Filter className="w-4 h-4 text-[#246B4D]" />
            <span className="hidden sm:inline">Filtros</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#246B4D] text-white text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
            {showFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Collapsible Secondary Filters */}
        {showFilters && (
          <div className="pt-3 border-t border-[#E7EBE5] grid grid-cols-1 sm:grid-cols-3 gap-2.5 animate-in fade-in duration-150">
            {/* Category Dropdown */}
            <div>
              <label className="block text-[11px] font-semibold text-[#78847C] mb-1">
                Categoría
              </label>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8F9F6] border border-[#E7EBE5] rounded-xl text-xs font-medium text-[#24372F] focus:outline-none focus:border-[#246B4D]"
              >
                <option value="all">Todas las categorías</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Dropdown */}
            <div>
              <label className="block text-[11px] font-semibold text-[#78847C] mb-1">
                Estado
              </label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8F9F6] border border-[#E7EBE5] rounded-xl text-xs font-medium text-[#24372F] focus:outline-none focus:border-[#246B4D]"
              >
                <option value="all">Todos los estados</option>
                <option value="urgent">Urgentes (0 a 3 días)</option>
                <option value="expired">Vencidos</option>
                <option value="warning">Próximos (4 a 30 días)</option>
                <option value="good">En fecha (&gt;30 días)</option>
                <option value="no_batches">Sin lotes activos</option>
              </select>
            </div>

            {/* Sort Dropdown */}
            <div>
              <label className="block text-[11px] font-semibold text-[#78847C] mb-1">
                Ordenar por
              </label>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortOption)}
                className="w-full px-3 py-2 bg-[#F8F9F6] border border-[#E7EBE5] rounded-xl text-xs font-medium text-[#24372F] focus:outline-none focus:border-[#246B4D]"
              >
                <option value="peps">Próximo a vencer primero</option>
                <option value="name_asc">Nombre (A - Z)</option>
                <option value="name_desc">Nombre (Z - A)</option>
                <option value="stock_desc">Mayor stock</option>
                <option value="stock_asc">Menor stock</option>
              </select>
            </div>

            {activeFilterCount > 0 && (
              <div className="sm:col-span-3 pt-1 text-right">
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-xs text-[#78847C] hover:text-[#C6533A] font-semibold"
                >
                  Restablecer filtros
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Product Content: Clean, lightweight list */}
      {filteredProducts.length === 0 ? (
        <div className="p-10 text-center rounded-3xl bg-white border border-[#E7EBE5] space-y-3 shadow-xs">
          <Package className="w-12 h-12 text-[#78847C] mx-auto opacity-40" />
          <h3 className="text-base font-bold text-[#174A36]">
            {searchTerm || selectedCategory !== 'all' || statusFilter !== 'all'
              ? 'No se encontraron productos'
              : 'Todavía no tenés productos registrados'}
          </h3>
          <p className="text-xs text-[#78847C] max-w-sm mx-auto">
            {searchTerm || selectedCategory !== 'all' || statusFilter !== 'all'
              ? 'Probá ajustando la búsqueda o los filtros.'
              : 'Comenzá cargando tu inventario o importá desde Excel.'}
          </p>

          <div className="pt-2 flex items-center justify-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={onOpenManualAdd}
              className="px-5 py-2.5 min-h-[44px] bg-[#246B4D] hover:bg-[#174A36] text-white text-xs font-bold rounded-2xl transition shadow-xs flex items-center gap-2 active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Agregar producto</span>
            </button>

            {onOpenExcelImport && (
              <button
                type="button"
                onClick={onOpenExcelImport}
                className="px-4 py-2.5 min-h-[44px] bg-white hover:bg-[#F8F9F6] text-[#246B4D] border border-[#E7EBE5] text-xs font-semibold rounded-2xl transition shadow-2xs flex items-center gap-2 active:scale-95"
              >
                <FileSpreadsheet className="w-4 h-4 text-[#246B4D]" />
                <span>Importar desde Excel</span>
              </button>
            )}

            {!isDemoMode && onOpenDemo && !searchTerm && (
              <button
                type="button"
                onClick={onOpenDemo}
                className="px-4 py-2.5 min-h-[44px] bg-[#EAF3EC] hover:bg-[#D5E8D7] text-[#246B4D] text-xs font-semibold rounded-2xl transition flex items-center gap-1.5 active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-[#246B4D]" />
                <span>Probar demo</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Clean list: Each item strictly shows: Nombre, Cantidad, Próximo vencimiento, Estado visual */
        <div className="space-y-2.5">
          {filteredProducts.map(product => {
            const hasBatches = product.batches.length > 0;
            const days = product.daysRemaining !== undefined ? product.daysRemaining : null;
            const statusInfo = product.status && days !== null ? getStatusLabel(product.status, days) : null;
            const earliestDate = product.earliestBatch?.expirationDate;
            const isMenuOpen = activeMenuId === product.id;

            return (
              <div
                key={product.id}
                onClick={() => onSelectProduct(product)}
                className="p-4 sm:p-4.5 rounded-2xl sm:rounded-3xl bg-white border border-[#E7EBE5] hover:border-[#246B4D]/40 transition shadow-xs cursor-pointer flex items-center justify-between gap-3 group relative select-none"
                role="button"
                tabIndex={0}
              >
                {/* 1. Nombre del producto & Categoría */}
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm sm:text-base font-bold text-[#174A36] group-hover:text-[#246B4D] transition truncate">
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-[#78847C] mt-0.5">
                    <span className="truncate">{product.category}</span>
                    {product.barcode && (
                      <>
                        <span className="text-[#E7EBE5]">·</span>
                        <span className="font-mono text-[11px] truncate">{product.barcode}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* 2. Cantidad disponible */}
                <div className="text-right shrink-0 min-w-[70px] sm:min-w-[90px]">
                  <div className="text-sm sm:text-base font-bold font-mono text-[#174A36] tabular-nums">
                    {product.totalQuantity}
                  </div>
                  <div className="text-[11px] text-[#78847C]">
                    {product.unit}
                  </div>
                </div>

                {/* 3. Próximo vencimiento */}
                <div className="text-right shrink-0 min-w-[90px] sm:min-w-[120px] hidden xs:block">
                  <div className="text-xs sm:text-sm font-semibold text-[#24372F]">
                    {hasBatches && earliestDate ? formatShortDate(earliestDate) : 'Sin lotes'}
                  </div>
                  <div className="text-[11px] text-[#78847C]">
                    {hasBatches ? 'Próximo vto' : 'Sin fecha'}
                  </div>
                </div>

                {/* 4. Estado visual */}
                <div className="shrink-0 flex items-center gap-2">
                  {hasBatches && statusInfo ? (
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${statusInfo.badgeClass}`}>
                      {statusInfo.label}
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#F8F9F6] text-[#78847C]">
                      Sin lotes
                    </span>
                  )}

                  {/* Secondary 3-dots Menu for quick actions */}
                  <div className="relative" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setActiveMenuId(isMenuOpen ? null : product.id)}
                      className="p-2 rounded-xl text-[#78847C] hover:text-[#174A36] hover:bg-[#F8F9F6] transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                      aria-label="Más acciones"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {isMenuOpen && (
                      <div className="absolute right-0 top-11 z-20 w-44 bg-white rounded-2xl shadow-xl border border-[#E7EBE5] py-1.5 space-y-0.5 animate-in fade-in duration-100">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuId(null);
                            setProductForNewBatch(product);
                          }}
                          className="w-full px-3.5 py-2 text-left text-xs font-semibold text-[#246B4D] hover:bg-[#EAF3EC] flex items-center gap-2"
                        >
                          <PlusCircle className="w-4 h-4" />
                          <span>Agregar lote</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuId(null);
                            onEditProduct(product);
                          }}
                          className="w-full px-3.5 py-2 text-left text-xs font-semibold text-[#24372F] hover:bg-[#F8F9F6] flex items-center gap-2"
                        >
                          <Edit3 className="w-4 h-4 text-[#78847C]" />
                          <span>Editar producto</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuId(null);
                            setProductToDelete(product);
                          }}
                          className="w-full px-3.5 py-2 text-left text-xs font-semibold text-[#C6533A] hover:bg-[#FCEBE5] flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Eliminar producto</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!productToDelete}
        title="Eliminar Producto"
        message={`¿Estás seguro de que querés eliminar "${productToDelete?.name}"? Esta acción borrará también todos sus ${productToDelete?.batches.length || 0} lotes asociados.`}
        confirmText="Eliminar Producto"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setProductToDelete(null)}
      />

      {/* Add Batch directly from row modal */}
      {productForNewBatch && (
        <BatchModal
          isOpen={!!productForNewBatch}
          onClose={() => setProductForNewBatch(null)}
          onSuccess={() => {
            setProductForNewBatch(null);
            onRefresh();
          }}
          product={productForNewBatch}
        />
      )}
    </div>
  );
};
