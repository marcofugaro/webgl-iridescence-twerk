import * as THREE from 'three'
import WebGLApp from './lib/WebGLApp'
import assets from './lib/AssetManager'
import { Ephebe } from './scene/Ephebe'
import { Hills } from './scene/Hills'
import { wireValue } from './lib/Controls'
import { addLights } from './scene/lights'
import ContactShadow from './scene/ContactShadow'
import { SoftShadowFloor } from './scene/SoftShadowFloor'

window.DEBUG = window.location.search.includes('debug')

// grab our canvas
const canvas = document.querySelector('#app')

// setup the WebGLRenderer
const webgl = new WebGLApp({
  canvas,
  backgroundAlpha: 0,
  controls: {
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
        value: 1,
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
      secondColor: '#73e600',
    },
  },
  closeControls: !window.DEBUG,
  showFps: window.DEBUG,
  maxPixelRatio: 1,
  cameraPosition: new THREE.Vector3(0, 2, 5),
  orbitControls: {
    target: new THREE.Vector3(0, 1.2, 0),
    enableZoom: window.DEBUG,
    maxPolarAngle: !window.DEBUG ? Math.PI / 2 : Math.PI,
  },
  gamma: true,
})

// attach it to the window to inspect in the console
if (window.DEBUG) {
  window.webgl = webgl
}

// hide canvas
webgl.canvas.style.visibility = 'hidden'

const envmapKey = assets.queue({
  url: 'assets/envs/photo.jpg',
  type: 'envmap',
})

// load any queued assets
assets.load({ renderer: webgl.renderer }).then(() => {
  // show canvas
  webgl.canvas.style.visibility = ''

  // add any "WebGL components" here...
  const ephebe = new Ephebe(webgl)
  webgl.scene.add(ephebe)
  const hills = new Hills(webgl)
  webgl.scene.add(hills)
  // const contactShadow = new ContactShadow(webgl, { position: new THREE.Vector3(0, 0.1, 0) })
  // webgl.scene.add(contactShadow)

  webgl.scene.background = assets.get(envmapKey)

  addLights(webgl)

  // start animation loop
  webgl.start()
})
