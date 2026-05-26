import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const sourcePath = path.resolve("..", "scripts", "build_teaching_ip_workbook.mjs");
const outputDir = path.resolve("src", "content", "ips");
const sourceText = await fs.readFile(sourcePath, "utf8");

const rowsMatch = sourceText.match(/const rows = (\[[\s\S]*?\]);\s*\n\s*const workbook = Workbook\.create\(\);/);
if (!rowsMatch) {
  throw new Error("Cannot find rows array in build_teaching_ip_workbook.mjs");
}

const rows = Function(`"use strict"; return ${rowsMatch[1]};`)();

function broadCategories(domain) {
  const categories = [];
  const add = (category) => {
    if (!categories.includes(category)) categories.push(category);
  };

  if (domain.includes("项目实战") || domain.includes("实战")) add("项目实战");
  if (domain.includes("学习路线") || domain.includes("校招") || domain.includes("面试") || domain.includes("求职")) add("求职");
  if (domain.includes("前端")) add("前端技术");
  if (
    domain.includes("Java") ||
    domain.includes("Go") ||
    domain.includes("Rust") ||
    domain.includes("C++") ||
    domain.includes("系统编程") ||
    domain.includes("编译器") ||
    domain.includes("后端")
  ) add("后端技术");
  if (domain.includes("AI") || domain.includes("机器学习") || domain.includes("Python") || domain.includes("数据")) add("AI/数据");
  if (domain.includes("算法") || domain.includes("数据结构")) add("算法");
  if (
    domain.includes("计算机") ||
    domain.includes("操作系统") ||
    domain.includes("网络") ||
    domain.includes("区块链") ||
    domain.includes("图形学") ||
    domain.includes("Linux") ||
    domain.includes("图形学")
  ) add("计算机基础");
  if (domain.includes("嵌入式") || domain.includes("硬件") || domain.includes("物联网")) add("嵌入式");
  if (domain.includes("移动端") || domain.includes("Android") || domain.includes("Flutter")) add("移动端");
  if (domain.includes("安全")) add("网络安全");
  if (domain.includes("编程入门") || domain.includes("通用编程") || domain.includes("入门")) add("编程入门");

  return categories.length ? categories : ["其他"];
}

function splitList(value) {
  return String(value || "")
    .split(/[;；、,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseSourceLinks(value) {
  const links = String(value || "").match(/https?:\/\/[^\s，,；;]+/g);
  return links?.map((link) => link.replace(/[。.)）]+$/, "")) ?? [];
}

function inferLinkType(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.replace(/^www\./, "");
    if (host.endsWith("bilibili.com")) return "哔哩哔哩";
    if (host === "github.com") return "GitHub";
    if (host === "gitee.com") return "Gitee";
    if (host === "mp.weixin.qq.com") return "微信公众号";
    if (host === "juejin.cn") return "掘金";
    if (host === "zhihu.com") return "知乎";
    if (host === "blog.csdn.net") return "CSDN";
    if (host === "coursera.org") return "Coursera";
    if (host.includes("zhishixingqiu") || host.includes("zsxq")) return "知识星球";
    if (host.includes("douyin")) return "抖音";
    return "个人网站";
  } catch {
    return "入口";
  }
}

function buildProductLinks(row, sources) {
  const urls = [row.url, ...sources].filter(Boolean);
  const seen = new Set();
  return urls
    .filter((url) => {
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    })
    .map((url, index) => {
      const type = inferLinkType(url);
      return {
        label: index === 0 ? `${row.name}主要入口` : `${row.name}${type}入口`,
        type,
        url,
        note: index === 0 ? "主入口" : "来源入口",
      };
    });
}

function hashSlug(value) {
  return crypto.createHash("sha1").update(value).digest("hex").slice(0, 8);
}

function cleanAscii(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function slugFromUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.replace(/^www\./, "");
    const genericHosts = new Set([
      "bilibili.com",
      "space.bilibili.com",
      "github.com",
      "gitee.com",
      "juejin.cn",
      "zhihu.com",
      "blog.csdn.net",
      "mp.weixin.qq.com",
      "search.bilibili.com",
      "coursera.org",
    ]);
    if (!genericHosts.has(host)) {
      const parts = host.split(".");
      const first = parts[0];
      const subdomainOnly = new Set(["blog", "docs", "learn", "course", "lab", "labs"]);
      return cleanAscii(subdomainOnly.has(first) && parts.length > 2 ? parts[1] : first);
    }
    const pieces = url.pathname.split("/").filter(Boolean).slice(0, 3).join("-");
    return cleanAscii(`${host.split(".")[0]}-${pieces}`);
  } catch {
    return "";
  }
}

