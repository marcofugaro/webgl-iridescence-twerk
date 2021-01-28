import * as THREE from 'three'
import {
  BloomEffect,
  KernelSize,
  EffectPass,
  SMAAImageLoader,
  SMAAEffect,
  BlendFunction,
  VignetteEffect,
} from 'postprocessing'
import WebGLApp from './lib/WebGLApp'
import assets from './lib/AssetManager'
import { Ephebe } from './scene/Ephebe'
import { Hills } from './scene/Hills'
import { Reflection } from './scene/Reflection'
import { addLights } from './scene/lights'

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
  cameraPosition: new THREE.Vector3(0, 2, 5),
  orbitControls: {
    target: new THREE.Vector3(0, 1.2, 0),
    maxPolarAngle: !window.DEBUG ? Math.PI / 1.9 : Math.PI,
  },
  gamma: true,
  antialias: false,
  maxPixelRatio: 1,
  postprocessing: true,
  multisampling: 0,
})

// attach it to the window to inspect in the console
if (window.DEBUG) {
  window.webgl = webgl
}

// hide canvas
webgl.canvas.style.visibility = 'hidden'

const envmapKey = assets.queue({
  url: 'assets/envMaps/nebula.jpg',
  type: 'envmap',
})

// load any queued assets
assets.load({ renderer: webgl.renderer }).then(() => {
  // show canvas
  webgl.canvas.style.visibility = ''

  // limit zoom
  if (!window.DEBUG) {
    // const currentDistance = webgl.orbitControls.getDistance()
    // webgl.orbitControls.maxDistance = currentDistance
    webgl.orbitControls.maxDistance = 5.05
    webgl.orbitControls.minDistance = 1
  }

  // add any "WebGL components" here...
  const ephebe = new Ephebe(webgl)
  webgl.scene.add(ephebe)
  const hills = new Hills(webgl)
  webgl.scene.add(hills)
  const reflection = new Reflection(webgl, { reflected: ephebe })
  webgl.scene.add(reflection)

  webgl.scene.background = assets.get(envmapKey)

  addLights(webgl)

  const bloomEffect = new BloomEffect({
    blendFunction: BlendFunction.ADD,
    kernelSize: KernelSize.LARGE,
    luminanceThreshold: 0.4,
    luminanceSmoothing: 0.15,
    height: 480,
  })

  // webgl.composer.addPass(new EffectPass(webgl.camera, bloomEffect))

  const vignetteEffect = new VignetteEffect()

  console.time()
  new SMAAImageLoader().load(([search, area]) => {
    console.timeEnd()
    const smaaEffect = new SMAAEffect(search, area)
    smaaEffect.edgeDetectionMaterial.setEdgeDetectionThreshold(0.01)
    webgl.composer.addPass(new EffectPass(webgl.camera, smaaEffect, bloomEffect, vignetteEffect))

    // start animation loop
    webgl.start()
  })
})
