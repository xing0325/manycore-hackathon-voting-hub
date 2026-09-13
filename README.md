# ManyCore Hackathon Showcase & Voting Hub

线上地址：<https://xing0325.github.io/manycore-hackathon-voting-hub/>

## 技术栈

- Vite + React
- Supabase Auth：第一屏仅本名 + 组名登录，不显示密码；本名全局唯一
- Supabase Postgres：作品、三票制选票、实时榜单
- Supabase Storage：封面、PDF/PPT/PPTX
- GitHub Pages：前端托管

GitHub 仓库和演示视频只保存 URL，不上传视频文件。数据库与 Storage 均启用 RLS；每个本名只能注册一次，每个组只能提交一份正式作品，提交后只能编辑自己的作品。登录凭据由 Supabase 内部管理，页面不要求用户输入密码。展厅中的 4 张默认卡片是教学占位示例，不参与投票。

数据看板：<https://xing0325.github.io/manycore-hackathon-voting-hub/#dashboard>。看板使用 `get_leaderboard()`，通过 Supabase Realtime 监听项目/投票变化，并保留 8 秒自动轮询兜底，因此打开后不需要手动刷新。

## 本地开发

```bash
cp .env.example .env.local
npm install
npm run dev
```

## 换电脑快速接手

```bash
git clone https://github.com/xing0325/manycore-hackathon-voting-hub.git
cd manycore-hackathon-voting-hub
npm ci
cp .env.example .env.local
# 编辑 .env.local，填入 Supabase URL 与 publishable key
npm test
npm run dev
```

线上地址和数据库数据不依赖当前电脑：GitHub Pages 继续发布 `main:/docs`，Supabase 保存账号、作品、投票及 Storage 文件。管理密钥不放进代码仓库；新电脑登录 GitHub，并从 Supabase 项目设置取得 publishable key 即可运行。

数据库结构位于 `supabase/migrations/`。生产构建输出到 `docs/`，供 GitHub Pages 发布。
