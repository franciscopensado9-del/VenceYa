import React, { useState } from 'react';
import { X, Mail, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  defaultEmail = '',
}) => {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState(defaultEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentSuccess, setSentSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Por favor ingresá un correo electrónico válido.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await sendPasswordReset(email.trim());
      setSentSuccess(true);
    } catch (err: unknown) {
      console.error(err);
      const code = (err as { code?: string })?.code;
      if (code === 'auth/user-not-found') {
        setError('No encontramos ninguna cuenta con ese correo electrónico.');
      } else {
        setError('Ocurrió un error al enviar el correo. Verificá que la dirección sea correcta o intentá más tarde.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-white border border-[#E7EBE5] rounded-3xl p-6 sm:p-7 shadow-2xl animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#E7EBE5]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EAF3EC] text-[#246B4D] flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#174A36]">Recuperar Contraseña</h2>
              <p className="text-xs text-[#78847C]">Te enviaremos un enlace a tu casilla</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#78847C] hover:text-[#174A36] hover:bg-[#F8F9F6] transition"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {sentSuccess ? (
          <div className="py-6 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-[#E8F3E9] text-[#246B4D] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
            </div>
            <h3 className="text-base font-bold text-[#174A36]">¡Enlace de recuperación enviado!</h3>
            <p className="text-xs text-[#78847C] leading-relaxed max-w-xs mx-auto">
              Revisá tu bandeja de entrada en <strong className="text-[#174A36]">{email}</strong> y seguí las instrucciones para crear una nueva contraseña.
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2.5 rounded-2xl bg-[#246B4D] hover:bg-[#174A36] text-white text-xs font-semibold transition"
            >
              Volver a Iniciar Sesión
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {error && (
              <div className="p-3.5 rounded-2xl bg-[#FCEBE5] border border-[#F5C2B6] text-[#C6533A] text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="reset-email" className="block text-xs font-semibold text-[#174A36] mb-1.5">
                Correo Electrónico Registrado
              </label>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="ejemplo@comercio.com"
                required
                className="w-full px-4 py-2.5 bg-[#F8F9F6] border border-[#E7EBE5] rounded-2xl text-sm text-[#24372F] focus:outline-none focus:border-[#246B4D] focus:bg-white"
                autoFocus
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-semibold text-[#78847C] bg-[#F8F9F6] hover:bg-[#E7EBE5] rounded-2xl transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-[#246B4D] hover:bg-[#174A36] disabled:opacity-50 rounded-2xl transition shadow-xs flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <span>Enviar Enlace</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
