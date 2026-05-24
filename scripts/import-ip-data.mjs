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

function broadCategory(domain) {
  if (domain.includes("算法")) return "算法/数据结构";
  if (domain.includes("Java")) return "Java 后端";
  if (domain.includes("前端")) return "前端";
  if (domain.includes("嵌入式") || domain.includes("硬件")) return "嵌入式/硬件";
  if (domain.includes("移动端")) return "移动端";
  if (domain.includes("安全")) return "网络安全";
  if (domain.includes("AI") || domain.includes("机器学习") || domain.includes("Python")) return "Python/AI/数据";
  if (
    domain.includes("计算机") ||
    domain.includes("操作系统") ||
    domain.includes("网络") ||
    domain.includes("区块链") ||
    domain.includes("图形学") ||
    domain.includes("Linux")
  ) return "计算机基础/系统";
  if (
    domain.includes("Go") ||
    domain.includes("Rust") ||
    domain.includes("C++") ||
    domain.includes("系统编程") ||
    domain.includes("编译器")
  ) return "语言/后端工程";
  if (domain.includes("学习路线") || domain.includes("校招") || domain.includes("面试")) return "学习路线/求职";
  if (domain.includes("编程入门") || domain.includes("通用编程")) return "编程入门/通用";
  return "其他/扩展";
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

function frontmatter(row, slug) {
  const category = broadCategory(row.domain);
  const tags = splitList(row.tags);
  const platforms = splitList(row.forms);
  const sources = parseSourceLinks(row.source);

  return [
    "---",
    `name: ${yamlScalar(row.name)}`,
    `slug: ${yamlScalar(slug)}`,
    `owner: ${yamlScalar(row.owner)}`,
    `type: ${yamlScalar(row.type)}`,
    `categories: ${yamlArray([category])}`,
    `primaryDirection: ${yamlScalar(row.domain)}`,
    `tags: ${yamlArray(tags)}`,
    `officialUrl: ${yamlScalar(row.url)}`,
    `platforms: ${yamlArray(platforms)}`,
    `contentTypes: ${yamlArray(platforms)}`,
    `representativeProducts: ${yamlScalar(row.product)}`,
    `freeResources: ${yamlScalar(row.free)}`,
    `paidProducts: ${yamlScalar(row.paid)}`,
    `suitableFor: ${yamlArray(splitList(row.audience))}`,
    `recommendedUseCase: ${yamlScalar(row.scene)}`,
    `riskNotes: ${yamlScalar(row.risk)}`,
    `dataStatus: ${yamlScalar(row.status)}`,
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
  generated.push({ slug, name: row.name, category: broadCategory(row.domain) });
}

console.log(`Generated ${generated.length} IP markdown files.`);
