import * as THREE from 'three'

/**
 * Helper classes which shows a reticle on hit-test on debug mode.
 * It also exposes some useful methods:
 * - isHitting
 * - onARPointerDown()
 * - onARPointerUp()
 * - onFirstHit()
 * - getPose()
 */
export class XRState extends THREE.Group {
  reticle
  controller
  _pointerDownListeners = []
  _pointerUpListeners = []
  _firstHitListeners = []
  _hitTestSourceRequested = false
  _hitTestSource
  _initialized = false

  get isHitting() {
    return this.reticle.visible
  }

  constructor(webgl, options = {}) {
    super(options)
    this.webgl = webgl
    this.options = options

    this.reticle = new THREE.Mesh(
      new THREE.RingBufferGeometry(0.15, 0.2, 64).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.3, depthWrite: false })
    )
    this.reticle.matrixAutoUpdate = false
    this.reticle.visible = false

    if (window.DEBUG) {
      this.add(this.reticle)
    }

    this.controller = this.webgl.renderer.xr.getController(0)
    this.add(this.controller)

    // on click of the AR
    // the controller will have the position of the click on the screen
    this.controller.addEventListener('selectstart', this._onSelectStart)
    this.controller.addEventListener('selectend', this._onSelectEnd)
  }

  reset() {
    this.controller.removeEventListener('selectstart', this._onSelectStart)
    this.controller.removeEventListener('selectend', this._onSelectEnd)

    this._pointerDownListeners.length = 0
    this._pointerUpListeners.length = 0
    this._firstHitListeners.length = 0

    this._initialized = false
    this._hitTestSource = undefined
    this._hitTestSourceRequested = false
  }

  _onSelectStart = (event) => {
    // call all the listeners
    this._pointerDownListeners.forEach((listener) => listener(event, this.controller))
  }

  _onSelectEnd = (event) => {
    // call all the listeners
    this._pointerUpListeners.forEach((listener) => listener(event, this.controller))
  }

  onARPointerDown(fn) {
    this._pointerDownListeners.push(fn)
  }

  offARPointerDown(fn) {
    const index = this._pointerDownListeners.indexOf(fn)

    // return silently if the function can't be found
    if (index === -1) {
      return
    }

    this._pointerDownListeners.splice(index, 1)
  }

  onARPointerUp(fn) {
    this._pointerUpListeners.push(fn)
  }

  offARPointerUp(fn) {
    const index = this._pointerUpListeners.indexOf(fn)

    // return silently if the function can't be found
    if (index === -1) {
      return
    }

    this._pointerUpListeners.splice(index, 1)
  }

  onFirstHit(fn) {
    this._firstHitListeners.push(fn)
  }

  offFirstHit(fn) {
    const index = this._firstHitListeners.indexOf(fn)

    // return silently if the function can't be found
    if (index === -1) {
      return
    }

    this._firstHitListeners.splice(index, 1)
  }

  // get the matrix of the reticle
  getPose(xframe) {
    if (!this._hitTestSourceRequested) {
      this._hitTestSourceRequested = true

      const session = this.webgl.renderer.xr.getSession()
      session
        .requestReferenceSpace('viewer')
        .then((space) => session.requestHitTestSource({ space }))
        .then((_hitTestSource) => {
          this._hitTestSource = _hitTestSource
        })
    }

    if (!this._hitTestSource) {
      return
    }

    const hitTestResults = xframe.getHitTestResults(this._hitTestSource)

    if (hitTestResults.length === 0) {
      return
    }

    const hit = hitTestResults[0]
    const referenceSpace = this.webgl.renderer.xr.getReferenceSpace()
    return hit.getPose(referenceSpace).transform.matrix
  }

  update(dt, time, xrframe) {
    // if we're entered the XR view
    if (!xrframe) {
      return
    }

    const pose = this.getPose(xrframe)

    // if we're hitting something
    if (pose) {
      this.reticle.visible = true
      this.reticle.matrix.fromArray(pose)
      this.reticle.position.setFromMatrixPosition(this.reticle.matrix)
      if (!this._initialized) {
        this._initialized = true

        // call all the listeners
        this._firstHitListeners.forEach((listener) => listener(event, pose))
      }
    } else {
      this.reticle.visible = false
    }
  }
}
