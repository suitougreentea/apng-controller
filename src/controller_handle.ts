import { ApngRenderer } from "./apng_renderer"

export class ControllerHandle {
  private readonly renderers: ApngRenderer[] = []
  private delays: number[]
  private delay: number = 0

  public frameNumber: number = 0
  public numFrames: number = 0
  public playing: boolean = true
  public speed: number = 1
  public eventTarget: EventTarget = new EventTarget()

  public async addRenderer(renderer: ApngRenderer) {
    this.renderers.push(renderer)
    if (this.numFrames == 0) {
      this.numFrames = renderer.apng.frames.length
      this.delays = renderer.apng.frames.map(e => e.delay)
    }
    renderer.renderFrame(this.frameNumber)
  }

  public update(deltaTime: number) {
    if (this.numFrames == 0) return
    if (!this.playing) return

    this.delay += deltaTime * this.speed
    let newFrameNumber = this.frameNumber
    while (this.delay >= this.delays[newFrameNumber]) {
      this.delay -= this.delays[newFrameNumber]
      newFrameNumber = (newFrameNumber + 1) % this.numFrames
    }

    this.frameNumber = newFrameNumber
    this.renderers.forEach(e => e.renderFrame(this.frameNumber))
    this.eventTarget.dispatchEvent(new CustomEvent("onFrameNumberUpdated"))
  }

  public pause() {
    this.playing = false
    this.delay = 0
    this.eventTarget.dispatchEvent(new CustomEvent("onPlayingUpdated"))
  }

  public resume() {
    this.playing = true
    this.eventTarget.dispatchEvent(new CustomEvent("onPlayingUpdated"))
  }

  public setSpeed(speed: number) {
    this.speed = speed
    this.eventTarget.dispatchEvent(new CustomEvent("onSpeedUpdated"))
  }

  public prevFrame() {
    if (this.numFrames == 0) return

    this.playing = false
    this.delay = 0
    this.eventTarget.dispatchEvent(new CustomEvent("onPlayingUpdated"))
    this.frameNumber = (this.frameNumber + this.numFrames - 1) % this.numFrames
    this.renderers.forEach(e => e.renderFrame(this.frameNumber))
    this.eventTarget.dispatchEvent(new CustomEvent("onFrameNumberUpdated"))
  }

  public nextFrame() {
    if (this.numFrames == 0) return

    this.playing = false
    this.delay = 0
    this.eventTarget.dispatchEvent(new CustomEvent("onPlayingUpdated"))
    this.frameNumber = (this.frameNumber + 1) % this.numFrames
    this.renderers.forEach(e => e.renderFrame(this.frameNumber))
    this.eventTarget.dispatchEvent(new CustomEvent("onFrameNumberUpdated"))
  }
}
