import "server-only";
import { fetchRepoFile } from "./github";
import { parseActive, type ActiveBoardData } from "./parse-active";
import { parsePipeline, type PipelineData } from "./parse-pipeline";
import { parseDecisions, type DecisionItem } from "./parse-decisions";
import { parseSocial, type SocialData } from "./parse-social";
import { parseChangelog, type ChangelogEntry } from "./parse-changelog";

export interface BoardData {
  active: ActiveBoardData;
  pipeline: PipelineData;
  decisions: DecisionItem[];
  social: SocialData;
  changelog: ChangelogEntry[];
}

// Five fetches in parallel, not sequential - GitHub's rate limit (5,000/hr
// per token) has no trouble with this, and it keeps page load to roughly
// one round trip's worth of latency rather than five.
export async function getBoardData(): Promise<BoardData> {
  const [activeText, pipelineText, decisionsText, socialText, changelogText] =
    await Promise.all([
      fetchRepoFile("ACTIVE.md"),
      fetchRepoFile("consulting/pipeline.md"),
      fetchRepoFile("memory/decisions-log.md"),
      fetchRepoFile("SOCIAL.md"),
      fetchRepoFile("CHANGELOG.md"),
    ]);

  const today = new Date();

  return {
    active: parseActive(activeText, today),
    pipeline: parsePipeline(pipelineText),
    decisions: parseDecisions(decisionsText),
    social: parseSocial(socialText),
    changelog: parseChangelog(changelogText),
  };
}