function makeSlug(row, used) {
  const knownNames = [
    [/山月/, "shanyue"],
    [/李沐/, "limu-ai"],
  ];
  const known = knownNames.find(([pattern]) => pattern.test(`${row.name} ${row.owner}`));
  const asciiTokens = `${row.name} ${row.owner}`.match(/[A-Za-z0-9]+/g);
  const fromName = cleanAscii(asciiTokens?.slice(0, 4).join("-") ?? "");
  const fromUrl = slugFromUrl(row.url);
  let base = known?.[1] || fromUrl || fromName || `ip-${hashSlug(row.name)}`;
  if (base.length < 3) base = `ip-${hashSlug(row.name)}`;
  base = base.slice(0, 56).replace(/-+$/g, "");

  let slug = base;
  let index = 2;
  while (used.has(slug)) {
    slug = `${base}-${index}`;
    index += 1;
  }
  used.add(slug);
  return slug;
}

function yamlScalar(value) {
  return JSON.stringify(String(value ?? ""));
}

function yamlArray(values) {
  const clean = values.filter(Boolean);
  if (clean.length === 0) return "[]";
  return `\n${clean.map((item) => `  - ${yamlScalar(item)}`).join("\n")}`;
}

function yamlObjectArray(values) {
  if (values.length === 0) return "[]";
  return `\n${values
    .map((item) => {
      const lines = [
        `  - label: ${yamlScalar(item.label)}`,
        `    type: ${yamlScalar(item.type)}`,
        `    url: ${yamlScalar(item.url)}`,
      ];
      if (item.note) lines.push(`    note: ${yamlScalar(item.note)}`);
      return lines.join("\n");
    })
    .join("\n")}`;
}

function frontmatter(row, slug) {
  const categories = broadCategories(row.domain);
  const tags = splitList(row.tags);
  const platforms = splitList(row.forms);
  const sources = parseSourceLinks(row.source);
  const productLinks = buildProductLinks(row, sources.length ? sources : [row.url]);

  return [
    "---",
    `name: ${yamlScalar(row.name)}`,
    `slug: ${yamlScalar(slug)}`,
    `owner: ${yamlScalar(row.owner)}`,
    `type: ${yamlScalar(row.type)}`,
    `categories: ${yamlArray(categories)}`,
    `primaryDirection: ${yamlScalar(row.domain)}`,
    `tags: ${yamlArray(tags)}`,
    `image:`,
    `  src: ${yamlScalar(`/images/ip-avatars/${slug}.svg`)}`,
    `  alt: ${yamlScalar(`${row.name}代表图片`)}`,
    `  source: ${yamlScalar("本地生成占位头像，待替换为已核验头像/标识")}`,
    `officialUrl: ${yamlScalar(row.url)}`,
    `platforms: ${yamlArray(platforms)}`,
    `contentTypes: ${yamlArray(platforms)}`,
    `productLinks: ${yamlObjectArray(productLinks)}`,
    `representativeProducts: ${yamlScalar(row.product)}`,
    `freeResources: ${yamlScalar(row.free)}`,
    `paidProducts: ${yamlScalar(row.paid)}`,
    `suitableFor: ${yamlArray(splitList(row.audience))}`,
    `recommendedUseCase: ${yamlScalar(row.scene)}`,
    `riskNotes: ${yamlScalar(row.risk)}`,
    `dataStatus: "待核验"`,
    `lastVerified: "2026-05-24"`,
    `sources: ${yamlArray(sources.length ? sources : [row.url])}`,
    `note: ${yamlScalar(row.note)}`,
    "---",
  ].join("\n");
}

function markdownBody(row) {
  return [
    "",
    `## 收录说明`,
    "",
    `${row.name} 主要覆盖「${row.domain}」方向，适合${row.audience}。推荐使用场景是：${row.scene}。`,
    "",
    `## 代表内容`,
    "",
    row.product,
    "",
    `## 免费资源与付费边界`,
    "",
    `免费资源：${row.free}`,
    "",
    `付费/商业形态：${row.paid}`,
    "",
    `## 注意点`,
    "",
    row.risk,
    "",
  ].join("\n");
}

await fs.rm(outputDir, { recursive: true, force: true });
await fs.mkdir(outputDir, { recursive: true });

const used = new Set();
const generated = [];
for (const row of rows) {
  const slug = makeSlug(row, used);
  const filePath = path.join(outputDir, `${slug}.md`);
  const text = `${frontmatter(row, slug)}${markdownBody(row)}`;
  await fs.writeFile(filePath, text, "utf8");
  generated.push({ slug, name: row.name, categories: broadCategories(row.domain) });
}

console.log(`Generated ${generated.length} IP markdown files.`);
