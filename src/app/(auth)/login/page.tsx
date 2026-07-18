'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const motivo = new URLSearchParams(window.location.search).get('motivo')
    if (motivo === 'sesion_reemplazada') {
      toast.info('Tu sesión se cerró porque iniciaste sesión en otro dispositivo (máx. 1 celular/tablet + 1 computador a la vez).')
    }
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast.error('Credenciales incorrectas. Verifica tu email y contraseña.')
      setLoading(false)
      return
    }

    // Registra este dispositivo como la sesión vigente de su tipo (móvil/computador)
    await fetch('/api/auth/registrar-sesion', { method: 'POST' })

    // Si el usuario pertenece a más de una empresa, se le pide elegir con cuál entrar
    const res = await fetch('/api/auth/mis-empresas')
    const { empresas } = res.ok ? await res.json() : { empresas: [] }

    let destino = (empresas?.length ?? 0) > 1 ? '/seleccionar-empresa' : '/dashboard'

    // Sin ninguna tienda: puede ser un vendedor externo, no un dueño de tienda
    if ((empresas?.length ?? 0) === 0) {
      const vendedorRes = await fetch('/api/vendedores/mi-estado')
      const { esVendedor } = vendedorRes.ok ? await vendedorRes.json() : { esVendedor: false }
      if (esVendedor) destino = '/panel-vendedor'
    }

    router.push(destino)
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F6F4] p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/kaltor-logo.svg" alt="Kaltor" className="h-12 mx-auto mb-3" />
          <p className="text-gray-500 mt-1">Sistema de gestión para tu negocio</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Iniciar sesión</CardTitle>
            <CardDescription>Ingresa tus credenciales para acceder al sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@ejemplo.cl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full bg-[#FF7A1A] hover:bg-[#E06010] text-white" disabled={loading}>
                {loading ? 'Ingresando...' : 'Ingresar'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-500 mt-6">
          ¿Nuevo en Kaltor?{' '}
          <a href="/registro" className="text-[#FF7A1A] hover:underline font-medium">
            Crear cuenta gratis
          </a>
        </p>
        <p className="text-center text-sm text-gray-500 mt-2">
          ¿Quieres ser vendedor?{' '}
          <a href="/quiero-ser-vendedor" className="text-[#FF7A1A] hover:underline font-medium">
            Postula aquí
          </a>
        </p>
      </div>
    </div>
  )
}
