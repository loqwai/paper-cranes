import { describe, it, expect } from "vitest"
import { offlineFirstFetch } from "./offline-first-fetch"
describe("offline-first-fetch", () => {
    it("should exist", () => {
        expect(offlineFirstFetch).toBeDefined()
    })
    describe("when the url is not cached", () => {
        it("should fetch the url", async () => {
            const request = new Request("https://famous-beads.com")
            const response = await offlineFirstFetch(request)
            expect(response).toBeDefined()
        })
    })
})
