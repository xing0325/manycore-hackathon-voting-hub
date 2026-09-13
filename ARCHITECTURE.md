# ManyCore Hackathon Hub · 项目记录

> 本文件是项目的持久记录，和源代码一起保存在 GitHub，不依赖聊天记录。

## 当前线上状态

- 前端：Vite + React，GitHub Pages，`main` 分支 `/docs`
- 线上地址：https://xing0325.github.io/manycore-hackathon-voting-hub/
- Supabase 项目：`hkzxqhdopxfrbtmogdiz`（ap-northeast-1）
- 当前功能部署提交：`76aa43ddf021ab0fbea9112ee2b21c60610f6c9f`（GitHub Pages 已构建）
- 最新项目记录提交：`53f3b9ccc2ef918033949bd4c6864873f69e4e9b`

## 已完成

- Stitch 9 个画面已导出到 `../outputs/stitch-hackathon-showcase-voting-hub/`
- React 展厅、作品详情、三票选择、投稿页、实时榜单
- `public.projects`：作品和链接
- `public.votes`：三票制选票，唯一约束 `(voter_id, project_id)`、`(voter_id, rank)`
- `public.participants`：本名唯一（`normalized_name`）
- Supabase Auth：第一屏本名 + 组名，无密码输入；本名转换为内部邮箱标识，不向用户展示
- Supabase Storage：`project-assets`，封面和 PDF/PPT/PPTX
- `submit_ballot(uuid[])`：登录后原子提交三个不同作品，重复提交拒绝
- `get_leaderboard()`：公开读取已发布作品及票数
- `#dashboard`：只读数据看板；Realtime 监听 `projects` / `votes`，每 8 秒轮询兜底，不需要手动刷新
- 所有业务表和 Storage 均启用 RLS；security advisors 已通过

## 云端迁移状态（2026-09-13）

- 已验证 Supabase 云端核心表和函数：`projects`、`votes`、`participants`、`get_leaderboard()` 均返回 HTTP 200。
- `202609130002_demo_cards_and_submission_rules.sql` 尚未在云端执行；当前查询 `projects.is_demo` 返回 `42703 column does not exist`。现在线上前端会识别四张教学示例卡片，账号级唯一提交约束仍由已上线的 `owner_id` 唯一索引和前端校验工作。
- `202609130003_dashboard_realtime.sql` 已随代码发布；云端 publication 需要在 Supabase SQL Editor 执行后才会推送数据库事件。即使未开启 publication，看板仍用 8 秒自动轮询保持更新。

## 关键文件

- `src/main.jsx`：前端和 Supabase 调用
- `src/supabase.js`：客户端初始化
- `supabase/migrations/`：按时间顺序的完整数据库变更
- `.env.example`：本地环境变量模板（不提交真实密钥）
- `.env.local`：本机本地开发配置（不提交；换电脑时按 `.env.example` 创建）
- `README.md`：运行和部署说明
- `VERIFICATION.txt`：每次变更的测试和回滚记录
- `ROLLBACK.sh`：恢复脚本

## 发布流程

```bash
export VITE_SUPABASE_URL='https://hkzxqhdopxfrbtmogdiz.supabase.co'
export VITE_SUPABASE_PUBLISHABLE_KEY='sb_publishable_...'
npm ci
npm test
npm run build
git add . && git commit -m '描述变更' && git push origin main
```

GitHub Pages 会从 `main:/docs` 自动发布。Supabase 迁移通过 Supabase MCP 的 `apply_migration` 按文件名执行；不要重排或删除已执行的迁移。

## 换电脑接手

```bash
git clone https://github.com/xing0325/manycore-hackathon-voting-hub.git
cd manycore-hackathon-voting-hub
npm ci
cp .env.example .env.local
# 在 .env.local 填入 Supabase URL 和 publishable key
npm test
npm run dev
```

线上前端无需重新配置：GitHub Pages 已发布 `/docs`，Supabase 数据库和 Storage 保留线上数据。仓库只包含可公开的 publishable key 配置方式；Supabase service-role key、GitHub PAT 等管理凭据不写入仓库，需要在新电脑的密码管理器或对应平台登录后单独配置。

## 记录规则

1. 每次改动先更新本文件的当前线上状态和已完成列表。
2. 每次数据库改动新增不可变迁移文件，文件名使用 `YYYYMMDDNNNN_description.sql`。
3. 每次发布同步更新 `VERIFICATION.txt`，记录 commit、测试、线上 URL。
4. 不把 publishable key 以外的密钥写入代码、聊天或 Git。
