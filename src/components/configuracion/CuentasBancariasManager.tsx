'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRouter } from 'next/navigation'

const BANCOS = [
  'Banco de Chile', 'Banco Santander', 'BancoEstado', 'Scotiabank',
  'BCI', 'Itaú', 'Falabella', 'Ripley', 'Security', 'BICE',
  'Consorcio', 'Coopeuch', 'Mercado Pago', 'Otro',
]

const TIPOS = [
  { value: 'corriente',     label: 'Cuenta corriente' },
  { value: 'vista',         label: 'Cuenta vista / RUT' },
  { value: 'ahorro',        label: 'Cuenta de ahorro' },
  { value: 'rut',           label: 'Cuenta RUT' },
  { value: 'digital',       label: 'Cuenta digital' },
]

export interface CuentaBancaria {
  id: string
  banco: string
  tipo_cuenta: string
  numero: string
  titular: string
  rut_titular: string | null
  email: string | null
  activa: boolean
  es_publica: boolean
  orden: number
}

interface Props {
  cuentasIniciales: CuentaBancaria[]
}

const empty = { banco: 'Banco de Chile', tipo_cuenta: 'corriente', numero: '', titular: '', rut_titular: '', email: '', es_publica: true }

export default function CuentasBancariasManager({ cuentasIniciales }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>(cuentasIniciales)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(empty)

  async function guardar() {
    if (!form.numero.trim()) { toast.error('Ingresa el número de cuenta'); return }
    if (!form.titular.trim()) { toast.error('Ingresa el nombre del titular'); return }
    setSaving(true)
    const { data, error } = await supabase.from('cuentas_bancarias').insert({
      banco: form.banco,
      tipo_cuenta: form.tipo_cuenta,
      numero: form.numero.trim(),
      titular: form.titular.trim(),
      rut_titular: form.rut_titular.trim() || null,
      email: form.email.trim() || null,
      es_publica: form.es_publica,
      activa: true,
      orden: cuentas.length,
    }).select().single()
    if (error) { toast.error('Error: ' + error.message); setSaving(false); return }
    toast.success('Cuenta agregada')
    setCuentas(prev => [...prev, data as CuentaBancaria])
    setForm(empty)
    setAdding(false)
    setSaving(false)
    router.refresh()
  }

  async function toggleActiva(id: string, activa: boolean) {
    await supabase.from('cuentas_bancarias').update({ activa: !activa }).eq('id', id)
    setCuentas(prev => prev.map(c => c.id === id ? { ...c, activa: !activa } : c))
    toast.success(activa ? 'Cuenta desactivada' : 'Cuenta activada')
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar esta cuenta?')) return
    await supabase.from('cuentas_bancarias').delete().eq('id', id)
    setCuentas(prev => prev.filter(c => c.id !== id))
    toast.success('Cuenta eliminada')
  }

  return (
    <div className="space-y-4">
      {/* Lista de cuentas */}
      {cuentas.length === 0 && !adding && (
        <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
          <p className="text-gray-500 text-sm">No hay cuentas bancarias configuradas</p>
          <p className="text-xs text-gray-400 mt-1">Agrega las cuentas donde tus clientes pueden hacerte transferencias</p>
        </div>
      )}

      <div className="space-y-3">
        {cuentas.map(c => (
          <div key={c.id} className={`bg-white rounded-xl border p-4 flex items-start justify-between gap-4 ${!c.activa ? 'opacity-60' : ''}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-gray-800">{c.banco}</p>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {TIPOS.find(t => t.value === c.tipo_cuenta)?.label ?? c.tipo_cuenta}
                </span>
                {c.es_publica && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Visible clientes</span>}
                {!c.activa && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Inactiva</span>}
              </div>
              <p className="font-mono text-sm text-gray-700 mt-1">N° {c.numero}</p>
              <p className="text-sm text-gray-600">{c.titular}{c.rut_titular ? ` · RUT ${c.rut_titular}` : ''}</p>
              {c.email && <p className="text-xs text-gray-400">{c.email}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => toggleActiva(c.id, c.activa)}
                className={`text-xs px-2 py-1 rounded-lg border font-medium transition-colors ${c.activa ? 'text-gray-600 border-gray-300 hover:bg-gray-100' : 'text-green-700 border-green-300 hover:bg-green-50'}`}>
                {c.activa ? 'Desactivar' : 'Activar'}
              </button>
              <button onClick={() => eliminar(c.id)} className="text-red-400 hover:text-red-600 text-sm w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50">✕</button>
            </div>
          </div>
        ))}
      </div>

      {/* Formulario nueva cuenta */}
      {adding ? (
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <h3 className="font-semibold text-gray-800">Nueva cuenta bancaria</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Banco</Label>
              <Select value={form.banco} onValueChange={v => setForm(f => ({ ...f, banco: v ?? f.banco }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BANCOS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tipo de cuenta</Label>
              <Select value={form.tipo_cuenta} onValueChange={v => setForm(f => ({ ...f, tipo_cuenta: v ?? f.tipo_cuenta }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Número de cuenta <span className="text-red-500">*</span></Label>
              <Input value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} placeholder="12345678" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Titular <span className="text-red-500">*</span></Label>
              <Input value={form.titular} onChange={e => setForm(f => ({ ...f, titular: e.target.value }))} placeholder="Servitec SpA" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">RUT titular</Label>
              <Input value={form.rut_titular} onChange={e => setForm(f => ({ ...f, rut_titular: e.target.value }))} placeholder="76.123.456-7" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email (para transferencias por email)</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="pagos@servitec.cl" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.es_publica} onChange={e => setForm(f => ({ ...f, es_publica: e.target.checked }))} className="rounded" />
            <span>Mostrar en el enlace público de pagos</span>
          </label>
          <div className="flex gap-2">
            <Button onClick={guardar} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? 'Guardando...' : 'Guardar cuenta'}
            </Button>
            <Button variant="outline" onClick={() => setAdding(false)}>Cancelar</Button>
          </div>
        </div>
      ) : (
        <Button onClick={() => setAdding(true)} variant="outline" className="border-dashed border-blue-300 text-blue-600 hover:bg-blue-50">
          + Agregar cuenta bancaria
        </Button>
      )}
    </div>
  )
}
