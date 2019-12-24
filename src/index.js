import State from 'controls-state'
import WebGLApp from './lib/WebGLApp'
import assets from './lib/AssetManager'
import { Ephebe } from './scene/Ephebe'
import { Hills } from './scene/Hills'

window.DEBUG = window.location.search.includes('debug')

// grab our canvas
const canvas = document.querySelector('#app')

// setup the WebGLRenderer
const webgl = new WebGLApp({
  canvas,
  controls: {
    background: '#DCDBDD', // gray
    // background: '#CBF6FF', // cyan
    // background: '#D9B241', // yellow
    ephebe: {
      powerFactor: State.Slider(0.8, {
        min: 0.01,
        max: 5,
        step: 0.01,
      }),
      speed: State.Slider(0.1, {
        min: 0.01,
        max: 10,
        step: 0.01,
      }),
      multiplicator: State.Slider(0.6, {
        min: 0.01,
        max: 10,
        step: 0.01,
      }),
    },
    hills: {
      powerFactor: State.Slider(1.13, {
        min: 0.01,
        max: 5,
        step: 0.01,
      }),
      speed: State.Slider(0.3, {
        min: 0.01,
        max: 10,
        step: 0.01,
      }),
      multiplicator: State.Slider(2.5, {
        min: 0.01,
        max: 20,
        step: 0.01,
      }),
      firstColor: '#CE1DC5',
      secondColor: '#00E6CC',
    },
  },
  closeControls: !window.DEBUG,
  showFps: window.DEBUG,
  orbitControls: {
    distance: 5,
    target: [0, 1.2, 0],
    phi: Math.PI * 0.4,
    phiBounds: !window.DEBUG && [0, Math.PI * 0.5],
    distanceBounds: !window.DEBUG && [5, 5],
  },
})

// change the background color on controls changes
webgl.renderer.setClearColor(webgl.controls.background, 1)
webgl.controls.$onChanges(({ background }) => {
  if (background) {
    webgl.renderer.setClearColor(background.value, 1)
  }
})

// attach it to the window to inspect in the console
if (window.DEBUG) {
  window.webgl = webgl
}

// hide canvas
webgl.canvas.style.visibility = 'hidden'

// load any queued assets
assets.load({ renderer: webgl.renderer }).then(() => {
  // show canvas
  webgl.canvas.style.visibility = ''

  // add any "WebGL components" here...
  // append them to the scene so you can
  // use them from other components easily
  webgl.scene.ephebe = new Ephebe({ webgl })
  webgl.scene.add(webgl.scene.ephebe)
  webgl.scene.hills = new Hills({ webgl })
  webgl.scene.add(webgl.scene.hills)

  // start animation loop
  webgl.start()
  webgl.draw()
})
