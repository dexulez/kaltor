'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MarcaSelector, ModeloSelector } from '@/components/reparaciones/MarcaModeloCombo'
import ManualContenido from './ManualContenido'

const TIPOS = [
  { value: 'falla_comun', label: '⚠️ Falla común',    desc: 'Diagnóstico y solución de problemas frecuentes' },
  { value: 'plano',       label: '📐 Plano/Esquema',  desc: 'Diagrama de circuitos o esquemático' },
  { value: 'test_point',  label: '🔬 Test Point',      desc: 'Puntos de prueba en la placa' },
  { value: 'frp',         label: '🔓 FRP / Bypass',    desc: 'Procedimiento y herramientas para quitar FRP' },
  { value: 'herramienta', label: '🛠️ Herramienta',    desc: 'Guía de uso de herramientas o software' },
  { value: 'otro',        label: '📄 Otro',            desc: 'Otro tipo de información técnica' },
]

const TAGS_SUGERIDOS = [
  'pantalla', 'batería', 'carga', 'placa madre', 'cámara', 'conector',
  'sonido', 'micrófono', 'altavoz', 'antena', 'wifi', 'bluetooth',
  'huella', 'biometría', 'botón', 'flex', 'ic carga', 'ic audio',
  'software', 'flash', 'frp', 'icloud', 'mi account',
]

const TEMPLATE: Record<string, string> = {
  falla_comun: `## Síntomas
-

## Causa probable
-

## Diagnóstico paso a paso
1.
2.
3.

## Solución
-

## Componentes necesarios
-

## Notas
`,
  plano: `## Descripción del plano
Indica qué sección de la placa cubre este diagrama.

## Referencia de componentes clave
-

## Notas
`,
  test_point: `## Ubicación en la placa
Describe dónde están los puntos o adjunta foto.

## Voltajes esperados
| Punto | Voltaje | Descripción |
|-------|---------|-------------|
|       |         |             |

## Procedimiento de medición
1.
2.

## Herramientas
- Multímetro en modo DC
`,
  frp: `## Herramienta recomendada
- **Software:** (ej: Chimera Tool, Octoplus, EFT Dongle)
- **Versión probada:**
- **Cable requerido:**

## Procedimiento
1.
2.
3.

## Notas importantes
⚠️ Solo realizar con autorización del propietario del equipo.
`,
  herramienta: `## Nombre de la herramienta
- **Software/Equipo:**
- **Versión:**

## Para qué sirve
-

## Cómo usarla
1.
2.

## Notas
`,
  otro: `## Descripción
`,
}

interface Manual {
  id: string
  marca: string
  modelo: string | null
  tipo: string
  titulo: string
  contenido: string | null
  archivos: string[]
  tags: string[]
}

interface Props {
  manual?: Manual
}

