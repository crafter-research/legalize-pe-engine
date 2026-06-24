import { afterEach, describe, expect, it, vi } from "vitest";
import { GitHubService } from "./github-service";

afterEach(() => {
  vi.restoreAllMocks();
});

function mockFetchOnce(jsonBody: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => jsonBody,
  } as unknown as Response);
}

describe("GitHubService path construction", () => {
  it("uses the caller-supplied resolvedPath when provided", async () => {
    const fetchMock = mockFetchOnce([]);
    vi.stubGlobal("fetch", fetchMock);

    const svc = new GitHubService();
    // Caller resolves id -> corpus-relative path via id-path-map.json.
    await svc.getHistory("pe-lal-093-2026-grll-cr", "pe-lal/093-2026-GRLL-CR.md");

    const calledUrl = fetchMock.mock.calls[0]?.[0] as string;
    expect(decodeURIComponent(calledUrl)).toContain("path=pe-lal/093-2026-GRLL-CR.md");
  });

  it("falls back to pe/<id>.md when no resolvedPath is given", async () => {
    const fetchMock = mockFetchOnce([]);
    vi.stubGlobal("fetch", fetchMock);

    const svc = new GitHubService();
    await svc.getHistory("con-1993");

    const calledUrl = fetchMock.mock.calls[0]?.[0] as string;
    expect(decodeURIComponent(calledUrl)).toContain("path=pe/con-1993.md");
  });
});

describe("GitHubService.getDiff patch parser (via shared diff-parser)", () => {
  it("parses a simple add/del/context patch into hunks", async () => {
    const patch = "@@ -1,3 +1,3 @@\n context line\n-old line\n+new line\n more context";
    const compareData = {
      files: [{ filename: "pe/x.md", patch, additions: 1, deletions: 1 }],
      base_commit: { commit: { author: { date: "2020-01-01" } } },
      commits: [{ commit: { author: { date: "2020-02-01" } } }],
    };
    vi.stubGlobal("fetch", mockFetchOnce(compareData));

    const svc = new GitHubService();
    const diff = await svc.getDiff("x", "aaaaaaa", "bbbbbbb");

    expect(diff.hunks).toHaveLength(1);
    const types = diff.hunks[0]?.lines.map((l) => l.type);
    expect(types).toEqual(["context", "del", "add", "context"]);
    expect(diff.stats).toEqual({ additions: 1, deletions: 1 });
  });

  it("empty string in patch is not counted as context (fix for #11a)", async () => {
    // An empty string "" is NOT a valid unified-diff content line (those are
    // prefixed by +/-/space). The parser now ignores it instead of counting it
    // as a phantom context line.
    const patch = "@@ -1,2 +1,2 @@\n context\n\n+added";
    const compareData = {
      files: [{ filename: "pe/blank.md", patch, additions: 1, deletions: 0 }],
      base_commit: { commit: { author: { date: "" } } },
      commits: [{ commit: { author: { date: "" } } }],
    };
    vi.stubGlobal("fetch", mockFetchOnce(compareData));
    const svc = new GitHubService();
    const diff = await svc.getDiff("blank", "aaaaaaa", "bbbbbbb");
    // After fix: only the " context" line and the "+added" line; "" is skipped.
    expect(diff.hunks[0]?.lines.map((l) => l.type)).toEqual(["context", "add"]);
  });

  it("'\\ No newline at end of file' is silently skipped (fix for #11b)", async () => {
    const patch = "@@ -1 +1 @@\n-old\n+new\n\\ No newline at end of file";
    const compareData = {
      files: [{ filename: "pe/nonl.md", patch, additions: 1, deletions: 1 }],
      base_commit: { commit: { author: { date: "" } } },
      commits: [{ commit: { author: { date: "" } } }],
    };
    vi.stubGlobal("fetch", mockFetchOnce(compareData));
    const svc = new GitHubService();
    const diff = await svc.getDiff("nonl", "aaaaaaa", "bbbbbbb");
    // The annotation line starts with "\" and is correctly skipped.
    expect(diff.hunks[0]?.lines.map((l) => l.type)).toEqual(["del", "add"]);
  });

  it("returns empty hunks when the target file is absent from the compare", async () => {
    const compareData = {
      files: [
        { filename: "pe/OTHER.md", patch: "@@ -1 +1 @@\n-a\n+b", additions: 1, deletions: 1 },
      ],
      base_commit: { commit: { author: { date: "" } } },
      commits: [{ commit: { author: { date: "" } } }],
    };
    vi.stubGlobal("fetch", mockFetchOnce(compareData));
    const svc = new GitHubService();
    const diff = await svc.getDiff("absent", "aaaaaaa", "bbbbbbb", "pe/absent.md");
    expect(diff.hunks).toEqual([]);
    expect(diff.stats).toEqual({ additions: 0, deletions: 0 });
  });
});
