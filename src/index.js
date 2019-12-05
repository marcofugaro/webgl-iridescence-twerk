import State from 'controls-state'
import WebGLApp from './lib/WebGLApp'
import assets from './lib/AssetManager'
import { Ephebe } from './scene/Ephebe'
import { Waves } from './scene/Waves'
import { SoftShadowFloor } from './scene/SoftShadowFloor'

window.DEBUG = window.location.search.includes('debug')

// grab our canvas
const canvas = document.querySelector('#app')

// setup the WebGLRenderer
const webgl = new WebGLApp({
  canvas,
  controls: {
    powerFactor: State.Slider(1.13, {
      min: 0.01,
      max: 5,
      step: 0.01,
    }),
    speed: State.Slider(1.47, {
      min: 0.01,
      max: 10,
      step: 0.01,
    }),
    multiplicator: State.Slider(3, {
      min: 0.01,
      max: 20,
      step: 0.01,
    }),
    background: '#E2E45D',
    firstColor: '#CE1DC5',
    secondColor: '#00E6CC',
    showAllColors: false,
  },
  showFps: window.DEBUG,
  orbitControls: {
    distance: 5,
    target: [0, 1.2, 0],
    phi: Math.PI * 0.4,
    phiBounds: !window.DEBUG && [0, Math.PI * 0.55],
    distanceBounds: !window.DEBUG && [5, 5],
  },
})

// attach it to the window to inspect in the console
if (window.DEBUG) {
  window.webgl = webgl
}

// hide canvas
webgl.canvas.style.visibility = 'hidden'

// close the controls pane
// TODO

// load any queued assets
assets.load({ renderer: webgl.renderer }).then(() => {
  // show canvas
  webgl.canvas.style.visibility = ''

  // add any "WebGL components" here...
  // append them to the scene so you can
  // use them from other components easily
  webgl.scene.ephebe = new Ephebe({ webgl })
  webgl.scene.add(webgl.scene.ephebe)
  webgl.scene.softShadowFloor = new SoftShadowFloor({ webgl })
  webgl.scene.add(webgl.scene.softShadowFloor)
  // webgl.scene.waves = new Waves({ webgl })
  // webgl.scene.add(webgl.scene.waves)

  // enable gamma correction
  webgl.renderer.gammaOuput = true
  webgl.renderer.gammaFactor = 2.2

  // localClipping is needed for the SoftShadowFloor
  webgl.renderer.localClippingEnabled = true

  // start animation loop
  webgl.start()
  webgl.draw()
})
