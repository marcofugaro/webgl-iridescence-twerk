import WebGLApp from './lib/WebGLApp'
import assets from './lib/AssetManager'
import { Ephebe, addNaturalLight } from './scene/Ephebe'

window.DEBUG = window.location.search.includes('debug')

// grab our canvas
const canvas = document.querySelector('#app')

// setup the WebGLRenderer
const webgl = new WebGLApp({
  canvas,
  // set the scene background color
  background: '#ccc',
  backgroundAlpha: 1,
  // show the fps counter from stats.js
  showFps: window.DEBUG,
  orbitControls: { distance: 5 },
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

  // move the camera behind
  webgl.camera.position.set(0, 0, 5)

  // add any "WebGL components" here...
  // append them to the scene so you can
  // use them from other components easily
  webgl.scene.ephebe = new Ephebe({ webgl })
  webgl.scene.add(webgl.scene.ephebe)

  // lights and other scene related stuff
  addNaturalLight(webgl)

  // start animation loop
  webgl.start()
  webgl.draw()
})
