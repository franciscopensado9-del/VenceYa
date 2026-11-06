import React, { useState, useEffect } from 'react';
import { X, Calendar, Package, DollarSign, Tag, Check, Sparkles, Plus, Minus, ChevronDown, ChevronUp, Barcode, FileSpreadsheet } from 'lucide-react';
import { Product, ProductCategory, ProductUnit, Batch } from '../../types';
import { storageService, formatDate, calculateDaysRemaining, getExpirationStatus, getStatusLabel } from '../../services/storage';
import { soundService } from '../../services/sound';
import { BarcodeLookupResult } from '../../services/barcode';
import { useAuth } from '../../contexts/AuthContext';
import { firestoreSyncService, reportSyncError } from '../../services/firestoreSync';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (product: Product, batch?: Batch) => void;
  productToEdit?: Product | null;
  initialBarcode?: string;
  lookupData?: BarcodeLookupResult;
  onOpenExcelImport?: () => void;
}

const CATEGORIES: ProductCategory[] = [
  'Almacén y Secos',
  'Lácteos y Quesos',
  'Fiambrería y Embutidos',
  'Panadería y Facturas',
  'Galletitas y Snacks',
  'Bebidas y Jugos',
  'Pastas Frescas',
  'Golosinas y Chocolates',
  'Carnicería y Pollería',
  'Frutas y Verduras',
  'Limpieza y Perfumería',
  'Otros',
];

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  productToEdit,
  initialBarcode = '',
  lookupData,
  onOpenExcelImport,
}) => {
  // Essential Fields (Shown first)
  const [name, setName] = useState('');
  const [expirationDate, setExpirationDate] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');

  // Optional Fields
  const [category, setCategory] = useState<ProductCategory>('Almacén y Secos');
  const [costPrice, setCostPrice] = useState<string>('');
  const [salePrice, setSalePrice] = useState<string>('');
  const [barcode, setBarcode] = useState('');
  const [unit, setUnit] = useState<ProductUnit>('unidades');
  const [notes, setNotes] = useState('');
  const [showOptionalFields, setShowOptionalFields] = useState<boolean>(false);

  const { userProfile } = useAuth();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      setCategory(productToEdit.category);
      setUnit(productToEdit.unit || 'unidades');
      setCostPrice(productToEdit.costPrice !== undefined ? String(productToEdit.costPrice) : '');
      setSalePrice(productToEdit.salePrice !== undefined ? String(productToEdit.salePrice) : '');
      setBarcode(productToEdit.barcode || '');
      setNotes(productToEdit.notes || '');
      setShowOptionalFields(true);
      setErrors({});
    } else {
      setName(lookupData?.name || '');
      setCategory(lookupData?.category || 'Almacén y Secos');
      setUnit('unidades');
      setCostPrice('');
      setSalePrice('');
      setBarcode(initialBarcode || lookupData?.barcode || '');
      setNotes('');
      setQuantity('1');

      // Default expiration date to +7 days
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 7);
      setExpirationDate(formatDate(defaultDate));
      setShowOptionalFields(Boolean(lookupData?.barcode || initialBarcode));
      setErrors({});
    }
  }, [productToEdit, initialBarcode, lookupData, isOpen]);

  const adjustQuantity = (delta: number) => {
    const current = Number(quantity) || 0;
    const next = Math.max(1, current + delta);
    setQuantity(String(next));
  };

  const applyPresetDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setExpirationDate(formatDate(d));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    // 1. Name is required
    if (!name.trim()) {
      errs.name = 'El nombre del producto es obligatorio.';
    }

    // 2. For new products: expiration date & quantity are required
    if (!productToEdit) {
      if (!expirationDate) {
        errs.expirationDate = 'La fecha de vencimiento es obligatoria.';
      }
      const qtyNum = Number(quantity);
      if (isNaN(qtyNum) || qtyNum < 1) {
        errs.quantity = 'La cantidad debe ser al menos 1 unidad.';
      }
    }

    // 3. Optional prices must be valid numbers if entered
    if (costPrice !== '' && (isNaN(Number(costPrice)) || Number(costPrice) < 0)) {
      errs.costPrice = 'El costo debe ser un número mayor o igual a 0.';
    }

    if (salePrice !== '' && (isNaN(Number(salePrice)) || Number(salePrice) < 0)) {
      errs.salePrice = 'El precio debe ser un número mayor o igual a 0.';
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
      const parsedSale = salePrice.trim() !== '' ? Number(salePrice) : undefined;

      if (productToEdit) {
        // Update existing product
        const updated = storageService.saveProduct({
          name: name.trim(),
          category,
          unit,
          barcode: barcode.trim() || undefined,
          brand: productToEdit.brand || lookupData?.brand || undefined,
          imageUrl: productToEdit.imageUrl || lookupData?.imageUrl || undefined,
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
            brand: productToEdit.brand || lookupData?.brand || undefined,
            imageUrl: productToEdit.imageUrl || lookupData?.imageUrl || undefined,
            costPrice: parsedCost,
            salePrice: parsedSale,
            notes: notes.trim() || undefined,
          }, productToEdit.id).catch(reportSyncError);
        }

        soundService.playSuccessChime();
        onSuccess(updated);
      } else {
        // Create new product
        const createdProduct = storageService.saveProduct({
          name: name.trim(),
          category,
          unit: 'unidades',
          barcode: barcode.trim() || undefined,
          brand: lookupData?.brand || undefined,
          imageUrl: lookupData?.imageUrl || undefined,
          costPrice: parsedCost,
          salePrice: parsedSale,
          notes: notes.trim() || undefined,
        });

        // Generate automatic suggested lot code
        const todayCode = formatDate(new Date()).replace(/-/g, '').slice(2);
        const autoSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
        const autoLotNumber = `L-${todayCode}-${autoSuffix}`;

        const createdBatch = storageService.saveBatch({
          productId: createdProduct.id,
          lotNumber: autoLotNumber,
          quantity: Math.max(1, Number(quantity) || 1),
          expirationDate,
          costPrice: parsedCost,
        });

        if (userProfile?.storeId && !storageService.isDemoActive()) {
          firestoreSyncService.saveProduct(userProfile.storeId, {
            name: name.trim(),
            category,
            unit: 'unidades',
            barcode: barcode.trim() || undefined,
            brand: lookupData?.brand || undefined,
            imageUrl: lookupData?.imageUrl || undefined,
            costPrice: parsedCost,
            salePrice: parsedSale,
            notes: notes.trim() || undefined,
          }, createdProduct.id, createdProduct.createdAt).then(() => {
            firestoreSyncService.saveBatch(userProfile.storeId, {
              productId: createdProduct.id,
              lotNumber: autoLotNumber,
              quantity: Math.max(1, Number(quantity) || 1),
              expirationDate,
              costPrice: parsedCost,
            }, createdBatch.id, createdBatch.createdAt).catch(reportSyncError);
          }).catch(reportSyncError);
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

  if (!isOpen) return null;

  const daysRemaining = expirationDate ? calculateDaysRemaining(expirationDate) : null;
  const statusInfo = daysRemaining !== null ? getStatusLabel(getExpirationStatus(daysRemaining), daysRemaining) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-lg flex flex-col bg-white sm:rounded-3xl rounded-none shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Sticky Mobile Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#E7EBE5] bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EAF3EC] text-[#246B4D] flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#174A36]">
                {productToEdit ? 'Editar Producto' : 'Cargar Producto'}
              </h2>
              <p className="text-xs text-[#78847C]">
                {productToEdit ? 'Modificá los datos del artículo' : 'Completá los datos esenciales con tu celular'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#78847C] hover:text-[#174A36] hover:bg-[#F8F9F6] transition min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - Single Column Ergonomic Flow */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Lookup badge if scanned via barcode */}
          {lookupData?.found && (
            <div className="p-3.5 rounded-2xl bg-[#E8F3E9] border border-[#CDE5D1] flex items-center gap-3">
              {lookupData.imageUrl ? (
                <img 
                  src={lookupData.imageUrl} 
                  alt={lookupData.name || ''} 
                  className="w-11 h-11 object-cover rounded-xl border border-[#CDE5D1] bg-white shrink-0" 
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-[#246B4D] text-white flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
              )}
              <div className="text-xs text-[#174A36] min-w-0">
                <strong className="block truncate font-bold">Identificado por código de barras</strong>
                <span className="text-[11px] text-[#246B4D] block truncate">
                  {lookupData.barcode} · Revisá la fecha del envase
                </span>
              </div>
            </div>
          )}

          {errors.form && (
            <div className="p-3.5 rounded-2xl bg-[#FCEBE5] border border-[#F5C2B6] text-[#C6533A] text-xs font-semibold">
              {errors.form}
            </div>
          )}

          {/* Quick Excel import banner for new products */}
          {onOpenExcelImport && !productToEdit && (
            <div className="p-3 bg-[#EAF3EC] border border-[#D5E8D7] rounded-2xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-[#174A36] min-w-0">
                <FileSpreadsheet className="w-4 h-4 text-[#246B4D] shrink-0" />
                <span className="truncate">¿Tenés tu lista en Excel o CSV?</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenExcelImport();
                }}
                className="text-xs font-bold text-[#246B4D] hover:text-[#174A36] hover:underline whitespace-nowrap active:scale-95"
              >
                Importar archivo →
              </button>
            </div>
          )}

          {/* ========================================================= */}
          {/* BLOQUE 1: DATOS ESENCIALES (Primeros en pantalla)        */}
          {/* ========================================================= */}
          <div className="space-y-4">
            
            {/* 1. Nombre del Producto */}
            <div>
              <label htmlFor="product-name" className="block text-xs font-bold text-[#174A36] mb-1.5">
                Nombre del Producto <span className="text-[#C6533A]">*</span>
              </label>
              <input
                id="product-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej. Leche La Serenísima 1L"
                required
                autoFocus={!name}
                enterKeyHint="next"
                className={`w-full px-4 py-3 bg-[#F8F9F6] border rounded-2xl text-sm font-semibold text-[#24372F] placeholder-[#78847C]/60 focus:outline-none focus:bg-white min-h-[48px] transition ${
                  errors.name ? 'border-[#C6533A]' : 'border-[#E7EBE5] focus:border-[#246B4D]'
                }`}
              />
              {errors.name && <p className="text-[#C6533A] text-xs mt-1 font-medium">{errors.name}</p>}
            </div>

            {/* 2 & 3. Para nuevo producto: Fecha de vencimiento y Cantidad PRIMERO */}
            {!productToEdit && (
              <>
                {/* 2. Fecha de Vencimiento */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="expiration-date" className="block text-xs font-bold text-[#174A36]">
                      Fecha de Vencimiento <span className="text-[#C6533A]">*</span>
                    </label>
                    {statusInfo && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${statusInfo.badgeClass}`}>
                        {statusInfo.label}
                      </span>
                    )}
                  </div>
                  
                  <div className="relative">
                    <input
                      id="expiration-date"
                      type="date"
                      value={expirationDate}
                      onChange={e => setExpirationDate(e.target.value)}
                      required
                      className={`w-full px-4 py-3 bg-[#F8F9F6] border rounded-2xl text-sm font-mono font-semibold text-[#174A36] focus:outline-none focus:bg-white min-h-[48px] transition ${
                        errors.expirationDate ? 'border-[#C6533A]' : 'border-[#E7EBE5] focus:border-[#246B4D]'
                      }`}
                    />
                  </div>
                  {errors.expirationDate && (
                    <p className="text-[#C6533A] text-xs mt-1 font-medium">{errors.expirationDate}</p>
                  )}

                  {/* Quick Presets for fast thumb selection */}
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    <button
                      type="button"
                      onClick={() => applyPresetDays(7)}
                      className="px-2.5 py-1 rounded-xl bg-[#F8F9F6] hover:bg-[#EAF3EC] border border-[#E7EBE5] text-[11px] font-semibold text-[#174A36] transition active:scale-95"
                    >
                      +7 días
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetDays(15)}
                      className="px-2.5 py-1 rounded-xl bg-[#F8F9F6] hover:bg-[#EAF3EC] border border-[#E7EBE5] text-[11px] font-semibold text-[#174A36] transition active:scale-95"
                    >
                      +15 días
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetDays(30)}
                      className="px-2.5 py-1 rounded-xl bg-[#F8F9F6] hover:bg-[#EAF3EC] border border-[#E7EBE5] text-[11px] font-semibold text-[#174A36] transition active:scale-95"
                    >
                      +1 mes
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetDays(90)}
                      className="px-2.5 py-1 rounded-xl bg-[#F8F9F6] hover:bg-[#EAF3EC] border border-[#E7EBE5] text-[11px] font-semibold text-[#174A36] transition active:scale-95"
                    >
                      +3 meses
                    </button>
                  </div>
                </div>

                {/* 3. Cantidad Inicial en Unidades */}
                <div>
                  <label htmlFor="batch-quantity" className="block text-xs font-bold text-[#174A36] mb-1.5">
                    Cantidad a Ingresar (Unidades) <span className="text-[#C6533A]">*</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => adjustQuantity(-1)}
                      className="w-12 h-12 rounded-2xl bg-[#F8F9F6] hover:bg-[#E7EBE5] text-[#174A36] border border-[#E7EBE5] flex items-center justify-center transition active:scale-95 shrink-0"
                      title="Restar 1"
                      aria-label="Restar 1 unidad"
                    >
                      <Minus className="w-5 h-5 stroke-[2.5]" />
                    </button>

                    <input
                      id="batch-quantity"
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
                      className="w-12 h-12 rounded-2xl bg-[#246B4D] hover:bg-[#174A36] text-white flex items-center justify-center transition active:scale-95 shrink-0"
                      title="Sumar 1"
                      aria-label="Sumar 1 unidad"
                    >
                      <Plus className="w-5 h-5 stroke-[2.5]" />
                    </button>
                  </div>
                  {errors.quantity && (
                    <p className="text-[#C6533A] text-xs mt-1 font-medium">{errors.quantity}</p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* ========================================================= */}
          {/* BLOQUE 2: CAMPOS OPCIONALES (Categoría, Precios, Notas)   */}
          {/* ========================================================= */}
          <div className="pt-2 border-t border-[#E7EBE5]">
            <button
              type="button"
              onClick={() => setShowOptionalFields(!showOptionalFields)}
              className="w-full flex items-center justify-between py-2 text-xs font-bold text-[#246B4D] hover:text-[#174A36] transition"
            >
              <span>{showOptionalFields ? 'Ocultar campos opcionales' : '+ Agregar categoría, precios o notas (opcional)'}</span>
              {showOptionalFields ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showOptionalFields && (
              <div className="space-y-4 pt-3 animate-in fade-in duration-150">
                {/* Categoría */}
                <div>
                  <label htmlFor="product-category" className="block text-xs font-semibold text-[#174A36] mb-1.5">
                    Categoría del Producto
                  </label>
                  <div className="relative">
                    <select
                      id="product-category"
                      value={category}
                      onChange={e => setCategory(e.target.value as ProductCategory)}
                      className="w-full px-4 py-3 bg-[#F8F9F6] border border-[#E7EBE5] rounded-2xl text-xs sm:text-sm text-[#24372F] focus:outline-none focus:border-[#246B4D] focus:bg-white appearance-none min-h-[48px]"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <Tag className="w-4 h-4 text-[#78847C] absolute right-3.5 top-3.5 pointer-events-none" />
                  </div>
                </div>

                {/* Código de barras (si se cargó o escaneó) */}
                <div>
                  <label htmlFor="product-barcode" className="block text-xs font-semibold text-[#174A36] mb-1.5">
                    Código de Barras (Opcional)
                  </label>
                  <div className="relative">
                    <input
                      id="product-barcode"
                      type="text"
                      inputMode="numeric"
                      value={barcode}
                      onChange={e => setBarcode(e.target.value)}
                      placeholder="Ej. 7790010001234"
                      className="w-full pl-10 pr-4 py-3 bg-[#F8F9F6] border border-[#E7EBE5] rounded-2xl text-xs sm:text-sm font-mono text-[#24372F] focus:outline-none focus:border-[#246B4D] focus:bg-white min-h-[48px]"
                    />
                    <Barcode className="w-4 h-4 text-[#78847C] absolute left-3.5 top-3.5 pointer-events-none" />
                  </div>
                </div>

                {/* Precios: Costo y Venta */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label htmlFor="cost-price" className="block text-xs font-semibold text-[#174A36] mb-1.5">
                      Precio de Costo ($ ARS)
                    </label>
                    <div className="relative">
                      <input
                        id="cost-price"
                        type="number"
                        inputMode="decimal"
                        step="any"
                        min="0"
                        value={costPrice}
                        onChange={e => setCostPrice(e.target.value)}
                        placeholder="0.00"
                        className={`w-full pl-9 pr-4 py-3 bg-[#F8F9F6] border rounded-2xl text-xs sm:text-sm text-[#24372F] placeholder-[#78847C]/60 focus:outline-none focus:bg-white font-mono min-h-[48px] ${
                          errors.costPrice ? 'border-[#C6533A]' : 'border-[#E7EBE5] focus:border-[#246B4D]'
                        }`}
                      />
                      <DollarSign className="w-4 h-4 text-[#78847C] absolute left-3 top-3.5 pointer-events-none" />
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
                        inputMode="decimal"
                        step="any"
                        min="0"
                        value={salePrice}
                        onChange={e => setSalePrice(e.target.value)}
                        placeholder="0.00"
                        className={`w-full pl-9 pr-4 py-3 bg-[#F8F9F6] border rounded-2xl text-xs sm:text-sm text-[#24372F] placeholder-[#78847C]/60 focus:outline-none focus:bg-white font-mono min-h-[48px] ${
                          errors.salePrice ? 'border-[#C6533A]' : 'border-[#E7EBE5] focus:border-[#246B4D]'
                        }`}
                      />
                      <DollarSign className="w-4 h-4 text-[#78847C] absolute left-3 top-3.5 pointer-events-none" />
                    </div>
                    {errors.salePrice && <p className="text-[#C6533A] text-xs mt-1 font-medium">{errors.salePrice}</p>}
                  </div>
                </div>

                {/* Observaciones */}
                <div>
                  <label htmlFor="product-notes" className="block text-xs font-semibold text-[#174A36] mb-1.5">
                    Observaciones o Ubicación (Opcional)
                  </label>
                  <textarea
                    id="product-notes"
                    rows={2}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Ej. En heladera 2, en el mostrador..."
                    className="w-full px-4 py-2.5 bg-[#F8F9F6] border border-[#E7EBE5] rounded-2xl text-xs sm:text-sm text-[#24372F] placeholder-[#78847C]/60 focus:outline-none focus:border-[#246B4D] focus:bg-white resize-none"
                  />
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Sticky Mobile Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-[#E7EBE5] bg-white flex items-center justify-end gap-3 shrink-0 pb-[max(env(safe-area-inset-bottom),16px)]">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 sm:flex-initial px-5 py-3 text-xs font-semibold text-[#78847C] bg-[#F8F9F6] hover:bg-[#E7EBE5] rounded-2xl transition min-h-[48px] flex items-center justify-center active:scale-95"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-2 sm:flex-initial px-6 py-3 text-xs sm:text-sm font-bold text-white bg-[#246B4D] hover:bg-[#174A36] disabled:opacity-50 rounded-2xl transition shadow-xs flex items-center justify-center gap-2 active:scale-95 min-h-[48px]"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>{productToEdit ? 'Guardar Cambios' : 'Registrar Producto'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
