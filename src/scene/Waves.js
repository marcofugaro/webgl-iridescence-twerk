import * as THREE from 'three'
import iridescenceFrag from './shaders/iridescence.frag'
import { normalMaterialGlobalvertPos } from '../lib/three-utils'

const PLANE_WIDTH = 20

export class Waves extends THREE.Group {
  constructor({ webgl, ...options }) {
    super(options)
    this.webgl = webgl

    this.material = new THREE.ShaderMaterial({
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

    const geometry = new THREE.PlaneBufferGeometry(PLANE_WIDTH, PLANE_WIDTH, 64, 64)

    console.log(geometry)

    const vertices = geometry.attributes.position.array
    for (let i = 0; i < vertices.length; i += 3) {
      const x = i
      const y = i + 1
      const z = i + 2

      vertices[z] += Math.sin(((vertices[x] + PLANE_WIDTH / 2) / PLANE_WIDTH) * 22)
    }

    geometry.attributes.position.needsUpdate = true
    geometry.computeVertexNormals()

    const mesh = new THREE.Mesh(geometry, this.material)

    mesh.rotateX(-Math.PI / 2)
    mesh.position.y = -0.001
    this.add(mesh)
  }

  update(dt, time) {
    this.material.uniforms.time.value = time
    this.material.uniforms.powerFactor.value = this.webgl.controls.powerFactor
    this.material.uniforms.speed.value = this.webgl.controls.speed
    this.material.uniforms.multiplicator.value = this.webgl.controls.multiplicator
    this.material.uniforms.firstColor.value = new THREE.Color(this.webgl.controls.firstColor)
    this.material.uniforms.secondColor.value = new THREE.Color(this.webgl.controls.secondColor)
    this.material.uniforms.showAllColors.value = Number(this.webgl.controls.showAllColors)
  }
}
