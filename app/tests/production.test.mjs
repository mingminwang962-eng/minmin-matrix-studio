import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { request } from "node:http";

function apiRequest(url, headers = {}, body) {
  return new Promise((resolve, reject) => {
    const req = request(url, { method: body ? "POST" : "GET", headers }, response => {
      let data = "";
      response.on("data", chunk => { data += chunk; });
      response.on("end", () => resolve({ status: response.statusCode, data: JSON.parse(data) }));
    });
    req.on("error", reject);
    req.end(body);
  });
}

test("常驻服务提供构建文件，保留图片读取并停用文案库接口", { timeout: 15000 }, async (t) => {
  const reservation = createServer();
  reservation.listen(0, "127.0.0.1");
  await once(reservation, "listening");
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const child = spawn(process.execPath, ["server-dist/production.js"], {
    env: { ...process.env, PORT: String(port), STUDIO_ORIGIN: "https://cards.example.test", PATH: "/nonexistent" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(async () => { child.kill(); await once(child, "exit"); });
  await once(child.stdout, "data");
  const base = `http://127.0.0.1:${port}`;
  const home = await fetch(base);
  assert.equal(home.status, 200);
  assert.match(home.headers.get("content-type"), /text\/html/);
  assert.match(await home.text(), /敏敏矩阵工作台/);
  assert.equal((await fetch(`${base}/default-avatar.svg`)).status, 200);
  assert.equal((await fetch(`${base}/%2e%2e%2fpackage.json`)).status, 404);
  assert.equal((await apiRequest(`${base}/api/library`)).status, 403);
  assert.equal((await apiRequest(`${base}/api/library`, {
    Host: "cards.example.test", Origin: "https://foreign.example.test",
  })).status, 403);
  const empty = await apiRequest(`${base}/api/library`, {
    Host: "cards.example.test", Origin: "https://cards.example.test", "Content-Type": "application/json",
  }, JSON.stringify({ text: "" }));
  assert.equal(empty.status, 404);
  assert.match(empty.data.error, /接口未启用/);
  const image = await apiRequest(`${base}/api/background-image?url=https%3A%2F%2Fexample.com%2Fimage.png`, { Host: "cards.example.test", Origin: "https://cards.example.test" });
  assert.equal(image.status, 400);
  assert.match(image.data.error, /图片来源/);
});
