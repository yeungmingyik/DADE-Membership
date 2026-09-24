import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(new URL(path, new URL("../", import.meta.url)), "utf8");
const version = read("VERSION").trim();
const manifest = JSON.parse(read("package.json"));
const lock = JSON.parse(read("package-lock.json"));
const releases = JSON.parse(read("CHANGELOG.json"));
const versionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

assert.match(version, versionPattern, "Invalid VERSION");
assert.equal(manifest.version, version, "package.json version mismatch");
assert.equal(lock.version, version, "package-lock.json version mismatch");
assert.equal(lock.packages[""].version, version, "Lock root version mismatch");
assert.equal(lock.name, manifest.name, "Lock name mismatch");
assert.equal(lock.packages[""].name, manifest.name, "Lock root name mismatch");
assert.ok(Array.isArray(releases) && releases.length > 0, "Missing releases");
assert.equal(releases[0].version, version, "Latest release mismatch");

const versionNumbers = new Set();
const compareVersions = (left, right) => {
  const a = left.split(".").map(Number);
  const b = right.split(".").map(Number);
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
};

for (const [index, release] of releases.entries()) {
  assert.match(release.version, versionPattern, "Invalid release version");
  assert.ok(!versionNumbers.has(release.version), "Duplicate release version");
  versionNumbers.add(release.version);
  assert.match(release.date, /^\d{4}-\d{2}-\d{2}$/, "Invalid release date");
  assert.equal(new Date(`${release.date}T00:00:00Z`).toISOString().slice(0, 10), release.date, "Invalid calendar date");
  if (index > 0) {
    assert.ok(compareVersions(releases[index - 1].version, release.version) > 0, "Releases must be newest first");
    assert.ok(releases[index - 1].date >= release.date, "Release dates must be newest first");
  }
  let entries = 0;
  for (const category of ["added", "changed", "fixed", "removed"]) {
    assert.ok(Array.isArray(release[category]), `Missing ${category}`);
    for (const entry of release[category]) {
      for (const locale of ["en", "zh-CN"]) {
        assert.equal(typeof entry[locale], "string", `Missing ${locale}`);
        assert.ok(entry[locale].trim().length > 0, `Empty ${locale}`);
      }
      entries += 1;
    }
  }
  assert.ok(entries > 0, "Empty release");
}

const tracked = execFileSync("git", ["ls-files", "--cached", "-z"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
const forbidden = tracked.filter((path) => /(^|\/)(AGENTS?\.md|docs|\.local|node_modules|\.next|coverage|test-results|playwright-report)(\/|$)/i.test(path)
  || /(^|\/)\.env(?:\.|$)/i.test(path) && !/(^|\/)\.env\.example$/i.test(path)
  || /\.(?:sqlite3?|db3?)(?:-|$)/i.test(path)
  || /\.(?:pem|key|pfx|p12|log)$/i.test(path));
assert.deepEqual(forbidden, [], "Forbidden repository files");

process.stdout.write(`Release ${version} verified\n`);
