import React, { useState } from 'react';
import { 
  PackagePlus, 
  Camera, 
  Edit3, 
  Bell, 
  ChevronDown, 
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { ActiveTab, StoreSettings } from '../../types';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  unreadAlertsCount: number;
  criticalAlertsCount: number;
  settings: StoreSettings;
  onOpenScan: () => void;
  onOpenManualAdd: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  unreadAlertsCount,
  criticalAlertsCount,
  settings,
  onOpenScan,
  onOpenManualAdd,
}) => {
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  const navItems: { id: ActiveTab; label: string; badge?: number; critical?: boolean }[] = [
    { id: 'dashboard', label: 'Inicio' },
    { id: 'products', label: 'Productos' },
    { id: 'expirations', label: 'Vencimientos' },
    { id: 'alerts', label: 'Alertas', badge: unreadAlertsCount, critical: criticalAlertsCount > 0 },
    { id: 'suggestions', label: 'Sugerencias' },
    { id: 'settings', label: 'Ajustes' },
  ];

  return (
    <header className="sticky top-0 z-30 w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2.5 text-left group focus:outline-none"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center text-white shadow-md shadow-emerald-900/30 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-lg font-extrabold tracking-tight text-white flex items-center gap-1.5">
                Vence<span className="text-emerald-400">Ya</span>
              </span>
              <span className="hidden sm:block text-[11px] text-slate-400 -mt-1 font-medium truncate max-w-[150px]">
                {settings.storeName}
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation Links (Desktop) */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative px-3.5 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
                  isActive 
                    ? 'text-white bg-slate-800 shadow-inner' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`px-1.5 py-0.2 text-[11px] font-mono font-bold rounded-full ${
                    item.critical ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-700 text-slate-200'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Actions (Add Product dropdown & PWA Install) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="hidden sm:block">
            <PWAInstallButton variant="compact" />
          </div>

          {/* Quick Alert Bell button for mobile/compact */}
          <button
            onClick={() => setActiveTab('alerts')}
            className="lg:hidden relative p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition"
            aria-label="Ver alertas"
          >
            <Bell className="w-5 h-5" />
            {unreadAlertsCount > 0 && (
              <span className={`absolute top-1 right-1 w-2.5 h-2.5 rounded-full ${criticalAlertsCount > 0 ? 'bg-rose-500 animate-pulse' : 'bg-amber-400'}`} />
            )}
          </button>

          {/* Add Product Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
              className="flex items-center gap-2 px-3.5 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition shadow-sm active:scale-95 whitespace-nowrap shrink-0"
              aria-expanded={isAddMenuOpen}
            >
              <PackagePlus className="w-4 h-4 shrink-0" />
              <span className="hidden xs:inline">Agregar Producto</span>
              <span className="xs:hidden">Agregar</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-80" />
            </button>

            {isAddMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-30" 
                  onClick={() => setIsAddMenuOpen(false)} 
                />
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl py-2 z-40 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    onClick={() => {
                      setIsAddMenuOpen(false);
                      onOpenScan();
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-3 transition"
                  >
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                      <Camera className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-medium">Escanear código</div>
                      <div className="text-[11px] text-slate-400">Usar cámara del celular</div>
                    </div>
                  </button>

                  <div className="h-px bg-slate-800 my-1" />

                  <button
                    onClick={() => {
                      setIsAddMenuOpen(false);
                      onOpenManualAdd();
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-3 transition"
                  >
                    <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                      <Edit3 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-medium">Carga manual</div>
                      <div className="text-[11px] text-slate-400">Escribir datos y lote</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
