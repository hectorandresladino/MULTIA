import { useRef, useState } from 'react'
import { CheckCircle2, Globe2, LoaderCircle, ShieldAlert, ShieldCheck, X } from 'lucide-react'
import { auditAuthorizedWebsite } from '../services/websiteAuditService'

const AUTHORIZATION_OPTIONS = [
  { value: 'owner', label: 'Soy propietario del sitio' },
  { value: 'administrator', label: 'Soy administrador autorizado' },
  { value: 'written-permission', label: 'Tengo permiso escrito' },
  { value: 'controlled-lab', label: 'Es un laboratorio controlado propio' },
]

function ResultList({ title, items, emptyText }) {
  return (
    <div>
      <div className="font-medium text-multia-text">{title}</div>
      {items?.length ? (
        <ul className="mt-1 space-y-1">{items.map((item) => <li key={item}>• {item}</li>)}</ul>
      ) : <div className="mt-1 text-multia-muted">{emptyText}</div>}
    </div>
  )
}

export default function WebsiteAuditPanel({ onApply, onClose }) {
  const [target, setTarget] = useState('')
  const [authorizationBasis, setAuthorizationBasis] = useState('')
  const [authorizationConfirmed, setAuthorizationConfirmed] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const controllerRef = useRef(null)

  const runAudit = async () => {
    if (!target.trim() || !authorizationConfirmed || !authorizationBasis || running) return
    setRunning(true)
    setError('')
    setResult(null)
    controllerRef.current = new AbortController()
    try {
      const audit = await auditAuthorizedWebsite({
        target: target.trim(),
        authorizationBasis,
        authorizationConfirmed,
      }, { signal: controllerRef.current.signal })
      setResult(audit)
    } catch (auditError) {
      setError(auditError.message || 'No fue posible evaluar el sitio.')
    } finally {
      setRunning(false)
      controllerRef.current = null
    }
  }

  const openPorts = result?.ports?.open || []
  const advisories = result?.advisories?.results?.flatMap((item) =>
    item.vulnerabilityIds.map((id) => `${item.package}@${item.observedVersion}: ${id}`)
  ) || []

  return (
    <div className="mb-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
            <ShieldCheck size={16} /> Auditoría preventiva de sitio autorizado
          </div>
          <p className="mt-1 text-xs text-multia-muted">
            Revisa HTTPS, certificado, cabeceras, tecnologías visibles y un conjunto fijo de puertos comunes. No explota fallas ni prueba credenciales.
          </p>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-1 text-multia-muted hover:bg-white/10 hover:text-white" aria-label="Cerrar">
          <X size={16} />
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="block text-xs text-multia-muted md:col-span-2">
          URL o dominio público autorizado
          <input
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            maxLength={2048}
            placeholder="https://mi-sitio.com"
            className="mt-1 w-full rounded-xl border border-white/10 bg-multia-input px-3 py-2 text-sm text-multia-text outline-none focus:border-emerald-400/50"
          />
        </label>

        <label className="block text-xs text-multia-muted">
          Base de autorización
          <select
            value={authorizationBasis}
            onChange={(event) => setAuthorizationBasis(event.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-multia-input px-3 py-2 text-sm text-multia-text outline-none focus:border-emerald-400/50"
          >
            <option value="">Seleccione…</option>
            {AUTHORIZATION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>

        <label className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-200">
          <input
            type="checkbox"
            checked={authorizationConfirmed}
            onChange={(event) => setAuthorizationConfirmed(event.target.checked)}
            className="mt-0.5"
          />
          Confirmo que tengo autorización para evaluar este sitio y que usaré el resultado únicamente para prevención y corrección.
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={runAudit}
          disabled={!target.trim() || !authorizationBasis || !authorizationConfirmed || running}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {running ? <LoaderCircle size={16} className="animate-spin" /> : <Globe2 size={16} />}
          {running ? 'Evaluando de forma limitada…' : 'Auditar sitio autorizado'}
        </button>
        {running && (
          <button type="button" onClick={() => controllerRef.current?.abort()} className="text-xs text-multia-muted hover:text-white">
            Cancelar
          </button>
        )}
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">
        <ShieldAlert size={16} className="mt-0.5 shrink-0" />
        No admite IP directas, redes privadas, puertos personalizados, UDP, fuerza bruta, explotación, evasión ni seguimiento continuo.
      </div>

      {error && <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">{error}</div>}

      {result && (
        <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-black/10 p-3 text-xs text-multia-muted">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-medium text-multia-text">Resultado preventivo</div>
              <div>{result.target?.origin}</div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-emerald-200">
              <CheckCircle2 size={14} /> {result.score}/100
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <div><strong>HTTP:</strong> {result.web?.statusCode || 'sin respuesta'}</div>
            <div><strong>TLS:</strong> {result.tls?.available ? `${result.tls.protocol || 'disponible'} · ${result.tls.daysRemaining ?? '?'} días restantes` : 'no verificado'}</div>
            <div><strong>Puertos abiertos:</strong> {openPorts.length ? openPorts.map((item) => `${item.port}/${item.service}`).join(', ') : 'ninguno en el conjunto evaluado'}</div>
            <div><strong>Tecnologías:</strong> {result.technologies?.length ? result.technologies.map((item) => `${item.name}${item.version ? ` ${item.version}` : ''}`).join(', ') : 'no identificadas con certeza'}</div>
          </div>

          <ResultList title="Aspectos positivos" items={result.assessment?.positives} emptyText="No se registraron fortalezas automáticas." />
          <ResultList title="Aspectos negativos o riesgos" items={result.assessment?.negatives} emptyText="No se registraron riesgos automáticos." />
          <ResultList title="Mejoras preliminares" items={result.assessment?.improvements} emptyText="No se registraron mejoras automáticas." />
          <ResultList title="Avisos asociados a versiones visibles" items={advisories} emptyText={result.advisories?.error ? `Consulta no disponible: ${result.advisories.error}` : 'Sin coincidencias exactas para paquetes compatibles.'} />

          <button
            type="button"
            onClick={() => onApply(result.councilPrompt)}
            className="rounded-xl bg-multia-accent px-4 py-2 text-sm font-medium text-white hover:bg-multia-accent/80"
          >
            Enviar informe al consejo de 185 agentes
          </button>
        </div>
      )}
    </div>
  )
}
