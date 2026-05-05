'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MODULOS, ModuloKey, getDefaultPermisos } from '@/lib/modulos'

interface UsuarioDetalle {
  id: string
  nombre_completo: string
  email: string
  telefono?: string
  rol_id?: string
  activo: boolean
  permisos_modulos?: Record<string, boolean> | null
}

interface RolOption {
  id: string
  nombre: string
}

interface Props {
  usuario: UsuarioDetalle
  roles: RolOption[]
}

function getRolNombre(rolId: string, roles: RolOption[]): string {
  return roles.find((r) => r.id === rolId)?.nombre ?? ''
}

function buildInitialPermisos(
  usuario: UsuarioDetalle,
  roles: RolOption[]
): Record<ModuloKey, boolean> {
  if (usuario.permisos_modulos != null) {
    return Object.fromEntries(
      MODULOS.map((m) => [m.key, !!usuario.permisos_modulos![m.key]])
    ) as Record<ModuloKey, boolean>
  }
  const rolNombre = getRolNombre(usuario.rol_id ?? '', roles)
  return getDefaultPermisos(rolNombre)
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
  const [permisos, setPermisos] = useState<Record<ModuloKey, boolean>>(
    () => buildInitialPermisos(usuario, roles)
  )

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleRolChange(value: string | null) {
    const rolId = value ?? 'none'
    set('rol_id', rolId)
    const rolNombre = getRolNombre(rolId, roles)
    setPermisos(getDefaultPermisos(rolNombre))
  }

  function togglePermiso(key: ModuloKey) {
    setPermisos((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function resetToRoleDefaults() {
    const rolNombre = getRolNombre(form.rol_id, roles)
    setPermisos(getDefaultPermisos(rolNombre))
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase
      .from('user_profiles')
      .update({
        nombre_completo: form.nombre_completo.trim(),
        telefono: form.telefono.trim() || null,
        rol_id: form.rol_id === 'none' ? null : form.rol_id,
        activo: form.activo,
        permisos_modulos: permisos,
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

  const rolActualNombre = getRolNombre(form.rol_id, roles)

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Datos básicos */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Datos de usuario</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Nombre completo</Label>
            <Input
              value={form.nombre_completo}
              onChange={(e) => set('nombre_completo', e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={usuario.email} disabled />
          </div>
          <div className="space-y-1.5">
            <Label>Teléfono</Label>
            <Input
              value={form.telefono}
              onChange={(e) => set('telefono', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Rol</Label>
            <Select value={form.rol_id} onValueChange={handleRolChange}>
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
            <Select
              value={form.activo ? 'activo' : 'inactivo'}
              onValueChange={(value) => set('activo', value === 'activo')}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="activo">Activo</SelectItem>
                <SelectItem value="inactivo">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Permisos de módulos */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800">Acceso a módulos</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Controla qué módulos puede ver este usuario en el menú lateral.
              {rolActualNombre && ` Defaults aplicados para rol "${rolActualNombre}".`}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resetToRoleDefaults}
            className="text-xs shrink-0"
          >
            Restablecer rol
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {MODULOS.map((modulo) => {
            const checked = !!permisos[modulo.key]
            return (
              <label
                key={modulo.key}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors select-none ${
                  checked
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-blue-600 shrink-0"
                  checked={checked}
                  onChange={() => togglePermiso(modulo.key)}
                />
                <span className="text-lg leading-none">{modulo.icon}</span>
                <span className="text-sm font-medium text-gray-700">{modulo.label}</span>
              </label>
            )
          })}
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? 'Guardando...' : 'Guardar cambios'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
