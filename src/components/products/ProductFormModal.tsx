import React, { useState, useEffect } from 'react';
import { X, Calendar, Package, Barcode, DollarSign, Tag, Info, Check, Sparkles, Plus, Minus, Clock } from 'lucide-react';
import { Product, ProductCategory, ProductUnit, Batch } from '../../types';
import { storageService, formatDate, calculateDaysRemaining, getExpirationStatus, getStatusLabel } from '../../services/storage';
import { soundService } from '../../services/sound';
import { BarcodeLookupResult } from '../../services/barcode';
import { useAuth } from '../../contexts/AuthContext';
import { firestoreSyncService } from '../../services/firestoreSync';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (product: Product, batch?: Batch) => void;
  productToEdit?: Product | null;
  initialBarcode?: string;
  lookupData?: BarcodeLookupResult;
}

const CATEGORIES: ProductCategory[] = [
  'Lácteos y Quesos',
  'Fiambrería y Embutidos',
  'Panadería y Facturas',
  'Galletitas y Snacks',
  'Bebidas y Jugos',
  'Almacén y Secos',
  'Pastas Frescas',
  'Golosinas y Chocolates',
  'Carnicería y Pollería',
  'Frutas y Verduras',
  'Limpieza y Perfumería',
  'Otros',
];

