import * as THREE from 'three'
import { HorizontalBlurShader } from 'three/examples/jsm/shaders/HorizontalBlurShader'
import { VerticalBlurShader } from 'three/examples/jsm/shaders/VerticalBlurShader'
import { addUniforms, customizeFragmentShader } from '../lib/customizeShader'

// adapted from
// https://github.com/mrdoob/three.js/blob/master/examples/webgl_shadow_contact.html

export default class ContactShadow extends THREE.Group {
  constructor(webgl, options = {}) {
    super(options)
    this.webgl = webgl
    this.options = options

    // the object to render with the shadow camera
    this.object = this.options.object

    this.RESOLUTION = options.resolution ?? 512 / 2
    this.PLANE_WIDTH = options.width ?? 2.6 * 0.1
    this.PLANE_HEIGHT = options.height ?? 2.6 * 0.1
    this.CAMERA_DEPTH = options.depth ?? 0.3 * 0.1
    this.BLUR = options.blur ?? 4 // 0 to n
    this.BLUR_SECOND_PASS = options.blurSecondPass ?? this.BLUR * 0.4
    this.DARKNESS = options.darkness ?? 1
    this.OPACITY = options.opacity ?? 1

    // the render target that will show the shadows in the plane texture
    this.renderTarget = new THREE.WebGLRenderTarget(this.RESOLUTION, this.RESOLUTION)

    this.renderTarget.texture.generateMipmaps = false

    // the render target that we will use to blur the first render target
    this.renderTargetBlur = new THREE.WebGLRenderTarget(this.RESOLUTION, this.RESOLUTION)
    this.renderTargetBlur.texture.generateMipmaps = false

    // make a plane and make it face up
    const geometry = new THREE.PlaneBufferGeometry(this.PLANE_WIDTH, this.PLANE_HEIGHT).rotateX(
      Math.PI / 2
    )
    const material = new THREE.MeshBasicMaterial({
      map: this.renderTarget.texture,
      opacity: this.OPACITY,
      transparent: true,
    })
    this.plane = new THREE.Mesh(geometry, material)
    this.add(this.plane)

    // the y from the texture is flipped!
    this.plane.scale.y = -1

    // the plane onto which to blur the texture
    this.blurPlane = new THREE.Mesh(geometry)
    this.add(this.blurPlane)
    this.blurPlane.visible = false

    // the camera to render the depth material from
    this.shadowCamera = new THREE.OrthographicCamera(
      -this.PLANE_WIDTH / 2,
      this.PLANE_WIDTH / 2,
      this.PLANE_HEIGHT / 2,
      -this.PLANE_HEIGHT / 2,
      0,
      this.CAMERA_DEPTH
    )
    this.shadowCamera.rotation.x = Math.PI / 2 // get the camera to look up
    this.add(this.shadowCamera)

    this.cameraHelper = new THREE.CameraHelper(this.shadowCamera)

    // like MeshDepthMaterial, but goes from black to transparent
    this.depthMaterial = new THREE.MeshDepthMaterial()
    this.depthMaterial.skinning = true
    this.depthMaterial.depthTest = false
    this.depthMaterial.depthWrite = false
    addUniforms(this.depthMaterial, {
      darkness: { value: this.DARKNESS },
    })
    customizeFragmentShader(this.depthMaterial, {
      head: /* glsl */ `
        uniform float darkness;
      `,
      'gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );': /* glsl */ `
        gl_FragColor = vec4(vec3(0.0), (1.0 - fragCoordZ) * darkness);
      `,
    })

    this.horizontalBlurMaterial = new THREE.ShaderMaterial(HorizontalBlurShader)
    this.horizontalBlurMaterial.depthTest = false

    this.verticalBlurMaterial = new THREE.ShaderMaterial(VerticalBlurShader)
    this.verticalBlurMaterial.depthTest = false
  }

  // renderTarget --> blurPlane (horizontalBlur) --> renderTargetBlur --> blurPlane (verticalBlur) --> renderTarget -->
  // renderTarget --> blurPlane (horizontalBlur) --> renderTargetBlur --> blurPlane (verticalBlur) --> renderTarget
  blurShadow(amount) {
    const { mapLinear } = THREE.MathUtils

    this.blurPlane.visible = true

    // blur horizontally and draw in the renderTargetBlur
    this.blurPlane.material = this.horizontalBlurMaterial
    this.blurPlane.material.uniforms.tDiffuse.value = this.renderTarget.texture
    this.horizontalBlurMaterial.uniforms.h.value = mapLinear(amount, 0, 1, 0, 1 / 256)

    this.webgl.renderer.setRenderTarget(this.renderTargetBlur)
    this.webgl.renderer.clear()
    this.webgl.renderer.render(this.blurPlane, this.shadowCamera)

    // blur vertically and draw in the main renderTarget
    this.blurPlane.material = this.verticalBlurMaterial
    this.blurPlane.material.uniforms.tDiffuse.value = this.renderTargetBlur.texture
    this.verticalBlurMaterial.uniforms.v.value = mapLinear(amount, 0, 1, 0, 1 / 256)

    this.webgl.renderer.setRenderTarget(this.renderTarget)
    this.webgl.renderer.clear()
    this.webgl.renderer.render(this.blurPlane, this.shadowCamera)

    this.blurPlane.visible = false
  }

  update(dt, time) {
    // remove the background and reset all
    const initialBackground = this.webgl.scene.background
    this.webgl.scene.background = null
    const initialXREnabled = this.webgl.renderer.xr.enabled
    this.webgl.renderer.xr.enabled = false // https://github.com/mrdoob/three.js/issues/18746
    this.cameraHelper.visible = false

    // force the depthMaterial to everything
    // this.webgl.scene.overrideMaterial = this.depthMaterial
    const initialMaterials = {}
    this.object.traverse((child) => {
      if (child.isMesh) {
        initialMaterials[child.id] = child.material
        child.material = this.depthMaterial
      }
    })

    // render in the render target to get the depths
    this.webgl.renderer.setRenderTarget(this.renderTarget)
    this.webgl.renderer.clear()
    this.webgl.renderer.render(this.object, this.shadowCamera)

    // blur the shadow
    this.blurShadow(this.BLUR)

    // a second pass to reduce the square artifacts!
    if (this.BLUR_SECOND_PASS !== 0) {
      this.blurShadow(this.BLUR_SECOND_PASS)
    }

    // and reset the overrided material
    // this.webgl.scene.overrideMaterial = null
    this.object.traverse((child) => {
      if (child.isMesh) {
        child.material = initialMaterials[child.id]
      }
    })

    // reset everything
    this.cameraHelper.visible = true
    this.webgl.scene.background = initialBackground
    this.webgl.renderer.xr.enabled = initialXREnabled
    this.webgl.renderer.setRenderTarget(null)
  }
}
