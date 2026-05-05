'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

const ROL_LABEL: Record<string, string> = {
  administrador:     'Administrador',
  tecnico:           'Técnico',
  vendedor:          'Vendedor',
  supervisor_ventas: 'Supervisor Ventas',
}

interface Role { id: string; nombre: string }

export default function InvitarUsuarioDialog({ roles }: { roles: Role[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [nombre, setNombre] = useState('')
  const [rolId, setRolId] = useState('')

  async function handleInvitar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/admin/invitar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, nombre, rol_id: rolId || null }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? 'Error al invitar usuario')
    } else {
      toast.success(`Invitación enviada a ${email}`)
      setOpen(false)
      setEmail(''); setNombre(''); setRolId('')
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 transition-colors">
        + Invitar usuario
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invitar nuevo usuario</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleInvitar} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Nombre completo <span className="text-red-500">*</span></Label>
            <Input value={nombre} onChange={e => setNombre(e.target.value)} required placeholder="Juan García" />
          </div>
          <div className="space-y-1.5">
            <Label>Correo electrónico <span className="text-red-500">*</span></Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="juan@techrepair.cl" />
          </div>
          <div className="space-y-1.5">
            <Label>Rol</Label>
            <Select value={rolId} onValueChange={v => setRolId(v ?? '')}>
              <SelectTrigger>
                <span className="flex-1 text-left truncate text-sm">
                  {rolId
                    ? (ROL_LABEL[roles.find(r => r.id === rolId)?.nombre ?? '']
                      ?? roles.find(r => r.id === rolId)?.nombre
                      ?? rolId)
                    : 'Seleccionar rol...'}
                </span>
              </SelectTrigger>
              <SelectContent>
                {roles.map(r => (
                  <SelectItem key={r.id} value={r.id}>
                    {ROL_LABEL[r.nombre] ?? r.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-gray-500">
            Se enviará un email de invitación. El usuario podrá crear su contraseña al hacer clic en el enlace.
          </p>
          <div className="flex gap-3 pt-1">
            <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar invitación'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
