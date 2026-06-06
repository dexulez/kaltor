/**
 * Comprime una imagen a máximo `maxKB` KB usando Canvas.
 * PDFs y archivos no-imagen se devuelven sin cambios.
 */
export async function comprimirImagen(file: File, maxKB = 500): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  if (file.size <= maxKB * 1024) return file

  return new Promise((resolve) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      const canvas = document.createElement('canvas')
      let { naturalWidth: w, naturalHeight: h } = img

      // Escalar si la dimensión mayor supera 1920px
      const MAX_DIM = 1920
      if (w > MAX_DIM || h > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / w, MAX_DIM / h)
        w = Math.round(w * ratio)
        h = Math.round(h * ratio)
      }

      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(file); return }
      ctx.drawImage(img, 0, 0, w, h)

      // Intentar distintas calidades hasta lograr el tamaño objetivo
      const nombreBase = file.name.replace(/\.[^.]+$/, '') + '.jpg'
      let quality = 0.85

      const intentar = () => {
        canvas.toBlob(blob => {
          if (!blob) { resolve(file); return }
          if (blob.size <= maxKB * 1024 || quality <= 0.25) {
            resolve(new File([blob], nombreBase, { type: 'image/jpeg' }))
          } else {
            quality = Math.round((quality - 0.1) * 100) / 100
            intentar()
          }
        }, 'image/jpeg', quality)
      }

      intentar()
    }

    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file) }
    img.src = objectUrl
  })
}

/** Comprime todos los archivos de imagen en un array, deja PDFs sin cambios. */
export async function comprimirArchivos(archivos: File[], maxKB = 500): Promise<File[]> {
  return Promise.all(archivos.map(f => comprimirImagen(f, maxKB)))
}
