import * as THREE from 'three'
import { HorizontalBlurShader } from 'three/examples/jsm/shaders/HorizontalBlurShader'
import { VerticalBlurShader } from 'three/examples/jsm/shaders/VerticalBlurShader'
import depthVert from 'three/src/renderers/shaders/ShaderLib/depth_vert.glsl'
import depthFrag from 'three/src/renderers/shaders/ShaderLib/depth_frag.glsl'

// adapted from
// https://twitter.com/mrdoob/status/1104209387738980352

const PLANE_WIDTH = 3
const CAMERA_HEIGHT = PLANE_WIDTH * 0.4
const BLUR_AMOUNT = 0.3
const OPACITY_AMOUNT = 0.5

export class SoftShadowFloor extends THREE.Group {
  constructor({ webgl, ...options }) {
    super(options)
    this.webgl = webgl

    this.renderTarget = new THREE.WebGLRenderTarget(512, 512)
    this.renderTarget.texture.generateMipmaps = false

    this.renderTarget2 = new THREE.WebGLRenderTarget(512, 512)
    this.renderTarget2.texture.generateMipmaps = false

    const geometry = new THREE.PlaneGeometry(PLANE_WIDTH, PLANE_WIDTH).rotateX(Math.PI / 2)
    const material = new THREE.MeshBasicMaterial({
      map: this.renderTarget.texture,
      // dim the shadow here
      opacity: OPACITY_AMOUNT,
      transparent: true,
    })

    this.plane = new THREE.Mesh(geometry, material)
    this.plane.scale.y = -1
    this.add(this.plane)

    this.shadowCamera = new THREE.OrthographicCamera(
      -PLANE_WIDTH / 2,
      PLANE_WIDTH / 2,
      PLANE_WIDTH / 2,
      -PLANE_WIDTH / 2,
      CAMERA_HEIGHT,
      0
    )

    this.shadowCamera.rotation.x = Math.PI / 2
    this.add(this.shadowCamera)

    if (window.DEBUG) {
      this.add(new THREE.CameraHelper(this.shadowCamera))
    }

    // like MeshDepthMaterial, but with alpha in place of white
    this.depthMaterial = new THREE.ShaderMaterial({
      vertexShader: depthVert,
      fragmentShader: `#define DEPTH_PACKING 3200
      `.concat(
          depthFrag.replace(
            'gl_FragColor = vec4( vec3( 1.0 - gl_FragCoord.z ), opacity );',
            `gl_FragColor = vec4(vec3(0.0), 1.0 - gl_FragCoord.z);`
          )
        ),
    })
    this.depthMaterial.depthTest = false
    this.depthMaterial.depthWrite = false
    this.depthMaterial.side = THREE.FrontSide
    this.depthMaterial.skinning = true

    this.depthBackground = new THREE.Color(this.webgl.controls.background)
    this.webgl.controls.$onChanges(() => {
      this.depthBackground = new THREE.Color(this.webgl.controls.background)
    })

    this.blurCamera = new THREE.OrthographicCamera(
      -PLANE_WIDTH / 2,
      PLANE_WIDTH / 2,
      PLANE_WIDTH / 2,
      -PLANE_WIDTH / 2,
      0,
      PLANE_WIDTH
    )
    this.blurCamera.rotation.x = Math.PI / 2

    this.blurHMaterial = new THREE.ShaderMaterial(HorizontalBlurShader)
    this.blurHMaterial.uniforms.tDiffuse = {
      value: this.renderTarget.texture,
    }
    this.blurHMaterial.depthTest = false

    this.blurVMaterial = new THREE.ShaderMaterial(VerticalBlurShader)
    this.blurVMaterial.uniforms.tDiffuse = {
      value: this.renderTarget.texture,
    }
    this.blurVMaterial.depthTest = false

    this.plane2 = new THREE.Mesh(geometry, this.blurHMaterial)
  }

  blurShadow = amount => {
    const kernel = 1.0 / (amount * 256.0)

    this.blurHMaterial.uniforms.h = {
      value: kernel,
    }

    this.plane2.material = this.blurHMaterial
    this.plane2.material.uniforms.tDiffuse.value = this.renderTarget.texture

    this.webgl.renderer.setRenderTarget(this.renderTarget2)
    this.webgl.renderer.render(this.plane2, this.blurCamera)

    this.blurVMaterial.uniforms.v = {
      value: kernel,
    }

    this.plane2.material = this.blurVMaterial
    this.plane2.material.uniforms.tDiffuse.value = this.renderTarget2.texture

    this.webgl.renderer.setRenderTarget(this.renderTarget)
    this.webgl.renderer.render(this.plane2, this.blurCamera)
  }

  update(dt, time) {
    const currentBackground = this.webgl.scene.background

    this.plane.visible = false
    this.webgl.scene.background = null
    this.webgl.scene.overrideMaterial = this.depthMaterial

    //  clear all
    this.webgl.renderer.autoClear = false
    this.webgl.renderer.setClearColor(this.depthBackground)
    this.webgl.renderer.setRenderTarget(this.renderTarget2)
    this.webgl.renderer.clear()
    this.webgl.renderer.setRenderTarget(this.renderTarget)
    this.webgl.renderer.clear()

    // render
    this.webgl.renderer.render(this.webgl.scene, this.shadowCamera)
    this.blurShadow(BLUR_AMOUNT)

    // reset
    this.webgl.renderer.setRenderTarget(null)
    this.webgl.renderer.autoClear = true

    this.webgl.scene.background = currentBackground
    this.webgl.scene.overrideMaterial = null

    this.plane.visible = true
  }
}
