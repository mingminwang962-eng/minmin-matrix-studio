import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";

const IMAGE_HOSTS = new Set([
  "tiance-tweet-card.leobai825.chatgpt.site", "dontbesilent-tweet-card-studio.vercel.app",
  "images.unsplash.com", "pbs.twimg.com", "upload.wikimedia.org",
]);


function send(response: ServerResponse, status: number, data: unknown) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(data));
}

export async function handleImageRequest(request: IncomingMessage, response: ServerResponse) {
  const host = request.headers.host || "";
  const configuredOrigin = process.env.STUDIO_ORIGIN;
  const origin = configuredOrigin || `http://${host}`;
  const allowedHost = configuredOrigin ? host === new URL(configuredOrigin).host : /^(127\.0\.0\.1|localhost|min11538\.localhost)(?::4318|:4320)$/.test(host);
  if (!allowedHost || (request.headers.origin && request.headers.origin !== origin)) {
    send(response, 403, { error: "只允许本机工作台访问" });
    return;
  }
  const url = new URL(request.url || "/", origin);
  if (url.pathname === "/api/background-image") {
    const imageUrl = new URL(url.searchParams.get("url") || "");
    if (request.method !== "GET" || imageUrl.protocol !== "https:" || imageUrl.username || imageUrl.password || (imageUrl.port && imageUrl.port !== "443") || !IMAGE_HOSTS.has(imageUrl.hostname)) {
      send(response, 400, { error: "这个图片来源需要先下载，再用本地上传导入" }); return;
    }
    const remote = await fetch(imageUrl, { redirect: "error", signal: AbortSignal.timeout(20000) });
    const type = remote.headers.get("content-type") || "";
    if (!remote.ok || !type.startsWith("image/") || !remote.body) {
      send(response, 400, { error: "网络图片读取失败" }); return;
    }
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    const reader = remote.body.getReader();
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 12 * 1024 * 1024) { await reader.cancel(); send(response, 413, { error: "图片超过12MB，请先缩小图片" }); return; }
      chunks.push(chunk.value);
    }
    response.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    response.end(Buffer.concat(chunks));
    return;
  }
  send(response, 404, { error: "接口未启用" });
}

export function backgroundImages(): Plugin {
  const middleware = (request: IncomingMessage, response: ServerResponse, next: () => void) => {
    if (!["/api/library", "/api/background-image"].includes(request.url?.split("?")[0] || "")) { next(); return; }
    void handleImageRequest(request, response).catch(() => send(response, 503, { error: "网络图片暂时无法读取，请稍后重试或使用本地上传。" }));
  };
  return {
    name: "minmin-background-images",
    configureServer(server) { server.middlewares.use(middleware); },
    configurePreviewServer(server) { server.middlewares.use(middleware); },
  };
}
