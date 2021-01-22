// a modified version of https://github.com/mrdoob/three.js/blob/dev/examples/jsm/objects/Reflector.js
// adapted to work with https://github.com/vanruesc/postprocessing

import {
  Color,
  LinearFilter,
  MathUtils,
  Matrix4,
  Mesh,
  PerspectiveCamera,
  Plane,
  RGBAFormat,
  ShaderMaterial,
  UniformsUtils,
  Vector3,
  Vector4,
  WebGLRenderTarget,
} from 'three'
import { SavePass, RenderPass, LambdaPass } from 'postprocessing'

const ReflectorShader = {
  uniforms: {
    color: { value: null },
    tDiffuse: { value: null },
    textureMatrix: { value: null },
  },

  vertexShader: /* glsl */ `
    uniform mat4 textureMatrix;
    varying vec4 vUv;

    void main() {
      vUv = textureMatrix * vec4(position, 1.0);

      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */ `
    uniform vec3 color;
    uniform sampler2D tDiffuse;
    varying vec4 vUv;

    float blendOverlay(float base, float blend) {
      return(base < 0.5 ? (2.0 * base * blend) : (1.0 - 2.0 * (1.0 - base) * (1.0 - blend)));
    }

    vec3 blendOverlay(vec3 base, vec3 blend) {
      return vec3(blendOverlay(base.r, blend.r), blendOverlay(base.g, blend.g), blendOverlay(base.b, blend.b));
    }

    void main() {
      vec4 base = texture2DProj(tDiffuse, vUv);
      gl_FragColor = vec4(blendOverlay(base.rgb, color), base.a);
    }
  `,
}

class ReflectorPostprocessing extends Mesh {
  constructor(geometry, options = {}) {
    super(geometry)

    this.type = 'Reflector'

    const { renderer, scene, camera, composer } = options

    const color = options.color !== undefined ? new Color(options.color) : new Color(0x7f7f7f)
    const textureWidth = options.textureWidth || 512
    const textureHeight = options.textureHeight || 512
    const clipBias = options.clipBias || 0

    //

    const reflectorPlane = new Plane()
    const normal = new Vector3()
    const reflectorWorldPosition = new Vector3()
    const cameraWorldPosition = new Vector3()
    const rotationMatrix = new Matrix4()
    const lookAtPosition = new Vector3(0, 0, -1)
    const clipPlane = new Vector4()

    const view = new Vector3()
    const target = new Vector3()
    const q = new Vector4()

    const textureMatrix = new Matrix4()
    const virtualCamera = new PerspectiveCamera()

    const renderTarget = new WebGLRenderTarget(textureWidth, textureHeight, {
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      format: RGBAFormat,
      encoding: renderer.outputEncoding,
    })
    this.renderTarget = renderTarget

    if (!MathUtils.isPowerOfTwo(textureWidth) || !MathUtils.isPowerOfTwo(textureHeight)) {
      renderTarget.texture.generateMipmaps = false
    }

    const shader = options.shader || ReflectorShader
    const material = new ShaderMaterial({
      uniforms: UniformsUtils.clone(shader.uniforms),
      fragmentShader: shader.fragmentShader,
      vertexShader: shader.vertexShader,
      transparent: true,
    })

    material.uniforms.tDiffuse.value = renderTarget.texture
    material.uniforms.color.value = color
    material.uniforms.textureMatrix.value = textureMatrix

    this.material = material

    let currentBackgroundAlpha
    let currentXrEnabled
    let currentShadowAutoUpdate
    const onBeforeRender = () => {
      reflectorWorldPosition.setFromMatrixPosition(this.matrixWorld)
      cameraWorldPosition.setFromMatrixPosition(camera.matrixWorld)

      rotationMatrix.extractRotation(this.matrixWorld)

      normal.set(0, 0, 1)
      normal.applyMatrix4(rotationMatrix)

      view.subVectors(reflectorWorldPosition, cameraWorldPosition)

      // Avoid rendering when reflector is facing away

      if (view.dot(normal) > 0) return

      view.reflect(normal).negate()
      view.add(reflectorWorldPosition)

      rotationMatrix.extractRotation(camera.matrixWorld)

      lookAtPosition.set(0, 0, -1)
      lookAtPosition.applyMatrix4(rotationMatrix)
      lookAtPosition.add(cameraWorldPosition)

      target.subVectors(reflectorWorldPosition, lookAtPosition)
      target.reflect(normal).negate()
      target.add(reflectorWorldPosition)

      virtualCamera.position.copy(view)
      virtualCamera.up.set(0, 1, 0)
      virtualCamera.up.applyMatrix4(rotationMatrix)
      virtualCamera.up.reflect(normal)
      virtualCamera.lookAt(target)

      virtualCamera.far = camera.far // Used in WebGLBackground

      virtualCamera.updateMatrixWorld()
      virtualCamera.projectionMatrix.copy(camera.projectionMatrix)

      // Update the texture matrix
      textureMatrix.set(
        0.5,
        0.0,
        0.0,
        0.5,
        0.0,
        0.5,
        0.0,
        0.5,
        0.0,
        0.0,
        0.5,
        0.5,
        0.0,
        0.0,
        0.0,
        1.0
      )
      textureMatrix.multiply(virtualCamera.projectionMatrix)
      textureMatrix.multiply(virtualCamera.matrixWorldInverse)
      textureMatrix.multiply(this.matrixWorld)

      // Now update projection matrix with new clip plane, implementing code from: http://www.terathon.com/code/oblique.html
      // Paper explaining this technique: http://www.terathon.com/lengyel/Lengyel-Oblique.pdf
      reflectorPlane.setFromNormalAndCoplanarPoint(normal, reflectorWorldPosition)
      reflectorPlane.applyMatrix4(virtualCamera.matrixWorldInverse)

      clipPlane.set(
        reflectorPlane.normal.x,
        reflectorPlane.normal.y,
        reflectorPlane.normal.z,
        reflectorPlane.constant
      )

      const projectionMatrix = virtualCamera.projectionMatrix

      q.x = (Math.sign(clipPlane.x) + projectionMatrix.elements[8]) / projectionMatrix.elements[0]
      q.y = (Math.sign(clipPlane.y) + projectionMatrix.elements[9]) / projectionMatrix.elements[5]
      q.z = -1.0
      q.w = (1.0 + projectionMatrix.elements[10]) / projectionMatrix.elements[14]

      // Calculate the scaled plane vector
      clipPlane.multiplyScalar(2.0 / clipPlane.dot(q))

      // Replacing the third row of the projection matrix
      projectionMatrix.elements[2] = clipPlane.x
      projectionMatrix.elements[6] = clipPlane.y
      projectionMatrix.elements[10] = clipPlane.z + 1.0 - clipBias
      projectionMatrix.elements[14] = clipPlane.w

      this.visible = false

      // Render
      // const currentRenderTarget = renderer.getRenderTarget()

      currentXrEnabled = renderer.xr.enabled
      currentShadowAutoUpdate = renderer.shadowMap.autoUpdate

      renderer.xr.enabled = false // Avoid camera modification
      renderer.shadowMap.autoUpdate = false // Avoid re-computing shadows

      // renderer.setRenderTarget(renderTarget)

      renderer.state.buffers.depth.setMask(true) // make sure the depth buffer is writable so it can be properly cleared, see #18897

      // if (renderer.autoClear === false) renderer.clear()
      // renderer.render(options.scene || scene, virtualCamera)

      // renderer.setRenderTarget(currentRenderTarget)
    }

    const onAfterRender = () => {
      this.visible = true

      // renderer.setClearAlpha(currentBackgroundAlpha)

      renderer.xr.enabled = currentXrEnabled
      renderer.shadowMap.autoUpdate = currentShadowAutoUpdate

      // Restore viewport
      const viewport = camera.viewport
      if (viewport !== undefined) {
        renderer.state.viewport(viewport)
      }
    }

    const lambdaPassBefore = new LambdaPass(onBeforeRender)
    const renderPass = new RenderPass(scene, virtualCamera)
    const savePass = new SavePass(renderTarget)
    const lambdaPassAfter = new LambdaPass(onAfterRender)

    material.uniforms.tDiffuse.value = savePass.renderTarget.texture

    composer.addPass(lambdaPassBefore, 0)
    composer.addPass(renderPass, 1)
    composer.addPass(savePass, 2)
    composer.addPass(lambdaPassAfter, 3)
  }
}

export { ReflectorPostprocessing }
