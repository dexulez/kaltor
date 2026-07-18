'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'

export default function QuieroSerVendedorPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nombre:             '',
    email:              '',
    password:           '',
    confirmar_password: '',
    telefono:           '',
    rut:                '',
    banco:              '',
    tipo_cuenta:        '',
    numero_cuenta:      '',
    titular_cuenta:     '',
  })

  function set(k: string, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (form.password !== form.confirmar_password) {
      toast.error('Las contraseñas no coinciden')
      return
    }
    if (form.password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/vendedores/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre:         form.nombre,
          email:          form.email,
          password:       form.password,
          telefono:       form.telefono,
          rut:            form.rut,
          banco:          form.banco,
          tipo_cuenta:    form.tipo_cuenta,
          numero_cuenta:  form.numero_cuenta,
          titular_cuenta: form.titular_cuenta,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Error al registrarte como vendedor')
        setLoading(false)
        return
      }

      toast.success('¡Postulación enviada! Te avisaremos cuando sea aprobada.')
      router.push('/login')
    } catch {
      toast.error('Error de conexión. Intenta nuevamente.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F6F4] p-4 py-10">
      <div className="w-full max-w-lg">

        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/kaltor-logo.svg" alt="Kaltor" className="h-12 mx-auto mb-3" />
          <p className="text-gray-500 mt-1">Únete como vendedor externo y gana comisiones recurrentes</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Quiero ser vendedor</CardTitle>
            <CardDescription>
              Postula, te aprobamos y podrás invitar clientes con tu propio código de descuento.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">

              <div className="space-y-1.5">
                <Label htmlFor="nombre">
                  Nombre completo <span className="text-red-500">*</span>
                </Label>
                <Input id="nombre" value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Juan Pérez" required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">
                  Correo electrónico <span className="text-red-500">*</span>
                </Label>
                <Input id="email" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="juan@correo.cl" required autoComplete="email" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="telefono">Teléfono (WhatsApp)</Label>
                <Input id="telefono" value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="+56 9 1234 5678" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rut">RUT</Label>
                <Input id="rut" value={form.rut} onChange={e => set('rut', e.target.value)} placeholder="12.345.678-9" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="password">
                    Contraseña <span className="text-red-500">*</span>
                  </Label>
                  <Input id="password" type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Mín. 8 caracteres" required minLength={8} autoComplete="new-password" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmar_password">
                    Confirmar <span className="text-red-500">*</span>
                  </Label>
                  <Input id="confirmar_password" type="password" value={form.confirmar_password} onChange={e => set('confirmar_password', e.target.value)} placeholder="Repite la contraseña" required autoComplete="new-password" />
                </div>
              </div>

              <div className="pt-2 border-t">
                <p className="text-sm font-medium text-gray-700 mb-3">Datos bancarios (para pagarte tus comisiones)</p>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="banco">Banco</Label>
                      <Input id="banco" value={form.banco} onChange={e => set('banco', e.target.value)} placeholder="Banco Estado" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="tipo_cuenta">Tipo de cuenta</Label>
                      <Input id="tipo_cuenta" value={form.tipo_cuenta} onChange={e => set('tipo_cuenta', e.target.value)} placeholder="Cuenta vista" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="numero_cuenta">Número de cuenta</Label>
                    <Input id="numero_cuenta" value={form.numero_cuenta} onChange={e => set('numero_cuenta', e.target.value)} placeholder="00123456789" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="titular_cuenta">Titular de la cuenta</Label>
                    <Input id="titular_cuenta" value={form.titular_cuenta} onChange={e => set('titular_cuenta', e.target.value)} placeholder="Nombre del titular" />
                  </div>
                </div>
              </div>

              <div className="bg-[#FF7A1A]/8 border border-[#FF7A1A]/20 rounded-lg px-4 py-3 text-sm text-[#C05010]">
                Tu postulación queda pendiente de aprobación manual. Te avisaremos apenas esté activa.
              </div>

              <Button type="submit" className="w-full bg-[#FF7A1A] hover:bg-[#E06010] text-white" disabled={loading}>
                {loading ? 'Enviando postulación...' : 'Postular ahora →'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-500 mt-6">
          ¿Ya tienes cuenta de vendedor?{' '}
          <a href="/login" className="text-[#FF7A1A] hover:underline font-medium">
            Iniciar sesión
          </a>
        </p>
      </div>
    </div>
  )
}
