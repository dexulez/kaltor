'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'

const PLANES = [
  { slug: 'basico',              nombre: 'Básico',              precio: 14990,  desc: '1 usuario · Inventario, Compras, Ventas' },
  { slug: 'pro',                 nombre: 'Pro',                 precio: 23990,  desc: 'Multiusuario · + Informes, RRHH, Contabilidad, Manuales' },
  { slug: 'taller-basico',       nombre: 'Taller Básico',       precio: 19990,  desc: '1 usuario · + Módulo Taller' },
  { slug: 'taller-basico-5u',    nombre: 'Taller Básico 5U',    precio: 29990,  desc: 'Hasta 5 usuarios · + Módulo Taller' },
  { slug: 'taller-multiusuario', nombre: 'Taller Multiusuario', precio: 36990,  desc: 'Ilimitado · + Módulo Taller' },
  { slug: 'taller-pro',          nombre: 'Taller Pro',          precio: 44990,  desc: 'Multiusuario · Taller + Informes, RRHH, Contabilidad, Manuales' },
  { slug: 'taller-multi-tienda', nombre: 'Taller Multi-tienda', precio: 84990,  desc: 'Multi-sucursal · Todos los módulos + B2B Wholesale' },
]

function clp(n: number) {
  return '$' + n.toLocaleString('es-CL')
}

export default function RegistroPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nombre_negocio:     '',
    nombre_usuario:     '',
    email:              '',
    password:           '',
    confirmar_password: '',
    plan_slug:          'taller-basico',
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
      const res = await fetch('/api/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_negocio: form.nombre_negocio,
          nombre_usuario: form.nombre_usuario,
          email:          form.email,
          password:       form.password,
          plan_slug:      form.plan_slug,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Error al crear la cuenta')
        setLoading(false)
        return
      }

      toast.success('¡Cuenta creada! Ingresa con tus credenciales.')
      router.push('/login')
    } catch {
      toast.error('Error de conexión. Intenta nuevamente.')
      setLoading(false)
    }
  }

  const planSeleccionado = PLANES.find(p => p.slug === form.plan_slug)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4 py-10">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/kaltor-logo.svg" alt="Kaltor" className="h-12 mx-auto mb-3" />
          <p className="text-gray-500 mt-1">14 días de prueba gratis · Sin tarjeta de crédito</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Crear cuenta</CardTitle>
            <CardDescription>Configura tu negocio en minutos</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Nombre del negocio */}
              <div className="space-y-1.5">
                <Label htmlFor="nombre_negocio">
                  Nombre del negocio <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nombre_negocio"
                  value={form.nombre_negocio}
                  onChange={e => set('nombre_negocio', e.target.value)}
                  placeholder="Mi Taller SpA"
                  required
                />
              </div>

              {/* Nombre del usuario */}
              <div className="space-y-1.5">
                <Label htmlFor="nombre_usuario">
                  Tu nombre completo <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nombre_usuario"
                  value={form.nombre_usuario}
                  onChange={e => set('nombre_usuario', e.target.value)}
                  placeholder="Juan Pérez"
                  required
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email">
                  Correo electrónico <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  placeholder="juan@minegocio.cl"
                  required
                  autoComplete="email"
                />
              </div>

              {/* Contraseñas */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="password">
                    Contraseña <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={form.password}
                    onChange={e => set('password', e.target.value)}
                    placeholder="Mín. 8 caracteres"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmar_password">
                    Confirmar <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="confirmar_password"
                    type="password"
                    value={form.confirmar_password}
                    onChange={e => set('confirmar_password', e.target.value)}
                    placeholder="Repite la contraseña"
                    required
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {/* Plan */}
              <div className="space-y-1.5">
                <Label htmlFor="plan">
                  Plan <span className="text-red-500">*</span>
                </Label>
                <select
                  id="plan"
                  className="w-full h-9 px-3 py-1 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.plan_slug}
                  onChange={e => set('plan_slug', e.target.value)}
                >
                  {PLANES.map(p => (
                    <option key={p.slug} value={p.slug}>
                      {p.nombre} — {clp(p.precio)} + IVA/mes
                    </option>
                  ))}
                </select>
                {planSeleccionado && (
                  <p className="text-xs text-gray-500 pl-0.5">{planSeleccionado.desc}</p>
                )}
              </div>

              {/* Trial notice */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-700">
                Los primeros <strong>14 días son gratis</strong>. No se cobra nada hasta que el período de prueba termine.
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? 'Creando cuenta...' : 'Crear cuenta gratis →'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-500 mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-blue-600 hover:underline font-medium">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
