import { useEffect, useMemo, useState } from 'react'
import Sidebar from './components/Sidebar'
import ChatArea from './components/ChatArea'
import WelcomeScreen from './components/WelcomeScreen'
import AuthScreen from './components/AuthScreen'
import AdminPanel from './components/AdminPanel'
import { PROVIDERS } from './services/aiService'
import { getAuthStatus, logout } from './services/authService'
import { setUnauthorizedHandler } from './services/apiClient'
import { deleteServerConversation, loadServerConversations, syncServerConversations } from './services/persistenceService'
import { loadSubagents, AGENTS_LOADED } from './subagents'

const STORAGE_KEY_PREFIX = 'multia-conversations-cache-v4'
const LEGACY_STORAGE_KEY = 'multia-conversations'
const SETTINGS_KEY = 'multia-settings'
const SETTINGS_VERSION = 5

function newId(prefix = 'id') {
  return globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function normalizeConversations(input) {
  if (!Array.isArray(input)) return []
  return input.map((conversation) => ({
    id: String(conversation.id || newId('conversation')),
    title: String(conversation.title || 'Nueva conversación'),
    createdAt: conversation.createdAt || new Date().toISOString(),
    updatedAt: conversation.updatedAt || conversation.createdAt || new Date().toISOString(),
    messages: Array.isArray(conversation.messages)
      ? conversation.messages.map((message) => ({
          ...message,
          id: message.id || newId('message'),
          timestamp: message.timestamp || new Date().toISOString(),
          metadata: message.metadata || {},
        }))
      : [],
  }))
}

function cacheKey(username) {
  return `${STORAGE_KEY_PREFIX}:${String(username || 'anonymous').toLowerCase()}`
}

function loadCachedConversations(username, allowLegacyMigration = false) {
  const keys = [cacheKey(username)]
  if (allowLegacyMigration) keys.push(LEGACY_STORAGE_KEY)
  for (const key of keys) {
    try {
      const stored = localStorage.getItem(key)
      if (stored) return normalizeConversations(JSON.parse(stored))
    } catch {
      // Continúa con el siguiente origen.
    }
  }
  return []
}

function saveCachedConversations(conversations, username) {
  if (!username) return
  try { localStorage.setItem(cacheKey(username), JSON.stringify(conversations)) } catch { /* modo privado */ }
}

function loadSettings() {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

function saveSettings(settings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)) } catch { /* modo privado */ }
}

