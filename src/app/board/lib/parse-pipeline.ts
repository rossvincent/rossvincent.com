// Parses ~/ClaudeOS/consulting/pipeline.md: Active engagements, Closed
// engagements, and Prospects. Warm routes and pricing are left out for v1;
// this is the operational slice that changes week to week.

import { clean, rowsBetween } from "./md";

export interface PipelineEngagement {
  client: string;
  status: string;
  type: string;
  value: string;
  note: string;
  due: string;
}

export interface PipelineProspect {
  name: string;
  source: string;
  status: string;
  nextAction: string;
  due: string;
}

export interface PipelineData {
  active: PipelineEngagement[];
  closed: PipelineEngagement[];
  prospects: PipelineProspect[];
}

function mapEngagementRow(cells: string[]): PipelineEngagement | null {
  if (cells.length < 6) return null;
  return {
    client: clean(cells[0]),
    status: clean(cells[1]),
    type: clean(cells[2]),
    value: clean(cells[3]),
    note: clean(cells[4]),
    due: clean(cells[5]),
  };
}

function mapProspectRow(cells: string[]): PipelineProspect | null {
  if (cells.length < 5) return null;
  const name = clean(cells[0]);
  if (!name || name === "(none yet)") return null;
  return {
    name,
    source: clean(cells[1]),
    status: clean(cells[2]),
    nextAction: clean(cells[3]),
    due: clean(cells[4]),
  };
}

export function parsePipeline(text: string): PipelineData {
  const lines = text.split("\n");

  const activeRows = rowsBetween(
    lines,
    /^## Active engagements/,
    /^## Closed engagements/
  );
  const closedRows = rowsBetween(
    lines,
    /^## Closed engagements/,
    /^## Prospects/
  );
  const prospectRows = rowsBetween(lines, /^## Prospects/, /^## Warm routes/);

  return {
    active: activeRows
      .map(mapEngagementRow)
      .filter((r): r is PipelineEngagement => r !== null),
    closed: closedRows
      .map(mapEngagementRow)
      .filter((r): r is PipelineEngagement => r !== null),
    prospects: prospectRows
      .map(mapProspectRow)
      .filter((r): r is PipelineProspect => r !== null),
  };
}
