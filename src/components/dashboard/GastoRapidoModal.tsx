'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCLP } from '@/lib/calculations'

export const CATEGORIAS_GASTO = [
  { value: 'arriendo',     label: '🏠 Arriendo / Local' },
  { value: 'servicios',    label: '💡 Luz / Agua / Internet' },
  { value: 'sueldos',      label: '👤 Sueldos / Salarios' },
  { value: 'materiales',   label: '🧹 Materiales / Limpieza' },
  { value: 'herramientas', label: '🔧 Herramientas' },
  { value: 'publicidad',   label: '📢 Publicidad / Marketing' },
  { value: 'alimentacion', label: '🍽️ Alimentación' },
  { value: 'transporte',   label: '🚗 Transporte' },
  { value: 'impuestos',    label: '📋 Impuestos / Tributos' },
  { value: 'varios',       label: '📦 Varios' },
]

const METODOS = [
  { value: 'efectivo',       label: 'Efectivo' },
  { value: 'transferencia',  label: 'Transferencia' },
  { value: 'debito',         label: 'Débito' },
  { value: 'credito',        label: 'Crédito' },
  { value: 'cheque',         label: 'Cheque' },
]

interface Props {
  variant?: 'button' | 'link'
}

export default function GastoRapidoModal({ variant = 'button' }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [concepto, setConcepto] = useState('')
  const [monto, setMonto] = useState('')
  const [categoria, setCategoria] = useState('varios')
  const [metodo, setMetodo] = useState('efectivo')
  const [tipoDocumento, setTipoDocumento] = useState<'boleta' | 'factura' | 'sin_documento'>('boleta')
  const [numeroDocumento, setNumeroDocumento] = useState('')
  const [saving, setSaving] = useState(false)

  async function guardar() {
    if (!concepto.trim()) { toast.error('Ingresa el concepto'); return }
    if (!monto || parseInt(monto) <= 0) { toast.error('Ingresa un monto válido'); return }
    setSaving(true)
    const { error } = await supabase.from('gastos').insert({
      concepto: concepto.trim(),
      monto: parseInt(monto),
      categoria,
      metodo_pago: metodo,
      tipo_documento: tipoDocumento === 'sin_documento' ? null : tipoDocumento,
      numero_documento: tipoDocumento !== 'sin_documento' && numeroDocumento.trim() ? numeroDocumento.trim() : null,
      fecha: new Intl.DateTimeFormat('sv', { timeZone: 'America/Santiago' }).format(new Date()),
    })
    if (error) { toast.error('Error: ' + error.message); setSaving(false); return }
    toast.success(`Gasto registrado: ${formatCLP(parseInt(monto))}`)
    setOpen(false); setSaving(false)
    setConcepto(''); setMonto(''); setCategoria('varios'); setMetodo('efectivo'); setTipoDocumento('boleta'); setNumeroDocumento('')
    router.refresh()
  }

  return (
    <>
      {variant === 'button' ? (
        <button type="button" onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 text-sm px-3 py-2 rounded-xl font-medium transition-colors">
          💸 Registrar gasto
        </button>
      ) : (
        <button type="button" onClick={() => setOpen(true)}
          className="text-xs text-red-600 hover:text-red-800 underline underline-offset-2">
          + Registrar gasto
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 mb-4 text-lg">💸 Registrar gasto</h3>
            <div className="space-y-3">
              <div>
                <Label>Concepto</Label>
                <Input value={concepto} onChange={e => setConcepto(e.target.value)} autoFocus
                  placeholder="ej: Pago luz del local" className="mt-1"
                  onKeyDown={e => e.key === 'Enter' && guardar()} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Monto (CLP)</Label>
                  <Input type="number" min={0} value={monto} onChange={e => setMonto(e.target.value)}
                    placeholder="0" className="mt-1" />
                  {monto && parseInt(monto) > 0 && (
                    <p className="text-xs text-red-600 mt-0.5">{formatCLP(parseInt(monto))}</p>
                  )}
                </div>
                <div>
                  <Label>Método</Label>
                  <Select value={metodo} onValueChange={v => setMetodo(v ?? 'efectivo')}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {METODOS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Categoría</Label>
                <Select value={categoria} onValueChange={v => setCategoria(v ?? 'varios')}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS_GASTO.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Documento</Label>
                  <Select value={tipoDocumento} onValueChange={v => setTipoDocumento((v ?? 'boleta') as typeof tipoDocumento)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="boleta">Boleta</SelectItem>
                      <SelectItem value="factura">Factura</SelectItem>
                      <SelectItem value="sin_documento">Sin documento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {tipoDocumento !== 'sin_documento' && (
                  <div>
                    <Label>N° documento</Label>
                    <Input value={numeroDocumento} onChange={e => setNumeroDocumento(e.target.value)}
                      placeholder="Opcional" className="mt-1" />
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={guardar} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar gasto'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
