# 更新一个课堂 Skill

供有本仓库写权限的团队成员及其编码助手执行。目标仓库仅为 `AI-Studio-Class/AI-Studio-Prompts`，不得修改工作台仓库或服务器。

1. 确认用户提供的完整 Skill 目录或明确修改，以及目标 Skill 名称。缺少源文件或名称时询问，不猜测，不上传整台电脑的 Skills。
2. 使用已有 GitHub 授权取得最新 main 到独立目录。已有工作区有未提交内容时保留它；禁止 reset --hard、强推和自动解决冲突。无权限时停止上传并明确说明，不索取明文 Token。
3. 查看差异，将指定 Skill 更新到 `skills/<名称>/`，保留其必要 references、templates、assets、scripts 和许可证。不得上传 .env、密钥、登录状态、学生项目/姓名/照片、工作台文件、私人目录或符号链接。用户没有授权的删除、其他 Skill 的变更一律不做。
4. 阅读并遵循该 Skill 自己的测试方法，检查本地引用和依赖。运行 `python3 scripts/refresh_manifest.py` 更新资源版本和校验清单，再运行 `python3 scripts/validate.py`。仅更新一个 Skill 时，其他 Skill 的文件不得改变。
5. 用 `git diff --check` 和 `git diff --stat` 检查。只暂存指定 Skill、必要相关说明及生成的 manifest.json、prompt-catalog.json，禁止 git add .。确认提交中没有秘密或真实业务数据。
6. 提交有意义的说明，再次检查远端 main，正常 push（不使用 --force）。远端已有新提交先保留本地工作并安全整合；冲突交由用户处理。若 main 受保护则推送功能分支并创建 PR，明确“待合并”，不能声称已上线。
7. 拉取远端提交 SHA 并核对。报告更新的 Skill、资源版本、提交链接及验证结果。上传公共教学仓库不等于部署工作台或更新已经安装的学生电脑；后者需重新执行安装/更新 Prompt。

维护者不得在公共仓库放置服务器凭证或自动部署令牌。工作台只读取自己发布的教学资源快照；Skill 内容链接指向本公共仓库。
