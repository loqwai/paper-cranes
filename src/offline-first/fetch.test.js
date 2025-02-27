import { describe, it, expect, beforeEach, vi } from "vitest"
const timeout = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

import { offlineFirstFetch } from "./fetch"
import * as cache from "./cache"
import reloadPage from "./reload-page"
vi.mock("./cache", () => ({
    add: vi.fn(),
    get: vi.fn(),
}))

vi.mock("./reload-page", () => ({
    default: vi.fn()
}))

describe("offline-first-fetch", () => {
    const fetch = vi.fn()
    beforeEach(() => {
        vi.clearAllMocks()
        globalThis.pendingRequests = []
        globalThis.fetch = fetch
    })

    it("should exist", () => {
        expect(offlineFirstFetch).toBeDefined()
    })

    describe("when the url is cached", () => {
        let response
        let resolve
        beforeEach(async () => {
            cache.get.mockResolvedValue(new Response("the-cached-response"))
            fetch.mockResolvedValue(new Response("the-network-response"))
            cache.add.mockReturnValue(new Promise((r) => {
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

        it('should have called add', () => {
            expect(cache.add).toHaveBeenCalled()
        })

        describe('when add tells us we need to reload the page', () => {
            beforeEach(async () => {
                resolve(true)
                await timeout(50)
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
            cache.get.mockResolvedValue(null)
            const request = new Request("https://famous-beads.com")
            response = await offlineFirstFetch(request)
        })
        it("should return the fetched response", async () => {
            const value = await response.text()
            expect(value).toEqual("the-network-response")
        })
        it('should have cached the response', () => {
            expect(cache.add).toHaveBeenCalled()
        })
    })

    describe("when we have pending requests", () => {
        beforeEach(async () => {
            globalThis.fetch = vi.fn().mockResolvedValue(new Response("the-network-response"))
            globalThis.pendingRequests.push(new Request("https://famousww-beads.com"))
            cache.add.mockResolvedValue(true)
            cache.get.mockResolvedValue(null)
            const request = new Request("https://famous-beads.com")
            await offlineFirstFetch(request)
        })

        it('should not reload the page yet', () => {
            expect(reloadPage).not.toHaveBeenCalled()
        })
    })
})
