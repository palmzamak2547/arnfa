import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

/**
 * Guard: no raw control bytes in tracked source.
 *
 * A `\0` written through a shell heredoc can collapse into a REAL NUL byte in the file. That is
 * invisible in most diffs, turns the file "binary" to git/grep, and here it silently broke saving
 * a trip for every day except today — Postgres text cannot store U+0000, so the insert failed and
 * the button just reverted with no error. (Same class as the Tipjai authDest.ts incident.)
 * Cheap to check, expensive to find by hand.
 */
describe("source hygiene", () => {
  it("has no raw control bytes in tracked source files", () => {
    const files = execSync("git ls-files", { encoding: "utf8" })
      .trim().split("\n")
      .filter((f) => /\.(ts|tsx|js|mjs|cjs|css|json)$/.test(f));

    const offenders: string[] = [];
    for (const f of files) {
      let buf: Buffer;
      try { buf = readFileSync(f); } catch { continue; }
      for (let i = 0; i < buf.length; i++) {
        const c = buf[i];
        // allow \t (9), \n (10), \r (13); flag NUL and the other C0 controls
        if (c === 0 || (c < 9) || c === 11 || c === 12) {
          offenders.push(`${f} @${i} (byte ${c})`);
          break;
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
