import { Cloud, CloudOff, Loader2, LogOut, MessageSquare, Plus, Settings, Sparkles, Trash2, X } from 'lucide-react'

export default function Sidebar({ conversations, activeConversation, onSelect, onNew, onDelete, onClose, user, onLogout, onOpenAdmin, syncState }) {
  const grouped = { Hoy: [], Ayer: [], '7 días': [], '30 días': [], 'Más antiguo': [] }
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const weekAgo = new Date(today.getTime() - 7 * 86400000)
  const monthAgo = new Date(today.getTime() - 30 * 86400000)

  conversations.forEach((conversation) => {
    const date = new Date(conversation.createdAt)
    if (date >= today) grouped.Hoy.push(conversation)
    else if (date >= yesterday) grouped.Ayer.push(conversation)
    else if (date >= weekAgo) grouped['7 días'].push(conversation)
    else if (date >= monthAgo) grouped['30 días'].push(conversation)
    else grouped['Más antiguo'].push(conversation)
  })

  const initial = String(user?.displayName || user?.username || 'U').trim().charAt(0).toUpperCase()
  const syncLabel = syncState === 'syncing' ? 'Guardando...' : syncState === 'error' ? 'Error de sincronización' : 'Memoria persistente'
  const SyncIcon = syncState === 'syncing' ? Loader2 : syncState === 'error' ? CloudOff : Cloud

  return (
    <div className="w-72 bg-multia-sidebar border-r border-white/5 flex flex-col h-full animate-fade-in">
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-multia-accent flex items-center justify-center"><Sparkles size={18} className="text-white" /></div>
          <div><div className="font-semibold text-multia-text">MULTIA</div><div className="text-[10px] text-multia-muted">Versión robusta 4.0</div></div>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors lg:hidden"><X size={18} className="text-multia-muted" /></button>
      </div>

      <div className="px-3 pb-2">
        <button onClick={onNew} className="w-full flex items-center gap-2 px-3 py-2.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-sm font-medium text-multia-text border border-white/5">
          <Plus size={18} /> Nueva conversación
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {conversations.length === 0 && <div className="text-center text-multia-muted text-sm py-8 px-4">No hay conversaciones aún. ¡Inicia una nueva!</div>}
        {Object.entries(grouped).map(([label, items]) => items.length > 0 && (
          <div key={label} className="mb-3">
            <div className="px-3 py-1.5 text-xs font-medium text-multia-muted uppercase tracking-wide">{label}</div>
            {items.map((conversation) => (
              <div key={conversation.id} onClick={() => onSelect(conversation.id)} className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors mb-0.5 ${activeConversation === conversation.id ? 'bg-white/10 text-multia-text' : 'hover:bg-white/5 text-multia-muted'}`}>
                <MessageSquare size={15} className="flex-shrink-0 opacity-60" />
                <span className="flex-1 truncate text-sm">{conversation.title}</span>
                <button onClick={(event) => { event.stopPropagation(); onDelete(conversation.id) }} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-all" title="Eliminar conversación">
                  <Trash2 size={14} className="text-multia-muted hover:text-red-400" />
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-white/5">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-multia-accent to-orange-600 flex items-center justify-center text-white text-xs font-bold">{initial}</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-multia-text truncate">{user?.displayName || user?.username}</div>
            <div className="text-xs text-multia-muted capitalize">{user?.role}</div>
          </div>
          {user?.role === 'admin' && <button onClick={onOpenAdmin} className="p-1.5 rounded-lg hover:bg-white/10 text-multia-muted hover:text-multia-text transition-colors" title="Administrar usuarios"><Settings size={16} /></button>}
          <button onClick={onLogout} className="p-1.5 rounded-lg hover:bg-red-500/10 text-multia-muted hover:text-red-400 transition-colors" title="Cerrar sesión"><LogOut size={16} /></button>
        </div>
        <div className={`mt-2 flex items-center gap-1.5 px-2 text-[11px] ${syncState === 'error' ? 'text-red-400' : 'text-multia-muted'}`}>
          <SyncIcon size={12} className={syncState === 'syncing' ? 'animate-spin' : ''} /> {syncLabel}
        </div>
      </div>
    </div>
  )
}
