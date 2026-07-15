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
import { formatRut, validarRut } from '@/lib/calculations'

interface Props {
  cliente?: Customer
  returnTo?: string
  puedeOtorgarCredito?: boolean
}

export default function ClienteForm({ cliente, returnTo, puedeOtorgarCredito = false }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [esRutChileno, setEsRutChileno] = useState(false)

  const [form, setForm] = useState({
    nombre: cliente?.nombre ?? '',
    telefono: cliente?.telefono ?? '',
    email: cliente?.email ?? '',
    rut: cliente?.rut ?? '',
    direccion: cliente?.direccion ?? '',
    notas: cliente?.notas ?? '',
  })
  const [permiteCredito, setPermiteCredito] = useState(cliente?.permite_credito ?? false)
  const [limiteCredito, setLimiteCredito] = useState(String(cliente?.limite_credito ?? ''))

  function handleRutChange(value: string) {
    setForm(f => ({ ...f, rut: esRutChileno ? formatRut(value) : value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.rut.trim()) {
      toast.error('El RUT/CÉDULA/DNI es obligatorio')
      return
    }
    if (esRutChileno && !validarRut(form.rut)) {
      toast.error('El RUT chileno ingresado no es válido — revisa el dígito verificador')
      return
    }
    setLoading(true)

    const payload: Record<string, unknown> = {
      nombre: form.nombre.trim(),
      telefono: form.telefono.trim(),
      email: form.email.trim() || null,
      rut: form.rut.trim() || null,
      direccion: form.direccion.trim() || null,
      notas: form.notas.trim() || null,
    }

    if (puedeOtorgarCredito) {
      payload.permite_credito = permiteCredito
      payload.limite_credito = permiteCredito ? (parseInt(limiteCredito) || 0) : 0
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
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="rut">RUT/CÉDULA/DNI <span className="text-red-500">*</span></Label>
            <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer shrink-0">
              <input type="checkbox" checked={esRutChileno} onChange={e => setEsRutChileno(e.target.checked)} />
              Validar como RUT chileno
            </label>
          </div>
          <Input
            id="rut"
            value={form.rut}
            onChange={e => handleRutChange(e.target.value)}
            placeholder={esRutChileno ? '12345678-9' : 'RUT, pasaporte o cédula extranjera'}
            inputMode={esRutChileno ? 'numeric' : 'text'}
          />
          <p className="text-xs text-gray-400">
            {esRutChileno ? 'Se formatea y valida el dígito verificador chileno.' : 'Acepta cualquier formato: RUT, pasaporte, cédula extranjera'}
          </p>
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

        {puedeOtorgarCredito && (
          <div className="sm:col-span-2 bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={permiteCredito}
                onChange={e => setPermiteCredito(e.target.checked)}
                className="w-4 h-4 accent-amber-600"
              />
              <span className="text-sm font-semibold text-amber-800">💳 Habilitar fiado (crédito a cliente)</span>
            </label>
            {permiteCredito && (
              <div className="space-y-1.5">
                <Label htmlFor="limite_credito">Límite de crédito (CLP)</Label>
                <Input
                  id="limite_credito"
                  type="number"
                  min={0}
                  value={limiteCredito}
                  onChange={e => setLimiteCredito(e.target.value)}
                  placeholder="Ej: 100000"
                />
                {cliente && (cliente.saldo_deudor ?? 0) > 0 && (
                  <p className="text-xs text-amber-700">
                    Deuda actual: ${cliente.saldo_deudor.toLocaleString('es-CL')}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
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
