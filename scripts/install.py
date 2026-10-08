#!/usr/bin/env python3
"""Install the pinned AI Studio bundle, with hash verification and rollback."""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import sys
import tempfile
from datetime import datetime, timezone
from uuid import uuid4

REPO = Path(__file__).resolve().parents[1]


def hashes(folder: Path) -> dict[str, str]:
    result = {}
    for path in sorted(folder.rglob('*')):
        if path.is_symlink():
            raise ValueError(f'不接受符号链接：{path}')
        if path.is_file():
            result[path.relative_to(folder).as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()
    return result


def read_manifest(repo: Path) -> dict:
    data = json.loads((repo / 'manifest.json').read_text(encoding='utf-8'))
    names = set()
    for item in data['skills']:
        name = item['name']
        if not name or any(c not in 'abcdefghijklmnopqrstuvwxyz0123456789-' for c in name) or name in names:
            raise ValueError('Skill 名称无效或重复')
        names.add(name)
        folder = repo / 'skills' / name
        if folder.is_symlink() or hashes(folder) != item['files'] or 'SKILL.md' not in item['files']:
            raise ValueError(f'源文件校验失败：{name}，请重新下载完整的 {data["version"]} 版本')
    if not names:
        raise ValueError('安装清单为空')
    return data


def installed_matches(dest: Path, item: dict) -> bool:
    folder = dest / item['name']
    return folder.is_dir() and not folder.is_symlink() and hashes(folder) == item['files']


def install(repo: Path, dest: Path, *, check=False, dry_run=False) -> dict:
    data = read_manifest(repo)
    dest = dest.expanduser().absolute()
    # Refuse redirected destinations; allow the user's normal resolved parent directory.
    if dest.is_symlink() or any((dest / item['name']).is_symlink() for item in data['skills']):
        raise ValueError('安装目标不能是符号链接，请选择实际的 Skills 目录')
    changed = [item for item in data['skills'] if not installed_matches(dest, item)]
    if check:
        if changed:
            raise ValueError('未安装或版本不一致：' + ', '.join(item['name'] for item in changed))
        return {'version': data['version'], 'status': 'verified', 'skills': [str(dest / item['name']) for item in data['skills']]}
    if dry_run:
        return {'version': data['version'], 'status': 'dry-run', 'destination': str(dest), 'install_or_update': [x['name'] for x in changed], 'unchanged': len(data['skills']) - len(changed)}
    if not changed:
        return {'version': data['version'], 'status': 'already-current', 'skills': [str(dest / item['name']) for item in data['skills']]}
    dest.mkdir(parents=True, exist_ok=True)
    backup = dest.parent / 'studio-skill-backups' / (datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + uuid4().hex[:8])
    installed, backed_up = [], []
    with tempfile.TemporaryDirectory(prefix='.studio-install-', dir=dest.parent) as staging_name:
        staging = Path(staging_name)
        for item in changed:
            shutil.copytree(repo / 'skills' / item['name'], staging / item['name'])
            if hashes(staging / item['name']) != item['files']:
                raise ValueError(f'暂存副本校验失败：{item["name"]}')
        try:
            for item in changed:
                name = item['name']; target = dest / name
                if target.exists():
                    backup.mkdir(parents=True, exist_ok=True)
                    os.replace(target, backup / name)
                    backed_up.append(name)
                os.replace(staging / name, target)
                installed.append(name)
            for item in data['skills']:
                if not installed_matches(dest, item):
                    raise ValueError(f'安装后校验失败：{item["name"]}')
        except Exception:
            for name in reversed(installed):
                shutil.rmtree(dest / name)
            for name in reversed(backed_up):
                os.replace(backup / name, dest / name)
            raise
    return {'version': data['version'], 'status': 'installed', 'skills': [str(dest / item['name']) for item in data['skills']], 'backup': str(backup) if backed_up else None}


def main() -> int:
    parser = argparse.ArgumentParser(description='一次安装并校验全部 AI Studio Skills')
    parser.add_argument('--dest', type=Path, default=Path(os.environ.get('CODEX_HOME', str(Path.home() / '.codex'))) / 'skills', help='本机 Codex Skills 目录；默认遵循 CODEX_HOME/skills')
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--check', action='store_true', help='仅验证已安装文件，不修改任何内容')
    mode.add_argument('--dry-run', action='store_true', help='预览需要安装/更新的项目')
    args = parser.parse_args()
    try:
        result = install(REPO, args.dest, check=args.check, dry_run=args.dry_run)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        if not args.check and not args.dry_run:
            print('请在 Codex 新任务中确认三个 Skills 已可用；必要时刷新或重启应用。')
        return 0
    except Exception as error:
        print(f'安装未完成：{error}', file=sys.stderr)
        return 1

if __name__ == '__main__':
    raise SystemExit(main())
