'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'

interface Empresa {
  id: string
  nombre: string
  slug: string
  plans?: { nombre?: string } | { nombre?: string }[] | null
}

function nombrePlan(empresa: Empresa) {
  const p = empresa.plans
  return (Array.isArray(p) ? p[0]?.nombre : p?.nombre) ?? null
}

export default function SeleccionarEmpresaPage() {
  const router = useRouter()
  const [empresas, setEmpresas] = useState<Empresa[] | null>(null)
  const [entrando, setEntrando] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/mis-empresas')
      .then(res => res.json())
      .then(data => {
        const lista: Empresa[] = data.empresas ?? []
        if (lista.length <= 1) {
          router.replace('/dashboard')
          return
        }
        setEmpresas(lista)
      })
      .catch(() => toast.error('Error al cargar tus empresas'))
  }, [router])

  async function elegir(empresaId: string) {
    setEntrando(empresaId)
    const res = await fetch('/api/auth/seleccionar-empresa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ store_id: empresaId }),
    })
    if (!res.ok) {
      const err = await res.json()
      toast.error(err.error ?? 'No se pudo cambiar de empresa')
      setEntrando(null)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F6F4] p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/kaltor-logo.svg" alt="Kaltor" className="h-12 mx-auto mb-3" />
          <p className="text-gray-500 mt-1">Tu cuenta pertenece a varias empresas</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Elige con cuál entrar</CardTitle>
            <CardDescription>Puedes cambiar de empresa más adelante desde el menú</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {empresas === null && (
              <p className="text-sm text-gray-400 text-center py-6">Cargando…</p>
            )}
            {empresas?.map(empresa => (
              <button
                key={empresa.id}
                onClick={() => elegir(empresa.id)}
                disabled={entrando !== null}
                className="w-full text-left border rounded-xl p-4 hover:border-[#FF7A1A] hover:bg-orange-50/50 transition-colors disabled:opacity-50"
              >
                <p className="font-medium text-gray-800">{empresa.nombre}</p>
                {nombrePlan(empresa) && (
                  <p className="text-xs text-gray-400 mt-0.5">Plan {nombrePlan(empresa)}</p>
                )}
                {entrando === empresa.id && (
                  <p className="text-xs text-[#FF7A1A] mt-1">Entrando…</p>
                )}
              </button>
            ))}
          </CardContent>
        </Card>

        <Button
          variant="ghost"
          className="w-full mt-4 text-gray-400"
          onClick={async () => {
            const { createClient } = await import('@/lib/supabase/client')
            await createClient().auth.signOut()
            router.push('/login')
          }}
        >
          Cerrar sesión
        </Button>
      </div>
    </div>
  )
}
