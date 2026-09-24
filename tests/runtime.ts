import assert from "node:assert/strict";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { basename, isAbsolute, join, relative, resolve, sep } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import type { Locale, Surface } from "../src/lib/contracts";
import { cookieName } from "../src/server/surface";
import { createTestFixture } from "./fixtures";

type RunningServer = {
  surface: Surface;
  origin: string;
  child: ChildProcessWithoutNullStreams;
  closed: Promise<void>;
  output: string;
  spawnError: Error | null;
};

const surfaces: Surface[] = ["member", "staff", "admin"];
const locales: Locale[] = ["en", "zh-CN"];

async function availablePort() {
  return new Promise<number>((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("RUNTIME_PORT_UNAVAILABLE")));
        return;
      }
      server.close(error => error ? reject(error) : resolvePort(address.port));
    });
  });
}

async function request(server: RunningServer, path: string, init: RequestInit = {}) {
  return fetch(`${server.origin}${path}`, {
    ...init,
    redirect: "manual",
    signal: AbortSignal.timeout(10000),
  });
}

async function waitUntilReady(server: RunningServer) {
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    if (server.spawnError) throw server.spawnError;
    if (server.child.exitCode !== null || server.child.signalCode !== null) {
      throw new Error(`RUNTIME_SERVER_EXITED_${server.surface}`);
    }
    try {
      const response = await request(server, "/api/health");
      await response.text();
      if (response.status === 200) return;
    } catch {
      await delay(200);
    }
    await delay(100);
  }
  throw new Error(`RUNTIME_SERVER_TIMEOUT_${server.surface}`);
}

async function stopServer(server: RunningServer) {
  if (server.child.exitCode === null && server.child.signalCode === null) server.child.kill("SIGTERM");
  const closed = await Promise.race([
    server.closed.then(() => true),
    delay(5000, false, { ref: false }),
  ]);
  if (closed) return;
  server.child.kill("SIGKILL");
  const killed = await Promise.race([
    server.closed.then(() => true),
    delay(5000, false, { ref: false }),
  ]);
  if (!killed) throw new Error(`RUNTIME_SERVER_STOP_FAILED_${server.surface}`);
}

async function assertLoginRedirect(response: Response, locale: Locale, origin: string) {
  const body = await response.text();
  assert.ok([303, 307, 308].includes(response.status), `Protected pages must redirect anonymous sessions; received ${response.status}; streamed redirect: ${body.includes("NEXT_REDIRECT")}`);
  const location = response.headers.get("location");
  assert.ok(location, "Protected redirect must provide a location");
  const destination = new URL(location, origin);
  assert.equal(destination.origin, origin, "Login redirects must preserve the request origin");
  assert.equal(destination.pathname, `/${locale}/login`);
}

async function assertApiCode(response: Response, status: number, code: string) {
  assert.equal(response.status, status);
  assert.ok(response.headers.get("set-cookie") === null, "Rejected authentication must not issue cookies");
  const payload: unknown = await response.json();
  assert.ok(payload !== null && typeof payload === "object" && !Array.isArray(payload) && Object.keys(payload).length === 1 && "code" in payload && payload.code === code, `Authentication response must contain only ${code}`);
}

