'use client'

import { useState } from 'react'

interface Props {
  urls: string[]
  size?: 'sm' | 'md' | 'lg'
  label?: boolean
}

export default function ComprobanteGallery({ urls, size = 'sm', label = false }: Props) {
  const [open, setOpen] = useState<string | null>(null)

  if (!urls || urls.length === 0) return null

  const thumbCls = size === 'sm' ? 'w-12 h-12' : size === 'md' ? 'w-16 h-16' : 'w-24 h-24'

  function isPdf(url: string) {
    return url.toLowerCase().includes('.pdf')
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        {label && (
          <span className="text-xs text-gray-500 font-medium mr-1">Comprobantes:</span>
        )}
        {urls.map((url, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setOpen(url)}
            className={`${thumbCls} rounded-lg border-2 border-gray-200 overflow-hidden hover:border-blue-400 hover:ring-2 hover:ring-blue-200 transition-all flex-shrink-0 bg-gray-50`}
            title={`Ver comprobante ${i + 1}`}
          >
            {isPdf(url) ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-red-500">
                <span className="text-lg leading-none">📄</span>
                <span className="text-[9px] font-bold text-red-600 mt-0.5">PDF</span>
              </div>
            ) : (
              <img
                src={url}
                alt={`Comprobante ${i + 1}`}
                className="w-full h-full object-cover"
              />
            )}
          </button>
        ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[9999] bg-black/85 flex items-center justify-center p-4"
          onClick={() => setOpen(null)}
        >
          <div
            className="relative max-w-3xl w-full"
            onClick={e => e.stopPropagation()}
          >
            {/* Barra superior */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-white font-medium text-sm">
                Comprobante de pago
              </span>
              <div className="flex items-center gap-3">
                <a
                  href={open}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-300 hover:text-blue-200 text-sm underline"
                  onClick={e => e.stopPropagation()}
                >
                  Abrir en nueva pestaña ↗
                </a>
                <button
                  onClick={() => setOpen(null)}
                  className="text-white/80 hover:text-white text-sm bg-white/10 hover:bg-white/20 px-3 py-1 rounded-lg transition-colors"
                >
                  ✕ Cerrar
                </button>
              </div>
            </div>

            {/* Contenido */}
            {isPdf(open) ? (
              <iframe
                src={open}
                className="w-full rounded-xl bg-white"
                style={{ height: '80vh' }}
                title="Comprobante PDF"
              />
            ) : (
              <img
                src={open}
                alt="Comprobante de pago"
                className="max-w-full rounded-xl object-contain mx-auto block shadow-2xl"
                style={{ maxHeight: '85vh' }}
              />
            )}

            {/* Miniaturas si hay múltiples */}
            {urls.length > 1 && (
              <div className="flex justify-center gap-2 mt-3">
                {urls.map((u, i) => (
                  <button
                    key={i}
                    onClick={() => setOpen(u)}
                    className={`w-10 h-10 rounded-lg border-2 overflow-hidden transition-all ${u === open ? 'border-blue-400 ring-2 ring-blue-300' : 'border-white/30 hover:border-white/60'}`}
                  >
                    {isPdf(u) ? (
                      <div className="w-full h-full bg-red-900 flex items-center justify-center text-xs text-red-200">PDF</div>
                    ) : (
                      <img src={u} alt={`${i + 1}`} className="w-full h-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
