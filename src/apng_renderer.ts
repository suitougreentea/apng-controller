import { APNG, Frame } from "apng-js"

type Rect = { left: number, top: number, width: number, height: number }

export class ApngRenderer {
  private readonly width: number
  private readonly height: number
  private imageBitmaps: ImageBitmap[]

  private currentFrameNumber: number = -1

  private currentFrameDisposeOp: number = 0
  private currentFrameRect: Rect | null = null
  private currentFrameDisposeImage: ImageData | null = null

  private keyFrames: (ImageData | null)[]
  private static readonly keyFrameInterval = 16

  public constructor(public readonly apng: APNG, private readonly canvasContext: CanvasRenderingContext2D) {
    this.width = this.canvasContext.canvas.width
    this.height = this.canvasContext.canvas.height
    this.keyFrames = new Array(Math.floor(this.apng.frames.length / ApngRenderer.keyFrameInterval))
    this.keyFrames.fill(null)
  }

  public async initialize() {
    this.imageBitmaps = await Promise.all(this.apng.frames.map(e => this.createImageBitmapNullable(e.imageData)))
  }

  private async createImageBitmapNullable(image: ImageBitmapSource | null) {
    if (image == null) return new ImageBitmap()
    return await createImageBitmap(image)
  }

  public renderFrame(targetFrameNumber: number) {
    targetFrameNumber = Math.min(targetFrameNumber, this.apng.frames.length - 1)

    if (this.currentFrameNumber > targetFrameNumber) {
      const keyFrameIndex = this.findAvailableKeyFrameIndex(targetFrameNumber)
      if (keyFrameIndex == -1) {
        this.renderHeadFrame()
        for (let i = 0; i <= targetFrameNumber; i++) this.renderDeltaFrame(i)
      } else {
        this.renderKeyFrame(keyFrameIndex)
        const keyFrameNumber = keyFrameIndex * ApngRenderer.keyFrameInterval
        for (let i = keyFrameNumber; i <= targetFrameNumber; i++) this.renderDeltaFrame(i)
      }
    } else if (this.currentFrameNumber < targetFrameNumber) {
      const keyFrameIndex = this.findAvailableKeyFrameIndex(targetFrameNumber)
      const keyFrameNumber = keyFrameIndex * ApngRenderer.keyFrameInterval
      if (keyFrameIndex == -1 || keyFrameNumber <= this.currentFrameNumber) {
        for (let i = this.currentFrameNumber + 1; i <= targetFrameNumber; i++) this.renderDeltaFrame(i)
      } else {
        this.renderKeyFrame(keyFrameIndex)
        for (let i = keyFrameNumber; i <= targetFrameNumber; i++) this.renderDeltaFrame(i)
      }
    }

    this.currentFrameNumber = targetFrameNumber
  }

  private findAvailableKeyFrameIndex(targetFrameNumber: number): number {
    const first = Math.floor(targetFrameNumber / ApngRenderer.keyFrameInterval)
    for (let i = first; i >= 0; i--) {
      if (this.keyFrames[i] != null) return i
    }
    return -1
  }

  private renderHeadFrame() {
    this.canvasContext.clearRect(0, 0, this.width, this.height)
    this.currentFrameDisposeOp = 0
    this.currentFrameRect = null
    this.currentFrameDisposeImage = null
  }

  private renderKeyFrame(keyFrameIndex: number) {
    this.canvasContext.putImageData(this.keyFrames[keyFrameIndex] as ImageData, 0, 0)
    this.currentFrameDisposeOp = 0
    this.currentFrameRect = null
    this.currentFrameDisposeImage = null
  }

  private renderDeltaFrame(targetFrameNumber: number) {
    if (this.currentFrameDisposeOp == 1) {
      const rect = this.currentFrameRect as Rect
      this.canvasContext.clearRect(rect.left, rect.top, rect.width, rect.height)
    }
    else if (this.currentFrameDisposeOp == 2) {
      const rect = this.currentFrameRect as Rect
      const image = this.currentFrameDisposeImage as ImageData
      this.canvasContext.putImageData(image, rect.left, rect.top)
    }

    if (targetFrameNumber % ApngRenderer.keyFrameInterval == 0) {
      const keyFrameIndex = targetFrameNumber / ApngRenderer.keyFrameInterval
      if (this.keyFrames[keyFrameIndex] == null) {
        this.keyFrames[keyFrameIndex] = this.canvasContext.getImageData(0, 0, this.width, this.height)
      }
    }

    const frame = this.apng.frames[targetFrameNumber]
    const bitmap = this.imageBitmaps[targetFrameNumber]
    // console.log(`frame ${targetFrameNumber} blend ${frame.blendOp} dispose ${frame.disposeOp}`)

    this.currentFrameDisposeOp = frame.disposeOp
    this.currentFrameRect = { left: frame.left, top: frame.top, width: frame.width, height: frame.height }
    if (frame.disposeOp == 2) {
      this.currentFrameDisposeImage = this.canvasContext.getImageData(frame.left, frame.top, frame.width, frame.height)
    } else {
      this.currentFrameDisposeImage = null
    }

    if (frame.blendOp == 0) {
      this.canvasContext.clearRect(frame.left, frame.top, frame.width, frame.height)
    }
    this.canvasContext.drawImage(bitmap, frame.left, frame.top)
  }
}
