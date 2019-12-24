import SimplexNoise from 'simplex-noise'

// wrapper with processing-like api of the library simplex-noise
const simplex = new SimplexNoise()
export function noise(...args) {
  switch (args.length) {
    case 1:
      return simplex.noise2D(0, args[0])
    case 2:
      return simplex.noise2D(args[0], args[1])
    case 3:
      return simplex.noise3D(args[0], args[1], args[2])
    case 4:
      return simplex.noise4D(args[0], args[1], args[2], args[3])
    default:
      throw new Error(`Invalid number of arguments passed to the noise() function`)
  }
}
