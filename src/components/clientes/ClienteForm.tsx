'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Customer } from '@/types'

interface Props {
  cliente?: Customer
  returnTo?: string
}

export default function ClienteForm({ cliente, returnTo }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    nombre: cliente?.nombre ?? '',
    telefono: cliente?.telefono ?? '',
    email: cliente?.email ?? '',
    rut: cliente?.rut ?? '',
    direccion: cliente?.direccion ?? '',
    notas: cliente?.notas ?? '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const payload = {
      nombre: form.nombre.trim(),
      telefono: form.telefono.trim(),
      email: form.email.trim() || null,
      rut: form.rut.trim() || null,
      direccion: form.direccion.trim() || null,
      notas: form.notas.trim() || null,
    }

    if (cliente) {
      const { error } = await supabase.from('customers').update(payload).eq('id', cliente.id)
      if (error) {
        toast.error('Error al actualizar el cliente')
        setLoading(false)
        return
      }
      toast.success('Cliente actualizado correctamente')
    } else {
      const { error } = await supabase.from('customers').insert(payload)
      if (error) {
        toast.error('Error al crear el cliente')
        setLoading(false)
        return
      }
      toast.success('Cliente creado correctamente')
    }

    router.push(returnTo ?? '/clientes')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="nombre">Nombre completo <span className="text-red-500">*</span></Label>
          <Input
            id="nombre"
            value={form.nombre}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            placeholder="Juan Pérez González"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="telefono">Teléfono <span className="text-red-500">*</span></Label>
          <Input
            id="telefono"
            value={form.telefono}
            onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
            placeholder="+56 9 1234 5678"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="rut">RUT / DNI</Label>
          <Input
            id="rut"
            value={form.rut}
            onChange={e => setForm(f => ({ ...f, rut: e.target.value }))}
            placeholder="176589-7"
          />
        </div>

        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="correo@ejemplo.com"
          />
        </div>

        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="direccion">Dirección</Label>
          <Input
            id="direccion"
            value={form.direccion}
            onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))}
            placeholder="Av. Principal 123, Santiago"
          />
        </div>

        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="notas">Notas internas</Label>
          <Textarea
            id="notas"
            value={form.notas}
            onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
            placeholder="Observaciones sobre el cliente..."
            rows={3}
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={loading}>
          {loading ? 'Guardando...' : cliente ? 'Actualizar cliente' : 'Crear cliente'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
