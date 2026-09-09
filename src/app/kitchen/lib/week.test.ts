import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseWeek,
  resolvePicks,
  weekAverages,
  buildShoppingList,
  buildShoppingRows,
  mergeTopUps,
  evaluateMeasure,
  type Measure,
  type WeekDoc,
} from "./week.ts";

const WEEK: WeekDoc = {
  weekId: "2026-09-14",
  weekLabel: "Week of Monday 14 September",
  strapline: "",
  capSatFat: 20,
  targetFibre: 30,
  meals: {
    cod: { n: "Cod", c: "", p: 36, s: 1, f: 9, i: [["Cod fillets", "2", "fish"], ["Lemons", "2", "fruit"]] },
    lamb: { n: "Lamb", c: "", p: 44, s: 11, f: 8, i: [["Lamb steaks", "400 g", "meat"], ["Lemons", "1", "fruit"]] },
  },
  days: [
    { d: "Monday", k: "mon", base: "cod", alts: ["lamb"], side: "Rice" },
    { d: "Tuesday", k: "tue", base: "lamb", alts: ["cod"], side: "Lentils" },
  ],
  rossStaples: [["Brown rice", "1 bag", "cupboard"]],
  always: [["Olive oil", "1 bottle", "cupboard"]],
  aisles: [["fish", "Fish"], ["meat", "Meat and poultry"], ["fruit", "Fruit"], ["cupboard", "Cupboard"]],
  satFatOutlier: 8,
  measures: [],
  people: ["A", "B"],
  copy: {
    intro: "", sideLabel: "Adds", measuresHeading: "", measuresSub: "",
    staplesHeading: "", staplesSub: "", topUpsHeading: "", topUpsSub: "",
    listHeading: "", listSub: "", footer: "",
    listOwnSection: "One of us only",
    listTail: "Check the cupboard first.",
  },
};

test("parseWeek: rejects a week whose day points at a meal that does not exist", () => {
  const bad = JSON.stringify({ ...WEEK, days: [{ d: "Monday", k: "mon", base: "ghost", alts: [], side: "" }] });
  assert.throws(() => parseWeek(bad), /unknown meal "ghost"/);
});

test("parseWeek: rejects a week with no days rather than rendering an empty plan", () => {
  assert.throws(() => parseWeek(JSON.stringify({ ...WEEK, days: [] })), /days/);
});

test("parseWeek: accepts the real week file shape", () => {
  const w = parseWeek(JSON.stringify(WEEK));
  assert.equal(w.days.length, 2);
  assert.equal(w.meals.cod.p, 36);
});

test("resolvePicks: falls back to the proposal when a saved pick names a deleted meal", () => {
  const picks = resolvePicks(WEEK, { mon: "deleted-recipe", tue: "cod" });
  assert.equal(picks.mon, "cod", "unknown pick should fall back to the day's base");
  assert.equal(picks.tue, "cod", "a valid pick should win over the base");
});

test("resolvePicks: covers every day even when nothing has been saved", () => {
  const picks = resolvePicks(WEEK, undefined);
  assert.deepEqual(picks, { mon: "cod", tue: "lamb" });
});

test("weekAverages: averages over the days, not the meals in the library", () => {
  const a = weekAverages(WEEK, { mon: "cod", tue: "lamb" });
  assert.equal(a.protein, 40);
  assert.equal(a.satFat, 6);
  assert.equal(a.fibre, 8.5);
});

test("weekAverages: a swap changes the numbers", () => {
  const before = weekAverages(WEEK, { mon: "cod", tue: "lamb" });
  const after = weekAverages(WEEK, { mon: "cod", tue: "cod" });
  assert.ok(after.satFat < before.satFat, "swapping the lamb out should drop saturated fat");
});

test("buildShoppingList: combines the same item bought for two meals into one line", () => {
  const list = buildShoppingList(WEEK, { mon: "cod", tue: "lamb" }, []);
  assert.match(list, /Lemons {2}2 \+ 1/);
});

test("buildShoppingList: groups by aisle and keeps Ross's additions separate", () => {
  const list = buildShoppingList(WEEK, { mon: "cod", tue: "lamb" }, []);
  assert.ok(list.indexOf("FISH") < list.indexOf("MEAT AND POULTRY"), "aisles run in the declared order");
  assert.match(list, /ONE OF US ONLY\n {2}Brown rice/);
});

