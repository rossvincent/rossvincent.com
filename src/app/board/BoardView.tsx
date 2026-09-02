"use client";

import { useEffect, useMemo, useState } from "react";
import type { BoardData } from "./lib/get-board-data";
import type { TaskItem, BlockedItem, DateItem } from "./lib/parse-active";
import type { DecisionItem } from "./lib/parse-decisions";
import { logout } from "./actions";
import "./board.css";

// Stable-ish key so a tick or an expanded row clears itself when the text
// underneath it changes, rather than silently carrying over onto
// different content. Ported from the original board/index.html.
function hashKey(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return "k" + (h >>> 0).toString(36);
}

function readStored<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem("board." + key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function writeStored<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem("board." + key, JSON.stringify(value));
  } catch {
    // private mode or storage full - the page still works, it just forgets
  }
}

function useCountdown(iso: string) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);
  if (now === null || !iso) return null;
  const ms = new Date(iso).getTime() - now;
  const past = ms < 0;
  const abs = Math.abs(ms);
  return { days: Math.floor(abs / 864e5), hours: Math.floor((abs % 864e5) / 36e5), past };
}

interface Filters {
  money: boolean;
  blocked: boolean;
  dated: boolean;
}

const DEFAULT_FILTERS: Filters = { money: false, blocked: false, dated: false };

