import * as THREE from 'three'

// like MeshNormalMaterial, but the normals are relative to world not camera
const normalMaterialGlobalvert = THREE.ShaderChunk['normal_vert'].replace(
  '#include <defaultnormal_vertex>',
  THREE.ShaderChunk['defaultnormal_vertex'].replace(
    'transformedNormal = normalMatrix * transformedNormal;',
    // take into consideration only the model matrix
    'transformedNormal = mat3(modelMatrix) * transformedNormal;'
  )
)

export const normalMaterialGlobalvertPos = monkeyPatch(normalMaterialGlobalvert, {
  header: 'varying vec3 vPosition;',
  main: 'vPosition = position;',
})

export function monkeyPatch(shader, { header = '', main = '', ...replaces }) {
  let patchedShader = shader

  Object.keys(replaces).forEach(key => {
    patchedShader = patchedShader.replace(key, replaces[key])
  })

  return patchedShader.replace(
    'void main() {',
    `
    ${header}
    void main() {
      ${main}
    `
  )
}
