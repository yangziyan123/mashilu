# 码师录

码师录是一个面向计算机学习者的个人 IP 教学资源索引库。MVP 使用 Astro 静态生成、Markdown Content Collection 维护数据，并通过 Pagefind 生成站内搜索索引。

## 开发

```bash
npm install
npm run dev
```

## 数据导入

首批数据来自上级目录的 Excel 构建脚本：

```bash
npm run import:data
```

导入后会生成 `src/content/ips/*.md`。每个 IP 独立维护 frontmatter 和正文，便于 SEO、审阅和版本管理。

## 构建

```bash
npm run build
npm run preview
```

`build` 会先执行 Astro 静态构建，再用 Pagefind 为 `dist` 生成搜索索引。

## GitHub Pages

工作流位于 `.github/workflows/deploy.yml`。仓库 Pages 设置为 GitHub Actions 后，推送到 `main` 会自动构建并发布。

如使用项目站点仓库，例如 `https://用户名.github.io/mashilu/`，工作流会自动设置：

- `SITE_URL=https://用户名.github.io`
- `BASE_PATH=/mashilu/`

若使用用户站点仓库，可把工作流中的 `BASE_PATH` 调整为 `/`。
