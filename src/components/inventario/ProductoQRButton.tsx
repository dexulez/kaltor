'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import ProductoQRCode from '@/components/shared/ProductoQRCode'

interface Props {
  productId: string
  nombre: string
  sku?: string | null
}

export default function ProductoQRButton({ productId, nombre, sku }: Props) {
  const [show, setShow] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShow(true)}
        title="Ver código QR"
        className="text-xs px-2"
      >
        QR
      </Button>
      {show && (
        <ProductoQRCode
          productId={productId}
          nombre={nombre}
          sku={sku}
          onClose={() => setShow(false)}
        />
      )}
    </>
  )
}
