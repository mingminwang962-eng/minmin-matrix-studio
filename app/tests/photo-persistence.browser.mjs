// Start the studio first. This test uses its own temporary browser profiles and generated images.
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, webkit } from 'playwright';

const url = process.env.STUDIO_TEST_URL || 'http://127.0.0.1:4328/';
const engines = process.env.TEST_ENGINES?.split(',') || ['chromium', 'webkit'];
async function open(context) {
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('上传头像', { exact: true }).waitFor({ state: 'attached' });
  return page;
}
async function image(page, color) {
  return Buffer.from(await page.evaluate(color => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 80;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 80, 80);
    return canvas.toDataURL('image/png').split(',')[1];
  }, color), 'base64');
}
async function saved(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('minmin-matrix-photos', 1);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('current-photos', 'readonly');
      const avatar = tx.objectStore('current-photos').get('avatar');
      const background = tx.objectStore('current-photos').get('background');
      tx.oncomplete = () => { resolve({ avatar: avatar.result || null, background: background.result || null }); db.close(); };
      tx.onerror = () => reject(tx.error);
    };
  }));
}
for (const engine of engines) {
  const profile = await mkdtemp(join(tmpdir(), 'matrix-photo-test-'));
  const options = { headless: true, viewport: { width: 1440, height: 1000 },
    ...(engine === 'chromium' && process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE } : {}) };
  let context;
  try {
    context = await ({ chromium, webkit })[engine].launchPersistentContext(profile, options);
    let page = await open(context);
    const avatar = await image(page, '#e41a1c');
    const background = await image(page, '#7b3294');
    await page.getByLabel('上传头像', { exact: true }).setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: avatar });
    await page.locator('[data-photo-status=avatar]').filter({ hasText: '已保存在此浏览器' }).waitFor();
    await page.locator('input[type=file]').nth(1).setInputFiles({ name: 'background.png', mimeType: 'image/png', buffer: background });
    await page.locator('[data-photo-status=background]').filter({ hasText: '已保存在此浏览器' }).waitFor();
    const photos = await saved(page);
    await page.reload();
    await page.locator('[data-photo-status=background]').filter({ hasText: '已保存在此浏览器' }).waitFor();
    assert.equal(await page.locator('.profile-avatar img').getAttribute('src'), photos.avatar);
    assert.equal(await page.locator('.canvas-background').getAttribute('src'), photos.background);
    await context.close();
    context = await ({ chromium, webkit })[engine].launchPersistentContext(profile, options);
    page = await open(context);
    await page.locator('[data-photo-status=avatar]').filter({ hasText: '已保存在此浏览器' }).waitFor();
    assert.deepEqual(await saved(page), photos, 'both images survive a complete browser restart');
    await page.getByRole('textbox', { name: '卡片文案', exact: true }).fill('浏览器照片保存测试。');
    const downloaded = page.waitForEvent('download');
    await page.locator('.download-button').click();
    const png = await readFile(await (await downloaded).path());
    assert.equal(png.readUInt32BE(16), 1080);
    assert.equal(png.readUInt32BE(20), 1440);
    await page.getByRole('button', { name: '移除背景', exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('.canvas-background')?.getAttribute('src')?.startsWith('data:'));
    await page.reload();
    await page.locator('[data-photo-status=avatar]').filter({ hasText: '已保存在此浏览器' }).waitFor();
    assert.equal((await saved(page)).background, null);
    await page.getByRole('button', { name: '移除头像', exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('.profile-avatar img')?.getAttribute('src')?.startsWith('data:'));
    await page.reload();
    await page.getByLabel('上传头像', { exact: true }).waitFor({ state: 'attached' });
    assert.deepEqual(await saved(page), { avatar: null, background: null });
    console.log(`PASS ${engine}: upload, reload, browser restart, independent deletion and PNG export`);
  } finally {
    await context?.close();
    await rm(profile, { recursive: true, force: true });
  }
}