export default function ManualForm({ manual }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [marca, setMarca] = useState(manual?.marca ?? '')
  const [modelo, setModelo] = useState(manual?.modelo ?? '')
  const [tipo, setTipo] = useState(manual?.tipo ?? 'falla_comun')
  const [titulo, setTitulo] = useState(manual?.titulo ?? '')
  const [contenido, setContenido] = useState(manual?.contenido ?? TEMPLATE.falla_comun)
  const [tags, setTags] = useState<string[]>(manual?.tags ?? [])
  const [tagInput, setTagInput] = useState('')
  const [archivos, setArchivos] = useState<string[]>(manual?.archivos ?? [])
  const [subiendo, setSubiendo] = useState(false)
  const [preview, setPreview] = useState(false)
  const [saving, setSaving] = useState(false)

  function handleTipoChange(nuevoTipo: string) {
    setTipo(nuevoTipo)
    if (!manual) setContenido(TEMPLATE[nuevoTipo] ?? '')
  }

  function toggleTag(tag: string) {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  function addTagInput() {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setTagInput('')
  }

  async function handleArchivos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setSubiendo(true)
    const urls: string[] = []
    for (const file of files) {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${marca}/${modelo || 'general'}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('manuales').upload(path, file, { upsert: true })
      if (error) { toast.error(`Error subiendo ${file.name}`); continue }
      const { data } = supabase.storage.from('manuales').getPublicUrl(path)
      urls.push(data.publicUrl)
    }
    setArchivos(prev => [...prev, ...urls])
    toast.success(`${urls.length} archivo(s) subidos`)
    setSubiendo(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function eliminarArchivo(url: string) {
    setArchivos(prev => prev.filter(u => u !== url))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!marca.trim()) { toast.error('Selecciona la marca'); return }
    if (!titulo.trim()) { toast.error('Escribe un título'); return }
    setSaving(true)

    const payload = {
      marca: marca.trim(),
      modelo: modelo.trim() || null,
      tipo,
      titulo: titulo.trim(),
      contenido: contenido.trim() || null,
      archivos,
      tags,
      updated_at: new Date().toISOString(),
    }

    if (manual) {
      const { error } = await supabase.from('equipment_manuals').update(payload).eq('id', manual.id)
      if (error) { toast.error('Error al actualizar: ' + error.message); setSaving(false); return }
      toast.success('Manual actualizado')
      router.push(`/manuales/${manual.id}`)
    } else {
      const { data, error } = await supabase.from('equipment_manuals').insert(payload).select('id').single()
      if (error) { toast.error('Error al crear: ' + error.message); setSaving(false); return }
      toast.success('Manual creado')
      router.push(`/manuales/${data.id}`)
    }
    router.refresh()
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-4xl">

      {/* Equipo */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Equipo</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Marca <span className="text-red-500">*</span></Label>
            <MarcaSelector value={marca} onChange={v => { setMarca(v); setModelo('') }} />
          </div>
          <div className="space-y-1.5">
            <Label>Modelo <span className="text-gray-400 font-normal text-xs">(opcional — dejar vacío si aplica a toda la marca)</span></Label>
            <ModeloSelector marca={marca} value={modelo} onChange={setModelo} />
          </div>
        </div>
      </div>

      {/* Tipo y título */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Tipo y título</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {TIPOS.map(t => (
            <button key={t.value} type="button" onClick={() => handleTipoChange(t.value)}
              className={`flex flex-col items-start p-3 rounded-xl border text-left transition-colors ${tipo === t.value ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400' : 'bg-gray-50 border-gray-200 hover:border-blue-300'}`}>
              <p className="text-sm font-semibold text-gray-800">{t.label}</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-tight">{t.desc}</p>
            </button>
          ))}
        </div>
        <div className="space-y-1.5">
          <Label>Título <span className="text-red-500">*</span></Label>
          <Input
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            placeholder={tipo === 'falla_comun' ? 'ej: No carga — ic de carga quemado' : tipo === 'test_point' ? 'ej: Test points batería' : 'Título descriptivo'}
            required
          />
        </div>
      </div>

      {/* Contenido */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="bg-gray-50 border-b px-4 py-2.5 flex items-center justify-between">
          <p className="font-semibold text-gray-700 text-sm">Contenido (Markdown)</p>
          <button type="button" onClick={() => setPreview(p => !p)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium">
            {preview ? '✏️ Editar' : '👁️ Vista previa'}
          </button>
        </div>
        {preview ? (
          <div className="p-5 min-h-48">
            {contenido.trim() ? <ManualContenido contenido={contenido} /> : <p className="text-gray-400 text-sm italic">Sin contenido</p>}
          </div>
        ) : (
          <div className="p-3">
            <textarea
              value={contenido}
              onChange={e => setContenido(e.target.value)}
              rows={18}
              className="w-full font-mono text-sm border-0 focus:outline-none resize-y text-gray-800 p-1 bg-transparent"
              placeholder="Escribe en Markdown: ## Sección, **negrita**, - lista, `código`..."
            />
            <div className="border-t pt-2 px-1">
              <p className="text-xs text-gray-400">
                Formato: <code className="bg-gray-100 px-1 rounded">## Título</code> · <code className="bg-gray-100 px-1 rounded">**negrita**</code> · <code className="bg-gray-100 px-1 rounded">- lista</code> · <code className="bg-gray-100 px-1 rounded">`código`</code> · <code className="bg-gray-100 px-1 rounded">---</code> separador
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Archivos */}
      <div className="bg-white rounded-xl border p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800">Archivos adjuntos</h2>
            <p className="text-xs text-gray-400 mt-0.5">Fotos de planos, test points, pantallazos — JPG, PNG, PDF (máx 50MB c/u)</p>
          </div>
          <label className="cursor-pointer">
            <span className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm font-medium transition-colors ${subiendo ? 'text-gray-400 border-gray-200' : 'text-blue-600 border-blue-300 hover:bg-blue-50'}`}>
              {subiendo ? '⏳ Subiendo...' : '📎 Agregar archivos'}
            </span>
            <input ref={fileRef} type="file" accept="image/*,.pdf" multiple className="hidden"
              onChange={handleArchivos} disabled={subiendo} />
          </label>
        </div>

        {archivos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {archivos.map((url, i) => {
              const isPdf = url.toLowerCase().includes('.pdf')
              const nombre = decodeURIComponent(url.split('/').pop() ?? `archivo-${i + 1}`)
              return (
                <div key={url} className="relative group rounded-xl border overflow-hidden">
                  {isPdf ? (
                    <a href={url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 hover:bg-gray-50">
                      <span className="text-2xl">📄</span>
                      <span className="text-xs text-gray-700 truncate">{nombre}</span>
                    </a>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt={nombre} className="w-full h-28 object-cover" />
                  )}
                  <button type="button" onClick={() => eliminarArchivo(url)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600">
                    ✕
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="bg-white rounded-xl border p-5 space-y-3">
        <h2 className="font-semibold text-gray-800">Etiquetas</h2>
        <div className="flex flex-wrap gap-1.5">
          {TAGS_SUGERIDOS.map(t => (
            <button key={t} type="button" onClick={() => toggleTag(t)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${tags.includes(t) ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-400'}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input value={tagInput} onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTagInput() } }}
            placeholder="Agregar etiqueta personalizada..." className="text-sm" />
          <Button type="button" variant="outline" onClick={addTagInput} className="shrink-0">+</Button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {tags.map(t => (
              <span key={t} className="flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                {t}
                <button type="button" onClick={() => setTags(p => p.filter(x => x !== t))} className="hover:text-red-600">✕</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="flex gap-3 pb-20 md:pb-4">
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={saving || subiendo}>
          {saving ? 'Guardando...' : manual ? 'Actualizar manual' : 'Crear manual'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
      </div>
    </form>
  )
}
