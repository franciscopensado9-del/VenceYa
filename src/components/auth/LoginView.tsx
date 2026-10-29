import React, { useState } from 'react';
import { 
  Sprout, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Loader2, 
  ShieldCheck, 
  CalendarClock, 
  TrendingUp, 
  Sparkles 
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ForgotPasswordModal } from './ForgotPasswordModal';

interface LoginViewProps {
  onSwitchToRegister: () => void;
  onContinueAsGuest?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSwitchToRegister, onContinueAsGuest }) => {
  const { loginWithEmail, loginWithGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Por favor completá tu correo y contraseña.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      await loginWithEmail(email, password, rememberMe);
    } catch (err: unknown) {
      console.error(err);
      const code = (err as { code?: string })?.code;
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setErrorMessage('Correo o contraseña incorrectos. Por favor verificá tus datos.');
      } else if (code === 'auth/too-many-requests') {
        setErrorMessage('Demasiados intentos fallidos. Por favor esperá unos minutos o restablecé tu contraseña.');
      } else if (code === 'auth/operation-not-allowed') {
        setErrorMessage('El acceso con correo y contraseña debe ser habilitado en la consola de Firebase. Podés ingresar inmediatamente con "Continuar con Google".');
      } else {
        setErrorMessage('No se pudo iniciar sesión. Verificá tu conexión a internet o intentá nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setErrorMessage(null);
    try {
      await loginWithGoogle();
    } catch (err: unknown) {
      console.error(err);
      const code = (err as { code?: string })?.code;
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        // User closed the popup, no error needed
      } else {
        setErrorMessage('Ocurrió un inconveniente al conectar con Google. Por favor reintentá.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9F6] text-[#24372F] flex items-center justify-center p-4 sm:p-6 lg:p-10 font-sans selection:bg-[#246B4D] selection:text-white">
      <div className="w-full max-w-5xl bg-white border border-[#E7EBE5] rounded-3xl shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
        
        {/* Brand Side Showcase (Visible on Desktop) */}
        <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-[#174A36] to-[#246B4D] text-white p-10 flex-col justify-between relative overflow-hidden">
          {/* Subtle decorative circles */}
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-white/5 pointer-events-none" />

          {/* Brand header */}
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

          {/* Feature Highlights */}
          <div className="relative z-10 space-y-6 my-auto py-8">
            <h2 className="text-2xl font-bold leading-tight">
              La plataforma de control de vencimientos para tu comercio
            </h2>
            <p className="text-sm text-emerald-100/80 leading-relaxed">
              Diseñado especialmente para pequeños y medianos comercios de Argentina que necesitan terminar con las pérdidas de mercadería.
            </p>

            <div className="space-y-3.5 pt-2">
              <div className="flex items-center gap-3 text-xs text-emerald-50">
                <div className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <CalendarClock className="w-4 h-4 text-emerald-300" />
                </div>
                <span>Control de lotes con fechas de vencimiento independientes</span>
              </div>

              <div className="flex items-center gap-3 text-xs text-emerald-50">
                <div className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                </div>
                <span>Prioridad PEPS (lo que vence primero, se vende primero)</span>
              </div>

              <div className="flex items-center gap-3 text-xs text-emerald-50">
                <div className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4 text-emerald-300" />
                </div>
                <span>Sugerencias de liquidación para recuperar tu capital invertido</span>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="relative z-10 text-[11px] text-emerald-200/70">
            Protegé tus ingresos todos los días sin planillas complejas.
          </div>
        </div>

        {/* Login Form Column (Mobile & Desktop) */}
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
              Bienvenido de nuevo
            </h1>
            <p className="text-sm text-[#78847C] mt-1">
              Controlá tus vencimientos y cuidá la rentabilidad de tu comercio.
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-5 p-4 rounded-2xl bg-[#FCEBE5] border border-[#F5C2B6] text-[#C6533A] text-xs font-medium flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* Email / Password Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            {/* Email Field */}
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold text-[#174A36] mb-1.5">
                Correo Electrónico
              </label>
              <div className="relative">
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="ejemplo@comercio.com"
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-3 bg-[#F8F9F6] border border-[#E7EBE5] rounded-2xl text-sm text-[#24372F] placeholder-[#78847C]/60 focus:outline-none focus:border-[#246B4D] focus:bg-white transition"
                />
                <Mail className="w-4 h-4 text-[#78847C] absolute left-3.5 top-3.5 pointer-events-none" />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="block text-xs font-semibold text-[#174A36]">
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(true)}
                  className="text-xs font-semibold text-[#246B4D] hover:text-[#174A36] transition"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-11 py-3 bg-[#F8F9F6] border border-[#E7EBE5] rounded-2xl text-sm text-[#24372F] placeholder-[#78847C]/60 focus:outline-none focus:border-[#246B4D] focus:bg-white transition"
                />
                <Lock className="w-4 h-4 text-[#78847C] absolute left-3.5 top-3.5 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-[#78847C] hover:text-[#174A36] p-0.5"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-[#246B4D] focus:ring-[#246B4D] border-[#E7EBE5]"
                />
                <span className="text-xs text-[#78847C] select-none font-medium">
                  Recordarme en este dispositivo
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
                  <span>Iniciando sesión...</span>
                </>
              ) : (
                <span>Iniciar sesión</span>
              )}
            </button>
          </form>

          {/* Visual Separator */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E7EBE5]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-[#78847C] uppercase tracking-wider font-semibold">
                o
              </span>
            </div>
          </div>

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading || googleLoading}
            className="w-full py-3 px-4 bg-white hover:bg-[#F8F9F6] border border-[#E7EBE5] text-[#24372F] text-sm font-semibold rounded-2xl transition shadow-2xs flex items-center justify-center gap-3 active:scale-[0.99] disabled:opacity-50"
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
            <span>Continuar con Google</span>
          </button>

          {/* Switch to Register link */}
          <div className="mt-7 text-center space-y-2">
            <p className="text-xs text-[#78847C]">
              ¿Todavía no tenés una cuenta?{' '}
              <button
                type="button"
                onClick={onSwitchToRegister}
                className="font-bold text-[#246B4D] hover:text-[#174A36] transition hover:underline"
              >
                Crear cuenta
              </button>
            </p>

            {onContinueAsGuest && (
              <div>
                <button
                  type="button"
                  onClick={onContinueAsGuest}
                  className="text-xs text-[#78847C] hover:text-[#174A36] transition underline hover:font-medium"
                >
                  Explorar demo local sin registrarse
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        defaultEmail={email}
      />
    </div>
  );
};
