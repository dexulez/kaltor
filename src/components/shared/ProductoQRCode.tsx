'use client'

import QRCode from 'react-qr-code'
import { Button } from '@/components/ui/button'

export function buildProductoQRValue(productId: string) {
  return `KL:P:${productId}`
}

export function parseProductoQR(value: string): string | null {
  if (value.startsWith('KL:P:')) return value.slice(5)
  if (value.startsWith('TR:P:')) return value.slice(5) // etiquetas impresas antes del rebranding a Kaltor
  return null
}

interface Props {
  productId: string
  nombre: string
  sku?: string | null
  onClose: () => void
}

export default function ProductoQRCode({ productId, nombre, sku, onClose }: Props) {
  const qrValue = buildProductoQRValue(productId)

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl overflow-hidden w-full max-w-xs shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
          <p className="font-semibold text-gray-800 text-sm">Código QR del producto</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="p-6 space-y-4 text-center">
          <div className="flex justify-center p-3 bg-white rounded-xl border">
            <QRCode value={qrValue} size={160} />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm leading-tight">{nombre}</p>
            {sku && <p className="text-xs text-gray-500 mt-0.5">SKU: {sku}</p>}
            <p className="text-xs text-gray-300 mt-1 font-mono break-all">{qrValue}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 text-sm gap-1.5"
              onClick={() => window.print()}
            >
              🖨️ Imprimir
            </Button>
            <Button variant="outline" className="flex-1 text-sm" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
