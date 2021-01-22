import * as THREE from 'three'
import glsl from 'glslify'
import { ReflectorPostprocessing } from '../lib/ReflectorPostprocessing'

export class Reflection extends THREE.Group {
  constructor(webgl, options = {}) {
    super(options)
    this.webgl = webgl
    this.options = options

    const geometry = new THREE.CircleBufferGeometry(2, 32)
    const groundMirror = new ReflectorPostprocessing(geometry, {
      scene: options.reflected || webgl.scene,
      renderer: webgl.renderer,
      camera: webgl.camera,
      composer: webgl.composer,
      textureWidth: webgl.width,
      textureHeight: webgl.height,
      shader: {
        uniforms: {
          color: { value: null },
          tDiffuse: { value: null },
          textureMatrix: { value: null },
        },

        vertexShader: glsl`
          uniform mat4 textureMatrix;
          varying vec4 vUvProj;
          varying vec2 vUv;

          void main() {
            vUv = uv;
            vUvProj = textureMatrix * vec4(position, 1.0);

            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: glsl`
          uniform sampler2D tDiffuse;
          varying vec4 vUvProj;
          varying vec2 vUv;

          #pragma glslify: ease = require(glsl-easings/quartic-out)

          void main() {
            vec4 base = texture2DProj(tDiffuse, vUvProj);

            gl_FragColor.xyz = base.rgb;

            // fade out
            vec2 center = vec2(0.5);
            float distanceFactor = 1.2;
            float startOpacity = 0.8;
            float fadeOut = ease(min(distance(center, vUv) * 2.0 * distanceFactor, 1.0));
            gl_FragColor.a = mix(base.a * startOpacity, 0.0, fadeOut);
          }
        `,
      },
    })

    groundMirror.position.y = 0.15
    groundMirror.rotateX(-Math.PI / 2)
    this.add(groundMirror)
  }
}
