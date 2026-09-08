"use client";

import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import {
  addTopUp, removeTopUp, setApproved, setPick, toggleTopUp, kitchenLogout,
  type SaveResult,
} from "./actions";
import {
  buildShoppingList, evaluateMeasure, mealFor, resolvePicks, weekAverages,
  type KitchenState, type WeekDoc,
} from "./lib/week";

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
  const avg = useMemo(() => weekAverages(week, picks), [week, picks]);
  const list = useMemo(
    () => buildShoppingList(week, picks, state.topups),
    [week, picks, state.topups]
  );

  const measures = week.measures.map((m) => ({
    ...m,
    ...evaluateMeasure(m, avg[m.key]),
  }));

  return (
    <div className="kt">
      <div className="kt-wrap">
        <header className="kt-mast">
          <div className="kt-mast-top">
            <div>
              <h1>{week.weekLabel}</h1>
              <p className="kt-strap">{week.strapline}</p>
            </div>
            <div className="kt-who">
              <span className="kt-m up">You</span>
              {week.people.map((n) => (
                <button key={n} type="button" aria-pressed={who === n} onClick={() => whoStore.write(n)}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          {state.approved ? (
            <p className="kt-said">
              <b>Approved by {state.approved.by}.</b> {state.approved.at}. The shopping list is at
              the bottom.
            </p>
          ) : (
            <p className="kt-said">{withEmphasis(week.copy.intro, week.copy.introBoldFrom)}</p>
          )}

          {!storeReady && (
            <p className="kt-said flagged">
              Nothing you tap is being kept yet, because no store is connected. The week shows, the
              changes do not last.
            </p>
          )}
        </header>

        <div className="kt-weekstart" />

        {week.days.map((day) => {
          const meal = mealFor(week, day, picks);
          const changed = picks[day.k] !== day.base;
          const pool = [...day.alts, ...(changed ? [day.base] : [])].filter((a) => a !== picks[day.k]);
          return (
            <div className="kt-day" key={day.k}>
              <div className="kt-day-main">
                <span className="kt-m kt-dayname">
                  {day.d.slice(0, 3)}
                  {changed && (
                    <>
                      <br />
                      swapped
                    </>
                  )}
                </span>
                <div>
                  <h3 className="kt-meal">{meal.n}</h3>
                  <p className="kt-cook">{meal.c}</p>
                  <span className="kt-figs">
                    <span className="kt-m kt-fig">
                      <i>prot</i>
                      {meal.p}
                    </span>
                    <span className={`kt-m kt-fig${meal.s >= week.satFatOutlier ? " over" : ""}`}>
                      <i>sat</i>
                      {meal.s}
                    </span>
                    <span className="kt-m kt-fig">
                      <i>fib</i>
                      {meal.f}
                    </span>
                  </span>
                  <p className="kt-m kt-side">
                    {week.copy.sideLabel} {day.side.toLowerCase()}
                  </p>
                  <div className="kt-controls">
                    <button
                      type="button"
                      className="kt-link"
                      aria-expanded={openSwap === day.k}
                      onClick={() => setOpenSwap(openSwap === day.k ? null : day.k)}
                    >
                      {openSwap === day.k ? "Close" : "Swap"}
                    </button>
                    {changed && (
                      <button
                        type="button"
                        className="kt-link"
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
              </div>

              {openSwap === day.k && (
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
                        <span className="kt-altname">{alt.n}</span>
                        <span className="kt-figs">
                          <span className="kt-m kt-fig">
                            <i>prot</i>
                            {alt.p}
                          </span>
                          <span className={`kt-m kt-fig${alt.s >= week.satFatOutlier ? " over" : ""}`}>
                            <i>sat</i>
                            {alt.s}
                          </span>
                          <span className="kt-m kt-fig">
                            <i>fib</i>
                            {alt.f}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        <section className="kt-section">
          <h2>{week.copy.measuresHeading}</h2>
          <p className="kt-sub">{week.copy.measuresSub}</p>
          {measures.map((m) => (
            <div className="kt-measure" key={m.key}>
              <div className="kt-measure-top">
                <span className="kt-m up">{m.label}</span>
                <span className={`kt-measure-v${m.miss ? " miss" : ""}`}>
                  {avg[m.key].toFixed(1)} g
                </span>
              </div>
              <div className="kt-plot">
                <div
                  className={`kt-plot-line${m.miss ? " miss" : ""}`}
                  style={{ width: `${m.widthPct}%` }}
                />
                <div className="kt-plot-tick" style={{ left: "100%" }}>
                  <span className="kt-m">{m.tick}</span>
                </div>
              </div>
              <p className="kt-note">{m.text}</p>
            </div>
          ))}
        </section>

        <section className="kt-section">
          <h2>{week.copy.staplesHeading}</h2>
          <p className="kt-sub">{week.copy.staplesSub}</p>
          <div className="kt-inline">
            {week.rossStaples.map(([item, qty]) => (
              <span className="kt-item" key={item}>
                <span className="t">{item}</span>
                <span className="kt-m">{qty}</span>
              </span>
            ))}
          </div>
        </section>

        <section className="kt-section">
          <h2>{week.copy.topUpsHeading}</h2>
          <p className="kt-sub">{week.copy.topUpsSub}</p>
          <div className="kt-inline">
            {state.topups.length === 0 && (
              <span className="kt-m">Nothing yet</span>
            )}
            {state.topups.map((t) => (
              <span className={`kt-item${t.got ? " got" : ""}`} key={t.id}>
                <button
                  type="button"
                  className="t"
                  disabled={pending}
                  title={t.got ? "Mark as still needed" : "Mark as already got"}
                  onClick={() => run(() => toggleTopUp(week.weekId, t.id))}
                >
                  {t.text}
                </button>
                <button
                  type="button"
                  className="x"
                  aria-label={`Remove ${t.text}`}
                  disabled={pending}
                  onClick={() => run(() => removeTopUp(week.weekId, t.id))}
                >
                  drop
                </button>
              </span>
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
            <button className="kt-link" type="submit" disabled={pending}>
              Add
            </button>
          </form>
        </section>

        {state.approved && (
          <section className="kt-section">
            <h2>{week.copy.listHeading}</h2>
            <p className="kt-sub">{week.copy.listSub}</p>
            <pre className="kt-pre">{list}</pre>
          </section>
        )}

        <footer className="kt-foot">
          {week.copy.footer}{" "}
          <button type="button" onClick={() => kitchenLogout()}>
            Log out
          </button>
        </footer>
      </div>

      <div className="kt-dock">
        <div className="kt-dock-in">
          <span className="st kt-m">{pending ? "Saving" : note}</span>
          <button
            type="button"
            className={`kt-do${state.approved ? " undo" : ""}`}
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
