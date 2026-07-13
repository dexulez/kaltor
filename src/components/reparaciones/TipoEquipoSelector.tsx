'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TIPOS_EQUIPO, sugerirIcono } from '@/lib/tipoEquipo'
import IconoPicker from '@/components/configuracion/IconoPicker'
import type { EquipmentType } from '@/types'

export { TIPOS_EQUIPO } from '@/lib/tipoEquipo'
export { labelTipoEquipo } from '@/lib/tipoEquipo'

interface Props {
  value: string
  onChange: (v: string) => void
  tipos: Pick<EquipmentType, 'id' | 'value' | 'label' | 'icon'>[]
  onTipoCreado?: (tipo: EquipmentType) => void
  onTipoEliminado?: (id: string) => void
}

export default function TipoEquipoSelector({ value, onChange, tipos, onTipoCreado, onTipoEliminado }: Props) {
  const [customOpen, setCustomOpen] = useState(false)
  const [custom, setCustom] = useState('')

  const [popupOpen, setPopupOpen] = useState(false)
  const [nombre, setNombre] = useState('')
  const [icono, setIcono] = useState('')
  const [iconoTocado, setIconoTocado] = useState(false)
  const [template, setTemplate] = useState('otro')
  const [creando, setCreando] = useState(false)
  const [eliminando, setEliminando] = useState<string | null>(null)

  const isCustom = value !== '' && !tipos.find(t => t.value === value)
  const iconoActual = iconoTocado ? icono : sugerirIcono(nombre)

  function handleSelect(v: string) {
    if (v === 'otro') {
      setCustomOpen(true)
      onChange('otro')
    } else {
      setCustomOpen(false)
      onChange(v)
    }
  }

  function handleCustom(v: string) {
    setCustom(v)
    onChange(v)
  }

  function handleNombreChange(v: string) {
    setNombre(v)
    if (!iconoTocado) setIcono(sugerirIcono(v))
  }

  function resetPopup() {
    setNombre(''); setIcono(''); setIconoTocado(false); setTemplate('otro'); setPopupOpen(false)
  }

  async function crearTipo() {
    if (!nombre.trim()) { toast.error('El nombre es obligatorio'); return }
    setCreando(true)
    const res = await fetch('/api/equipment-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: nombre.trim(), icon: iconoActual, template }),
    })
    const data = await res.json()
    setCreando(false)
    if (!res.ok) { toast.error(data.error ?? 'Error al crear el tipo'); return }
    onTipoCreado?.(data.tipo)
    onChange(data.tipo.value)
    toast.success('Tipo de equipo creado')
    resetPopup()
  }

  async function eliminarTipo(t: Pick<EquipmentType, 'id' | 'value' | 'label'>) {
    if (!window.confirm(`¿Eliminar el tipo "${t.label}"?`)) return
    setEliminando(t.id)
    const res = await fetch(`/api/equipment-types/${t.id}`, { method: 'DELETE' })
    setEliminando(null)
    if (!res.ok) { const data = await res.json(); toast.error(data.error ?? 'Error al eliminar'); return }
    onTipoEliminado?.(t.id)
    if (value === t.value) onChange('')
    toast.success('Tipo de equipo eliminado')
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1.5">
        {tipos.map(t => (
          <div key={t.id} className="relative">
            <button
              type="button"
              onClick={() => handleSelect(t.value)}
              className={`w-full flex items-center gap-2 pl-3 pr-6 py-2.5 rounded-xl border text-sm font-medium text-left transition-colors leading-tight ${
                value === t.value || (t.value === 'otro' && (customOpen || isCustom))
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-blue-400 active:bg-gray-100'
              }`}
            >
              <span className="text-base shrink-0">{t.icon}</span>
              <span className="truncate">{t.label}</span>
            </button>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); eliminarTipo(t) }}
              disabled={eliminando === t.id}
              title="Eliminar tipo"
              className={`absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] leading-none disabled:opacity-50 ${
                value === t.value || (t.value === 'otro' && (customOpen || isCustom))
                  ? 'text-white/70 hover:text-white hover:bg-white/20'
                  : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
              }`}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      {(customOpen || isCustom) && (
        <Input
          value={isCustom ? value : custom}
          onChange={e => handleCustom(e.target.value)}
          placeholder="Ej: Dron, Monitor, Router..."
          autoFocus={customOpen && !isCustom}
          className="mt-1"
        />
      )}

      <Dialog open={popupOpen} onOpenChange={o => (o ? setPopupOpen(true) : resetPopup())}>
        <button type="button" onClick={() => setPopupOpen(true)}
          className="text-xs text-blue-600 hover:underline">
          + Crear nuevo tipo de equipo
        </button>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo tipo de equipo</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Nombre</Label>
            <Input
              value={nombre}
              onChange={e => handleNombreChange(e.target.value)}
              placeholder="Ej: Dron, Monitor, Router..."
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Ícono</Label>
            <IconoPicker value={iconoActual} onChange={icon => { setIcono(icon); setIconoTocado(true) }} />
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
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={resetPopup}>Cancelar</Button>
            <Button type="button" className="bg-blue-600 hover:bg-blue-700" onClick={crearTipo} disabled={creando}>
              {creando ? 'Creando...' : 'Crear y usar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
