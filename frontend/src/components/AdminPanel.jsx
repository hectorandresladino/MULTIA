import { useEffect, useState } from 'react'
import { Activity, Loader2, ShieldCheck, UserPlus, Users, X } from 'lucide-react'
import { createUserAccount, loadUsers, updateUserAccount } from '../services/adminService'
import { loadOperationalMetrics } from '../services/persistenceService'

const EMPTY_FORM = { username: '', displayName: '', password: '', role: 'user' }

export default function AdminPanel({ currentUser, onClose }) {
  const [users, setUsers] = useState([])
  const [metrics, setMetrics] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const refresh = async () => {
    setLoading(true)
    setError('')
    try {
      const [userList, operationalMetrics] = await Promise.all([loadUsers(), loadOperationalMetrics()])
      setUsers(userList)
      setMetrics(operationalMetrics)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  const createAccount = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await createUserAccount(form)
      setForm(EMPTY_FORM)
      await refresh()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  const changeUser = async (user, changes) => {
    setError('')
    try {
      await updateUserAccount(user.id, changes)
      await refresh()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto bg-multia-sidebar border border-white/10 rounded-2xl shadow-2xl">
        <div className="sticky top-0 bg-multia-sidebar/95 backdrop-blur border-b border-white/10 p-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-semibold text-multia-text flex items-center gap-2"><ShieldCheck size={21} /> Administración de MULTIA</h2>
            <p className="text-xs text-multia-muted mt-1">Usuarios, roles y métricas operativas</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-multia-muted"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-6">
          {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ['Usuarios', metrics?.users ?? '—'],
              ['Conversaciones', metrics?.conversations ?? '—'],
              ['Mensajes', metrics?.messages ?? '—'],
              ['Ejecuciones IA', metrics?.modelRuns ?? '—'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-white/5 border border-white/5 p-4">
                <div className="text-xs text-multia-muted">{label}</div>
                <div className="text-2xl font-bold text-multia-text mt-1">{value}</div>
              </div>
            ))}
          </section>

          <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <h3 className="font-medium text-multia-text flex items-center gap-2 mb-4"><UserPlus size={18} /> Crear usuario</h3>
            <form onSubmit={createAccount} className="grid md:grid-cols-2 gap-3">
              <input required minLength={3} value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} placeholder="Usuario" className="bg-multia-input border border-white/10 rounded-lg px-3 py-2.5 text-sm text-multia-text outline-none" />
              <input required value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} placeholder="Nombre visible" className="bg-multia-input border border-white/10 rounded-lg px-3 py-2.5 text-sm text-multia-text outline-none" />
              <input required minLength={12} type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Contraseña segura" className="bg-multia-input border border-white/10 rounded-lg px-3 py-2.5 text-sm text-multia-text outline-none" />
              <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} className="bg-multia-input border border-white/10 rounded-lg px-3 py-2.5 text-sm text-multia-text outline-none">
                <option value="user">Usuario</option>
                <option value="analyst">Analista</option>
                <option value="admin">Administrador</option>
              </select>
              <button disabled={saving} className="md:col-span-2 rounded-lg bg-multia-accent hover:bg-multia-accent/80 disabled:opacity-50 py-2.5 text-sm font-semibold text-white flex items-center justify-center gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />} Crear cuenta
              </button>
            </form>
          </section>

          <section className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center gap-2 text-multia-text font-medium"><Users size={18} /> Usuarios registrados</div>
            {loading ? (
              <div className="p-8 flex items-center justify-center text-multia-muted gap-2"><Loader2 className="animate-spin" size={18} /> Cargando...</div>
            ) : (
              <div className="divide-y divide-white/5">
                {users.map((user) => {
                  const isSelf = user.id === currentUser.id
                  return (
                    <div key={user.id} className="p-4 grid md:grid-cols-[1fr_150px_130px] gap-3 items-center">
                      <div>
                        <div className="text-sm font-medium text-multia-text">{user.displayName} {isSelf && <span className="text-xs text-multia-accent">(usted)</span>}</div>
                        <div className="text-xs text-multia-muted">@{user.username} · creado {new Date(user.createdAt).toLocaleDateString()}</div>
                      </div>
                      <select disabled={isSelf} value={user.role} onChange={(event) => changeUser(user, { role: event.target.value })} className="bg-multia-input border border-white/10 rounded-lg px-2 py-2 text-xs text-multia-text disabled:opacity-50">
                        <option value="user">Usuario</option>
                        <option value="analyst">Analista</option>
                        <option value="admin">Administrador</option>
                      </select>
                      <button disabled={isSelf} onClick={() => changeUser(user, { active: !user.active })} className={`rounded-lg px-3 py-2 text-xs font-medium disabled:opacity-50 ${user.active ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/10 text-red-300 border border-red-500/30'}`}>
                        {user.active ? 'Activo' : 'Suspendido'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <div className="text-xs text-multia-muted flex items-center gap-2"><Activity size={14} /> Las suspensiones cierran las sesiones activas. MULTIA nunca permite retirar al último administrador.</div>
        </div>
      </div>
    </div>
  )
}
