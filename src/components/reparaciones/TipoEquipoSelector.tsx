'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TIPOS_EQUIPO, sugerirIcono } from '@/lib/tipoEquipo'
import type { EquipmentType } from '@/types'

export { TIPOS_EQUIPO } from '@/lib/tipoEquipo'
export { labelTipoEquipo } from '@/lib/tipoEquipo'

interface Props {
  value: string
  onChange: (v: string) => void
  tipos: Pick<EquipmentType, 'value' | 'label' | 'icon'>[]
  onTipoCreado?: (tipo: EquipmentType) => void
}

export default function TipoEquipoSelector({ value, onChange, tipos, onTipoCreado }: Props) {
  const [customOpen, setCustomOpen] = useState(false)
  const [custom, setCustom] = useState('')

  const [popupOpen, setPopupOpen] = useState(false)
  const [nombre, setNombre] = useState('')
  const [icono, setIcono] = useState('')
  const [iconoTocado, setIconoTocado] = useState(false)
  const [template, setTemplate] = useState('otro')
  const [creando, setCreando] = useState(false)

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

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1.5">
        {tipos.map(t => (
          <button
            key={t.value}
            type="button"
            onClick={() => handleSelect(t.value)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium text-left transition-colors leading-tight ${
              value === t.value || (t.value === 'otro' && (customOpen || isCustom))
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-blue-400 active:bg-gray-100'
            }`}
          >
            <span className="text-base shrink-0">{t.icon}</span>
            <span>{t.label}</span>
          </button>
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
          <div className="grid grid-cols-[auto_1fr] gap-3 items-end">
            <div className="space-y-1.5 w-20">
              <Label>Ícono</Label>
              <Input
                value={iconoActual}
                onChange={e => { setIcono(e.target.value); setIconoTocado(true) }}
                className="text-center text-lg"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nombre</Label>
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
