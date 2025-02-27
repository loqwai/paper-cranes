import { describe, it, expect, beforeEach, vi } from "vitest"
import { offlineFirstFetch } from "./offline-first-fetch"
describe("offline-first-fetch", () => {
    it("should exist", () => {
        expect(offlineFirstFetch).toBeDefined()
    })

    describe("when the url is not cached", () => {
        it("should give us a response", async () => {
            const request = new Request("https://famous-beads.com")
            const response = await offlineFirstFetch(request)
            expect(response).toBeDefined()
        })
    })
    describe("when the url is cached", () => {
        beforeEach(() => {
            /** @type {Partial<CacheStorage>} */
            const caches = {
                open: vi.fn(),
            };

            // I hate you, TypeScript.
            globalThis.caches = /** @type {CacheStorage} */ (caches)
        });

        it("should give us a response", async () => {
            const request = new Request("https://famous-beads.com")
            const response = await offlineFirstFetch(request)
            expect(response).toBeDefined()
        })
    })
})
