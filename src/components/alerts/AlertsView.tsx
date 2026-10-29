import React, { useState } from 'react';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  AlertTriangle, 
  Flame, 
  Clock, 
  Info, 
  Volume2, 
  Calendar, 
  Check, 
  ExternalLink 
} from 'lucide-react';
import { AppAlert, StoreSettings, ProductWithBatches } from '../../types';
import { storageService } from '../../services/storage';
import { soundService } from '../../services/sound';

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
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical'>('all');
  const [notificationPermission, setNotificationPermission] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );

  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setNotificationPermission(perm);
        if (perm === 'granted') {
          soundService.playSuccessChime();
          new Notification('VenceYa - Alertas activadas', {
            body: 'Recibirás avisos preventivos para reducir mermas en tu comercio.',
            icon: '/icon.svg',
          });
        }
      } catch {
        // Notification permission request error
      }
    }
  };

  const activeAlerts = alerts.filter(a => !a.isDismissed);

  const filteredAlerts = activeAlerts.filter(a => {
    if (filter === 'unread') return !a.isRead;
    if (filter === 'critical') return a.urgency === 'critical';
    return true;
  });

  const unreadCount = activeAlerts.filter(a => !a.isRead).length;

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
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#78847C]">
            AVISOS Y NOTIFICACIONES
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#174A36] tracking-tight mt-1 flex items-center gap-2.5">
            <Bell className="w-7 h-7 text-[#246B4D]" />
            <span>Centro de Alertas</span>
          </h1>
          <p className="text-sm text-[#78847C] mt-0.5">
            Avisos programados para actuar a tiempo y evitar pérdidas
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => soundService.playWarningTone()}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-white hover:bg-[#F8F9F6] border border-[#E7EBE5] text-xs font-semibold text-[#78847C] hover:text-[#174A36] transition shadow-xs"
            title="Probar sonido de alerta"
          >
            <Volume2 className="w-4 h-4 text-[#A66B16]" />
            <span className="hidden sm:inline">Probar Sonido</span>
          </button>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#246B4D] hover:bg-[#174A36] text-xs font-semibold text-white transition shadow-xs"
            >
              <CheckCheck className="w-4 h-4 stroke-[2.5]" />
              <span>Marcar todas leídas</span>
            </button>
          )}
        </div>
      </div>

      {/* Thresholds Quick Config Bar */}
      <div className="p-5 rounded-3xl bg-white border border-[#E7EBE5] space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <span className="text-xs font-bold uppercase tracking-wider text-[#174A36]">
            Anticipaciones Configuradas:
          </span>
          <span className="text-xs text-[#78847C]">
            Tocá para activar o desactivar avisos automáticos
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => toggleThreshold('today')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              settings.alertThresholds.today
                ? 'bg-[#FCEBE5] text-[#C6533A] border border-[#FADBD0]'
                : 'bg-[#F8F9F6] text-[#78847C] border border-[#E7EBE5]'
            }`}
          >
            {settings.alertThresholds.today ? '✓ El día del vencimiento' : '✕ El día del vencimiento'}
          </button>

          <button
            type="button"
            onClick={() => toggleThreshold('days1')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              settings.alertThresholds.days1
                ? 'bg-[#FFF3D9] text-[#A66B16] border border-[#FBEAC4]'
                : 'bg-[#F8F9F6] text-[#78847C] border border-[#E7EBE5]'
            }`}
          >
            {settings.alertThresholds.days1 ? '✓ 1 día antes' : '✕ 1 día antes'}
          </button>

          <button
            type="button"
            onClick={() => toggleThreshold('days3')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              settings.alertThresholds.days3
                ? 'bg-[#FFF3D9] text-[#A66B16] border border-[#FBEAC4]'
                : 'bg-[#F8F9F6] text-[#78847C] border border-[#E7EBE5]'
            }`}
          >
            {settings.alertThresholds.days3 ? '✓ 3 días antes' : '✕ 3 días antes'}
          </button>

          <button
            type="button"
            onClick={() => toggleThreshold('days7')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              settings.alertThresholds.days7
                ? 'bg-[#EAF3EC] text-[#246B4D] border border-[#D5E8D7]'
                : 'bg-[#F8F9F6] text-[#78847C] border border-[#E7EBE5]'
            }`}
          >
            {settings.alertThresholds.days7 ? '✓ 7 días antes' : '✕ 7 días antes'}
          </button>

          <button
            type="button"
            onClick={() => toggleThreshold('days30')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              settings.alertThresholds.days30
                ? 'bg-[#E8F3E9] text-[#246B4D] border border-[#D5E8D7]'
                : 'bg-[#F8F9F6] text-[#78847C] border border-[#E7EBE5]'
            }`}
          >
            {settings.alertThresholds.days30 ? '✓ 30 días antes' : '✕ 30 días antes'}
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3.5 py-2 rounded-2xl text-xs font-semibold transition ${
            filter === 'all' 
              ? 'bg-[#246B4D] text-white shadow-xs' 
              : 'bg-white border border-[#E7EBE5] text-[#78847C] hover:text-[#174A36]'
          }`}
        >
          Todas ({activeAlerts.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3.5 py-2 rounded-2xl text-xs font-semibold transition ${
            filter === 'unread' 
              ? 'bg-[#246B4D] text-white shadow-xs' 
              : 'bg-white border border-[#E7EBE5] text-[#78847C] hover:text-[#174A36]'
          }`}
        >
          No leídas ({unreadCount})
        </button>
        <button
          onClick={() => setFilter('critical')}
          className={`px-3.5 py-2 rounded-2xl text-xs font-semibold transition ${
            filter === 'critical' 
              ? 'bg-[#246B4D] text-white shadow-xs' 
              : 'bg-white border border-[#E7EBE5] text-[#78847C] hover:text-[#174A36]'
          }`}
        >
          Críticas
        </button>
      </div>

      {/* Alerts Feed */}
      {filteredAlerts.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-[#E7EBE5] space-y-2 shadow-xs">
          <Check className="w-10 h-10 text-[#246B4D] mx-auto opacity-70" />
          <h3 className="text-base font-bold text-[#174A36]">¡No hay alertas pendientes!</h3>
          <p className="text-xs text-[#78847C]">
            {filter === 'unread' ? 'Leíste todas las notificaciones.' : 'Tu mercadería está bajo control según los umbrales configurados.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map(alert => {
            const isCritical = alert.urgency === 'critical';
            const isHigh = alert.urgency === 'high';
            const matchingProduct = productsWithBatches.find(p => p.id === alert.productId);

            return (
              <div
                key={alert.id}
                className={`p-4 sm:p-5 rounded-2xl bg-white border transition-all shadow-xs ${
                  !alert.isRead 
                    ? isCritical 
                      ? 'border-[#C6533A]/40 border-l-4 border-l-[#C6533A]' 
                      : 'border-[#E7EBE5] border-l-4 border-l-[#A66B16]' 
                    : 'border-[#E7EBE5] opacity-75'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <div className={`w-9 h-9 rounded-2xl shrink-0 mt-0.5 flex items-center justify-center ${
                      isCritical 
                        ? 'bg-[#FCEBE5] text-[#C6533A]' 
                        : isHigh 
                        ? 'bg-[#FFF3D9] text-[#A66B16]' 
                        : 'bg-[#E8F3E9] text-[#246B4D]'
                    }`}>
                      {isCritical ? <AlertTriangle className="w-4 h-4" /> : isHigh ? <Flame className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-[#174A36]">
                          {alert.productName}
                        </span>
                        {!alert.isRead && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF3EC] text-[#246B4D]">
                            NUEVA
                          </span>
                        )}
                        <span className="text-xs font-mono text-[#78847C]">
                          Vence: {alert.expirationDate}
                        </span>
                      </div>

                      <p className="text-xs text-[#24372F] leading-relaxed">
                        {alert.message}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {!alert.isRead && (
                      <button
                        onClick={() => handleMarkRead(alert.id)}
                        className="p-1.5 rounded-xl text-[#78847C] hover:text-[#246B4D] hover:bg-[#EAF3EC] transition"
                        title="Marcar como leída"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}

                    {matchingProduct && (
                      <button
                        onClick={() => onSelectProduct(matchingProduct)}
                        className="p-1.5 rounded-xl text-[#78847C] hover:text-[#174A36] hover:bg-[#F8F9F6] transition"
                        title="Ver producto"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() => handleDismiss(alert.id)}
                      className="p-1.5 rounded-xl text-[#78847C] hover:text-[#C6533A] hover:bg-[#FCEBE5] transition"
                      title="Descartar alerta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
