import assert from 'node:assert/strict';
import { chromium, webkit, devices } from 'playwright';

for (const engine of (process.env.TEST_ENGINES?.split(',') || ['chromium', 'webkit'])) {
  const browser = await ({ chromium, webkit })[engine].launch(engine === 'chromium' && process.env.CHROME_EXECUTABLE
    ? { executablePath: process.env.CHROME_EXECUTABLE } : {});
  try {
    const page = await browser.newPage({ ...devices['iPhone 13'] });
    await page.goto(process.env.STUDIO_TEST_URL || 'http://127.0.0.1:4328/', { waitUntil: 'domcontentloaded' });
    for (const format of ['png', 'svg']) {
    const makeImage = color => page.evaluate(color => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 600;
      canvas.getContext('2d').fillStyle = color;
      canvas.getContext('2d').fillRect(0, 0, 600, 600);
      return canvas.toDataURL();
    }, color);
    const background = Buffer.from((await makeImage('#0ea7bd')).split(',')[1], 'base64');
    const avatar = format === 'svg'
      ? Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" fill="#cb2148"/></svg>')
      : Buffer.from((await makeImage('#cb2148')).split(',')[1], 'base64');
    await page.locator('input[type=file]').nth(0).setInputFiles({ name: `avatar.${format}`, mimeType: format === 'svg' ? 'image/svg+xml' : 'image/png', buffer: avatar });
    await page.locator('input[type=file]').nth(1).setInputFiles({ name: 'background.png', mimeType: 'image/png', buffer: background });
    await page.waitForFunction(format => document.querySelector('.canvas-background')?.getAttribute('src')?.startsWith('data:') && document.querySelector('.tweet-avatar img')?.getAttribute('src')?.startsWith(`data:image/${format}`), format);
    await page.getByRole('textbox', { name: '卡片文案' }).fill('图像内容验收：背景和头像必须在 PNG 内。');
    await page.locator('.preview-footer .download-button').click();
    const img = page.getByAltText('可长按保存的 PNG 原图');
    await img.waitFor();
    await img.evaluate(image => image.decode());
    const pixels = await img.evaluate(image => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0);
      const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let background = 0, avatar = 0;
      for (let i = 0; i < data.length; i += 64) {
        if (Math.abs(data[i] - 14) < 5 && Math.abs(data[i + 1] - 167) < 5 && Math.abs(data[i + 2] - 189) < 5) background++;
        if (Math.abs(data[i] - 203) < 5 && Math.abs(data[i + 1] - 33) < 5 && Math.abs(data[i + 2] - 72) < 5) avatar++;
      }
      return { background, avatar };
    });
    assert(pixels.background > 10000, `${engine}: missing background ${JSON.stringify(pixels)}`);
    assert(pixels.avatar > 5, `${engine}: missing avatar ${JSON.stringify(pixels)}`);
    console.log(`PASS ${engine} PNG contains actual background and ${format} avatar`, pixels);
    await page.getByRole('button', { name: '返回编辑' }).click();
    }
    await page.close();
  } finally { await browser.close(); }
}
