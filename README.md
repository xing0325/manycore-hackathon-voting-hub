# ManyCore Hackathon Showcase & Voting Hub

面向黑客松现场的作品展厅、提交系统与三票制投票中心。参与者可以用本名和组名进入空间、提交作品、浏览其他团队项目并投出三张选票；组织者可以通过实时看板观察投票进度与排名。

**在线体验：** <https://xing0325.github.io/manycore-hackathon-voting-hub/>  
**实时看板：** <https://xing0325.github.io/manycore-hackathon-voting-hub/#dashboard>

## 核心流程

1. 参与者使用本名和组名注册；本名全局唯一。
2. 每个小组提交一份正式作品，可维护封面、说明、仓库和演示链接。
3. 每位参与者拥有三张选票，并可在截止前调整选择。
4. 看板通过数据库函数、Realtime 和轮询兜底同步榜单。

展厅中的四张默认卡片是教学占位示例，不参与正式投票。视频以 URL 方式保存，不上传视频文件。

## 技术栈

- React 19 + Vite 8
- Supabase Auth、Postgres、Realtime 与 Storage
- Row Level Security：限制身份、作品与选票的访问边界
- Node Test Runner：关键业务规则测试
- GitHub Pages：静态前端发布

## 本地开发

```bash
git clone https://github.com/xing0325/manycore-hackathon-voting-hub.git
cd manycore-hackathon-voting-hub
npm ci
cp .env.example .env.local
# 在 .env.local 中填写 Supabase URL 与 publishable key
npm test
npm run dev
```

生产构建：

```bash
npm run build
npm run preview
```

## 验证后端

```bash
npm run verify:backend
```

数据库迁移位于 `supabase/migrations/`。管理密钥不会提交到仓库；新环境只需要从 Supabase 项目设置取得公开客户端配置。

## 仓库结构

```text
src/                  React 应用、样式与 Supabase 客户端
supabase/migrations/  数据库结构、RLS 与函数
test/                 前端与业务规则测试
scripts/              后端连通性验证脚本
docs/                 GitHub Pages 构建产物
screens/              设计稿与页面参考
ARCHITECTURE.md        系统结构
HANDOFF.md             换电脑或交接说明
```

## 数据边界

账号、作品、选票和上传文件由 Supabase 保存，不依赖某一台开发电脑。每个本名只能注册一次，每组只能提交一份正式作品，提交者只能编辑自己的作品。线上环境应始终启用 RLS，并避免将服务端管理密钥写入前端配置。
