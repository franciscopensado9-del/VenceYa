import React, { useState } from 'react';
import { Download, Share2, PlusSquare, X, Check } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ variant?: 'compact' | 'full' }> = ({ variant = 'compact' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  if (isInstalled) {
    if (variant === 'full') {
      return (
        <div className="flex items-center gap-2 px-3.5 py-2.5 text-xs text-[#246B4D] bg-[#E8F3E9] border border-[#E7EBE5] rounded-xl font-medium">
          <Check className="w-4 h-4 text-[#246B4D] shrink-0" />
          <span>VenceYa está instalada como aplicación en este dispositivo</span>
        </div>
      );
    }
    return null;
  }

  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      setInstallSuccess(true);
    }
  };

  if (installSuccess) {
    return (
      <span className="text-xs text-[#246B4D] font-medium">¡Instalado con éxito!</span>
    );
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={handleInstallClick}
        className={`flex items-center gap-2 rounded-xl bg-[#EAF3EC] hover:bg-[#246B4D] text-[#246B4D] hover:text-white font-medium border border-[#E7EBE5] transition active:scale-95 ${
          variant === 'full' 
            ? 'w-full justify-center px-4 py-2.5 text-sm' 
            : 'px-3 py-1.5 text-xs whitespace-nowrap shrink-0'
        }`}
        title="Instalar VenceYa en tu pantalla de inicio"
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>Instalar App PWA</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-2 rounded-xl border border-[#E7EBE5] bg-white hover:bg-[#F8F9F6] text-[#24372F] font-medium transition active:scale-95 ${
            variant === 'full' 
              ? 'w-full justify-center px-4 py-2.5 text-sm' 
              : 'px-3 py-1.5 text-xs whitespace-nowrap shrink-0'
          }`}
        >
          <Download className="w-3.5 h-3.5 text-[#246B4D] shrink-0" />
          <span>Instalar en iPhone</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white border border-[#E7EBE5] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-[#E7EBE5]">
                <h3 className="text-base font-semibold text-[#174A36]">Instalar VenceYa en iPhone</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-[#78847C] hover:text-[#174A36] hover:bg-[#F8F9F6]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-sm text-[#24372F]">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#F8F9F6] border border-[#E7EBE5]">
                  <div className="p-1.5 rounded-lg bg-[#EAF3EC] text-[#246B4D] shrink-0">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-[#174A36]">1. Tocá Compartir</span>
                    <p className="text-xs text-[#78847C] mt-0.5">En la barra inferior de Safari, tocá el ícono del cuadrado con la flecha hacia arriba.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#F8F9F6] border border-[#E7EBE5]">
                  <div className="p-1.5 rounded-lg bg-[#EAF3EC] text-[#246B4D] shrink-0">
                    <PlusSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-[#174A36]">2. Agregar a inicio</span>
                    <p className="text-xs text-[#78847C] mt-0.5">Deslizá hacia abajo y seleccioná la opción <strong>&quot;Agregar a pantalla de inicio&quot;</strong>.</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-[#246B4D] hover:bg-[#174A36] py-2.5 text-sm font-medium text-white transition"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
