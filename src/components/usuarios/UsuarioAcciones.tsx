'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

interface Role { id: string; nombre: string }

interface Props {
  userId: string
  rolActualId: string | null
  activo: boolean
  roles: Role[]
  esPropio: boolean
}

export default function UsuarioAcciones({ userId, rolActualId, activo, roles, esPropio }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [rolId, setRolId] = useState(rolActualId ?? '')
  const [loading, setLoading] = useState(false)

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

  return (
    <div className="flex items-center gap-2">
      <Select value={rolId} onValueChange={cambiarRol} disabled={esPropio}>
        <SelectTrigger className="w-36 h-8 text-xs">
          <SelectValue placeholder="Sin rol" />
        </SelectTrigger>
        <SelectContent>
          {roles.map(r => (
            <SelectItem key={r.id} value={r.id}>{r.nombre}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!esPropio && (
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleActivo}
          disabled={loading}
          className={`text-xs ${activo ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}
        >
          {activo ? 'Desactivar' : 'Activar'}
        </Button>
      )}
    </div>
  )
}
