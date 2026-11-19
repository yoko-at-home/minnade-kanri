import assert from "node:assert/strict";
import {
  garbageTypeOf,
  previousWorkDay,
  rewardOf,
  toDateKey,
} from "../src/lib/schedule";

function on(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

assert.equal(garbageTypeOf(on(2026, 11, 1)), "off");
assert.equal(garbageTypeOf(on(2026, 11, 2)), "off");
assert.equal(garbageTypeOf(on(2026, 11, 3)), "recycle");
assert.equal(garbageTypeOf(on(2026, 11, 10)), "recycle");
assert.equal(garbageTypeOf(on(2026, 11, 17)), "recycle");
assert.equal(garbageTypeOf(on(2026, 11, 24)), "nonburnable");
assert.equal(garbageTypeOf(on(2026, 12, 22)), "nonburnable");
assert.equal(garbageTypeOf(on(2026, 12, 29)), "recycle");
assert.equal(garbageTypeOf(on(2026, 11, 4)), "burnable");
assert.equal(garbageTypeOf(on(2026, 11, 5)), "plastic");
assert.equal(garbageTypeOf(on(2026, 11, 6)), "pet");
assert.equal(garbageTypeOf(on(2026, 11, 7)), "burnable");
assert.equal(toDateKey(previousWorkDay(on(2026, 11, 5))!), "2026-11-04");
assert.equal(toDateKey(previousWorkDay(on(2026, 11, 10))!), "2026-11-07");
assert.equal(rewardOf(), 5000);

console.log("schedule checks passed");
