import { useState } from 'react'
import { KeyRound, Loader2, LogIn, ShieldCheck, Sparkles } from 'lucide-react'
import { bootstrap, login } from '../services/authService'

export default function AuthScreen({ status, onAuthenticated }) {
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [bootstrapToken, setBootstrapToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const setupRequired = Boolean(status?.setupRequired)

  const submit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const result = setupRequired
        ? await bootstrap({ bootstrapToken, username, displayName, password })
        : await login(username, password)
      await onAuthenticated(result)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-multia-bg flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-multia-sidebar border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-white/5 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-multia-accent flex items-center justify-center mb-4">
            <Sparkles className="text-white" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-multia-text">MULTIA 4.0</h1>
          <p className="text-sm text-multia-muted mt-2">
            {setupRequired ? 'Instalación segura del primer administrador' : 'Acceso protegido a conversaciones, proyectos y auditorías'}
          </p>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          {setupRequired && (
            <div className="rounded-xl bg-blue-500/10 border border-blue-500/30 p-3 text-xs text-blue-200 leading-relaxed">
              Consulte el token de instalación con <code>oc logs deployment/multia-app</code>. Solo se utiliza una vez para crear el primer administrador.
            </div>
          )}

          {setupRequired && (
            <label className="block">
              <span className="text-xs text-multia-muted">Token de instalación</span>
              <div className="mt-1 flex items-center gap-2 bg-multia-input border border-white/10 rounded-xl px-3">
                <KeyRound size={16} className="text-multia-muted" />
                <input value={bootstrapToken} onChange={(event) => setBootstrapToken(event.target.value)} required className="w-full bg-transparent py-3 text-sm text-multia-text outline-none" autoComplete="one-time-code" />
              </div>
            </label>
          )}

          <label className="block">
            <span className="text-xs text-multia-muted">Usuario</span>
            <input value={username} onChange={(event) => setUsername(event.target.value)} required minLength={3} className="mt-1 w-full bg-multia-input border border-white/10 rounded-xl px-3 py-3 text-sm text-multia-text outline-none focus:border-multia-accent/60" autoComplete="username" />
          </label>

          {setupRequired && (
            <label className="block">
              <span className="text-xs text-multia-muted">Nombre visible</span>
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required className="mt-1 w-full bg-multia-input border border-white/10 rounded-xl px-3 py-3 text-sm text-multia-text outline-none focus:border-multia-accent/60" />
            </label>
          )}

          <label className="block">
            <span className="text-xs text-multia-muted">Contraseña</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={12} className="mt-1 w-full bg-multia-input border border-white/10 rounded-xl px-3 py-3 text-sm text-multia-text outline-none focus:border-multia-accent/60" autoComplete={setupRequired ? 'new-password' : 'current-password'} />
            {setupRequired && <span className="text-[11px] text-multia-muted mt-1 block">Mínimo 12 caracteres, con mayúscula, minúscula y número.</span>}
          </label>

          {error && <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-300">{error}</div>}

          <button disabled={loading} className="w-full flex items-center justify-center gap-2 rounded-xl bg-multia-accent hover:bg-multia-accent/80 disabled:opacity-50 py-3 text-sm font-semibold text-white transition-colors">
            {loading ? <Loader2 size={17} className="animate-spin" /> : setupRequired ? <ShieldCheck size={17} /> : <LogIn size={17} />}
            {setupRequired ? 'Crear administrador' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  )
}
