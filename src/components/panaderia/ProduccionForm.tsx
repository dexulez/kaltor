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
import { UNIDAD_MEDIDA_LABEL } from '@/lib/calculations'
import { UnidadMedida } from '@/types'

interface IngredienteReceta {
  ingrediente_producto_id: string
  cantidad: number
  products: { id: string; nombre: string; unidad_medida: UnidadMedida; stock_actual: number; precio_costo: number } | null
}

interface RecetaConProducto {
  id: string
  producto_id: string
  rendimiento_cantidad: number
  rendimiento_unidad: string
  products: { id: string; nombre: string; unidad_medida: UnidadMedida; stock_actual: number } | null
  receta_ingredientes: IngredienteReceta[]
}

interface Props {
  recetas: RecetaConProducto[]
}

export default function ProduccionForm({ recetas }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [recetaId, setRecetaId] = useState('')
  const [multiplicador, setMultiplicador] = useState('1')
  const [notas, setNotas] = useState('')

  const receta = recetas.find(r => r.id === recetaId)
  const mult = parseFloat(multiplicador) || 0
  const cantidadProducida = receta ? receta.rendimiento_cantidad * mult : 0

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!receta) { toast.error('Selecciona un producto con receta'); return }
    if (mult <= 0) { toast.error('Ingresa un multiplicador válido'); return }

    setLoading(true)
    const { error } = await supabase.rpc('registrar_produccion', {
      p_producto_id: receta.producto_id,
      p_receta_id: receta.id,
      p_multiplicador: mult,
      p_notas: notas.trim() || null,
    })

    if (error) {
      toast.error('No se pudo registrar la producción: ' + error.message)
      setLoading(false)
      return
    }

    toast.success(`Producción registrada: ${cantidadProducida} ${receta.products?.unidad_medida ?? ''} de ${receta.products?.nombre}`)
    router.push('/panaderia/produccion')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Producto a producir</h2>

        {recetas.length === 0 ? (
          <p className="text-sm text-amber-600">No hay productos con receta definida. Crea una receta primero en Panadería → Recetas.</p>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label>Producto</Label>
              <Select value={recetaId} onValueChange={v => setRecetaId(v ?? '')}>
                <SelectTrigger>
                  <span className="truncate text-sm text-left">
                    {receta ? receta.products?.nombre : 'Seleccionar producto...'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {recetas.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.products?.nombre ?? 'Producto'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {receta && (
              <>
                <div className="space-y-1.5">
                  <Label>Multiplicador (cuántas veces la receta base)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={multiplicador}
                    onChange={e => setMultiplicador(e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))}
                    placeholder="Ej: 2"
                  />
                  <p className="text-xs text-gray-400">
                    La receta rinde {receta.rendimiento_cantidad} {receta.rendimiento_unidad} → producirás {cantidadProducida} {receta.products?.unidad_medida ?? receta.rendimiento_unidad}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label>Notas (opcional)</Label>
                  <Textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} placeholder="Observaciones de esta producción..." />
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Ingredientes que se descontarán</p>
                  {receta.receta_ingredientes.map(ri => {
                    const consumo = ri.cantidad * mult
                    const stockActual = ri.products?.stock_actual ?? 0
                    const insuficiente = stockActual < consumo
                    return (
                      <div key={ri.ingrediente_producto_id} className={`flex items-center justify-between text-sm rounded-lg px-3 py-2 ${insuficiente ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'}`}>
                        <span>{ri.products?.nombre ?? 'Ingrediente'}</span>
                        <span className="font-medium">
                          {consumo} {ri.products ? UNIDAD_MEDIDA_LABEL[ri.products.unidad_medida] : ''}
                          {insuficiente && <span className="ml-2 text-xs">⚠ stock: {stockActual}</span>}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <div className="flex gap-3 pb-20 md:pb-0">
        <Button type="submit" className="bg-orange-600 hover:bg-orange-700" disabled={loading || !receta || mult <= 0}>
          {loading ? 'Registrando...' : 'Registrar producción'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
      </div>
    </form>
  )
}
