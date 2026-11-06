import React, { useState } from 'react';
import { 
  X, 
  Tag, 
  Share2, 
  Copy, 
  Check, 
  Trash2, 
  MessageCircle, 
  Calendar, 
  Package, 
  CheckCircle2, 
  Clock, 
  Archive,
  Flame,
  Plus
} from 'lucide-react';
import { Promotion, PromotionStatus } from '../../types';
import { storageService } from '../../services/storage';
import { firestoreSyncService, reportSyncError } from '../../services/firestoreSync';
import { useAuth } from '../../contexts/AuthContext';
import { soundService } from '../../services/sound';

interface SavedPromotionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  promotions: Promotion[];
  onRefresh: () => void;
  onOpenNewPromo?: () => void;
}

export const SavedPromotionsModal: React.FC<SavedPromotionsModalProps> = ({
  isOpen,
  onClose,
  promotions,
  onRefresh,
  onOpenNewPromo,
}) => {
  const { userProfile } = useAuth();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | PromotionStatus>('all');

  if (!isOpen) return null;

  const filtered = promotions.filter(p => {
    if (filterStatus === 'all') return true;
    return p.status === filterStatus;
  });

  const handleCopyMessage = (promo: Promotion) => {
    navigator.clipboard.writeText(promo.message);
    soundService.playScanSuccess();
    setCopiedId(promo.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleShareWhatsApp = (promo: Promotion) => {
    const encoded = encodeURIComponent(promo.message);
    window.open(`https://wa.me/?text=${encoded}`, '_blank', 'noopener,noreferrer');
  };

  const handleToggleStatus = async (promo: Promotion) => {
    const nextStatus: PromotionStatus = promo.status === 'active' ? 'ended' : 'active';
    storageService.updatePromotionStatus(promo.id, nextStatus);
    if (userProfile?.storeId && !storageService.isDemoActive()) {
      firestoreSyncService.updatePromotionStatus(userProfile.storeId, promo.id, nextStatus).catch(reportSyncError);
    }
    soundService.playScanSuccess();
    onRefresh();
  };

  const handleDelete = async (promo: Promotion) => {
    storageService.deletePromotion(promo.id);
    if (userProfile?.storeId && !storageService.isDemoActive()) {
      firestoreSyncService.deletePromotion(userProfile.storeId, promo.id).catch(reportSyncError);
    }
    onRefresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white border border-[#E7EBE5] rounded-3xl shadow-2xl my-auto overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E7EBE5] flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EAF3EC] text-[#246B4D] flex items-center justify-center">
              <Tag className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#246B4D] block">
                GESTIÓN COMERCIAL
              </span>
              <h2 className="text-base sm:text-lg font-bold text-[#174A36]">
                Promociones Registradas
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-2xl text-[#78847C] hover:text-[#174A36] hover:bg-[#F8F9F6] transition min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-4 sm:px-6 pt-4 pb-2 border-b border-[#E7EBE5] flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                filterStatus === 'all'
                  ? 'bg-[#246B4D] text-white'
                  : 'bg-[#F8F9F6] text-[#78847C] hover:bg-[#E7EBE5]'
              }`}
            >
              Todas ({promotions.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('active')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                filterStatus === 'active'
                  ? 'bg-[#246B4D] text-white'
                  : 'bg-[#F8F9F6] text-[#78847C] hover:bg-[#E7EBE5]'
              }`}
            >
              Activas ({promotions.filter(p => p.status === 'active').length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('ended')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                filterStatus === 'ended'
                  ? 'bg-[#246B4D] text-white'
                  : 'bg-[#F8F9F6] text-[#78847C] hover:bg-[#E7EBE5]'
              }`}
            >
              Finalizadas ({promotions.filter(p => p.status === 'ended').length})
            </button>
          </div>

          {onOpenNewPromo && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenNewPromo();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#246B4D] text-white text-xs font-semibold hover:bg-[#174A36] shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva</span>
            </button>
          )}
        </div>

        {/* Content list */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3.5 flex-1 text-sm text-[#24372F]">
          {filtered.length === 0 ? (
            <div className="p-10 text-center rounded-3xl bg-[#F8F9F6] border border-[#E7EBE5] space-y-2">
              <Tag className="w-8 h-8 text-[#246B4D] mx-auto opacity-60" />
              <h3 className="text-sm font-bold text-[#174A36]">No hay promociones en este estado</h3>
              <p className="text-xs text-[#78847C]">
                Creá promociones desde el panel, el listado de productos o sugerencias para acelerar la rotación de tus lotes.
              </p>
            </div>
          ) : (
            filtered.map(promo => {
              const isActive = promo.status === 'active';
              return (
                <div
                  key={promo.id}
                  className="p-4 rounded-2xl bg-white border border-[#E7EBE5] shadow-xs space-y-3 hover:border-[#246B4D]/40 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          isActive
                            ? 'bg-[#EAF3EC] text-[#246B4D] border border-[#D5E8D7]'
                            : 'bg-[#F8F9F6] text-[#78847C] border border-[#E7EBE5]'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#246B4D]' : 'bg-[#78847C]'}`} />
                          <span>{isActive ? 'Activa' : 'Finalizada'}</span>
                        </span>
                        {promo.discountPercentage && (
                          <span className="font-bold text-xs text-[#246B4D] font-mono">
                            {promo.discountPercentage}% OFF
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-[#174A36] mt-1 truncate">
                        {promo.productName}
                      </h3>
                      <p className="text-xs text-[#78847C]">
                        {promo.title}
                      </p>
                    </div>

                    <div className="text-right font-mono self-start sm:self-auto">
                      <div className="text-xs text-[#78847C] line-through">
                        ${promo.regularPrice.toLocaleString('es-AR')}
                      </div>
                      <div className="text-lg font-bold text-[#174A36]">
                        ${promo.promoPrice.toLocaleString('es-AR')}
                      </div>
                    </div>
                  </div>

                  {/* Lot & stock info */}
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#78847C] pt-1 border-t border-[#E7EBE5]">
                    {promo.availableStock && (
                      <span className="px-2 py-0.5 rounded-lg bg-[#F8F9F6] border border-[#E7EBE5]">
                        Stock: <strong className="text-[#174A36]">{promo.availableStock} {promo.unit}</strong>
                      </span>
                    )}
                    {promo.batchExpirationDate && (
                      <span className="px-2 py-0.5 rounded-lg bg-[#F8F9F6] border border-[#E7EBE5]">
                        Vencimiento: <strong className="text-[#174A36]">{promo.batchExpirationDate}</strong>
                      </span>
                    )}
                    {promo.validUntilText && (
                      <span className="px-2 py-0.5 rounded-lg bg-[#F8F9F6] border border-[#E7EBE5]">
                        Vigencia: {promo.validUntilText}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E7EBE5]">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(promo)}
                        className="px-3 py-1.5 rounded-xl border border-[#E7EBE5] bg-[#F8F9F6] hover:bg-[#E7EBE5] text-xs font-semibold text-[#174A36] transition"
                      >
                        {isActive ? 'Marcar Finalizada' : 'Reactivar'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(promo)}
                        className="p-1.5 rounded-xl text-[#78847C] hover:text-[#C6533A] hover:bg-[#FFF8F7] transition"
                        title="Eliminar de la lista"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyMessage(promo)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E7EBE5] bg-white hover:bg-[#F8F9F6] text-xs font-semibold text-[#174A36] transition"
                      >
                        {copiedId === promo.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#246B4D]" />
                            <span className="text-[#246B4D]">¡Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-[#78847C]" />
                            <span>Copiar texto</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleShareWhatsApp(promo)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold transition shadow-xs"
                      >
                        <MessageCircle className="w-3.5 h-3.5 fill-white" />
                        <span>WhatsApp</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E7EBE5] bg-[#F8F9F6] flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl bg-[#246B4D] hover:bg-[#174A36] text-white text-xs font-bold transition min-h-[44px]"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
