import React from 'react';
import { AlertCircle, X, LogOut } from 'lucide-react';

interface DemoExitModalProps {
  isOpen: boolean;
  hasChanges: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DemoExitModal: React.FC<DemoExitModalProps> = ({
  isOpen,
  hasChanges,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white border border-[#E7EBE5] rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-left"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between pb-3.5 border-b border-[#E7EBE5]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FFF3D9] text-[#A66B16] flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#174A36]">
                Salir del Modo Demostración
              </h3>
              <p className="text-xs text-[#78847C]">
                Volver al inventario real de tu comercio
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#78847C] hover:text-[#174A36] hover:bg-[#F8F9F6] transition"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="my-4 text-xs sm:text-sm text-[#24372F] space-y-2 leading-relaxed">
          <p>
            Al salir de la demo volverás a ver los datos reales de tu comercio.
          </p>
          {hasChanges && (
            <p className="p-3 rounded-xl bg-[#FCEBE5] border border-[#FADBD0] text-[#C6533A] font-medium text-xs">
              Los cambios, altas o ajustes que hayas realizado en los productos de ejemplo se descartarán para no alterar tu cuenta.
            </p>
          )}
          <p className="text-xs text-[#78847C]">
            Tus productos reales guardados en Firebase permanecen intactos.
          </p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-2xl border border-[#E7EBE5] hover:bg-[#F8F9F6] text-[#78847C] text-xs font-semibold transition"
          >
            Seguir en demo
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="w-full sm:w-auto px-5 py-2.5 bg-[#246B4D] hover:bg-[#174A36] text-white text-xs font-bold rounded-2xl shadow-xs transition flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Salir y ver mis datos</span>
          </button>
        </div>
      </div>
    </div>
  );
};
