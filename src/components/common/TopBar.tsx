import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Bell, 
  Menu, 
  ChevronDown, 
  Sprout, 
  LogOut, 
  Settings as SettingsIcon,
  Download,
  Store,
  Sparkles
} from 'lucide-react';
import { ActiveTab, StoreSettings } from '../../types';
import { PWAInstallButton } from './PWAInstallButton';
import { useAuth } from '../../contexts/AuthContext';

interface TopBarProps {
  onToggleMobileMenu: () => void;
  unreadAlertsCount: number;
  criticalAlertsCount: number;
  settings: StoreSettings;
  setActiveTab: (tab: ActiveTab) => void;
  isDemoMode?: boolean;
  onOpenDemo?: () => void;
  onExitDemo?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onToggleMobileMenu,
  unreadAlertsCount,
  criticalAlertsCount,
  settings,
  setActiveTab,
  isDemoMode = false,
  onOpenDemo,
  onExitDemo,
}) => {
  const { userProfile, logout } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Format today's date dynamically in Spanish
  const formattedDate = React.useMemo(() => {
    const now = new Date();
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const dayName = days[now.getDay()];
    const dayNum = now.getDate();
    const monthName = months[now.getMonth()];
    return `${dayName}, ${dayNum} De ${monthName}`;
  }, []);

  const userName = userProfile?.displayName || 'Comerciante';

  return (
    <header className="sticky top-0 z-20 w-full bg-white border-b border-[#E7EBE5] h-16 flex items-center justify-between px-4 sm:px-8">
      {/* Mobile brand & hamburger */}
      <div className="flex items-center gap-3 lg:hidden">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="p-2 rounded-xl text-[#78847C] hover:text-[#174A36] hover:bg-[#F8F9F6] transition"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2" onClick={() => setActiveTab('dashboard')}>
          <div className="w-8 h-8 rounded-xl bg-[#EAF3EC] flex items-center justify-center text-[#246B4D]">
            <Sprout className="w-4 h-4 stroke-[2.2]" />
          </div>
          <span className="text-lg font-bold tracking-tight text-[#174A36] lowercase">
            venceya
          </span>
        </div>
      </div>

      {/* Spacer for desktop since sidebar is fixed */}
      <div className="hidden lg:block"></div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 sm:gap-6">
        {/* Dynamic Current Date */}
        <div className="hidden md:flex items-center gap-2 text-xs font-medium text-[#78847C]">
          <CalendarIcon className="w-4 h-4 text-[#78847C]" />
          <span>{formattedDate}</span>
        </div>

        {/* PWA Install Button (Compact) */}
        <div className="hidden sm:block">
          <PWAInstallButton variant="compact" />
        </div>

        {/* Demo Mode Button / Active Badge */}
        {isDemoMode ? (
          <div className="flex items-center gap-1.5">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-[#FFF3D9] border border-[#FBEAC4] text-[#A66B16]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A66B16] animate-pulse" />
              <span>Modo Demo</span>
            </span>
            {onExitDemo && (
              <button
                type="button"
                onClick={onExitDemo}
                className="px-2.5 py-1 text-xs font-semibold rounded-xl bg-[#246B4D] hover:bg-[#174A36] text-white transition shadow-2xs"
                title="Volver a mis datos reales"
              >
                Salir
              </button>
            )}
          </div>
        ) : (
          onOpenDemo && (
            <button
              type="button"
              onClick={onOpenDemo}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-[#D5E8D7] bg-[#EAF3EC] hover:bg-[#D5E8D7] text-xs font-semibold text-[#246B4D] transition shadow-2xs"
              title="Probar con datos de ejemplo"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Probar demo</span>
            </button>
          )
        )}

        {/* Notifications Icon Button */}
        <button
          type="button"
          onClick={() => setActiveTab('alerts')}
          className="relative w-9 h-9 rounded-full border border-[#E7EBE5] flex items-center justify-center text-[#78847C] hover:text-[#174A36] hover:bg-[#F8F9F6] transition"
          title="Ver alertas"
          aria-label="Notificaciones"
        >
          <Bell className="w-4 h-4" />
          {unreadAlertsCount > 0 && (
            <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${
              criticalAlertsCount > 0 ? 'bg-[#C6533A] animate-pulse' : 'bg-[#A66B16]'
            }`} />
          )}
        </button>

        {/* User Profile Avatar Lockup */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2.5 p-1 rounded-full hover:bg-[#F8F9F6] transition text-left"
          >
            <div className="w-8 h-8 rounded-full bg-[#EAF3EC] text-[#246B4D] font-bold text-xs flex items-center justify-center border border-[#EAF3EC]">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="hidden sm:inline text-sm font-semibold text-[#174A36] max-w-[140px] truncate">
              {userName}
            </span>
            <ChevronDown className="hidden sm:inline w-3.5 h-3.5 text-[#78847C]" />
          </button>

          {/* Profile Dropdown */}
          {isProfileOpen && (
            <>
              <div 
                className="fixed inset-0 z-30" 
                onClick={() => setIsProfileOpen(false)} 
              />
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-[#E7EBE5] shadow-lg py-2 z-40 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-2 border-b border-[#E7EBE5]">
                  <div className="font-semibold text-sm text-[#174A36] truncate">{userName}</div>
                  <div className="text-xs text-[#78847C] truncate">{settings.storeName}</div>
                  <div className="text-[11px] text-[#78847C]/80 truncate mt-0.5">{userProfile?.email}</div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false);
                    setActiveTab('settings');
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs text-[#24372F] hover:bg-[#F8F9F6] flex items-center gap-2.5 transition"
                >
                  <SettingsIcon className="w-4 h-4 text-[#78847C]" />
                  <span>Ajustes del Comercio</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false);
                    setActiveTab('results');
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs text-[#24372F] hover:bg-[#F8F9F6] flex items-center gap-2.5 transition"
                >
                  <CalendarIcon className="w-4 h-4 text-[#78847C]" />
                  <span>Reporte de Resultados</span>
                </button>

                <div className="my-1 border-t border-[#E7EBE5]" />

                <button
                  type="button"
                  onClick={async () => {
                    setIsProfileOpen(false);
                    await logout();
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs text-[#C6533A] hover:bg-[#FCEBE5] flex items-center gap-2.5 transition font-semibold"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
