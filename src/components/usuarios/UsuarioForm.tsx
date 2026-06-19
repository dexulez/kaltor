'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { MODULOS, ModuloKey, SUB_PERMISOS, getDefaultPermisos } from '@/lib/modulos'

const ROL_LABEL: Record<string, string> = {
  administrador:     'Administrador',
  tecnico:           'Técnico',
  vendedor:          'Vendedor',
  supervisor_ventas: 'Supervisor Ventas',
}

interface UsuarioDetalle {
  id: string
  nombre_completo: string
  email: string
  telefono?: string
  rol_id?: string
  activo: boolean
  permisos_modulos?: Record<string, boolean> | null
}

interface RolOption { id: string; nombre: string }
interface Props { usuario: UsuarioDetalle; roles: RolOption[]; puedeEditarPermisos?: boolean }

function getRolNombre(rolId: string, roles: RolOption[]): string {
  return roles.find(r => r.id === rolId)?.nombre ?? ''
}

function buildInitialPermisos(usuario: UsuarioDetalle, roles: RolOption[]): Record<string, boolean> {
  const rolNombre = getRolNombre(usuario.rol_id ?? '', roles)
  const defaults = getDefaultPermisos(rolNombre)
  if (usuario.permisos_modulos != null) {
    // Merge: start from defaults, override with stored values
    return { ...defaults, ...usuario.permisos_modulos }
  }
  return defaults
}

const TIPOS_COMISION = [
  { key: 'comision_base',      label: 'Base (cualquier tipo)' },
  { key: 'comision_pantalla',  label: 'Pantalla' },
  { key: 'comision_bateria',   label: 'Batería' },
  { key: 'comision_placa',     label: 'Placa madre' },
  { key: 'comision_software',  label: 'Software' },
  { key: 'comision_camara',    label: 'Cámara' },
  { key: 'comision_conector',  label: 'Conector' },
  { key: 'comision_otro',      label: 'Otro' },
]

