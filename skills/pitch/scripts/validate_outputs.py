#!/usr/bin/env python3
"""Validate the deterministic parts of Founder Pitch Studio outputs."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import re


REQUIRED = [
    "00_项目材料清单.md",
    "01_发布大纲.md",
    "02_Founder_Pitch.html",
    "03_演讲稿_5分钟逐字版.md",
    "04_演讲稿_3分钟精简版.md",
    "05_演讲稿_关键词提示卡.md",
    "06_投资人问答准备.md",
    "pitch-settings.json",
]

STYLES = {
    "studio-editorial-white", "midnight-product-launch", "future-lab",
    "blueprint-workshop", "founder-newsroom", "mission-control",
    "product-gallery", "investor-data-room", "field-notes",
    "cinematic-founder-story",
}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="founder-pitch-output")
    args = parser.parse_args()
    root = Path(args.output).expanduser().resolve()
    errors: list[str] = []
    warnings: list[str] = []

    for name in REQUIRED:
        path = root / name
        if not path.exists():
            errors.append(f"缺少文件：{name}")
        elif path.stat().st_size < 40:
            errors.append(f"文件几乎为空：{name}")

    outline_path = root / "01_发布大纲.md"
    if outline_path.exists():
        outline = outline_path.read_text(encoding="utf-8", errors="replace")
        for heading in ["解决的问题与痛点", "拟采用的解决方案", "解决该问题带来的价值", "Demo", "下一步计划"]:
            if heading not in outline:
                errors.append(f"发布大纲缺少：{heading}")
        if not any(label in outline for label in ["[真实资料]", "[估算]", "[待验证]", "[未完成]"]):
            warnings.append("发布大纲没有看到证据状态标签。")

    html_path = root / "02_Founder_Pitch.html"
    if html_path.exists():
        html = html_path.read_text(encoding="utf-8", errors="replace")
        if len(re.findall(r"<section\b", html, flags=re.I)) < 6:
            errors.append("HTML 少于 6 个页面 section。")
        for token in ["1600px", "900px", "ArrowRight", "ArrowLeft", "contextmenu"]:
            if token not in html:
                errors.append(f"HTML 缺少固定能力：{token}")
        if re.search(r"\{\{\s*[A-Z0-9_]+\s*\}\}", html):
            errors.append("HTML 仍包含未替换的模板占位符。")
        remote_assets = re.findall(r"(?:src|href)=[\"']https?://", html, flags=re.I)
        if remote_assets:
            warnings.append("HTML 包含远程资源链接，请确认离线时仍可演讲。")

    settings_path = root / "pitch-settings.json"
    if settings_path.exists():
        try:
            settings = json.loads(settings_path.read_text(encoding="utf-8"))
            style_id = settings.get("style_id")
            if style_id not in STYLES:
                errors.append(f"pitch-settings.json 中的 style_id 无效：{style_id}")
        except (json.JSONDecodeError, OSError) as exc:
            errors.append(f"pitch-settings.json 无法读取：{exc}")

    full_path = root / "03_演讲稿_5分钟逐字版.md"
    if full_path.exists():
        full = full_path.read_text(encoding="utf-8", errors="replace")
        for label in ["必说", "证据", "Demo动作"]:
            if f"[{label}]" not in full and f"【{label}】" not in full:
                warnings.append(f"5 分钟逐字稿缺少标记：{label}")

    result = {"ok": not errors, "errors": errors, "warnings": warnings, "output": str(root)}
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
