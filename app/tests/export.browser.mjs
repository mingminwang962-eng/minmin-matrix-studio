// Start the app first. Install browsers with: npx playwright install chromium webkit
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium, webkit, devices } from 'playwright';

const url = process.env.STUDIO_TEST_URL || 'http://127.0.0.1:4328/';
const engines = process.env.TEST_ENGINES?.split(',') || ['chromium', 'webkit'];

for (const engine of engines) {
  const browser = await ({ chromium, webkit })[engine].launch(engine === 'chromium' && process.env.CHROME_EXECUTABLE
    ? { executablePath: process.env.CHROME_EXECUTABLE } : {});
  try {
    for (const mode of ['success', 'cancel', 'failure', 'unsupported', 'blocked', 'no-can-share']) {
      const context = await browser.newContext({ ...devices[engine === 'webkit' ? 'iPhone 13' : 'Pixel 7'], viewport: { width: 320, height: 740 } });
      await context.addInitScript(mode => {
        Object.defineProperty(navigator, 'canShare', { configurable: true, value: mode === 'no-can-share' ? undefined : () => {
          if (mode === 'blocked') throw new DOMException('Blocked', 'NotAllowedError');
          return mode !== 'unsupported';
        } });
        Object.defineProperty(navigator, 'share', { configurable: true, value: mode === 'unsupported' ? undefined : async data => {
          window.shareActivation = navigator.userActivation?.isActive;
          const bytes = new DataView(await data.files[0].arrayBuffer());
          window.sharedImage = { count: data.files.length, type: data.files[0].type, width: bytes.getUint32(16), height: bytes.getUint32(20) };
          if (mode === 'cancel') throw new DOMException('Canceled', 'AbortError');
          if (mode === 'failure') throw new DOMException('Blocked', 'NotAllowedError');
        } });
      }, mode);
      const page = await context.newPage();
      const errors = [];
      const downloads = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('download', download => downloads.push(download));
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.getByRole('textbox', { name: '卡片文案' }).fill('手机导出测试。\n原图保存、取消分享及失败回退。');
      await page.locator('.preview-footer .download-button').click();
      const dialog = page.getByRole('dialog', { name: '保存图片', exact: true });
      await dialog.waitFor({ timeout: 30000 });
      const img = dialog.getByAltText('可长按保存的 PNG 原图');
      await img.evaluate(image => image.decode());
      assert.deepEqual(await img.evaluate(image => [image.naturalWidth, image.naturalHeight]), [1080, 1440]);
      assert.equal(downloads.length, 0, 'mobile generation must not force a file download');
      const bounds = await dialog.boundingBox();
      assert(bounds.x >= 0 && bounds.x + bounds.width <= 321, 'save dialog fits a 320px screen');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'page fits screen');
      assert.notEqual(await img.evaluate(image => getComputedStyle(image).getPropertyValue('-webkit-touch-callout')), 'none', 'long press is not disabled');
      const share = dialog.getByRole('button', { name: '系统分享 / 保存', exact: true });
      if (['success', 'cancel', 'failure'].includes(mode)) {
        await share.click();
        const expected = { success: '已交给系统处理', cancel: '已取消分享', failure: '系统分享暂不可用' }[mode];
        await page.waitForFunction(expected => document.querySelector('.image-save-notice')?.textContent.includes(expected), expected);
        assert.deepEqual(await page.evaluate(() => window.sharedImage), { count: 1, type: 'image/png', width: 1080, height: 1440 });
        assert.equal(await page.evaluate(() => window.shareActivation), true, 'sharing starts inside the click activation');
        assert(await img.isVisible(), 'original remains after share result');
      } else assert.equal(await share.count(), 0, 'unsupported sharing falls back to the original image');
      const newTab = page.waitForEvent('popup');
      await dialog.getByRole('link', { name: '打开原图', exact: true }).click();
      const original = await newTab;
      await original.waitForLoadState();
      assert.equal(await original.locator('img').evaluate(image => image.naturalWidth), 1080);
      await original.close();
      const saved = page.waitForEvent('download');
      await dialog.getByRole('link', { name: '下载 PNG 文件' }).click();
      const bytes = await readFile(await (await saved).path());
      assert.equal(bytes.toString('hex', 0, 8), '89504e470d0a1a0a');
      assert.equal(bytes.readUInt32BE(16), 1080);
      await dialog.getByRole('button', { name: '返回编辑' }).click();
      await dialog.waitFor({ state: 'detached' });
      assert.equal(await page.getByRole('textbox', { name: '卡片文案' }).inputValue(), '手机导出测试。\n原图保存、取消分享及失败回退。');
      assert.equal(await page.evaluate(() => document.body.style.overflow), '');
      assert.deepEqual(errors, []);
      console.log(`PASS ${engine} 320px ${mode}: PNG, layout, share, original, explicit download, return`);
      await context.close();
    }
    for (const width of [390, 820]) {
      const context = await browser.newContext({ ...devices['iPad (gen 7)'], viewport: { width, height: 1024 } });
      // Older embedded browsers may not implement native modal dialogs or file sharing.
      await context.addInitScript(() => {
        Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { value: undefined });
        Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined });
      });
      const page = await context.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.getByRole('textbox', { name: '卡片文案' }).fill('手机与平板保存测试');
      await page.getByRole('button', { name: /9:16/ }).click();
      await page.locator('.preview-footer .download-button').click();
      const dialog = page.getByRole('dialog', { name: '保存图片', exact: true });
      await dialog.waitFor();
      const img = dialog.getByAltText('可长按保存的 PNG 原图');
      await img.evaluate(image => image.decode());
      assert.deepEqual(await img.evaluate(image => [image.naturalWidth, image.naturalHeight]), [1080, 1920]);
      await dialog.getByRole('button', { name: '返回编辑' }).click();
      await page.getByRole('button', { name: '直接导出纯卡片' }).click();
      await dialog.waitFor();
      await img.evaluate(image => image.decode());
      assert.equal(await img.evaluate(image => image.naturalWidth), 1240);
      const bounds = await dialog.boundingBox();
      assert(bounds.x >= 0 && bounds.x + bounds.width <= width + 1);
      console.log(`PASS ${engine} touch ${width}px: 9:16, pure card, legacy dialog fallback`);
      await context.close();
    }
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.getByRole('textbox', { name: '卡片文案' }).fill('电脑下载和尺寸回归测试。');
    for (const [shape, height] of [['3:4', 1440], ['9:16', 1920]]) {
      if (shape === '9:16') await page.getByRole('button', { name: /9:16/ }).click();
      const saved = page.waitForEvent('download');
      await page.locator('.preview-footer .download-button').click();
      const png = await readFile(await (await saved).path());
      assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [1080, height]);
    }
    for (const platform of ['X 卡片', '微博卡片', '朋友圈卡片']) {
      await page.getByRole('button', { name: platform, exact: true }).click();
      const saved = page.waitForEvent('download');
      await page.getByRole('button', { name: '直接导出纯卡片' }).click();
      const png = await readFile(await (await saved).path());
      assert.equal(png.readUInt32BE(16), 1240);
      assert(png.readUInt32BE(20) > 100);
    }
    console.log(`PASS ${engine} desktop: 1080×1440, 1080×1920, X/Weibo/Moments pure cards`);
  } finally { await browser.close(); }
}
