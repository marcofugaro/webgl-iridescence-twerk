export async function isARSupported() {
  if (!('xr' in navigator)) {
    return false
  }

  const supported = await navigator.xr.isSessionSupported('immersive-ar')

  if (!supported) {
    return false
  }

  return supported
}

export function requestARSession(xr) {
  return navigator.xr
    .requestSession('immersive-ar', {
      requiredFeatures: ['local', 'hit-test', 'dom-overlay'],
      domOverlay: {
        root: document.querySelector('#ar-ui'),
      },
    })
    .then(async (session) => {
      xr.setReferenceSpaceType('local')
      await xr.setSession(session)

      return session
    })
}
