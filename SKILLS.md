# AI Studio · 课堂 Skills

把五天课程串在同一个孩子自己的本地项目中：创业方向 → TAM → 名称与 Logo → One-pager → 需求与开发计划 → 开发迭代 → Founder Pitch。

课堂版本：**v1.2.0**。公开教学仓库为 https://github.com/AI-Studio-Class/AI-Studio-Prompts ，只分发课程 Skills、Prompt 和空白模板，不存放学生项目或学生记录。

## 课前一次装齐

| Skill | 使用时机 |
|---|---|
| `aistudio-idea` | Day 1：约 20 分钟，孩子与 AI 一起确定方向，保存创业想法.md 和项目主文件.md |
| `aistudio-project` | Day 1–4：读取既有项目，计算 TAM、取名、Logo 与 Slogan、逐步写开工文档、开发修复与迭代并保存进度 |
| `pitch` | Day 4–5：读取主文件和当前证据，生成发布页、演讲稿、提示卡与问答 |

没有其他必须安装的 Skill；Codex 自带的代码、文件操作与可用图像能力按本机环境使用。Logo 无图像工具时可生成原创 SVG 初稿。

### 助教准备

1. 每台学生电脑先安装并登录 Codex，准备 Python 3.9+（Windows 可用 Python Launcher）。可下载完整 ZIP；使用 git clone 时需 Git。
2. 公开教学资源无需 GitHub 登录或私库授权。若当前 AI 无法联网下载，由助教下载完整 ZIP 并解压后安装，不要假装只读一个网页就已安装所有依赖。
3. 阅读下载快照的 `manifest.json` 与 `scripts/install.py`，再按下面的直接安装命令一次安装三个 Skills；也可让 Codex 执行 [统一安装 Prompt](prompts/install.txt)。使用本机实际 Codex Skills 目录，已装旧版也需更新，不能只因同名 Skill 存在就跳过。此步骤由助教课前做，孩子上课直接使用。
4. 在新任务中确认 aistudio-idea、aistudio-project、pitch 都可发现。必要时刷新/重启 Codex。安装报告验证文件完整，不代替应用端发现检查。学生启动 Prompt 提供完整公开文件地址。
5. 为孩子准备一个本地项目目录，所有课堂窗口选择这个目录。文档会话和开发会话可不同，但不能各自创建一个新的项目副本。

### 不通过 Prompt 的直接安装

从公开教学仓库的 `main` 分支下载 ZIP 并解压；也可执行（无需 GitHub 授权）：

```sh
git clone --branch main --depth 1 https://github.com/AI-Studio-Class/AI-Studio-Prompts.git
cd AI-Studio-Prompts
python3 scripts/install.py
python3 scripts/install.py --check
```

Mac 也可以在解压目录双击 `Install-Mac.command`；Windows 双击 `Install-Windows.cmd`。操作系统要求确认脚本来源时可改用上面的终端命令。Windows 命令行用 `py -3` 代替 `python3`。

脚本默认跟随本机 `CODEX_HOME/skills`（通常为 `~/.codex/skills`）；本机使用其他 Skill 路径时，通过 `--dest "实际路径"` 指定，并在 `--check` 时使用同一路径。

安装前校验 `manifest.json` 列出的所有文件；相同版本重复运行不改文件；更新时先备份同名目录到 Skills 目录上一级的 `studio-skill-backups/`，中途失败恢复旧版本。不会改动其他 Skills。不要手动删除备份后再排查失败。

## 孩子只记一个文件

`项目主文件.md` 是固定入口。每个环节先读取，结束时增量更新。它保存项目名称、已确认 Slogan、Logo 的真实文件路径、TAM 摘要与来源、核心 AI 主线、当前开发状态、Demo 入口和下一步。

- Day 1 方向教练保存 `创业想法.md`，初始化或更新主文件。
- TAM 直接读取已有用户、地区等信息，只问必要未知；保存 `市场分析.md` 和主文件摘要。
- TAM 后取名称、做 Logo 并选择一句 Slogan，保存实际资产、候选理由与确认状态并回写主文件，不更名项目目录。
- Day 2 从主文件提炼 One-pager。它是唯一需要额外打印的材料，每个项目一张。
- 文档会话按原 Sprint 0B **逐步引导**完成 `需求文档.md` 和 `开发计划.md`，每步说清验收与下一步；开发会话再读取它们执行。
- 每轮实现或修复结束更新 `开发记录.md` 与主文件，区分实际运行结果和计划。
- 发布读取主文件和当前证据，不让孩子再写另一份发布资料；完成后把发布产物路径写回主文件。

完整约定见 [项目文档约定](docs/项目文档约定.md)，空白模板见 [项目主文件](templates/项目主文件.md)。若当前工具不能读取本地文件，先由助教选择正确项目；普通聊天只能提供手动保存文本，不能假装已经落盘。

## 课堂 Prompt

[方向](prompts/idea.txt) · [TAM](prompts/tam.txt) · [名称、Logo 与 Slogan](prompts/brand.txt) · [One-pager](prompts/onepager.txt) · [逐步开工文档](prompts/prd.txt) · [继续文档](prompts/continue.txt) · [开发](prompts/build.txt) · [修复](prompts/fix.txt) · [迭代](prompts/iterate.txt) · [同步主文件](prompts/save.txt) · [发布](prompts/pitch.txt)

当前国庆课程的每条项目 Prompt 都给出对应 Skill 的完整公开地址；游戏描述仍由全班提供。详细的读取、估算、引导、验收和保存规则由完整安装的 Skill 执行，不需要孩子复制。

这些 Prompt 在同一个项目中运行，不需要把已有文件内容逐次复制进去。未知、模拟、未测试和未完成都保留原状态。

## 来源与维护

- 创业方向教练基于团队的 [aistudio-idea](https://github.com/AI-Studio-Class/aistudio-idea)，保留对话与定位方法，加入本地文件交接。
- 发布教练来自 [pitch-skill](https://github.com/narutopujian/pitch-skill)，基准提交 `25d87a7da702fbe9d696013aae5c8a73479fe83a`；保留其 MIT 许可与风格、HTML 和讲稿约定。
- `aistudio-project`、统一 Prompt 与安装器为本课程新增。

团员更新按 [CONTRIBUTING.md](https://github.com/AI-Studio-Class/AI-Studio-Prompts/blob/main/CONTRIBUTING.md) 执行，仅提交指定 Skill 和必要清单，运行公开仓库的 `python3 scripts/validate.py`。上传公共资源不等于更新已安装的学生电脑，请重新执行安装 Prompt。

课前由助教获取一次完整快照，核对 manifest.json 中的版本（首次公开版 **1.2.0**），记录 `git rev-parse HEAD`，整期使用同一安装快照，不在课堂中途自动更新。完整地址便于查阅最新公开说明；已安装的课堂规则以该次校验的快照为准。
