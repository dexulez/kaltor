'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface UsuarioDetalle {
  id: string
  nombre_completo: string
  email: string
  telefono?: string
  rol_id?: string
  activo: boolean
}

interface RolOption {
  id: string
  nombre: string
}

interface Props {
  usuario: UsuarioDetalle
  roles: RolOption[]
}

export default function UsuarioForm({ usuario, roles }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nombre_completo: usuario.nombre_completo,
    telefono: usuario.telefono ?? '',
    rol_id: usuario.rol_id ?? 'none',
    activo: usuario.activo,
  })

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase
      .from('user_profiles')
      .update({
        nombre_completo: form.nombre_completo.trim(),
        telefono: form.telefono.trim() || null,
        rol_id: form.rol_id === 'none' ? null : form.rol_id,
        activo: form.activo,
      })
      .eq('id', usuario.id)

    if (error) {
      toast.error('Error al actualizar usuario: ' + error.message)
      setLoading(false)
      return
    }

    toast.success('Usuario actualizado correctamente')
    router.push('/usuarios')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Datos de usuario</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Nombre completo</Label>
            <Input value={form.nombre_completo} onChange={(e) => set('nombre_completo', e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={usuario.email} disabled />
          </div>
          <div className="space-y-1.5">
            <Label>Teléfono</Label>
            <Input value={form.telefono} onChange={(e) => set('telefono', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Rol</Label>
            <Select value={form.rol_id} onValueChange={(value) => set('rol_id', value ?? 'none')}>
              <SelectTrigger><SelectValue placeholder="Seleccionar rol" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin rol</SelectItem>
                {roles.map((rol) => (
                  <SelectItem key={rol.id} value={rol.id}>{rol.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Select value={form.activo ? 'activo' : 'inactivo'} onValueChange={(value) => set('activo', value === 'activo')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="activo">Activo</SelectItem>
                <SelectItem value="inactivo">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar cambios'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
      </div>
    </form>
  )
}