async function verifyStaticAssets(server: RunningServer, html: string) {
  let checks = 0;
  const logo = await request(server, "/brand/dade-logo.png");
  assert.equal(logo.status, 200, "Standalone deployment must serve the official logo");
  assert.match(logo.headers.get("content-type") ?? "", /^image\/png\b/i);
  const logoBytes = new Uint8Array(await logo.arrayBuffer());
  assert.deepEqual(Array.from(logoBytes.slice(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10]);
  checks++;

  const scripts = [...new Set(Array.from(html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g), match => match[1]))];
  assert.ok(scripts.length > 0, "Rendered HTML must reference its JavaScript assets");
  for (const script of scripts) {
    const url = new URL(script.replaceAll("&amp;", "&"), server.origin);
    assert.equal(url.origin, server.origin, "Application scripts must be served locally");
    const response = await request(server, `${url.pathname}${url.search}`);
    assert.equal(response.status, 200, `Standalone JavaScript asset must load: ${url.pathname}`);
    assert.match(response.headers.get("content-type") ?? "", /(?:application|text)\/javascript\b/i);
    assert.ok((await response.text()).length > 0, "JavaScript assets must not be empty");
    checks++;
  }

  const styles = [...new Set(Array.from(html.matchAll(/<link\b[^>]*\bhref="([^"]+\.css(?:\?[^"]*)?)"/g), match => match[1]))];
  assert.ok(styles.length > 0, "Rendered HTML must reference its stylesheet");
  const fontUrls = new Map<string, URL>();
  for (const style of styles) {
    const url = new URL(style.replaceAll("&amp;", "&"), server.origin);
    assert.equal(url.origin, server.origin, "Application styles must be served locally");
    const response = await request(server, `${url.pathname}${url.search}`);
    assert.equal(response.status, 200, "Standalone stylesheet must load");
    assert.match(response.headers.get("content-type") ?? "", /^text\/css\b/i);
    const css = await response.text();
    checks++;
    for (const face of css.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
      for (const family of ["Noto Sans Variable", "Noto Sans SC Variable"]) {
        if (!face[1].includes(family) || fontUrls.has(family)) continue;
        const source = face[1].match(/url\(\s*["']?([^"')\s]+)["']?\s*\)/)?.[1];
        if (source) fontUrls.set(family, new URL(source, url));
      }
    }
  }
  assert.equal(fontUrls.size, 2, "Both local Noto Sans font families must be available");
  for (const [family, url] of fontUrls) {
    assert.equal(url.origin, server.origin, `${family} must be served locally`);
    const response = await request(server, `${url.pathname}${url.search}`);
    assert.equal(response.status, 200, `${family} must load from the standalone deployment`);
    assert.match(response.headers.get("content-type") ?? "", /^font\/woff2\b/i);
    const bytes = new Uint8Array(await response.arrayBuffer());
    assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), "wOF2");
    checks++;
  }
  return checks;
}