test("buildShoppingList: includes top-ups still needed and omits ones already got", () => {
  const list = buildShoppingList(WEEK, { mon: "cod", tue: "lamb" }, [
    { id: "a", text: "coconut milk", got: false },
    { id: "b", text: "bin bags", got: true },
  ]);
  assert.match(list, /coconut milk/);
  assert.doesNotMatch(list, /bin bags/);
});

test("mergeTopUps: keeps an item the other person added while I was typing", () => {
  const mine = [{ id: "a", text: "coconut milk", got: false }];
  const theirs = [{ id: "b", text: "olive oil", got: false }];
  const merged = mergeTopUps(mine, theirs);
  assert.equal(merged.length, 2);
});

test("mergeTopUps: my version of the same item wins", () => {
  const merged = mergeTopUps(
    [{ id: "a", text: "coconut milk", got: true }],
    [{ id: "a", text: "coconut milk", got: false }]
  );
  assert.equal(merged.length, 1);
  assert.equal(merged[0].got, true);
});


const SAT: Measure = {
  key: "satFat", label: "Sat fat at dinner", scale: 20, tick: "20 g daily cap", missAbove: 9,
  ok: "Uses {value} g of the {scale} g cap, leaving {remainder} g.",
  miss: "Taking {value} g of the {scale} g cap.",
};
const FIB: Measure = {
  key: "fibre", label: "Fibre at dinner", scale: 30, tick: "30 g daily target", missBelow: 8,
  ok: "Brings {value} g of {scale} g.", miss: "Only {value} g.",
};

test("evaluateMeasure: fills the figures into the sentence the week earned", () => {
  const r = evaluateMeasure(SAT, 3.3);
  assert.equal(r.miss, false);
  assert.equal(r.text, "Uses 3.3 g of the 20 g cap, leaving 16.7 g.");
});

test("evaluateMeasure: a measure with an upper limit misses when it goes over", () => {
  assert.equal(evaluateMeasure(SAT, 12).miss, true);
  assert.match(evaluateMeasure(SAT, 12).text, /Taking 12.0 g/);
});

test("evaluateMeasure: a measure with a lower target misses when it falls short", () => {
  assert.equal(evaluateMeasure(FIB, 6).miss, true);
  assert.equal(evaluateMeasure(FIB, 9).miss, false);
});

test("evaluateMeasure: the plot never runs past its own scale or vanishes", () => {
  assert.equal(evaluateMeasure(SAT, 40).widthPct, 100);
  assert.equal(evaluateMeasure(SAT, 0).widthPct, 1);
  assert.ok(Math.abs(evaluateMeasure(SAT, 10).widthPct - 50) < 0.001);
});

test("evaluateMeasure: {value0} rounds to whole grams for the protein line", () => {
  const m: Measure = { ...FIB, ok: "Averages {value0} g.", missBelow: undefined };
  assert.equal(evaluateMeasure(m, 40.6).text, "Averages 41 g.");
});


test("buildShoppingRows: counts every line a person would have to pick up", () => {
  const r = buildShoppingRows(WEEK, { mon: "cod", tue: "lamb" }, [
    { id: "a", text: "coconut milk", got: false },
    { id: "b", text: "bin bags", got: true },
  ]);
  // cod fillets, lamb steaks, lemons (merged), olive oil = 4 aisle rows;
  // brown rice = 1 own row; coconut milk = 1 top-up still needed.
  assert.equal(r.count, 6);
  assert.equal(r.topups.length, 1);
});

test("buildShoppingRows: a swap changes the rows, so the list is live", () => {
  const before = buildShoppingRows(WEEK, { mon: "cod", tue: "lamb" }, []);
  const after = buildShoppingRows(WEEK, { mon: "cod", tue: "cod" }, []);
  const items = (r: ReturnType<typeof buildShoppingRows>) =>
    r.aisles.flatMap((a) => a.rows.map((x) => x.item));
  assert.ok(items(before).includes("Lamb steaks"));
  assert.ok(!items(after).includes("Lamb steaks"));
});

test("buildShoppingRows: empty aisles are dropped rather than shown with no rows", () => {
  const r = buildShoppingRows(WEEK, { mon: "cod", tue: "cod" }, []);
  assert.ok(!r.aisles.some((a) => a.key === "meat"));
});
