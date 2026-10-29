import React from 'react';
import { Sprout, Plus, ArrowRight, ShieldCheck, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface WelcomeOnboardingModalProps {
  isOpen: boolean;
  onOpenAddProduct: () => void;
  onExplore: () => void;
}

export const WelcomeOnboardingModal: React.FC<WelcomeOnboardingModalProps> = ({
  isOpen,
  onOpenAddProduct,
  onExplore,
}) => {
  const { userProfile, dismissWelcome } = useAuth();

  if (!isOpen) return null;

  const handleAddFirstProduct = () => {
    dismissWelcome();
    onOpenAddProduct();
  };

  const handleExploreApp = () => {
    dismissWelcome();
    onExplore();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white border border-[#E7EBE5] rounded-3xl p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200 text-center"
        role="dialog"
        aria-modal="true"
      >
        {/* Brand Icon */}
        <div className="w-16 h-16 rounded-3xl bg-[#EAF3EC] text-[#246B4D] flex items-center justify-center mx-auto mb-5 shadow-xs">
          <Sprout className="w-9 h-9 stroke-[2.2]" />
        </div>

        {/* Title & Subtitle */}
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#174A36] tracking-tight">
          ¡Bienvenido a VenceYa!
        </h2>
        <p className="text-sm font-semibold text-[#246B4D] mt-1">
          {userProfile?.storeName || 'Tu Comercio'}
        </p>
        <p className="text-sm text-[#78847C] mt-2 max-w-sm mx-auto leading-relaxed">
          Empecemos a reducir las pérdidas de tu comercio con control inteligente de lotes y fechas de vencimiento.
        </p>

        {/* Highlights */}
        <div className="my-6 p-4 rounded-2xl bg-[#F8F9F6] border border-[#E7EBE5] text-left space-y-2.5">
          <div className="flex items-center gap-2.5 text-xs font-semibold text-[#174A36]">
            <div className="w-5 h-5 rounded-full bg-[#E8F3E9] text-[#246B4D] flex items-center justify-center shrink-0">
              <Check className="w-3 h-3 stroke-[3]" />
            </div>
            <span>Base de datos en la nube aislada exclusivamente para tu comercio</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs font-semibold text-[#174A36]">
            <div className="w-5 h-5 rounded-full bg-[#E8F3E9] text-[#246B4D] flex items-center justify-center shrink-0">
              <Check className="w-3 h-3 stroke-[3]" />
            </div>
            <span>Alertas anticipadas en tiempo real antes de que la mercadería venza</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs font-semibold text-[#174A36]">
            <div className="w-5 h-5 rounded-full bg-[#E8F3E9] text-[#246B4D] flex items-center justify-center shrink-0">
              <Check className="w-3 h-3 stroke-[3]" />
            </div>
            <span>Escáner de código de barras para cargar productos en segundos</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
          <button
            type="button"
            onClick={handleAddFirstProduct}
            className="w-full sm:w-auto px-6 py-3.5 bg-[#246B4D] hover:bg-[#174A36] text-white text-sm font-semibold rounded-2xl transition shadow-xs flex items-center justify-center gap-2 active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Agregar mi primer producto</span>
          </button>

          <button
            type="button"
            onClick={handleExploreApp}
            className="w-full sm:w-auto px-5 py-3.5 bg-[#F8F9F6] hover:bg-[#E7EBE5] text-[#174A36] text-sm font-semibold rounded-2xl border border-[#E7EBE5] transition flex items-center justify-center gap-2"
          >
            <span>Explorar la aplicación</span>
            <ArrowRight className="w-4 h-4 text-[#78847C]" />
          </button>
        </div>
      </div>
    </div>
  );
};
