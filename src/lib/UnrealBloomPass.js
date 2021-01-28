// UnrealBloomPass adapted to work with postprocessing.
// Context: https://github.com/vanruesc/postprocessing/issues/103#issuecomment-447338268
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'

UnrealBloomPass.prototype = Object.assign(UnrealBloomPass.prototype, {
  initialize() {},
  originalRender: UnrealBloomPass.prototype.render,
  render(renderer, inputBuffer, outputBuffer, delta, maskActive) {
    this.originalRender(renderer, outputBuffer, inputBuffer, delta, maskActive)
  },
})

export { UnrealBloomPass }
