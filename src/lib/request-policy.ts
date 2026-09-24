export function requestOrigin(request: Request, configuredOrigin = process.env.APP_ORIGIN): string | null {
  try {
    if (configuredOrigin) {
      const configured = new URL(configuredOrigin);
      return ["http:", "https:"].includes(configured.protocol) && configured.origin === configuredOrigin ? configuredOrigin : null;
    }
    const url = new URL(request.url);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    const host = request.headers.get("host") ?? url.host;
    const target = new URL(`${url.protocol}//${host}`);
    return target.host === host.toLowerCase() ? target.origin : null;
  } catch {
    return null;
  }
}

export function sameOrigin(request: Request, configuredOrigin = process.env.APP_ORIGIN) {
  const origin = request.headers.get("origin");
  return origin !== null && origin === requestOrigin(request, configuredOrigin);
}

export async function readRequestText(request: Request, limit = 4096): Promise<string | null> {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > limit) { await reader.cancel(); return null; }
      chunks.push(value);
    }
    const combined = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { combined.set(chunk, offset); offset += chunk.length; }
    return new TextDecoder().decode(combined);
  } catch {
    return null;
  }
}

export async function readJsonRequest(request: Request, limit = 4096): Promise<Record<string, unknown> | null> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return null;
  const text = await readRequestText(request, limit);
  if (text === null) return null;
  try {
    const body = JSON.parse(text);
    return body && typeof body === "object" && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}
