'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

export default function InvitarCompradorDialog({ rolId }: { rolId: string | null }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')

  async function handleInvitar(e: React.FormEvent) {
    e.preventDefault()
    if (!rolId) { toast.error('No existe el rol "comprador_externo". Ejecuta la migración SQL primero.'); return }
    setLoading(true)
    const res = await fetch('/api/admin/invitar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, nombre, telefono, rol_id: rolId, vincular_cliente: true }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? 'Error al invitar comprador')
    } else {
      toast.success(`Invitación enviada a ${email}`)
      setOpen(false)
      setEmail(''); setNombre(''); setTelefono('')
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center rounded-md bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium px-4 py-2 transition-colors">
        + Invitar comprador externo
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invitar comprador externo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleInvitar} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Nombre / Taller <span className="text-red-500">*</span></Label>
            <Input value={nombre} onChange={e => setNombre(e.target.value)} required placeholder="Ej: MULTIPHONE" />
          </div>
          <div className="space-y-1.5">
            <Label>Correo electrónico <span className="text-red-500">*</span></Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="contacto@multiphone.cl" />
          </div>
          <div className="space-y-1.5">
            <Label>Teléfono <span className="text-red-500">*</span></Label>
            <Input value={telefono} onChange={e => setTelefono(e.target.value)} required placeholder="+56 9 1234 5678" />
          </div>
          <p className="text-xs text-gray-500">
            Se enviará un email de invitación. Esta cuenta solo podrá ver el catálogo B2B y sus propios pedidos —
            no tiene acceso a ningún otro módulo del sistema.
          </p>
          <div className="flex gap-3 pt-1">
            <Button type="submit" className="flex-1 bg-cyan-600 hover:bg-cyan-700" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar invitación'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
