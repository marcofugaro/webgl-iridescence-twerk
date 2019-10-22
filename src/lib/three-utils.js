import * as THREE from 'three'
import normalVert from 'three/src/renderers/shaders/ShaderLib/normal_vert.glsl'

// like MeshNormalMaterial, but the normals are relative to world not camera
const normalMaterialGlobalvert = normalVert.replace(
  '#include <defaultnormal_vertex>',
  THREE.ShaderChunk['defaultnormal_vertex'].replace(
    'transformedNormal = normalMatrix * transformedNormal;',
    // position correctly the normals
    'transformedNormal = vec3(transformedNormal.x, -transformedNormal.y, -transformedNormal.z);'
  )
)

function injectPositionVaryingInVert(vert) {
  return vert.replace(
    'void main() {',
    `
    varying vec3 vPosition;
    void main() {
      vPosition = position;
  `
  )
}

export const normalMaterialGlobalvertPos = injectPositionVaryingInVert(normalMaterialGlobalvert)
