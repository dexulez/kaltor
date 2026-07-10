'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { formatCLP, UNIDAD_MEDIDA_LABEL } from '@/lib/calculations'
import { Product, Receta, UnidadMedida } from '@/types'

interface IngredienteDisponible {
  id: string
  nombre: string
  unidad_medida: UnidadMedida
  precio_costo: number
}

interface LineaForm {
  ingrediente_producto_id: string
  cantidad: string
}

interface Props {
  producto: Product
  receta?: Receta
  ingredientesDisponibles: IngredienteDisponible[]
}

export default function RecetaForm({ producto, receta, ingredientesDisponibles }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [rendimientoCantidad, setRendimientoCantidad] = useState(String(receta?.rendimiento_cantidad ?? 1))
  const [rendimientoUnidad, setRendimientoUnidad] = useState(receta?.rendimiento_unidad ?? 'unidad')
  const [instrucciones, setInstrucciones] = useState(receta?.instrucciones ?? '')
  const [lineas, setLineas] = useState<LineaForm[]>(
    (receta?.receta_ingredientes ?? []).map(ri => ({
      ingrediente_producto_id: ri.ingrediente_producto_id,
      cantidad: String(ri.cantidad),
    }))
  )

  function agregarLinea() {
    setLineas(prev => [...prev, { ingrediente_producto_id: '', cantidad: '' }])
  }

  function quitarLinea(idx: number) {
    setLineas(prev => prev.filter((_, i) => i !== idx))
  }

  function setLinea(idx: number, campo: keyof LineaForm, valor: string) {
    setLineas(prev => prev.map((l, i) => i === idx ? { ...l, [campo]: valor } : l))
  }

  const costoTotal = lineas.reduce((sum, l) => {
    const ing = ingredientesDisponibles.find(i => i.id === l.ingrediente_producto_id)
    const cant = parseFloat(l.cantidad) || 0
    return sum + (ing ? ing.precio_costo * cant : 0)
  }, 0)
  const rendNum = parseFloat(rendimientoCantidad) || 1
  const costoUnitario = rendNum > 0 ? costoTotal / rendNum : 0

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()

    const lineasValidas = lineas.filter(l => l.ingrediente_producto_id && parseFloat(l.cantidad) > 0)
    if (lineasValidas.length === 0) { toast.error('Agrega al menos un ingrediente con cantidad'); return }

    const idsUsados = new Set<string>()
    for (const l of lineasValidas) {
      if (idsUsados.has(l.ingrediente_producto_id)) {
        toast.error('No puedes repetir el mismo ingrediente en dos líneas'); return
      }
      idsUsados.add(l.ingrediente_producto_id)
    }

    setLoading(true)

    const recetaPayload = {
      producto_id: producto.id,
      rendimiento_cantidad: rendNum,
      rendimiento_unidad: rendimientoUnidad,
      instrucciones: instrucciones.trim() || null,
    }

    const { data: recetaRow, error: recetaError } = await supabase
      .from('recetas')
      .upsert(recetaPayload, { onConflict: 'producto_id' })
      .select('id')
      .single()

    if (recetaError || !recetaRow) {
      toast.error('Error al guardar la receta: ' + (recetaError?.message ?? ''))
      setLoading(false)
      return
    }

    // Reemplazar líneas de ingredientes (delete + insert, bajo volumen por receta)
    const { error: delError } = await supabase.from('receta_ingredientes').delete().eq('receta_id', recetaRow.id)
    if (delError) { toast.error('Error al actualizar ingredientes: ' + delError.message); setLoading(false); return }

    const { error: insError } = await supabase.from('receta_ingredientes').insert(
      lineasValidas.map(l => ({
        receta_id: recetaRow.id,
        ingrediente_producto_id: l.ingrediente_producto_id,
        cantidad: parseFloat(l.cantidad),
      }))
    )
    if (insError) { toast.error('Error al guardar ingredientes: ' + insError.message); setLoading(false); return }

    toast.success('Receta guardada correctamente')
    router.push('/panaderia/recetas')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Rendimiento</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Cantidad que rinde</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={rendimientoCantidad}
              onChange={e => setRendimientoCantidad(e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))}
              placeholder="Ej: 10"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Unidad</Label>
            <Input value={rendimientoUnidad} onChange={e => setRendimientoUnidad(e.target.value)} placeholder="unidades, kg, etc." />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Instrucciones (opcional)</Label>
          <Textarea value={instrucciones} onChange={e => setInstrucciones(e.target.value)} rows={3} placeholder="Pasos de preparación..." />
        </div>
      </div>

      <div className="bg-white rounded-xl border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Ingredientes</h2>
          <Button type="button" variant="outline" size="sm" onClick={agregarLinea}>+ Agregar ingrediente</Button>
        </div>

        {lineas.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Sin ingredientes — agrega el primero</p>
        ) : (
          <div className="space-y-2">
            {lineas.map((linea, idx) => {
              const ing = ingredientesDisponibles.find(i => i.id === linea.ingrediente_producto_id)
              return (
                <div key={idx} className="flex gap-2 items-center">
                  <Select value={linea.ingrediente_producto_id} onValueChange={v => setLinea(idx, 'ingrediente_producto_id', v ?? '')}>
                    <SelectTrigger className="flex-1">
                      <span className="truncate text-sm text-left">
                        {ing ? ing.nombre : 'Seleccionar ingrediente...'}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {ingredientesDisponibles.map(i => (
                        <SelectItem key={i.id} value={i.id}>{i.nombre} ({UNIDAD_MEDIDA_LABEL[i.unidad_medida]})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="text"
                    inputMode="decimal"
                    className="w-28 shrink-0"
                    value={linea.cantidad}
                    onChange={e => setLinea(idx, 'cantidad', e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))}
                    placeholder="Cantidad"
                  />
                  <Button type="button" variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50 shrink-0"
                    onClick={() => quitarLinea(idx)}>✕</Button>
                </div>
              )
            })}
          </div>
        )}

        {lineas.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide">Costo total de la receta</p>
              <p className="font-bold text-gray-800 text-lg">{formatCLP(costoTotal)}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide">Costo por unidad producida</p>
              <p className="font-bold text-gray-800 text-lg">{formatCLP(costoUnitario)}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 pb-20 md:pb-0">
        <Button type="submit" className="bg-orange-600 hover:bg-orange-700" disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar receta'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
      </div>
    </form>
  )
}
