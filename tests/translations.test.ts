import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

function keys(value: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(value).flatMap(([key, item]) => typeof item === "object" && item !== null ? keys(item as Record<string, unknown>, `${prefix}${key}.`) : `${prefix}${key}`).sort();
}

describe("translation coverage", () => {
  for (const namespace of ["common", "member", "operations"]) it(`${namespace} has both locales`, () => {
    const en = JSON.parse(readFileSync(new URL(`../src/messages/${namespace}-en.json`, import.meta.url), "utf8"));
    const zh = JSON.parse(readFileSync(new URL(`../src/messages/${namespace}-zh-CN.json`, import.meta.url), "utf8"));
    expect(keys(zh)).toEqual(keys(en));
  });
});
