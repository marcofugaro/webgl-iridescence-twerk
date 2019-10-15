import * as THREE from 'three'
import assets from '../lib/AssetManager'
import iridescenceVert from './shaders/iridescence.vert'
import iridescenceFrag from './shaders/iridescence.frag'

const suzanneKey = assets.queue({
  url: 'assets/ephebe.glb',
  type: 'gltf',
})

export class Ephebe extends THREE.Group {
  constructor({ webgl, ...options }) {
    super(options)
    this.webgl = webgl

    const gltf = assets.get(suzanneKey)
    const scene = gltf.scene.clone()
    this.add(scene)
    scene.traverse(child => {
      if (child.isMesh) {
        this.ephebe = child
      }
    })

    this.ephebe.material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        powerFactor: { value: this.webgl.controls.powerFactor },
        speed: { value: this.webgl.controls.speed },
        multiplicator: { value: this.webgl.controls.multiplicator },
      },
      vertexShader: iridescenceVert,
      fragmentShader: iridescenceFrag,
    })

    this.ephebe.scale.multiplyScalar(0.2)
  }

  update(dt, time) {
    // this.rotation.y += dt * 0.1

    this.ephebe.material.uniforms.time.value = time
    this.ephebe.material.uniforms.powerFactor.value = this.webgl.controls.powerFactor
    this.ephebe.material.uniforms.speed.value = this.webgl.controls.speed
    this.ephebe.material.uniforms.multiplicator.value = this.webgl.controls.multiplicator
  }
}
