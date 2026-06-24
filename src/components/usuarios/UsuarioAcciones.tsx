'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const ROL_LABEL: Record<string, string> = {
  administrador:     'Administrador',
  tecnico:           'Técnico',
  vendedor:          'Vendedor',
  supervisor_ventas: 'Supervisor Ventas',
}

interface Role { id: string; nombre: string }

interface Props {
  userId: string
  nombreUsuario: string
  rolActualId: string | null
  activo: boolean
  roles: Role[]
  esPropio: boolean
  puedeEditar?: boolean
  puedeEliminar?: boolean
}

export default function UsuarioAcciones({ userId, nombreUsuario, rolActualId, activo, roles, esPropio, puedeEditar = true, puedeEliminar = true }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [rolId, setRolId] = useState(rolActualId ?? '')
  const [loading, setLoading] = useState(false)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [tempPwd, setTempPwd] = useState<string | null>(null)
  const [generandoPwd, setGenerandoPwd] = useState(false)

  async function cambiarRol(nuevoRolId: string | null) {
    setRolId(nuevoRolId ?? '')
    const { error } = await supabase.from('user_profiles').update({ rol_id: nuevoRolId || null }).eq('id', userId)
    if (error) toast.error(error.message)
    else { toast.success('Rol actualizado'); router.refresh() }
  }

  async function toggleActivo() {
    setLoading(true)
    const { error } = await supabase.from('user_profiles').update({ activo: !activo }).eq('id', userId)
    if (error) toast.error(error.message)
    else { toast.success(activo ? 'Usuario desactivado' : 'Usuario activado'); router.refresh() }
    setLoading(false)
  }

  async function generarPasswordTemporal() {
    setGenerandoPwd(true)
    const res = await fetch('/api/admin/resetear-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error ?? 'Error'); setGenerandoPwd(false); return }
    setTempPwd(data.password)
    setGenerandoPwd(false)
  }

  async function eliminarUsuario() {
    setDeleting(true)
    const res = await fetch('/api/admin/eliminar-usuario', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error ?? 'Error al eliminar'); setDeleting(false); return }
    toast.success('Usuario eliminado')
    setShowConfirmDelete(false)
    setConfirmText('')
    router.refresh()
    setDeleting(false)
  }

  const confirmacionValida = confirmText.trim().toUpperCase() === 'ELIMINAR'

  const rolNombre = roles.find(r => r.id === rolId)?.nombre ?? ''
  const rolLabel = ROL_LABEL[rolNombre] ?? rolNombre ?? 'Sin rol'

  return (
    <>
      <div className="flex items-center gap-2">
        <Select value={rolId} onValueChange={cambiarRol} disabled={esPropio || !puedeEditar}>
          <SelectTrigger className="w-40 h-8 text-xs">
            <span className="flex-1 text-left truncate">{rolLabel}</span>
          </SelectTrigger>
          <SelectContent>
            {roles.map(r => (
              <SelectItem key={r.id} value={r.id}>
                {ROL_LABEL[r.nombre] ?? r.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!esPropio && puedeEditar && (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleActivo}
            disabled={loading}
            className={`text-xs ${activo ? 'text-orange-600 hover:text-orange-700' : 'text-green-600 hover:text-green-700'}`}
          >
            {activo ? 'Desactivar' : 'Activar'}
          </Button>
        )}
        {!esPropio && puedeEditar && (
          <Button
            variant="ghost"
            size="sm"
            onClick={generarPasswordTemporal}
            disabled={generandoPwd}
            className="text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50"
            title="Generar contraseña temporal"
          >
            🔑
          </Button>
        )}
        {!esPropio && puedeEliminar && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowConfirmDelete(true)}
            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
            title="Eliminar usuario"
          >
            🗑️
          </Button>
        )}
      </div>

      {/* Modal contraseña temporal */}
      {tempPwd && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setTempPwd(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 text-lg mb-1">🔑 Contraseña temporal</h3>
            <p className="text-sm text-gray-500 mb-4">Comparte esta contraseña con <strong>{nombreUsuario}</strong> por WhatsApp o teléfono. El usuario podrá cambiarla desde su perfil.</p>
            <div className="bg-amber-50 border border-amber-300 rounded-xl px-5 py-4 text-center mb-4">
              <p className="text-2xl font-bold font-mono tracking-widest text-amber-800">{tempPwd}</p>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => { navigator.clipboard.writeText(tempPwd).catch(() => {}); toast.success('Copiada'); }}>
                📋 Copiar
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setTempPwd(null)}>Cerrar</Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={showConfirmDelete} onOpenChange={v => { setShowConfirmDelete(v); if (!v) setConfirmText('') }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">Eliminar usuario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              ¿Estás seguro que deseas eliminar a <strong>{nombreUsuario}</strong>?
            </p>
            <p className="text-xs text-gray-400 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              El usuario perderá acceso inmediatamente y desaparecerá de la lista. Sus ventas, OTs y movimientos
              quedan intactos — no se borra el historial.
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">
                Escribe <strong>ELIMINAR</strong> para confirmar
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                placeholder="ELIMINAR"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowConfirmDelete(false)}
                disabled={deleting}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={eliminarUsuario}
                disabled={deleting || !confirmacionValida}
              >
                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
