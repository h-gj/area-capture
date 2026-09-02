const canvas = document.getElementById('shot') as HTMLCanvasElement
const ctx = canvas.getContext('2d', { willReadFrequently: true })
if (!ctx) throw new Error('Canvas is not available')

let dragging = false
let backup: ImageData | null = null
let sourceUrl = ''

function restore() {
  if (!backup) return
  try {
    ctx.putImageData(backup, 0, 0)
  } catch (err) {
    if (!(err instanceof DOMException)) throw err
    if (sourceUrl) void paint(sourceUrl)
  }
}

async function paint(dataUrl: string): Promise<void> {
  sourceUrl = dataUrl
  const image = new Image()
  image.src = dataUrl
  await image.decode()
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  ctx.drawImage(image, 0, 0)
  backup = ctx.getImageData(0, 0, canvas.width, canvas.height)
}

window.api.onStickerReady((payload) => {
  void paint(payload.dataUrl)
})

window.api.onStickerRestore(() => {
  restore()
})

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) restore()
})
window.addEventListener('pageshow', () => restore())
window.addEventListener('focus', () => restore())

window.addEventListener('wheel', (event) => {
  event.preventDefault()
  if (event.deltaY === 0) return
  window.api.stickerScale(event.screenX, event.screenY, event.deltaY < 0 ? 1 : -1)
}, { passive: false })

window.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return
  dragging = true
  document.body.classList.add('dragging')
  try {
    document.body.setPointerCapture(event.pointerId)
  } catch {
    // Capture is best-effort; main still tracks the cursor.
  }
  window.api.stickerDragStart(event.screenX, event.screenY)
})

window.addEventListener('pointerup', (event) => {
  if (event.button !== 0 || !dragging) return
  dragging = false
  document.body.classList.remove('dragging')
  window.api.stickerDragEnd()
})

window.addEventListener('pointercancel', () => {
  if (!dragging) return
  dragging = false
  document.body.classList.remove('dragging')
  window.api.stickerDragEnd()
})

window.addEventListener('contextmenu', (event) => {
  event.preventDefault()
  dragging = false
  document.body.classList.remove('dragging')
  window.api.stickerDragEnd()
  window.api.stickerMenu()
})

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') window.api.stickerClose()
})

window.addEventListener('lostpointercapture', () => {
  if (!dragging) return
  dragging = false
  document.body.classList.remove('dragging')
  window.api.stickerDragEnd()
})

window.addEventListener('blur', () => {
  if (!dragging) return
  dragging = false
  document.body.classList.remove('dragging')
  window.api.stickerDragEnd()
})
