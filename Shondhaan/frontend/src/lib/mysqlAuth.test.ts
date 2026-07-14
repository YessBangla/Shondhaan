import { afterEach, describe, expect, it, vi } from "vitest";
import { requestWithTimeout } from "./mysqlAuth";

describe("requestWithTimeout", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("rejects with a timeout message when the backend is slow", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("The operation was aborted.", "AbortError")));
        }),
      ),
    );

    const promise = requestWithTimeout("/api/auth/login", { identifier: "x", password: "y" }, 1000);

    vi.advanceTimersByTime(1000);

    await expect(promise).rejects.toThrow("timed out");
  });
});
