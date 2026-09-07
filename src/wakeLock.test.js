import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { keepScreenAwake } from './wakeLock.js'

/** Minimal stand-in for the bits of `document` the module touches. */
const makeDocument = () => {
  const listeners = {}
  return {
    visibilityState: 'visible',
    listeners,
    addEventListener: (type, fn) => {
      listeners[type] = listeners[type] ?? []
      listeners[type].push(fn)
    },
    removeEventListener: (type, fn) => {
      listeners[type] = (listeners[type] ?? []).filter((l) => l !== fn)
    },
    emit: (type) => [...(listeners[type] ?? [])].forEach((fn) => fn()),
    countOf: (type) => (listeners[type] ?? []).length,
  }
}

/** A sentinel that records its release and can fire the browser's `release` event. */
const makeSentinel = () => {
  const listeners = []
  return {
    released: false,
    release: vi.fn(function () {
      this.released = true
      return Promise.resolve()
    }),
    addEventListener: (type, fn) => {
      if (type === 'release') listeners.push(fn)
    },
    fireRelease: () => listeners.forEach((fn) => fn()),
  }
}

/** Let queued promise callbacks run. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

let doc

beforeEach(() => {
  doc = makeDocument()
  vi.stubGlobal('document', doc)
  vi.stubGlobal('window', {})
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('keepScreenAwake', () => {
  describe('when the Wake Lock API is unavailable', () => {
    // iOS < 16.4, old WebViews, and any insecure origin (including http localhost).
    beforeEach(() => {
      vi.stubGlobal('navigator', {})
    })

    it('does not throw', () => {
      expect(() => keepScreenAwake()).not.toThrow()
    })

    it('reports itself inactive rather than pretending', () => {
      expect(keepScreenAwake().active).toBe(false)
    })

    it('releasing is a safe no-op', () => {
      expect(() => keepScreenAwake().release()).not.toThrow()
    })

    it('registers no listeners', () => {
      keepScreenAwake()
      expect(doc.countOf('visibilitychange')).toBe(0)
    })
  })

  describe('when the API is available', () => {
    let request
    let sentinel

    beforeEach(() => {
      sentinel = makeSentinel()
      request = vi.fn(() => Promise.resolve(sentinel))
      vi.stubGlobal('navigator', { wakeLock: { request } })
    })

    it('requests a screen lock immediately', async () => {
      keepScreenAwake()
      await flush()
      expect(request).toHaveBeenCalledWith('screen')
    })

    it('holds the sentinel it was given', async () => {
      const handle = keepScreenAwake()
      await flush()
      expect(handle.active).toBe(true)
    })

    it('does not request while the document is hidden', async () => {
      // Requesting while hidden always rejects, so we must not even try.
      doc.visibilityState = 'hidden'
      keepScreenAwake()
      await flush()
      expect(request).not.toHaveBeenCalled()
    })

    it('makes only one request when acquire is triggered repeatedly', async () => {
      // Two in-flight requests would leak a sentinel nobody ever releases.
      keepScreenAwake()
      doc.emit('pointerdown')
      doc.emit('keydown')
      await flush()
      expect(request).toHaveBeenCalledTimes(1)
    })

    describe('after the page is backgrounded and returns', () => {
      // The browser silently drops the lock on hide. This is the path that rots
      // silently: without it, one glance at a notification kills the wake lock
      // for the rest of the set.
      let handle
      let second

      beforeEach(async () => {
        handle = keepScreenAwake()
        await flush()
        second = makeSentinel()
        request.mockImplementation(() => Promise.resolve(second))

        doc.visibilityState = 'hidden'
        doc.emit('visibilitychange')
      })

      it('considers itself inactive while hidden', () => {
        expect(handle.active).toBe(false)
      })

      it('requests a second lock on return', async () => {
        doc.visibilityState = 'visible'
        doc.emit('visibilitychange')
        await flush()
        expect(request).toHaveBeenCalledTimes(2)
      })

      it('holds the new sentinel', async () => {
        doc.visibilityState = 'visible'
        doc.emit('visibilitychange')
        await flush()
        expect(handle.active).toBe(true)
      })

      it('drops the stale sentinel even if the release event never fires', async () => {
        // A missed `release` event would otherwise leave a dead sentinel in place
        // and block every future re-acquire.
        doc.visibilityState = 'visible'
        doc.emit('visibilitychange')
        await flush()
        expect(sentinel.release).not.toHaveBeenCalled()
        expect(handle.active).toBe(true)
      })
    })

    it('re-acquires after an unsolicited release event', async () => {
      const handle = keepScreenAwake()
      await flush()
      sentinel.fireRelease()
      expect(handle.active).toBe(false)

      doc.emit('pointerdown')
      await flush()
      expect(handle.active).toBe(true)
    })

    describe('release()', () => {
      it('releases the held sentinel', async () => {
        const handle = keepScreenAwake()
        await flush()
        handle.release()
        expect(sentinel.release).toHaveBeenCalled()
      })

      it('unregisters its listeners', async () => {
        const handle = keepScreenAwake()
        await flush()
        handle.release()
        expect(doc.countOf('visibilitychange')).toBe(0)
        expect(doc.countOf('pointerdown')).toBe(0)
      })

      it('stops re-acquiring', async () => {
        const handle = keepScreenAwake()
        await flush()
        handle.release()
        request.mockClear()
        doc.emit('visibilitychange')
        await flush()
        expect(request).not.toHaveBeenCalled()
      })

      it('is idempotent', async () => {
        const handle = keepScreenAwake()
        await flush()
        handle.release()
        handle.release()
        expect(sentinel.release).toHaveBeenCalledTimes(1)
      })

      it('releases a lock that arrives after release() was called', async () => {
        // The request was already in flight; dropping it on the floor would hold
        // the screen awake forever with no handle left to release it.
        let resolve
        request.mockImplementation(() => new Promise((r) => { resolve = r }))
        const handle = keepScreenAwake()
        handle.release()
        resolve(sentinel)
        await flush()
        expect(sentinel.release).toHaveBeenCalled()
        expect(handle.active).toBe(false)
      })
    })

    describe('when the request is denied', () => {
      // Battery saver, or a browser demanding user activation first.
      beforeEach(() => {
        request.mockImplementation(() => Promise.reject(new Error('denied')))
      })

      it('does not throw or reject', async () => {
        expect(() => keepScreenAwake()).not.toThrow()
        await flush()
      })

      it('reports itself inactive', async () => {
        const handle = keepScreenAwake()
        await flush()
        expect(handle.active).toBe(false)
      })

      it('retries on the first user gesture', async () => {
        // This app starts a shader with no gesture at all, so a denial at load is
        // expected on browsers that require user activation.
        const handle = keepScreenAwake()
        await flush()
        request.mockImplementation(() => Promise.resolve(sentinel))

        doc.emit('pointerdown')
        await flush()
        expect(handle.active).toBe(true)
      })

      it('retries on a touch as well as a pointer event', async () => {
        const handle = keepScreenAwake()
        await flush()
        request.mockImplementation(() => Promise.resolve(sentinel))

        doc.emit('touchend')
        await flush()
        expect(handle.active).toBe(true)
      })
    })

    describe('when the browser throws synchronously', () => {
      // Non-conforming WebViews throw instead of rejecting.
      beforeEach(() => {
        request.mockImplementation(() => {
          throw new Error('nope')
        })
      })

      it('does not throw', () => {
        expect(() => keepScreenAwake()).not.toThrow()
      })

      it('reports itself inactive', () => {
        expect(keepScreenAwake().active).toBe(false)
      })

      it('still retries later', async () => {
        const handle = keepScreenAwake()
        request.mockImplementation(() => Promise.resolve(sentinel))
        doc.emit('pointerdown')
        await flush()
        expect(handle.active).toBe(true)
      })
    })
  })
})
