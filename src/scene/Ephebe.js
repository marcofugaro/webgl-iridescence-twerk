import * as THREE from 'three'
import glsl from 'glslify'
import assets from '../lib/AssetManager'
import { wireUniform } from '../lib/Controls'
import { addUniforms, customizeVertexShader, customizeFragmentShader } from '../lib/customizeShader'

const ephebeKey = assets.queue({
  url: 'assets/ephebe_twerking.glb',
  type: 'gltf',
})

const envmapKey = assets.queue({
  url: 'assets/envMaps/49TH_STREET.exr',
  type: 'envmap',
  pmrem: true,
})

export function Ephebe(webgl, options = {}) {
  const gltf = assets.get(ephebeKey)
  // BUG gltf.scene.clone() doesn't clone skinning
  const scene = gltf.scene
  let ephebe
  scene.traverse((child) => {
    if (child.isMesh) {
      ephebe = child
    }
  })

  // do not make it disappear when camera is close
  ephebe.frustumCulled = false

  const mixer = new THREE.AnimationMixer(scene)
  const clip = gltf.animations[0]
  mixer.clipAction(clip).play()

  ephebe.material = new THREE.MeshPhysicalMaterial({
    skinning: true,
    roughness: 0.25,
    metalness: 1,
    envMap: assets.get(envmapKey),
  })

  addUniforms(ephebe.material, {
    time: { value: 0 },
    // powerFactor: { value: webgl.controls.ephebe.powerFactor },
    // multiplicator: { value: webgl.controls.ephebe.multiplicator },
    powerFactor: wireUniform(ephebe.material, () => webgl.controls.ephebe.powerFactor),
    multiplicator: wireUniform(ephebe.material, () => webgl.controls.ephebe.multiplicator),
  })

  customizeVertexShader(ephebe.material, {
    head: glsl`
      out vec3 vTransformed;
    `,
    // after skinning, export the position in world space
    '#include <skinning_vertex>': glsl`
      #include <skinning_vertex>

      vTransformed = vec3(modelMatrix * vec4(transformed, 1.0));
    `,
    // like MeshNormalMaterial, but the normals are relative to world not camera
    // transformedNormal is later outputted to the fragment shader as vNormal
    transformedNormal: glsl`
      transformedNormal = mat3(modelMatrix) * objectNormal;
    `,
  })

  customizeFragmentShader(ephebe.material, {
    head: glsl`
      uniform float time;
      uniform float powerFactor;
      uniform float multiplicator;

      in vec3 vTransformed;

      #pragma glslify: hsl2rgb = require(glsl-hsl2rgb)
      #pragma glslify: blendOverlay = require(glsl-blend/overlay)
    `,
    main: glsl`
      vec3 cameraDirection = normalize(cameraPosition - vTransformed);

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

  webgl.onUpdate((dt) => {
    mixer.update(dt)

    ephebe.material.uniforms.time.value += dt * webgl.controls.ephebe.speed
  })

  return scene
}
