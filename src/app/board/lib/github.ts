import "server-only";

// Read-only access to the private rossvincent/ClaudeOS repo, via a
// fine-grained GitHub PAT scoped to only that repo's contents. Never expose
// GITHUB_TOKEN, or this module, to a client component.

const OWNER = "rossvincent";
const REPO = "ClaudeOS";
const BRANCH = "main";

export async function fetchRepoFile(path: string): Promise<string> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN is not set");
  }

  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    // Politeness cache, not a correctness cache: a rapid repeat page view
    // reuses this for up to a minute rather than hitting GitHub again.
    // cookies() elsewhere in the request already forces per-request
    // rendering, so the page as a whole is still genuinely live.
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(
      `GitHub fetch failed for ${path}: ${res.status} ${res.statusText}`
    );
  }

  const json = (await res.json()) as { content?: unknown; encoding?: string };
  if (typeof json.content !== "string") {
    throw new Error(`Unexpected GitHub response shape for ${path}`);
  }

  // GitHub returns base64 content with embedded newlines; Buffer handles
  // that fine without stripping them first.
  return Buffer.from(json.content, "base64").toString("utf8");
}
