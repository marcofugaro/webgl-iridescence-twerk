import * as THREE from 'three'
import assets from '../lib/AssetManager'
import iridescenceFrag from './shaders/iridescence.frag'
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

    this.ephebe.material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        powerFactor: { value: this.webgl.controls.powerFactor },
        speed: { value: this.webgl.controls.speed },
        multiplicator: { value: this.webgl.controls.multiplicator },
        firstColor: { type: 'c', value: new THREE.Color(this.webgl.controls.firstColor) },
        secondColor: { type: 'c', value: new THREE.Color(this.webgl.controls.secondColor) },
        showAllColors: { value: Number(this.webgl.controls.showAllColors) },
      },
      vertexShader: normalMaterialGlobalvertPos,
      fragmentShader: iridescenceFrag,
    })
    this.ephebe.material.skinning = true

    scene.scale.multiplyScalar(0.25)
    scene.rotateY(Math.PI)
    scene.translateX(-0.1)

    this.add(scene)
  }

  update(dt, time) {
    // this.rotation.y += dt * 0.1
    this.mixer.update(dt)

    this.ephebe.material.uniforms.time.value = time
    this.ephebe.material.uniforms.powerFactor.value = this.webgl.controls.powerFactor
    this.ephebe.material.uniforms.speed.value = this.webgl.controls.speed
    this.ephebe.material.uniforms.multiplicator.value = this.webgl.controls.multiplicator
    this.ephebe.material.uniforms.firstColor.value = new THREE.Color(this.webgl.controls.firstColor)
    this.ephebe.material.uniforms.secondColor.value = new THREE.Color(
      this.webgl.controls.secondColor
    )
    this.ephebe.material.uniforms.showAllColors.value = Number(this.webgl.controls.showAllColors)
  }
}
