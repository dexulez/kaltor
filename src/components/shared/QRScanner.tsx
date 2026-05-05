'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

interface DetectedBarcode { rawValue: string }
interface BarcodeDetectorInstance {
  detect(src: HTMLVideoElement): Promise<DetectedBarcode[]>
}
type BarcodeDetectorCtor = new(opts: { formats: string[] }) => BarcodeDetectorInstance

interface Props {
  onScan: (value: string) => void
  onClose: () => void
}

export default function QRScanner({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [estado, setEstado] = useState<'iniciando' | 'listo' | 'error'>('iniciando')
  const [mensajeError, setMensajeError] = useState('')

  useEffect(() => {
    let active = true
    let stream: MediaStream | null = null

    const BDClass = (typeof window !== 'undefined')
      ? (window as Window & { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector
      : undefined

    if (!BDClass) {
      setEstado('error')
      setMensajeError('Tu navegador no soporta escaneo de QR. Usa Chrome en Android o Edge en PC.')
      return
    }

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 } },
        })
        if (!active) { stream.getTracks().forEach(t => t.stop()); return }
        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        await video.play()
        setEstado('listo')

        const detector = new BDClass!({ formats: ['qr_code', 'ean_13', 'code_128', 'code_39'] })

        async function loop() {
          if (!active || !video) return
          if (video.readyState >= 2) {
            try {
              const hits = await detector.detect(video)
              if (!active) return
              if (hits.length > 0) {
                active = false
                stream?.getTracks().forEach(t => t.stop())
                onScan(hits[0].rawValue)
                return
              }
            } catch { /* frame sin código */ }
          }
          if (active) requestAnimationFrame(loop)
        }
        loop()
      } catch {
        if (active) {
          setEstado('error')
          setMensajeError('No se pudo acceder a la cámara. Verifica los permisos del navegador.')
        }
      }
    }

    start()

    return () => {
      active = false
      stream?.getTracks().forEach(t => t.stop())
    }
  }, [onScan])

  function handleClose() {
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl overflow-hidden w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
          <p className="font-semibold text-gray-800">Escanear código QR / Barras</p>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {estado === 'error' ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-5xl">📷</p>
            <p className="text-sm text-red-600 font-medium">{mensajeError}</p>
            <Button variant="outline" onClick={handleClose} className="mt-2">Cerrar</Button>
          </div>
        ) : (
          <div className="relative bg-black">
            <video
              ref={videoRef}
              className="w-full aspect-square object-cover"
              muted
              playsInline
            />
            {/* Overlay con guía */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-52 h-52">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />
                {estado === 'listo' && (
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-400 opacity-70 animate-pulse" />
                )}
              </div>
            </div>
            {estado === 'iniciando' && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <p className="text-white text-sm animate-pulse">Iniciando cámara...</p>
              </div>
            )}
          </div>
        )}

        <div className="px-4 py-3 text-center bg-gray-50 border-t">
          <p className="text-xs text-gray-500">Apunta la cámara al código del producto</p>
        </div>
      </div>
    </div>
  )
}
