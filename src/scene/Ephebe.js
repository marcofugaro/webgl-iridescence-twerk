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
    const ephebe = gltf.scene.clone()

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        powerFactor: { value: this.webgl.controls.powerFactor },
        speed: { value: this.webgl.controls.speed },
        multiplicator: { value: this.webgl.controls.multiplicator },
      },
      vertexShader: iridescenceVert,
      fragmentShader: iridescenceFrag,
    })

    // apply the material to the model
    ephebe.traverse(child => {
      if (child.isMesh) {
        child.material = material
      }
    })

    ephebe.scale.multiplyScalar(0.2)
    ephebe.position.y = -1

    this.add(ephebe)
  }

  update(dt, time) {
    // this.rotation.y += dt * 0.1

    this.traverse(child => {
      if (child.isMesh) {
        child.material.uniforms.time.value = time
        child.material.uniforms.powerFactor.value = this.webgl.controls.powerFactor
        child.material.uniforms.speed.value = this.webgl.controls.speed
        child.material.uniforms.multiplicator.value = this.webgl.controls.multiplicator
      }
    })
  }
}
