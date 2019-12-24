import * as THREE from 'three'
import iridescenceFrag from './shaders/iridescence.frag'
import { normalMaterialGlobalvertPos } from '../lib/three-utils'
import { noise } from '../lib/utils'

const PLANE_WIDTH = 20
const PLANE_DETAIL = 256

const center = new THREE.Vector2(0, 0)

export class Waves extends THREE.Group {
  constructor({ webgl, ...options }) {
    super(options)
    this.webgl = webgl

    const { powerFactor, speed, multiplicator, firstColor, secondColor } = this.webgl.controls.waves

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        powerFactor: { value: powerFactor },
        speed: { value: speed },
        multiplicator: { value: multiplicator },
        firstColor: { type: 'c', value: new THREE.Color(firstColor) },
        secondColor: { type: 'c', value: new THREE.Color(secondColor) },
      },
      vertexShader: normalMaterialGlobalvertPos,
      fragmentShader: iridescenceFrag,
    })

    this.webgl.controls.$onChanges(controls => {
      if (controls['waves.powerFactor']) {
        this.material.uniforms.powerFactor.value = controls['waves.powerFactor'].value
      }
      if (controls['waves.speed']) {
        this.material.uniforms.speed.value = controls['waves.speed'].value
      }
      if (controls['waves.multiplicator']) {
        this.material.uniforms.multiplicator.value = controls['waves.multiplicator'].value
      }
      if (controls['waves.firstColor']) {
        this.material.uniforms.firstColor.value = new THREE.Color(
          controls['waves.firstColor'].value
        )
      }
      if (controls['waves.secondColor']) {
        this.material.uniforms.secondColor.value = new THREE.Color(
          controls['waves.secondColor'].value
        )
      }
    })

    this.geometry = new THREE.PlaneBufferGeometry(
      PLANE_WIDTH,
      PLANE_WIDTH,
      PLANE_DETAIL,
      PLANE_DETAIL
    )

    this.displace(this.geometry)

    this.mesh = new THREE.Mesh(this.geometry, this.material)

    this.mesh.rotateX(-Math.PI / 2)
    this.add(this.mesh)
  }

  displace(geometry, { time = 0 } = {}) {
    const meshZ = this.mesh?.position?.z ?? 0
    const vertices = geometry.attributes.position.array
    for (let i = 0; i < vertices.length; i += 3) {
      const x = i
      const y = i + 1
      const z = i + 2

      const position = new THREE.Vector2(vertices[x], vertices[y])
      const distance = position.distanceTo(center)

      // const amplitude = distance ** 3 * 0.01
      const amplitude = distance ** 2 * 0.05

      const frequency = 0.4
      const speed = 0.05
      vertices[z] =
        meshZ +
        (noise(vertices[x] * frequency, vertices[y] * frequency, time * speed) * 0.5 + 0.5) *
          amplitude
    }

    geometry.attributes.position.needsUpdate = true
    geometry.computeVertexNormals()
  }

  update(dt, time) {
    this.material.uniforms.time.value = time

    // this.displace(this.geometry, { time })
  }
}
