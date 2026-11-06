import React from 'react';
import { 
  Home, 
  Package, 
  Bell, 
  TrendingUp, 
  CalendarClock, 
  Sparkles, 
  Tag, 
  FileSpreadsheet, 
  Settings, 
  Plus, 
  Store, 
  LogOut, 
  X, 
  Sprout, 
  ChevronRight,
  Camera
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
  onOpenExcelImport?: () => void;
  onOpenSavedPromotions?: () => void;
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
  onOpenExcelImport,
  onOpenSavedPromotions,
}) => {
  const { userProfile, logout } = useAuth();

  // The 8 unified sections in the exact order requested by user:
  // 1. Inicio, 2. Productos, 3. Vencimientos, 4. Alertas, 5. Sugerencias, 6. Resultados, 7. Importar desde Excel, 8. Ajustes
  const menuItems: {
    id?: ActiveTab;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: number;
    onClick?: () => void;
  }[] = [
    { id: 'dashboard', label: 'Inicio', icon: Home },
    { id: 'products', label: 'Productos', icon: Package },
    { id: 'expirations', label: 'Vencimientos', icon: CalendarClock },
    { id: 'alerts', label: 'Alertas', icon: Bell, badge: unreadAlertsCount },
    { id: 'suggestions', label: 'Sugerencias', icon: Sparkles },
    { id: 'results', label: 'Resultados', icon: TrendingUp },
    ...(onOpenExcelImport ? [{
      label: 'Importar desde Excel',
      icon: FileSpreadsheet,
      onClick: onOpenExcelImport
    }] : []),
    { id: 'settings', label: 'Ajustes', icon: Settings },
  ];

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const storeName = settings.storeName || userProfile?.storeName || 'Almacén La Esquina';
  const storeLocation = settings.city || settings.address || 'Tandil, Argentina';

  const content = (
    <div className="flex flex-col h-full bg-white border-r border-[#EAEBE8] w-[272px] select-none text-[#26352F] p-5 justify-between overflow-y-auto">
      {/* Top Section */}
      <div className="space-y-5">
        {/* Brand Header */}
        <div className="flex items-center justify-between">
          <div 
            onClick={() => handleSelectTab('dashboard')} 
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#EAF3EC] flex items-center justify-center text-[#246B4F] shrink-0">
              <Sprout className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="text-[22px] font-black tracking-tight text-[#173F35] lowercase leading-none">
                venceya
              </div>
              <div className="text-[11px] font-medium text-[#7A8580] tracking-tight mt-1">
                menos merma, más venta
              </div>
            </div>
          </div>

          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-xl text-[#7A8580] hover:text-[#173F35] hover:bg-[#F8F9F6] transition"
              aria-label="Cerrar menú"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Action Buttons: Agregar producto + Escanear código */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={() => {
              onOpenAddProduct();
              if (onCloseMobile) onCloseMobile();
            }}
            className="w-full bg-[#246B4F] hover:bg-[#1C553E] text-white py-2.5 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-xs"
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
              className="w-full bg-[#F7F8F5] hover:bg-[#EAF3EC] text-[#173F35] border border-[#EAEBE8] py-2 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition active:scale-[0.98]"
            >
              <Camera className="w-3.5 h-3.5 text-[#246B4F]" />
              <span>Escanear código</span>
            </button>
          )}
        </div>

        {/* Section Label: MENÚ */}
        <div className="space-y-1">
          <div className="text-[11px] font-bold text-[#A0A8A3] tracking-wider px-3 uppercase">
            MENÚ
          </div>

          <nav className="space-y-0.5">
            {menuItems.map(item => {
              const isActive = item.id ? activeTab === item.id : false;
              const Icon = item.icon;

              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    if (item.onClick) {
                      item.onClick();
                    } else if (item.id) {
                      handleSelectTab(item.id);
                    }
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm transition-all duration-150 ${
                    isActive
                      ? 'bg-[#EAF3EC] text-[#173F35] font-bold'
                      : 'text-[#26352F] hover:text-[#173F35] hover:bg-[#F7F8F5] font-medium'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 transition-colors ${
                      isActive ? 'text-[#246B4F] stroke-[2.3]' : 'text-[#7A8580] stroke-[1.8]'
                    }`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#FCEBE5] text-[#C6533A] font-mono tabular-nums">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Middle & Bottom Section */}
      <div className="space-y-3 pt-3">
        {/* Informational Widget */}
        <div className="p-3.5 rounded-2xl bg-[#F7F8F5] border border-[#EBECE8] space-y-1.5">
          <div className="w-6 h-6 rounded-lg bg-[#EAF3EC] text-[#246B4F] flex items-center justify-center">
            <Sprout className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#173F35] leading-tight">
              Un pequeño paso,
            </div>
            <div className="text-[11px] text-[#7A8580] leading-snug">
              menos productos perdidos.
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleSelectTab('suggestions')}
            className="text-[11px] font-semibold text-[#246B4F] hover:underline flex items-center gap-1 transition pt-0.5"
          >
            <span>Conocé cómo funciona</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Bottom Store Card */}
        <div className="p-3 rounded-2xl bg-white border border-[#EAEBE8] flex items-center justify-between gap-2.5">
          <div 
            onClick={() => handleSelectTab('settings')}
            className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group"
            title="Ajustes del comercio"
          >
            <div className="w-8 h-8 rounded-xl bg-[#F0F2EE] text-[#5C6861] flex items-center justify-center shrink-0">
              <Store className="w-4 h-4" />
            </div>
            <div className="min-w-0 text-left">
              <div className="text-xs font-bold text-[#173F35] truncate group-hover:text-[#246B4F] transition">
                {storeName}
              </div>
              <div className="text-[10px] text-[#7A8580] truncate">
                {storeLocation}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={async () => {
              if (onCloseMobile) onCloseMobile();
              await logout();
            }}
            className="p-1.5 rounded-lg text-[#7A8580] hover:text-[#C6533A] hover:bg-[#FCEBE5] transition"
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
      {/* Desktop Persistent Fixed Left Sidebar */}
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
          <div className="relative flex-1 flex flex-col max-w-[272px] w-full bg-white shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
