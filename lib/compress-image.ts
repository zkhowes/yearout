/**
 * Client-side image compression to stay under Vercel's 4.5 MB body limit.
 * Resizes to maxDim and re-encodes as JPEG. Falls back to original on error.
 */
export function compressImage(
  file: File,
  maxDim = 2048,
  quality = 0.85,
): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img

      // Already small enough — skip compression
      if (w <= maxDim && h <= maxDim && file.size <= 3 * 1024 * 1024) {
        URL.revokeObjectURL(img.src)
        resolve(file)
        return
      }

      const scale = Math.min(maxDim / w, maxDim / h, 1)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(w * scale)
      canvas.height = Math.round(h * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(img.src)

      canvas.toBlob(
        (blob) =>
          resolve(
            blob
              ? new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
                  type: 'image/jpeg',
                })
              : file,
          ),
        'image/jpeg',
        quality,
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(img.src)
      resolve(file)
    }
    img.src = URL.createObjectURL(file)
  })
}
