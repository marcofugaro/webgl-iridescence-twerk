import * as THREE from 'three'
import assets from '../lib/AssetManager'

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

    const material = new THREE.MeshStandardMaterial({
      metalness: 1,
      roughness: 0,
    })

    // apply the material to the model
    ephebe.traverse(child => {
      if (child.isMesh) {
        console.log(material)
        child.material = material
      }
    })

    ephebe.scale.multiplyScalar(0.2)
    ephebe.position.y = -1

    this.add(ephebe)
  }

  update(dt, time) {
    this.rotation.y += dt * 0.1
  }
}

// natural hemisphere light from
// https://threejs.org/examples/#webgl_lights_hemisphere
export function addNaturalLight(webgl) {
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.9)
  // hemiLight.color.setHSL(0.6, 1, 0.6)
  // hemiLight.groundColor.setHSL(0.095, 1, 0.75)
  hemiLight.position.set(0, 50, 0)
  webgl.scene.add(hemiLight)

  const dirLight = new THREE.DirectionalLight(0xffffff, 1)
  // dirLight.color.setHSL(0.1, 1, 0.95)
  dirLight.position.set(3, 5, 1)
  dirLight.position.multiplyScalar(50)
  webgl.scene.add(dirLight)

  dirLight.castShadow = true
  dirLight.shadow.mapSize.width = 2048
  dirLight.shadow.mapSize.height = 2048

  var d = 50
  dirLight.shadow.camera.left = -d
  dirLight.shadow.camera.right = d
  dirLight.shadow.camera.top = d
  dirLight.shadow.camera.bottom = -d
  dirLight.shadow.camera.far = 3500
  dirLight.shadow.bias = -0.0001
}
