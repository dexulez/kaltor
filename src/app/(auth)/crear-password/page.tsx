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
  const [checkingSession, setCheckingSession] = useState(true)
  const [sessionOk, setSessionOk] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Supabase puede entregar la sesión vía hash fragment (flujo implícito)
    // o ya estar establecida vía PKCE desde /auth/confirm.
    // onAuthStateChange captura ambos casos.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSessionOk(true)
        setCheckingSession(false)
      }
    })

    // También revisar si ya hay sesión activa
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionOk(true)
      }
      setCheckingSession(false)
    })

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (password !== confirmar) {
      toast.error('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    toast.success('¡Contraseña creada! Bienvenido al sistema.')
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
          <h1 className="text-3xl font-bold text-gray-900">TechRepair Pro</h1>
          <p className="text-gray-500 mt-1">Bienvenido al sistema</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Crea tu contraseña</CardTitle>
            <CardDescription>
              Estás a un paso de acceder. Elige una contraseña segura para tu cuenta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {checkingSession ? (
              <div className="text-center py-8 text-gray-400">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm">Verificando invitación...</p>
              </div>
            ) : !sessionOk ? (
              <div className="text-center py-6 space-y-3">
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  El link de invitación ha expirado o ya fue usado.
                </p>
                <p className="text-xs text-gray-400">
                  Pide al administrador que te reenvíe la invitación.
                </p>
                <Button variant="outline" className="w-full" onClick={() => router.push('/login')}>
                  Ir al inicio de sesión
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Nueva contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmar">Confirmar contraseña</Label>
                  <Input
                    id="confirmar"
                    type="password"
                    placeholder="Repite tu contraseña"
                    value={confirmar}
                    onChange={(e) => setConfirmar(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>

                {password && confirmar && password !== confirmar && (
                  <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">
                    Las contraseñas no coinciden
                  </p>
                )}
                {password && confirmar && password === confirmar && (
                  <p className="text-xs text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                    ✓ Las contraseñas coinciden
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={loading || !password || !confirmar}
                >
                  {loading ? 'Guardando...' : 'Crear contraseña y entrar →'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-500 mt-6">
          TechRepair Pro v1.0 — Gestión integral de taller
        </p>
      </div>
    </div>
  )
}
