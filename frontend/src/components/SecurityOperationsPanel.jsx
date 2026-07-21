import { useEffect, useRef, useState } from 'react'
import {
  Archive,
  CheckCircle2,
  FileSearch,
  Laptop,
  LoaderCircle,
  MapPinned,
  PackageSearch,
  Plus,
  Route,
  ShieldCheck,
  Smartphone,
  Trash2,
  X,
} from 'lucide-react'
import {
  addOwnedAsset,
  analyzeOwnedRoute,
  buildAssetInventoryPrompt,
  loadOwnedAssets,
  locateThisDevice,
  removeOwnedAsset,
  reviewSecurityArtifact,
} from '../services/securityOperationsService'

const AUTHORIZATION_OPTIONS = [
  { value: 'owner', label: 'Soy propietario del sistema o archivo' },
  { value: 'administrator', label: 'Soy administrador autorizado' },
  { value: 'written-permission', label: 'Tengo permiso escrito' },
  { value: 'controlled-lab', label: 'Es un laboratorio controlado propio' },
]

const ARTIFACT_TYPES = [
  { value: 'auto', label: 'Detectar automáticamente' },
  { value: 'nmap-xml', label: 'Reporte XML de inventario de puertos' },
  { value: 'package-lock', label: 'package-lock.json' },
  { value: 'requirements', label: 'requirements.txt' },
  { value: 'cyclonedx', label: 'SBOM CycloneDX JSON' },
  { value: 'headers-json', label: 'Cabeceras HTTP en JSON' },
  { value: 'security-log', label: 'Muestra de registros de seguridad' },
]

const TABS = [
  { id: 'artifact', label: 'Evidencias', icon: FileSearch },
  { id: 'device', label: 'Mi dispositivo', icon: Smartphone },
  { id: 'route', label: 'Mi trayecto', icon: Route },
  { id: 'assets', label: 'Mis activos', icon: Laptop },
]

function SummaryList({ title, items, emptyText }) {
  return (
    <div>
      <div className="font-medium text-multia-text">{title}</div>
      {items?.length ? (
        <ul className="mt-1 space-y-1">{items.map((item) => <li key={item}>• {item}</li>)}</ul>
      ) : <div className="mt-1 text-multia-muted">{emptyText}</div>}
    </div>
  )
}

