import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { handleImageRequest } from "./images.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../dist");
const types: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".webp": "image/webp", ".svg": "image/svg+xml", ".woff2": "font/woff2",
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", "http://localhost");
    if (["/api/library", "/api/background-image"].includes(url.pathname)) {
      await handleImageRequest(request, response);
      return;
    }
    if (!["GET", "HEAD"].includes(request.method || "")) {
      response.writeHead(405); response.end(); return;
    }
    const path = resolve(root, `.${decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname)}`);
    if (!path.startsWith(root + sep)) { response.writeHead(404); response.end(); return; }
    let info;
    try { info = await stat(path); } catch { response.writeHead(404); response.end(); return; }
    if (!info.isFile()) { response.writeHead(404); response.end(); return; }
    response.writeHead(200, {
      "Content-Type": types[extname(path)] || "application/octet-stream",
      "Content-Length": info.size,
      "Cache-Control": extname(path) === ".html" ? "no-store" : "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    });
    if (request.method === "HEAD") response.end();
    else createReadStream(path).on("error", () => response.destroy()).pipe(response);
  } catch {
    if (response.headersSent) { response.destroy(); return; }
    response.writeHead(503, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    response.end(JSON.stringify({ error: "图片读取暂时失败，请重试；本次编辑仍在页面中。" }));
  }
});

server.listen(Number(process.env.PORT || 4318), "127.0.0.1", () => {
  process.stdout.write("敏敏图文工作台服务已启动\n");
});
