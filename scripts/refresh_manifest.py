#!/usr/bin/env python3
"""Recompute public skill hashes and increment the teaching bundle patch."""
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root/'manifest.json').read_text(encoding='utf-8'))
for skill in manifest['skills']:
    folder = root/'skills'/skill['name']
    files = {}
    for path in sorted(folder.rglob('*')):
        if path.is_symlink():
            raise SystemExit('拒绝符号链接：'+str(path))
        if path.is_file():
            if path.name == '.DS_Store' or '__pycache__' in path.parts:
                raise SystemExit('请先移除生成的缓存文件：'+str(path))
            files[path.relative_to(folder).as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()
    skill['files'] = files
parts = [int(x) for x in manifest['version'].split('.')]
parts[-1] += 1
manifest['version'] = '.'.join(map(str, parts))
(root/'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
catalog = json.loads((root/'prompt-catalog.json').read_text(encoding='utf-8'))
catalog['version'] = manifest['version']
(root/'prompt-catalog.json').write_text(json.dumps(catalog, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print('资源版本：'+manifest['version'])
