import { SMAAImageLoader, SMAAEffect as SMAAEffectPostproccessing } from 'postprocessing'

// simple promise SMAAEffect wrapper
export function SMAAEffect(...options) {
  return new Promise((resolve) => {
    new SMAAImageLoader().load(([search, area]) => {
      const smaaEffect = new SMAAEffectPostproccessing(search, area, ...options)
      resolve(smaaEffect)
    })
  })
}
