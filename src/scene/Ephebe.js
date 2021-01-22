import * as THREE from 'three'
import glsl from 'glslify'
import assets from '../lib/AssetManager'
import { wireUniform } from '../lib/Controls'
import { addUniforms, customizeVertexShader, customizeFragmentShader } from '../lib/customizeShader'

const ephebeKey = assets.queue({
  url: 'assets/ephebe_twerking.glb',
  type: 'gltf',
})

// TODO check if file is duped
// and check options
const envmapKey = assets.queue({
  url: 'assets/envMaps/49TH_STREET.exr',
  type: 'envmap',
  pmrem: true,
})

export class Ephebe extends THREE.Group {
  constructor(webgl, options = {}) {
    super(options)
    this.webgl = webgl
    this.options = options

    const gltf = assets.get(ephebeKey)
    // BUG gltf.scene.clone() doesn't clone skinning
    const scene = gltf.scene
    scene.traverse((child) => {
      if (child.isMesh) {
        this.ephebe = child
      }
    })

    this.mixer = new THREE.AnimationMixer(scene)
    const clip = gltf.animations[0].clone()
    this.mixer.clipAction(clip).play()

    this.ephebe.material = new THREE.MeshPhysicalMaterial({
      skinning: true,
      roughness: 0.25,
      metalness: 1,
      envMap: assets.get(envmapKey),
    })

    addUniforms(this.ephebe.material, {
      time: { value: 0 },
      // powerFactor: { value: this.webgl.controls.ephebe.powerFactor },
      // multiplicator: { value: this.webgl.controls.ephebe.multiplicator },
      powerFactor: wireUniform(this.ephebe.material, () => this.webgl.controls.ephebe.powerFactor),
      multiplicator: wireUniform(
        this.ephebe.material,
        () => this.webgl.controls.ephebe.multiplicator
      ),
    })

    customizeVertexShader(this.ephebe.material, {
      head: glsl`
        out vec3 vPosition;
      `,
      main: glsl`
        vPosition = position;
      `,
      // like MeshNormalMaterial, but the normals are relative to world not camera
      transformedNormal: glsl`
        transformedNormal = mat3(modelMatrix) * objectNormal;
      `,
    })

    customizeFragmentShader(this.ephebe.material, {
      head: glsl`
        uniform float time;
        uniform float powerFactor;
        uniform float multiplicator;

        in vec3 vPosition;

        #pragma glslify: hsl2rgb = require(glsl-hsl2rgb)
        #pragma glslify: blendOverlay = require(glsl-blend/overlay)
      `,
      main: glsl`
        // The camera sometimes would be too close to the position,
        // so the vector would point to the negative position.
        // Multiplicating the camera position by a big number fixes it.
        vec3 cameraDirection = normalize(cameraPosition * 1000.0 - vPosition);

        // 1 when facing the camera, 0 when perpendicular
        float fresnel = dot(vNormal, cameraDirection);

        float iridescence = pow(fresnel, powerFactor) * multiplicator;

        // circle the whole hue wheel,
        // the function looks like this /|/|/|/|/
        float f = mod(iridescence + time, 1.0);

        vec3 iridescentColor = hsl2rgb(f, 1.0, 0.5);
      `,
      diffuse: glsl`
        diffuse = iridescentColor;
      `,
      // blend it again on top of all the lighting with
      // overlay blend mode
      gl_FragColor: glsl`
        gl_FragColor.rgb = blendOverlay(gl_FragColor.rgb, iridescentColor);
      `,
    })

    scene.scale.multiplyScalar(0.25)
    scene.rotateY(Math.PI)
    scene.translateX(-0.1)
    scene.translateY(0.15)

    this.add(scene)
  }

  update(dt, time) {
    this.mixer.update(dt)

    this.ephebe.material.uniforms.time.value += dt * this.webgl.controls.ephebe.speed
  }
}
