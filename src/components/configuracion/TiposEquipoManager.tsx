'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TIPOS_EQUIPO, sugerirIcono } from '@/lib/tipoEquipo'
import { useTiposEquipo } from '@/hooks/useTiposEquipo'

export default function TiposEquipoManager() {
  const { tipos, setTipos, loading } = useTiposEquipo()
  const [showForm, setShowForm] = useState(false)
  const [nombre, setNombre] = useState('')
  const [icono, setIcono] = useState('')
  const [iconoTocado, setIconoTocado] = useState(false)
  const [template, setTemplate] = useState('otro')
  const [saving, setSaving] = useState(false)
  const [eliminando, setEliminando] = useState<string | null>(null)

  const iconoActual = iconoTocado ? icono : sugerirIcono(nombre)

  function handleNombreChange(v: string) {
    setNombre(v)
    if (!iconoTocado) setIcono(sugerirIcono(v))
  }

  function resetForm() {
    setNombre(''); setIcono(''); setIconoTocado(false); setTemplate('otro'); setShowForm(false)
  }

  async function agregar() {
    if (!nombre.trim()) { toast.error('El nombre es obligatorio'); return }
    setSaving(true)
    const res = await fetch('/api/equipment-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: nombre.trim(), icon: iconoActual, template }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { toast.error(data.error ?? 'Error al agregar el tipo'); return }
    setTipos(prev => [...prev, data.tipo])
    toast.success('Tipo de equipo agregado')
    resetForm()
  }

  async function eliminar(id: string) {
    setEliminando(id)
    const res = await fetch(`/api/equipment-types/${id}`, { method: 'DELETE' })
    setEliminando(null)
    if (!res.ok) { const data = await res.json(); toast.error(data.error ?? 'Error al eliminar'); return }
    setTipos(prev => prev.filter(t => t.id !== id))
    toast.success('Tipo de equipo eliminado')
  }

  if (loading) return <p className="text-sm text-gray-400">Cargando tipos de equipo...</p>

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {tipos.map(t => (
          <div key={t.id}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border bg-gray-50 text-sm font-medium">
            <span className="text-base shrink-0">{t.icon}</span>
            <span className="flex-1 truncate">{t.label}</span>
            <button
              type="button"
              onClick={() => eliminar(t.id)}
              disabled={eliminando === t.id}
              className="text-gray-300 hover:text-red-500 shrink-0 disabled:opacity-50"
              title="Eliminar tipo"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {showForm ? (
        <div className="bg-white rounded-xl border p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-3 items-end">
            <div className="space-y-1.5 w-20">
              <Label>Ícono</Label>
              <Input
                value={iconoActual}
                onChange={e => { setIcono(e.target.value); setIconoTocado(true) }}
                className="text-center text-lg"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nombre del tipo de equipo</Label>
              <Input
                value={nombre}
                onChange={e => handleNombreChange(e.target.value)}
                placeholder="Ej: Dron, Monitor, Router..."
                autoFocus
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Hereda accesorios y condición de</Label>
            <Select value={template} onValueChange={v => setTemplate(v ?? 'otro')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPOS_EQUIPO.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-400">
              Define qué accesorios y campos de condición física se piden al recibir este tipo de equipo.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={agregar} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? 'Guardando...' : 'Guardar tipo'}
            </Button>
            <Button variant="outline" onClick={resetForm}>Cancelar</Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setShowForm(true)}>+ Agregar tipo de equipo</Button>
      )}
    </div>
  )
}
