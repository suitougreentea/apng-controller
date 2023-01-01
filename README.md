# apng-controller

Adds a playback controller to an APNG image

## Demo

https://nestetrisjp.github.io/

or run `npm run dev`

## Standalone usage

* `npm run build` to generate dist/apng_controller.min.mjs and dist/apng_controller.min.css
* include the icon font in your page's head: `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@48,400,1,0" />`
* include the css in your page's head: `<link rel="stylesheet" href="path/to/the/css/apng_controller.min.css" />`
* add the `apng-controller-image` class to your apng `<img>`s (See src/demo/index.html for example)
* run the transform at the tail of your page's body: `<script type="module">import { ApngController } from "path/to/the/js/apng_controller.min.mjs"; ApngController.initialize().transformAll()</script>`

## Package usage

Not tested.

## License

MIT