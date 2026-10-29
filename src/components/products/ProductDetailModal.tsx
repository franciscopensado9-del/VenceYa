import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Minus,
  Calendar, 
  Layers, 
  Trash2, 
  Edit3, 
  Barcode, 
  DollarSign, 
  MinusCircle, 
  CheckCircle2, 
  AlertOctagon, 
  ArrowUpRight 
} from 'lucide-react';
import { ProductWithBatches, Batch } from '../../types';
import { storageService, calculateDaysRemaining, getExpirationStatus, getStatusLabel } from '../../services/storage';
import { soundService } from '../../services/sound';
import { useAuth } from '../../contexts/AuthContext';
import { firestoreSyncService } from '../../services/firestoreSync';
import { BatchModal } from './BatchModal';
import { ConfirmModal } from '../common/ConfirmModal';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  productWithBatches: ProductWithBatches;
  onRefresh: () => void;
  onEditProduct: () => void;
  onDeleteProduct: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  isOpen,
  onClose,
  productWithBatches,
  onRefresh,
  onEditProduct,
  onDeleteProduct,
}) => {
  const { userProfile } = useAuth();
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchToEdit, setBatchToEdit] = useState<Batch | null>(null);

  // Confirmation dialogs
  const [batchToDelete, setBatchToDelete] = useState<Batch | null>(null);
  const [quickAdjustBatch, setQuickAdjustBatch] = useState<{ batch: Batch; action: 'sell' | 'waste'; qty: number } | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<string>('1');

  if (!isOpen) return null;

  const handleOpenAddBatch = () => {
    setBatchToEdit(null);
    setIsBatchModalOpen(true);
  };

  const handleOpenEditBatch = (batch: Batch) => {
    setBatchToEdit(batch);
    setIsBatchModalOpen(true);
  };

  const handleConfirmDeleteBatch = () => {
    if (!batchToDelete) return;
    storageService.deleteBatch(batchToDelete.id);
    if (userProfile?.storeId && !storageService.isDemoActive()) {
      firestoreSyncService.deleteBatch(userProfile.storeId, batchToDelete.id).catch(err => console.warn('Delete batch cloud err:', err));
    }
    setBatchToDelete(null);
    onRefresh();
  };

  const handleQuickStep = (batch: Batch, delta: number) => {
    storageService.updateBatchQuantity(batch.id, delta);
    if (userProfile?.storeId && !storageService.isDemoActive()) {
      firestoreSyncService.updateBatchQuantity(userProfile.storeId, batch.id, delta).catch(err => console.warn('Update qty cloud err:', err));
    }
    soundService.playScanSuccess();
    onRefresh();
  };

  const handleQuickAdjust = (batch: Batch, action: 'sell' | 'waste') => {
    setQuickAdjustBatch({ batch, action, qty: 1 });
    setAdjustAmount('1');
  };

  const handleConfirmAdjust = () => {
    if (!quickAdjustBatch) return;
    const amount = Number(adjustAmount);
    if (isNaN(amount) || amount <= 0) return;

    storageService.updateBatchQuantity(quickAdjustBatch.batch.id, -amount);
    if (userProfile?.storeId && !storageService.isDemoActive()) {
      firestoreSyncService.updateBatchQuantity(userProfile.storeId, quickAdjustBatch.batch.id, -amount).catch(err => console.warn('Adjust qty cloud err:', err));
    }
    soundService.playScanSuccess();
    setQuickAdjustBatch(null);
    onRefresh();
  };

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
        <div 
          className="w-full max-w-2xl max-h-[92vh] flex flex-col bg-white border border-[#E7EBE5] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="flex items-start justify-between p-5 sm:p-6 border-b border-[#E7EBE5] bg-white">
            <div className="flex-1 pr-4">
              <div className="flex items-center gap-2 text-xs text-[#246B4D] font-semibold mb-1">
                <span>{productWithBatches.category}</span>
                <span>·</span>
                <span>{productWithBatches.unit}</span>
                {productWithBatches.barcode && (
                  <>
                    <span>·</span>
                    <span className="font-mono text-[#78847C] flex items-center gap-1">
                      <Barcode className="w-3 h-3 text-[#246B4D]" />
                      {productWithBatches.barcode}
                    </span>
                  </>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#174A36] tracking-tight">
                {productWithBatches.name}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onEditProduct}
                className="p-2 rounded-xl text-[#78847C] hover:text-[#174A36] hover:bg-[#F8F9F6] transition"
                title="Editar datos del producto"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-[#78847C] hover:text-[#174A36] hover:bg-[#F8F9F6] transition"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Content */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {/* Quick KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-[#F8F9F6] border border-[#E7EBE5]">
                <span className="text-xs text-[#78847C] block mb-1">Stock Total</span>
                <span className="text-xl font-bold text-[#174A36] font-mono tabular-nums">
                  {productWithBatches.totalQuantity} <span className="text-xs font-normal text-[#78847C] font-sans">{productWithBatches.unit}</span>
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[#F8F9F6] border border-[#E7EBE5]">
                <span className="text-xs text-[#78847C] block mb-1">Lotes Activos</span>
                <span className="text-xl font-bold text-[#174A36] font-mono tabular-nums">
                  {productWithBatches.batches.length}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[#F8F9F6] border border-[#E7EBE5]">
                <span className="text-xs text-[#78847C] block mb-1">Precio Costo</span>
                <span className="text-base font-semibold text-[#24372F] font-mono tabular-nums">
                  {productWithBatches.costPrice ? `$${productWithBatches.costPrice.toLocaleString('es-AR')}` : '—'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[#F8F9F6] border border-[#E7EBE5]">
                <span className="text-xs text-[#78847C] block mb-1">Precio Venta</span>
                <span className="text-base font-semibold text-[#246B4D] font-mono tabular-nums">
                  {productWithBatches.salePrice ? `$${productWithBatches.salePrice.toLocaleString('es-AR')}` : '—'}
                </span>
              </div>
            </div>

            {productWithBatches.notes && (
              <div className="p-3.5 rounded-2xl bg-[#F8F9F6] border border-[#E7EBE5] text-xs text-[#78847C]">
                <span className="font-bold text-[#174A36]">Ubicación / Notas: </span>
                {productWithBatches.notes}
              </div>
            )}

            {/* Batches Section (PEPS) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#174A36] flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#246B4D]" />
                    <span>Lotes Registrados (Orden PEPS / FIFO)</span>
                  </h3>
                  <p className="text-xs text-[#78847C]">
                    Los lotes que vencen primero se priorizan al frente para evitar mermas.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddBatch}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-[#246B4D] hover:bg-[#174A36] text-white rounded-2xl text-xs font-semibold transition shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Nuevo Lote</span>
                </button>
              </div>

              {productWithBatches.batches.length === 0 ? (
                <div className="p-6 text-center rounded-2xl bg-[#F8F9F6] border border-[#E7EBE5]">
                  <p className="text-sm text-[#78847C]">No hay lotes activos para este producto.</p>
                  <button
                    onClick={handleOpenAddBatch}
                    className="mt-3 px-4 py-2 bg-white hover:bg-[#EAF3EC] text-[#246B4D] border border-[#E7EBE5] text-xs font-semibold rounded-xl transition"
                  >
                    Agregar primer lote
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {productWithBatches.batches.map((batch, idx) => {
                    const days = calculateDaysRemaining(batch.expirationDate);
                    const status = getExpirationStatus(days);
                    const statusInfo = getStatusLabel(status, days);
                    const isEarliest = idx === 0;

                    return (
                      <div
                        key={batch.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isEarliest 
                            ? 'bg-white border-[#246B4D]/30 shadow-xs ring-1 ring-[#246B4D]/20' 
                            : 'bg-white border-[#E7EBE5]'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          {/* Batch Details */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {isEarliest && (
                                <span className="px-2 py-0.5 rounded-lg bg-[#EAF3EC] text-[#246B4D] text-[10px] font-bold uppercase tracking-wider">
                                  Prioridad PEPS #1
                                </span>
                              )}
                              <span className="font-mono text-sm font-bold text-[#174A36]">
                                {batch.lotNumber ? `Lote: ${batch.lotNumber}` : `Lote #${idx + 1}`}
                              </span>
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusInfo.badgeClass}`}>
                                {statusInfo.label}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-[#78847C]">
                              <span className="flex items-center gap-1 font-mono">
                                <Calendar className="w-3.5 h-3.5 text-[#246B4D]" />
                                Vence: {batch.expirationDate}
                              </span>
                              <span>·</span>
                              <span className="font-semibold text-[#174A36] font-mono tabular-nums">
                                {batch.quantity} {productWithBatches.unit}
                              </span>
                              {batch.costPrice && (
                                <>
                                  <span>·</span>
                                  <span className="font-mono text-[#78847C]">
                                    Costo: ${batch.costPrice}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Batch Actions */}
                          <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
                            {/* Inline 1-tap Stepper */}
                            <div className="flex items-center gap-1 bg-[#F8F9F6] p-1 rounded-xl border border-[#E7EBE5]">
                              <button
                                type="button"
                                onClick={() => handleQuickStep(batch, -1)}
                                disabled={batch.quantity <= 0}
                                className="p-1 rounded-lg text-[#78847C] hover:text-[#174A36] hover:bg-white disabled:opacity-30 transition"
                                title="Restar 1 unidad"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="font-mono text-xs font-bold text-[#174A36] px-1.5 tabular-nums min-w-[28px] text-center">
                                {batch.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleQuickStep(batch, 1)}
                                className="p-1 rounded-lg text-[#78847C] hover:text-[#174A36] hover:bg-white transition"
                                title="Sumar 1 unidad"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <button
                              onClick={() => handleQuickAdjust(batch, 'sell')}
                              className="px-3 py-1.5 rounded-xl bg-[#F8F9F6] hover:bg-[#EAF3EC] border border-[#E7EBE5] text-xs font-semibold text-[#246B4D] transition flex items-center gap-1"
                              title="Registrar venta rápida de este lote"
                            >
                              <MinusCircle className="w-3.5 h-3.5 text-[#246B4D]" />
                              <span>Venta</span>
                            </button>
                            <button
                              onClick={() => handleQuickAdjust(batch, 'waste')}
                              className="px-3 py-1.5 rounded-xl bg-[#F8F9F6] hover:bg-[#FCEBE5] border border-[#E7EBE5] text-xs font-semibold text-[#C6533A] transition flex items-center gap-1"
                              title="Descontar como merma/desperdicio"
                            >
                              <AlertOctagon className="w-3.5 h-3.5 text-[#C6533A]" />
                              <span>Merma</span>
                            </button>
                            <button
                              onClick={() => handleOpenEditBatch(batch)}
                              className="p-1.5 rounded-xl text-[#78847C] hover:text-[#174A36] hover:bg-[#F8F9F6] transition"
                              title="Editar lote"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setBatchToDelete(batch)}
                              className="p-1.5 rounded-xl text-[#78847C] hover:text-[#C6533A] hover:bg-[#FCEBE5] transition"
                              title="Eliminar lote"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-5 border-t border-[#E7EBE5] bg-white flex items-center justify-between">
            <button
              onClick={onDeleteProduct}
              className="text-xs text-[#C6533A] hover:underline flex items-center gap-1.5 font-semibold"
            >
              <Trash2 className="w-4 h-4" />
              <span>Eliminar producto completo</span>
            </button>

            <button
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-semibold text-[#174A36] bg-[#F8F9F6] hover:bg-[#E7EBE5] rounded-2xl transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* Nested Add/Edit Batch Modal */}
      {isBatchModalOpen && (
        <BatchModal
          isOpen={isBatchModalOpen}
          onClose={() => setIsBatchModalOpen(false)}
          onSuccess={() => {
            setIsBatchModalOpen(false);
            onRefresh();
          }}
          product={productWithBatches}
          batchToEdit={batchToEdit}
        />
      )}

      {/* Delete Batch Confirm Modal */}
      <ConfirmModal
        isOpen={!!batchToDelete}
        title="Eliminar Lote"
        message={`¿Estás seguro de que querés eliminar el lote ${batchToDelete?.lotNumber || ''} con ${batchToDelete?.quantity} ${productWithBatches.unit}? Esta acción no se puede deshacer.`}
        confirmText="Eliminar Lote"
        isDestructive={true}
        onConfirm={handleConfirmDeleteBatch}
        onCancel={() => setBatchToDelete(null)}
      />

      {/* Quick Adjust Dialog */}
      {quickAdjustBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white border border-[#E7EBE5] p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#174A36]">
              {quickAdjustBatch.action === 'sell' ? 'Registrar Venta de Lote' : 'Registrar Merma'}
            </h3>
            <p className="text-xs text-[#78847C]">
              Lote vence el <strong className="text-[#174A36]">{quickAdjustBatch.batch.expirationDate}</strong>. Stock disponible: {quickAdjustBatch.batch.quantity} {productWithBatches.unit}.
            </p>

            <div>
              <label htmlFor="adjust-quantity" className="block text-xs font-semibold text-[#174A36] mb-1.5">
                Cantidad a descontar ({productWithBatches.unit}):
              </label>
              <input
                id="adjust-quantity"
                type="number"
                step="any"
                min="1"
                max={quickAdjustBatch.batch.quantity}
                value={adjustAmount}
                onChange={e => setAdjustAmount(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#F8F9F6] border border-[#E7EBE5] rounded-2xl text-sm text-[#174A36] font-mono focus:outline-none focus:border-[#246B4D] focus:bg-white"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setQuickAdjustBatch(null)}
                className="px-4 py-2 text-xs font-semibold text-[#78847C] bg-[#F8F9F6] rounded-xl hover:bg-[#E7EBE5] transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAdjust}
                className={`px-4 py-2 text-xs font-semibold text-white rounded-xl transition shadow-xs ${
                  quickAdjustBatch.action === 'sell' 
                    ? 'bg-[#246B4D] hover:bg-[#174A36]' 
                    : 'bg-[#C6533A] hover:bg-[#a6422b]'
                }`}
              >
                Confirmar Descuento
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
