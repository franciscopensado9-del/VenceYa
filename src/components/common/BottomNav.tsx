import React, { useState } from 'react';
import { 
  Home, 
  Package, 
  CalendarClock, 
  Bell, 
  MoreHorizontal, 
  Sparkles, 
  TrendingUp, 
  Settings, 
  LogOut, 
  X,
  Store
} from 'lucide-react';
import { ActiveTab } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface BottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  unreadAlertsCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  unreadAlertsCount,
}) => {
  const { userProfile, logout } = useAuth();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const mainTabs: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'dashboard', label: 'Inicio', icon: Home },
    { id: 'products', label: 'Productos', icon: Package },
    { id: 'expirations', label: 'Vencimientos', icon: CalendarClock },
    { id: 'alerts', label: 'Alertas', icon: Bell, badge: unreadAlertsCount },
  ];

  const isMoreActive = activeTab === 'suggestions' || activeTab === 'results' || activeTab === 'settings';

  const handleSelectMoreOption = (tab: ActiveTab) => {
    setActiveTab(tab);
    setIsMoreOpen(false);
  };

  const handleLogout = async () => {
    setIsMoreOpen(false);
    await logout();
  };

  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
      <nav 
        aria-label="Navegación principal móvil"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#E7EBE5] pb-safe shadow-xs select-none"
      >
        <div className="grid grid-cols-5 items-center h-16 max-w-md mx-auto px-1">
          {mainTabs.map(tab => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors relative ${
                  isActive ? 'text-[#246B4D]' : 'text-[#78847C] hover:text-[#174A36]'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 stroke-[2.3]' : 'stroke-[1.8]'}`} />
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="absolute -top-1 -right-2 px-1 text-[9px] font-mono font-bold rounded-full bg-[#FCEBE5] text-[#C6533A] min-w-[14px] text-center shadow-xs">
                      {tab.badge > 9 ? '9+' : tab.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] tracking-tight mt-1 truncate max-w-[60px] ${
                  isActive ? 'font-bold text-[#174A36]' : 'font-medium text-[#78847C]'
                }`}>
                  {tab.label}
                </span>
              </button>
            );
          })}

          {/* More options button */}
          <button
            type="button"
            onClick={() => setIsMoreOpen(true)}
            className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors relative ${
              isMoreActive ? 'text-[#246B4D]' : 'text-[#78847C] hover:text-[#174A36]'
            }`}
          >
            <div className="relative">
              <MoreHorizontal className={`w-5 h-5 transition-transform ${isMoreActive ? 'scale-110 stroke-[2.3]' : 'stroke-[1.8]'}`} />
            </div>
            <span className={`text-[10px] tracking-tight mt-1 truncate max-w-[60px] ${
              isMoreActive ? 'font-bold text-[#174A36]' : 'font-medium text-[#78847C]'
            }`}>
              Más
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile "Más" Modal Sheet */}
      {isMoreOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMoreOpen(false)}
          />
          <div className="relative w-full bg-white rounded-t-3xl border-t border-[#E7EBE5] p-6 pb-safe shadow-2xl z-10 animate-in slide-in-from-bottom duration-200 space-y-4">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E7EBE5]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#EAF3EC] text-[#246B4D] flex items-center justify-center">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#174A36] truncate">
                    {userProfile?.storeName || 'Mi Comercio'}
                  </div>
                  <div className="text-[11px] text-[#78847C]">
                    {userProfile?.email}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                className="p-1.5 rounded-xl text-[#78847C] hover:text-[#174A36] hover:bg-[#F8F9F6]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu List */}
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => handleSelectMoreOption('suggestions')}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-semibold transition ${
                  activeTab === 'suggestions' 
                    ? 'bg-[#EAF3EC] text-[#174A36]' 
                    : 'text-[#24372F] hover:bg-[#F8F9F6]'
                }`}
              >
                <Sparkles className="w-4 h-4 text-[#246B4D]" />
                <span>Sugerencias para Reducir Pérdidas</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectMoreOption('results')}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-semibold transition ${
                  activeTab === 'results' 
                    ? 'bg-[#EAF3EC] text-[#174A36]' 
                    : 'text-[#24372F] hover:bg-[#F8F9F6]'
                }`}
              >
                <TrendingUp className="w-4 h-4 text-[#246B4D]" />
                <span>Resultados y Métricas del Comercio</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectMoreOption('settings')}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-semibold transition ${
                  activeTab === 'settings' 
                    ? 'bg-[#EAF3EC] text-[#174A36]' 
                    : 'text-[#24372F] hover:bg-[#F8F9F6]'
                }`}
              >
                <Settings className="w-4 h-4 text-[#78847C]" />
                <span>Configuración y Respaldos</span>
              </button>
            </div>

            {/* Logout button */}
            <div className="pt-2 border-t border-[#E7EBE5]">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[#FCEBE5] hover:bg-[#F9DDD3] text-[#C6533A] text-xs font-bold transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
