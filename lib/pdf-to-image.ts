/**
 * Renders the first page of a PDF file to a JPEG blob using pdf.js (browser only).
 */
export async function pdfToImageBlob(file: File): Promise<Blob> {
  // Dynamic import keeps pdf.js out of the server bundle
  const pdfjsLib = await import('pdfjs-dist')

  // Point the worker at the bundled worker file
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url,
  ).toString()

  const arrayBuffer = await file.arrayBuffer()
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) })
  const pdf = await loadingTask.promise

  // Render page 1 (index 1-based)
  const page = await pdf.getPage(1)

  // Scale factor: higher = more detail for AI reading
  const scale = 2.5
  const viewport = page.getViewport({ scale })

  const canvas = document.createElement('canvas')
  canvas.width  = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext('2d')!

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (page.render as any)({ canvasContext: ctx, viewport }).promise

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
      'image/jpeg',
      0.92,
    )
  })
}