export default function UsuarioForm({ usuario, roles, puedeEditarPermisos = true }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nombre_completo: usuario.nombre_completo,
    telefono: usuario.telefono ?? '',
    rol_id: usuario.rol_id ?? 'none',
    activo: usuario.activo,
  })

  // Comisiones (solo editable por admin)
  const usuarioExtra = usuario as unknown as Record<string, unknown>
  const [comisiones, setComisiones] = useState({
    comision_base:              Number(usuarioExtra.comision_base ?? 0),
    comision_pantalla:          Number(usuarioExtra.comision_pantalla ?? 0),
    comision_bateria:           Number(usuarioExtra.comision_bateria ?? 0),
    comision_placa:             Number(usuarioExtra.comision_placa ?? 0),
    comision_software:          Number(usuarioExtra.comision_software ?? 0),
    comision_camara:            Number(usuarioExtra.comision_camara ?? 0),
    comision_conector:          Number(usuarioExtra.comision_conector ?? 0),
    comision_otro:              Number(usuarioExtra.comision_otro ?? 0),
    gana_comision_repuestos:    Boolean(usuarioExtra.gana_comision_repuestos ?? false),
    comision_repuestos_pct:     Number(usuarioExtra.comision_repuestos_pct ?? 0),
    comision_efectivo_add:      Number(usuarioExtra.comision_efectivo_add ?? 0),
    comision_transferencia_add: Number(usuarioExtra.comision_transferencia_add ?? 0),
  })
  function setCom(k: keyof typeof comisiones, v: number | boolean) {
    setComisiones(prev => ({ ...prev, [k]: v }))
  }
  const [permisos, setPermisos] = useState<Record<string, boolean>>(
    () => buildInitialPermisos(usuario, roles)
  )

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function handleRolChange(value: string | null) {
    const rolId = value ?? 'none'
    set('rol_id', rolId)
    const rolNombre = getRolNombre(rolId, roles)
    setPermisos(getDefaultPermisos(rolNombre))
  }

  function togglePerm(key: string) {
    setPermisos(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function resetToRoleDefaults() {
    const rolNombre = getRolNombre(form.rol_id, roles)
    setPermisos(getDefaultPermisos(rolNombre))
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('user_profiles').update({
      nombre_completo: form.nombre_completo.trim(),
      telefono: form.telefono.trim() || null,
      rol_id: form.rol_id === 'none' ? null : form.rol_id,
      activo: form.activo,
      permisos_modulos: permisos,
      ...comisiones,
    }).eq('id', usuario.id)

    if (error) { toast.error('Error al actualizar: ' + error.message); setLoading(false); return }
    toast.success('Usuario actualizado')
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
            <Input value={form.nombre_completo} onChange={e => set('nombre_completo', e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={usuario.email} disabled className="bg-gray-50 text-gray-400" />
          </div>
          <div className="space-y-1.5">
            <Label>Teléfono</Label>
            <Input value={form.telefono} onChange={e => set('telefono', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Rol</Label>
            <Select value={form.rol_id} onValueChange={handleRolChange}>
              <SelectTrigger>
                <span className="flex-1 text-left truncate text-sm">
                  {form.rol_id === 'none' ? 'Sin rol' : (ROL_LABEL[getRolNombre(form.rol_id, roles)] ?? (getRolNombre(form.rol_id, roles) || 'Seleccionar rol'))}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin rol</SelectItem>
                {roles.map(rol => (
                  <SelectItem key={rol.id} value={rol.id}>{ROL_LABEL[rol.nombre] ?? rol.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Select value={form.activo ? 'activo' : 'inactivo'} onValueChange={v => set('activo', v === 'activo')}>
              <SelectTrigger>
                <span className="flex-1 text-left text-sm">{form.activo ? 'Activo' : 'Inactivo'}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="activo">Activo</SelectItem>
                <SelectItem value="inactivo">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Permisos de módulos con sub-permisos */}
      {!puedeEditarPermisos ? (
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold text-gray-800">Acceso a módulos y acciones</h2>
          <p className="text-xs text-gray-500 mt-1">No tienes permiso para editar el detalle de accesos de otros usuarios.</p>
        </div>
      ) : (
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800">Acceso a módulos y acciones</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Controla qué ve y qué puede hacer este usuario.
              {rolActualNombre && ` Defaults del rol "${ROL_LABEL[rolActualNombre] ?? rolActualNombre}".`}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={resetToRoleDefaults} className="text-xs shrink-0">
            Restablecer rol
          </Button>
        </div>

        <div className="space-y-2">
          {MODULOS.map(modulo => {
            const moduloActivo = !!permisos[modulo.key]
            const subs = SUB_PERMISOS[modulo.key as ModuloKey] ?? []

            return (
              <div key={modulo.key} className={`rounded-xl border overflow-hidden transition-colors ${moduloActivo ? 'border-blue-200' : 'border-gray-200'}`}>
                {/* Fila del módulo */}
                <label className={`flex items-center gap-3 px-4 py-3 cursor-pointer select-none ${moduloActivo ? 'bg-blue-50' : 'bg-gray-50 hover:bg-gray-100'}`}>
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-blue-600 shrink-0"
                    checked={moduloActivo}
                    onChange={() => togglePerm(modulo.key)}
                  />
                  <span className="text-xl leading-none shrink-0">{modulo.icon}</span>
                  <span className={`text-sm font-semibold ${moduloActivo ? 'text-blue-800' : 'text-gray-500'}`}>{modulo.label}</span>
                </label>

                {/* Sub-permisos (solo si el módulo está activo y tiene subs) */}
                {moduloActivo && subs.length > 0 && (
                  <div className="bg-white border-t border-blue-100 px-4 py-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {subs.map(sub => {
                      const subActivo = !!permisos[sub.key]
                      return (
                        <label key={sub.key} className={`flex items-start gap-2.5 px-3 py-2 rounded-lg cursor-pointer select-none transition-colors ${subActivo ? 'bg-blue-50 text-blue-800' : 'text-gray-600 hover:bg-gray-50'}`}>
                          <input
                            type="checkbox"
                            className="w-3.5 h-3.5 accent-blue-600 shrink-0 mt-0.5"
                            checked={subActivo}
                            onChange={() => togglePerm(sub.key)}
                          />
                          <div>
                            <p className={`text-xs font-medium leading-tight ${subActivo ? 'text-blue-800' : 'text-gray-700'}`}>{sub.label}</p>
                            {sub.desc && <p className="text-xs text-gray-400 mt-0.5 leading-tight">{sub.desc}</p>}
                          </div>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      )}

      {/* ── Comisiones del técnico (solo administrador) ─────────────────── */}
      <div className="bg-white rounded-xl border p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">💰 Comisiones del técnico</h2>
          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">Solo administrador</span>
        </div>
        <p className="text-xs text-gray-500">
          La comisión se calcula sobre la <strong>utilidad neta</strong> del servicio:<br/>
          <code className="bg-gray-100 px-1 rounded text-xs">Utilidad = Precio base − Costo repuestos − Mano de obra del servicio</code>
        </p>

        {/* % por tipo de reparación */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">% de comisión por tipo de reparación</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TIPOS_COMISION.map(t => (
              <div key={t.key} className="space-y-0.5">
                <label className="text-xs text-gray-500">{t.label}</label>
                <div className="flex items-center gap-1">
                  <input type="number" min={0} max={100} step={0.5}
                    value={comisiones[t.key as keyof typeof comisiones] as number}
                    onChange={e => setCom(t.key as keyof typeof comisiones, parseFloat(e.target.value) || 0)}
                    className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  <span className="text-xs text-gray-400 shrink-0">%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Comisión por repuestos */}
        <div className="border-t pt-4 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={comisiones.gana_comision_repuestos}
              onChange={e => setCom('gana_comision_repuestos', e.target.checked)}
              className="w-4 h-4 rounded" />
            <div>
              <p className="text-sm font-medium text-gray-800">¿Gana comisión por utilidad de repuestos?</p>
              <p className="text-xs text-gray-400">Aplica sobre (precio venta repuesto − precio costo) × cantidad</p>
            </div>
          </label>
          {comisiones.gana_comision_repuestos && (
            <div className="flex items-center gap-2 ml-7">
              <input type="number" min={0} max={100} step={0.5}
                value={comisiones.comision_repuestos_pct}
                onChange={e => setCom('comision_repuestos_pct', parseFloat(e.target.value) || 0)}
                className="w-24 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              <span className="text-sm text-gray-500">% sobre utilidad de repuestos</span>
            </div>
          )}
        </div>

        {/* Ajuste por método de pago */}
        <div className="border-t pt-4 space-y-2">
          <p className="text-sm font-medium text-gray-700">Ajuste adicional por método de pago</p>
          <p className="text-xs text-gray-400">Se suma (o resta si es negativo) al % base según el método de cobro</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5">
              <label className="text-xs text-gray-500">Efectivo / Presupuesto</label>
              <div className="flex items-center gap-1">
                <input type="number" min={-100} max={100} step={0.5}
                  value={comisiones.comision_efectivo_add}
                  onChange={e => setCom('comision_efectivo_add', parseFloat(e.target.value) || 0)}
                  className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <span className="text-xs text-gray-400 shrink-0">%</span>
              </div>
            </div>
            <div className="space-y-0.5">
              <label className="text-xs text-gray-500">Transferencia</label>
              <div className="flex items-center gap-1">
                <input type="number" min={-100} max={100} step={0.5}
                  value={comisiones.comision_transferencia_add}
                  onChange={e => setCom('comision_transferencia_add', parseFloat(e.target.value) || 0)}
                  className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <span className="text-xs text-gray-400 shrink-0">%</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 italic">Débito y Crédito usan el % base sin ajuste (ya tienen costo de comisión bancaria)</p>
        </div>
      </div>

      <div className="flex gap-3 pb-20 md:pb-0">
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar cambios'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
      </div>
    </form>
  )
}
