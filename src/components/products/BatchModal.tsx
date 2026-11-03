import React, { useState, useEffect } from 'react';
import { X, Calendar, Layers, Check, Plus, Minus } from 'lucide-react';
import { Product, Batch } from '../../types';
import { storageService, formatDate, calculateDaysRemaining, getExpirationStatus, getStatusLabel } from '../../services/storage';
import { soundService } from '../../services/sound';
import { useAuth } from '../../contexts/AuthContext';
import { firestoreSyncService } from '../../services/firestoreSync';

interface BatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (batch: Batch) => void;
  product: Product;
  batchToEdit?: Batch | null;
}

export const BatchModal: React.FC<BatchModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  product,
  batchToEdit,
}) => {
  const { userProfile } = useAuth();
  const [quantity, setQuantity] = useState<string>('1');
  const [expirationDate, setExpirationDate] = useState<string>('');
  const [costPrice, setCostPrice] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (batchToEdit) {
      setQuantity(String(batchToEdit.quantity));
      setExpirationDate(batchToEdit.expirationDate);
      setCostPrice(batchToEdit.costPrice !== undefined ? String(batchToEdit.costPrice) : '');
      setErrors({});
    } else {
      setQuantity('1');
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 7);
      setExpirationDate(formatDate(defaultDate));
      setCostPrice(product.costPrice !== undefined ? String(product.costPrice) : '');
      setErrors({});
    }
  }, [batchToEdit, product, isOpen]);

  const adjustQuantity = (delta: number) => {
    const current = Number(quantity) || 0;
    const next = Math.max(1, current + delta);
    setQuantity(String(next));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!expirationDate) {
      errs.expirationDate = 'La fecha de vencimiento es obligatoria.';
    }

    const qtyNum = Number(quantity);
    if (isNaN(qtyNum) || qtyNum < 1) {
      errs.quantity = 'La cantidad debe ser al menos 1 unidad.';
    }

    if (costPrice !== '' && (isNaN(Number(costPrice)) || Number(costPrice) < 0)) {
      errs.costPrice = 'El precio de costo debe ser válido.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const parsedCost = costPrice.trim() !== '' ? Number(costPrice) : undefined;

      // Auto-generar identificador de lote si es nuevo
      const todayCode = formatDate(new Date()).replace(/-/g, '').slice(2);
      const autoSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
      const autoLot = batchToEdit?.lotNumber || `L-${todayCode}-${autoSuffix}`;

      const saved = storageService.saveBatch({
        productId: product.id,
        lotNumber: autoLot,
        quantity: Math.max(1, Number(quantity) || 1),
        expirationDate,
        costPrice: parsedCost,
      }, batchToEdit?.id);

      if (userProfile?.storeId && !storageService.isDemoActive()) {
        firestoreSyncService.saveBatch(userProfile.storeId, {
          productId: product.id,
          lotNumber: autoLot,
          quantity: Math.max(1, Number(quantity) || 1),
          expirationDate,
          costPrice: parsedCost,
        }, saved.id).catch(err => console.warn('Batch cloud sync err:', err));
      }

      soundService.playSuccessChime();
      onSuccess(saved);
      onClose();
    } catch {
      setErrors({ form: 'Error al guardar el lote. Intentá nuevamente.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const daysPreview = expirationDate ? calculateDaysRemaining(expirationDate) : null;
  const statusPreview = daysPreview !== null ? getStatusLabel(getExpirationStatus(daysPreview), daysPreview) : null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/45 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full h-full sm:h-auto sm:max-w-md sm:max-h-[92vh] bg-white border-0 sm:border border-[#E7EBE5] rounded-none sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#E7EBE5] bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EAF3EC] text-[#246B4D] flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#174A36]">
                {batchToEdit ? 'Editar Lote' : 'Agregar Nuevo Lote'}
              </h2>
              <p className="text-xs text-[#78847C] truncate max-w-[200px] sm:max-w-[240px]">
                {product.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-xl text-[#78847C] hover:text-[#174A36] hover:bg-[#F8F9F6] transition min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {errors.form && (
            <div className="p-3.5 rounded-2xl bg-[#FCEBE5] border border-[#F5C2B6] text-[#C6533A] text-xs font-semibold">
              {errors.form}
            </div>
          )}

          {/* Expiration Date */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="batch-expiration-date" className="text-xs font-semibold text-[#174A36] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#246B4D]" />
                <span>Fecha de Vencimiento <span className="text-[#C6533A]">*</span></span>
              </label>
              {statusPreview && (
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${statusPreview.badgeClass}`}>
                  {statusPreview.label}
                </span>
              )}
            </div>

            <input
              id="batch-expiration-date"
              type="date"
              value={expirationDate}
              onChange={e => setExpirationDate(e.target.value)}
              required
              className={`w-full min-h-[44px] px-4 py-2.5 bg-[#F8F9F6] border rounded-2xl text-sm text-[#24372F] focus:outline-none focus:bg-white font-mono transition ${
                errors.expirationDate ? 'border-[#C6533A]' : 'border-[#E7EBE5] focus:border-[#246B4D]'
              }`}
            />
            {errors.expirationDate && (
              <p className="text-[#C6533A] text-xs mt-1 font-medium">{errors.expirationDate}</p>
            )}
          </div>

          {/* Quantity with Steppers */}
          <div className="space-y-1.5">
            <label htmlFor="batch-qty" className="block text-xs font-semibold text-[#174A36]">
              Cantidad ({product.unit || 'unidades'}) <span className="text-[#C6533A]">*</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => adjustQuantity(-1)}
                className="w-12 h-12 rounded-2xl bg-[#F8F9F6] hover:bg-[#E7EBE5] text-[#174A36] border border-[#E7EBE5] flex items-center justify-center transition active:scale-95 shrink-0"
                title="Restar 1"
                aria-label="Restar 1"
              >
                <Minus className="w-5 h-5 stroke-[2.5]" />
              </button>

              <input
                id="batch-qty"
                type="number"
                inputMode="numeric"
                step="1"
                min="1"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="1"
                required
                className={`flex-1 h-12 px-4 bg-[#F8F9F6] border rounded-2xl text-base text-center text-[#174A36] font-mono font-bold focus:outline-none focus:bg-white transition ${
                  errors.quantity ? 'border-[#C6533A]' : 'border-[#E7EBE5] focus:border-[#246B4D]'
                }`}
              />

              <button
                type="button"
                onClick={() => adjustQuantity(1)}
                className="w-12 h-12 rounded-2xl bg-[#F8F9F6] hover:bg-[#E7EBE5] text-[#174A36] border border-[#E7EBE5] flex items-center justify-center transition active:scale-95 shrink-0"
                title="Sumar 1"
                aria-label="Sumar 1"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>
            {errors.quantity && (
              <p className="text-[#C6533A] text-xs mt-1 font-medium">{errors.quantity}</p>
            )}
          </div>

          {/* Cost Price (optional) */}
          <div>
            <label htmlFor="batch-cost" className="block text-xs font-semibold text-[#174A36] mb-1.5">
              Costo unitario de este lote ($ ARS, opcional)
            </label>
            <input
              id="batch-cost"
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              value={costPrice}
              onChange={e => setCostPrice(e.target.value)}
              placeholder={product.costPrice ? String(product.costPrice) : '0.00'}
              className="w-full min-h-[44px] px-4 py-2.5 bg-[#F8F9F6] border border-[#E7EBE5] rounded-2xl text-sm text-[#24372F] placeholder-[#78847C]/60 focus:outline-none focus:border-[#246B4D] focus:bg-white font-mono"
            />
          </div>

          <div className="pt-4 flex flex-col-reverse sm:flex-row items-center sm:justify-end gap-2.5 pb-[max(env(safe-area-inset-bottom),8px)] sm:pb-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-3 text-xs font-semibold text-[#78847C] bg-[#F8F9F6] hover:bg-[#E7EBE5] rounded-2xl transition min-h-[44px] flex items-center justify-center"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-3 text-xs font-semibold text-white bg-[#246B4D] hover:bg-[#174A36] disabled:opacity-50 rounded-2xl transition flex items-center justify-center gap-2 active:scale-95 shadow-xs min-h-[44px]"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{batchToEdit ? 'Guardar Lote' : 'Agregar Lote'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
