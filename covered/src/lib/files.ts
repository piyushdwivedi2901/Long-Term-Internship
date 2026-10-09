import { FILE_TYPES, MAX_FILE_BYTES, type FileInput, type FileType } from '../../shared/schemas.ts'

export const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf'

export class FileProblem extends Error {}

const toBase64 = (buf: ArrayBuffer) => {
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

const loadImage = (file: Blob) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => (URL.revokeObjectURL(url), resolve(img))
    img.onerror = () => (URL.revokeObjectURL(url), reject(new FileProblem("This image couldn't be opened")))
    img.src = url
  })

/**
 * Phone photos of bills are often 4–8 MB. Re-encode large photos as JPEG,
 * capped at `maxSide` pixels — still sharp enough to read the small print.
 */
async function shrinkImage(file: File, maxSide: number, quality: number): Promise<Blob> {
  const img = await loadImage(file)
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.naturalWidth * scale)
  canvas.height = Math.round(img.naturalHeight * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.fillStyle = '#fff' // transparent PNGs become white, not black
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', quality))
  return blob && blob.size < file.size ? blob : file
}

/**
 * Turns a picked file into an upload. `compact` (the in-browser demo, where
 * space is tight) shrinks photos harder.
 */
export async function prepareUpload(file: File, { compact = false } = {}): Promise<FileInput> {
  if (!(FILE_TYPES as readonly string[]).includes(file.type)) {
    throw new FileProblem(/heic|heif/i.test(file.type + file.name) ? 'HEIC photos aren’t supported yet — share it as JPG from your phone, or take a screenshot.' : 'Upload a photo (JPG, PNG, WebP) or a PDF')
  }
  let blob: Blob = file
  let mime = file.type as FileType
  let name = file.name || 'Bill'
  if (mime !== 'application/pdf') {
    const limit = compact ? 250_000 : 1_500_000
    if (file.size > limit) {
      blob = await shrinkImage(file, compact ? 1400 : 2200, compact ? 0.72 : 0.85)
      if (blob !== file) {
        mime = 'image/jpeg'
        name = name.replace(/\.(png|webp|jpe?g)$/i, '') + '.jpg'
      }
    }
  }
  if (blob.size > MAX_FILE_BYTES) throw new FileProblem('Files can be up to 4 MB. Try a smaller scan or a photo.')
  return { name: name.slice(0, 120), mime, data: toBase64(await blob.arrayBuffer()) }
}

export const formatBytes = (n: number) => (n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`)
