#pragma glslify: hsl2rgb = require(glsl-hsl2rgb)

uniform float time;
uniform float powerFactor;
uniform float multiplicator;
uniform float speed;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vec3 cameraDirection = normalize(cameraPosition - vPosition);

  float iridescence = pow(dot(vNormal, cameraDirection), powerFactor) * multiplicator;

  vec3 color = hsl2rgb(mod(iridescence + time * speed, 1.0), 1.0, 0.5);
  gl_FragColor = vec4(color, 1.0);
}
