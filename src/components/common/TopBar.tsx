import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Bell, 
  Menu, 
  ChevronDown, 
  Sprout, 
  LogOut, 
  Settings as SettingsIcon,
  Store,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { ActiveTab, StoreSettings } from '../../types';
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

  // Format today's date dynamically in Spanish, matching: "Miércoles, 4 De Noviembre"
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

  // Display user name: María / displayName
  const userName = userProfile?.displayName || 'María';
  const userInitial = userName.charAt(0).toUpperCase() || 'M';

  return (
    <header className="sticky top-0 z-20 w-full bg-white border-b border-[#EAEBE8] h-[78px] flex items-center justify-between px-6 sm:px-10">
      {/* Mobile brand & hamburger toggle */}
      <div className="flex items-center gap-2.5 lg:hidden">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="p-2.5 rounded-xl text-[#7A8580] hover:text-[#173F35] hover:bg-[#F8F9F6] transition min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2" onClick={() => setActiveTab('dashboard')}>
          <div className="w-8 h-8 rounded-xl bg-[#EAF3EC] flex items-center justify-center text-[#246B4F]">
            <Sprout className="w-4 h-4 stroke-[2.2]" />
          </div>
          <span className="text-lg font-bold tracking-tight text-[#173F35] lowercase">
            venceya
          </span>
        </div>
      </div>

      {/* Spacer for desktop layout since sidebar is fixed */}
      <div className="hidden lg:block"></div>

      {/* Right Controls: Exactly as in image_3dc5967d.png */}
      <div className="flex items-center gap-4 sm:gap-6">
        {/* Dynamic Current Date */}
        <div className="hidden md:flex items-center gap-2 text-xs font-medium text-[#7A8580]">
          <CalendarIcon className="w-4 h-4 text-[#7A8580]" />
          <span>{formattedDate}</span>
        </div>

        {/* Notifications Icon Button */}
        <button
          type="button"
          onClick={() => setActiveTab('alerts')}
          className="w-10 h-10 rounded-xl border border-[#EAEBE8] hover:border-[#246B4F]/40 hover:bg-[#F8F9F6] flex items-center justify-center text-[#5C6861] transition relative"
          title="Ver alertas de vencimiento"
          aria-label="Notificaciones"
        >
          <Bell className="w-4 h-4" />
          {unreadAlertsCount > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#D95D39]" />
          )}
        </button>

        {/* User Avatar & Name Profile Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2.5 py-1.5 px-2 rounded-2xl hover:bg-[#F8F9F6] transition"
            aria-expanded={isProfileOpen}
            aria-haspopup="true"
          >
            <div className="w-8 h-8 rounded-full bg-[#D1E7D8] text-[#173F35] font-bold text-xs flex items-center justify-center shrink-0">
              {userInitial}
            </div>
            <span className="hidden sm:inline text-sm font-semibold text-[#26352F]">
              {userName}
            </span>
            <ChevronDown className="w-4 h-4 text-[#7A8580]" />
          </button>

          {/* Profile Dropdown Menu */}
          {isProfileOpen && (
            <div className="absolute right-0 top-12 z-30 w-56 bg-white rounded-2xl shadow-xl border border-[#EAEBE8] p-2 space-y-1 animate-in fade-in duration-100 text-xs">
              <div className="px-3 py-2 border-b border-[#F0F2EE]">
                <div className="font-bold text-[#173F35] truncate">{userName}</div>
                <div className="text-[11px] text-[#7A8580] truncate">{userProfile?.email}</div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsProfileOpen(false);
                  setActiveTab('settings');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[#26352F] hover:bg-[#F7F8F5] transition"
              >
                <SettingsIcon className="w-4 h-4 text-[#7A8580]" />
                <span>Ajustes del comercio</span>
              </button>

              {/* Demo Mode Toggle */}
              {isDemoMode ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false);
                    if (onExitDemo) onExitDemo();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[#A66B16] hover:bg-[#FFF3D9] transition font-semibold"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Salir de modo demo</span>
                </button>
              ) : (
                onOpenDemo && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      onOpenDemo();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[#246B4F] hover:bg-[#EAF3EC] transition font-semibold"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Probar modo demo</span>
                  </button>
                )
              )}

              <div className="pt-1 border-t border-[#F0F2EE]">
                <button
                  type="button"
                  onClick={async () => {
                    setIsProfileOpen(false);
                    await logout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[#C6533A] hover:bg-[#FCEBE5] transition font-semibold"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Cerrar sesión</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
