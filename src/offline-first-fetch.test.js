import { describe, it, expect, beforeEach, vi } from "vitest"
import { offlineFirstFetch } from "./offline-first-fetch"

describe("offline-first-fetch", () => {
    let cache
    beforeEach(() => {
        cache = {}
        globalThis.caches /** @type {Partial<CacheStorage>} */ = {
            open: vi.fn().mockResolvedValue(cache)
        }
        globalThis.VERSION = "twiddle-grr"
    })
    it("should exist", () => {
        expect(offlineFirstFetch).toBeDefined()
    })

    describe("when the url is cached", () => {
        beforeEach(() => {
            cache.match = vi.fn().mockResolvedValue(new Response("the-cached-response"))
        })
        it("should give us a response", async () => {
            const request = new Request("https://famous-beads.com")
            const response = await offlineFirstFetch(request)
            const value = await response.text()
            expect(value).toEqual("the-cached-response")
        })
    })
    describe("when the url is not cached", () => {
        beforeEach(() => {
            globalThis.fetch = vi.fn().mockResolvedValue(new Response("the-network-response"))
            cache.match = vi.fn().mockResolvedValue(null)
        })
        it("should fetch the url", async () => {
            const request = new Request("https://famous-beads.com")
            const response = await offlineFirstFetch(request)
            const value = await response.text()
            expect(value).toEqual("the-network-response")
        })
    })
})
