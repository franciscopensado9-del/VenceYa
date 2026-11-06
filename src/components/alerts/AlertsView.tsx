import React, { useState, useMemo } from 'react';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  AlertTriangle, 
  Clock, 
  Check, 
  ArrowRight,
  Settings,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import { AppAlert, StoreSettings, ProductWithBatches } from '../../types';
import { storageService } from '../../services/storage';

interface AlertsViewProps {
  alerts: AppAlert[];
  settings: StoreSettings;
  productsWithBatches: ProductWithBatches[];
  onRefresh: () => void;
  onUpdateSettings: (settings: StoreSettings) => void;
  onSelectProduct: (product: ProductWithBatches) => void;
}

type AlertFilterType = 'all' | 'expired' | 'urgent' | 'warning' | 'unread';

export const AlertsView: React.FC<AlertsViewProps> = ({
  alerts,
  settings,
  productsWithBatches,
  onRefresh,
  onUpdateSettings,
  onSelectProduct,
}) => {
  const [filter, setFilter] = useState<AlertFilterType>('all');
  const [showConfig, setShowConfig] = useState(false);

  const activeAlerts = useMemo(() => alerts.filter(a => !a.isDismissed), [alerts]);
  const unreadCount = useMemo(() => activeAlerts.filter(a => !a.isRead).length, [activeAlerts]);

  // Breakdown counts by urgency
  const counts = useMemo(() => {
    const res = {
      all: activeAlerts.length,
      expired: 0,
      urgent: 0,
      warning: 0,
      unread: unreadCount,
    };
    for (const a of activeAlerts) {
      if (a.daysRemaining < 0) res.expired++;
      else if (a.daysRemaining <= 2) res.urgent++;
      else if (a.daysRemaining <= 7) res.warning++;
    }
    return res;
  }, [activeAlerts, unreadCount]);

  // Filter and sort: strictly showing items requiring immediate action first
  const filteredAlerts = useMemo(() => {
    return activeAlerts
      .filter(a => {
        if (filter === 'unread') return !a.isRead;
        if (filter === 'expired') return a.daysRemaining < 0;
        if (filter === 'urgent') return a.daysRemaining >= 0 && a.daysRemaining <= 2;
        if (filter === 'warning') return a.daysRemaining > 2 && a.daysRemaining <= 7;
        return true;
      })
      .sort((a, b) => {
        // Unread first if same urgency, then by daysRemaining ascending (most negative first)
        return a.daysRemaining - b.daysRemaining;
      });
  }, [activeAlerts, filter]);

  const handleMarkAllRead = () => {
    storageService.markAllAlertsRead();
    onRefresh();
  };

  const handleMarkRead = (id: string) => {
    storageService.markAlertRead(id);
    onRefresh();
  };

  const handleDismiss = (id: string) => {
    storageService.dismissAlert(id);
    onRefresh();
  };

  const toggleThreshold = (key: keyof StoreSettings['alertThresholds']) => {
    const updated = {
      ...settings,
      alertThresholds: {
        ...settings.alertThresholds,
        [key]: !settings.alertThresholds[key],
      },
    };
    onUpdateSettings(updated);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150 text-[#24372F]">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#174A36] tracking-tight">
            Alertas de Inventario
          </h1>
          <p className="text-xs sm:text-sm text-[#78847C] mt-0.5 font-medium">
            Separación de productos vencidos, urgentes y próximos a vencer.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="px-3.5 py-2.5 rounded-2xl bg-white hover:bg-[#F8F9F6] border border-[#E7EBE5] text-xs font-bold text-[#246B4D] transition shadow-2xs min-h-[44px] flex items-center gap-1.5 active:scale-95"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Marcar todas como leídas</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowConfig(prev => !prev)}
            className={`px-3.5 py-2.5 rounded-2xl border text-xs font-bold transition min-h-[44px] flex items-center gap-1.5 active:scale-95 ${
              showConfig 
                ? 'bg-[#EAF3EC] text-[#174A36] border-[#D5E8D7]' 
                : 'bg-white text-[#78847C] hover:text-[#174A36] border-[#E7EBE5]'
            }`}
          >
            <Settings className="w-4 h-4 text-[#78847C]" />
            <span className="hidden sm:inline">Configurar alertas</span>
            {showConfig ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Collapsible Thresholds Config */}
      {showConfig && (
        <div className="p-5 rounded-3xl bg-white border border-[#E7EBE5] space-y-3 animate-in fade-in duration-150 shadow-xs">
          <div className="text-xs font-bold text-[#174A36]">
            Anticipación de avisos automáticos
          </div>
          <p className="text-xs text-[#78847C]">
            Elegí cuándo querés que VenceYa genere alertas preventivas para tu mercadería:
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => toggleThreshold('today')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                settings.alertThresholds.today
                  ? 'bg-[#FCEBE5] text-[#C6533A] border border-[#FADBD0]'
                  : 'bg-[#F8F9F6] text-[#78847C] border border-[#E7EBE5]'
              }`}
            >
              El día del vencimiento
            </button>
            <button
              type="button"
              onClick={() => toggleThreshold('days3')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                settings.alertThresholds.days3
                  ? 'bg-[#FFF3D9] text-[#A66B16] border border-[#FBEAC4]'
                  : 'bg-[#F8F9F6] text-[#78847C] border border-[#E7EBE5]'
              }`}
            >
              3 días antes
            </button>
            <button
              type="button"
              onClick={() => toggleThreshold('days7')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                settings.alertThresholds.days7
                  ? 'bg-[#EAF3EC] text-[#246B4D] border border-[#D5E8D7]'
                  : 'bg-[#F8F9F6] text-[#78847C] border border-[#E7EBE5]'
              }`}
            >
              7 días antes
            </button>
            <button
              type="button"
              onClick={() => toggleThreshold('days30')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                settings.alertThresholds.days30
                  ? 'bg-[#EAF3EC] text-[#246B4D] border border-[#D5E8D7]'
                  : 'bg-[#F8F9F6] text-[#78847C] border border-[#E7EBE5]'
              }`}
            >
              30 días antes
            </button>
          </div>
        </div>
      )}

      {/* Categorized Filter Tabs (Vencidos, Urgentes, Próximos) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition min-h-[40px] whitespace-nowrap ${
            filter === 'all' 
              ? 'bg-[#174A36] text-white shadow-2xs' 
              : 'bg-white border border-[#E7EBE5] text-[#78847C] hover:text-[#174A36]'
          }`}
        >
          Todas ({counts.all})
        </button>

        <button
          type="button"
          onClick={() => setFilter('expired')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition min-h-[40px] whitespace-nowrap ${
            filter === 'expired' 
              ? 'bg-[#C6533A] text-white shadow-2xs' 
              : 'bg-white border border-[#E7EBE5] text-[#78847C] hover:text-[#C6533A]'
          }`}
        >
          Vencidos ({counts.expired})
        </button>

        <button
          type="button"
          onClick={() => setFilter('urgent')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition min-h-[40px] whitespace-nowrap ${
            filter === 'urgent' 
              ? 'bg-[#D95D39] text-white shadow-2xs' 
              : 'bg-white border border-[#E7EBE5] text-[#78847C] hover:text-[#D95D39]'
          }`}
        >
          Urgentes 0-2d ({counts.urgent})
        </button>

        <button
          type="button"
          onClick={() => setFilter('warning')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition min-h-[40px] whitespace-nowrap ${
            filter === 'warning' 
              ? 'bg-[#A66B16] text-white shadow-2xs' 
              : 'bg-white border border-[#E7EBE5] text-[#78847C] hover:text-[#A66B16]'
          }`}
        >
          Próximos 3-7d ({counts.warning})
        </button>

        <button
          type="button"
          onClick={() => setFilter('unread')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition min-h-[40px] whitespace-nowrap ${
            filter === 'unread' 
              ? 'bg-[#246B4D] text-white shadow-2xs' 
              : 'bg-white border border-[#E7EBE5] text-[#78847C] hover:text-[#246B4D]'
          }`}
        >
          No leídas ({counts.unread})
        </button>
      </div>

      {/* Alerts Feed */}
      {filteredAlerts.length === 0 ? (
        <div className="p-10 text-center rounded-3xl bg-white border border-[#E7EBE5] space-y-2 shadow-xs">
          <Check className="w-10 h-10 text-[#246B4D] mx-auto opacity-60" />
          <h3 className="text-base font-bold text-[#174A36]">No hay alertas en esta categoría</h3>
          <p className="text-xs text-[#78847C]">
            Tu mercadería está al día según la configuración establecida.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map(alert => {
            const isExpired = alert.daysRemaining < 0;
            const isUrgent = alert.daysRemaining >= 0 && alert.daysRemaining <= 2;
            const matchingProduct = productsWithBatches.find(p => p.id === alert.productId);

            return (
              <div
                key={alert.id}
                className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  !alert.isRead 
                    ? 'bg-white border-[#246B4D]/30 ring-1 ring-[#246B4D]/10' 
                    : 'bg-white/90 border-[#E7EBE5]'
                }`}
              >
                {/* Alert Details */}
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                      isExpired 
                        ? 'bg-[#FCEBE5] text-[#C6533A] border-[#F5C2B6]' 
                        : isUrgent
                        ? 'bg-[#FFF0EB] text-[#D95D39] border-[#FCD3C7]'
                        : 'bg-[#FFF3D9] text-[#A66B16] border-[#FBEAC4]'
                    }`}>
                      {isExpired ? 'Vencido' : isUrgent ? 'Urgente' : 'Próximo a vencer'}
                    </span>
                    <span className="text-xs font-semibold text-[#174A36]">
                      {alert.productName}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-[#5C6861] leading-relaxed">
                    {alert.message}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#F0F2EF]">
                  {matchingProduct && (
                    <button
                      type="button"
                      onClick={() => {
                        handleMarkRead(alert.id);
                        onSelectProduct(matchingProduct);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#EAF3EC] hover:bg-[#246B4D] hover:text-white text-xs font-bold text-[#246B4D] transition flex items-center gap-1.5 min-h-[38px] active:scale-95 shadow-2xs"
                    >
                      <span>Ver producto</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {!alert.isRead && (
                    <button
                      type="button"
                      onClick={() => handleMarkRead(alert.id)}
                      className="px-2.5 py-1.5 text-xs text-[#78847C] hover:text-[#174A36] transition min-h-[38px] font-semibold"
                      title="Marcar como leída"
                    >
                      Leída
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDismiss(alert.id)}
                    className="p-2 text-[#78847C] hover:text-[#C6533A] hover:bg-[#FCEBE5] rounded-xl transition min-h-[38px] min-w-[38px] flex items-center justify-center"
                    title="Descartar alerta"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