function App() {
  const storedSettings = useMemo(loadSettings, [])
  const storedProvider = storedSettings?.version === SETTINGS_VERSION && PROVIDERS[storedSettings.provider]
    ? storedSettings.provider
    : 'webllm'
  const storedModel = PROVIDERS[storedProvider].models.some((candidate) => candidate.id === storedSettings?.model)
    ? storedSettings.model
    : PROVIDERS[storedProvider].defaultModel

  const [authLoading, setAuthLoading] = useState(true)
  const [authState, setAuthState] = useState(null)
  const [user, setUser] = useState(null)
  const [serverHydrated, setServerHydrated] = useState(false)
  const [syncState, setSyncState] = useState('idle')
  const [conversations, setConversations] = useState([])
  const [activeConversation, setActiveConversation] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [provider, setProvider] = useState(storedProvider)
  const [model, setModel] = useState(storedModel)
  const [selectedSkills, setSelectedSkills] = useState(storedSettings?.selectedSkills || [])
  const [selectedAgents, setSelectedAgents] = useState(storedSettings?.selectedAgents || [])
  const [agentsReady, setAgentsReady] = useState(AGENTS_LOADED)
  const [pendingMessage, setPendingMessage] = useState(null)
  const [adminOpen, setAdminOpen] = useState(false)

  const establishSession = async (result) => {
    setUser(result.user)
    setAuthState((previous) => ({ ...(previous || {}), authenticated: true, setupRequired: false, user: result.user }))
    setServerHydrated(false)
    const serverConversations = normalizeConversations(await loadServerConversations())
    if (serverConversations.length > 0) {
      setConversations(serverConversations)
      setActiveConversation(serverConversations[0]?.id || null)
    } else {
      const allowLegacyMigration = result.user.role === 'admin' && !localStorage.getItem('multia-cache-migrated-v4')
      const cache = loadCachedConversations(result.user.username, allowLegacyMigration)
      setConversations(cache)
      if (cache.length > 0) await syncServerConversations(cache)
      if (allowLegacyMigration) {
        try { localStorage.setItem('multia-cache-migrated-v4', 'true') } catch { /* modo privado */ }
      }
    }
    setServerHydrated(true)
  }

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null)
      setAuthState((previous) => ({ ...(previous || {}), authenticated: false }))
      setServerHydrated(false)
    })

    getAuthStatus()
      .then(async (status) => {
        setAuthState(status)
        if (status.authenticated) await establishSession({ user: status.user })
      })
      .catch((error) => setAuthState({ authenticated: false, setupRequired: false, error: error.message }))
      .finally(() => setAuthLoading(false))

    return () => setUnauthorizedHandler(null)
  }, [])

  useEffect(() => {
    loadSubagents().then(() => setAgentsReady(true)).catch(() => setAgentsReady(false))
  }, [])

  useEffect(() => {
    if (user) saveCachedConversations(conversations, user.username)
    if (!serverHydrated || !user) return undefined
    setSyncState('syncing')
    const timer = setTimeout(() => {
      syncServerConversations(conversations)
        .then(() => setSyncState('saved'))
        .catch(() => setSyncState('error'))
    }, 700)
    return () => clearTimeout(timer)
  }, [conversations, serverHydrated, user])

  useEffect(() => {
    saveSettings({ version: SETTINGS_VERSION, provider, model, selectedSkills, selectedAgents })
  }, [provider, model, selectedSkills, selectedAgents])

  const toggleSkill = (skillName) => {
    setSelectedSkills((previous) => previous.includes(skillName)
      ? previous.filter((item) => item !== skillName)
      : [...previous, skillName])
  }

  const toggleAgent = (agentName) => {
    setSelectedAgents((previous) => previous.includes(agentName)
      ? previous.filter((item) => item !== agentName)
      : [...previous, agentName])
  }

  const createNewConversation = () => {
    const timestamp = new Date().toISOString()
    const conversation = {
      id: newId('conversation'),
      title: 'Nueva conversación',
      messages: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    setConversations((previous) => [conversation, ...previous])
    setActiveConversation(conversation.id)
  }

  const deleteConversation = (id) => {
    setConversations((previous) => previous.filter((conversation) => conversation.id !== id))
    deleteServerConversation(id).catch(() => setSyncState('error'))
    if (activeConversation === id) setActiveConversation(null)
  }

  const addMessage = (conversationId, inputMessage) => {
    const message = {
      ...inputMessage,
      id: inputMessage.id || newId('message'),
      timestamp: inputMessage.timestamp || new Date().toISOString(),
      metadata: inputMessage.metadata || {},
    }
    setConversations((previous) => {
      const conversation = previous.find((item) => item.id === conversationId)
      if (!conversation) return previous
      const messages = [...conversation.messages, message]
      const updates = { messages, updatedAt: new Date().toISOString() }
      if (conversation.messages.length === 0 && message.role === 'user') {
        updates.title = message.content.substring(0, 40) + (message.content.length > 40 ? '...' : '')
      }
      return previous.map((item) => item.id === conversationId ? { ...item, ...updates } : item)
    })
  }

  const updateLastMessage = (conversationId, content, metadata = null) => {
    setConversations((previous) => previous.map((conversation) => {
      if (conversation.id !== conversationId) return conversation
      const messages = [...conversation.messages]
      if (messages.length > 0 && messages[messages.length - 1].role === 'assistant') {
        messages[messages.length - 1] = {
          ...messages[messages.length - 1],
          content,
          metadata: metadata ? { ...(messages[messages.length - 1].metadata || {}), ...metadata } : messages[messages.length - 1].metadata,
        }
      }
      return { ...conversation, messages, updatedAt: new Date().toISOString() }
    }))
  }

  const sendMessage = (messageInput) => {
    const message = { ...messageInput, id: messageInput.id || newId('message') }
    let conversationId = activeConversation
    if (!conversationId) {
      conversationId = newId('conversation')
      const timestamp = new Date().toISOString()
      const conversation = {
        id: conversationId,
        title: message.content.substring(0, 40) + (message.content.length > 40 ? '...' : ''),
        messages: [message],
        createdAt: timestamp,
        updatedAt: timestamp,
      }
      setConversations((previous) => [conversation, ...previous])
      setActiveConversation(conversationId)
      setPendingMessage({ convId: conversationId, msg: message })
    } else {
      addMessage(conversationId, message)
    }
  }

  const handleLogout = async () => {
    try { await logout() } catch { /* cerrar localmente de todas formas */ }
    setUser(null)
    setConversations([])
    setServerHydrated(false)
    setActiveConversation(null)
    setAuthState((previous) => ({ ...(previous || {}), authenticated: false }))
  }

  if (authLoading) {
    return <div className="h-screen bg-multia-bg flex items-center justify-center text-multia-muted">Preparando MULTIA...</div>
  }

  if (!user) {
    return <AuthScreen status={authState} onAuthenticated={establishSession} />
  }

  const activeConv = conversations.find((conversation) => conversation.id === activeConversation)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-multia-bg">
      {sidebarOpen && (
        <Sidebar
          conversations={conversations}
          activeConversation={activeConversation}
          onSelect={setActiveConversation}
          onNew={createNewConversation}
          onDelete={deleteConversation}
          onClose={() => setSidebarOpen(false)}
          user={user}
          onLogout={handleLogout}
          syncState={syncState}
          onOpenAdmin={() => setAdminOpen(true)}
        />
      )}
      <div className="flex-1 flex flex-col">
        {activeConv && activeConv.messages.length > 0 ? (
          <ChatArea
            conversation={activeConv}
            onSendMessage={sendMessage}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            sidebarOpen={sidebarOpen}
            provider={provider}
            model={model}
            onProviderChange={setProvider}
            onModelChange={setModel}
            onAddMessage={addMessage}
            onUpdateLastMessage={updateLastMessage}
            selectedSkills={selectedSkills}
            onToggleSkill={toggleSkill}
            selectedAgents={selectedAgents}
            onToggleAgent={toggleAgent}
            agentsReady={agentsReady}
            pendingMessage={pendingMessage}
            onPendingMessageConsumed={() => setPendingMessage(null)}
          />
        ) : (
          <WelcomeScreen
            onSendMessage={sendMessage}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            sidebarOpen={sidebarOpen}
            provider={provider}
            model={model}
            onProviderChange={setProvider}
            onModelChange={setModel}
            selectedSkills={selectedSkills}
            onToggleSkill={toggleSkill}
            selectedAgents={selectedAgents}
            onToggleAgent={toggleAgent}
            agentsReady={agentsReady}
          />
        )}
      </div>
      {adminOpen && user?.role === 'admin' && <AdminPanel currentUser={user} onClose={() => setAdminOpen(false)} />}
    </div>
  )
}

export default App
