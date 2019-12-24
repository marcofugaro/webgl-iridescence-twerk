import * as THREE from 'three'
import iridescenceFrag from './shaders/iridescence.frag'
import { normalMaterialGlobalvertPos } from '../lib/three-utils'
import { noise } from '../lib/utils'

const PLANE_WIDTH = 20
const PLANE_DETAIL = 256

const center = new THREE.Vector2(0, 0)

export class Hills extends THREE.Group {
  constructor({ webgl, ...options }) {
    super(options)
    this.webgl = webgl

    const { powerFactor, speed, multiplicator, firstColor, secondColor } = this.webgl.controls.hills

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
      if (controls['hills.powerFactor']) {
        this.material.uniforms.powerFactor.value = controls['hills.powerFactor'].value
      }
      if (controls['hills.speed']) {
        this.material.uniforms.speed.value = controls['hills.speed'].value
      }
      if (controls['hills.multiplicator']) {
        this.material.uniforms.multiplicator.value = controls['hills.multiplicator'].value
      }
      if (controls['hills.firstColor']) {
        this.material.uniforms.firstColor.value = new THREE.Color(
          controls['hills.firstColor'].value
        )
      }
      if (controls['hills.secondColor']) {
        this.material.uniforms.secondColor.value = new THREE.Color(
          controls['hills.secondColor'].value
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
