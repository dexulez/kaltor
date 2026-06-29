'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import InvitarCompradorDialog from '@/components/usuarios/InvitarCompradorDialog'

interface Solicitud {
  id: string
  nombre_taller: string
  rut: string | null
  contacto_nombre: string | null
  email: string
  telefono: string
  mensaje: string | null
  created_at: string
}

export default function SolicitudesB2BPanel({ solicitudes, rolCompradorId }: { solicitudes: Solicitud[]; rolCompradorId: string | null }) {
  const router = useRouter()
  const supabase = createClient()
  const [procesando, setProcesando] = useState<string | null>(null)

  async function marcarEstado(id: string, estado: 'aprobada' | 'rechazada', motivo?: string) {
    setProcesando(id)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('b2b_access_requests').update({
      estado,
      motivo_rechazo: motivo ?? null,
      revisado_por: user?.id ?? null,
      revisado_at: new Date().toISOString(),
    }).eq('id', id)
    setProcesando(null)
    if (error) { toast.error('Error al actualizar la solicitud'); return }
    router.refresh()
  }

  function rechazar(id: string) {
    const motivo = window.prompt('Motivo del rechazo (opcional):') ?? undefined
    marcarEstado(id, 'rechazada', motivo?.trim() || undefined)
  }

  if (solicitudes.length === 0) return null

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="bg-teal-50 border-b border-teal-100 px-4 py-3">
        <p className="font-semibold text-teal-800 text-sm">🏪 Solicitudes de acceso B2B pendientes ({solicitudes.length})</p>
        <p className="text-xs text-teal-600 mt-0.5">Negocios que pidieron acceso al catálogo mayorista desde la página pública</p>
      </div>
      <div className="divide-y">
        {solicitudes.map(s => (
          <div key={s.id} className="px-4 py-3 flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="font-medium text-gray-900">{s.nombre_taller} {s.rut && <span className="text-gray-400 text-xs font-normal">· {s.rut}</span>}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {s.contacto_nombre && <>{s.contacto_nombre} · </>}{s.email} · {s.telefono}
              </p>
              {s.mensaje && <p className="text-xs text-gray-400 mt-1 italic">&ldquo;{s.mensaje}&rdquo;</p>}
              <p className="text-[10px] text-gray-400 mt-1">{new Date(s.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <InvitarCompradorDialog
                rolId={rolCompradorId}
                defaultNombre={s.nombre_taller}
                defaultEmail={s.email}
                defaultTelefono={s.telefono}
                onInvitado={() => marcarEstado(s.id, 'aprobada')}
                trigger={
                  <span className="inline-flex items-center justify-center rounded-md bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-3 py-1.5 transition-colors">
                    ✓ Aprobar y crear cuenta
                  </span>
                }
              />
              <button
                type="button"
                disabled={procesando === s.id}
                onClick={() => rechazar(s.id)}
                className="text-xs border border-red-200 text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                ✕ Rechazar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
