# ManyCore Hackathon Hub · 项目记录

> 本文件是项目的持久记录，和源代码一起保存在 GitHub，不依赖聊天记录。

## 当前线上状态

- 前端：Vite + React，GitHub Pages，`main` 分支 `/docs`
- 线上地址：https://xing0325.github.io/manycore-hackathon-voting-hub/
- Supabase 项目：`hkzxqhdopxfrbtmogdiz`（ap-northeast-1）
- 当前部署提交：`e4e4359`（记录文件）

## 已完成

- Stitch 9 个画面已导出到 `../outputs/stitch-hackathon-showcase-voting-hub/`
- React 展厅、作品详情、三票选择、投稿页、实时榜单
- `public.projects`：作品和链接
- `public.votes`：三票制选票，唯一约束 `(voter_id, project_id)`、`(voter_id, rank)`
- `public.participants`：本名唯一（`normalized_name`）
- Supabase Auth：本名 + 密码；本名转换为内部邮箱标识，不向用户展示
- Supabase Storage：`project-assets`，封面和 PDF/PPT/PPTX
- `submit_ballot(uuid[])`：登录后原子提交三个不同作品，重复提交拒绝
- `get_leaderboard()`：公开读取已发布作品及票数
- 所有业务表和 Storage 均启用 RLS；security advisors 已通过

## 关键文件

- `src/main.jsx`：前端和 Supabase 调用
- `src/supabase.js`：客户端初始化
- `supabase/migrations/`：按时间顺序的完整数据库变更
- `.env.example`：本地环境变量模板（不提交真实密钥）
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

## 记录规则

1. 每次改动先更新本文件的当前线上状态和已完成列表。
2. 每次数据库改动新增不可变迁移文件，文件名使用 `YYYYMMDDNNNN_description.sql`。
3. 每次发布同步更新 `VERIFICATION.txt`，记录 commit、测试、线上 URL。
4. 不把 publishable key 以外的密钥写入代码、聊天或 Git。