const UNITS: { value: ProductUnit; label: string }[] = [
  { value: 'unidades', label: 'Unidades (u)' },
  { value: 'paquetes', label: 'Paquetes (paq)' },
  { value: 'kg', label: 'Kilogramos (kg)' },
  { value: 'g', label: 'Gramos (g)' },
  { value: 'litros', label: 'Litros (L)' },
  { value: 'ml', label: 'Mililitros (ml)' },
  { value: 'cajas', label: 'Cajas (caja)' },
  { value: 'latas', label: 'Latas (lata)' },
];

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  productToEdit,
  initialBarcode = '',
  lookupData,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Almacén y Secos');
  const [unit, setUnit] = useState<ProductUnit>('unidades');
  const [barcode, setBarcode] = useState('');
  const [costPrice, setCostPrice] = useState<string>('');
  const [salePrice, setSalePrice] = useState<string>('');
  const [notes, setNotes] = useState('');

  // Initial Batch fields (only relevant when creating a new product)
  const [quantity, setQuantity] = useState<string>('1');
  const [expirationDate, setExpirationDate] = useState<string>('');
  const [lotNumber, setLotNumber] = useState<string>('');

  const { userProfile } = useAuth();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      setCategory(productToEdit.category);
      setUnit(productToEdit.unit);
      setBarcode(productToEdit.barcode || '');
      setCostPrice(productToEdit.costPrice !== undefined ? String(productToEdit.costPrice) : '');
      setSalePrice(productToEdit.salePrice !== undefined ? String(productToEdit.salePrice) : '');
      setNotes(productToEdit.notes || '');
      setErrors({});
    } else {
      // Prefill with lookup info if provided from barcode scan
      setName(lookupData?.name || '');
      setCategory(lookupData?.category || 'Almacén y Secos');
      setUnit('unidades');
      setBarcode(initialBarcode || lookupData?.barcode || '');
      setCostPrice('');
      setSalePrice('');
      setNotes('');
      setQuantity('1');
      setLotNumber('');

      // Default expiration date: 7 days from now
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 7);
      setExpirationDate(formatDate(defaultDate));
      setErrors({});
    }
  }, [productToEdit, initialBarcode, lookupData, isOpen]);

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

    if (!name.trim()) {
      errs.name = 'El nombre del producto es obligatorio.';
    }

    if (costPrice !== '' && (isNaN(Number(costPrice)) || Number(costPrice) < 0)) {
      errs.costPrice = 'El precio de costo debe ser un número válido mayor o igual a 0.';
    }

    if (salePrice !== '' && (isNaN(Number(salePrice)) || Number(salePrice) < 0)) {
      errs.salePrice = 'El precio de venta debe ser un número válido mayor o igual a 0.';
    }

    if (!productToEdit) {
      if (!expirationDate) {
        errs.expirationDate = 'La fecha de vencimiento es obligatoria para el lote inicial.';
      }
      const qtyNum = Number(quantity);
      if (isNaN(qtyNum) || qtyNum < 0) {
        errs.quantity = 'La cantidad debe ser mayor o igual a 0.';
      }
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
      const parsedSale = salePrice !== '' ? Number(salePrice) : undefined;

      if (productToEdit) {
        // Update product metadata
        const updated = storageService.saveProduct({
          name: name.trim(),
          category,
          unit,
          barcode: barcode.trim() || undefined,
          costPrice: parsedCost,
          salePrice: parsedSale,
          notes: notes.trim() || undefined,
        }, productToEdit.id);

        if (userProfile?.storeId && !storageService.isDemoActive()) {
          firestoreSyncService.saveProduct(userProfile.storeId, {
            name: name.trim(),
            category,
            unit,
            barcode: barcode.trim() || undefined,
            costPrice: parsedCost,
            salePrice: parsedSale,
            notes: notes.trim() || undefined,
          }, productToEdit.id).catch(err => console.warn('Product cloud sync err:', err));
        }

        soundService.playSuccessChime();
        onSuccess(updated);
      } else {
        // Create product and its first batch
        const createdProduct = storageService.saveProduct({
          name: name.trim(),
          category,
          unit,
          barcode: barcode.trim() || undefined,
          costPrice: parsedCost,
          salePrice: parsedSale,
          notes: notes.trim() || undefined,
        });

        const createdBatch = storageService.saveBatch({
          productId: createdProduct.id,
          lotNumber: lotNumber.trim() || undefined,
          quantity: Number(quantity),
          expirationDate,
          costPrice: parsedCost,
        });

        if (userProfile?.storeId && !storageService.isDemoActive()) {
          firestoreSyncService.saveProduct(userProfile.storeId, {
            name: name.trim(),
            category,
            unit,
            barcode: barcode.trim() || undefined,
            costPrice: parsedCost,
            salePrice: parsedSale,
            notes: notes.trim() || undefined,
          }, createdProduct.id).then(() => {
            firestoreSyncService.saveBatch(userProfile.storeId, {
              productId: createdProduct.id,
              lotNumber: lotNumber.trim() || undefined,
              quantity: Number(quantity),
              expirationDate,
              costPrice: parsedCost,
            }, createdBatch.id).catch(err => console.warn('Batch cloud sync err:', err));
          }).catch(err => console.warn('Product cloud sync err:', err));
        }

        soundService.playSuccessChime();
        onSuccess(createdProduct, createdBatch);
      }
      onClose();
    } catch {
      setErrors({ form: 'Ocurrió un error al guardar el producto. Intentá nuevamente.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Real-time calculation of days remaining for the initial batch preview
  const daysPreview = expirationDate ? calculateDaysRemaining(expirationDate) : null;
  const statusPreview = daysPreview !== null ? getStatusLabel(getExpirationStatus(daysPreview), daysPreview) : null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-xl max-h-[92vh] flex flex-col bg-white border border-[#E7EBE5] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-[#E7EBE5] bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EAF3EC] text-[#246B4D] flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#174A36]">
                {productToEdit ? 'Editar Producto' : 'Cargar Nuevo Producto'}
              </h2>
              <p className="text-xs text-[#78847C]">
                {productToEdit ? 'Actualizá los datos generales del producto' : 'Registrá el artículo y su lote con fecha de vencimiento'}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {lookupData?.found ? (
            <div className="p-3.5 rounded-2xl bg-[#E8F3E9] border border-[#CDE5D1] flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white text-[#246B4D] shrink-0 shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-xs text-[#174A36]">
                <span className="font-bold block text-[#174A36]">Datos obtenidos de Open Food Facts</span>
                Se identificó el código <span className="font-mono font-medium">{lookupData.barcode}</span>. Podés ajustar el nombre si lo deseás e ingresar la fecha de vencimiento del envase.
              </div>
            </div>
          ) : initialBarcode ? (
            <div className="p-3.5 rounded-2xl bg-[#F8F9F6] border border-[#E7EBE5] flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white text-[#246B4D] shrink-0 border border-[#E7EBE5]">
                <Barcode className="w-4 h-4" />
              </div>
              <div className="text-xs text-[#78847C]">
                <span className="font-bold text-[#174A36] block">Código de barras asignado</span>
                <span className="font-mono text-[#246B4D] font-bold">{initialBarcode}</span>. Completá los datos del producto manualmente.
              </div>
            </div>
          ) : null}

          {errors.form && (
            <div className="p-3.5 rounded-2xl bg-[#FCEBE5] border border-[#F5C2B6] text-[#C6533A] text-xs font-semibold">
              {errors.form}
            </div>
          )}

          {/* Section 1: Product Basic Info */}
          <div className="space-y-4">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#78847C]">
              Información del Producto
            </h3>

            {/* Name */}
            <div>
              <label htmlFor="product-name" className="block text-xs font-semibold text-[#174A36] mb-1.5">
                Nombre del Producto <span className="text-[#C6533A]">*</span>
              </label>
              <input
                id="product-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej. Yogur Firme La Serenísima Vainilla 120g"
                className={`w-full px-4 py-2.5 bg-[#F8F9F6] border rounded-2xl text-sm text-[#24372F] placeholder-[#78847C]/60 focus:outline-none focus:bg-white transition ${
                  errors.name ? 'border-[#C6533A]' : 'border-[#E7EBE5] focus:border-[#246B4D]'
                }`}
              />
              {errors.name && <p className="text-[#C6533A] text-xs mt-1 font-medium">{errors.name}</p>}
            </div>

            {/* Category & Unit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="product-category" className="block text-xs font-semibold text-[#174A36] mb-1.5">
                  Categoría <span className="text-[#C6533A]">*</span>
                </label>
                <div className="relative">
                  <select
                    id="product-category"
                    value={category}
                    onChange={e => setCategory(e.target.value as ProductCategory)}
                    className="w-full px-4 py-2.5 bg-[#F8F9F6] border border-[#E7EBE5] rounded-2xl text-sm text-[#24372F] focus:outline-none focus:border-[#246B4D] focus:bg-white appearance-none"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <Tag className="w-4 h-4 text-[#78847C] absolute right-3.5 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label htmlFor="product-unit" className="block text-xs font-semibold text-[#174A36] mb-1.5">
                  Unidad de Medida <span className="text-[#C6533A]">*</span>
                </label>
                <select
                  id="product-unit"
                  value={unit}
                  onChange={e => setUnit(e.target.value as ProductUnit)}
                  className="w-full px-4 py-2.5 bg-[#F8F9F6] border border-[#E7EBE5] rounded-2xl text-sm text-[#24372F] focus:outline-none focus:border-[#246B4D] focus:bg-white"
                >
                  {UNITS.map(u => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Barcode */}
            <div>
              <label htmlFor="product-barcode" className="block text-xs font-semibold text-[#174A36] mb-1.5">
                Código de Barras (Opcional)
              </label>
              <div className="relative">
                <input
                  id="product-barcode"
                  type="text"
                  value={barcode}
                  onChange={e => setBarcode(e.target.value)}
                  placeholder="Ej. 7790010001234"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F8F9F6] border border-[#E7EBE5] rounded-2xl text-sm text-[#24372F] placeholder-[#78847C]/60 focus:outline-none focus:border-[#246B4D] focus:bg-white font-mono"
                />
                <Barcode className="w-4 h-4 text-[#78847C] absolute left-3.5 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Cost & Sale Prices */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="cost-price" className="block text-xs font-semibold text-[#174A36] mb-1.5">
                  Precio de Costo ($ ARS)
                </label>
                <div className="relative">
                  <input
                    id="cost-price"
                    type="number"
                    step="any"
                    min="0"
                    value={costPrice}
                    onChange={e => setCostPrice(e.target.value)}
                    placeholder="0.00"
                    className={`w-full pl-9 pr-4 py-2.5 bg-[#F8F9F6] border rounded-2xl text-sm text-[#24372F] placeholder-[#78847C]/60 focus:outline-none focus:bg-white font-mono ${
                      errors.costPrice ? 'border-[#C6533A]' : 'border-[#E7EBE5] focus:border-[#246B4D]'
                    }`}
                  />
                  <DollarSign className="w-4 h-4 text-[#78847C] absolute left-3 top-3 pointer-events-none" />
                </div>
                {errors.costPrice && <p className="text-[#C6533A] text-xs mt-1 font-medium">{errors.costPrice}</p>}
              </div>

              <div>
                <label htmlFor="sale-price" className="block text-xs font-semibold text-[#174A36] mb-1.5">
                  Precio de Venta ($ ARS)
                </label>
                <div className="relative">
                  <input
                    id="sale-price"
                    type="number"
                    step="any"
                    min="0"
                    value={salePrice}
                    onChange={e => setSalePrice(e.target.value)}
                    placeholder="0.00"
                    className={`w-full pl-9 pr-4 py-2.5 bg-[#F8F9F6] border rounded-2xl text-sm text-[#24372F] placeholder-[#78847C]/60 focus:outline-none focus:bg-white font-mono ${
                      errors.salePrice ? 'border-[#C6533A]' : 'border-[#E7EBE5] focus:border-[#246B4D]'
                    }`}
                  />
                  <DollarSign className="w-4 h-4 text-[#78847C] absolute left-3 top-3 pointer-events-none" />
                </div>
                {errors.salePrice && <p className="text-[#C6533A] text-xs mt-1 font-medium">{errors.salePrice}</p>}
              </div>
            </div>
          </div>

          {/* Section 2: Initial Batch (Only for new products) */}
          {!productToEdit && (
            <div className="pt-4 border-t border-[#E7EBE5] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#246B4D] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Datos del Primer Lote</span>
                </h3>
                {statusPreview && (
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusPreview.badgeClass}`}>
                    {statusPreview.label}
                  </span>
                )}
              </div>

              {/* Expiration Date with Quick Preset Buttons */}
              <div className="space-y-2">
                <label htmlFor="expiration-date" className="block text-xs font-semibold text-[#174A36] flex items-center justify-between">
                  <span>Fecha de Vencimiento <span className="text-[#C6533A]">*</span></span>
                  <span className="text-[11px] text-[#78847C]">Atajos rápidos:</span>
                </label>

                {/* Quick Date Presets Strip */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {[
                    { label: 'Mañana', days: 1 },
                    { label: '+3 días', days: 3 },
                    { label: '+7 días', days: 7 },
                    { label: '+15 días', days: 15 },
                    { label: '+1 mes', days: 30 },
                    { label: '+2 meses', days: 60 },
                    { label: '+6 meses', days: 180 },
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

                <div className="relative">
                  <input
                    id="expiration-date"
                    type="date"
                    value={expirationDate}
                    onChange={e => setExpirationDate(e.target.value)}
                    className={`w-full px-4 py-2.5 bg-[#F8F9F6] border rounded-2xl text-sm text-[#24372F] focus:outline-none focus:bg-white font-mono ${
                      errors.expirationDate ? 'border-[#C6533A]' : 'border-[#E7EBE5] focus:border-[#246B4D]'
                    }`}
                  />
                </div>
                {errors.expirationDate && (
                  <p className="text-[#C6533A] text-xs mt-1 font-medium">{errors.expirationDate}</p>
                )}
              </div>

              {/* Quantity with Steppers */}
              <div className="space-y-2">
                <label htmlFor="batch-quantity" className="block text-xs font-semibold text-[#174A36]">
                  Cantidad Inicial ({unit}) <span className="text-[#C6533A]">*</span>
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
                    id="batch-quantity"
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

                  <div className="hidden sm:flex items-center gap-1.5">
                    {[6, 12, 24].map(step => (
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

              {/* Lot code / Number (optional) */}
              <div>
                <label htmlFor="lot-number" className="block text-xs font-semibold text-[#174A36] mb-1.5">
                  Número / Código de Lote (Opcional)
                </label>
                <input
                  id="lot-number"
                  type="text"
                  value={lotNumber}
                  onChange={e => setLotNumber(e.target.value)}
                  placeholder="Ej. L-2409, Lote A, Turno Mañana"
                  className="w-full px-4 py-2.5 bg-[#F8F9F6] border border-[#E7EBE5] rounded-2xl text-sm text-[#24372F] placeholder-[#78847C]/60 focus:outline-none focus:border-[#246B4D] focus:bg-white font-mono"
                />
              </div>
            </div>
          )}

          {/* Observations */}
          <div>
            <label htmlFor="product-notes" className="block text-xs font-semibold text-[#174A36] mb-1.5">
              Observaciones o Ubicación (Opcional)
            </label>
            <textarea
              id="product-notes"
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ej. Exhibido en heladera 2, requiere refrigeración, etc."
              className="w-full px-4 py-2.5 bg-[#F8F9F6] border border-[#E7EBE5] rounded-2xl text-sm text-[#24372F] placeholder-[#78847C]/60 focus:outline-none focus:border-[#246B4D] focus:bg-white resize-none"
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-[#E7EBE5] bg-white flex items-center justify-between gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#78847C]">
            <Info className="w-4 h-4 text-[#246B4D]" />
            <span>Almacenamiento local en este dispositivo</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2.5 text-xs font-semibold text-[#78847C] bg-[#F8F9F6] hover:bg-[#E7EBE5] rounded-2xl transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial px-5 py-2.5 text-xs font-semibold text-white bg-[#246B4D] hover:bg-[#174A36] disabled:opacity-50 rounded-2xl transition shadow-xs flex items-center justify-center gap-2 active:scale-95"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{productToEdit ? 'Guardar Cambios' : 'Registrar Producto'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
