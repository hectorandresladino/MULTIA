import { useEffect, useRef, useState } from 'react'
import { Camera, LoaderCircle, MapPin, ShieldCheck, X } from 'lucide-react'
import { analyzeImageLocation } from '../services/imageLocationService'

export default function ImageLocationAnalyzer({ onApply, onClose }) {
  const fileInputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [personName, setPersonName] = useState('')
  const [progress, setProgress] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [running, setRunning] = useState(false)
  const controllerRef = useRef(null)

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    controllerRef.current?.abort()
  }, [previewUrl])

  const chooseFile = (event) => {
    const selected = event.target.files?.[0]
    if (!selected) return
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(selected)
    setPreviewUrl(URL.createObjectURL(selected))
    setResult(null)
    setError('')
  }

  const analyze = async () => {
    if (!file || running) return
    setRunning(true)
    setError('')
    setResult(null)
    controllerRef.current = new AbortController()
    try {
      const analysis = await analyzeImageLocation(file, {
        personName,
        signal: controllerRef.current.signal,
        onProgress: setProgress,
      })
      setResult(analysis)
    } catch (analysisError) {
      setError(analysisError.message || 'No fue posible analizar la imagen.')
    } finally {
      setRunning(false)
      controllerRef.current = null
    }
  }

  const placeLabel = result?.place
    ? [result.place.city, result.place.state, result.place.country].filter(Boolean).join(', ')
    : 'Sin ubicación GPS disponible'

  return (
    <div className="mb-3 rounded-2xl border border-cyan-500/25 bg-cyan-500/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-cyan-200">
            <MapPin size={16} /> Analizador seguro de lugar y contexto
          </div>
          <p className="mt-1 text-xs text-multia-muted">
            Lee GPS/EXIF, texto visible y contexto de la escena. No reconoce rostros ni deduce nacionalidad por apariencia.
          </p>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-1 text-multia-muted hover:bg-white/10 hover:text-white" aria-label="Cerrar">
          <X size={16} />
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[160px_1fr]">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex min-h-32 items-center justify-center overflow-hidden rounded-xl border border-dashed border-white/20 bg-black/10 text-multia-muted hover:border-cyan-400/50"
        >
          {previewUrl ? <img src={previewUrl} alt="Vista previa" className="h-32 w-full object-cover" /> : <span className="flex flex-col items-center gap-2 text-xs"><Camera size={24} />Subir fotografía</span>}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={chooseFile} />

        <div className="space-y-3">
          <label className="block text-xs text-multia-muted">
            Nombre opcional para investigación pública independiente
            <input
              value={personName}
              onChange={(event) => setPersonName(event.target.value)}
              maxLength={160}
              placeholder="No se usa para reconocer el rostro"
              className="mt-1 w-full rounded-xl border border-white/10 bg-multia-input px-3 py-2 text-sm text-multia-text outline-none focus:border-cyan-400/50"
            />
          </label>
          <div className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-200">
            <ShieldCheck size={16} className="mt-0.5 shrink-0" />
            Use fotografías propias o autorizadas. MULTIA no debe utilizarse para seguir, identificar o ubicar personas privadas.
          </div>
          <button
            type="button"
            onClick={analyze}
            disabled={!file || running}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {running ? <LoaderCircle size={16} className="animate-spin" /> : <MapPin size={16} />}
            {running ? 'Analizando localmente…' : 'Analizar fotografía'}
          </button>
        </div>
      </div>

      {progress && running && (
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-xs text-multia-muted"><span>{progress.message}</span><span>{progress.progress || 0}%</span></div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-cyan-500 transition-all" style={{ width: `${progress.progress || 0}%` }} /></div>
        </div>
      )}

      {error && <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">{error}</div>}

      {result && (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/10 p-3 text-xs text-multia-muted">
          <div className="font-medium text-multia-text">Resultado local preliminar</div>
          <div className="mt-2 grid gap-1">
            <div><strong>Ubicación por metadatos:</strong> {placeLabel}</div>
            <div><strong>Texto visible:</strong> {result.visibleText || 'No detectado'}</div>
            <div><strong>Descripción visual:</strong> {result.visualDescription || 'No disponible'}</div>
          </div>
          <button
            type="button"
            onClick={() => onApply(result.prompt, file)}
            className="mt-3 rounded-xl bg-multia-accent px-4 py-2 text-sm font-medium text-white hover:bg-multia-accent/80"
          >
            Enviar evidencias al consejo de 185 agentes
          </button>
        </div>
      )}
    </div>
  )
}
