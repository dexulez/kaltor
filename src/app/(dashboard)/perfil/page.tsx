'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { formatRut } from '@/lib/calculations'

interface Perfil {
  nombre_completo: string
  telefono: string
  rut: string
  email: string
  rol: string
}

const ROL_LABEL: Record<string, string> = {
  administrador: 'Administrador',
  tecnico: 'Técnico',
  vendedor: 'Vendedor',
  supervisor_ventas: 'Supervisor Ventas',
}

export default function PerfilPage() {
  const supabase = createClient()
  const [perfil, setPerfil] = useState<Perfil>({ nombre_completo: '', telefono: '', rut: '', email: '', rol: '' })
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [pwd, setPwd] = useState('')
  const [pwdConfirm, setPwdConfirm] = useState('')
  const [cambiandoPwd, setCambiandoPwd] = useState(false)

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('user_profiles')
        .select('nombre_completo, telefono, rut, email, roles(nombre)')
        .eq('id', user.id)
        .single()
      if (data) {
        const roles = data.roles as { nombre: string } | { nombre: string }[] | null
        const rolNombre = Array.isArray(roles) ? roles[0]?.nombre : roles?.nombre ?? ''
        setPerfil({
          nombre_completo: data.nombre_completo ?? '',
          telefono: data.telefono ?? '',
          rut: data.rut ?? '',
          email: data.email ?? user.email ?? '',
          rol: rolNombre ?? '',
        })
      }
      setLoading(false)
    }
    cargar()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function guardarPerfil(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('user_profiles').update({
      nombre_completo: perfil.nombre_completo.trim(),
      telefono: perfil.telefono.trim() || null,
      rut: perfil.rut.trim() || null,
    }).eq('id', user.id)
    if (error) toast.error(error.message)
    else toast.success('Perfil actualizado')
    setGuardando(false)
  }

  async function cambiarPassword(e: React.FormEvent) {
    e.preventDefault()
    if (pwd.length < 8) { toast.error('Mínimo 8 caracteres'); return }
    if (pwd !== pwdConfirm) { toast.error('Las contraseñas no coinciden'); return }
    setCambiandoPwd(true)
    const { error } = await supabase.auth.updateUser({ password: pwd })
    if (error) toast.error(error.message)
    else { toast.success('Contraseña actualizada correctamente'); setPwd(''); setPwdConfirm('') }
    setCambiandoPwd(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mi perfil</h1>
        <p className="text-gray-500 text-sm">Administra tus datos personales y contraseña</p>
      </div>

      {/* Info del usuario */}
      <div className="bg-white rounded-xl border p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xl shrink-0">
          {perfil.nombre_completo?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-lg">{perfil.nombre_completo || 'Sin nombre'}</p>
          <p className="text-gray-500 text-sm">{perfil.email}</p>
          <span className="inline-block mt-1 px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
            {ROL_LABEL[perfil.rol] ?? perfil.rol}
          </span>
        </div>
      </div>

      {/* Datos personales */}
      <div className="bg-white rounded-xl border p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Datos personales</h2>
        <form onSubmit={guardarPerfil} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nombre completo</Label>
            <Input
              value={perfil.nombre_completo}
              onChange={e => setPerfil(p => ({ ...p, nombre_completo: e.target.value }))}
              placeholder="Tu nombre completo"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input
                value={perfil.telefono}
                onChange={e => setPerfil(p => ({ ...p, telefono: e.target.value }))}
                placeholder="+56 9 1234 5678"
              />
            </div>
            <div className="space-y-1.5">
              <Label>RUT</Label>
              <Input
                value={perfil.rut}
                onChange={e => setPerfil(p => ({ ...p, rut: formatRut(e.target.value) }))}
                placeholder="12345678-9"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Correo electrónico</Label>
            <Input value={perfil.email} disabled className="bg-gray-50 text-gray-400" />
            <p className="text-xs text-gray-400">El email no se puede cambiar desde aquí</p>
          </div>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </form>
      </div>

      {/* Cambiar contraseña */}
      <div className="bg-white rounded-xl border p-5">
        <h2 className="font-semibold text-gray-800 mb-1">Cambiar contraseña</h2>
        <p className="text-sm text-gray-500 mb-4">Usa esto si recibiste una contraseña temporal o quieres actualizarla.</p>
        <form onSubmit={cambiarPassword} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nueva contraseña</Label>
            <Input type="password" value={pwd} onChange={e => setPwd(e.target.value)}
              placeholder="Mínimo 8 caracteres" autoComplete="new-password" />
          </div>
          <div className="space-y-1.5">
            <Label>Confirmar contraseña</Label>
            <Input type="password" value={pwdConfirm} onChange={e => setPwdConfirm(e.target.value)}
              placeholder="Repite la contraseña" autoComplete="new-password" />
          </div>
          {pwd && pwdConfirm && (
            <p className={`text-xs px-3 py-2 rounded-lg ${pwd === pwdConfirm ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50'}`}>
              {pwd === pwdConfirm ? '✓ Coinciden' : 'No coinciden'}
            </p>
          )}
          <Button type="submit" variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50"
            disabled={cambiandoPwd || !pwd || !pwdConfirm}>
            {cambiandoPwd ? 'Actualizando...' : '🔑 Cambiar contraseña'}
          </Button>
        </form>
      </div>
    </div>
  )
}
