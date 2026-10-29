import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Plus, 
  Package, 
  Barcode, 
  Calendar, 
  Layers, 
  Trash2, 
  Edit3, 
  Eye, 
  LayoutGrid, 
  List, 
  PlusCircle, 
  Sparkles,
  Camera
} from 'lucide-react';
import { ProductWithBatches, ProductCategory, Product, Batch } from '../../types';
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
}) => {
  const { userProfile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('peps');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal states
  const [productToDelete, setProductToDelete] = useState<ProductWithBatches | null>(null);
  const [productForNewBatch, setProductForNewBatch] = useState<ProductWithBatches | null>(null);

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

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Title & Add Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#78847C]">
            CATÁLOGO GENERAL
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#174A36] tracking-tight mt-1">
            Inventario de Productos
          </h1>
          <p className="text-sm text-[#78847C] mt-0.5">
            Control de productos, lotes y fechas de caducidad
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenScan}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white hover:bg-[#F8F9F6] text-[#246B4D] border border-[#E7EBE5] text-xs font-semibold transition shadow-xs"
          >
            <Camera className="w-4 h-4" />
            <span>Escanear</span>
          </button>
          <button
            onClick={onOpenManualAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#246B4D] hover:bg-[#174A36] text-white text-xs font-semibold transition shadow-xs"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nuevo Producto</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-3xl bg-white border border-[#E7EBE5] space-y-3 shadow-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#78847C] absolute left-3.5 top-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, código de barras, lote..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#F8F9F6] border border-[#E7EBE5] rounded-2xl text-xs sm:text-sm text-[#24372F] placeholder-[#78847C] focus:outline-none focus:border-[#246B4D] focus:bg-white transition"
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

          {/* Category Dropdown */}
          <div className="relative shrink-0 min-w-[180px]">
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#F8F9F6] border border-[#E7EBE5] rounded-2xl text-xs font-medium text-[#24372F] focus:outline-none focus:border-[#246B4D] focus:bg-white transition"
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
          <div className="relative shrink-0 min-w-[170px]">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#F8F9F6] border border-[#E7EBE5] rounded-2xl text-xs font-medium text-[#24372F] focus:outline-none focus:border-[#246B4D] focus:bg-white transition"
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
          <div className="relative shrink-0 min-w-[180px]">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortOption)}
              className="w-full px-3.5 py-2.5 bg-[#F8F9F6] border border-[#E7EBE5] rounded-2xl text-xs font-medium text-[#24372F] focus:outline-none focus:border-[#246B4D] focus:bg-white transition"
            >
              <option value="peps">Próximo a vencer primero (PEPS)</option>
              <option value="name_asc">Nombre (A - Z)</option>
              <option value="name_desc">Nombre (Z - A)</option>
              <option value="stock_desc">Mayor stock disponible</option>
              <option value="stock_asc">Menor stock disponible</option>
            </select>
          </div>

          {/* View mode toggle (desktop) */}
          <div className="hidden sm:flex items-center gap-1 p-1 bg-[#F8F9F6] border border-[#E7EBE5] rounded-2xl shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-xl transition ${viewMode === 'grid' ? 'bg-white text-[#174A36] shadow-xs font-bold' : 'text-[#78847C] hover:text-[#174A36]'}`}
              title="Vista cuadrícula"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-xl transition ${viewMode === 'table' ? 'bg-white text-[#174A36] shadow-xs font-bold' : 'text-[#78847C] hover:text-[#174A36]'}`}
              title="Vista tabla"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Results count text */}
        <div className="flex items-center justify-between text-xs text-[#78847C] pt-1">
          <span>Mostrando <strong>{filteredProducts.length}</strong> de {productsWithBatches.length} productos</span>
          {(searchTerm || selectedCategory !== 'all' || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
                setStatusFilter('all');
              }}
              className="text-[#246B4D] hover:underline font-semibold"
            >
              Restablecer filtros
            </button>
          )}
        </div>
      </div>

      {/* Product Content: Grid or Table */}
      {filteredProducts.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-[#E7EBE5] space-y-3 shadow-xs">
          <Package className="w-12 h-12 text-[#78847C] mx-auto opacity-50" />
          <h3 className="text-base font-bold text-[#174A36]">
            {searchTerm || selectedCategory !== 'all' || statusFilter !== 'all'
              ? 'No se encontraron productos'
              : 'Todavía no tenés productos registrados'}
          </h3>
          <p className="text-xs text-[#78847C] max-w-sm mx-auto">
            {searchTerm || selectedCategory !== 'all' || statusFilter !== 'all'
              ? 'No hay productos que coincidan con los filtros seleccionados.'
              : 'Comenzá cargando tu inventario o activá el modo demostración para explorar.'}
          </p>
          <div className="pt-2 flex items-center justify-center gap-2.5 flex-wrap">
            <button
              onClick={onOpenManualAdd}
              className="px-4 py-2.5 bg-[#246B4D] hover:bg-[#174A36] text-white text-xs font-semibold rounded-2xl transition shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Agregar producto</span>
            </button>
            <button
              onClick={onOpenScan}
              className="px-4 py-2.5 bg-white hover:bg-[#F8F9F6] text-[#246B4D] border border-[#E7EBE5] text-xs font-semibold rounded-2xl transition shadow-xs flex items-center gap-1.5"
            >
              <Camera className="w-4 h-4" />
              <span>Escanear código</span>
            </button>
            {!isDemoMode && onOpenDemo && (
              <button
                onClick={onOpenDemo}
                className="px-4 py-2.5 bg-[#EAF3EC] hover:bg-[#D5E8D7] text-[#246B4D] border border-[#D5E8D7] text-xs font-semibold rounded-2xl transition shadow-xs flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4 text-[#246B4D]" />
                <span>Probar demo</span>
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProducts.map(product => {
            const hasBatches = product.batches.length > 0;
            const days = product.daysRemaining !== undefined ? product.daysRemaining : null;
            const statusInfo = product.status && days !== null ? getStatusLabel(product.status, days) : null;

            return (
              <div
                key={product.id}
                className="p-5 rounded-3xl bg-white border border-[#E7EBE5] hover:border-[#246B4D]/30 transition shadow-xs flex flex-col justify-between group space-y-4"
              >
                <div className="space-y-3">
                  {/* Category and Barcode bar */}
                  <div className="flex items-center justify-between text-xs text-[#78847C]">
                    <span className="text-[#246B4D] font-semibold">{product.category}</span>
                    {product.barcode && (
                      <span className="font-mono flex items-center gap-1 text-[#78847C]">
                        <Barcode className="w-3.5 h-3.5" />
                        {product.barcode}
                      </span>
                    )}
                  </div>

                  {/* Title & Quantity */}
                  <div 
                    onClick={() => onSelectProduct(product)}
                    className="cursor-pointer"
                  >
                    <h3 className="text-base font-bold text-[#174A36] group-hover:text-[#246B4D] transition line-clamp-2">
                      {product.name}
                    </h3>

                    <div className="mt-2 flex items-center gap-3 text-xs">
                      <div className="text-[#24372F]">
                        Stock: <span className="font-mono font-bold text-[#174A36] tabular-nums">{product.totalQuantity}</span> {product.unit}
                      </div>
                      <span className="text-[#E7EBE5]">·</span>
                      <div className="text-[#78847C] flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-[#246B4D]" />
                        <span>{product.batches.length} lote(s)</span>
                      </div>
                    </div>
                  </div>

                  {/* Earliest Expiration Box */}
                  <div className="p-3 rounded-2xl bg-[#F8F9F6] border border-[#E7EBE5]">
                    <div className="text-[11px] text-[#78847C] mb-1 flex items-center justify-between">
                      <span>Próximo Vencimiento (PEPS):</span>
                      {hasBatches && (
                        <span className="font-mono text-[#174A36] font-semibold">{product.earliestBatch?.expirationDate}</span>
                      )}
                    </div>
                    {hasBatches && statusInfo ? (
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.badgeClass}`}>
                        {statusInfo.label}
                      </span>
                    ) : (
                      <span className="text-xs text-[#78847C] italic">Sin lotes registrados</span>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="pt-3 border-t border-[#E7EBE5] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setProductForNewBatch(product)}
                      className="px-2.5 py-1.5 rounded-xl bg-[#EAF3EC] hover:bg-[#246B4D] hover:text-white text-xs font-semibold text-[#246B4D] transition flex items-center gap-1"
                      title="Agregar lote a este producto"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>+ Lote</span>
                    </button>
                    <button
                      onClick={() => onSelectProduct(product)}
                      className="px-2.5 py-1.5 rounded-xl bg-[#F8F9F6] hover:bg-[#E7EBE5] text-xs font-medium text-[#24372F] transition flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#78847C]" />
                      <span>Detalles</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditProduct(product)}
                      className="p-1.5 rounded-xl text-[#78847C] hover:text-[#174A36] hover:bg-[#F8F9F6] transition"
                      title="Editar producto"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setProductToDelete(product)}
                      className="p-1.5 rounded-xl text-[#78847C] hover:text-[#C6533A] hover:bg-[#FCEBE5] transition"
                      title="Eliminar producto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="rounded-3xl bg-white border border-[#E7EBE5] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8F9F6] text-xs font-semibold text-[#78847C] border-b border-[#E7EBE5]">
                <tr>
                  <th className="py-3.5 px-5">Producto</th>
                  <th className="py-3.5 px-4">Categoría</th>
                  <th className="py-3.5 px-4">Código</th>
                  <th className="py-3.5 px-4 text-right">Stock</th>
                  <th className="py-3.5 px-4">Próx. Vencimiento</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7EBE5] text-[#24372F]">
                {filteredProducts.map(p => {
                  const days = p.daysRemaining !== undefined ? p.daysRemaining : null;
                  const statusInfo = p.status && days !== null ? getStatusLabel(p.status, days) : null;

                  return (
                    <tr key={p.id} className="hover:bg-[#F8F9F6] transition">
                      <td className="py-3.5 px-5">
                        <button
                          onClick={() => onSelectProduct(p)}
                          className="font-bold text-[#174A36] hover:text-[#246B4D] text-left transition"
                        >
                          {p.name}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#78847C]">{p.category}</td>
                      <td className="py-3.5 px-4 text-xs font-mono text-[#78847C]">
                        {p.barcode || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-[#174A36] tabular-nums">
                        {p.totalQuantity} <span className="text-xs font-normal text-[#78847C] font-sans">{p.unit}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-[#24372F]">
                        {p.earliestBatch?.expirationDate || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        {statusInfo ? (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.badgeClass}`}>
                            {statusInfo.label}
                          </span>
                        ) : (
                          <span className="text-xs text-[#78847C]">Sin lotes</span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setProductForNewBatch(p)}
                            className="p-1.5 rounded-xl text-[#246B4D] hover:bg-[#EAF3EC] transition"
                            title="Agregar lote"
                          >
                            <PlusCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onSelectProduct(p)}
                            className="p-1.5 rounded-xl text-[#78847C] hover:text-[#174A36] hover:bg-[#F8F9F6] transition"
                            title="Ver detalles"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onEditProduct(p)}
                            className="p-1.5 rounded-xl text-[#78847C] hover:text-[#174A36] hover:bg-[#F8F9F6] transition"
                            title="Editar"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setProductToDelete(p)}
                            className="p-1.5 rounded-xl text-[#78847C] hover:text-[#C6533A] hover:bg-[#FCEBE5] transition"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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

      {/* Add Batch directly from card modal */}
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