function searchText(...parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

export default function BoardView({ data }: { data: BoardData }) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [focus, setFocus] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [ticks, setTicks] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setFilters(readStored("filters", DEFAULT_FILTERS));
    setFocus(readStored("focus", false));
    setOpen(new Set(readStored<string[]>("open", [])));
    setTicks(new Set(readStored<string[]>("ticks", [])));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) writeStored("filters", filters);
  }, [filters, hydrated]);
  useEffect(() => {
    if (hydrated) writeStored("focus", focus);
  }, [focus, hydrated]);
  useEffect(() => {
    if (hydrated) writeStored("open", Array.from(open));
  }, [open, hydrated]);
  useEffect(() => {
    if (hydrated) writeStored("ticks", Array.from(ticks));
  }, [ticks, hydrated]);

  const toggleOpen = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const toggleTick = (key: string) =>
    setTicks((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const q = query.trim().toLowerCase();
  const passSearch = (text: string) => !q || text.includes(q);
  const passMoney = (money: boolean) => !filters.money || money;

  const { gate, meta, zones } = data.active;
  const nowZone = zones[0];
  const blockedZone = zones[1];
  const datesZone = zones[2];
  const nextZone = zones[3];

  const countdown = useCountdown(meta.shipISO);

  const nowRows = useMemo(
    () =>
      nowZone.items.filter(
        (item) =>
          passMoney(item.money) &&
          !filters.blocked &&
          !filters.dated &&
          passSearch(searchText(item.tag, item.title, item.success, item.status, item.owner))
      ),
    [nowZone, filters, q]
  );
  const nextRows = useMemo(
    () =>
      nextZone.items.filter(
        (item) =>
          passMoney(item.money) &&
          !filters.blocked &&
          !filters.dated &&
          passSearch(searchText(item.tag, item.title, item.success, item.status, item.owner))
      ),
    [nextZone, filters, q]
  );
  const blockedRows = useMemo(
    () =>
      blockedZone.items.filter(
        (item) =>
          !filters.money &&
          !filters.dated &&
          passSearch(searchText(item.title, item.body, item.next, item.owner))
      ),
    [blockedZone, filters, q]
  );
  const dateRows = useMemo(
    () =>
      datesZone.items.filter(
        (item) =>
          !filters.money &&
          !filters.blocked &&
          passSearch(searchText(item.when, item.desc))
      ),
    [datesZone, filters, q]
  );

  // The four new sections aren't part of ACTIVE.md's money/blocked/dated
  // scheme, so those three chips don't apply to them - only the search box
  // and focus mode do.
  const pipelineActive = data.pipeline.active.filter((e) =>
    passSearch(searchText(e.client, e.status, e.type, e.value, e.note))
  );
  const pipelineClosed = data.pipeline.closed.filter((e) =>
    passSearch(searchText(e.client, e.status, e.type, e.value, e.note))
  );
  const pipelineProspects = data.pipeline.prospects.filter((p) =>
    passSearch(searchText(p.name, p.source, p.status, p.nextAction))
  );
  const decisionRows = data.decisions.filter((d) =>
    passSearch(searchText(d.date, d.headline, d.reasoning, d.implications))
  );
  const socialPosts = data.social.recentPosts.filter((p) =>
    passSearch(searchText(p.date, p.platform, p.post, p.format))
  );
  const changelogRows = data.changelog.filter((c) =>
    passSearch(searchText(c.heading, c.summary))
  );

  const totalShown =
    nowRows.length +
    nextRows.length +
    blockedRows.length +
    dateRows.length +
    pipelineActive.length +
    pipelineClosed.length +
    pipelineProspects.length +
    decisionRows.length +
    socialPosts.length +
    changelogRows.length;

  const resetAll = () => {
    setFilters(DEFAULT_FILTERS);
    setQuery("");
    setFocus(false);
    setOpen(new Set());
  };

  return (
    <div className={`board-page${focus ? " focus" : ""}`}>
      <div className="bar">
        <div className="bar-inner">
          <span className="brand">
            rossvincent.com/board &middot; as of {meta.asOf}
          </span>
          <input
            className="search"
            type="search"
            placeholder="Search everything"
            aria-label="Search every row"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            className="chip"
            type="button"
            aria-pressed={filters.money}
            onClick={() => setFilters((f) => ({ ...f, money: !f.money }))}
          >
            Money
          </button>
          <button
            className="chip"
            type="button"
            aria-pressed={filters.blocked}
            onClick={() => setFilters((f) => ({ ...f, blocked: !f.blocked }))}
          >
            Blocked
          </button>
          <button
            className="chip"
            type="button"
            aria-pressed={filters.dated}
            onClick={() => setFilters((f) => ({ ...f, dated: !f.dated }))}
          >
            Dated
          </button>
          <button
            className="chip"
            type="button"
            aria-pressed={focus}
            onClick={() => setFocus((v) => !v)}
          >
            Focus
          </button>
          <button className="chip" type="button" onClick={resetAll}>
            Reset
          </button>
        </div>
      </div>

      <div className="wrap">
        <section className="hero">
          <div>
            <p className="eyebrow">{gate.eyebrow}</p>
            {countdown && (
              <div className={`count${countdown.past ? " past" : ""}`}>
                {countdown.days}
                <span className="count-unit">{countdown.days === 1 ? " day " : " days "}</span>
                {countdown.hours}
                <span className="count-unit">{countdown.hours === 1 ? " hr" : " hrs"}</span>
                <span className="count-unit">{countdown.past ? "  overdue" : "  to go"}</span>
              </div>
            )}
            <p className="hero-label">The next thing to do</p>
            <p className="hero-step">{gate.steps[0] ?? gate.title}</p>
            <p className="gate-title">{gate.title}</p>
            <p className="when">{gate.when}</p>
            <p>{gate.body}</p>
          </div>
          <div className="preflight">
            <p className="eyebrow">{gate.preflightTitle}</p>
            <ul className="steps">
              {gate.steps.map((step) => {
                const key = hashKey(step);
                const checked = ticks.has(key);
                return (
                  <li key={key} className="step" onClick={() => toggleTick(key)}>
                    <input
                      type="checkbox"
                      checked={checked}
                      readOnly
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => toggleTick(key)}
                    />
                    <span>{step}</span>
                  </li>
                );
              })}
            </ul>
            <p className="scratch">{gate.preflightNote}</p>
          </div>
        </section>

        <Zone id="now" title="Now" note={`${nowRows.length} of five. Hard limit.`}>
          <TaskRows items={nowRows} zoneId="now" open={open} onToggle={toggleOpen} />
        </Zone>

        <Zone id="blocked" title="Blocked" note="Named, not quietly waited on.">
          <BlockedRows items={blockedRows} open={open} onToggle={toggleOpen} />
        </Zone>

        <Zone id="dates" title="Dates" note="Missed ones stay on the board.">
          <ul className="ladder">
            {dateRows.map((d, i) => (
              <li key={i} className={d.level}>
                <span className="when-cell">{d.when}</span>
                <p>{d.desc}</p>
              </li>
            ))}
          </ul>
        </Zone>

        <Zone id="pipeline" title="Pipeline" note="Consulting engagements and prospects.">
          <ul className="rows">
            {pipelineActive.map((e, i) => (
              <PipelineRow key={"a" + i} e={e} tagLabel="active" />
            ))}
            {pipelineClosed.map((e, i) => (
              <PipelineRow key={"c" + i} e={e} tagLabel="closed" />
            ))}
            {pipelineProspects.map((p, i) => (
              <li className="row" key={"p" + i}>
                <div className="row-btn" style={{ cursor: "default" }}>
                  <span className="tag">prospect</span>
                  <span className="row-title">{p.name || "No named prospects yet"}</span>
                  <span className="row-meta">{p.due}</span>
                </div>
                {p.nextAction && (
                  <div className="row-body">
                    <div className="field">
                      <span className="field-label quiet">Next action</span>
                      <p>{p.nextAction}</p>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Zone>

        <Zone id="decisions" title="Recent decisions" note="Newest first.">
          <ul className="rows">
            {decisionRows.map((d) => {
              const key = hashKey("decision" + d.date + d.headline);
              const isOpen = open.has(key);
              return (
                <li className={`row${isOpen ? " open" : ""}`} key={key}>
                  <button
                    className="row-btn"
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => toggleOpen(key)}
                  >
                    <span className="tag">{d.date}</span>
                    <span className="row-title">{d.headline}</span>
                  </button>
                  {isOpen && (
                    <div className="row-body">
                      <div className="field">
                        <span className="field-label">Decision</span>
                        <p className="strong">{d.decision}</p>
                      </div>
                      <div className="field">
                        <span className="field-label quiet">Reasoning</span>
                        <p>{d.reasoning}</p>
                      </div>
                      <div className="field">
                        <span className="field-label quiet">Implications</span>
                        <p>{d.implications}</p>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Zone>

        <Zone id="social" title="Social" note="Cross-post gap and recent posts.">
          <p style={{ color: "var(--ink-mid)", fontSize: "0.9rem", padding: "0.85rem 0.25rem" }}>
            {data.social.notYetCrossPosted}
          </p>
          <ul className="rows">
            {socialPosts.map((p, i) => (
              <li className="row" key={i}>
                <div className="row-btn" style={{ cursor: "default" }}>
                  <span className="tag">{p.platform}</span>
                  <span className="row-title">{p.post}</span>
                  <span className="row-meta">{p.date}</span>
                </div>
              </li>
            ))}
          </ul>
        </Zone>

        <Zone id="next" title="Next" note="Top rows only. The full list stays in ACTIVE.md.">
          <TaskRows items={nextRows} zoneId="next" open={open} onToggle={toggleOpen} />
        </Zone>

        <Zone id="changelog" title="System changelog" note="How ClaudeOS itself has changed lately.">
          <ul className="rows">
            {changelogRows.map((c, i) => (
              <li className="row" key={i}>
                <div className="row-btn" style={{ cursor: "default" }}>
                  <span className="row-title">{c.heading}</span>
                </div>
                <div className="row-body">
                  <p style={{ margin: 0 }}>{c.summary}</p>
                </div>
              </li>
            ))}
          </ul>
        </Zone>

        {totalShown === 0 && <p className="empty">Nothing matches that.</p>}

        <p className="colophon">
          Read live from rossvincent/ClaudeOS on every visit; there is no
          stale copy sitting behind this page. Ticks and filters are a local
          scratch layer in this browser - they never change the source
          files, and a tick clears itself if the wording underneath it
          changes.
          <br />
          <button className="logout" type="button" onClick={() => logout()}>
            Log out
          </button>
        </p>
      </div>
    </div>
  );
}

function Zone({
  id,
  title,
  note,
  children,
}: {
  id: string;
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section className="zone" id={`zone-${id}`}>
      <div className="zone-head">
        <h2>{title}</h2>
        <span className="zone-note">{note}</span>
      </div>
      {children}
    </section>
  );
}

function TaskRows({
  items,
  zoneId,
  open,
  onToggle,
}: {
  items: TaskItem[];
  zoneId: string;
  open: Set<string>;
  onToggle: (key: string) => void;
}) {
  return (
    <ul className="rows">
      {items.map((item) => {
        const key = hashKey(zoneId + item.title);
        const isOpen = open.has(key);
        return (
          <li className={`row${isOpen ? " open" : ""}`} key={key}>
            <button
              className="row-btn"
              type="button"
              aria-expanded={isOpen}
              onClick={() => onToggle(key)}
            >
              <span className={`tag${item.money ? " money" : ""}`}>{item.tag}</span>
              <span className="row-title">{item.title}</span>
              <span className="row-meta">
                {item.owner} &middot; {item.added}
              </span>
            </button>
            {isOpen && (
              <div className="row-body">
                <div className="field">
                  <span className="field-label">Success</span>
                  <p className="strong">{item.success}</p>
                </div>
                <div className="field">
                  <span className="field-label quiet">Where it stands</span>
                  <p>{item.status}</p>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function BlockedRows({
  items,
  open,
  onToggle,
}: {
  items: BlockedItem[];
  open: Set<string>;
  onToggle: (key: string) => void;
}) {
  return (
    <ul className="rows">
      {items.map((item) => {
        const key = hashKey("blocked" + item.title);
        const isOpen = open.has(key);
        return (
          <li className={`row${isOpen ? " open" : ""}`} key={key}>
            <button
              className="row-btn"
              type="button"
              aria-expanded={isOpen}
              onClick={() => onToggle(key)}
            >
              <span className={`tag ${item.severity}`}>{item.tag}</span>
              <span className="row-title">{item.title}</span>
              <span className="row-meta">
                {item.owner} &middot; since {item.since}
              </span>
            </button>
            {isOpen && (
              <div className="row-body">
                <div className="field">
                  <span className="field-label quiet">What is holding it</span>
                  <p>{item.body}</p>
                </div>
                <div className="field">
                  <span className="field-label">Next action</span>
                  <p className="strong">{item.next}</p>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function PipelineRow({
  e,
  tagLabel,
}: {
  e: { client: string; status: string; type: string; value: string; note: string; due: string };
  tagLabel: string;
}) {
  return (
    <li className="row">
      <div className="row-btn" style={{ cursor: "default" }}>
        <span className="tag">{tagLabel}</span>
        <span className="row-title">{e.client}</span>
        <span className="row-meta">{e.value}</span>
      </div>
      <div className="row-body">
        <div className="field">
          <span className="field-label quiet">Status</span>
          <p>{e.status}</p>
        </div>
        {e.note && (
          <div className="field">
            <span className="field-label">{tagLabel === "closed" ? "Notes" : "Next action"}</span>
            <p className="strong">{e.note}</p>
          </div>
        )}
      </div>
    </li>
  );
}
