import parseAPNG, { APNG, Frame } from "apng-js"

class ControllerHandle {
  public apng: APNG
  public canvasContext: CanvasRenderingContext2D

  _width: number
  _height: number
  _imageBitmaps: ImageBitmap[]
  _frameNumber: number = -1
  _lastFrameImageData: ImageData
  _lastFrame: Frame

  public constructor(apng: APNG, canvasContext: CanvasRenderingContext2D) {
    this.apng = apng
    this.canvasContext = canvasContext
    this._width = this.canvasContext.canvas.width
    this._height = this.canvasContext.canvas.height
  }

  public async initialize() {
    this._imageBitmaps = await Promise.all(this.apng.frames.map(e => createImageBitmap(e.imageData)))
  }

  public update(deltaTime: number) {
    this.renderNextFrame()
  }

  public renderNextFrame() {
    this._frameNumber++
    this._frameNumber = this._frameNumber % this.apng.frames.length

    if (this._frameNumber == 0) {
      this.canvasContext.clearRect(0, 0, this._width, this._height)
    }

    if (this._frameNumber >= this.apng.frames.length) return

    if (this._lastFrame != null) {
      if (this._lastFrame.disposeOp == 1) {
        this.canvasContext.clearRect(this._lastFrame.left, this._lastFrame.top, this._lastFrame.width, this._lastFrame.height)
      } else if (this._lastFrame.disposeOp == 2) {
        this.canvasContext.putImageData(this._lastFrameImageData, 0, 0)
      }
    }

    const frame = this.apng.frames[this._frameNumber]
    const bitmap = this._imageBitmaps[this._frameNumber]

    if (frame.disposeOp == 2) {
      this._lastFrameImageData = this.canvasContext.getImageData(0, 0, this._width, this._height)
    }
    if (frame.blendOp == 0) {
      this.canvasContext.clearRect(frame.left, frame.top, frame.width, frame.height)
    }
    this.canvasContext.drawImage(bitmap, frame.left, frame.top)
    this._lastFrame = frame
  }
}

const handles: ControllerHandle[] = []

const update = (deltaTime: number) => {
  handles.forEach(e => {
    e.update(deltaTime)
  })
}

let lastUpdate = 0
const _update = (timestamp: DOMHighResTimeStamp) => {
  if (lastUpdate != 0) update(timestamp - lastUpdate)
  lastUpdate = timestamp
  window.requestAnimationFrame(_update)
}
window.requestAnimationFrame(_update)

const transformElement = async (element: HTMLImageElement) => {
  const response = await fetch(element.src)
  const apng = parseAPNG(await response.arrayBuffer())
  if (apng instanceof Error) return

  const canvas = document.createElement("canvas")
  canvas.width = apng.width
  canvas.height = apng.height
  element.replaceWith(canvas)
  const ctx = canvas.getContext("2d")
  const handle = new ControllerHandle(apng, ctx)
  await handle.initialize()
  handles.push(handle)
}

const transformAll = () => {
  document.querySelectorAll("img").forEach(e => transformElement(e))
}

const APNGController = {
  transformAll,
  transformElement,
}

export default APNGController