#!/usr/bin/env python3
"""Offline public bundle gate; no tokens, network, or real student data."""
import json
from pathlib import Path
import re
import sys
sys.dont_write_bytecode = True
from install import read_manifest

root = Path(__file__).resolve().parents[1]
manifest = read_manifest(root)
assert manifest['repository'] == 'AI-Studio-Class/AI-Studio-Prompts'
catalog = json.loads((root/'prompt-catalog.json').read_text(encoding='utf-8'))
assert catalog['version'] == manifest['version']
assert len(catalog['items']) >= 15
assert len({i['id'] for i in catalog['items']}) == len(catalog['items'])
for path in root.rglob('*'):
    if '.git' in path.relative_to(root).parts:
        continue
    assert not path.is_symlink(), str(path)
    if not path.is_file():
        continue
    assert path.suffix.lower() not in {'.sqlite3', '.db', '.mp4', '.webm', '.pem', '.key'}, str(path)
    assert path.name not in {'.env', '.DS_Store', 'credentials.json'}, str(path)
    raw = path.read_bytes()
    assert not re.search(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}', raw), str(path)
for item in catalog['items']:
    assert '$aistudio-' not in item['text'] and '$pitch' not in item['text']
    assert 'AI-Studio-v2' not in item['text']
    if item['skill_url']:
        rel = item['skill_url'].split('/blob/main/',1)[1]
        assert (root/rel).is_file(), rel
print(f"PASS: {len(manifest['skills'])} Skills, {len(catalog['items'])} prompts, version {manifest['version']}")
