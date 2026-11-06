import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Plus, 
  ChevronRight, 
  Tag, 
  Check, 
  Layers, 
  Sparkles, 
  Camera, 
  Eye, 
  RotateCcw,
  CheckCheck
} from 'lucide-react';
import { 
  ProductWithBatches, 
  BatchWithProduct, 
  SalesSuggestion, 
  ActiveTab, 
  StoreSettings, 
  Batch, 
  PromotionType,
  RecommendationStatus
} from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { storageService } from '../../services/storage';
import { firestoreSyncService, reportSyncError } from '../../services/firestoreSync';
import { soundService } from '../../services/sound';
import { ResolveRecommendationModal } from './ResolveRecommendationModal';

interface DashboardViewProps {
  productsWithBatches: ProductWithBatches[];
  batchesWithProduct: BatchWithProduct[];
  suggestions: SalesSuggestion[];
  settings: StoreSettings;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenScan: () => void;
  onOpenManualAdd: () => void;
  onSelectProduct: (product: ProductWithBatches) => void;
  onRefresh: () => void;
  isDemoMode?: boolean;
  onOpenDemo?: () => void;
  onExitDemo?: () => void;
  onOpenPromotion?: (product: ProductWithBatches, batch?: Batch, discount?: number, type?: PromotionType) => void;
  onOpenSavedPromotions?: () => void;
  onOpenExcelImport?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  productsWithBatches,
  batchesWithProduct,
  suggestions,
  settings,
  setActiveTab,
  onOpenScan,
  onOpenManualAdd,
  onSelectProduct,
  onRefresh,
  isDemoMode = false,
  onOpenDemo,
  onExitDemo,
  onOpenPromotion,
  onOpenSavedPromotions,
  onOpenExcelImport,
}) => {
  const { userProfile } = useAuth();
  const [actionFilter, setActionFilter] = useState<'pending' | 'resolved'>('pending');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [processingQuickReviewId, setProcessingQuickReviewId] = useState<string | null>(null);
  const [itemToResolve, setItemToResolve] = useState<{ product: ProductWithBatches; batch: Batch } | null>(null);

  // Active batches with stock > 0
  const activeBatches = useMemo(() => {
    return batchesWithProduct.filter(b => b.quantity > 0);
  }, [batchesWithProduct]);

  // =========================================================================
  // EVALUACIÓN DE ACCIONES RECOMENDADAS & ESTADOS REALES
  // Estados admitidos:
  // - 'pending': requiere atención urgente del comerciante.
  // - 'promotion_created': cuenta con una promoción activa para acelerar rotación.
  // - 'reviewed': verificado y confirmado por el comerciante.
  // - 'resolved' / 'dismissed': resuelto o descartado.
  // =========================================================================
  const allActionItems = useMemo(() => {
    const activePromotions = storageService.getPromotions().filter(p => p.status === 'active');
    const allReviews = storageService.getReviews();

    const items: {
      product: ProductWithBatches;
      batch: Batch;
      daysRemaining: number;
      isExpired: boolean;
      statusBadgeText: string;
      statusBadgeClass: string;
      accentBorderClass: string;
      bulletColorClass: string;
      dateFormattedText: string;
      recommendation: string;
      suggestedDiscount: number;
      suggestedType: PromotionType;
      recommendationStatus: RecommendationStatus;
      reviewNotes?: string;
      reviewDate?: string;
    }[] = [];

    const formatDayMonth = (dateStr: string) => {
      if (!dateStr) return '';
      const parts = dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
      const m = months[parseInt(parts[1], 10) - 1] || parts[1];
      return `${parseInt(parts[2], 10)} ${m}`;
    };

    for (const prod of productsWithBatches) {
      if (!prod.batches || prod.batches.length === 0) continue;

      const activeProdBatches = prod.batches
        .filter(b => b.quantity > 0)
        .sort((a, b) => a.expirationDate.localeCompare(b.expirationDate));

      if (activeProdBatches.length === 0) continue;

      const earliestBatch = activeProdBatches[0];
      const days = prod.daysRemaining ?? 999;

      if (days <= 7) {
        const isExpired = days < 0;
        const shortDate = formatDayMonth(earliestBatch.expirationDate);

        // Check active promotion for this product/batch
        const activePromo = activePromotions.find(
          p => p.productId === prod.id && (!p.batchId || p.batchId === earliestBatch.id)
        );

        // Check review record for this specific product batch & expiration
        const matchedReview = allReviews.find(
          r => r.productId === prod.id && 
               (!r.batchId || r.batchId === earliestBatch.id) &&
               (!r.batchExpirationDate || r.batchExpirationDate === earliestBatch.expirationDate)
        );

        // Compute clear recommendation status
        let recommendationStatus: RecommendationStatus = 'pending';
        if (activePromo) {
          recommendationStatus = 'promotion_created';
        } else if (matchedReview && (matchedReview.status === 'reviewed' || matchedReview.status === 'resolved')) {
          recommendationStatus = matchedReview.status;
        } else if (matchedReview && matchedReview.status === 'dismissed') {
          recommendationStatus = 'dismissed';
        } else if (prod.lastReviewedStatus === 'reviewed' && prod.lastReviewedExpirationDate === earliestBatch.expirationDate) {
          recommendationStatus = 'reviewed';
        }

        // Visual badges and recommendation copy based on status and urgency
        let statusBadgeText = '• Próximo';
        let statusBadgeClass = 'bg-[#FEF7EC] text-[#D99B26]';
        let accentBorderClass = 'border-l-4 border-l-[#D99B26]';
        let bulletColorClass = 'border-[#D99B26] text-[#D99B26]';
        let dateFormattedText = `Vence en ${days} días  ·  ${shortDate}`;
        let recommendation = 'Descuento sugerido: 20%.';
        let suggestedDiscount = 20;
        let suggestedType: PromotionType = 'discount';

        if (recommendationStatus === 'promotion_created') {
          statusBadgeText = '• Promoción creada';
          statusBadgeClass = 'bg-[#EAF3EC] text-[#246B4F] font-bold';
          accentBorderClass = 'border-l-4 border-l-[#246B4F]';
          bulletColorClass = 'border-[#246B4F] text-[#246B4F]';
          recommendation = activePromo ? `Promo activa: ${activePromo.title}` : 'Promoción comercial activa para acelerar rotación.';
        } else if (recommendationStatus === 'reviewed') {
          statusBadgeText = '• Revisado';
          statusBadgeClass = 'bg-[#F0F5F2] text-[#173F35] font-semibold';
          accentBorderClass = 'border-l-4 border-l-[#5C6861]';
          bulletColorClass = 'border-[#5C6861] text-[#5C6861]';
          recommendation = matchedReview?.notes || 'Producto verificado por el comercio.';
        } else if (isExpired) {
          statusBadgeText = '• Vencido';
          statusBadgeClass = 'bg-[#F5F5F3] text-[#7A8580]';
          accentBorderClass = 'border-l-4 border-l-[#A0A8A3]';
          bulletColorClass = 'border-[#A0A8A3] text-[#A0A8A3]';
          dateFormattedText = `Venció el ${shortDate}  ·  ${shortDate}`;
          recommendation = 'Retirar del stock. No vender.';
          suggestedDiscount = 0;
          suggestedType = 'discount';
        } else if (days <= 2) {
          statusBadgeText = '• Urgente';
          statusBadgeClass = 'bg-[#FDF0EB] text-[#D95D39]';
          accentBorderClass = 'border-l-4 border-l-[#D95D39]';
          bulletColorClass = 'border-[#D95D39] text-[#D95D39]';
          if (days === 0) {
            dateFormattedText = `Vence hoy  ·  ${shortDate}`;
            recommendation = 'Descuento sugerido: 30% o 2x1.';
            suggestedDiscount = 30;
            suggestedType = '2x1';
          } else if (days === 1) {
            dateFormattedText = `Vence en 1 día  ·  ${shortDate}`;
            recommendation = 'Descuento sugerido: 30% o 2x1.';
            suggestedDiscount = 30;
            suggestedType = 'discount';
          } else {
            dateFormattedText = `Vence en 2 días  ·  ${shortDate}`;
            recommendation = 'Descuento sugerido: 20%.';
            suggestedDiscount = 20;
            suggestedType = 'discount';
          }
        }

        const matchedSuggestion = suggestions.find(s => s.productId === prod.id);
        if (matchedSuggestion && matchedSuggestion.recommendation && !isExpired && recommendationStatus === 'pending') {
          recommendation = matchedSuggestion.recommendation;
          if (matchedSuggestion.type === 'pack_promo') {
            suggestedType = '2x1';
          }
        }

        items.push({
          product: prod,
          batch: earliestBatch,
          daysRemaining: days,
          isExpired,
          statusBadgeText,
          statusBadgeClass,
          accentBorderClass,
          bulletColorClass,
          dateFormattedText,
          recommendation,
          suggestedDiscount,
          suggestedType,
          recommendationStatus,
          reviewNotes: matchedReview?.notes,
          reviewDate: matchedReview?.reviewedAt,
        });
      }
    }

    return items.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [productsWithBatches, suggestions]);

  // Pending actions vs Resolved/Promoted actions
  const pendingActionItems = useMemo(() => {
    return allActionItems.filter(item => item.recommendationStatus === 'pending');
  }, [allActionItems]);

  const resolvedActionItems = useMemo(() => {
    return allActionItems.filter(item => item.recommendationStatus !== 'pending');
  }, [allActionItems]);

  const displayedActionItems = actionFilter === 'pending' ? pendingActionItems : resolvedActionItems;

  // =========================================================================
  // INDICADORES PRINCIPALES (Calculados con datos reales y estado de revisión)
  // =========================================================================
  const vencenProntoCount = useMemo(() => {
    return pendingActionItems.filter(i => i.daysRemaining <= 2).length;
  }, [pendingActionItems]);

  const paraRevisarCount = useMemo(() => {
    return pendingActionItems.filter(i => i.daysRemaining >= 3 && i.daysRemaining <= 7).length;
  }, [pendingActionItems]);

  const enOrdenCount = useMemo(() => {
    return Math.max(0, activeBatches.length - (vencenProntoCount + paraRevisarCount));
  }, [activeBatches, vencenProntoCount, paraRevisarCount]);

  // Greeting name and store name
  const greetingName = useMemo(() => {
    if (userProfile?.displayName) {
      return userProfile.displayName.split(' ')[0];
    }
    return 'María';
  }, [userProfile]);

  const storeDisplayName = settings.storeName || userProfile?.storeName || 'Almacén La Esquina';

  // Quick Inline Review Handler with real persistence to storage & Firestore
  const handleQuickReview = async (product: ProductWithBatches, batch: Batch) => {
    const itemKey = `${product.id}-${batch.id}`;
    setProcessingQuickReviewId(itemKey);

    try {
      const reviewRecord = storageService.recordProductReview({
        productId: product.id,
        batchId: batch.id,
        status: 'reviewed',
        resolution: 'verified_ok',
        notes: 'Verificado desde la vista principal',
        batchExpirationDate: batch.expirationDate,
        batchQuantityAtReview: batch.quantity,
        storeId: userProfile?.storeId,
      });

      if (userProfile?.storeId && !storageService.isDemoActive()) {
        await firestoreSyncService.recordProductReview(userProfile.storeId, reviewRecord);
      }

      // Mark alert read if one matches
      const allAlerts = storageService.getAlerts();
      const relatedAlert = allAlerts.find(a => a.productId === product.id && (!a.batchId || a.batchId === batch.id));
      if (relatedAlert) {
        storageService.markAlertRead(relatedAlert.id);
      }

      soundService.playScanSuccess();
      setToastMessage(`✓ ${product.name} verificado y marcado como revisado`);
      setTimeout(() => setToastMessage(null), 3000);
      onRefresh();
    } catch (err) {
      console.error('Error in quick review:', err);
      reportSyncError(err);
    } finally {
      setProcessingQuickReviewId(null);
    }
  };

  const hasProducts = productsWithBatches.length > 0;
  const totalNeedingReview = pendingActionItems.length;

  return (
    <div className="max-w-[1070px] mx-auto space-y-8 animate-in fade-in duration-150">
      {/* ================================================================= */}
      {/* 1. ENCABEZADO Y ACCIONES RÁPIDAS                                  */}
      {/* ================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-[#7A8580] tracking-wider uppercase mb-1 flex items-center gap-2">
            <span>TU COMERCIO, AL DÍA</span>
            <span className="text-[#DCE0D9]">·</span>
            <span className="text-[#246B4F] font-semibold">{storeDisplayName}</span>
          </div>
          <h1 className="text-3xl sm:text-[34px] font-black text-[#173F35] tracking-tight leading-tight">
            Buen día, {greetingName}.
          </h1>
          <p className="text-sm text-[#7A8580] mt-1 font-normal">
            Esto es lo que pasa con tus productos hoy.
          </p>
        </div>

        {/* Acciones Rápidas del Dashboard */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* 1. Agregar producto */}
          <button
            type="button"
            onClick={onOpenManualAdd}
            className="bg-[#246B4F] hover:bg-[#1C553E] text-white px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xs transition active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Agregar producto</span>
          </button>

          {/* 2. Escanear código */}
          <button
            type="button"
            onClick={onOpenScan}
            className="bg-white hover:bg-[#F8F9F6] text-[#173F35] border border-[#EAEBE8] px-3.5 py-2.5 rounded-2xl font-semibold text-xs flex items-center gap-2 transition active:scale-95 shadow-2xs"
            title="Escanear con cámara"
          >
            <Camera className="w-4 h-4 text-[#246B4F]" />
            <span className="hidden sm:inline">Escanear código</span>
          </button>

          {/* 3. Probar demo / Salir demo */}
          {isDemoMode ? (
            onExitDemo && (
              <button
                type="button"
                onClick={onExitDemo}
                className="bg-[#FFF3D9] hover:bg-[#FCEAC4] text-[#A66B16] border border-[#FBEAC4] px-3 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
                title="Volver a datos reales"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Salir demo</span>
              </button>
            )
          ) : (
            onOpenDemo && (
              <button
                type="button"
                onClick={onOpenDemo}
                className="bg-[#EAF3EC] hover:bg-[#D5E8D7] text-[#246B4F] border border-[#D1E7D8] px-3 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
                title="Explorar con productos ficticios"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Probar demo</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* 2. TRES TARJETAS DE INDICADORES (Datos reales de la cuenta)       */}
      {/* ================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Tarjeta 1: Vencen pronto */}
        <div 
          onClick={() => setActiveTab('expirations')}
          className="p-6 rounded-2xl bg-white border border-[#EAEBE8] hover:border-[#D95D39]/40 transition shadow-xs cursor-pointer min-h-[155px] flex flex-col justify-between group"
          role="button"
          tabIndex={0}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#26352F]">Vencen pronto</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#D95D39]" />
            </div>
            <div className="w-9 h-9 rounded-xl bg-[#FDF0EB] text-[#D95D39] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-4xl font-black text-[#173F35] font-sans my-1">
              {vencenProntoCount}
            </div>
            <div className="text-xs text-[#7A8580]">
              En los próximos 2 días
            </div>
          </div>
        </div>

        {/* Tarjeta 2: Para revisar */}
        <div 
          onClick={() => setActiveTab('expirations')}
          className="p-6 rounded-2xl bg-white border border-[#EAEBE8] hover:border-[#D99B26]/40 transition shadow-xs cursor-pointer min-h-[155px] flex flex-col justify-between group"
          role="button"
          tabIndex={0}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#26352F]">Para revisar</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#D99B26]" />
            </div>
            <div className="w-9 h-9 rounded-xl bg-[#FEF7EC] text-[#D99B26] flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-4xl font-black text-[#173F35] font-sans my-1">
              {paraRevisarCount}
            </div>
            <div className="text-xs text-[#7A8580]">
              Vencen en 3 a 7 días
            </div>
          </div>
        </div>

        {/* Tarjeta 3: En orden */}
        <div 
          onClick={() => setActiveTab('products')}
          className="p-6 rounded-2xl bg-white border border-[#EAEBE8] hover:border-[#246B4F]/40 transition shadow-xs cursor-pointer min-h-[155px] flex flex-col justify-between group"
          role="button"
          tabIndex={0}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#26352F]">En orden</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#246B4F]" />
            </div>
            <div className="w-9 h-9 rounded-xl bg-[#EAF5ED] text-[#246B4F] flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-4xl font-black text-[#173F35] font-sans my-1">
              {enOrdenCount}
            </div>
            <div className="text-xs text-[#7A8580]">
              Más de 7 días
            </div>
          </div>
        </div>
      </div>

      {/* Toast Feedback Banner */}
      {toastMessage && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-[#EAF5ED] border border-[#C5E1CF] text-[#173F35] rounded-2xl text-xs sm:text-sm font-semibold shadow-xs animate-in fade-in duration-200">
          <CheckCheck className="w-4 h-4 text-[#246B4F] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ================================================================= */}
      {/* 3. SECCIÓN: Acción recomendada (Lista vertical con persistencia)  */}
      {/* ================================================================= */}
      {!hasProducts ? (
        /* Estado vacío limpio si no hay productos cargados */
        <div className="p-10 text-center rounded-2xl bg-white border border-[#EAEBE8] space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-[#EAF3EC] text-[#246B4F] flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#173F35]">
              Todavía no tenés productos registrados
            </h2>
            <p className="text-xs sm:text-sm text-[#7A8580] max-w-md mx-auto mt-1">
              Comenzá cargando tu inventario para controlar las fechas de caducidad y reducir pérdidas.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={onOpenManualAdd}
              className="px-5 py-2.5 bg-[#246B4F] hover:bg-[#1C553E] text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-2 active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Agregar producto</span>
            </button>

            <button
              type="button"
              onClick={onOpenScan}
              className="px-5 py-2.5 bg-white hover:bg-[#F8F9F6] text-[#173F35] border border-[#EAEBE8] text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 active:scale-95 shadow-2xs"
            >
              <Camera className="w-4 h-4 text-[#246B4F]" />
              <span>Escanear código</span>
            </button>
          </div>
        </div>
      ) : (
        /* Lista vertical de productos y acciones */
        <div className="space-y-4">
          {/* Header de la sección y Filtros */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center flex-wrap gap-2">
                <h2 className="text-xl font-black text-[#173F35] tracking-tight">
                  Acción recomendada
                </h2>
                {pendingActionItems.length > 0 ? (
                  <span className="bg-[#FDECE7] text-[#D95D39] text-xs font-bold px-3 py-0.5 rounded-full">
                    {pendingActionItems.length} para revisar
                  </span>
                ) : (
                  <span className="bg-[#EAF5ED] text-[#246B4F] text-xs font-bold px-3 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Al día
                  </span>
                )}
              </div>
              <p className="text-xs text-[#7A8580] mt-0.5">
                {actionFilter === 'pending'
                  ? 'Empezá por lo que vence primero.'
                  : 'Historial de productos revisados y promociones activas.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Selector de pestañas Pendientes vs Resueltos */}
              {resolvedActionItems.length > 0 && (
                <div className="flex items-center bg-[#F4F6F3] p-0.5 rounded-xl border border-[#EAEBE8]">
                  <button
                    type="button"
                    onClick={() => setActionFilter('pending')}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${
                      actionFilter === 'pending'
                        ? 'bg-white text-[#173F35] shadow-xs'
                        : 'text-[#7A8580] hover:text-[#173F35]'
                    }`}
                  >
                    Pendientes ({pendingActionItems.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionFilter('resolved')}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${
                      actionFilter === 'resolved'
                        ? 'bg-white text-[#173F35] shadow-xs'
                        : 'text-[#7A8580] hover:text-[#173F35]'
                    }`}
                  >
                    Resueltos ({resolvedActionItems.length})
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setActiveTab('alerts')}
                className="text-xs font-bold text-[#246B4F] hover:underline flex items-center gap-0.5 ml-2"
              >
                <span>Ver alertas</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Lista vertical de tarjetas horizontales */}
          {displayedActionItems.length > 0 ? (
            <div className="space-y-3.5">
              {displayedActionItems.map(({ 
                product, 
                batch, 
                isExpired, 
                statusBadgeText, 
                statusBadgeClass, 
                accentBorderClass,
                bulletColorClass,
                dateFormattedText, 
                recommendation, 
                suggestedDiscount, 
                suggestedType,
                recommendationStatus,
                reviewNotes,
                reviewDate
              }) => {
                const isItemReviewed = recommendationStatus === 'reviewed';
                const isPromoted = recommendationStatus === 'promotion_created';
                const isQuickProcessing = processingQuickReviewId === `${product.id}-${batch.id}`;

                return (
                  <div
                    key={`${product.id}-${batch.id}`}
                    className={`p-4 sm:p-5 rounded-2xl bg-white border border-[#EAEBE8] transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${accentBorderClass} ${
                      isItemReviewed || isPromoted ? 'bg-[#FAFCF9]' : ''
                    }`}
                  >
                    {/* Left bullet & details */}
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      {/* Ring indicator bullet */}
                      <div className="pt-0.5 shrink-0">
                        <div className={`w-4 h-4 rounded-full border-2 ${bulletColorClass} flex items-center justify-center p-0.5`}>
                          <div className="w-1.5 h-1.5 rounded-full bg-current" />
                        </div>
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        {/* Line 1: Title, Quantity pill, and Status */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 
                            onClick={() => onSelectProduct(product)}
                            className="text-sm sm:text-base font-bold text-[#173F35] hover:text-[#246B4F] cursor-pointer transition truncate"
                            title="Ver detalle del producto"
                          >
                            {product.name}
                          </h3>

                          <span className="bg-[#F0F2EE] text-[#5C6861] text-[11px] font-medium px-2 py-0.5 rounded-md">
                            {batch.quantity} {product.unit}
                          </span>

                          <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ml-auto sm:ml-0 ${statusBadgeClass}`}>
                            {statusBadgeText}
                          </span>
                        </div>

                        {/* Line 2: Expiration info */}
                        <div className="text-xs text-[#7A8580]">
                          {dateFormattedText}
                        </div>

                        {/* Line 3: Recommendation or resolution notes */}
                        <div className="text-xs text-[#5C6861] flex items-center gap-1.5 pt-0.5">
                          {isItemReviewed ? (
                            <span className="text-[#246B4F] font-semibold flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#246B4F] shrink-0" />
                              <span>Revisado y confirmado {reviewDate ? `(${new Date(reviewDate).toLocaleDateString()})` : ''} {reviewNotes ? `· ${reviewNotes}` : ''}</span>
                            </span>
                          ) : isPromoted ? (
                            <span className="text-[#246B4F] font-semibold flex items-center gap-1.5">
                              <Tag className="w-3.5 h-3.5 text-[#246B4F] shrink-0" />
                              <span>Promoción activa para acelerar rotación</span>
                            </span>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5 text-[#246B4F] shrink-0" />
                              <span>{recommendation}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right actions: Revisar producto, Crear promo, y Marcar como revisado */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {/* Botón Revisar Producto */}
                      <button
                        type="button"
                        onClick={() => onSelectProduct(product)}
                        className="border border-[#DCE0D9] hover:bg-[#F8F9F6] text-[#173F35] hover:text-[#246B4F] text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 active:scale-95 transition shadow-2xs"
                        title="Revisar lote y confirmar su estado"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#5C6861]" />
                        <span>Revisar producto</span>
                      </button>

                      {/* Botón Crear promo (para productos no vencidos) */}
                      {!isExpired && onOpenPromotion && (
                        <button
                          type="button"
                          onClick={() => onOpenPromotion(product, batch, suggestedDiscount, suggestedType)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 active:scale-95 shadow-2xs transition ${
                            isPromoted
                              ? 'border border-[#D1E7D8] bg-[#EAF5ED] text-[#246B4F]'
                              : 'border border-[#DCE0D9] hover:bg-[#F8F9F6] text-[#26352F]'
                          }`}
                          title={isPromoted ? 'Ver o editar promoción activa' : 'Crear promoción comercial para liquidar este lote'}
                        >
                          <Tag className="w-3.5 h-3.5 text-[#246B4F]" />
                          <span>{isPromoted ? 'Promo activa' : 'Crear promo'}</span>
                        </button>
                      )}

                      {/* Botón «Listo»: abre el flujo de resolución formal (Vendido, Descartado, Promo, Otro) */}
                      <button
                        type="button"
                        onClick={() => setItemToResolve({ product, batch })}
                        className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold active:scale-95 transition shadow-2xs ${
                          isItemReviewed 
                            ? 'border-[#246B4F] bg-[#EAF5ED] text-[#246B4F]' 
                            : 'border-[#246B4F] bg-[#EAF5ED]/50 hover:bg-[#EAF5ED] text-[#173F35]'
                        }`}
                        title="Actualizar y resolver alerta («Listo»)"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5] text-[#246B4F]" />
                        <span>Listo</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : actionFilter === 'pending' ? (
            /* Estado positivo cuando todas las acciones pendientes fueron atendidas */
            <div className="p-8 rounded-2xl bg-white border border-[#EAEBE8] text-center space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-2xl bg-[#EAF3EC] text-[#246B4F] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
              </div>
              <h3 className="text-base font-bold text-[#173F35]">
                ¡Todo tu inventario urgente está al día!
              </h3>
              <p className="text-xs text-[#7A8580] max-w-sm mx-auto">
                No tenés lotes urgentes pendientes de atención. Todas las acciones recomendadas han sido revisadas o tienen promociones activas.
              </p>
              {resolvedActionItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActionFilter('resolved')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#246B4F] hover:underline pt-1"
                >
                  <span>Ver los {resolvedActionItems.length} lotes atendidos</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            /* Estado vacío en pestaña de resueltos */
            <div className="p-8 rounded-2xl bg-white border border-[#EAEBE8] text-center space-y-2 shadow-xs">
              <p className="text-xs text-[#7A8580]">
                Aún no hay productos marcados como revisados en esta sesión.
              </p>
              <button
                type="button"
                onClick={() => setActionFilter('pending')}
                className="text-xs font-bold text-[#246B4F] hover:underline"
              >
                Volver a pendientes ({pendingActionItems.length})
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal de Resolución: ¿Qué pasó con este producto? (Vendido, Descartado, Promo, Otro) */}
      {itemToResolve && (
        <ResolveRecommendationModal
          isOpen={Boolean(itemToResolve)}
          onClose={() => setItemToResolve(null)}
          product={itemToResolve.product}
          batch={itemToResolve.batch}
          onSuccess={(msg) => {
            setToastMessage(msg);
            setTimeout(() => setToastMessage(null), 3500);
            onRefresh();
          }}
          onOpenPromotion={onOpenPromotion}
        />
      )}
    </div>
  );
};
