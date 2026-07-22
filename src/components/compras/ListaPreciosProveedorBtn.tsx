'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Props {
  supplierId: string
  nombreProveedor: string
  listaPreciosUrl: string | null
  listaPreciosNombre: string | null
  listaPreciosActualizadoAt: string | null
}

export default function ListaPreciosProveedorBtn({
  supplierId, nombreProveedor, listaPreciosUrl, listaPreciosNombre, listaPreciosActualizadoAt,
}: Props) {
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [eliminando, setEliminando] = useState(false)

  async function handleArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSubiendo(true)

    const ext = file.name.split('.').pop() ?? 'pdf'
    const path = `${supplierId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('proveedores-listas').upload(path, file, { upsert: true })
    if (error) {
      toast.error('Error al subir el archivo: ' + error.message)
      setSubiendo(false)
      return
    }
    const { data } = supabase.storage.from('proveedores-listas').getPublicUrl(path)

    const { error: errUpdate } = await supabase.from('suppliers').update({
      lista_precios_url: data.publicUrl,
      lista_precios_nombre: file.name,
      lista_precios_actualizado_at: new Date().toISOString(),
    }).eq('id', supplierId)

    setSubiendo(false)
    if (errUpdate) { toast.error('Error al guardar: ' + errUpdate.message); return }
    if (fileRef.current) fileRef.current.value = ''
    toast.success('Lista de precios actualizada')
    router.refresh()
  }

  async function eliminar() {
    setEliminando(true)
    const { error } = await supabase.from('suppliers').update({
      lista_precios_url: null,
      lista_precios_nombre: null,
      lista_precios_actualizado_at: null,
    }).eq('id', supplierId)
    setEliminando(false)
    if (error) { toast.error('Error al eliminar: ' + error.message); return }
    toast.success('Lista de precios eliminada')
    router.refresh()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold border transition-colors whitespace-nowrap ${
          listaPreciosUrl
            ? 'bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100'
            : 'bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100'
        }`}
      >
        📋 {listaPreciosUrl ? 'Lista de precios' : 'Subir lista'}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm space-y-4 p-6" onClick={e => e.stopPropagation()}>
            <div>
              <p className="font-bold text-gray-900 text-lg">Lista de precios</p>
              <p className="text-sm text-gray-500 mt-0.5">{nombreProveedor}</p>
            </div>

            {listaPreciosUrl ? (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 space-y-2">
                <a href={listaPreciosUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-purple-800 hover:underline">
                  <span className="text-xl">📄</span>
                  <span className="truncate font-medium">{listaPreciosNombre ?? 'Ver archivo'}</span>
                </a>
                {listaPreciosActualizadoAt && (
                  <p className="text-xs text-purple-500">
                    Actualizada el {new Date(listaPreciosActualizadoAt).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </p>
                )}
                <button type="button" onClick={eliminar} disabled={eliminando}
                  className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50">
                  {eliminando ? 'Eliminando...' : '🗑️ Eliminar lista'}
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Aún no has subido una lista de precios para este proveedor.</p>
            )}

            <label className="block">
              <span className={`flex items-center justify-center gap-1.5 w-full py-2.5 border rounded-xl text-sm font-medium cursor-pointer transition-colors ${
                subiendo ? 'text-gray-400 border-gray-200' : 'text-blue-600 border-blue-300 hover:bg-blue-50'
              }`}>
                {subiendo ? '⏳ Subiendo...' : listaPreciosUrl ? '📎 Reemplazar archivo' : '📎 Subir archivo'}
              </span>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.xls,.xlsx,.csv,image/*"
                className="hidden"
                onChange={handleArchivo}
                disabled={subiendo}
              />
            </label>
            <p className="text-xs text-gray-400 -mt-2">PDF, Excel, CSV o imagen (foto de la lista impresa)</p>

            <button onClick={() => setOpen(false)}
              className="w-full py-2 border border-gray-300 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors">
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  )
}
