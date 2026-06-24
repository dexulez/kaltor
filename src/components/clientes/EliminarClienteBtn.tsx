'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export default function EliminarClienteBtn({ clienteId, nombreCliente }: { clienteId: string; nombreCliente: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  const confirmacionValida = confirmText.trim().toUpperCase() === 'ELIMINAR'

  async function eliminar() {
    setDeleting(true)
    const { error } = await supabase.from('customers').update({ activo: false }).eq('id', clienteId)
    setDeleting(false)
    if (error) { toast.error('Error al eliminar: ' + error.message); return }
    toast.success('Cliente eliminado')
    setOpen(false)
    router.push('/clientes')
    router.refresh()
  }

  return (
    <>
      <Button variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => setOpen(true)}>
        🗑️ Eliminar
      </Button>

      <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) setConfirmText('') }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">Eliminar cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              ¿Estás seguro que deseas eliminar a <strong>{nombreCliente}</strong>?
            </p>
            <p className="text-xs text-gray-400 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              El cliente desaparecerá de la lista. Sus OTs y ventas quedan intactas — no se borra el historial.
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">
                Escribe <strong>ELIMINAR</strong> para confirmar
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                placeholder="ELIMINAR"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)} disabled={deleting}>
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={eliminar}
                disabled={deleting || !confirmacionValida}
              >
                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
