'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export default function CrearPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loading, setLoading] = useState(false)
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    let resuelto = false

    function resolver(ok: boolean) {
      if (resuelto) return
      resuelto = true
      setEstado(ok ? 'listo' : 'error')
    }

    // Escuchar cambio de auth (cubre flujo implícito con hash fragment)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      resolver(!!session)
    })

    // Verificar sesión existente (cubre PKCE donde la sesión ya está establecida)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) resolver(true)
    })

    // Timeout de 4 segundos: si no hay sesión, mostrar error
    const timer = setTimeout(() => resolver(false), 4000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { toast.error('Mínimo 8 caracteres'); return }
    if (password !== confirmar) { toast.error('Las contraseñas no coinciden'); return }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { toast.error(error.message); setLoading(false); return }

    toast.success('¡Contraseña creada! Bienvenido.')
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <span className="text-3xl">🔧</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Kaltor</h1>
          <p className="text-gray-500 mt-1">Bienvenido al sistema</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Crea tu contraseña</CardTitle>
            <CardDescription>Elige una contraseña segura para acceder al sistema.</CardDescription>
          </CardHeader>
          <CardContent>
            {estado === 'cargando' && (
              <div className="text-center py-8 text-gray-400">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm">Verificando invitación...</p>
              </div>
            )}

            {estado === 'error' && (
              <div className="space-y-4">
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  El link expiró o ya fue usado. Pide al administrador que reenvíe la invitación.
                </p>
                <Button variant="outline" className="w-full" onClick={() => router.push('/login')}>
                  Ir al inicio de sesión
                </Button>
              </div>
            )}

            {estado === 'listo' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nueva contraseña</Label>
                  <Input type="password" placeholder="Mínimo 8 caracteres" value={password}
                    onChange={e => setPassword(e.target.value)} required autoComplete="new-password" autoFocus />
                </div>
                <div className="space-y-2">
                  <Label>Confirmar contraseña</Label>
                  <Input type="password" placeholder="Repite tu contraseña" value={confirmar}
                    onChange={e => setConfirmar(e.target.value)} required autoComplete="new-password" />
                </div>
                {password && confirmar && (
                  <p className={`text-xs px-3 py-2 rounded-lg ${password === confirmar ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50'}`}>
                    {password === confirmar ? '✓ Las contraseñas coinciden' : 'Las contraseñas no coinciden'}
                  </p>
                )}
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={loading || !password || !confirmar}>
                  {loading ? 'Guardando...' : 'Crear contraseña y entrar →'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
