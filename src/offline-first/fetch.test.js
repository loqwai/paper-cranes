import { describe, it, expect, beforeEach, vi } from "vitest"
import { offlineFirstFetch } from "./fetch"

import addToCache from "./add-to-cache"
import reloadPage from "./reload-page"
const timeout = (ms) => new Promise(resolve => setTimeout(resolve, ms))
vi.mock("./add-to-cache", () => ({
    default: vi.fn()
}))

vi.mock("./reload-page", () => ({
    default: vi.fn()
}))

describe("offline-first-fetch", () => {
    let cache
    const fetch = vi.fn()
    beforeEach(() => {
        vi.clearAllMocks()
        cache = {
            match: vi.fn(),
        }
        globalThis.caches /** @type {Partial<CacheStorage>} */ = {
            open: vi.fn().mockResolvedValue(cache)
        }
        globalThis.VERSION = "twiddle-grr"
        globalThis.fetch = fetch
    })
    it("should exist", () => {
        expect(offlineFirstFetch).toBeDefined()
    })

    describe("when the url is cached", () => {
        let response
        let resolve
        beforeEach(async () => {
            cache.match = vi.fn().mockResolvedValue(new Response("the-cached-response"))
            fetch.mockResolvedValue(new Response("the-network-response"))
            addToCache.mockReturnValue(new Promise((r) => {
                resolve = r
            }))
            const request = new Request("https://famous-beads.com/")
            response = await offlineFirstFetch(request)
        })

        it("should give us a response", async () => {
            await expect(response.text()).resolves.toEqual("the-cached-response")
        })

        it("should have fetched in the background", async () => {
            expect(globalThis.fetch).toHaveBeenCalled()
        })
        it('should have called addToCache', () => {
            expect(addToCache).toHaveBeenCalled()
        })
        describe('when addToCache tells us we need to reload the page', () => {
            beforeEach(() => {
                resolve(true)
            })
            it('should reload the page', () => {
                expect(reloadPage).toHaveBeenCalled()
            })
        })
        describe('when addToCache tells us we do not need to reload the page', () => {
            beforeEach(() => {
                resolve(false)
            })
            it('should not reload the page', () => {
                expect(reloadPage).not.toHaveBeenCalled()
            })
        })
    })
    describe("when the url is not cached", () => {
        let response
        beforeEach(async () => {
            globalThis.fetch = vi.fn().mockResolvedValue(new Response("the-network-response"))
            cache.match = vi.fn().mockResolvedValue(null)
            const request = new Request("https://famous-beads.com")
            response = await offlineFirstFetch(request)
        })
        it("should return the fetched response", async () => {
            const value = await response.text()
            expect(value).toEqual("the-network-response")
        })
        it('should have cached the response', async () => {
            await timeout(0)
            expect(addToCache).toHaveBeenCalled()
        })
    })
})
