"""Build the neutral, dependency-free runtime ZIP and its download metadata."""
from pathlib import Path
import hashlib
import json
import os
import re
import shutil
import subprocess
import zipfile

root = Path(__file__).resolve().parents[1]
package = json.loads((root / 'app/package.json').read_text())
version = package['version']
assert (root / 'VERSION').read_text().strip() == version
env = dict(os.environ, VITE_ONLINE_DEMO='0')
for command in [['npm', 'run', 'build'], ['npm', 'run', 'build:server']]:
    subprocess.run(command, cwd=root / 'app', env=env, check=True)

stage = root / '.build/package/minmin-matrix-studio'
if stage.exists():
    shutil.rmtree(stage)
stage.mkdir(parents=True)
for name in ['ASSET-LICENSE.md', 'CHANGELOG.md', 'LICENSE', 'README.md', 'SKILL.md', 'THIRD_PARTY_NOTICES.md', 'VERSION', 'references']:
    source, target = root / name, stage / name
    if source.is_dir():
        shutil.copytree(source, target)
    else:
        shutil.copy2(source, target)
for name in ['dist', 'server-dist']:
    shutil.copytree(root / 'app' / name, stage / 'app' / name)
(stage / 'app/package.json').write_text(json.dumps({
    'name': package['name'], 'version': version, 'type': 'module', 'private': True,
}, indent=2) + '\n')
(stage / 'scripts').mkdir()
shutil.copy2(root / 'scripts/start.mjs', stage / 'scripts/start.mjs')
shutil.copytree(root / 'app/public/contact', stage / 'contact')

downloads = root / 'website/downloads'
downloads.mkdir(exist_ok=True)
archive = downloads / f'minmin-matrix-studio-{version}.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as output:
    for path in sorted(stage.rglob('*')):
        if path.is_file():
            output.write(path, path.relative_to(stage.parent))
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
(downloads / 'SHA256SUMS').write_text(f'{digest}  {archive.name}\n')
manifest_path = root / 'website/release.json'
manifest = json.loads(manifest_path.read_text())
manifest.update({
    'version': version,
    'package_url': f'https://tools.minmin11538.cn/matrix/downloads/{archive.name}',
    'bytes': archive.stat().st_size,
    'sha256': digest,
    'released_at': re.search(rf'## v{re.escape(version)} · (\d{{4}}-\d{{2}}-\d{{2}})', (root / 'CHANGELOG.md').read_text()).group(1),
    'github_source': f'https://github.com/mingminwang962-eng/minmin-matrix-studio/tree/v{version}',
    'github_download_url': f'https://github.com/mingminwang962-eng/minmin-matrix-studio/releases/download/v{version}/{archive.name}',
    'browser_tests': ['Chromium mobile viewport', 'WebKit mobile viewport', 'Chromium desktop', 'WebKit desktop'],
    'mobile_album_verification': 'pending_real_android_and_ios_devices',
})
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
page = root / 'website/index.html'
page.write_text(re.sub(r'下载完整包 · [0-9.]+ MB', f'下载完整包 · {archive.stat().st_size / 1000000:.1f} MB', page.read_text()))
print(json.dumps({'archive': str(archive), 'bytes': archive.stat().st_size, 'sha256': digest}))
