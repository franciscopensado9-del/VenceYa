import React, { useState } from 'react';
import { 
  Home, 
  Package, 
  Bell, 
  MoreHorizontal, 
  CalendarClock, 
  Sparkles, 
  TrendingUp, 
  Settings, 
  LogOut, 
  X,
  Store,
  RotateCcw,
  FileSpreadsheet,
  Tag,
  Plus,
  Camera
} from 'lucide-react';
import { ActiveTab } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface BottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  unreadAlertsCount: number;
  isDemoMode?: boolean;
  onOpenDemo?: () => void;
  onExitDemo?: () => void;
  onOpenExcelImport?: () => void;
  onOpenSavedPromotions?: () => void;
  onOpenManualAdd?: () => void;
  onOpenScan?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  unreadAlertsCount,
  isDemoMode = false,
  onOpenDemo,
  onExitDemo,
  onOpenExcelImport,
  onOpenSavedPromotions,
  onOpenManualAdd,
  onOpenScan,
}) => {
  const { userProfile, logout } = useAuth();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  // Exactly 4 primary mobile tabs as specified: Inicio, Productos, Alertas y Más
  const mainTabs: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'dashboard', label: 'Inicio', icon: Home },
    { id: 'products', label: 'Productos', icon: Package },
    { id: 'alerts', label: 'Alertas', icon: Bell, badge: unreadAlertsCount },
  ];

  const isMoreActive = activeTab === 'results' || activeTab === 'expirations' || activeTab === 'suggestions' || activeTab === 'settings';

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
      {/* Mobile Bottom Navigation Bar: exactly 4 items (Inicio, Productos, Alertas, Más) */}
      <nav 
        aria-label="Navegación principal móvil"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#E7EBE5] pb-[max(env(safe-area-inset-bottom),6px)] pt-1 shadow-xs select-none"
      >
        <div className="grid grid-cols-4 items-center h-14 max-w-md mx-auto px-2">
          {mainTabs.map(tab => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center min-h-[48px] min-w-[44px] transition-colors relative active:scale-95 ${
                  isActive ? 'text-[#246B4F]' : 'text-[#7A8580] hover:text-[#173F35]'
                }`}
                aria-label={tab.label}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 stroke-[2.3]' : 'stroke-[1.8]'}`} />
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="absolute -top-1 -right-2 px-1 text-[9px] font-mono font-bold rounded-full bg-[#FCEBE5] text-[#C6533A] min-w-[14px] text-center shadow-xs">
                      {tab.badge > 9 ? '9+' : tab.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] tracking-tight mt-0.5 truncate max-w-[68px] ${
                  isActive ? 'font-bold text-[#173F35]' : 'font-medium text-[#7A8580]'
                }`}>
                  {tab.label}
                </span>
                {isActive && (
                  <span className="absolute bottom-0 w-8 h-0.5 rounded-full bg-[#246B4F]" />
                )}
              </button>
            );
          })}

          {/* Tab 4: Más */}
          <button
            type="button"
            onClick={() => setIsMoreOpen(true)}
            className={`flex flex-col items-center justify-center min-h-[48px] min-w-[44px] transition-colors relative active:scale-95 ${
              isMoreActive ? 'text-[#246B4F]' : 'text-[#7A8580] hover:text-[#173F35]'
            }`}
            aria-label="Más opciones"
          >
            <div className="relative">
              <MoreHorizontal className={`w-5 h-5 transition-transform ${isMoreActive ? 'scale-110 stroke-[2.3]' : 'stroke-[1.8]'}`} />
            </div>
            <span className={`text-[10px] tracking-tight mt-0.5 truncate max-w-[68px] ${
              isMoreActive ? 'font-bold text-[#173F35]' : 'font-medium text-[#7A8580]'
            }`}>
              Más
            </span>
            {isMoreActive && (
              <span className="absolute bottom-0 w-8 h-0.5 rounded-full bg-[#246B4F]" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile "Más" Modal Sheet */}
      {isMoreOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMoreOpen(false)}
          />
          <div className="relative w-full max-h-[85vh] overflow-y-auto bg-white rounded-t-3xl border-t border-[#E7EBE5] p-5 sm:p-6 pb-[max(env(safe-area-inset-bottom),20px)] shadow-2xl z-10 animate-in slide-in-from-bottom duration-200 space-y-4">
            
            {/* Sheet Handle */}
            <div className="w-12 h-1 bg-[#E7EBE5] rounded-full mx-auto -mt-1 mb-2" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E7EBE5]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#EAF3EC] text-[#246B4D] flex items-center justify-center shrink-0">
                  <Store className="w-4 h-4" />
                </div>
                <div className="min-w-0 text-left">
                  <div className="text-xs font-bold text-[#174A36] truncate">
                    {userProfile?.storeName || 'Mi Comercio'}
                  </div>
                  <div className="text-[11px] text-[#78847C] truncate">
                    {userProfile?.displayName || userProfile?.email || 'Comerciante'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                className="p-2 rounded-xl text-[#78847C] hover:text-[#174A36] hover:bg-[#F8F9F6] min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Cerrar menú"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Action Buttons on Top of More Sheet */}
            {(onOpenManualAdd || onOpenScan) && (
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                {onOpenManualAdd && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreOpen(false);
                      onOpenManualAdd();
                    }}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 bg-[#246B4D] hover:bg-[#174A36] text-white rounded-2xl text-xs font-bold shadow-xs transition active:scale-95 min-h-[44px]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nuevo producto</span>
                  </button>
                )}
                {onOpenScan && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreOpen(false);
                      onOpenScan();
                    }}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 bg-white hover:bg-[#F8F9F6] text-[#246B4D] border border-[#E7EBE5] rounded-2xl text-xs font-bold shadow-2xs transition active:scale-95 min-h-[44px]"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Escanear</span>
                  </button>
                )}
              </div>
            )}

            {/* Secondary Sections */}
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => handleSelectMoreOption('expirations')}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-semibold transition min-h-[44px] ${
                  activeTab === 'expirations' 
                    ? 'bg-[#EAF3EC] text-[#174A36]' 
                    : 'text-[#24372F] hover:bg-[#F8F9F6]'
                }`}
              >
                <CalendarClock className="w-4 h-4 text-[#246B4D] shrink-0" />
                <span>Vencimientos (PEPS)</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectMoreOption('suggestions')}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-semibold transition min-h-[44px] ${
                  activeTab === 'suggestions' 
                    ? 'bg-[#EAF3EC] text-[#174A36]' 
                    : 'text-[#24372F] hover:bg-[#F8F9F6]'
                }`}
              >
                <Sparkles className="w-4 h-4 text-[#246B4D] shrink-0" />
                <span>Sugerencias comerciales</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectMoreOption('results')}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-semibold transition min-h-[44px] ${
                  activeTab === 'results' 
                    ? 'bg-[#EAF3EC] text-[#174A36]' 
                    : 'text-[#24372F] hover:bg-[#F8F9F6]'
                }`}
              >
                <TrendingUp className="w-4 h-4 text-[#246B4D] shrink-0" />
                <span>Resultados y mermas</span>
              </button>

              {onOpenExcelImport && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreOpen(false);
                    onOpenExcelImport();
                  }}
                  className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-semibold text-[#24372F] hover:bg-[#F8F9F6] transition min-h-[44px]"
                >
                  <FileSpreadsheet className="w-4 h-4 text-[#246B4D] shrink-0" />
                  <span>Importar desde Excel</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleSelectMoreOption('settings')}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-semibold transition min-h-[44px] ${
                  activeTab === 'settings' 
                    ? 'bg-[#EAF3EC] text-[#174A36]' 
                    : 'text-[#24372F] hover:bg-[#F8F9F6]'
                }`}
              >
                <Settings className="w-4 h-4 text-[#78847C] shrink-0" />
                <span>Ajustes del comercio</span>
              </button>

              {onOpenSavedPromotions && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreOpen(false);
                    onOpenSavedPromotions();
                  }}
                  className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-semibold text-[#24372F] hover:bg-[#F8F9F6] transition min-h-[44px]"
                >
                  <Tag className="w-4 h-4 text-[#246B4D] shrink-0" />
                  <span>Promociones guardadas</span>
                </button>
              )}
            </div>

            {/* Demo Mode Action in Mobile Menu */}
            <div className="pt-2 border-t border-[#E7EBE5]">
              {isDemoMode ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreOpen(false);
                    if (onExitDemo) onExitDemo();
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-[#FFF3D9] border border-[#FBEAC4] text-[#A66B16] text-xs font-bold transition min-h-[44px]"
                >
                  <div className="flex items-center gap-2.5">
                    <RotateCcw className="w-4 h-4" />
                    <span>Modo Demo Activo (Salir y ver mis datos)</span>
                  </div>
                  <span className="text-[11px] underline">Salir</span>
                </button>
              ) : (
                onOpenDemo && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreOpen(false);
                      onOpenDemo();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#EAF3EC] border border-[#D5E8D7] text-[#246B4D] text-xs font-bold transition min-h-[44px]"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Probar modo demo con ejemplos</span>
                  </button>
                )
              )}
            </div>

            {/* Logout button */}
            <div className="pt-2 border-t border-[#E7EBE5]">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[#FCEBE5] hover:bg-[#F9DDD3] text-[#C6533A] text-xs font-bold transition min-h-[44px]"
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
