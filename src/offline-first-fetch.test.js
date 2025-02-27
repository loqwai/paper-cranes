import { describe, it, expect, beforeEach, vi } from "vitest"
import { offlineFirstFetch } from "./offline-first-fetch"

describe("offline-first-fetch", () => {
    let cache
    beforeEach(() => {
        cache = {
            match: vi.fn().mockResolvedValue("the-cached-response")
        }
        globalThis.caches /** @type {Partial<CacheStorage>} */ = {
            open: vi.fn().mockResolvedValue(cache)
        }
        globalThis.VERSION = "twiddle-grr"
    })
    it("should exist", () => {
        expect(offlineFirstFetch).toBeDefined()
    })

    describe("when the url is cached", () => {
        it("should give us a response", async () => {
            const request = new Request("https://famous-beads.com")
            const response = await offlineFirstFetch(request)
            expect(response).toBeDefined()
        })
    })
})
