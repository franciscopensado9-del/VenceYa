import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Tag, 
  Percent, 
  Sparkles, 
  Share2, 
  Copy, 
  Check, 
  MessageCircle, 
  AlertTriangle, 
  ShieldAlert, 
  TrendingUp, 
  Package, 
  Calendar, 
  Clock, 
  Layers, 
  Plus, 
  Trash2, 
  ExternalLink,
  BookmarkCheck,
  Flame,
  Info
} from 'lucide-react';
import { 
  ProductWithBatches, 
  Batch, 
  Promotion, 
  PromotionType, 
  PromotionStatus, 
  PromotionComboItem, 
  StoreSettings 
} from '../../types';
import { storageService, calculateDaysRemaining } from '../../services/storage';
import { firestoreSyncService } from '../../services/firestoreSync';
import { useAuth } from '../../contexts/AuthContext';
import { soundService } from '../../services/sound';

interface PromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductWithBatches;
  allProducts: ProductWithBatches[];
  settings: StoreSettings;
  initialBatch?: Batch;
  initialDiscountPercent?: number;
  initialType?: PromotionType;
  onSavedPromotion?: (promotion: Promotion) => void;
}

export const PromotionModal: React.FC<PromotionModalProps> = ({
  isOpen,
  onClose,
  product,
  allProducts,
  settings,
  initialBatch,
  initialDiscountPercent,
  initialType = 'discount',
  onSavedPromotion,
}) => {
  const { userProfile } = useAuth();

  // Selected Lot / Batch
  const availableBatches = useMemo(() => {
    return product.batches.filter(b => b.quantity > 0);
  }, [product.batches]);

  const [selectedBatchId, setSelectedBatchId] = useState<string>(
    initialBatch?.id || availableBatches[0]?.id || ''
  );

  const selectedBatch = useMemo(() => {
    return availableBatches.find(b => b.id === selectedBatchId) || availableBatches[0] || initialBatch;
  }, [availableBatches, selectedBatchId, initialBatch]);

  // Tab: 'discount' (Descuento porcentual) | 'promo' (Formatos 2x1, 3x2, combos, etc.)
  const [activeMainTab, setActiveMainTab] = useState<'discount' | 'promo'>(
    initialType === 'discount' ? 'discount' : 'promo'
  );

  // Promotion Subtype
  const [promoSubtype, setPromoSubtype] = useState<PromotionType>(
    initialType === 'discount' ? 'discount' : initialType
  );

  // Discount Presets & Custom
  const DISCOUNT_PRESETS = [10, 15, 20, 25, 30, 40, 50];
  const [selectedDiscountPercent, setSelectedDiscountPercent] = useState<number>(
    initialDiscountPercent || 20
  );
  const [isCustomDiscount, setIsCustomDiscount] = useState<boolean>(
    initialDiscountPercent ? !DISCOUNT_PRESETS.includes(initialDiscountPercent) : false
  );
  const [customDiscountInput, setCustomDiscountInput] = useState<string>(
    initialDiscountPercent ? String(initialDiscountPercent) : '25'
  );

  // Special Price
  const [specialPriceInput, setSpecialPriceInput] = useState<string>('');

  // 2nd unit discount %
  const [secondUnitPercent, setSecondUnitPercent] = useState<number>(50);

  // Bulk tier discount
  const [bulkMinQty, setBulkMinQty] = useState<number>(3);
  const [bulkPricePerUnitInput, setBulkPricePerUnitInput] = useState<string>('');

  // Combos
  const [comboItems, setComboItems] = useState<PromotionComboItem[]>([]);
  const [comboPriceInput, setComboPriceInput] = useState<string>('');
  const [comboSelectedProductId, setComboSelectedProductId] = useState<string>('');

  // Customer message state
  const [clientMessage, setClientMessage] = useState<string>('');
  const [validUntilOption, setValidUntilOption] = useState<'stock' | 'date'>('stock');
  const [validUntilDate, setValidUntilDate] = useState<string>('');

  // Copy / Share states
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Regular price & cost price
  const regularPrice = product.salePrice && product.salePrice > 0 ? product.salePrice : 0;
  const costPrice = product.costPrice || selectedBatch?.costPrice;

  // Batch calculations
  const daysRemaining = selectedBatch ? calculateDaysRemaining(selectedBatch.expirationDate) : (product.daysRemaining ?? 999);
  const batchStock = selectedBatch ? selectedBatch.quantity : product.totalQuantity;

  // Set default validity date (e.g. batch expiration date if short)
  useEffect(() => {
    if (selectedBatch?.expirationDate) {
      setValidUntilDate(selectedBatch.expirationDate);
    }
  }, [selectedBatch?.expirationDate]);

  // Handle preset selection
  const handleSelectDiscountPreset = (pct: number) => {
    setIsCustomDiscount(false);
    setSelectedDiscountPercent(pct);
  };

  const handleCustomDiscountChange = (val: string) => {
    setCustomDiscountInput(val);
    const num = Number(val);
    if (!isNaN(num) && num >= 1 && num <= 90) {
      setSelectedDiscountPercent(num);
    }
  };

  // Calculations based on promo type
  const calculation = useMemo(() => {
    let effectivePromoPrice = 0;
    let effectiveDiscountPct = 0;
    let savingsAmount = 0;
    let totalBundleRegular = regularPrice;
    let descriptionLabel = '';

    if (activeMainTab === 'discount') {
      effectiveDiscountPct = selectedDiscountPercent;
      effectivePromoPrice = regularPrice > 0 ? Math.round(regularPrice * (1 - effectiveDiscountPct / 100)) : 0;
      savingsAmount = regularPrice > 0 ? regularPrice - effectivePromoPrice : 0;
      descriptionLabel = `${effectiveDiscountPct}% de descuento directo`;
    } else {
      switch (promoSubtype) {
        case '2x1':
          effectiveDiscountPct = 50;
          effectivePromoPrice = regularPrice > 0 ? Math.round(regularPrice / 2) : 0;
          savingsAmount = regularPrice; // Save 1 full unit price when buying 2
          descriptionLabel = 'Llevás 2 y pagás 1 (50% OFF promedio c/u)';
          break;

        case '3x2':
          effectiveDiscountPct = 33;
          effectivePromoPrice = regularPrice > 0 ? Math.round((regularPrice * 2) / 3) : 0;
          savingsAmount = regularPrice; // Save 1 full unit price when buying 3
          descriptionLabel = 'Llevás 3 y pagás 2 (33% OFF promedio c/u)';
          break;

        case 'second_unit_discount': {
          const discountOnSecond = secondUnitPercent;
          // Total for 2 = regularPrice + regularPrice * (1 - discountOnSecond/100)
          const totalForTwo = regularPrice + Math.round(regularPrice * (1 - discountOnSecond / 100));
          effectivePromoPrice = Math.round(totalForTwo / 2);
          effectiveDiscountPct = regularPrice > 0 ? Math.round(((regularPrice * 2 - totalForTwo) / (regularPrice * 2)) * 100) : 0;
          savingsAmount = Math.round(regularPrice * (discountOnSecond / 100));
          descriptionLabel = `2da unidad al ${discountOnSecond}% OFF (Total x2: $${totalForTwo.toLocaleString('es-AR')})`;
          break;
        }

        case 'special_price': {
          const specPrice = Number(specialPriceInput);
          if (!isNaN(specPrice) && specPrice > 0) {
            effectivePromoPrice = specPrice;
            savingsAmount = regularPrice > specPrice ? regularPrice - specPrice : 0;
            effectiveDiscountPct = regularPrice > 0 ? Math.round(((regularPrice - specPrice) / regularPrice) * 100) : 0;
          } else {
            effectivePromoPrice = regularPrice > 0 ? Math.round(regularPrice * 0.8) : 0;
            savingsAmount = regularPrice - effectivePromoPrice;
            effectiveDiscountPct = 20;
          }
          descriptionLabel = `Precio especial unitario de $${effectivePromoPrice.toLocaleString('es-AR')}`;
          break;
        }

        case 'combo': {
          totalBundleRegular = regularPrice;
          comboItems.forEach(ci => {
            totalBundleRegular += ci.regularPrice * ci.quantity;
          });
          const comboPrice = Number(comboPriceInput);
          if (!isNaN(comboPrice) && comboPrice > 0) {
            effectivePromoPrice = comboPrice;
            savingsAmount = totalBundleRegular > comboPrice ? totalBundleRegular - comboPrice : 0;
            effectiveDiscountPct = totalBundleRegular > 0 ? Math.round(((totalBundleRegular - comboPrice) / totalBundleRegular) * 100) : 0;
          } else {
            effectivePromoPrice = Math.round(totalBundleRegular * 0.8);
            savingsAmount = totalBundleRegular - effectivePromoPrice;
            effectiveDiscountPct = 20;
          }
          descriptionLabel = `Combo especial de ${1 + comboItems.length} artículos`;
          break;
        }

        case 'bulk_discount': {
          const bPrice = Number(bulkPricePerUnitInput);
          if (!isNaN(bPrice) && bPrice > 0) {
            effectivePromoPrice = bPrice;
            savingsAmount = regularPrice > bPrice ? regularPrice - bPrice : 0;
            effectiveDiscountPct = regularPrice > 0 ? Math.round(((regularPrice - bPrice) / regularPrice) * 100) : 0;
          } else {
            effectivePromoPrice = regularPrice > 0 ? Math.round(regularPrice * 0.85) : 0;
            savingsAmount = regularPrice - effectivePromoPrice;
            effectiveDiscountPct = 15;
          }
          descriptionLabel = `Llevando ${bulkMinQty}+ unidades a $${effectivePromoPrice.toLocaleString('es-AR')} c/u`;
          break;
        }

        default:
          effectivePromoPrice = regularPrice > 0 ? Math.round(regularPrice * 0.8) : 0;
          effectiveDiscountPct = 20;
          savingsAmount = regularPrice - effectivePromoPrice;
          descriptionLabel = 'Promoción especial';
      }
    }

    // Profit Margin & Cost Analysis
    let profitMarginPct: number | undefined = undefined;
    let isBelowCost = false;

    if (costPrice && costPrice > 0 && effectivePromoPrice > 0) {
      profitMarginPct = Math.round(((effectivePromoPrice - costPrice) / effectivePromoPrice) * 100);
      if (effectivePromoPrice < costPrice) {
        isBelowCost = true;
      }
    }

    // Total recoverable revenue from this lot
    const totalRecoverable = Math.round(effectivePromoPrice * batchStock);

    return {
      promoPrice: effectivePromoPrice,
      discountPct: effectiveDiscountPct,
      savingsAmount,
      totalBundleRegular,
      descriptionLabel,
      profitMarginPct,
      isBelowCost,
      totalRecoverable,
    };
  }, [
    activeMainTab,
    promoSubtype,
    selectedDiscountPercent,
    regularPrice,
    costPrice,
    secondUnitPercent,
    specialPriceInput,
    comboItems,
    comboPriceInput,
    bulkMinQty,
    bulkPricePerUnitInput,
    batchStock,
  ]);

  // Update dynamic customer message template
  useEffect(() => {
    const store = settings.storeName || 'Nuestro Comercio';
    let text = `🔥 *OFERTA EN ${store.toUpperCase()}*\n`;
    text += `📦 *${product.name}*\n\n`;

    if (activeMainTab === 'discount') {
      text += `🏷️ *${calculation.discountPct}% DE DESCUENTO*\n`;
      if (regularPrice > 0) {
        text += `• Precio Regular: ~$${regularPrice.toLocaleString('es-AR')}~\n`;
        text += `• *Precio Oferta: $${calculation.promoPrice.toLocaleString('es-AR')}* (Ahorrás $${calculation.savingsAmount.toLocaleString('es-AR')})\n`;
      }
    } else {
      switch (promoSubtype) {
        case '2x1':
          text += `⚡ *PROMO 2x1 (Llevás 2 y Pagás 1)*\n`;
          if (regularPrice > 0) {
            text += `• Pagás solo $${regularPrice.toLocaleString('es-AR')} por los 2 productos ($${calculation.promoPrice.toLocaleString('es-AR')} c/u)\n`;
          }
          break;
        case '3x2':
          text += `⚡ *PROMO 3x2 (Llevás 3 y Pagás 2)*\n`;
          if (regularPrice > 0) {
            text += `• Pagás solo $${(regularPrice * 2).toLocaleString('es-AR')} por los 3 productos ($${calculation.promoPrice.toLocaleString('es-AR')} c/u)\n`;
          }
          break;
        case 'second_unit_discount':
          text += `🏷️ *2da UNIDAD AL ${secondUnitPercent}% OFF*\n`;
          if (regularPrice > 0) {
            const secondPrice = Math.round(regularPrice * (1 - secondUnitPercent / 100));
            text += `• 1ra unidad: $${regularPrice.toLocaleString('es-AR')}\n`;
            text += `• 2da unidad: $${secondPrice.toLocaleString('es-AR')}\n`;
            text += `• Total por las 2: *$${(regularPrice + secondPrice).toLocaleString('es-AR')}* (Promedio $${calculation.promoPrice.toLocaleString('es-AR')} c/u)\n`;
          }
          break;
        case 'special_price':
          text += `🏷️ *PRECIO ESPECIAL: $${calculation.promoPrice.toLocaleString('es-AR')}*\n`;
          if (regularPrice > 0) {
            text += `• Antes: ~$${regularPrice.toLocaleString('es-AR')}~ (${calculation.discountPct}% OFF)\n`;
          }
          break;
        case 'combo':
          text += `🎁 *COMBO EXCLUSIVO:*\n`;
          text += `• 1x ${product.name}\n`;
          comboItems.forEach(ci => {
            text += `• ${ci.quantity}x ${ci.productName}\n`;
          });
          text += `💰 *Precio Combo: $${calculation.promoPrice.toLocaleString('es-AR')}* (Ahorrás $${calculation.savingsAmount.toLocaleString('es-AR')})\n`;
          break;
        case 'bulk_discount':
          text += `📦 *DESCUENTO POR CANTIDAD (${bulkMinQty}+ unidades)*\n`;
          text += `• Llevando ${bulkMinQty} o más pagás *$${calculation.promoPrice.toLocaleString('es-AR')}* cada una (${calculation.discountPct}% OFF)\n`;
          break;
      }
    }

    // Stock & Validity line
    if (batchStock > 0) {
      text += `\n⚡ *Stock disponible:* ${batchStock} ${product.unit}\n`;
    }

    if (validUntilOption === 'stock') {
      text += `⏳ *Vigencia:* Válido hasta agotar stock disponible.\n`;
    } else if (validUntilDate) {
      text += `⏳ *Vigencia:* Válido hasta el ${validUntilDate} o agotar stock.\n`;
    }

    text += `\n📍 ¡Pasá por el local o reservá el tuyo respondiendo este mensaje!`;

    setClientMessage(text);
  }, [
    product.name,
    product.unit,
    settings.storeName,
    activeMainTab,
    promoSubtype,
    calculation,
    regularPrice,
    secondUnitPercent,
    bulkMinQty,
    comboItems,
    batchStock,
    validUntilOption,
    validUntilDate,
  ]);

  if (!isOpen) return null;

  // Append emoji to message helper
  const handleInsertEmoji = (emoji: string) => {
    setClientMessage(prev => prev + ' ' + emoji);
  };

  // Add item to combo
  const handleAddComboItem = () => {
    if (!comboSelectedProductId) return;
    const target = allProducts.find(p => p.id === comboSelectedProductId);
    if (!target) return;

    const newItem: PromotionComboItem = {
      productId: target.id,
      productName: target.name,
      quantity: 1,
      regularPrice: target.salePrice || 0,
      unit: target.unit,
    };
    setComboItems([...comboItems, newItem]);
    setComboSelectedProductId('');
  };

  const handleRemoveComboItem = (index: number) => {
    setComboItems(comboItems.filter((_, i) => i !== index));
  };

  // Copy to clipboard
  const handleCopyMessage = () => {
    navigator.clipboard.writeText(clientMessage);
    soundService.playScanSuccess();
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2500);
  };

  // Share via WhatsApp direct
  const handleShareWhatsApp = () => {
    const encoded = encodeURIComponent(clientMessage);
    const url = `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Native Web Share API
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Promoción ${product.name} - ${settings.storeName}`,
          text: clientMessage,
        });
      } catch (err) {
        // User cancelled or share failed, fallback to copy
        handleCopyMessage();
      }
    } else {
      handleCopyMessage();
    }
  };

  // Save Promotion
  const handleSavePromotion = async (status: PromotionStatus = 'active') => {
    setIsSaving(true);
    try {
      const promoData: Omit<Promotion, 'id' | 'createdAt' | 'updatedAt'> = {
        storeId: userProfile?.storeId || undefined,
        title: `${product.name} - ${calculation.descriptionLabel}`,
        type: activeMainTab === 'discount' ? 'discount' : promoSubtype,
        status,
        productId: product.id,
        productName: product.name,
        productCategory: product.category,
        productBarcode: product.barcode,
        productImageUrl: product.imageUrl,
        unit: product.unit,
        batchId: selectedBatch?.id,
        batchExpirationDate: selectedBatch?.expirationDate,
        batchDaysRemaining: daysRemaining,
        availableStock: batchStock,
        regularPrice,
        costPrice,
        discountPercentage: calculation.discountPct,
        discountAmount: calculation.savingsAmount,
        promoPrice: calculation.promoPrice,
        secondUnitDiscountPercentage: promoSubtype === 'second_unit_discount' ? secondUnitPercent : undefined,
        bulkMinQuantity: promoSubtype === 'bulk_discount' ? bulkMinQty : undefined,
        bulkPricePerUnit: promoSubtype === 'bulk_discount' ? calculation.promoPrice : undefined,
        comboItems: promoSubtype === 'combo' ? comboItems : undefined,
        urgencyLevel: daysRemaining <= 1 ? 'critical' : daysRemaining <= 3 ? 'high' : daysRemaining <= 7 ? 'medium' : 'normal',
        profitMarginPercent: calculation.profitMarginPct,
        isBelowCost: calculation.isBelowCost,
        totalRecoverableRevenue: calculation.totalRecoverable,
        message: clientMessage,
        storeName: settings.storeName,
        validUntilText: validUntilOption === 'stock' ? 'Hasta agotar stock' : `Hasta el ${validUntilDate}`,
      };

      // 1. Save in local storage (demo mode or local cache)
      const saved = storageService.savePromotion(promoData);

      // 2. Save in Firestore if user is logged in and not in demo mode
      if (userProfile?.storeId && !storageService.isDemoActive()) {
        await firestoreSyncService.savePromotion(userProfile.storeId, saved);
      }

      soundService.playScanSuccess();
      setSaveSuccessMessage('¡Promoción guardada con éxito!');
      if (onSavedPromotion) {
        onSavedPromotion(saved);
      }
      setTimeout(() => {
        setSaveSuccessMessage(null);
        onClose();
      }, 1400);
    } catch (err) {
      console.error('Error saving promotion:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white border border-[#E7EBE5] rounded-3xl shadow-2xl my-auto overflow-hidden flex flex-col max-h-[95vh]">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-[#E7EBE5] flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#EAF3EC] text-[#246B4D] flex items-center justify-center shrink-0">
              <Tag className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#246B4D] block truncate">
                GENERADOR DE PROMOCIONES
              </span>
              <h2 className="text-base sm:text-lg font-bold text-[#174A36] truncate">
                {product.name}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-2xl text-[#78847C] hover:text-[#174A36] hover:bg-[#F8F9F6] transition shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-sm text-[#24372F]">
          
          {/* Product & Batch Summary Card */}
          <div className="p-4 rounded-2xl bg-[#F8F9F6] border border-[#E7EBE5] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-12 h-12 rounded-xl object-cover border border-[#E7EBE5] bg-white shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-white border border-[#E7EBE5] flex items-center justify-center text-[#78847C] shrink-0">
                    <Package className="w-6 h-6 opacity-60" />
                  </div>
                )}
                <div>
                  <div className="text-xs text-[#78847C] flex items-center gap-2">
                    <span>{product.category}</span>
                    {product.brand && (
                      <>
                        <span>•</span>
                        <span className="font-medium text-[#174A36]">{product.brand}</span>
                      </>
                    )}
                  </div>
                  <div className="text-sm font-bold text-[#174A36] font-mono mt-0.5">
                    {regularPrice > 0 ? (
                      <span>Precio regular: ${regularPrice.toLocaleString('es-AR')}</span>
                    ) : (
                      <span className="text-[#A66B16] text-xs">⚠️ Sin precio de venta asignado</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Batch Selector if multiple, or single batch info */}
              {availableBatches.length > 1 ? (
                <div className="w-full sm:w-auto">
                  <label htmlFor="batch-select" className="block text-[11px] font-semibold text-[#78847C] mb-1">
                    Lote a promocionar:
                  </label>
                  <select
                    id="batch-select"
                    value={selectedBatchId}
                    onChange={e => setSelectedBatchId(e.target.value)}
                    className="w-full sm:w-auto px-3 py-1.5 rounded-xl border border-[#E7EBE5] bg-white text-xs font-mono font-semibold text-[#174A36] focus:outline-none focus:border-[#246B4D]"
                  >
                    {availableBatches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.lotNumber ? `Lote ${b.lotNumber}` : 'Lote'} (Vence: {b.expirationDate} - {b.quantity} {product.unit})
                      </option>
                    ))}
                  </select>
                </div>
              ) : selectedBatch ? (
                <div className="flex items-center gap-2 text-xs font-mono self-start sm:self-auto">
                  <span className="px-2.5 py-1 rounded-xl bg-white border border-[#E7EBE5] text-[#78847C]">
                    Lote: <strong className="text-[#174A36]">{selectedBatch.lotNumber || 'General'}</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-white border border-[#E7EBE5] text-[#78847C]">
                    Stock: <strong className="text-[#174A36]">{selectedBatch.quantity} {product.unit}</strong>
                  </span>
                </div>
              ) : null}
            </div>

            {/* Smart Expiration Urgency Strip */}
            {selectedBatch && (
              <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                daysRemaining <= 1 
                  ? 'bg-[#FFF8F7] border-[#FCEBE5] text-[#C6533A]' 
                  : daysRemaining <= 3 
                  ? 'bg-[#FFFCF5] border-[#FFF3D9] text-[#A66B16]' 
                  : 'bg-[#EAF3EC] border-[#D5E8D7] text-[#246B4D]'
              }`}>
                <Flame className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold">
                    {daysRemaining < 0
                      ? `Lote vencido hace ${Math.abs(daysRemaining)} días`
                      : daysRemaining === 0
                      ? '¡Lote vence HOY!'
                      : daysRemaining === 1
                      ? 'Lote vence MAÑANA (1 día restante)'
                      : `Lote vence en ${daysRemaining} días (${selectedBatch.expirationDate})`}
                  </span>
                  <p className="mt-0.5 opacity-90 leading-relaxed text-[11px]">
                    {daysRemaining <= 1
                      ? 'Recomendamos descuento urgente de 40% a 50% OFF o 2x1 para recuperar el capital invertido antes del descarte.'
                      : daysRemaining <= 3
                      ? 'Recomendamos descuento de 25% a 30% OFF o 2da al 70% para acelerar su rotación en góndola.'
                      : daysRemaining <= 7
                      ? 'Promoción preventiva sugerida: 15% a 20% OFF o 3x2 para estimular compra rápida antes del fin de semana.'
                      : 'Stock con margen de rotación. Podés crear descuentos por cantidad o combos para aumentar el ticket promedio.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Regular Price Warning if missing */}
          {regularPrice === 0 && (
            <div className="p-3.5 rounded-2xl bg-[#FFF8F7] border border-[#FCEBE5] text-xs text-[#C6533A] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                Este producto no tiene precio de venta asignado en el inventario. Definilo en su ficha para que los cálculos de descuento sean exactos.
              </span>
            </div>
          )}

          {/* Mode Tabs: "Descuento" vs "Promoción" */}
          <div className="space-y-4">
            <div className="flex p-1 bg-[#F8F9F6] border border-[#E7EBE5] rounded-2xl">
              <button
                type="button"
                onClick={() => setActiveMainTab('discount')}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                  activeMainTab === 'discount'
                    ? 'bg-white text-[#246B4D] shadow-xs border border-[#E7EBE5]'
                    : 'text-[#78847C] hover:text-[#174A36]'
                }`}
              >
                <Percent className="w-4 h-4" />
                <span>Descuento %</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMainTab('promo')}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                  activeMainTab === 'promo'
                    ? 'bg-white text-[#246B4D] shadow-xs border border-[#E7EBE5]'
                    : 'text-[#78847C] hover:text-[#174A36]'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Formatos Comerciales (2x1, Combos...)</span>
              </button>
            </div>

            {/* TAB 1: DESCUENTO DIRECTO */}
            {activeMainTab === 'discount' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div>
                  <span className="text-xs font-semibold text-[#174A36] block mb-2">
                    Elegí el porcentaje de descuento:
                  </span>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {DISCOUNT_PRESETS.map(pct => {
                      const isSelected = !isCustomDiscount && selectedDiscountPercent === pct;
                      return (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => handleSelectDiscountPreset(pct)}
                          className={`py-2.5 rounded-xl text-xs font-bold font-mono transition border min-h-[44px] flex items-center justify-center ${
                            isSelected
                              ? 'bg-[#246B4D] text-white border-[#246B4D] shadow-xs'
                              : 'bg-white border-[#E7EBE5] text-[#174A36] hover:bg-[#F8F9F6]'
                          }`}
                        >
                          {pct}% OFF
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom discount button and field */}
                <div className="p-3.5 rounded-2xl bg-[#F8F9F6] border border-[#E7EBE5] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="custom-discount" className="text-xs font-semibold text-[#174A36]">
                      O definir porcentaje personalizado:
                    </label>
                    <span className="text-[11px] text-[#78847C] font-mono">Entre 1% y 90%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <input
                        id="custom-discount"
                        type="number"
                        min="1"
                        max="90"
                        value={isCustomDiscount ? customDiscountInput : ''}
                        placeholder={String(selectedDiscountPercent)}
                        onFocus={() => setIsCustomDiscount(true)}
                        onChange={e => handleCustomDiscountChange(e.target.value)}
                        className="w-full px-4 py-2 bg-white border border-[#E7EBE5] rounded-xl text-sm font-mono text-[#174A36] focus:outline-none focus:border-[#246B4D]"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-[#78847C]">
                        %
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsCustomDiscount(true)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition min-h-[40px] ${
                        isCustomDiscount 
                          ? 'bg-[#246B4D] text-white' 
                          : 'bg-white border border-[#E7EBE5] text-[#78847C]'
                      }`}
                    >
                      Aplicar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: FORMATOS COMERCIALES */}
            {activeMainTab === 'promo' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <span className="text-xs font-semibold text-[#174A36] block">
                  Seleccioná el tipo de formato comercial:
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPromoSubtype('2x1')}
                    className={`p-3 rounded-2xl border text-left transition ${
                      promoSubtype === '2x1'
                        ? 'bg-[#EAF3EC] border-[#246B4D] text-[#174A36]'
                        : 'bg-white border-[#E7EBE5] text-[#78847C] hover:bg-[#F8F9F6]'
                    }`}
                  >
                    <div className="font-bold text-sm text-[#174A36]">2x1</div>
                    <div className="text-[11px] text-[#78847C] mt-0.5">Llevás 2 y pagás 1</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPromoSubtype('3x2')}
                    className={`p-3 rounded-2xl border text-left transition ${
                      promoSubtype === '3x2'
                        ? 'bg-[#EAF3EC] border-[#246B4D] text-[#174A36]'
                        : 'bg-white border-[#E7EBE5] text-[#78847C] hover:bg-[#F8F9F6]'
                    }`}
                  >
                    <div className="font-bold text-sm text-[#174A36]">3x2</div>
                    <div className="text-[11px] text-[#78847C] mt-0.5">Llevás 3 y pagás 2</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPromoSubtype('second_unit_discount')}
                    className={`p-3 rounded-2xl border text-left transition ${
                      promoSubtype === 'second_unit_discount'
                        ? 'bg-[#EAF3EC] border-[#246B4D] text-[#174A36]'
                        : 'bg-white border-[#E7EBE5] text-[#78847C] hover:bg-[#F8F9F6]'
                    }`}
                  >
                    <div className="font-bold text-sm text-[#174A36]">2da al {secondUnitPercent}%</div>
                    <div className="text-[11px] text-[#78847C] mt-0.5">Segunda unidad rebajada</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPromoSubtype('special_price')}
                    className={`p-3 rounded-2xl border text-left transition ${
                      promoSubtype === 'special_price'
                        ? 'bg-[#EAF3EC] border-[#246B4D] text-[#174A36]'
                        : 'bg-white border-[#E7EBE5] text-[#78847C] hover:bg-[#F8F9F6]'
                    }`}
                  >
                    <div className="font-bold text-sm text-[#174A36]">Precio Especial</div>
                    <div className="text-[11px] text-[#78847C] mt-0.5">Fijar precio promo unitario</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPromoSubtype('combo')}
                    className={`p-3 rounded-2xl border text-left transition ${
                      promoSubtype === 'combo'
                        ? 'bg-[#EAF3EC] border-[#246B4D] text-[#174A36]'
                        : 'bg-white border-[#E7EBE5] text-[#78847C] hover:bg-[#F8F9F6]'
                    }`}
                  >
                    <div className="font-bold text-sm text-[#174A36]">Combo</div>
                    <div className="text-[11px] text-[#78847C] mt-0.5">Armar pack con otros items</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPromoSubtype('bulk_discount')}
                    className={`p-3 rounded-2xl border text-left transition ${
                      promoSubtype === 'bulk_discount'
                        ? 'bg-[#EAF3EC] border-[#246B4D] text-[#174A36]'
                        : 'bg-white border-[#E7EBE5] text-[#78847C] hover:bg-[#F8F9F6]'
                    }`}
                  >
                    <div className="font-bold text-sm text-[#174A36]">Por Cantidad</div>
                    <div className="text-[11px] text-[#78847C] mt-0.5">Escala por volumen</div>
                  </button>
                </div>

                {/* Subtype details configuration */}
                {promoSubtype === 'second_unit_discount' && (
                  <div className="p-4 rounded-2xl bg-[#F8F9F6] border border-[#E7EBE5] space-y-2">
                    <span className="text-xs font-semibold text-[#174A36] block">
                      Descuento en la 2da unidad:
                    </span>
                    <div className="flex gap-2">
                      {[50, 70, 80].map(pct => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setSecondUnitPercent(pct)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition border ${
                            secondUnitPercent === pct
                              ? 'bg-[#246B4D] text-white border-[#246B4D]'
                              : 'bg-white border-[#E7EBE5] text-[#174A36]'
                          }`}
                        >
                          2da al {pct}% OFF
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {promoSubtype === 'special_price' && (
                  <div className="p-4 rounded-2xl bg-[#F8F9F6] border border-[#E7EBE5] space-y-2">
                    <label htmlFor="special-price-input" className="text-xs font-semibold text-[#174A36] block">
                      Precio promocional por unidad ($):
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-[#78847C]">$</span>
                      <input
                        id="special-price-input"
                        type="number"
                        step="any"
                        placeholder={regularPrice > 0 ? String(Math.round(regularPrice * 0.8)) : '0'}
                        value={specialPriceInput}
                        onChange={e => setSpecialPriceInput(e.target.value)}
                        className="w-full px-4 py-2 bg-white border border-[#E7EBE5] rounded-xl text-sm font-mono text-[#174A36] focus:outline-none focus:border-[#246B4D]"
                      />
                    </div>
                    {regularPrice > 0 && (
                      <p className="text-[11px] text-[#78847C] font-mono">
                        Precio regular: ${regularPrice.toLocaleString('es-AR')}
                      </p>
                    )}
                  </div>
                )}

                {promoSubtype === 'bulk_discount' && (
                  <div className="p-4 rounded-2xl bg-[#F8F9F6] border border-[#E7EBE5] space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="bulk-min-qty" className="text-xs font-semibold text-[#174A36] block mb-1">
                          Llevando mínimo:
                        </label>
                        <input
                          id="bulk-min-qty"
                          type="number"
                          min="2"
                          value={bulkMinQty}
                          onChange={e => setBulkMinQty(Math.max(2, Number(e.target.value)))}
                          className="w-full px-3 py-2 bg-white border border-[#E7EBE5] rounded-xl text-xs font-mono text-[#174A36] focus:outline-none focus:border-[#246B4D]"
                        />
                      </div>
                      <div>
                        <label htmlFor="bulk-unit-price" className="text-xs font-semibold text-[#174A36] block mb-1">
                          Pagan por unidad ($):
                        </label>
                        <input
                          id="bulk-unit-price"
                          type="number"
                          placeholder={regularPrice > 0 ? String(Math.round(regularPrice * 0.85)) : '0'}
                          value={bulkPricePerUnitInput}
                          onChange={e => setBulkPricePerUnitInput(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-[#E7EBE5] rounded-xl text-xs font-mono text-[#174A36] focus:outline-none focus:border-[#246B4D]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {promoSubtype === 'combo' && (
                  <div className="p-4 rounded-2xl bg-[#F8F9F6] border border-[#E7EBE5] space-y-3">
                    <span className="text-xs font-semibold text-[#174A36] block">
                      Sumar productos del inventario al Combo:
                    </span>

                    {/* Selector of other items */}
                    <div className="flex gap-2">
                      <select
                        value={comboSelectedProductId}
                        onChange={e => setComboSelectedProductId(e.target.value)}
                        className="flex-1 px-3 py-2 bg-white border border-[#E7EBE5] rounded-xl text-xs text-[#174A36] focus:outline-none focus:border-[#246B4D]"
                      >
                        <option value="">Seleccionar producto adicional...</option>
                        {allProducts
                          .filter(p => p.id !== product.id && p.totalQuantity > 0)
                          .map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} (${p.salePrice?.toLocaleString('es-AR') || 'Sin precio'} - Stock: {p.totalQuantity})
                            </option>
                          ))}
                      </select>

                      <button
                        type="button"
                        onClick={handleAddComboItem}
                        disabled={!comboSelectedProductId}
                        className="px-4 py-2 bg-[#246B4D] hover:bg-[#174A36] disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Sumar</span>
                      </button>
                    </div>

                    {/* Combo Item List */}
                    <div className="space-y-1.5 pt-1">
                      <div className="p-2.5 rounded-xl bg-white border border-[#E7EBE5] text-xs flex justify-between items-center font-mono">
                        <span>1x {product.name} (Principal)</span>
                        <span className="font-bold text-[#174A36]">${regularPrice.toLocaleString('es-AR')}</span>
                      </div>

                      {comboItems.map((ci, idx) => (
                        <div key={ci.productId + idx} className="p-2.5 rounded-xl bg-white border border-[#E7EBE5] text-xs flex justify-between items-center font-mono">
                          <div className="flex items-center gap-2">
                            <span>{ci.quantity}x {ci.productName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#174A36]">${(ci.regularPrice * ci.quantity).toLocaleString('es-AR')}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveComboItem(idx)}
                              className="text-[#C6533A] hover:bg-[#FFF8F7] p-1 rounded-lg"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-[#E7EBE5]">
                      <label htmlFor="combo-price-input" className="text-xs font-semibold text-[#174A36] block mb-1">
                        Precio final del Combo ($):
                      </label>
                      <input
                        id="combo-price-input"
                        type="number"
                        placeholder={String(Math.round(calculation.totalBundleRegular * 0.8))}
                        value={comboPriceInput}
                        onChange={e => setComboPriceInput(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#E7EBE5] rounded-xl text-xs font-mono text-[#174A36] focus:outline-none focus:border-[#246B4D]"
                      />
                      <p className="text-[11px] text-[#78847C] font-mono mt-1">
                        Suma regular de artículos: ${calculation.totalBundleRegular.toLocaleString('es-AR')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Real-Time Financial & Profit Margin Indicator */}
          <div className="p-4 rounded-2xl bg-white border border-[#E7EBE5] space-y-3 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#78847C] flex items-center justify-between">
              <span>BALANCE Y RECUPERO CALCULADO</span>
              <span className="font-mono text-[#246B4D]">{calculation.descriptionLabel}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              <div className="p-3 rounded-xl bg-[#F8F9F6] border border-[#E7EBE5] text-center">
                <span className="text-[11px] text-[#78847C] block">Precio Regular</span>
                <span className="text-sm font-bold font-mono text-[#78847C] line-through">
                  ${regularPrice.toLocaleString('es-AR')}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#F8F9F6] border border-[#E7EBE5] text-center">
                <span className="text-[11px] text-[#78847C] block">Descuento</span>
                <span className="text-sm font-bold font-mono text-[#246B4D]">
                  {calculation.discountPct}% OFF
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#EAF3EC] border border-[#D5E8D7] text-center">
                <span className="text-[11px] text-[#246B4D] block font-semibold">Precio Promo</span>
                <span className="text-base font-extrabold font-mono text-[#174A36]">
                  ${calculation.promoPrice.toLocaleString('es-AR')}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#F8F9F6] border border-[#E7EBE5] text-center">
                <span className="text-[11px] text-[#78847C] block">Recupero del Lote</span>
                <span className="text-sm font-bold font-mono text-[#174A36]">
                  ${calculation.totalRecoverable.toLocaleString('es-AR')}
                </span>
              </div>
            </div>

            {/* Cost & Profit Margin Analysis */}
            {costPrice && costPrice > 0 ? (
              <div className={`p-3 rounded-xl border text-xs flex items-center justify-between font-mono ${
                calculation.isBelowCost
                  ? 'bg-[#FFF8F7] border-[#FCEBE5] text-[#C6533A]'
                  : 'bg-[#F8F9F6] border-[#E7EBE5] text-[#174A36]'
              }`}>
                <div className="flex items-center gap-2">
                  {calculation.isBelowCost ? (
                    <ShieldAlert className="w-4 h-4 text-[#C6533A] shrink-0" />
                  ) : (
                    <TrendingUp className="w-4 h-4 text-[#246B4D] shrink-0" />
                  )}
                  <span>
                    Precio de costo: <strong>${costPrice.toLocaleString('es-AR')}</strong>
                  </span>
                </div>
                <div>
                  {calculation.isBelowCost ? (
                    <span className="font-bold text-[#C6533A]">
                      ⚠️ Por debajo del costo (Liquidación para rescate)
                    </span>
                  ) : (
                    <span className="font-bold text-[#246B4D]">
                      Margen estimado: +{calculation.profitMarginPct}%
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-[#78847C] flex items-center gap-1.5 pt-0.5">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Precio de costo no registrado. El cálculo no afirma márgenes irreales y se basa exactamente en el precio de venta.
                </span>
              </div>
            )}
          </div>

          {/* Section: "Mensaje para tus clientes" (Copy Generator) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#F8F9F6] border border-[#E7EBE5] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-[#246B4D]" />
                <h3 className="text-xs font-bold text-[#174A36] uppercase tracking-wider">
                  MENSAJE LISTO PARA CLIENTES Y WHATSAPP
                </h3>
              </div>

              {/* Emoji bar */}
              <div className="flex items-center gap-1">
                {['🔥', '🏷️', '⚡', '📍', '⏳', '🛒'].map(emo => (
                  <button
                    key={emo}
                    type="button"
                    onClick={() => handleInsertEmoji(emo)}
                    className="p-1 rounded-lg bg-white border border-[#E7EBE5] hover:bg-[#EAF3EC] text-xs transition"
                    title={`Insertar ${emo}`}
                  >
                    {emo}
                  </button>
                ))}
              </div>
            </div>

            {/* Editable message textarea */}
            <textarea
              rows={8}
              value={clientMessage}
              onChange={e => setClientMessage(e.target.value)}
              className="w-full p-3.5 bg-white border border-[#E7EBE5] rounded-xl text-xs sm:text-sm font-sans text-[#174A36] leading-relaxed focus:outline-none focus:border-[#246B4D] resize-y"
              placeholder="El texto para compartir con tus clientes aparecerá aquí..."
            />

            {/* Validity selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[#78847C] font-semibold">Vigencia del texto:</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="validity"
                    checked={validUntilOption === 'stock'}
                    onChange={() => setValidUntilOption('stock')}
                    className="text-[#246B4D] focus:ring-[#246B4D]"
                  />
                  <span>Hasta agotar stock</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer ml-2">
                  <input
                    type="radio"
                    name="validity"
                    checked={validUntilOption === 'date'}
                    onChange={() => setValidUntilOption('date')}
                    className="text-[#246B4D] focus:ring-[#246B4D]"
                  />
                  <span>Hasta fecha</span>
                </label>
              </div>

              {validUntilOption === 'date' && (
                <input
                  type="date"
                  value={validUntilDate}
                  onChange={e => setValidUntilDate(e.target.value)}
                  className="px-2.5 py-1 bg-white border border-[#E7EBE5] rounded-xl text-xs font-mono text-[#174A36]"
                />
              )}
            </div>
          </div>

          {/* Success Banner */}
          {saveSuccessMessage && (
            <div className="p-3.5 rounded-2xl bg-[#EAF3EC] border border-[#D5E8D7] text-xs font-semibold text-[#246B4D] flex items-center gap-2 animate-in fade-in">
              <BookmarkCheck className="w-5 h-5 shrink-0" />
              <span>{saveSuccessMessage}</span>
            </div>
          )}

          {/* Non-destructive guarantee badge */}
          <div className="text-[11px] text-[#78847C] bg-white border border-[#E7EBE5] p-3 rounded-2xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#246B4D] shrink-0" />
            <span>
              <strong>Garantía de inventario:</strong> Crear o compartir esta promoción <strong>no modifica</strong> el precio regular ni descuenta el stock de tu inventario.
            </span>
          </div>
        </div>

        {/* Modal Bottom Actions Bar */}
        <div className="p-4 sm:p-5 border-t border-[#E7EBE5] bg-[#F8F9F6] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-2xl border border-[#E7EBE5] bg-white hover:bg-[#F8F9F6] text-xs font-bold text-[#78847C] transition min-h-[44px]"
          >
            Cancelar
          </button>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopyMessage}
              className="px-4 py-2.5 rounded-2xl border border-[#E7EBE5] bg-white hover:bg-[#F8F9F6] text-xs font-bold text-[#174A36] transition flex items-center justify-center gap-1.5 min-h-[44px] active:scale-95 shadow-xs"
            >
              {copiedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-[#246B4D] stroke-[2.5]" />
                  <span className="text-[#246B4D]">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[#78847C]" />
                  <span>Copiar mensaje</span>
                </>
              )}
            </button>

            {/* WhatsApp Share Button */}
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="px-4 py-2.5 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 min-h-[44px] active:scale-95 shadow-xs"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>Enviar por WhatsApp</span>
            </button>

            {/* Native Share button if mobile supported */}
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="px-3.5 py-2.5 rounded-2xl border border-[#E7EBE5] bg-white hover:bg-[#F8F9F6] text-xs font-bold text-[#174A36] transition flex items-center justify-center gap-1.5 min-h-[44px] active:scale-95 shadow-xs"
                title="Compartir en otras aplicaciones"
              >
                <Share2 className="w-4 h-4 text-[#246B4D]" />
              </button>
            )}

            {/* Save Promotion Button */}
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSavePromotion('active')}
              className="px-5 py-2.5 rounded-2xl bg-[#246B4D] hover:bg-[#174A36] disabled:opacity-50 text-white text-xs font-bold transition flex items-center justify-center gap-2 min-h-[44px] active:scale-95 shadow-xs"
            >
              <BookmarkCheck className="w-4 h-4 stroke-[2.2]" />
              <span>{isSaving ? 'Guardando...' : 'Guardar promoción'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
