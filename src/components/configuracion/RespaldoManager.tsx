'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CATEGORIAS, CATEGORIA_KEYS, fraseConfirmacion, type CategoriaRespaldo } from '@/lib/respaldo/categorias'

async function descargarArchivo(url: string) {
  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error ?? 'Error al generar el respaldo')
  }
  const blob = await res.blob()
  const disposition = res.headers.get('Content-Disposition') ?? ''
  const match = disposition.match(/filename="?([^"]+)"?/)
  const filename = match?.[1] ?? 'respaldo.json'
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(objectUrl)
}

type Conteo = { tabla: string; cantidad: number }
type Paso = 'motivo' | 'respaldo' | 'confirmar'

export default function RespaldoManager() {
  const router = useRouter()
  const [respaldandoTodo, setRespaldandoTodo] = useState(false)
  const [respaldandoCat, setRespaldandoCat] = useState<CategoriaRespaldo | null>(null)

  const [modalCategoria, setModalCategoria] = useState<CategoriaRespaldo | null>(null)
  const [paso, setPaso] = useState<Paso>('motivo')
  const [conteos, setConteos] = useState<Conteo[]>([])
  const [cargandoConteos, setCargandoConteos] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [descargandoRespaldoPrevio, setDescargandoRespaldoPrevio] = useState(false)
  const [respaldoDescargado, setRespaldoDescargado] = useState(false)
  const [confirmacionTexto, setConfirmacionTexto] = useState('')
  const [pin, setPin] = useState('')
  const [borrando, setBorrando] = useState(false)

  async function respaldarCategoria(cat: CategoriaRespaldo) {
    setRespaldandoCat(cat)
    try {
      await descargarArchivo(`/api/configuracion/respaldo?categoria=${cat}`)
      toast.success(`Respaldo de "${CATEGORIAS[cat].label}" descargado`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al generar el respaldo')
    } finally {
      setRespaldandoCat(null)
    }
  }

  async function respaldarTodo() {
    setRespaldandoTodo(true)
    try {
      await descargarArchivo('/api/configuracion/respaldo?categoria=todo')
      toast.success('Respaldo completo descargado')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al generar el respaldo')
    } finally {
      setRespaldandoTodo(false)
    }
  }

  async function abrirBorrado(cat: CategoriaRespaldo) {
    setModalCategoria(cat)
    setPaso('motivo')
    setMotivo('')
    setConfirmacionTexto('')
    setPin('')
    setRespaldoDescargado(false)
    setConteos([])
    setCargandoConteos(true)
    try {
      const res = await fetch(`/api/configuracion/respaldo/contar?categoria=${cat}`)
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Error al contar los registros')
      setConteos(body.conteos ?? [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al contar los registros')
    } finally {
      setCargandoConteos(false)
    }
  }

  function cerrarModal() {
    setModalCategoria(null)
  }

  function continuarAMotivo() {
    if (motivo.trim().length < 10) {
      toast.error('Describe el motivo con al menos 10 caracteres')
      return
    }
    setPaso('respaldo')
  }

  async function descargarRespaldoYContinuar() {
    if (!modalCategoria) return
    setDescargandoRespaldoPrevio(true)
    try {
      await descargarArchivo(`/api/configuracion/respaldo?categoria=${modalCategoria}`)
      setRespaldoDescargado(true)
      setPaso('confirmar')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al generar el respaldo')
    } finally {
      setDescargandoRespaldoPrevio(false)
    }
  }

  async function confirmarBorrado() {
    if (!modalCategoria) return
    const fraseEsperada = fraseConfirmacion(modalCategoria)
    if (confirmacionTexto.trim().toUpperCase() !== fraseEsperada) {
      toast.error(`Debes escribir exactamente "${fraseEsperada}"`)
      return
    }
    if (!pin.trim()) {
      toast.error('Ingresa el PIN de autorización')
      return
    }
    setBorrando(true)
    try {
      const res = await fetch('/api/configuracion/respaldo/borrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoria: modalCategoria,
          motivo,
          confirmacionTexto,
          pin,
        }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Error al borrar')
      toast.success(`"${CATEGORIAS[modalCategoria].label}" borrado correctamente`)
      cerrarModal()
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al borrar')
    } finally {
      setBorrando(false)
    }
  }

  const cat = modalCategoria ? CATEGORIAS[modalCategoria] : null

  return (
    <div className="space-y-5">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="font-semibold text-blue-900 text-sm">📥 Respaldo completo del sistema</p>
          <p className="text-xs text-blue-700 mt-0.5">Descarga toda la información de tu tienda en un solo archivo, organizada por categoría.</p>
        </div>
        <Button onClick={respaldarTodo} disabled={respaldandoTodo} className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap">
          {respaldandoTodo ? 'Generando...' : 'Descargar todo'}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CATEGORIA_KEYS.map((key) => {
          const info = CATEGORIAS[key]
          return (
            <div key={key} className="bg-white rounded-xl border p-4 space-y-3">
              <div className="flex items-start gap-2">
                <span className="text-2xl">{info.icono}</span>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{info.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{info.descripcion}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-blue-700 border-blue-300 hover:bg-blue-50"
                  onClick={() => respaldarCategoria(key)}
                  disabled={respaldandoCat === key}
                >
                  {respaldandoCat === key ? 'Generando...' : '📥 Respaldar'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                  onClick={() => abrirBorrado(key)}
                >
                  🗑️ Borrar
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {modalCategoria && cat && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={cerrarModal}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-800 text-lg">🗑️ Borrar {cat.label}</h3>
                <p className="text-xs text-gray-400">Esta acción no se puede deshacer</p>
              </div>
              <button onClick={cerrarModal} className="text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">✕</button>
            </div>

            {paso === 'motivo' && (
              <>
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-sm text-red-800 font-medium">⚠ Se borrarán permanentemente:</p>
                  {cargandoConteos ? (
                    <p className="text-xs text-red-700 mt-1">Calculando...</p>
                  ) : (
                    <ul className="text-xs text-red-700 mt-1 space-y-0.5">
                      {conteos.map(c => (
                        <li key={c.tabla}>• {c.cantidad} {c.tabla.replace(/_/g, ' ')}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Motivo del borrado <span className="text-red-500">*</span></Label>
                  <textarea
                    value={motivo}
                    onChange={e => setMotivo(e.target.value)}
                    placeholder="Explica por qué necesitas borrar esta información..."
                    className="w-full border rounded-lg px-3 py-2 text-sm min-h-20"
                  />
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={cerrarModal}>Cancelar</Button>
                  <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={continuarAMotivo}>Continuar →</Button>
                </div>
              </>
            )}

            {paso === 'respaldo' && (
              <>
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-center space-y-2">
                  <span className="text-3xl">💾</span>
                  <p className="font-semibold text-amber-900">Antes de borrar, descarga un respaldo</p>
                  <p className="text-xs text-amber-700">
                    Se descargará un archivo con toda la información de &quot;{cat.label}&quot; antes de continuar, por si necesitas recuperarla más adelante.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setPaso('motivo')}>← Atrás</Button>
                  <Button className="flex-1 bg-amber-600 hover:bg-amber-700" onClick={descargarRespaldoYContinuar} disabled={descargandoRespaldoPrevio}>
                    {descargandoRespaldoPrevio ? 'Descargando...' : '💾 Descargar respaldo y continuar'}
                  </Button>
                </div>
              </>
            )}

            {paso === 'confirmar' && (
              <>
                {respaldoDescargado && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-2 text-center">
                    <p className="text-xs text-green-700">✓ Respaldo descargado correctamente</p>
                  </div>
                )}

                <div className="bg-red-50 border border-red-300 rounded-xl p-4 text-center space-y-2">
                  <span className="text-3xl">🔐</span>
                  <p className="font-semibold text-red-900">Confirmación final</p>
                </div>

                <div className="space-y-1.5">
                  <Label>Escribe <span className="font-mono font-bold">{fraseConfirmacion(modalCategoria)}</span> para confirmar</Label>
                  <Input
                    value={confirmacionTexto}
                    onChange={e => setConfirmacionTexto(e.target.value)}
                    placeholder={fraseConfirmacion(modalCategoria)}
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>PIN de autorización del administrador <span className="text-red-500">*</span></Label>
                  <Input
                    type="password"
                    value={pin}
                    onChange={e => setPin(e.target.value)}
                    placeholder="• • • • • •"
                    onKeyDown={e => e.key === 'Enter' && confirmarBorrado()}
                  />
                  <p className="text-xs text-gray-400">El PIN se configura en Configuración → Sistema</p>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setPaso('respaldo')}>← Atrás</Button>
                  <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={confirmarBorrado} disabled={borrando}>
                    {borrando ? 'Borrando...' : '🔐 Borrar definitivamente'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
