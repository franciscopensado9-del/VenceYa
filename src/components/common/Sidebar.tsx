import { 
  Home, 
  Package, 
  CalendarClock, 
  Bell, 
  Sparkles, 
  TrendingUp, 
  Settings, 
  Plus, 
  Store, 
  MoreHorizontal, 
  Sprout, 
  Camera,
  LogOut,
  X 
} from 'lucide-react';
import { ActiveTab, StoreSettings } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  unreadAlertsCount: number;
  settings: StoreSettings;
  onOpenAddProduct: () => void;
  onOpenScan?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  isDemoMode?: boolean;
  onOpenDemo?: () => void;
  onExitDemo?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  unreadAlertsCount,
  settings,
  onOpenAddProduct,
  onOpenScan,
  isMobileOpen = false,
  onCloseMobile,
  isDemoMode = false,
  onOpenDemo,
  onExitDemo,
}) => {
  const { userProfile, logout } = useAuth();
  const menuItems: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'dashboard', label: 'Inicio', icon: Home },
    { id: 'products', label: 'Productos', icon: Package },
    { id: 'expirations', label: 'Vencimientos', icon: CalendarClock },
    { id: 'alerts', label: 'Alertas', icon: Bell, badge: unreadAlertsCount },
    { id: 'suggestions', label: 'Sugerencias', icon: Sparkles },
    { id: 'results', label: 'Resultados', icon: TrendingUp },
    { id: 'settings', label: 'Ajustes', icon: Settings },
  ];

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const content = (
    <div className="flex flex-col h-full bg-white border-r border-[#E7EBE5] w-[270px] select-none">
      {/* Brand Header */}
      <div className="p-6 pb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#EAF3EC] flex items-center justify-center text-[#246B4D] shrink-0 shadow-xs">
            <Sprout className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight text-[#174A36] lowercase leading-none">
              venceya
            </div>
          </div>
        </div>

        {/* Mobile close button */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-xl text-[#78847C] hover:text-[#174A36] hover:bg-[#F8F9F6] transition"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav Menu Items */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-6">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#78847C] px-3 mb-2">
            MENÚ
          </div>
          <nav className="space-y-1">
            {menuItems.map(item => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm transition-all duration-150 ${
                    isActive
                      ? 'bg-[#EAF3EC] text-[#174A36] font-semibold shadow-xs'
                      : 'text-[#78847C] hover:text-[#174A36] hover:bg-[#F8F9F6] font-medium'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 transition-colors ${
                      isActive ? 'text-[#246B4D]' : 'text-[#78847C]'
                    }`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#FCEBE5] text-[#C6533A] font-mono tabular-nums">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Action Button: Agregar producto */}
        <div className="pt-1 space-y-2">
          <button
            type="button"
            onClick={() => {
              onOpenAddProduct();
              if (onCloseMobile) onCloseMobile();
            }}
            className="w-full bg-[#246B4D] hover:bg-[#174A36] text-white py-3 px-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 shadow-xs transition active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Agregar producto</span>
          </button>

          {onOpenScan && (
            <button
              type="button"
              onClick={() => {
                onOpenScan();
                if (onCloseMobile) onCloseMobile();
              }}
              className="w-full bg-[#F8F9F6] hover:bg-[#EAF3EC] text-[#246B4D] border border-[#E7EBE5] py-2.5 px-3 rounded-2xl font-semibold text-xs flex items-center justify-center gap-2 transition active:scale-[0.98]"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Escanear código</span>
            </button>
          )}
        </div>

        {/* Probar Demo / Modo Demo Widget */}
        {isDemoMode ? (
          <div className="p-3.5 rounded-2xl bg-[#FFF3D9] border border-[#FBEAC4] space-y-2 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#A66B16]">
                Modo Demo Activo
              </span>
              <span className="w-2 h-2 rounded-full bg-[#A66B16] animate-pulse" />
            </div>
            <p className="text-[11px] text-[#A66B16]/90 leading-tight">
              Estás viendo 13 productos ficticios. Tus datos reales están a salvo.
            </p>
            {onExitDemo && (
              <button
                type="button"
                onClick={() => {
                  onExitDemo();
                  if (onCloseMobile) onCloseMobile();
                }}
                className="w-full py-1.5 px-3 bg-white hover:bg-[#F8F9F6] border border-[#FBEAC4] text-[#A66B16] text-xs font-bold rounded-xl transition shadow-2xs"
              >
                Salir de demo
              </button>
            )}
          </div>
        ) : (
          onOpenDemo && (
            <button
              type="button"
              onClick={() => {
                onOpenDemo();
                if (onCloseMobile) onCloseMobile();
              }}
              className="w-full bg-[#EAF3EC] hover:bg-[#D5E8D7] text-[#246B4D] border border-[#D5E8D7] py-2.5 px-3 rounded-2xl font-semibold text-xs flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#246B4D]" />
              <span>Probar demo con ejemplos</span>
            </button>
          )
        )}

        {/* Educational / Motivational Widget */}
        <div className="p-4 rounded-2xl bg-[#F8F9F6] border border-[#E7EBE5] space-y-2">
          <div className="w-7 h-7 rounded-xl bg-[#EAF3EC] text-[#246B4D] flex items-center justify-center">
            <Sprout className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#174A36] leading-tight">
              Un pequeño paso,
            </div>
            <div className="text-[11px] text-[#78847C] leading-snug">
              menos productos perdidos.
            </div>
          </div>
          <button
            onClick={() => handleSelectTab('suggestions')}
            className="text-[11px] font-semibold text-[#246B4D] hover:text-[#174A36] flex items-center gap-1 transition"
          >
            <span>Conocé cómo funciona</span>
            <span>&gt;</span>
          </button>
        </div>
      </div>

      {/* Store & User Profile Footer */}
      <div className="p-4 border-t border-[#E7EBE5] bg-white space-y-2">
        <div 
          className="flex items-center justify-between p-2 rounded-2xl hover:bg-[#F8F9F6] transition cursor-pointer"
          onClick={() => handleSelectTab('settings')}
          title="Ajustes del Comercio"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-[#EAF3EC] text-[#246B4D] flex items-center justify-center shrink-0 font-bold text-xs">
              {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : <Store className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#174A36] truncate">
                {settings.storeName || userProfile?.storeName || 'Mi Comercio'}
              </div>
              <div className="text-[11px] text-[#78847C] truncate">
                {userProfile?.displayName || 'Comerciante'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={async (e) => {
              e.stopPropagation();
              if (onCloseMobile) onCloseMobile();
              await logout();
            }}
            className="p-1.5 rounded-xl text-[#78847C] hover:text-[#C6533A] hover:bg-[#FCEBE5] transition"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 z-30">
        {content}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative flex-1 flex flex-col max-w-[280px] w-full bg-white shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
