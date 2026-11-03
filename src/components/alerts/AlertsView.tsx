import React, { useState } from 'react';
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
  ChevronUp
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

export const AlertsView: React.FC<AlertsViewProps> = ({
  alerts,
  settings,
  productsWithBatches,
  onRefresh,
  onUpdateSettings,
  onSelectProduct,
}) => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [showConfig, setShowConfig] = useState(false);

  const activeAlerts = alerts.filter(a => !a.isDismissed);
  const unreadCount = activeAlerts.filter(a => !a.isRead).length;

  const filteredAlerts = activeAlerts.filter(a => {
    if (filter === 'unread') return !a.isRead;
    return true;
  });

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
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#174A36] tracking-tight">
            Alertas
          </h1>
          <p className="text-xs sm:text-sm text-[#78847C] mt-0.5">
            Situaciones que requieren atención en tu inventario.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="px-3.5 py-2.5 rounded-2xl bg-white hover:bg-[#F8F9F6] border border-[#E7EBE5] text-xs font-semibold text-[#246B4D] transition shadow-2xs min-h-[44px] flex items-center gap-1.5"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Marcar leídas</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowConfig(prev => !prev)}
            className={`px-3 py-2.5 rounded-2xl border text-xs font-semibold transition min-h-[44px] flex items-center gap-1.5 ${
              showConfig 
                ? 'bg-[#EAF3EC] text-[#174A36] border-[#D5E8D7]' 
                : 'bg-white text-[#78847C] hover:text-[#174A36] border-[#E7EBE5]'
            }`}
          >
            <Settings className="w-4 h-4 text-[#78847C]" />
            <span className="hidden sm:inline">Configurar anticipación</span>
            {showConfig ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Collapsible Thresholds Config */}
      {showConfig && (
        <div className="p-4 rounded-3xl bg-white border border-[#E7EBE5] space-y-2 animate-in fade-in duration-150 shadow-xs">
          <div className="text-xs font-bold text-[#174A36]">
            Anticipación de avisos automáticos
          </div>
          <p className="text-[11px] text-[#78847C]">
            Elegí cuándo querés que se generen las alertas:
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

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition min-h-[40px] ${
            filter === 'all' 
              ? 'bg-[#174A36] text-white shadow-2xs' 
              : 'bg-white border border-[#E7EBE5] text-[#78847C] hover:text-[#174A36]'
          }`}
        >
          Todas ({activeAlerts.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('unread')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition min-h-[40px] ${
            filter === 'unread' 
              ? 'bg-[#174A36] text-white shadow-2xs' 
              : 'bg-white border border-[#E7EBE5] text-[#78847C] hover:text-[#174A36]'
          }`}
        >
          Pendientes ({unreadCount})
        </button>
      </div>

      {/* Alerts Feed */}
      {filteredAlerts.length === 0 ? (
        <div className="p-10 text-center rounded-3xl bg-white border border-[#E7EBE5] space-y-2 shadow-xs">
          <Check className="w-10 h-10 text-[#246B4D] mx-auto opacity-60" />
          <h3 className="text-base font-bold text-[#174A36]">No hay alertas pendientes</h3>
          <p className="text-xs text-[#78847C]">
            Tu mercadería está al día según la configuración establecida.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredAlerts.map(alert => {
            const isCritical = alert.urgency === 'critical';
            const matchingProduct = productsWithBatches.find(p => p.id === alert.productId);

            return (
              <div
                key={alert.id}
                className={`p-4 rounded-2xl sm:rounded-3xl border transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  !alert.isRead 
                    ? 'bg-white border-[#246B4D]/30 ring-1 ring-[#246B4D]/10' 
                    : 'bg-white/80 border-[#E7EBE5]'
                }`}
              >
                {/* Alert Details */}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isCritical ? 'bg-[#FCEBE5] text-[#C6533A]' : 'bg-[#FFF3D9] text-[#A66B16]'
                    }`}>
                      {isCritical ? 'Vencido o Urgente' : 'Atención'}
                    </span>
                    <span className="text-[11px] text-[#78847C]">
                      {alert.productName}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm font-semibold text-[#174A36]">
                    {alert.message}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E7EBE5]">
                  {matchingProduct && (
                    <button
                      type="button"
                      onClick={() => {
                        handleMarkRead(alert.id);
                        onSelectProduct(matchingProduct);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#EAF3EC] hover:bg-[#246B4D] hover:text-white text-xs font-bold text-[#246B4D] transition flex items-center gap-1.5 min-h-[38px] active:scale-95"
                    >
                      <span>Ver producto</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {!alert.isRead && (
                    <button
                      type="button"
                      onClick={() => handleMarkRead(alert.id)}
                      className="px-2.5 py-1.5 text-xs text-[#78847C] hover:text-[#174A36] transition min-h-[38px]"
                      title="Marcar como leída"
                    >
                      Leída
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDismiss(alert.id)}
                    className="p-2 text-[#78847C] hover:text-[#C6533A] rounded-xl transition min-h-[38px] min-w-[38px] flex items-center justify-center"
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