async function run() {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "dade-runtime-"));
  const databasePath = join(temporaryDirectory, "verification-runtime.sqlite");
  const running: RunningServer[] = [];
  let failure: unknown;
  let checks = 0;
  let tokens: string[] = [];

  try {
    const deploymentDirectory = resolve(".next", "standalone");
    const serverPath = join(deploymentDirectory, "server.js");
    assert.ok(existsSync(serverPath), "Build the standalone deployment before runtime verification");
    for (const localOnlyPath of ["docs", "AGENTS.md", "Agent.md", ".local", "tests"]) {
      assert.ok(!existsSync(join(deploymentDirectory, localOnlyPath)), `${localOnlyPath} must not be included in the deployment`);
      checks++;
    }
    const fixture = createTestFixture(databasePath);
    fixture.database.close();
    tokens = surfaces.map(surface => fixture.sessions[surface].token);

    for (const surface of surfaces) {
      const port = await availablePort();
      const child = spawn(process.execPath, [serverPath], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          APP_SURFACE: surface,
          APP_ORIGIN: `http://127.0.0.1:${port}`,
          DATABASE_PATH: databasePath,
          NODE_ENV: "production",
          NEXT_TELEMETRY_DISABLED: "1",
          HOSTNAME: "127.0.0.1",
          PORT: String(port),
        },
        stdio: "pipe",
        windowsHide: true,
      });
      const server: RunningServer = {
        surface,
        origin: `http://127.0.0.1:${port}`,
        child,
        closed: new Promise(resolveClosed => child.once("close", () => resolveClosed())),
        output: "",
        spawnError: null,
      };
      child.once("error", error => { server.spawnError = error; });
      const capture = (chunk: Buffer) => {
        const text = tokens.reduce((output, token) => output.replaceAll(token, "[redacted]"), chunk.toString());
        server.output = `${server.output}${text}`.slice(-131072);
      };
      child.stdout.on("data", capture);
      child.stderr.on("data", capture);
      child.stdin.end();
      running.push(server);
    }

    await Promise.all(running.map(waitUntilReady));

    for (const server of running) {
      const health = await request(server, "/api/health");
      assert.equal(health.status, 200);
      assert.deepEqual(await health.json(), { status: "ok" });
      checks++;

      for (const [path, locale] of [["/", "en"], ["/zh-CN", "zh-CN"]] as const) {
        const response = await request(server, path);
        assert.equal(response.status, 307, "Surface entry must redirect to its localised route");
        const location = response.headers.get("location");
        assert.ok(location, "Surface entry redirect must provide a location");
        const destination = new URL(location, server.origin);
        assert.equal(destination.origin, server.origin, "Surface redirects must preserve the request origin");
        assert.equal(destination.pathname, `/${locale}/${server.surface}`);
        await response.text();
        checks++;
      }

      for (const locale of locales) {
        const login = await request(server, `/${locale}/login`);
        assert.equal(login.status, 200, `${server.surface} ${locale} login must render`);
        const loginHtml = await login.text();
        const functionalLabel = server.surface === "member"
          ? (locale === "en" ? "Mobile number" : "手机号码")
          : (locale === "en" ? "Email address" : "电子邮箱");
        assert.ok(loginHtml.includes(functionalLabel), `${server.surface} ${locale} login must be translated`);
        checks++;
        if (server.surface === "member" && locale === "en") checks += await verifyStaticAssets(server, loginHtml);

        await assertLoginRedirect(await request(server, `/${locale}/${server.surface}`), locale, server.origin);
        checks++;

        for (const otherSurface of surfaces.filter(surface => surface !== server.surface)) {
          const blocked = await request(server, `/${locale}/${otherSurface}`);
          await blocked.text();
          assert.equal(blocked.status, 404, `${server.surface} must not serve ${otherSurface}`);
          checks++;
        }

        const authenticated = await request(server, `/${locale}/${server.surface}`, {
          headers: { cookie: `${cookieName(server.surface)}=${fixture.sessions[server.surface].token}` },
        });
        assert.equal(authenticated.status, 200, `${server.surface} ${locale} authenticated page must render`);
        const cacheControl = authenticated.headers.get("cache-control") ?? "";
        assert.match(cacheControl, /\bprivate\b/i);
        assert.match(cacheControl, /\bno-store\b/i);
        const authenticatedHtml = await authenticated.text();
        assert.ok(authenticatedHtml.includes("Jamie Tan"), `${server.surface} must render authorised fixture data`);
        for (const token of tokens) assert.ok(!authenticatedHtml.includes(token), "HTML must not expose session tokens");
        if (server.surface === "member") {
          assert.ok(!authenticatedHtml.includes("Riley Chen"), "Members must not receive another member's data");
          assert.ok(!authenticatedHtml.includes("Alex Wong"), "Members must not receive another store's member data");
        }
        if (server.surface === "staff") {
          assert.ok(authenticatedHtml.includes("Riley Chen"), "Store staff must receive their store's members");
          assert.ok(!authenticatedHtml.includes("Alex Wong"), "Store staff must not receive another store's members");
        }
        if (server.surface === "admin") {
          assert.ok(authenticatedHtml.includes("Alex Wong"), "Head office must receive authorised member data");
          assert.ok(authenticatedHtml.includes(locale === "en" ? "DADE Orchard" : "DADE 乌节店"));
          assert.ok(authenticatedHtml.includes(locale === "en" ? "DADE Marina" : "DADE 滨海店"));
        }
        checks++;
      }
    }

    const memberServer = running.find(server => server.surface === "member")!;
    const staffServer = running.find(server => server.surface === "staff")!;
    await assertLoginRedirect(await request(staffServer, "/en/staff", {
      headers: { cookie: `${cookieName("staff")}=${fixture.sessions.member.token}` },
    }), "en", staffServer.origin);
    checks++;

    const postJson = (body: string, origin = memberServer.origin) => request(memberServer, "/api/auth/request", {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body,
    });
    await assertApiCode(await postJson(JSON.stringify({ country: "GB", phone: "+447911123456" }), "https://untrusted.invalid"), 403, "FORBIDDEN");
    await assertApiCode(await postJson("{"), 400, "INVALID_INPUT");
    await assertApiCode(await postJson(JSON.stringify({ country: "GB", phone: "1".repeat(5000) })), 400, "INVALID_INPUT");
    await assertApiCode(await postJson(JSON.stringify({ country: "SG", phone: "123" })), 400, "INVALID_PHONE");
    const unavailable = await postJson(JSON.stringify({ country: "GB", phone: "+447911123456" }));
    assert.equal(unavailable.headers.get("retry-after"), "300");
    await assertApiCode(unavailable, 503, "AUTHENTICATION_UNAVAILABLE");
    checks += 5;

    for (const server of running) {
      const cookie = `${cookieName(server.surface)}=${fixture.sessions[server.surface].token}`;
      const forbiddenLogout = await request(server, "/api/auth/logout", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded", origin: "https://untrusted.invalid", cookie },
        body: "locale=zh-CN",
      });
      await assertApiCode(forbiddenLogout, 403, "FORBIDDEN");
      const stillSignedIn = await request(server, `/en/${server.surface}`, { headers: { cookie } });
      assert.equal(stillSignedIn.status, 200, "Cross-origin logout must not revoke a session");
      await stillSignedIn.text();
      const logout = await request(server, "/api/auth/logout", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded", origin: server.origin, cookie },
        body: "locale=zh-CN",
      });
      assert.equal(logout.status, 303);
      const logoutLocation = logout.headers.get("location");
      assert.ok(logoutLocation, "Logout must provide its login destination");
      const logoutDestination = new URL(logoutLocation, server.origin);
      assert.equal(logoutDestination.origin, server.origin, "Logout redirects must preserve the request origin");
      assert.equal(logoutDestination.pathname, "/zh-CN/login");
      const clearedCookie = logout.headers.get("set-cookie") ?? "";
      assert.ok(clearedCookie.startsWith(`${cookieName(server.surface)}=;`));
      assert.ok(/Max-Age=0/i.test(clearedCookie), "Logout must expire the session cookie");
      assert.ok(/HttpOnly/i.test(clearedCookie), "Session cookies must be HttpOnly");
      assert.ok(/Secure/i.test(clearedCookie), "Production session cookies must be Secure");
      await logout.text();
      await assertLoginRedirect(await request(server, `/en/${server.surface}`, { headers: { cookie } }), "en", server.origin);
      checks += 4;
    }
  } catch (error) {
    failure = error;
    const logDirectory = resolve(".local", "runtime");
    await mkdir(logDirectory, { recursive: true });
    for (const server of running) {
      const redacted = tokens.reduce((output, token) => output.replaceAll(token, "[redacted]"), server.output);
      await writeFile(join(logDirectory, `${server.surface}.log`), redacted, "utf8");
    }
    console.error("Runtime server logs: .local/runtime");
  } finally {
    const stopped = await Promise.allSettled(running.map(stopServer));
    const rejected = stopped.find(result => result.status === "rejected");
    if (rejected?.status === "rejected") {
      failure ??= rejected.reason;
    } else {
      const path = relative(resolve(tmpdir()), resolve(temporaryDirectory));
      if (!path || path === ".." || path.startsWith(`..${sep}`) || isAbsolute(path) || !basename(temporaryDirectory).startsWith("dade-runtime-")) {
        throw new Error("RUNTIME_CLEANUP_PATH_UNSAFE");
      }
      await rm(temporaryDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    }
  }

  if (failure) throw failure;
  console.log(`Runtime checks passed: ${checks}`);
}

await run();
