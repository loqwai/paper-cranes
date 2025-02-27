import { describe, it, expect, beforeEach, vi } from "vitest"
import reloadPage from "./reload-page"

describe("reloadPage", () => {
  let tellPageToReload
  beforeEach(() => {
    tellPageToReload = vi.fn()
    globalThis.self = {
      clients: {
        matchAll: vi.fn().mockResolvedValue([
          { postMessage: tellPageToReload }
        ])
      }
    }
  })
  it("should tell all clients to reload", async () => {
    await reloadPage()
    expect(tellPageToReload).toHaveBeenCalled()
  })
})
