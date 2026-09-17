import { describe, expect, it } from "vitest";

import { FailureLimiter } from "./rate-limit";

describe("FailureLimiter", () => {
  it("blocks after the configured number of failures inside the window", () => {
    let clock = 0;
    const limiter = new FailureLimiter(3, 1000, () => clock);

    limiter.recordFailure("ip");
    limiter.recordFailure("ip");
    expect(limiter.isBlocked("ip")).toBe(false);
    limiter.recordFailure("ip");
    expect(limiter.isBlocked("ip")).toBe(true);

    clock = 1000;
    expect(limiter.isBlocked("ip")).toBe(false);
  });

  it("tracks keys independently and clears on reset", () => {
    const limiter = new FailureLimiter(1, 1000, () => 0);
    limiter.recordFailure("a");
    expect(limiter.isBlocked("a")).toBe(true);
    expect(limiter.isBlocked("b")).toBe(false);
    limiter.reset("a");
    expect(limiter.isBlocked("a")).toBe(false);
  });
});
