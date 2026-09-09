"use client";

import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import {
  addTopUp, removeTopUp, setApproved, setPick, toggleTopUp, kitchenLogout,
  type SaveResult,
} from "./actions";
import {
  buildShoppingList, buildShoppingRows, evaluateMeasure, mealFor, plateFor, resolvePicks,
  weekAveragesFor, type KitchenState, type WeekDoc,
} from "./lib/week";

const fill = (tpl: string | undefined, name: string, fallback: string) =>
  (tpl ?? fallback).replace("{name}", name);

const WHO_KEY = "kitchen-who";

// Which of the two of you is holding the phone. It lives in localStorage
// rather than the shared store, because it is a fact about this handset and
// not about the week. Read through useSyncExternalStore so the server render
// and the first client render agree on null rather than flashing a value in.
const whoStore = {
  listeners: new Set<() => void>(),
  subscribe(cb: () => void) {
    whoStore.listeners.add(cb);
    return () => {
      whoStore.listeners.delete(cb);
    };
  },
  read(): string | null {
    try {
      return localStorage.getItem(WHO_KEY);
    } catch {
      return null;
    }
  },
  write(value: string) {
    try {
      localStorage.setItem(WHO_KEY, value);
    } catch {}
    whoStore.listeners.forEach((l) => l());
  },
};

// The intro carries one emphasised phrase. Which phrase is content, so it
// comes from the week file too, and the page still reads correctly when it
// is absent.
function withEmphasis(text: string, bold?: string) {
  if (!text) return null;
  if (!bold || !text.includes(bold)) return text;
  const [before, after] = text.split(bold);
  return (
    <>
      {before}
      <b>{bold}</b>
      {after}
    </>
  );
}

function Figs({ p, s, f, over }: { p: number; s: number; f: number; over: boolean }) {
  return (
    <div className="kt-figs">
      <div className="kt-fig">
        <span className="v kt-num">{p}</span>
        <span className="kt-lab">prot</span>
      </div>
      <div className={`kt-fig${over ? " over" : ""}`}>
        <span className="v kt-num">{s}</span>
        <span className="kt-lab">sat</span>
      </div>
      <div className="kt-fig">
        <span className="v kt-num">{f}</span>
        <span className="kt-lab">fib</span>
      </div>
    </div>
  );
}

