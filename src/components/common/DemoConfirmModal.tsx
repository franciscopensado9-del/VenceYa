import React from 'react';
import { Sparkles, X, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';

interface DemoConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DemoConfirmModal: React.FC<DemoConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white border border-[#E7EBE5] rounded-3xl p-6 sm:p-7 shadow-2xl animate-in zoom-in-95 duration-200 text-left"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between pb-4 border-b border-[#E7EBE5]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#FFF3D9] text-[#A66B16] flex items-center justify-center shrink-0 shadow-2xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-[#174A36]">
                Probar Modo Demostración
              </h3>
              <p className="text-xs text-[#78847C]">
                Explorá VenceYa con productos y lotes de ejemplo
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

        <div className="my-5 space-y-3.5">
          <p className="text-xs sm:text-sm text-[#24372F] leading-relaxed">
            Se cargará un conjunto realista de <strong>13 productos de almacén argentino</strong> (lácteos, fiambres, panadería, pastas y golosinas) con lotes y vencimientos variados para que pruebes las alertas y sugerencias.
          </p>

          <div className="p-3.5 rounded-2xl bg-[#F8F9F6] border border-[#E7EBE5] space-y-2.5 text-xs text-[#174A36]">
            <div className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-[#E8F3E9] text-[#246B4D] flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <div>
                <strong>Aislamiento total:</strong> los datos de ejemplo no se guardan en tu base de datos real de Firebase ni modifican tus productos.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-[#E8F3E9] text-[#246B4D] flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <strong>Fácil de salir:</strong> podés volver a tu inventario real en cualquier momento tocando "Salir de demo".
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-2xl border border-[#E7EBE5] hover:bg-[#F8F9F6] text-[#78847C] text-xs font-semibold transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#246B4D] hover:bg-[#174A36] text-white text-xs font-bold rounded-2xl shadow-xs transition flex items-center justify-center gap-2"
          >
            <span>Cargar datos de demostración</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
