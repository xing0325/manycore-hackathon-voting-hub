# ManyCore Hackathon Showcase & Voting Hub

线上地址：<https://xing0325.github.io/manycore-hackathon-voting-hub/>

## 技术栈

- Vite + React
- Supabase Auth：第一屏本名 + 组名 + 密码登录，本名全局唯一
- Supabase Postgres：作品、三票制选票、实时榜单
- Supabase Storage：封面、PDF/PPT/PPTX
- GitHub Pages：前端托管

GitHub 仓库和演示视频只保存 URL，不上传视频文件。数据库与 Storage 均启用 RLS；每个本名只能注册一次，每个组只能提交一份正式作品，提交后只能编辑自己的作品。展厅中的 4 张默认卡片是教学占位示例，不参与投票。

## 本地开发

```bash
cp .env.example .env.local
npm install
npm run dev
```

数据库结构位于 `supabase/migrations/`。生产构建输出到 `docs/`，供 GitHub Pages 发布。
