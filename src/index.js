import * as THREE from 'three'
import WebGLApp from './lib/WebGLApp'
import assets from './lib/AssetManager'
import { Ephebe } from './scene/Ephebe'
import { Hills } from './scene/Hills'
import { wireValue } from './lib/Controls'

window.DEBUG = window.location.search.includes('debug')

// grab our canvas
const canvas = document.querySelector('#app')

// setup the WebGLRenderer
const webgl = new WebGLApp({
  canvas,
  controls: {
    background: '#070758',
    ephebe: {
      powerFactor: {
        value: 0.8,
        max: 5,
      },
      speed: {
        value: 0.1,
        max: 10,
        scale: 'exp',
      },
      multiplicator: {
        value: 0.6,
        max: 10,
        scale: 'exp',
      },
    },
    hills: {
      powerFactor: {
        value: 1.13,
        max: 5,
      },
      speed: {
        value: 0.3,
        max: 10,
        scale: 'exp',
      },
      multiplicator: {
        value: 2.5,
        max: 20,
        scale: 'exp',
      },
      firstColor: '#CE1DC5',
      secondColor: '#00E6CC',
    },
  },
  closeControls: !window.DEBUG,
  showFps: window.DEBUG,
  cameraPosition: new THREE.Vector3(0, 2, 5),
  orbitControls: {
    target: new THREE.Vector3(0, 1.2, 0),
    enableZoom: window.DEBUG,
    maxPolarAngle: !window.DEBUG ? Math.PI / 2 : Math.PI,
  },
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
  webgl.scene.ephebe = new Ephebe(webgl)
  webgl.scene.add(webgl.scene.ephebe)
  webgl.scene.hills = new Hills(webgl)
  webgl.scene.add(webgl.scene.hills)

  // change the background color on controls changes
  webgl.background = webgl.controls.background
  wireValue(webgl, () => webgl.controls.background)

  const ambientLight = new THREE.AmbientLight('white', 1)
  webgl.scene.add(ambientLight)

  // const spotLight = new THREE.SpotLight('white', 1, 20)
  // spotLight.position.set(5, 5, 5)
  // spotLight.lookAt(0, 0, 0)
  // webgl.scene.add(spotLight)

  // start animation loop
  webgl.start()
})
