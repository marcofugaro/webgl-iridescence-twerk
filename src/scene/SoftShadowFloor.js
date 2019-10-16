import * as THREE from 'three'
import { HorizontalBlurShader } from 'three/examples/jsm/shaders/HorizontalBlurShader'
import { VerticalBlurShader } from 'three/examples/jsm/shaders/VerticalBlurShader'
import { PLANE_WIDTH } from '../constants'

// taken directly from
// https://twitter.com/mrdoob/status/1104209387738980352

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
      // opacity: 0.3,
      // transparent: true,
    })

    this.plane = new THREE.Mesh(geometry, material)
    this.plane.scale.y = -1
    this.add(this.plane)

    this.shadowCamera = new THREE.OrthographicCamera(
      -PLANE_WIDTH / 2,
      PLANE_WIDTH / 2,
      PLANE_WIDTH / 2,
      -PLANE_WIDTH / 2,
      0,
      PLANE_WIDTH
    )
    this.shadowCamera.rotation.x = Math.PI / 2
    this.add(this.shadowCamera)

    // this.add(new THREE.CameraHelper(this.shadowCamera))

    this.clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0.3)

    this.depthMaterial = new THREE.MeshBasicMaterial()
    this.depthMaterial.clippingPlanes = [this.clipPlane]
    this.depthMaterial.depthTest = false
    this.depthMaterial.depthWrite = false
    this.depthMaterial.side = THREE.FrontSide

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

    this.webgl.renderer.autoClear = false
    this.webgl.renderer.setClearColor(this.depthBackground)
    this.webgl.renderer.setRenderTarget(this.renderTarget2)
    this.webgl.renderer.clear()
    this.webgl.renderer.setRenderTarget(this.renderTarget)
    this.webgl.renderer.clear()

    const quality = 10
    for (let i = 0; i < quality; i++) {
      const j = i / quality
      this.clipPlane.constant = (1 - j) / 3.0
      this.depthMaterial.color.setRGB(1 - j, 1 - j, 1 - j)
      this.webgl.renderer.render(this.webgl.scene, this.shadowCamera)
      this.blurShadow(j)
    }

    this.webgl.renderer.setRenderTarget(null)
    this.webgl.renderer.autoClear = true

    this.webgl.scene.background = currentBackground
    this.webgl.scene.overrideMaterial = null

    this.plane.visible = true
  }
}
