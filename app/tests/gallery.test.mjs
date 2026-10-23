import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

test('发行图库全部对应敏敏生成来源，底图和缩略图完整且不含上游图库', () => {
  const entries = JSON.parse(readFileSync('src/generated-backgrounds.json', 'utf8'));
  const provenance = JSON.parse(readFileSync('public/gallery-provenance.json', 'utf8'));
  assert.equal(entries.length, 200);
  assert.equal(new Set(entries.map(x => x.id)).size, 200);
  assert.equal(provenance.assets.length, 200);
  assert.equal(existsSync('public/backgrounds'), false);
  assert.equal(existsSync('src/builtin-backgrounds.json'), false);
  for (const item of entries) {
    assert.equal(item.origin, 'minmin');
    assert.match(item.src, /^\/backgrounds-optimized\/minmin-[a-f0-9]+\.webp$/);
    const image = readFileSync(resolve('public', '.' + item.src));
    assert.equal(image.toString('ascii', 8, 12), 'WEBP');
    const source = provenance.assets.find(x => x.id === item.id);
    assert.equal(createHash('sha256').update(image).digest('hex'), source.distributed_sha256);
    const thumb = readFileSync(`public/gallery-thumbs/${item.id}.webp`);
    assert.equal(thumb.toString('ascii', 8, 12), 'WEBP');
  }
});
