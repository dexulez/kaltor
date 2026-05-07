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
}

export default function UsuarioAcciones({ userId, nombreUsuario, rolActualId, activo, roles, esPropio }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [rolId, setRolId] = useState(rolActualId ?? '')
  const [loading, setLoading] = useState(false)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

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
    router.refresh()
    setDeleting(false)
  }

  const rolNombre = roles.find(r => r.id === rolId)?.nombre ?? ''
  const rolLabel = ROL_LABEL[rolNombre] ?? rolNombre ?? 'Sin rol'

  return (
    <>
      <div className="flex items-center gap-2">
        <Select value={rolId} onValueChange={cambiarRol} disabled={esPropio}>
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
        {!esPropio && (
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
        {!esPropio && (
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

      <Dialog open={showConfirmDelete} onOpenChange={setShowConfirmDelete}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">Eliminar usuario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              ¿Estás seguro que deseas eliminar a <strong>{nombreUsuario}</strong>?
            </p>
            <p className="text-xs text-gray-400 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              Esta acción es permanente. El usuario perderá acceso inmediatamente y no podrá ser recuperado.
            </p>
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
                disabled={deleting}
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
