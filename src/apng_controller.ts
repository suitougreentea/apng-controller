import parseAPNG from "apng-js"
import { createPopper } from "@popperjs/core"
import { ApngRenderer } from "./apng_renderer"
import { ControllerHandle } from "./controller_handle"

export class ApngController {
  private readonly controllerHandles: ControllerHandle[] = []
  private readonly groupedControllerHandles: { [key: string]: ControllerHandle } = {}
  private static speedPresets = [0.25, 0.5, 1.0, 1.5, 2.0]
  private static numberFormat = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  public static initialize(): ApngController {
    const instance = new ApngController()
    instance.startUpdating()
    return instance
  }

  private startUpdating() {
    const update = (deltaTime: number) => {
      this.controllerHandles.forEach(e => {
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
  }

  public async transformAll() {
    const groupControllerPromises: Promise<void>[] = []
    document.querySelectorAll(".apng-controller-group-controller").forEach(e => {
      if (e instanceof HTMLElement) groupControllerPromises.push(this.transformGroupController(e))
    })
    await Promise.all(groupControllerPromises)

    const imagePromises: Promise<void>[] = []
    document.querySelectorAll(".apng-controller-image").forEach(e => {
      if (e instanceof HTMLImageElement) imagePromises.push(this.transformImage(e))
    })
    await Promise.all(imagePromises)
  }

  public async transformGroupController(element: HTMLElement) {
    const group = element.dataset.apngControllerGroup
    if (group == null) return

    const container = document.createElement("div")
    container.classList.add("apng-controller-container", "apng-controller-container-controller-only")

    const handle = new ControllerHandle()
    this.controllerHandles.push(handle)
    this.groupedControllerHandles[group] = handle
    container.appendChild(this.createControllerElement(handle))

    element.replaceWith(container)
  }

  public async transformImage(element: HTMLImageElement) {
    const group = element.dataset.apngControllerGroup
    const hasGroup = group != null

    const response = await fetch(element.src)
    const apng = parseAPNG(await response.arrayBuffer())
    if (apng instanceof Error) throw new Error("error parsing apng")

    const container = document.createElement("div")
    container.classList.add("apng-controller-container")
    container.classList.add(hasGroup ? "apng-controller-container-standalone" : "apng-controller-container-image-only")

    const canvas = document.createElement("canvas")
    canvas.className = "apng-controller-canvas"
    canvas.width = apng.width
    canvas.height = apng.height
    container.appendChild(canvas)

    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (ctx == null) throw new Error("context 2d not supported")

    const renderer = new ApngRenderer(apng, ctx)
    await renderer.initialize()

    if (hasGroup && this.groupedControllerHandles[group] != null) {
      const handle = this.groupedControllerHandles[group]
      handle.addRenderer(renderer)
    } else {
      const handle = new ControllerHandle()
      this.controllerHandles.push(handle)
      handle.addRenderer(renderer)
      const controller = this.createControllerElement(handle)
      container.appendChild(controller)
      this.attachController(controller, canvas)
    }

    element.replaceWith(container)
  }

  private createControllerElement(controllerHandle: ControllerHandle) {
    const controller = document.createElement("div")
    controller.className = "apng-controller-controller"

    const playOrPause = document.createElement("button")
    playOrPause.className = "apng-controller-controller-play"
    controller.appendChild(playOrPause)

    const playOrPauseText = document.createElement("span")
    playOrPauseText.className = "material-symbols-outlined"
    playOrPauseText.innerText = "pause"
    playOrPause.appendChild(playOrPauseText)

    const speed = document.createElement("select")
    speed.className = "apng-controller-controller-speed"
    controller.appendChild(speed)
    ApngController.speedPresets.forEach((e, i) => {
      const option = document.createElement("option")
      option.value = String(i)
      option.innerText = `x${ApngController.numberFormat.format(e)}`
      option.selected = e == 1.0
      speed.appendChild(option)
    })

    const prevFrame = document.createElement("button")
    prevFrame.className = "apng-controller-controller-prev-frame"
    controller.appendChild(prevFrame)

    const prevFrameText = document.createElement("span")
    prevFrameText.className = "material-symbols-outlined"
    prevFrameText.innerText = "chevron_left"
    prevFrame.appendChild(prevFrameText)

    const nextFrame = document.createElement("button")
    nextFrame.className = "apng-controller-controller-next-frame"
    controller.appendChild(nextFrame)

    const nextFrameText = document.createElement("span")
    nextFrameText.className = "material-symbols-outlined"
    nextFrameText.innerText = "chevron_right"
    nextFrame.appendChild(nextFrameText)

    const frameText = document.createElement("span")
    frameText.className = "apng-controller-controller-frame"
    frameText.innerText = "0 / 0"
    controller.appendChild(frameText)

    playOrPause.onclick = _ => controllerHandle.playing ? controllerHandle.pause() : controllerHandle.resume()
    speed.onchange = _ => controllerHandle.setSpeed(ApngController.speedPresets[speed.selectedIndex])
    prevFrame.onclick = _ => controllerHandle.prevFrame()
    nextFrame.onclick = _ => controllerHandle.nextFrame()

    controllerHandle.eventTarget.addEventListener("onPlayingUpdated", _ => playOrPauseText.innerText = controllerHandle.playing ? "pause" : "play_arrow")
    controllerHandle.eventTarget.addEventListener("onFrameNumberUpdated", _ => frameText.innerText = `${controllerHandle.frameNumber + 1} / ${controllerHandle.numFrames}`)

    return controller
  }

  private attachController(controller: HTMLElement, attachTo: HTMLElement) {
    createPopper(attachTo, controller, { placement: "bottom", modifiers: [{ name: "flip", enabled: false }] })

    controller.classList.add("apng-controller-controller-hidden")
    let controllerHovered = false
    let parentHovered = false
    let parentTapped = false
    const updateVisibility = () => {
      if (controllerHovered || parentHovered || parentTapped) {
        controller.classList.add("apng-controller-controller-shown")
        controller.classList.remove("apng-controller-controller-hidden")
      } else {
        controller.classList.add("apng-controller-controller-hidden")
        controller.classList.remove("apng-controller-controller-shown")
      }
    }

    const outsideClickListener = (ev: MouseEvent) => {
      const composedPath = ev.composedPath()
      if (!composedPath.includes(controller)) {
        parentTapped = false
        updateVisibility()
        document.removeEventListener("mousedown", outsideClickListener)
      }
    }
    controller.onmouseenter = _ => { controllerHovered = true; updateVisibility() }
    controller.onmouseleave = _ => { controllerHovered = false; updateVisibility() }
    attachTo.onmouseenter = _ => { parentHovered = true; updateVisibility() }
    attachTo.onmouseleave = _ => { parentHovered = false; updateVisibility() }
    attachTo.onmousedown = _ => {
      if (parentTapped) return
      parentTapped = true
      updateVisibility()
      setTimeout(() => document.addEventListener("mousedown", outsideClickListener), 0)
    }
  }
}
