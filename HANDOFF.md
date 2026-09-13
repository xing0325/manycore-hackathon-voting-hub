# ManyCore Hackathon Hub · 接手说明

这份文件用于换电脑后直接接手，不依赖当前聊天记录。

## 入口

- GitHub 仓库：<https://github.com/xing0325/manycore-hackathon-voting-hub>
- 在线站点：<https://xing0325.github.io/manycore-hackathon-voting-hub/>
- Supabase 项目：<https://supabase.com/dashboard/project/hkzxqhdopxfrbtmogdiz>
- Supabase API：`https://hkzxqhdopxfrbtmogdiz.supabase.co`
- Pages 发布源：`main` 分支的 `/docs` 目录

## 新电脑启动

```bash
git clone https://github.com/xing0325/manycore-hackathon-voting-hub.git
cd manycore-hackathon-voting-hub
npm ci
cp .env.example .env.local
npm test
npm run verify:backend
npm run dev
```

打开 Vite 输出的本地地址即可。`.env.example` 已包含本项目的 Supabase URL 和公开 publishable key，不需要寻找当前电脑的配置文件。

## 后端数据

- `public.projects`：作品名称、组名、赛道、GitHub URL、演示视频 URL、封面 URL、PPT URL、票数。
- `public.votes`：投票记录；`submit_ballot(uuid[])` 原子提交三票。
- `public.participants`：本名唯一的参赛账号映射。
- `project-assets`：Supabase Storage 公共读取桶；封面和 PPT 上传到这里。
- `get_leaderboard()`：展厅读取作品及票数。
- 数据看板链接：<https://xing0325.github.io/manycore-hackathon-voting-hub/#dashboard>；页面通过 Supabase Realtime 监听项目/投票变化，并每 8 秒自动校验一次，不需要手动刷新。
- Supabase Auth：页面只输入本名和组名，凭据由前端按规则生成并由 Supabase 保存；同一本名只能有一个账号。

## 修改和发布

```bash
npm test
npm run build
git add .
git commit -m "描述修改"
git push origin main
```

GitHub Pages 会自动从 `main:/docs` 构建。不要把 `.env.local`、Supabase secret/service-role key 或 GitHub PAT 提交到仓库。

## 权限交接

代码权限由 GitHub 仓库账号控制，数据库和 Storage 权限由 Supabase 项目成员控制。换电脑时分别登录拥有以下资源的 GitHub / Supabase 账号即可：

1. GitHub 仓库的读写权限，用于 `git clone`、`git push` 和 Pages 设置。
2. Supabase 项目的成员权限，用于 SQL Editor、Auth、Storage 和项目设置。

公开前端只使用 publishable key；管理密钥不会写入代码或压缩包。

## 已验证

- `npm test`：3/3 通过。
- `npm run build`：通过，输出到 `docs/`。
- Supabase REST：`projects`、`votes`、`participants` 均可访问。
- Dashboard：`get_leaderboard()` HTTP 200；Realtime 订阅 + 8 秒轮询兜底已接入。
- Auth：临时账号注册并创建 participant 记录成功。
- GitHub Pages：线上 HTTP 200，线上 bundle 已验证无密码输入字段。

更完整的数据库迁移顺序、发布记录和恢复说明见 `ARCHITECTURE.md` 与 `VERIFICATION.txt`。
