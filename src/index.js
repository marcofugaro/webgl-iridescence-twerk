import * as THREE from 'three'
import { BloomEffect, KernelSize, EffectPass, BlendFunction, VignetteEffect } from 'postprocessing'
import { clamp } from 'lodash'
import eases from 'eases'
import WebGLApp from './lib/WebGLApp'
import assets from './lib/AssetManager'
import { Ephebe } from './scene/Ephebe'
import { Hills } from './scene/Hills'
import { Reflection } from './scene/Reflection'
import { XRState } from './lib/XRState'
import { SMAAEffect } from './lib/SMAAEffect'
import { isARSupported, requestARSession } from './lib/xr-utils'
import ContactShadow from './lib/ContactShadow'

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
  cameraPosition: new THREE.Vector3(-1, 2, 5),
  orbitControls: {
    target: new THREE.Vector3(0, 1.2, 0),
    maxPolarAngle: !window.DEBUG ? Math.PI / 1.94 : Math.PI,
  },
  xr: true,
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

const envmapKey = assets.queue({
  url: 'assets/envMaps/nebula_optimized.jpg',
  type: 'envmap',
})

// load any queued assets
assets.load({ renderer: webgl.renderer }).then(async () => {
  // limit zoom
  const DOLLY_DELAY = 1
  const DOLLY_DURATION = 3
  const MIN_DISTANCE = 0.7
  const MAX_DISTANCE = 5.05
  const ROTATE_SPEED = 2
  const ROTATE_SPEED_SLOW = 0.6
  const SLOW_DOWN_DURATION = 2
  if (!window.DEBUG) {
    webgl.orbitControls.autoRotate = true
    webgl.orbitControls.autoRotateSpeed = -ROTATE_SPEED

    // ideally..
    // https://github.com/mrdoob/three.js/pull/21162
    // const currentDistance = webgl.orbitControls.getDistance()
    // webgl.orbitControls.maxDistance = currentDistance
    webgl.orbitControls.maxDistance = MAX_DISTANCE
    webgl.orbitControls.minDistance = MIN_DISTANCE

    // hacks because of
    // https://github.com/mrdoob/three.js/pull/9005
    webgl.orbitControls.maxDistance = MIN_DISTANCE
    webgl.orbitControls.update()
    webgl.orbitControls.maxDistance = MAX_DISTANCE
    webgl.orbitControls.update()

    // dolly out
    const startTime = webgl.time + DOLLY_DELAY
    webgl.onUpdate((dt, time) => {
      const t = eases.quartInOut(clamp((time - startTime) / DOLLY_DURATION, 0, 1))

      if (t < 1) {
        // hacks because of
        // https://github.com/mrdoob/three.js/pull/9005
        webgl.orbitControls.minDistance = THREE.MathUtils.lerp(MIN_DISTANCE, MAX_DISTANCE, t)
      } else {
        webgl.orbitControls.minDistance = MIN_DISTANCE
      }
    })

    // slow down rotation
    const startTimeRotate = webgl.time + DOLLY_DELAY + DOLLY_DURATION - 1
    webgl.onUpdate((dt, time) => {
      const t = clamp((time - startTimeRotate) / SLOW_DOWN_DURATION, 0, 1)

      if (t < 1) {
        webgl.orbitControls.autoRotateSpeed = -THREE.MathUtils.lerp(
          ROTATE_SPEED,
          ROTATE_SPEED_SLOW,
          t
        )
      } else {
        webgl.orbitControls.autoRotateSpeed = -ROTATE_SPEED_SLOW
      }
    })
  }

  // add any "WebGL components" here...
  const ephebe = Ephebe(webgl)
  webgl.scene.add(ephebe)
  const hills = new Hills(webgl)
  webgl.scene.add(hills)
  const reflection = new Reflection(webgl, { reflected: ephebe })
  webgl.scene.add(reflection)

  // scene background
  webgl.scene.background = assets.get(envmapKey)

  // postprocessing
  const bloomEffect = new BloomEffect({
    blendFunction: BlendFunction.ADD,
    kernelSize: KernelSize.LARGE,
    luminanceThreshold: 0.4,
    luminanceSmoothing: 0.15,
    height: 480,
  })

  const vignetteEffect = new VignetteEffect()

  const smaaEffect = await SMAAEffect()

  webgl.composer.addPass(new EffectPass(webgl.camera, smaaEffect, bloomEffect, vignetteEffect))

  // start animation loop
  webgl.start()

  // enable webxr
  isARSupported(webgl.renderer.xr).then((isSupported) => {
    if (!isSupported) {
      return
    }

    const EPHEBE_XR_SCALE = 0.1

    const button = document.querySelector('#ar-button')
    const ui = document.querySelector('#ar-ui')
    const closeButton = ui.querySelector('#ar-close-button')

    const mainScene = webgl.scene
    const xrScene = new THREE.Scene()

    const xrstate = new XRState(webgl)
    xrScene.add(xrstate)

    const shadow = new ContactShadow(webgl, {
      object: ephebe,
      resolution: 256,
      width: 2.6 * EPHEBE_XR_SCALE,
      height: 2.6 * EPHEBE_XR_SCALE,
      depth: 0.3 * EPHEBE_XR_SCALE,
    })

    // reveal the button after the camera transition
    button.style.display = 'block'
    if (window.DEBUG) {
      button.style.opacity = 1
    } else {
      setTimeout(() => {
        button.style.opacity = 1
      }, (webgl.time + DOLLY_DELAY + DOLLY_DURATION) * 1000)
    }

    // add the debug panel also in AR
    if (window.DEBUG) {
      ui.appendChild(webgl.stats.dom)
      // move them down a bit,
      // some phones have round corners
      const fpsCanvases = [...webgl.stats.dom.children]
      fpsCanvases.forEach((fpsCanvas) => {
        fpsCanvas.style.top = '1rem'
      })
    }

    button.addEventListener('click', () => {
      requestARSession(webgl.renderer.xr)
        .then((session) => {
          webgl.scene = xrScene
          webgl.orbitControls.enabled = false
          const cameraPosition = webgl.camera.position.clone()
          const ephebePosition = ephebe.position.clone()
          const ephebeScale = ephebe.scale.clone()

          ui.style.display = 'block'

          // add ephebe on first hit test
          xrstate.onFirstHit(() => {
            mainScene.remove(ephebe)
            xrScene.add(ephebe)
            ephebe.position.copy(xrstate.reticle.position)
            ephebe.scale.multiplyScalar(EPHEBE_XR_SCALE)

            xrScene.add(shadow)
            if (window.DEBUG) {
              xrScene.add(shadow.cameraHelper)
            }
            shadow.position.copy(xrstate.reticle.position)
          })

          // set ephebe position on click
          xrstate.onARPointerDown(() => {
            if (!xrstate.isHitting) {
              return
            }

            ephebe.position.copy(xrstate.reticle.position)
            shadow.position.copy(xrstate.reticle.position)
          })

          closeButton.addEventListener('click', () => session.end(), { once: true })
          session.addEventListener('end', () => {
            // TODO test multiple re-enters
            webgl.scene = mainScene
            webgl.orbitControls.enabled = true
            webgl.camera.position.copy(cameraPosition)

            xrstate.reset()

            ui.style.display = 'none'

            xrScene.remove(ephebe)
            mainScene.add(ephebe)
            ephebe.position.copy(ephebePosition)
            ephebe.scale.copy(ephebeScale)

            xrScene.remove(shadow)
            if (window.DEBUG) {
              xrScene.remove(shadow.cameraHelper)
            }
          })
        })
        .catch(() => {
          // the user declined the popup!
          // do nothing
        })
    })
  })
})
