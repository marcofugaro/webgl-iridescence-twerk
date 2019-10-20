#pragma glslify: hsl2rgb = require(glsl-hsl2rgb)

uniform float time;
uniform float powerFactor;
uniform float multiplicator;
uniform float speed;
uniform vec3 firstColor;
uniform vec3 secondColor;
uniform float showAllColors;

varying vec3 vNormal;
varying vec3 vPosition;


void main() {
  // The camera sometimes would be too close to the position,
  // so the vector would point to the negative position.
  // Multiplicating the camera position by a big number fixes it.
  vec3 cameraDirection = normalize(cameraPosition * 1000.0 - vPosition);

  // TODO make powerFactor static
  float iridescence = pow(dot(vNormal, cameraDirection), powerFactor) * multiplicator;

  // show all colors
  float hue = mod(iridescence + time * speed, 1.0);
  vec3 rainbowColor = hsl2rgb(hue, 1.0, 0.5);

  // alternate between two colors
  vec3 mixColor = mix(firstColor, secondColor, abs(1.0 - mod(iridescence + time * speed, 2.0)));

  // if/else statement but with step()
  vec3 color = rainbowColor * step(0.5, showAllColors) + mixColor * step(0.5, 1.0 - showAllColors);
  gl_FragColor = vec4(color, 1.0);
}
