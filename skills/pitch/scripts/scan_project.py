#!/usr/bin/env python3
"""Create a bounded, evidence-oriented inventory of a project."""

from __future__ import annotations

import argparse
import datetime as dt
import os
from pathlib import Path
import subprocess


SKIP_DIRS = {
    ".git", ".hg", ".svn", ".idea", ".vscode", "node_modules", "vendor",
    "dist", "build", ".next", ".nuxt", ".cache", "coverage", "__pycache__",
    ".venv", "venv", "founder-pitch-output",
}

DOC_EXTS = {".md", ".mdx", ".txt", ".docx", ".pdf", ".pptx", ".csv"}
CODE_EXTS = {
    ".html", ".css", ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx",
    ".py", ".java", ".go", ".rs", ".swift", ".kt", ".json", ".yaml",
    ".yml", ".toml", ".sql",
}
MEDIA_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".mp4", ".mov"}
IMPORTANT_WORDS = {
    "readme", "requirement", "需求", "产品", "brief", "plan", "计划", "task",
    "任务", "bug", "test", "测试", "version", "版本", "demo", "progress", "进度",
    "research", "调研", "persona", "tam", "pitch", "演讲",
}


def run_git(root: Path, *args: str) -> str:
    try:
        result = subprocess.run(
            ["git", "-C", str(root), *args],
            check=False,
            capture_output=True,
            text=True,
            timeout=8,
        )
    except (OSError, subprocess.TimeoutExpired):
        return ""
    return result.stdout.strip() if result.returncode == 0 else ""


def category(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix in DOC_EXTS or path.name.lower().startswith("readme"):
        return "文档"
    if suffix in CODE_EXTS:
        return "代码与配置"
    if suffix in MEDIA_EXTS:
        return "图片与媒体"
    return "其他"


def human_size(size: int) -> str:
    if size < 1024:
        return f"{size} B"
    if size < 1024 * 1024:
        return f"{size / 1024:.1f} KB"
    return f"{size / (1024 * 1024):.1f} MB"


def collect(root: Path, output: Path) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    output_abs = output.resolve()
    for current, dirs, files in os.walk(root):
        dirs[:] = sorted(d for d in dirs if d not in SKIP_DIRS and not d.startswith(".cache"))
        current_path = Path(current)
        for filename in sorted(files):
            path = current_path / filename
            try:
                if path.is_symlink() or path.resolve() == output_abs:
                    continue
                stat = path.stat()
            except OSError:
                continue
            rel = path.relative_to(root).as_posix()
            suffix = path.suffix.lower()
            lower = rel.lower()
            is_important = any(word in lower for word in IMPORTANT_WORDS)
            rows.append({
                "path": rel,
                "category": category(path),
                "size": stat.st_size,
                "mtime": stat.st_mtime,
                "important": is_important,
                "readable_text": suffix in (DOC_EXTS | CODE_EXTS) and suffix not in {".docx", ".pdf", ".pptx"},
            })
    rows.sort(key=lambda row: (-float(row["mtime"]), str(row["path"])))
    return rows


def table(rows: list[dict[str, object]], limit: int) -> list[str]:
    lines = ["| 文件 | 类型 | 修改时间 | 大小 |", "|---|---|---:|---:|"]
    for row in rows[:limit]:
        modified = dt.datetime.fromtimestamp(float(row["mtime"])).strftime("%Y-%m-%d %H:%M")
        lines.append(
            f"| `{row['path']}` | {row['category']} | {modified} | {human_size(int(row['size']))} |"
        )
    if len(rows) > limit:
        lines.append(f"\n> 其余 {len(rows) - limit} 个文件未展开，必要时再按目录读取。")
    return lines


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    parser.add_argument("--output", default="founder-pitch-output/00_项目材料清单.md")
    args = parser.parse_args()

    root = Path(args.root).expanduser().resolve()
    output = Path(args.output).expanduser()
    if not output.is_absolute():
        output = root / output
    output.parent.mkdir(parents=True, exist_ok=True)

    rows = collect(root, output)
    important = [row for row in rows if bool(row["important"])]
    docs = [row for row in rows if row["category"] == "文档"]
    code = [row for row in rows if row["category"] == "代码与配置"]
    media = [row for row in rows if row["category"] == "图片与媒体"]
    git_status = run_git(root, "status", "--short")
    git_log = run_git(root, "log", "-5", "--date=short", "--pretty=format:%h | %ad | %s")

    now = dt.datetime.now().astimezone().strftime("%Y-%m-%d %H:%M %Z")
    lines = [
        "# 项目材料清单",
        "",
        f"- 扫描目录：`{root}`",
        f"- 生成时间：{now}",
        f"- 文件总数：{len(rows)}",
        f"- 文档：{len(docs)}；代码与配置：{len(code)}；图片与媒体：{len(media)}",
        "",
        "> 本清单只帮助确定阅读顺序，不代表文件中的计划已经完成。请用当前代码、测试和 Demo 核实状态。",
        "",
        "## 优先阅读",
        "",
        *table(important, 40),
        "",
        "## 最近修改的文件",
        "",
        *table(rows, 35),
        "",
        "## Git 当前改动",
        "",
        "```text",
        git_status or "未检测到 Git 仓库或当前没有改动。",
        "```",
        "",
        "## 最近提交",
        "",
        "```text",
        git_log or "未检测到可读取的 Git 提交记录。",
        "```",
        "",
        "## 读取提醒",
        "",
        "- 先读优先文件和最近修改文件，再决定是否需要打开旧资料。",
        "- `.docx`、`.pptx`、`.pdf` 仅列出，需使用相应文档工具读取。",
        "- 不把 `node_modules`、构建产物、缓存和旧的发布输出当作项目证据。",
    ]
    output.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

