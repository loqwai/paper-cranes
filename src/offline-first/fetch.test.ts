import { describe, it, expect, beforeEach, vi } from "vitest"
import { offlineFirstFetch } from "./fetch"

describe("offline-first-fetch", () => {
    let cache
    const fetch = vi.fn()
    const tellPageToReload = vi.fn()
    beforeEach(() => {
        cache = {
            match: vi.fn(),
            put: vi.fn()
        }
        globalThis.caches /** @type {Partial<CacheStorage>} */ = {
            open: vi.fn().mockResolvedValue(cache)
        }
        globalThis.VERSION = "twiddle-grr"
        globalThis.fetch = fetch

        globalThis.self = {
            clients: {
                matchAll: vi.fn().mockResolvedValue([
                    {
                        postMessage: tellPageToReload
                    }
                ])
            }
        }
    })
    it("should exist", () => {
        expect(offlineFirstFetch).toBeDefined()
    })

    describe("when the url is cached", () => {
        let response
        beforeEach(async () => {
            cache.match = vi.fn().mockResolvedValue(new Response("the-cached-response"))
            fetch.mockResolvedValue(new Response("the-network-response"))
            const request = new Request("https://famous-beads.com/")
            response = await offlineFirstFetch(request)
        })
        it("should give us a response", async () => {
            await expect(response.text()).resolves.toEqual("the-cached-response")
        })
        it("should have fetched in the background", async () => {
            expect(globalThis.fetch).toHaveBeenCalled()
        })
        describe("when the fetch resolves to something different from the cached response", () => {
            beforeEach(() => {
                globalThis.fetch.mockResolvedValue(new Response("the-network-response"))
            })
            it("should have cached something", () => {
                expect(cache.put).toHaveBeenCalled()
            })

            it("should add the network request to the cache", async () => {
                const [request, response] = cache.put.mock.calls[0]
                expect(request.url).toEqual("https://famous-beads.com/")
                await expect(response.text()).resolves.toEqual("the-network-response")
            })
            it("reloads the page", async () => {
                expect(tellPageToReload).toHaveBeenCalled()
            })
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
