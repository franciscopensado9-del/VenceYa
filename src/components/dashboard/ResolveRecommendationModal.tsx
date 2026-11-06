import React, { useState, useMemo } from 'react';
import { 
  X, 
  Check, 
  ShoppingBag, 
  Trash2, 
  Tag, 
  HelpCircle, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  Layers,
  ArrowRight,
  Plus
} from 'lucide-react';
import { ProductWithBatches, Batch, ResolutionOptionType, Promotion } from '../../types';
import { storageService, calculateDaysRemaining } from '../../services/storage';
import { firestoreSyncService, reportSyncError } from '../../services/firestoreSync';
import { soundService } from '../../services/sound';
import { useAuth } from '../../contexts/AuthContext';

interface ResolveRecommendationModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductWithBatches;
  batch: Batch;
  onSuccess: (message: string) => void;
  onOpenPromotion?: (product: ProductWithBatches, batch?: Batch) => void;
}

export const ResolveRecommendationModal: React.FC<ResolveRecommendationModalProps> = ({
  isOpen,
  onClose,
  product,
  batch,
  onSuccess,
  onOpenPromotion,
}) => {
  const { userProfile } = useAuth();
  const [selectedOption, setSelectedOption] = useState<ResolutionOptionType>('sold');
  
  // Form states
  const [soldQuantity, setSoldQuantity] = useState<number>(Math.min(batch.quantity, 1));
  const [discardQuantity, setDiscardQuantity] = useState<number>(Math.min(batch.quantity, 1));
  const [discardReason, setDiscardReason] = useState<string>('Vencido');
  const [otherNotes, setOtherNotes] = useState<string>('');
  const [selectedPromoId, setSelectedPromoId] = useState<string>('');

  // Processing & Error states (Anti double-click)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Available promotions for this product/batch
  const availablePromotions = useMemo(() => {
    const all = storageService.getPromotions();
    return all.filter(p => p.productId === product.id);
  }, [product.id]);

  // Set default promo if available
  React.useEffect(() => {
    if (availablePromotions.length > 0 && !selectedPromoId) {
      setSelectedPromoId(availablePromotions[0].id);
    }
  }, [availablePromotions, selectedPromoId]);

  if (!isOpen) return null;

  const days = calculateDaysRemaining(batch.expirationDate);

  // Validation
  const validateForm = (): boolean => {
    setErrorMessage(null);

    if (selectedOption === 'sold') {
      if (!soldQuantity || soldQuantity <= 0) {
        setErrorMessage('Ingresá una cantidad vendida válida mayor a 0.');
        return false;
      }
      if (soldQuantity > batch.quantity) {
        setErrorMessage(`La cantidad no puede superar el stock disponible de este lote (${batch.quantity} ${product.unit}).`);
        return false;
      }
    } else if (selectedOption === 'discarded') {
      if (!discardQuantity || discardQuantity <= 0) {
        setErrorMessage('Ingresá una cantidad descartada válida mayor a 0.');
        return false;
      }
      if (discardQuantity > batch.quantity) {
        setErrorMessage(`La cantidad no puede superar el stock disponible de este lote (${batch.quantity} ${product.unit}).`);
        return false;
      }
      if (!discardReason.trim()) {
        setErrorMessage('Por favor indicá el motivo del descarte.');
        return false;
      }
    } else if (selectedOption === 'discount_applied') {
      if (!selectedPromoId) {
        setErrorMessage('Debés seleccionar una promoción existente o crear una nueva para continuar.');
        return false;
      }
    } else if (selectedOption === 'other') {
      if (!otherNotes.trim() || otherNotes.trim().length < 3) {
        setErrorMessage('El campo de observación es obligatorio. Describí brevemente qué solución se aplicó.');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent duplicate execution
    if (isSubmitting) return;

    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const storeId = userProfile?.storeId;
      const userId = userProfile?.id;
      const isDemo = storageService.isDemoActive();

      let quantityResolved: number | undefined = undefined;
      let notes: string | undefined = undefined;
      let promotionId: string | undefined = undefined;

      if (selectedOption === 'sold') {
        quantityResolved = Number(soldQuantity);
        notes = `Venta antes de vencer (${quantityResolved} ${product.unit})`;
      } else if (selectedOption === 'discarded') {
        quantityResolved = Number(discardQuantity);
        notes = `Descarte: ${discardReason.trim()}`;
      } else if (selectedOption === 'discount_applied') {
        promotionId = selectedPromoId;
        const matchedPromo = availablePromotions.find(p => p.id === selectedPromoId);
        notes = matchedPromo ? `Promoción aplicada: ${matchedPromo.title}` : 'Descuento promocional aplicado';
      } else if (selectedOption === 'other') {
        notes = otherNotes.trim();
      }

      // 1. Execute local atomic transaction
      const { reviewRecord, stockMovement, updatedBatch } = storageService.resolveRecommendation({
        productId: product.id,
        batchId: batch.id,
        storeId,
        userId,
        resolutionType: selectedOption,
        quantityResolved,
        notes,
        promotionId,
        batchExpirationDate: batch.expirationDate,
        currentBatchQuantity: batch.quantity,
        productName: product.name,
        unit: product.unit,
      });

      // 2. Synchronize to Firestore atomically if real store session
      if (storeId && !isDemo) {
        await firestoreSyncService.applyResolutionTransaction(storeId, {
          reviewRecord,
          stockMovement,
          batchId: batch.id,
          newBatchQuantity: updatedBatch?.quantity,
          productId: product.id,
        });
      }

      // 3. Audio & Success Feedback
      soundService.playScanSuccess();

      let successMsg = `✓ Acción registrada para ${product.name}.`;
      if (selectedOption === 'sold') {
        successMsg = `✓ Venta de ${quantityResolved} ${product.unit} registrada. Stock actualizado.`;
      } else if (selectedOption === 'discarded') {
        successMsg = `✓ Descarte de ${quantityResolved} ${product.unit} registrado como merma.`;
      } else if (selectedOption === 'discount_applied') {
        successMsg = `✓ Promoción vinculada a ${product.name}.`;
      } else if (selectedOption === 'other') {
        successMsg = `✓ Registro de resolución guardado para ${product.name}.`;
      }

      onSuccess(successMsg);
      onClose();
    } catch (err) {
      console.error('Error resolving recommendation:', err);
      setErrorMessage(
        `Ocurrió un error al guardar la operación: ${err instanceof Error ? err.message : String(err)}. La alerta sigue pendiente para que puedas reintentar.`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg bg-white rounded-3xl border border-[#EAEBE8] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[#EAEBE8] flex items-start justify-between bg-white shrink-0">
          <div className="pr-4 space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-[#173F35] tracking-tight">
              ¿Qué pasó con este producto?
            </h2>
            <p className="text-xs sm:text-sm text-[#7A8580]">
              Actualizá la alerta de <strong className="text-[#173F35] font-semibold">{product.name}</strong> para llevar un registro real.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-[#7A8580] hover:text-[#173F35] hover:bg-[#F8F9F6] rounded-xl transition shrink-0"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product / Batch Summary Strip */}
        <div className="px-5 sm:px-6 py-2.5 bg-[#F9FAF8] border-b border-[#EAEBE8] flex items-center justify-between text-xs text-[#5C6861] shrink-0">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-[#246B4F]" />
            <span>Vence: <strong>{batch.expirationDate}</strong></span>
            <span className="text-[#DCE0D9]">·</span>
            <span className={days < 0 ? 'text-[#D95D39] font-bold' : days <= 2 ? 'text-[#D95D39]' : 'text-[#D99B26]'}>
              {days < 0 ? `Venció hace ${Math.abs(days)}d` : days === 0 ? 'Vence hoy' : `En ${days} días`}
            </span>
          </div>
          <div className="flex items-center gap-1 font-mono font-bold text-[#173F35]">
            <Layers className="w-3.5 h-3.5 text-[#246B4F]" />
            <span>{batch.quantity} {product.unit} en stock</span>
          </div>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-[#FDF0EB] border border-[#F5C7B8] text-[#C6533A] text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="flex-1 leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* 4 Primary Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* 1. Vendido */}
            <div
              onClick={() => setSelectedOption('sold')}
              className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-start gap-3 select-none ${
                selectedOption === 'sold'
                  ? 'border-[#246B4F] bg-[#EAF5ED] text-[#173F35] shadow-2xs'
                  : 'border-[#EAEBE8] bg-white hover:bg-[#F9FAF8] text-[#5C6861]'
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                selectedOption === 'sold' ? 'bg-[#246B4F] text-white' : 'bg-[#F0F2EE] text-[#5C6861]'
              }`}>
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-[#173F35]">Vendido</div>
                <div className="text-xs text-[#7A8580] leading-snug">Se vendió antes de vencer.</div>
              </div>
            </div>

            {/* 2. Descartado */}
            <div
              onClick={() => setSelectedOption('discarded')}
              className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-start gap-3 select-none ${
                selectedOption === 'discarded'
                  ? 'border-[#D95D39] bg-[#FDF0EB] text-[#173F35] shadow-2xs'
                  : 'border-[#EAEBE8] bg-white hover:bg-[#F9FAF8] text-[#5C6861]'
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                selectedOption === 'discarded' ? 'bg-[#D95D39] text-white' : 'bg-[#F0F2EE] text-[#5C6861]'
              }`}>
                <Trash2 className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-[#173F35]">Descartado</div>
                <div className="text-xs text-[#7A8580] leading-snug">Se retiró del stock.</div>
              </div>
            </div>

            {/* 3. Descuento aplicado */}
            <div
              onClick={() => setSelectedOption('discount_applied')}
              className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-start gap-3 select-none ${
                selectedOption === 'discount_applied'
                  ? 'border-[#246B4F] bg-[#EAF5ED] text-[#173F35] shadow-2xs'
                  : 'border-[#EAEBE8] bg-white hover:bg-[#F9FAF8] text-[#5C6861]'
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                selectedOption === 'discount_applied' ? 'bg-[#246B4F] text-white' : 'bg-[#F0F2EE] text-[#5C6861]'
              }`}>
                <Tag className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-[#173F35]">Descuento aplicado</div>
                <div className="text-xs text-[#7A8580] leading-snug">Le aplicaste una promo.</div>
              </div>
            </div>

            {/* 4. Otro */}
            <div
              onClick={() => setSelectedOption('other')}
              className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-start gap-3 select-none ${
                selectedOption === 'other'
                  ? 'border-[#5C6861] bg-[#F4F6F3] text-[#173F35] shadow-2xs'
                  : 'border-[#EAEBE8] bg-white hover:bg-[#F9FAF8] text-[#5C6861]'
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                selectedOption === 'other' ? 'bg-[#5C6861] text-white' : 'bg-[#F0F2EE] text-[#5C6861]'
              }`}>
                <HelpCircle className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-[#173F35]">Otro</div>
                <div className="text-xs text-[#7A8580] leading-snug">Otra solución.</div>
              </div>
            </div>
          </div>

          {/* Conditional Option Form Area */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#F9FAF8] border border-[#EAEBE8] space-y-4">
            {/* OPTION A: VENDIDO */}
            {selectedOption === 'sold' && (
              <div className="space-y-3.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#173F35] uppercase tracking-wider">
                    Cantidad Vendida
                  </label>
                  <span className="text-xs text-[#7A8580]">
                    Stock disponible: <strong className="text-[#173F35] font-mono">{batch.quantity} {product.unit}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max={batch.quantity}
                    step="any"
                    value={soldQuantity}
                    onChange={(e) => setSoldQuantity(Math.max(0, Number(e.target.value)))}
                    className="flex-1 px-4 py-2.5 bg-white border border-[#DCE0D9] rounded-xl text-base font-bold text-[#173F35] focus:outline-hidden focus:border-[#246B4F]"
                    required
                  />
                  <span className="text-xs font-bold text-[#5C6861] px-2">{product.unit}</span>

                  <button
                    type="button"
                    onClick={() => setSoldQuantity(batch.quantity)}
                    className="px-3 py-2 bg-white border border-[#DCE0D9] hover:bg-[#F0F2EE] rounded-xl text-xs font-semibold text-[#173F35] transition"
                  >
                    Todo el lote
                  </button>
                </div>

                <p className="text-[11px] text-[#7A8580]">
                  📌 Se descontará la cantidad vendida del lote y se guardará en el historial de movimientos de venta.
                </p>
              </div>
            )}

            {/* OPTION B: DESCARTADO */}
            {selectedOption === 'discarded' && (
              <div className="space-y-3.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#C6533A] uppercase tracking-wider">
                    Cantidad Descartada / Merma
                  </label>
                  <span className="text-xs text-[#7A8580]">
                    Stock disponible: <strong className="text-[#173F35] font-mono">{batch.quantity} {product.unit}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max={batch.quantity}
                    step="any"
                    value={discardQuantity}
                    onChange={(e) => setDiscardQuantity(Math.max(0, Number(e.target.value)))}
                    className="flex-1 px-4 py-2.5 bg-white border border-[#DCE0D9] rounded-xl text-base font-bold text-[#173F35] focus:outline-hidden focus:border-[#D95D39]"
                    required
                  />
                  <span className="text-xs font-bold text-[#5C6861] px-2">{product.unit}</span>

                  <button
                    type="button"
                    onClick={() => setDiscardQuantity(batch.quantity)}
                    className="px-3 py-2 bg-white border border-[#DCE0D9] hover:bg-[#F0F2EE] rounded-xl text-xs font-semibold text-[#173F35] transition"
                  >
                    Todo el lote
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#5C6861]">
                    Motivo u observación del descarte
                  </label>
                  <select
                    value={discardReason}
                    onChange={(e) => setDiscardReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#DCE0D9] rounded-xl text-xs font-medium text-[#173F35] focus:outline-hidden focus:border-[#D95D39]"
                  >
                    <option value="Vencido">Vencido — Retirado de góndola</option>
                    <option value="Deteriorado">Envase roto o deteriorado</option>
                    <option value="Pérdida de frío">Pérdida de cadena de frío</option>
                    <option value="Devolución al proveedor">Devolución al proveedor</option>
                    <option value="Consumo interno">Consumo interno / Degustación</option>
                  </select>
                </div>

                <p className="text-[11px] text-[#7A8580]">
                  ⚠️ Se descontará del stock y se registrará formalmente como merma para el cálculo de pérdidas.
                </p>
              </div>
            )}

            {/* OPTION C: DESCUENTO APLICADO */}
            {selectedOption === 'discount_applied' && (
              <div className="space-y-3.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#246B4F] uppercase tracking-wider">
                    Promoción Comercial Asociada
                  </label>
                  {onOpenPromotion && (
                    <button
                      type="button"
                      onClick={() => onOpenPromotion(product, batch)}
                      className="text-xs font-bold text-[#246B4F] hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Crear nueva</span>
                    </button>
                  )}
                </div>

                {availablePromotions.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs text-[#7A8580]">
                      Seleccioná la promoción vigente que le aplicaste a este lote:
                    </p>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {availablePromotions.map((promo) => (
                        <label
                          key={promo.id}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition ${
                            selectedPromoId === promo.id
                              ? 'border-[#246B4F] bg-[#EAF5ED]'
                              : 'border-[#EAEBE8] bg-white hover:bg-[#F0F2EE]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="radio"
                              name="promo"
                              checked={selectedPromoId === promo.id}
                              onChange={() => setSelectedPromoId(promo.id)}
                              className="accent-[#246B4F] w-4 h-4"
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-[#173F35] truncate">{promo.title}</div>
                              <div className="text-[11px] text-[#5C6861]">
                                Precio promo: ${promo.promoPrice.toLocaleString('es-AR')}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EAF3EC] text-[#246B4F] shrink-0">
                            {promo.status === 'active' ? 'Activa' : promo.status}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-white border border-[#EAEBE8] text-center space-y-2.5">
                    <p className="text-xs text-[#5C6861]">
                      Todavía no creaste una promoción para este producto.
                    </p>
                    {onOpenPromotion && (
                      <button
                        type="button"
                        onClick={() => onOpenPromotion(product, batch)}
                        className="px-4 py-2 bg-[#246B4F] hover:bg-[#1C553E] text-white text-xs font-bold rounded-xl transition inline-flex items-center gap-1.5 shadow-2xs"
                      >
                        <Tag className="w-3.5 h-3.5" />
                        <span>Abrir generador de promociones</span>
                      </button>
                    )}
                  </div>
                )}

                <p className="text-[11px] text-[#7A8580]">
                  💡 Crear o asociar una promoción no descuenta el stock ni modifica el precio regular del producto en catálogo.
                </p>
              </div>
            )}

            {/* OPTION D: OTRO */}
            {selectedOption === 'other' && (
              <div className="space-y-3.5 animate-in fade-in duration-150">
                <label className="text-xs font-bold text-[#173F35] uppercase tracking-wider block">
                  Descripción de la solución aplicada *
                </label>
                <textarea
                  rows={3}
                  value={otherNotes}
                  onChange={(e) => setOtherNotes(e.target.value)}
                  placeholder="Ej: Se adelantó el lote al frente de la heladera según PEPS, se acordó devolución con el proveedor, etc."
                  className="w-full px-3.5 py-2.5 bg-white border border-[#DCE0D9] rounded-xl text-xs text-[#173F35] focus:outline-hidden focus:border-[#246B4F] leading-relaxed resize-none"
                  required
                />
                <p className="text-[11px] text-[#7A8580]">
                  📝 Esta observación quedará guardada en el historial de resoluciones y dará por atendida esta recomendación.
                </p>
              </div>
            )}
          </div>

          {/* Action buttons footer */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-5 py-2.5 border border-[#DCE0D9] hover:bg-[#F8F9F6] text-[#5C6861] text-xs font-semibold rounded-xl transition"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting || (selectedOption === 'discount_applied' && !selectedPromoId)}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#246B4F] hover:bg-[#1C553E] disabled:bg-[#A0A8A3] text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-2 active:scale-95"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Guardando resolución...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Confirmar acción</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
