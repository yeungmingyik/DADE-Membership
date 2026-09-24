import { describe, expect, it } from "vitest";
import { readJsonRequest, sameOrigin } from "../src/lib/request-policy";
import { preferredLocale } from "../src/i18n/config";

describe("request boundaries", () => {
  it("accepts only matching origins", () => {
    expect(sameOrigin(new Request("https://member.example/api/auth/request", { headers: { Origin: "https://member.example" } }))).toBe(true);
    expect(sameOrigin(new Request("https://member.example/api/auth/request", { headers: { Origin: "https://staff.example" } }))).toBe(false);
    expect(sameOrigin(new Request("https://member.example/api/auth/request"))).toBe(false);
  });
  it("rejects oversized bodies independent of declared length", async () => {
    const request = new Request("https://example.com", { method: "POST", headers: { "Content-Type": "application/json", "Content-Length": "2" }, body: JSON.stringify({ payload: "x".repeat(4096) }) });
    expect(await readJsonRequest(request)).toBeNull();
  });
  it("uses the visible host when a framework normalizes localhost", () => {
    const request = (origin: string, host = "127.0.0.1:3100") => new Request("http://localhost:3100/api/auth/request", { headers: { Origin: origin, Host: host } });
    expect(sameOrigin(request("http://127.0.0.1:3100"))).toBe(true);
    expect(sameOrigin(request("http://localhost:3100"))).toBe(false);
    expect(sameOrigin(request("https://127.0.0.1:3100"))).toBe(false);
    expect(sameOrigin(request("http://127.0.0.1:3101"))).toBe(false);
    expect(sameOrigin(request("http://evil.example", "member.example@evil.example"))).toBe(false);
    expect(sameOrigin(request("null"))).toBe(false);
  });
  it("pins the public origin without trusting forwarded headers", () => {
    const request = new Request("http://localhost:3100/api/auth/request", { headers: { Origin: "https://member.example", Host: "localhost:3100", "X-Forwarded-Host": "member.example", "X-Forwarded-Proto": "https" } });
    expect(sameOrigin(request, "https://member.example")).toBe(true);
    expect(sameOrigin(request, "https://staff.example")).toBe(false);
    expect(sameOrigin(request)).toBe(false);
    expect(sameOrigin(request, "https://member.example/path")).toBe(false);
  });
  it("rejects invalid JSON shapes and media types", async () => {
    for (const body of ["null", "[]", "{", '"hello"']) expect(await readJsonRequest(new Request("https://example.com", { method: "POST", headers: { "Content-Type": "application/json" }, body }))).toBeNull();
    expect(await readJsonRequest(new Request("https://example.com", { method: "POST", headers: { "Content-Type": "text/application/json" }, body: "{}" }))).toBeNull();
  });
  it("accepts bounded object input", async () => {
    expect(await readJsonRequest(new Request("https://example.com", { method: "POST", headers: { "Content-Type": "application/json; charset=utf-8" }, body: '{"country":"SG"}' }))).toEqual({ country: "SG" });
  });
});

describe("preferred locale", () => {
  it("honours language priority and handles unsupported languages", () => {
    expect(preferredLocale("zh-CN, en;q=0.8")).toBe("zh-CN");
    expect(preferredLocale("zh-CN;q=0.2,en-SG;q=0.9")).toBe("en");
    expect(preferredLocale("fr-FR,zh-Hans;q=0.8")).toBe("zh-CN");
    expect(preferredLocale("zh-CN;q=0,fr")).toBe("en");
  });
});
