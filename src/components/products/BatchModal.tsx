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
  const [lotNumber, setLotNumber] = useState<string>('');
  const [expirationDate, setExpirationDate] = useState<string>('');
  const [costPrice, setCostPrice] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (batchToEdit) {
      setQuantity(String(batchToEdit.quantity));
      setLotNumber(batchToEdit.lotNumber || '');
      setExpirationDate(batchToEdit.expirationDate);
      setCostPrice(batchToEdit.costPrice !== undefined ? String(batchToEdit.costPrice) : '');
      setErrors({});
    } else {
      setQuantity('1');
      setLotNumber('');
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 7);
      setExpirationDate(formatDate(defaultDate));
      setCostPrice(product.costPrice !== undefined ? String(product.costPrice) : '');
      setErrors({});
    }
  }, [batchToEdit, product, isOpen]);

  const applyDatePreset = (daysOffset: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysOffset);
    setExpirationDate(formatDate(target));
  };

  const adjustQuantity = (delta: number) => {
    const current = Number(quantity) || 0;
    const next = Math.max(0, current + delta);
    setQuantity(String(next));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!expirationDate) {
      errs.expirationDate = 'La fecha de vencimiento es obligatoria.';
    }

    const qtyNum = Number(quantity);
    if (isNaN(qtyNum) || qtyNum < 0) {
      errs.quantity = 'La cantidad debe ser mayor o igual a 0.';
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
      const parsedCost = costPrice !== '' ? Number(costPrice) : undefined;
      const saved = storageService.saveBatch({
        productId: product.id,
        lotNumber: lotNumber.trim() || undefined,
        quantity: Number(quantity),
        expirationDate,
        costPrice: parsedCost,
      }, batchToEdit?.id);

      if (userProfile?.storeId && !storageService.isDemoActive()) {
        firestoreSyncService.saveBatch(userProfile.storeId, {
          productId: product.id,
          lotNumber: lotNumber.trim() || undefined,
          quantity: Number(quantity),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-white border border-[#E7EBE5] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-[#E7EBE5] bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EAF3EC] text-[#246B4D] flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#174A36]">
                {batchToEdit ? 'Editar Lote' : 'Agregar Nuevo Lote'}
              </h2>
              <p className="text-xs text-[#78847C] truncate max-w-[220px]">
                {product.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#78847C] hover:text-[#174A36] hover:bg-[#F8F9F6] transition"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {errors.form && (
            <div className="p-3.5 rounded-2xl bg-[#FCEBE5] border border-[#F5C2B6] text-[#C6533A] text-xs font-semibold">
              {errors.form}
            </div>
          )}

          {/* Expiration Date */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="batch-expiration-date" className="block text-xs font-semibold text-[#174A36] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#246B4D]" />
                <span>Fecha de Vencimiento <span className="text-[#C6533A]">*</span></span>
              </label>
              {statusPreview && (
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusPreview.badgeClass}`}>
                  {statusPreview.label}
                </span>
              )}
            </div>

            {/* Quick Date Presets Strip */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {[
                { label: 'Mañana', days: 1 },
                { label: '+3 días', days: 3 },
                { label: '+7 días', days: 7 },
                { label: '+15 días', days: 15 },
                { label: '+1 mes', days: 30 },
                { label: '+2 meses', days: 60 },
              ].map(p => (
                <button
                  key={p.days}
                  type="button"
                  onClick={() => applyDatePreset(p.days)}
                  className="px-2.5 py-1.5 rounded-xl bg-[#F8F9F6] hover:bg-[#EAF3EC] hover:text-[#246B4D] border border-[#E7EBE5] text-[11px] font-semibold text-[#78847C] whitespace-nowrap transition"
                >
                  {p.label}
                </button>
              ))}
            </div>

            <input
              id="batch-expiration-date"
              type="date"
              value={expirationDate}
              onChange={e => setExpirationDate(e.target.value)}
              className={`w-full px-4 py-2.5 bg-[#F8F9F6] border rounded-2xl text-sm text-[#24372F] focus:outline-none focus:bg-white font-mono ${
                errors.expirationDate ? 'border-[#C6533A]' : 'border-[#E7EBE5] focus:border-[#246B4D]'
              }`}
            />
            {errors.expirationDate && (
              <p className="text-[#C6533A] text-xs mt-1 font-medium">{errors.expirationDate}</p>
            )}
          </div>

          {/* Quantity with Steppers */}
          <div className="space-y-2">
            <label htmlFor="batch-qty" className="block text-xs font-semibold text-[#174A36]">
              Cantidad ({product.unit}) <span className="text-[#C6533A]">*</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => adjustQuantity(-1)}
                className="p-2.5 rounded-2xl bg-[#F8F9F6] hover:bg-[#E7EBE5] text-[#174A36] border border-[#E7EBE5] transition"
                title="Restar 1"
              >
                <Minus className="w-4 h-4" />
              </button>

              <input
                id="batch-qty"
                type="number"
                step="any"
                min="0"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="1"
                className={`flex-1 px-4 py-2.5 bg-[#F8F9F6] border rounded-2xl text-sm text-center text-[#174A36] placeholder-[#78847C]/60 focus:outline-none focus:bg-white font-mono font-bold ${
                  errors.quantity ? 'border-[#C6533A]' : 'border-[#E7EBE5] focus:border-[#246B4D]'
                }`}
              />

              <button
                type="button"
                onClick={() => adjustQuantity(1)}
                className="p-2.5 rounded-2xl bg-[#F8F9F6] hover:bg-[#E7EBE5] text-[#174A36] border border-[#E7EBE5] transition"
                title="Sumar 1"
              >
                <Plus className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5">
                {[6, 12].map(step => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => adjustQuantity(step)}
                    className="px-3 py-2 rounded-xl bg-[#F8F9F6] hover:bg-[#EAF3EC] hover:text-[#246B4D] border border-[#E7EBE5] text-xs font-mono font-semibold text-[#78847C] transition"
                  >
                    +{step}
                  </button>
                ))}
              </div>
            </div>
            {errors.quantity && (
              <p className="text-[#C6533A] text-xs mt-1 font-medium">{errors.quantity}</p>
            )}
          </div>

          {/* Lot Number */}
          <div>
            <label htmlFor="batch-code" className="block text-xs font-semibold text-[#174A36] mb-1.5">
              Código / Identificador de Lote (Opcional)
            </label>
            <input
              id="batch-code"
              type="text"
              value={lotNumber}
              onChange={e => setLotNumber(e.target.value)}
              placeholder="Ej. Lote 24-B, Mañana, Depósito A"
              className="w-full px-4 py-2.5 bg-[#F8F9F6] border border-[#E7EBE5] rounded-2xl text-sm text-[#24372F] placeholder-[#78847C]/60 focus:outline-none focus:border-[#246B4D] focus:bg-white font-mono"
            />
          </div>

          {/* Cost Price */}
          <div>
            <label htmlFor="batch-cost" className="block text-xs font-semibold text-[#174A36] mb-1.5">
              Costo unitario de este lote ($ ARS, opcional)
            </label>
            <input
              id="batch-cost"
              type="number"
              step="any"
              min="0"
              value={costPrice}
              onChange={e => setCostPrice(e.target.value)}
              placeholder={product.costPrice ? String(product.costPrice) : '0.00'}
              className="w-full px-4 py-2.5 bg-[#F8F9F6] border border-[#E7EBE5] rounded-2xl text-sm text-[#24372F] placeholder-[#78847C]/60 focus:outline-none focus:border-[#246B4D] focus:bg-white font-mono"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-[#78847C] bg-[#F8F9F6] hover:bg-[#E7EBE5] rounded-2xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-[#246B4D] hover:bg-[#174A36] disabled:opacity-50 rounded-2xl transition flex items-center gap-2 active:scale-95 shadow-xs"
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
