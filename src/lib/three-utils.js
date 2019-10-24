import * as THREE from 'three'
import normalVert from 'three/src/renderers/shaders/ShaderLib/normal_vert.glsl'

// like MeshNormalMaterial, but the normals are relative to world not camera
const normalMaterialGlobalvert = normalVert.replace(
  '#include <defaultnormal_vertex>',
  THREE.ShaderChunk['defaultnormal_vertex'].replace(
    'transformedNormal = normalMatrix * transformedNormal;',
    // take into consideration only the model matrix
    'transformedNormal = mat3(modelMatrix) * transformedNormal;'
  )
)

export function injectPositionVaryingInVert(vert) {
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
