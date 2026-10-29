import React, { useState } from 'react';
import { 
  Sprout, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  User as UserIcon, 
  Store, 
  AlertCircle, 
  Loader2, 
  ShieldCheck, 
  Check 
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface RegisterViewProps {
  onSwitchToLogin: () => void;
}

export const RegisterView: React.FC<RegisterViewProps> = ({ onSwitchToLogin }) => {
  const { registerWithEmail, loginWithGoogle } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validations
    if (!displayName.trim()) {
      setErrorMessage('Por favor ingresá tu nombre y apellido.');
      return;
    }
    if (!storeName.trim()) {
      setErrorMessage('Por favor ingresá el nombre de tu comercio.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Por favor ingresá una dirección de correo válida.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden. Por favor verificalas.');
      return;
    }
    if (!acceptTerms) {
      setErrorMessage('Debés aceptar los términos y condiciones para continuar.');
      return;
    }

    setLoading(true);

    try {
      await registerWithEmail(displayName, storeName, email, password);
    } catch (err: unknown) {
      console.error(err);
      const code = (err as { code?: string })?.code;
      if (code === 'auth/email-already-in-use') {
        setErrorMessage('Este correo ya está registrado. Probá iniciar sesión con tu cuenta.');
      } else if (code === 'auth/weak-password') {
        setErrorMessage('La contraseña es demasiado débil. Utilizá al menos 6 letras o números.');
      } else if (code === 'auth/operation-not-allowed') {
        setErrorMessage('El registro por correo debe activarse en la consola de Firebase. Podés registrarte al instante con "Continuar con Google".');
      } else {
        setErrorMessage('Ocurrió un error al registrar la cuenta. Verificá los datos o probá con Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setGoogleLoading(true);
    setErrorMessage(null);
    try {
      await loginWithGoogle();
    } catch (err: unknown) {
      console.error(err);
      const code = (err as { code?: string })?.code;
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        // User closed
      } else {
        setErrorMessage('Ocurrió un inconveniente al conectar con Google. Por favor reintentá.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9F6] text-[#24372F] flex items-center justify-center p-4 sm:p-6 lg:p-10 font-sans selection:bg-[#246B4D] selection:text-white">
      <div className="w-full max-w-5xl bg-white border border-[#E7EBE5] rounded-3xl shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        
        {/* Brand Side Showcase (Visible on Desktop) */}
        <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-[#174A36] to-[#246B4D] text-white p-10 flex-col justify-between relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-white/5 pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white shrink-0 border border-white/10">
                <Sprout className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-2xl font-extrabold tracking-tight lowercase">
                  venceya
                </span>
                <span className="block text-xs text-emerald-200/90 font-medium">
                  menos merma, más venta
                </span>
              </div>
            </div>
          </div>

          <div className="relative z-10 space-y-6 my-auto py-8">
            <h2 className="text-2xl font-bold leading-tight">
              Creá tu comercio y empezá a cuidar tus productos hoy mismo
            </h2>
            <p className="text-sm text-emerald-100/80 leading-relaxed">
              En menos de 2 minutos vas a tener tu panel listo para registrar mercadería, recibir alertas de vencimiento y sugerencias automáticas.
            </p>

            <div className="p-4 rounded-2xl bg-white/10 border border-white/15 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
                <span>Tu información 100% aislada y segura</span>
              </div>
              <p className="text-[11px] text-emerald-100/80 leading-relaxed">
                Cada comercio accede únicamente a sus propios datos con reglas de seguridad estrictas en Firestore.
              </p>
            </div>
          </div>

          <div className="relative z-10 text-[11px] text-emerald-200/70">
            Sin contratos ni tarjetas de crédito requeridas.
          </div>
        </div>

        {/* Register Form Column (Mobile & Desktop) */}
        <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-center">
          {/* Mobile Top Brand Header */}
          <div className="lg:hidden flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-[#EAF3EC] text-[#246B4D] flex items-center justify-center shrink-0 shadow-xs">
              <Sprout className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="text-xl font-bold tracking-tight text-[#174A36] lowercase">
                venceya
              </div>
              <div className="text-xs text-[#78847C]">
                menos merma, más venta
              </div>
            </div>
          </div>

          {/* Form Header */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#174A36] tracking-tight">
              Crear cuenta
            </h1>
            <p className="text-sm text-[#78847C] mt-1">
              Comenzá a controlar tus lotes y proteger la rentabilidad de tu comercio.
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-5 p-4 rounded-2xl bg-[#FCEBE5] border border-[#F5C2B6] text-[#C6533A] text-xs font-medium flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleRegister} className="space-y-3.5">
            {/* Name & Store Name side by side on desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="reg-name" className="block text-xs font-semibold text-[#174A36] mb-1.5">
                  Nombre y Apellido
                </label>
                <div className="relative">
                  <input
                    id="reg-name"
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Ej. Martín Gómez"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F8F9F6] border border-[#E7EBE5] rounded-2xl text-sm text-[#24372F] placeholder-[#78847C]/60 focus:outline-none focus:border-[#246B4D] focus:bg-white transition"
                  />
                  <UserIcon className="w-4 h-4 text-[#78847C] absolute left-3.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label htmlFor="reg-store" className="block text-xs font-semibold text-[#174A36] mb-1.5">
                  Nombre del Comercio
                </label>
                <div className="relative">
                  <input
                    id="reg-store"
                    type="text"
                    value={storeName}
                    onChange={e => setStoreName(e.target.value)}
                    placeholder="Ej. Almacén La Tranquera"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F8F9F6] border border-[#E7EBE5] rounded-2xl text-sm text-[#24372F] placeholder-[#78847C]/60 focus:outline-none focus:border-[#246B4D] focus:bg-white transition"
                  />
                  <Store className="w-4 h-4 text-[#78847C] absolute left-3.5 top-3.5 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="reg-email" className="block text-xs font-semibold text-[#174A36] mb-1.5">
                Correo Electrónico
              </label>
              <div className="relative">
                <input
                  id="reg-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="ejemplo@comercio.com"
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F8F9F6] border border-[#E7EBE5] rounded-2xl text-sm text-[#24372F] placeholder-[#78847C]/60 focus:outline-none focus:border-[#246B4D] focus:bg-white transition"
                />
                <Mail className="w-4 h-4 text-[#78847C] absolute left-3.5 top-3.5 pointer-events-none" />
              </div>
            </div>

            {/* Password & Confirm side by side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="reg-password" className="block text-xs font-semibold text-[#174A36] mb-1.5">
                  Contraseña (mín. 6 caracteres)
                </label>
                <div className="relative">
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                    className="w-full pl-10 pr-10 py-2.5 bg-[#F8F9F6] border border-[#E7EBE5] rounded-2xl text-sm text-[#24372F] placeholder-[#78847C]/60 focus:outline-none focus:border-[#246B4D] focus:bg-white transition"
                  />
                  <Lock className="w-4 h-4 text-[#78847C] absolute left-3.5 top-3 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-2.5 text-[#78847C] hover:text-[#174A36] p-0.5"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="reg-confirm" className="block text-xs font-semibold text-[#174A36] mb-1.5">
                  Confirmar Contraseña
                </label>
                <div className="relative">
                  <input
                    id="reg-confirm"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                    className="w-full pl-10 pr-10 py-2.5 bg-[#F8F9F6] border border-[#E7EBE5] rounded-2xl text-sm text-[#24372F] placeholder-[#78847C]/60 focus:outline-none focus:border-[#246B4D] focus:bg-white transition"
                  />
                  <Lock className="w-4 h-4 text-[#78847C] absolute left-3.5 top-3 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-2.5 text-[#78847C] hover:text-[#174A36] p-0.5"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Terms checkbox */}
            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={e => setAcceptTerms(e.target.checked)}
                  className="w-4 h-4 rounded text-[#246B4D] focus:ring-[#246B4D] border-[#E7EBE5] mt-0.5"
                />
                <span className="text-xs text-[#78847C] select-none leading-snug">
                  Acepto los términos y condiciones del servicio y el uso de mis datos para la gestión comercial en VenceYa.
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full mt-2 py-3.5 px-4 bg-[#246B4D] hover:bg-[#174A36] disabled:opacity-50 text-white text-sm font-semibold rounded-2xl transition shadow-xs flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creando tu cuenta...</span>
                </>
              ) : (
                <span>Crear mi cuenta</span>
              )}
            </button>
          </form>

          {/* Visual Separator */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E7EBE5]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-[#78847C] uppercase tracking-wider font-semibold">
                o
              </span>
            </div>
          </div>

          {/* Google Register Button */}
          <button
            type="button"
            onClick={handleGoogleRegister}
            disabled={loading || googleLoading}
            className="w-full py-2.5 px-4 bg-white hover:bg-[#F8F9F6] border border-[#E7EBE5] text-[#24372F] text-sm font-semibold rounded-2xl transition shadow-2xs flex items-center justify-center gap-3 active:scale-[0.99] disabled:opacity-50"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#246B4D]" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Registrarme con Google</span>
          </button>

          {/* Switch to Login link */}
          <div className="mt-6 text-center">
            <p className="text-xs text-[#78847C]">
              ¿Ya tenés una cuenta?{' '}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="font-bold text-[#246B4D] hover:text-[#174A36] transition hover:underline"
              >
                Iniciar sesión
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
