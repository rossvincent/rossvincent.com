// Pure shape-and-arithmetic layer for the kitchen page. Deliberately no
// "server-only" guard and no next/* imports, for the same reason as
// board/lib/password.ts: these run under plain `node --test` with type
// stripping. Everything here is a pure function of its arguments.

export type Aisle = string;
export type Ingredient = [item: string, qty: string, aisle: Aisle];

export interface Meal {
  n: string; // the dinner, as it reads on the card
  c: string; // one line on how it is cooked
  p: number; // protein, grams per portion
  s: number; // saturated fat, grams per portion
  f: number; // fibre, grams per portion
  flag?: string; // shown instead of "suits both" when a meal needs a warning
  i: Ingredient[];
}

export interface Day {
  d: string; // Monday
  k: string; // mon
  base: string; // meal id proposed for this day
  alts: string[]; // meal ids offered when someone taps swap
  side: string; // what Ross adds at the table
}

export interface Measure {
  key: "protein" | "satFat" | "fibre";
  label: string;
  scale: number;
  tick: string;
  missAbove?: number;
  missBelow?: number;
  ok: string;
  miss: string;
}

// Every human sentence on the page comes from here rather than from this
// file. This repository is public; the week file it renders is not. Nothing
// in the site's own code should name a person, a diet or a health target.
export interface Copy {
  intro: string;
  introBoldFrom?: string;
  sideLabel: string;
  measuresHeading: string;
  measuresSub: string;
  staplesHeading: string;
  staplesSub: string;
  topUpsHeading: string;
  topUpsSub: string;
  listHeading: string;
  listSub: string;
  footer: string;
  listOwnSection: string;
  listTail: string;
}

export interface WeekDoc {
  weekId: string;
  weekLabel: string;
  strapline: string;
  capSatFat: number;
  targetFibre: number;
  meals: Record<string, Meal>;
  days: Day[];
  rossStaples: Ingredient[];
  always: Ingredient[];
  aisles: [key: string, title: string][];
  satFatOutlier: number;
  measures: Measure[];
  copy: Copy;
  people: string[];
}

export interface TopUp {
  id: string;
  text: string;
  got: boolean;
}

export interface KitchenState {
  weekId: string;
  picks: Record<string, string>;
  topups: TopUp[];
  approved: { by: string; at: string } | null;
  updatedAt: string;
}

export function emptyState(weekId: string): KitchenState {
  return { weekId, picks: {}, topups: [], approved: null, updatedAt: "" };
}

// Throws rather than returning a partial week: a half-parsed meal plan that
// silently drops Thursday is worse than a page that says it is broken.
export function parseWeek(raw: string): WeekDoc {
  const w = JSON.parse(raw) as Partial<WeekDoc>;
  const missing: string[] = [];
  if (typeof w.weekId !== "string") missing.push("weekId");
  if (typeof w.weekLabel !== "string") missing.push("weekLabel");
  if (!w.meals || typeof w.meals !== "object") missing.push("meals");
  if (!Array.isArray(w.days) || w.days.length === 0) missing.push("days");
  if (missing.length) {
    throw new Error(`current.json is missing: ${missing.join(", ")}`);
  }
  for (const day of w.days as Day[]) {
    if (!(w.meals as Record<string, Meal>)[day.base]) {
      throw new Error(`current.json: ${day.d} points at unknown meal "${day.base}"`);
    }
    for (const a of day.alts ?? []) {
      if (!(w.meals as Record<string, Meal>)[a]) {
        throw new Error(`current.json: ${day.d} offers unknown meal "${a}"`);
      }
    }
  }
  // Fill in the optional furniture explicitly rather than spreading defaults
  // under the parsed object: a spread would let an absent key arrive as
  // undefined and silently win over the default.
  const parsed = w as WeekDoc;
  return {
    ...parsed,
    strapline: parsed.strapline ?? "",
    capSatFat: parsed.capSatFat ?? 20,
    targetFibre: parsed.targetFibre ?? 30,
    rossStaples: parsed.rossStaples ?? [],
    always: parsed.always ?? [],
    aisles: parsed.aisles ?? [],
    satFatOutlier: parsed.satFatOutlier ?? Number.POSITIVE_INFINITY,
    measures: parsed.measures ?? [],
    copy: parsed.copy ?? ({} as Copy),
    people: parsed.people ?? [],
  };
}

// A saved pick only wins if it names a meal that still exists. That way an
// old choice pointing at a deleted recipe falls back to the proposal
// instead of blanking the day.
export function resolvePicks(
  week: WeekDoc,
  saved: Record<string, string> | undefined
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const day of week.days) {
    const pick = saved?.[day.k];
    out[day.k] = pick && week.meals[pick] ? pick : day.base;
  }
  return out;
}