export default function SecurityOperationsPanel({ onApply, onClose }) {
  const [tab, setTab] = useState('artifact')
  const [artifactFile, setArtifactFile] = useState(null)
  const [artifactType, setArtifactType] = useState('auto')
  const [authorizationBasis, setAuthorizationBasis] = useState('')
  const [authorizationConfirmed, setAuthorizationConfirmed] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [artifactResult, setArtifactResult] = useState(null)
  const [deviceConsent, setDeviceConsent] = useState(false)
  const [deviceResult, setDeviceResult] = useState(null)
  const [routeFile, setRouteFile] = useState(null)
  const [routeConsent, setRouteConsent] = useState(false)
  const [routeResult, setRouteResult] = useState(null)
  const [assets, setAssets] = useState([])
  const [assetForm, setAssetForm] = useState({ name: '', type: 'Teléfono propio', identifierSuffix: '', notes: '' })
  const controllerRef = useRef(null)

  useEffect(() => setAssets(loadOwnedAssets()), [])

  const resetOperation = () => {
    setError('')
    controllerRef.current = new AbortController()
  }

  const finishOperation = () => {
    setRunning(false)
    controllerRef.current = null
  }

  const runArtifactReview = async () => {
    if (!artifactFile || !authorizationBasis || !authorizationConfirmed || running) return
    setRunning(true)
    setArtifactResult(null)
    resetOperation()
    try {
      const result = await reviewSecurityArtifact(artifactFile, {
        artifactType,
        authorizationBasis,
        authorizationConfirmed,
      }, { signal: controllerRef.current.signal })
      setArtifactResult(result)
    } catch (operationError) {
      setError(operationError.message || 'No fue posible revisar la evidencia.')
    } finally {
      finishOperation()
    }
  }

  const locateDevice = async () => {
    if (!deviceConsent || running) return
    setRunning(true)
    setDeviceResult(null)
    resetOperation()
    try {
      const result = await locateThisDevice({ consentConfirmed: deviceConsent, signal: controllerRef.current.signal })
      setDeviceResult(result)
    } catch (operationError) {
      setError(operationError.message || 'No fue posible obtener la ubicación del dispositivo.')
    } finally {
      finishOperation()
    }
  }

  const reviewRoute = async () => {
    if (!routeFile || !routeConsent || running) return
    setRunning(true)
    setRouteResult(null)
    resetOperation()
    try {
      const result = await analyzeOwnedRoute(routeFile, { consentConfirmed: routeConsent, signal: controllerRef.current.signal })
      setRouteResult(result)
    } catch (operationError) {
      setError(operationError.message || 'No fue posible analizar el trayecto.')
    } finally {
      finishOperation()
    }
  }

  const addAsset = () => {
    try {
      setAssets(addOwnedAsset(assetForm))
      setAssetForm({ name: '', type: 'Teléfono propio', identifierSuffix: '', notes: '' })
      setError('')
    } catch (operationError) {
      setError(operationError.message)
    }
  }

  const placeText = (place) => [place?.city, place?.state, place?.country].filter(Boolean).join(', ') || 'No determinada'

  return (
    <div className="mb-3 rounded-2xl border border-sky-500/25 bg-sky-500/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-sky-200">
            <ShieldCheck size={16} /> Centro de operaciones de seguridad autorizado
          </div>
          <p className="mt-1 text-xs text-multia-muted">
            Analiza reportes y evidencias, revisa dependencias, resume trayectos propios y ubica únicamente este dispositivo con permiso explícito. No ejecuta herramientas contra sistemas.
          </p>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-1 text-multia-muted hover:bg-white/10 hover:text-white" aria-label="Cerrar">
          <X size={16} />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {TABS.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => { setTab(item.id); setError('') }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs ${tab === item.id ? 'border-sky-400/40 bg-sky-500/15 text-sky-200' : 'border-white/10 bg-white/5 text-multia-muted hover:text-white'}`}
            >
              <Icon size={14} /> {item.label}
            </button>
          )
        })}
      </div>

      {tab === 'artifact' && (
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-xs text-multia-muted">
              Archivo de evidencia autorizado
              <input
                type="file"
                accept=".xml,.json,.txt,.log"
                onChange={(event) => setArtifactFile(event.target.files?.[0] || null)}
                className="mt-1 block w-full rounded-xl border border-white/10 bg-multia-input px-3 py-2 text-xs text-multia-text"
              />
            </label>
            <label className="block text-xs text-multia-muted">
              Tipo de evidencia
              <select value={artifactType} onChange={(event) => setArtifactType(event.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-multia-input px-3 py-2 text-sm text-multia-text">
                {ARTIFACT_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="block text-xs text-multia-muted">
              Base de autorización
              <select value={authorizationBasis} onChange={(event) => setAuthorizationBasis(event.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-multia-input px-3 py-2 text-sm text-multia-text">
                <option value="">Seleccione…</option>
                {AUTHORIZATION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="flex items-start gap-2 rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 text-xs text-sky-200">
              <input type="checkbox" checked={authorizationConfirmed} onChange={(event) => setAuthorizationConfirmed(event.target.checked)} className="mt-0.5" />
              Confirmo que el archivo pertenece a un sistema propio o expresamente autorizado y que lo usaré para prevención y corrección.
            </label>
          </div>
          <button type="button" onClick={runArtifactReview} disabled={!artifactFile || !authorizationBasis || !authorizationConfirmed || running} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-40">
            {running ? <LoaderCircle size={16} className="animate-spin" /> : <PackageSearch size={16} />}
            {running ? 'Analizando evidencia…' : 'Revisar evidencia autorizada'}
          </button>

          {artifactResult && (
            <div className="space-y-3 rounded-xl border border-white/10 bg-black/10 p-3 text-xs text-multia-muted">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><strong className="text-multia-text">{artifactResult.file?.name}</strong><div>{artifactResult.file?.detectedType}</div></div>
                <div className="flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-sky-200"><CheckCircle2 size={14} /> {artifactResult.score}/100</div>
              </div>
              <div><strong>Resumen:</strong> {JSON.stringify(artifactResult.analysis?.summary || {})}</div>
              <SummaryList title="Aspectos positivos" items={artifactResult.assessment?.positives} emptyText="No se registraron fortalezas automáticas." />
              <SummaryList title="Riesgos o aspectos negativos" items={artifactResult.assessment?.negatives} emptyText="No se registraron riesgos automáticos." />
              <SummaryList title="Mejoras" items={artifactResult.assessment?.improvements} emptyText="No se registraron mejoras automáticas." />
              <button type="button" onClick={() => onApply(artifactResult.councilPrompt)} className="rounded-xl bg-multia-accent px-4 py-2 text-sm font-medium text-white hover:bg-multia-accent/80">Enviar al consejo de 185 agentes</button>
            </div>
          )}
        </div>
      )}

      {tab === 'device' && (
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">
            Esta función solo usa el permiso de ubicación del navegador en el dispositivo que está abierto. No permite localizar teléfonos ajenos, buscar por número, IMEI o cuenta.
          </div>
          <label className="flex items-start gap-2 text-xs text-sky-200">
            <input type="checkbox" checked={deviceConsent} onChange={(event) => setDeviceConsent(event.target.checked)} className="mt-0.5" />
            Confirmo que este es mi dispositivo y autorizo una lectura puntual de ubicación aproximada.
          </label>
          <button type="button" onClick={locateDevice} disabled={!deviceConsent || running} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-40">
            {running ? <LoaderCircle size={16} className="animate-spin" /> : <MapPinned size={16} />}
            {running ? 'Solicitando permiso…' : 'Ubicar este dispositivo'}
          </button>
          {deviceResult && (
            <div className="space-y-2 rounded-xl border border-white/10 bg-black/10 p-3 text-xs text-multia-muted">
              <div><strong className="text-multia-text">Zona aproximada:</strong> {placeText(deviceResult.place)}</div>
              <div><strong className="text-multia-text">Precisión del navegador:</strong> aproximadamente {deviceResult.accuracyMeters || 'desconocidos'} metros</div>
              <button type="button" onClick={() => onApply(deviceResult.prompt)} className="rounded-xl bg-multia-accent px-4 py-2 text-sm font-medium text-white">Enviar al consejo</button>
            </div>
          )}
        </div>
      )}

      {tab === 'route' && (
        <div className="mt-4 space-y-3">
          <label className="block text-xs text-multia-muted">
            Trayecto propio en GPX, GeoJSON o CSV
            <input type="file" accept=".gpx,.geojson,.json,.csv" onChange={(event) => setRouteFile(event.target.files?.[0] || null)} className="mt-1 block w-full rounded-xl border border-white/10 bg-multia-input px-3 py-2 text-xs text-multia-text" />
          </label>
          <label className="flex items-start gap-2 text-xs text-sky-200">
            <input type="checkbox" checked={routeConsent} onChange={(event) => setRouteConsent(event.target.checked)} className="mt-0.5" />
            Confirmo que el trayecto es mío o que tengo autorización. El archivo se procesa localmente y no se envían sus puntos exactos al consejo.
          </label>
          <button type="button" onClick={reviewRoute} disabled={!routeFile || !routeConsent || running} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-40">
            {running ? <LoaderCircle size={16} className="animate-spin" /> : <Route size={16} />}
            {running ? 'Resumiendo trayecto…' : 'Analizar trayecto propio'}
          </button>
          {routeResult && (
            <div className="space-y-2 rounded-xl border border-white/10 bg-black/10 p-3 text-xs text-multia-muted">
              <div><strong>Puntos:</strong> {routeResult.summary.points}</div>
              <div><strong>Distancia aproximada:</strong> {routeResult.summary.distanceKm} km</div>
              <div><strong>Duración:</strong> {routeResult.summary.durationMinutes ?? 'No disponible'} minutos</div>
              <div><strong>Inicio aproximado:</strong> {placeText(routeResult.summary.startPlace)}</div>
              <div><strong>Final aproximado:</strong> {placeText(routeResult.summary.endPlace)}</div>
              <button type="button" onClick={() => onApply(routeResult.prompt)} className="rounded-xl bg-multia-accent px-4 py-2 text-sm font-medium text-white">Enviar al consejo</button>
            </div>
          )}
        </div>
      )}

      {tab === 'assets' && (
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-white/10 bg-black/10 p-3 text-xs text-multia-muted">
            El inventario se guarda únicamente en este navegador. Registre solo activos propios y únicamente los últimos caracteres del identificador; no incluya contraseñas ni IMEI completo.
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <input value={assetForm.name} onChange={(event) => setAssetForm((value) => ({ ...value, name: event.target.value }))} placeholder="Nombre del activo" maxLength={100} className="rounded-xl border border-white/10 bg-multia-input px-3 py-2 text-sm text-multia-text" />
            <select value={assetForm.type} onChange={(event) => setAssetForm((value) => ({ ...value, type: event.target.value }))} className="rounded-xl border border-white/10 bg-multia-input px-3 py-2 text-sm text-multia-text">
              <option>Teléfono propio</option><option>Portátil</option><option>Servidor</option><option>Router</option><option>Dispositivo IoT</option><option>Otro activo</option>
            </select>
            <input value={assetForm.identifierSuffix} onChange={(event) => setAssetForm((value) => ({ ...value, identifierSuffix: event.target.value.replace(/[^A-Za-z0-9-]/g, '').slice(0, 12) }))} placeholder="Últimos caracteres del serial" className="rounded-xl border border-white/10 bg-multia-input px-3 py-2 text-sm text-multia-text" />
            <input value={assetForm.notes} onChange={(event) => setAssetForm((value) => ({ ...value, notes: event.target.value }))} placeholder="Notas preventivas" maxLength={300} className="rounded-xl border border-white/10 bg-multia-input px-3 py-2 text-sm text-multia-text" />
          </div>
          <button type="button" onClick={addAsset} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm text-white"><Plus size={16} /> Agregar activo propio</button>
          <div className="space-y-2">
            {assets.map((asset) => (
              <div key={asset.id} className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-black/10 p-3 text-xs text-multia-muted">
                <div><div className="font-medium text-multia-text">{asset.name}</div><div>{asset.type} · final {asset.identifierSuffix || 'no registrado'}</div>{asset.notes && <div className="mt-1">{asset.notes}</div>}</div>
                <button type="button" onClick={() => setAssets(removeOwnedAsset(asset.id))} className="rounded-lg p-1 text-red-300 hover:bg-red-500/10" aria-label="Eliminar activo"><Trash2 size={15} /></button>
              </div>
            ))}
            {!assets.length && <div className="text-xs text-multia-muted">No hay activos registrados.</div>}
          </div>
          <button type="button" disabled={!assets.length} onClick={() => onApply(buildAssetInventoryPrompt(assets))} className="inline-flex items-center gap-2 rounded-xl bg-multia-accent px-4 py-2 text-sm text-white disabled:opacity-40"><Archive size={16} /> Enviar inventario al consejo</button>
        </div>
      )}

      {running && <button type="button" onClick={() => controllerRef.current?.abort()} className="mt-3 text-xs text-multia-muted hover:text-white">Cancelar operación</button>}
      {error && <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">{error}</div>}

      <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">
        No incluye terminal remota, ejecución de comandos, explotación, fuerza bruta, recuperación de contraseñas, malware, localización por número o IMEI, ni seguimiento de terceros.
      </div>
    </div>
  )
}
