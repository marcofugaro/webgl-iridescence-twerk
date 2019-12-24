import * as THREE from 'three'
import assets from '../lib/AssetManager'
import iridescenceAllColorsFrag from './shaders/iridescence-all-colors.frag'
import { normalMaterialGlobalvertPos } from '../lib/three-utils'

const key = assets.queue({
  url: 'assets/ephebe_twerking.glb',
  type: 'gltf',
})

export class Ephebe extends THREE.Group {
  constructor({ webgl, ...options }) {
    super(options)
    this.webgl = webgl

    const gltf = assets.get(key)
    // BUG gltf.scene.clone() doesn't clone .skinning
    const scene = gltf.scene
    scene.traverse(child => {
      if (child.isMesh) {
        this.ephebe = child
      }
    })

    this.mixer = new THREE.AnimationMixer(scene)
    const clip = gltf.animations[0].clone()
    this.mixer.clipAction(clip).play()

    const { powerFactor, speed, multiplicator } = this.webgl.controls.ephebe

    this.ephebe.material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        powerFactor: { value: powerFactor },
        speed: { value: speed },
        multiplicator: { value: multiplicator },
      },
      vertexShader: normalMaterialGlobalvertPos,
      fragmentShader: iridescenceAllColorsFrag,
    })
    this.ephebe.material.skinning = true

    this.webgl.controls.$onChanges(controls => {
      if (controls['ephebe.powerFactor']) {
        this.ephebe.material.uniforms.powerFactor.value = controls['ephebe.powerFactor'].value
      }
      if (controls['ephebe.speed']) {
        this.ephebe.material.uniforms.speed.value = controls['ephebe.speed'].value
      }
      if (controls['ephebe.multiplicator']) {
        this.ephebe.material.uniforms.multiplicator.value = controls['ephebe.multiplicator'].value
      }
    })

    scene.scale.multiplyScalar(0.25)
    scene.rotateY(Math.PI)
    scene.translateX(-0.1)

    this.add(scene)
  }

  update(dt, time) {
    this.mixer.update(dt)

    this.ephebe.material.uniforms.time.value = time
  }
}
