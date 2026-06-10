import { describe, expect, it } from "vitest";
import { isGitLockError } from "./spij-crawl";

// The full crawl->commit loop is network-bound (hits SPIJ + real git) and is
// integration-tested manually; it is out of unit scope. Here we test only the
// deterministic lock-detection predicate that decides whether a commit failure
// aborts the crawl (lock) or drops the norm into the publish-failed bucket.
describe("isGitLockError", () => {
  it("detects a stale index.lock failure", () => {
    expect(isGitLockError("fatal: Unable to create '/x/.git/index.lock': File exists")).toBe(true);
  });

  it("detects a bare 'unable to create' lock message", () => {
    expect(isGitLockError("error: unable to create lock for ref")).toBe(true);
  });

  it("detects a message ending in .lock", () => {
    expect(isGitLockError("could not write to /repo/.git/HEAD.lock")).toBe(true);
  });

  it("is case-insensitive about the lock signature", () => {
    expect(isGitLockError("Unable To Create INDEX.LOCK")).toBe(true);
  });

  it("does not flag an unrelated commit error", () => {
    expect(isGitLockError("some other error")).toBe(false);
  });

  it("does not flag a generic write failure without a lock signature", () => {
    expect(isGitLockError("ENOSPC: no space left on device")).toBe(false);
  });
});
