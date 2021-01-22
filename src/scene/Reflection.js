import * as THREE from 'three'
import glsl from 'glslify'
import { Reflector } from '../lib/Reflector'

export class Reflection extends THREE.Group {
  constructor(webgl, options = {}) {
    super(options)
    this.webgl = webgl
    this.options = options

    const geometry = new THREE.CircleBufferGeometry(2, 32)
    const groundMirror = new Reflector(geometry, {
      textureWidth: webgl.width,
      textureHeight: webgl.height,
      scene: options.reflected,
      backgroundAlpha: 0,
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

          void main() {
            vec4 base = texture2DProj(tDiffuse, vUvProj);

            gl_FragColor.xyz = base.rgb;

            vec2 center = vec2(0.5);
            float distanceFactor = 1.5;
            float startOpacity = 0.4;
            gl_FragColor.a = mix(base.a * startOpacity, 0.0, distance(center, vUv) * 2.0 * distanceFactor);
          }
        `,
      },
    })

    groundMirror.position.y = 0.15
    groundMirror.rotateX(-Math.PI / 2)
    this.add(groundMirror)
  }
}