export default function KitchenView({
  week, initialState, storeReady,
}: {
  week: WeekDoc;
  initialState: KitchenState;
  storeReady: boolean;
}) {
  const [state, setState] = useState<KitchenState>(initialState);
  const who = useSyncExternalStore(whoStore.subscribe, whoStore.read, () => null);
  const [openSwap, setOpenSwap] = useState<string | null>(null);
  const [note, setNote] = useState<string>(
    storeReady ? "Saved for both of you" : "Nothing is being kept: no store is connected"
  );
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<SaveResult>) {
    startTransition(async () => {
      const res = await fn();
      if (res.state) {
        setState(res.state);
        setNote("Saved for both of you");
      } else if (res.error) setNote(res.error);
    });
  }

  const picks = useMemo(() => resolvePicks(week, state.picks), [week, state.picks]);

  // Whose plate the page is showing. The switch at the top sets it; with
  // nothing chosen yet, the first person in the week file is shown.
  const viewer = who && week.profiles[who] ? who : week.people[0] ?? null;
  const profile = viewer ? week.profiles[viewer] : undefined;
  const avg = useMemo(() => weekAveragesFor(week, picks, viewer), [week, picks, viewer]);
  const rows = useMemo(
    () => buildShoppingRows(week, picks, state.topups),
    [week, picks, state.topups]
  );
  const listText = useMemo(
    () => buildShoppingList(week, picks, state.topups),
    [week, picks, state.topups]
  );
  const [copied, setCopied] = useState(false);
  async function copyList() {
    try {
      await navigator.clipboard.writeText(listText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // No clipboard access in this context: leave the rows on screen to
      // read from. Nothing else useful can be done here.
    }
  }
  const measures = (profile?.measures ?? []).map((m) => ({ ...m, ...evaluateMeasure(m, avg[m.key]) }));

  return (
    <div className="kt">
      <div className="kt-wrap">
        <header className="kt-head">
          <div>
            <h1>{week.weekLabel}</h1>
            <p className="kt-sub2">{week.strapline}</p>
          </div>
          <div className="kt-who">
            {week.people.map((n) => (
              <button key={n} type="button" aria-pressed={who === n} onClick={() => whoStore.write(n)}>
                {n}
              </button>
            ))}
          </div>
        </header>

        <div className="kt-grid">
          <div className={`kt-card kt-span ${state.approved ? "yellow" : "lilac"}`}>
            {state.approved ? (
              <p className="kt-quote">
                <b>Approved by {state.approved.by}.</b> {state.approved.at}. The shopping list is at
                the bottom.
              </p>
            ) : (
              <p className="kt-quote">{withEmphasis(week.copy.intro, week.copy.introBoldFrom)}</p>
            )}
          </div>

          {!storeReady && (
            <div className="kt-card red kt-span">
              <p className="kt-quote">
                <b>Nothing you tap is being kept yet.</b> No store is connected, so the week shows
                and the changes do not last.
              </p>
            </div>
          )}

          {profile && viewer && (
            <section className="kt-card yellow kt-span">
              <div className="kt-prof-head">
                <h2 className="kt-prof-name">{fill(week.copy.profileHeading, viewer, "{name} this week")}</h2>
                <span className="kt-lab">{fill(week.copy.plateLabel, viewer, "{name}'s plate")}</span>
              </div>
              <p className="kt-cook">{profile.note}</p>
              <div className="kt-targets">
                {profile.targets.protein !== undefined && (
                  <div className="kt-fig"><span className="v kt-num">{profile.targets.protein}</span><span className="kt-lab">protein a day</span></div>
                )}
                {profile.targets.satFat !== undefined && (
                  <div className="kt-fig"><span className="v kt-num">{profile.targets.satFat}</span><span className="kt-lab">sat fat cap</span></div>
                )}
                {profile.targets.fibre !== undefined && (
                  <div className="kt-fig"><span className="v kt-num">{profile.targets.fibre}</span><span className="kt-lab">fibre a day</span></div>
                )}
              </div>
              {profile.placeholder && week.copy.placeholderNote && (
                <p className="kt-stand">{week.copy.placeholderNote}</p>
              )}
              <div style={{ marginTop: "0.9rem" }}>
                {measures.map((m) => (
                  <div className="kt-m" key={m.key}>
                    <div className="kt-m-top">
                      <span className="kt-lab">{m.label}</span>
                      <span className={`kt-m-v kt-num${m.miss ? " miss" : ""}`}>{avg[m.key].toFixed(1)} g</span>
                    </div>
                    <div className="kt-bar">
                      <div className={`kt-bar-fill${m.miss ? " miss" : ""}`} style={{ width: `${m.widthPct}%` }} />
                      <div className="kt-bar-tick" />
                    </div>
                    <div className="kt-scale">
                      <span className="kt-lab">0 g</span>
                      <span className="kt-lab">{m.tick}</span>
                    </div>
                    <p className="kt-m-note">{m.text}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {week.days.map((day) => {
            const meal = mealFor(week, day, picks);
            const plate = plateFor(week, day, picks, viewer);
            const add = viewer ? day.adds?.[viewer] : undefined;
            const changed = picks[day.k] !== day.base;
            const pool = [...day.alts, ...(changed ? [day.base] : [])].filter((a) => a !== picks[day.k]);
            const open = openSwap === day.k;
            return (
              <article key={day.k} className={`kt-card kt-span ${changed ? "lilac" : "cream"}`}>
                <div className="kt-day-top">
                  <span className="kt-lab">{day.d}</span>
                  <span className="kt-lab">{changed ? "swapped" : meal.flag ?? "suits both"}</span>
                </div>
                <div className="kt-day-grid">
                  <div>
                    <h3 className="kt-meal">{meal.n}</h3>
                    <p className="kt-cook">{meal.c}</p>
                    {add && (
                      <p className="kt-adds">
                        {viewer} {week.copy.addsLabel ?? "adds"} {add.text.toLowerCase()}
                      </p>
                    )}
                  </div>
                  <Figs p={plate.p} s={plate.s} f={plate.f} over={meal.s >= week.satFatOutlier} />
                  <div className="kt-btns">
                    <button
                      type="button"
                      className="kt-pill"
                      aria-expanded={open}
                      onClick={() => setOpenSwap(open ? null : day.k)}
                    >
                      {open ? "Close" : "Swap"}
                    </button>
                    {changed && (
                      <button
                        type="button"
                        className="kt-pill"
                        disabled={pending}
                        onClick={() => {
                          setOpenSwap(null);
                          run(() => setPick(week.weekId, day.k, day.base));
                        }}
                      >
                        Put back
                      </button>
                    )}
                  </div>
                </div>
                {open && (
                  <div className="kt-alts">
                    {pool.map((id) => {
                      const alt = week.meals[id];
                      return (
                        <button
                          key={id}
                          type="button"
                          className="kt-alt"
                          disabled={pending}
                          onClick={() => {
                            setOpenSwap(null);
                            run(() => setPick(week.weekId, day.k, id));
                          }}
                        >
                          <span className="kt-alt-n">{alt.n}</span>
                          <span className="kt-alt-f kt-num">
                            {alt.p} / {alt.s} / {alt.f}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </article>
            );
          })}

          <section className="kt-card olive">
            <span className="kt-lab">{week.copy.staplesHeading}</span>
            <p className="kt-cook" style={{ marginBottom: "0.5rem" }}>{week.copy.staplesSub}</p>
            <div className="kt-rows">
              {week.rossStaples.map(([item, qty]) => (
                <div className="kt-row" key={item}>
                  <span className="name">{item}</span>
                  <span className="qty">{qty}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="kt-card red">
            <span className="kt-lab">{week.copy.topUpsHeading}</span>
            <p className="kt-cook" style={{ marginBottom: "0.5rem" }}>{week.copy.topUpsSub}</p>
            <div className="kt-rows">
              {state.topups.length === 0 && <div className="kt-row"><span className="name">Nothing yet</span></div>}
              {state.topups.map((t) => (
                <div className={`kt-row${t.got ? " got" : ""}`} key={t.id}>
                  <button
                    type="button"
                    className="name"
                    disabled={pending}
                    title={t.got ? "Mark as still needed" : "Mark as already got"}
                    onClick={() => run(() => toggleTopUp(week.weekId, t.id))}
                  >
                    {t.text}
                  </button>
                  <button
                    type="button"
                    className="drop"
                    aria-label={`Remove ${t.text}`}
                    disabled={pending}
                    onClick={() => run(() => removeTopUp(week.weekId, t.id))}
                  >
                    Drop
                  </button>
                </div>
              ))}
            </div>
            <form
              className="kt-form"
              onSubmit={(e) => {
                e.preventDefault();
                const text = draft;
                if (!text.trim()) return;
                setDraft("");
                run(() => addTopUp(week.weekId, text));
              }}
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="coconut milk"
                aria-label="Add a top-up item"
                autoComplete="off"
              />
              <button className="kt-pill solid" type="submit" disabled={pending}>
                Add
              </button>
            </form>
          </section>

          <section className="kt-card cream kt-span">
            <div className="kt-day-top">
              <span className="kt-lab">{week.copy.listHeading}</span>
              <span className="kt-lab kt-num">{rows.count} items</span>
            </div>
            <p className="kt-cook">{week.copy.listSub}</p>
            {rows.aisles.map((a) => (
              <div className="kt-aisle" key={a.key}>
                <span className="kt-lab">{a.title}</span>
                <div className="kt-rows">
                  {a.rows.map((r) => (
                    <div className="kt-row" key={r.item}>
                      <span className="name">{r.item}</span>
                      <span className="qty">{r.qty}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {rows.own.length > 0 && (
              <div className="kt-aisle">
                <span className="kt-lab">{week.copy.listOwnSection}</span>
                <div className="kt-rows">
                  {rows.own.map((r) => (
                    <div className="kt-row" key={r.item}>
                      <span className="name">{r.item}</span>
                      <span className="qty">{r.qty}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {rows.topups.length > 0 && (
              <div className="kt-aisle">
                <span className="kt-lab">Top-ups from the kitchen</span>
                <div className="kt-rows">
                  {rows.topups.map((tp) => (
                    <div className="kt-row" key={tp.id}>
                      <span className="name">{tp.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {week.copy.listTail && <p className="kt-cook" style={{ marginTop: "0.9rem" }}>{week.copy.listTail}</p>}
            <div className="kt-btns">
              <button type="button" className="kt-pill solid" onClick={copyList}>
                {copied ? "Copied" : "Copy the list"}
              </button>
            </div>
          </section>
        </div>

        <footer className="kt-foot">
          {week.copy.footer}{" "}
          <button type="button" onClick={() => kitchenLogout()}>
            Log out
          </button>
        </footer>
      </div>

      <div className="kt-dock">
        <div className="kt-dock-in">
          <span className="st">{pending ? "Saving" : note}</span>
          <button
            type="button"
            className={`kt-go${state.approved ? " undo" : ""}`}
            disabled={pending || !storeReady}
            onClick={() =>
              run(() =>
                setApproved(week.weekId, state.approved ? null : who ?? "someone in the kitchen")
              )
            }
          >
            {state.approved ? "Unapprove" : "Approve the week"}
          </button>
        </div>
      </div>
    </div>
  );
}
