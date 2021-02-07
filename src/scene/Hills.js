import * as THREE from 'three'
import glsl from 'glslify'
import assets from '../lib/AssetManager'
import { addUniforms, customizeVertexShader, customizeFragmentShader } from '../lib/customizeShader'
import { wireUniform } from '../lib/Controls'

const SIZE = 20
const RESOLUTION = 256

const envmapKey = assets.queue({
  url: 'assets/envMaps/49TH_STREET.exr',
  type: 'envmap',
  pmrem: true,
})

export class Hills extends THREE.Group {
  constructor(webgl, options = {}) {
    super(options)
    this.webgl = webgl
    this.options = options

    this.material = new THREE.MeshStandardMaterial({
      roughness: 0.2,
      metalness: 1,
      envMap: assets.get(envmapKey),
      envMapIntensity: 0.5,
    })

    // TODO define this api
    // subscribe(webgl.controls.hills.roughness, (value) => {
    //   material.roughness = vaule
    // })

    // which becomes

    // subscribe(material, webgl.controls.hills.roughness)

    // webgl.controlsObservable.hills.roughness.onChange((value) => {
    //   material.roughness = vaule
    // })

    // // which becomes

    // webgl.controlsObservable.hills.roughness.onChange(material)

    addUniforms(this.material, {
      time: { value: 0 },
      timeFixed: { value: 0 },
      // powerFactor: { value: this.webgl.controls.hills.powerFactor },
      // multiplicator: { value: this.webgl.controls.hills.multiplicator },
      powerFactor: wireUniform(this.material, () => this.webgl.controls.hills.powerFactor),
      multiplicator: wireUniform(this.material, () => this.webgl.controls.hills.multiplicator),
      firstColor: wireUniform(this.material, () => this.webgl.controls.hills.firstColor),
      secondColor: wireUniform(this.material, () => this.webgl.controls.hills.secondColor),
    })

    customizeVertexShader(this.material, {
      head: glsl`
        uniform float timeFixed;

        out vec3 vPosition;

        #pragma glslify: noise = require(glsl-noise/simplex/3d)
        #pragma glslify: hypot = require(glsl-hypot)

        // http://lolengine.net/blog/2013/09/21/picking-orthogonal-vector-combing-coconuts
        vec3 orthogonal(vec3 v) {
          return normalize(abs(v.x) > abs(v.z) ? vec3(-v.y, v.x, 0.0)
          : vec3(0.0, -v.z, v.y));
        }

        // the function which defines the displacement
        float frequency = 0.4;
        float speed = 0.05;
        float displace(vec3 point) {
          // distance from center
          float distance = hypot(point.xz);

          float amplitude = pow(distance, 2.0) * 0.05;

          return (noise(vec3(point.xz * frequency, timeFixed * speed)) * 0.5 + 0.5) * amplitude;
        }
      `,
      main: glsl`
        vec3 displacedPosition = position + normal * displace(position);

        float offset = ${SIZE / RESOLUTION};
        vec3 tangent = orthogonal(normal);
        vec3 bitangent = normalize(cross(normal, tangent));
        vec3 neighbour1 = position + tangent * offset;
        vec3 neighbour2 = position + bitangent * offset;
        vec3 displacedNeighbour1 = neighbour1 + normal * displace(neighbour1);
        vec3 displacedNeighbour2 = neighbour2 + normal * displace(neighbour2);

        // https://i.ya-webdesign.com/images/vector-normals-tangent-16.png
        vec3 displacedTangent = displacedNeighbour1 - displacedPosition;
        vec3 displacedBitangent = displacedNeighbour2 - displacedPosition;

        // https://upload.wikimedia.org/wikipedia/commons/d/d2/Right_hand_rule_cross_product.svg
        vec3 displacedNormal = normalize(cross(displacedTangent, displacedBitangent));
      `,
      transformed: glsl`
        transformed = displacedPosition;
        vPosition = transformed;
      `,
      objectNormal: glsl`
        objectNormal = displacedNormal;
      `,
      // like MeshNormalMaterial, but the normals are relative to world not camera
      transformedNormal: glsl`
        transformedNormal = mat3(modelMatrix) * objectNormal;
      `,
    })

    customizeFragmentShader(this.material, {
      head: glsl`
        uniform float time;
        uniform float powerFactor;
        uniform float multiplicator;
        uniform vec3 firstColor;
        uniform vec3 secondColor;

        in vec3 vPosition;
      `,
      main: glsl`
        // The camera sometimes would be too close to the position,
        // so the vector would point to the negative position.
        // Multiplicating the camera position by a big number fixes it.
        vec3 cameraDirection = normalize(cameraPosition * 1000.0 - vPosition);

        // 1 when facing the camera, 0 when perpendicular
        float fresnel = dot(vNormal, cameraDirection);

        float iridescence = pow(fresnel, powerFactor) * multiplicator;

        // pingPong function
        // alternate between two colors,
        // the function looks like this /\/\/\/\/
        float f = abs(1.0 - mod(iridescence + time, 2.0));

        vec3 iridescentColor = mix(firstColor, secondColor, f);
      `,
      diffuse: glsl`
        diffuse = iridescentColor;
      `,
    })

    this.geometry = new THREE.PlaneBufferGeometry(SIZE, SIZE, RESOLUTION, RESOLUTION)

    this.geometry.rotateX(-Math.PI / 2)

    this.mesh = new THREE.Mesh(this.geometry, this.material)
    this.add(this.mesh)
  }

  update(dt, time) {
    this.material.uniforms.time.value += dt * this.webgl.controls.hills.speed
    this.material.uniforms.timeFixed.value = time
  }
}