export function mealFor(week: WeekDoc, day: Day, picks: Record<string, string>): Meal {
  return week.meals[picks[day.k] ?? day.base] ?? week.meals[day.base];
}

export function weekAverages(
  week: WeekDoc,
  picks: Record<string, string>
): { protein: number; satFat: number; fibre: number } {
  const n = week.days.length || 1;
  let p = 0,
    s = 0,
    f = 0;
  for (const day of week.days) {
    const m = mealFor(week, day, picks);
    p += m.p;
    s += m.s;
    f += m.f;
  }
  return { protein: p / n, satFat: s / n, fibre: f / n };
}

export interface ShoppingRow {
  item: string;
  qty: string;
}

export interface ShoppingRows {
  aisles: { key: string; title: string; rows: ShoppingRow[] }[];
  own: ShoppingRow[];
  topups: TopUp[];
  count: number;
}

// The structured list, rebuilt from whatever is picked right now. The page
// renders this live, so a swap or a new top-up changes the list at once.
export function buildShoppingRows(
  week: WeekDoc,
  picks: Record<string, string>,
  topups: TopUp[]
): ShoppingRows {
  const bag = new Map<string, { item: string; aisle: string; qs: string[] }>();
  const add = ([item, qty, aisle]: Ingredient) => {
    const key = `${aisle}|${item}`;
    const row = bag.get(key);
    if (row) row.qs.push(qty);
    else bag.set(key, { item, aisle, qs: [qty] });
  };
  for (const day of week.days) mealFor(week, day, picks).i.forEach(add);
  week.always.forEach(add);

  const aisles = week.aisles
    .map(([key, title]) => ({
      key,
      title,
      rows: [...bag.values()]
        .filter((r) => r.aisle === key)
        .map((r) => ({ item: r.item, qty: r.qs.length > 1 ? r.qs.join(" + ") : r.qs[0] })),
    }))
    .filter((a) => a.rows.length > 0);
  const own = week.rossStaples.map(([item, qty]) => ({ item, qty }));
  const needed = topups.filter((t) => !t.got);
  const count = aisles.reduce((n, a) => n + a.rows.length, 0) + own.length + needed.length;
  return { aisles, own, topups: needed, count };
}

// The same list as plain text, for copying into a supermarket search box.
export function buildShoppingList(
  week: WeekDoc,
  picks: Record<string, string>,
  topups: TopUp[]
): string {
  const r = buildShoppingRows(week, picks, topups);
  let out = `SHOPPING LIST, ${week.weekLabel.toLowerCase()}\n`;
  for (const a of r.aisles) {
    out += `\n${a.title.toUpperCase()}\n`;
    for (const row of a.rows) out += `  ${row.item}  ${row.qty}\n`;
  }
  if (r.own.length) {
    out += `\n${(week.copy.listOwnSection ?? "Also").toUpperCase()}\n`;
    for (const row of r.own) out += `  ${row.item}  ${row.qty}\n`;
  }
  if (r.topups.length) {
    out += `\nTOP-UPS FROM THE KITCHEN\n`;
    for (const t of r.topups) out += `  ${t.text}\n`;
  }
  if (week.copy.listTail) out += `\n${week.copy.listTail}\n`;
  return out;
}

// Two people tapping at once. Last-writer-wins on picks is fine, because a
// pick is one value and the loser just taps again. Top-ups are not fine:
// a straight overwrite silently loses whatever the other person added
// between the read and the write, so they merge by id instead.
export function mergeTopUps(mine: TopUp[], theirs: TopUp[]): TopUp[] {
  const out = new Map<string, TopUp>();
  for (const t of theirs) out.set(t.id, t);
  for (const t of mine) out.set(t.id, t);
  return [...out.values()];
}


// Picks the sentence the week has earned and fills in its figures. The rule
// itself (the threshold) is arithmetic and lives here; the words are content
// and live in the week file.
export function evaluateMeasure(
  m: Measure,
  value: number
): { miss: boolean; text: string; widthPct: number } {
  const miss =
    (m.missAbove !== undefined && value > m.missAbove) ||
    (m.missBelow !== undefined && value < m.missBelow);
  const fills: Record<string, string> = {
    value: value.toFixed(1),
    value0: value.toFixed(0),
    scale: String(m.scale),
    remainder: (m.scale - value).toFixed(1),
  };
  const text = (miss ? m.miss : m.ok).replace(
    /\{(value0|value|scale|remainder)\}/g,
    (_, k: string) => fills[k]
  );
  return { miss, text, widthPct: Math.max(1, Math.min(100, (value / m.scale) * 100)) };
}
