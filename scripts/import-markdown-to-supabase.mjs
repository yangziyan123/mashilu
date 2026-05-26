import fs from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { createClient } from "@supabase/supabase-js";

const rootDir = process.cwd();
const contentDir = path.join(rootDir, "src", "content", "ips");
const args = new Set(process.argv.slice(2));
const shouldWrite = args.has("--write");
const dryRun = !shouldWrite || args.has("--dry-run");

const allowedArgs = new Set(["--dry-run", "--write"]);
const unknownArgs = [...args].filter((arg) => !allowedArgs.has(arg));
if (unknownArgs.length > 0) {
  throw new Error(`Unknown argument(s): ${unknownArgs.join(", ")}`);
}

const requiredStringFields = [
  "name",
  "slug",
  "owner",
  "type",
  "primaryDirection",
  "officialUrl",
  "representativeProducts",
  "freeResources",
  "paidProducts",
  "recommendedUseCase",
  "riskNotes",
  "dataStatus",
  "lastVerified",
];

const requiredArrayFields = [
  "categories",
  "tags",
  "platforms",
  "contentTypes",
  "suitableFor",
  "sources",
];

function loadEnvFile(filePath) {
  return fs
    .readFile(filePath, "utf8")
    .then((text) => {
      for (const rawLine of text.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;
        const equalsIndex = line.indexOf("=");
        if (equalsIndex === -1) continue;

        const key = line.slice(0, equalsIndex).trim();
        let value = line.slice(equalsIndex + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (key && process.env[key] === undefined) {
          process.env[key] = value;
        }
      }
    })
    .catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
}

function parseFrontmatter(filePath, text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    throw new Error(`${filePath} does not contain YAML frontmatter`);
  }

  return {
    data: parseYaml(match[1]) ?? {},
    body: text.slice(match[0].length),
  };
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidUrl(value) {
  if (!isNonEmptyString(value)) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function validateIp(filePath, data, body) {
  const errors = [];

  for (const field of requiredStringFields) {
    if (!isNonEmptyString(data[field])) {
      errors.push(`${field} must be a non-empty string`);
    }
  }

  for (const field of requiredArrayFields) {
    if (!Array.isArray(data[field])) {
      errors.push(`${field} must be an array`);
    }
  }

  if (!data.image || typeof data.image !== "object" || Array.isArray(data.image)) {
    errors.push("image must be an object");
  } else {
    if (!isNonEmptyString(data.image.src)) errors.push("image.src must be a non-empty string");
    if (!isNonEmptyString(data.image.alt)) errors.push("image.alt must be a non-empty string");
    if (data.image.source !== undefined && typeof data.image.source !== "string") {
      errors.push("image.source must be a string when present");
    }
  }

  if (!Array.isArray(data.productLinks) || data.productLinks.length === 0) {
    errors.push("productLinks must be a non-empty array");
  } else {
    data.productLinks.forEach((link, index) => {
      if (!link || typeof link !== "object" || Array.isArray(link)) {
        errors.push(`productLinks[${index}] must be an object`);
        return;
      }
      if (!isNonEmptyString(link.label)) errors.push(`productLinks[${index}].label is required`);
      if (!isNonEmptyString(link.type)) errors.push(`productLinks[${index}].type is required`);
      if (!isValidUrl(link.url)) errors.push(`productLinks[${index}].url must be a valid URL`);
      if (link.note !== undefined && typeof link.note !== "string") {
        errors.push(`productLinks[${index}].note must be a string when present`);
      }
    });
  }

  if (!isValidUrl(data.officialUrl)) {
    errors.push("officialUrl must be a valid URL");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data.lastVerified ?? ""))) {
    errors.push("lastVerified must use YYYY-MM-DD format");
  }

  if (!body.trim()) {
    errors.push("Markdown body must not be empty");
  }

  return errors.map((message) => ({ filePath, message }));
}

function toDbRow(data, bodyMarkdown) {
  return {
    slug: data.slug,
    name: data.name,
    owner: data.owner,
    type: data.type,
    categories: data.categories,
    primary_direction: data.primaryDirection,
    tags: data.tags,
    image: data.image,
    official_url: data.officialUrl,
    platforms: data.platforms,
    content_types: data.contentTypes,
    product_links: data.productLinks,
    representative_products: data.representativeProducts,
    free_resources: data.freeResources,
    paid_products: data.paidProducts,
    suitable_for: data.suitableFor,
    recommended_use_case: data.recommendedUseCase,
    risk_notes: data.riskNotes,
    data_status: data.dataStatus,
    last_verified: data.lastVerified,
    sources: data.sources,
    note: data.note ?? null,
    body_markdown: bodyMarkdown,
  };
}

function groupDuplicateSlugs(items) {
  const bySlug = new Map();
  for (const item of items) {
    const files = bySlug.get(item.slug) ?? [];
    files.push(item.filePath);
    bySlug.set(item.slug, files);
  }

  return [...bySlug.entries()]
    .filter(([, files]) => files.length > 1)
    .map(([slug, files]) => ({ slug, files }));
}

async function readIpFiles() {
  const names = await fs.readdir(contentDir);
  return names
    .filter((name) => name.endsWith(".md"))
    .sort((a, b) => a.localeCompare(b, "zh-CN"))
    .map((name) => path.join(contentDir, name));
}

async function upsertRows(rows) {
  await loadEnvFile(path.join(rootDir, ".env"));

  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!isNonEmptyString(supabaseUrl)) {
    throw new Error("PUBLIC_SUPABASE_URL is missing from .env or the environment.");
  }
  if (!isNonEmptyString(serviceRoleKey)) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing. Scheme A requires a local service role key.");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { error } = await supabase.from("ips").upsert(rows, {
    onConflict: "slug",
  });

  if (error) {
    throw new Error(`Supabase upsert failed: ${error.message}`);
  }
}

const filePaths = await readIpFiles();
const parsedItems = [];
const validationErrors = [];
const parseErrors = [];

for (const filePath of filePaths) {
  try {
    const text = await fs.readFile(filePath, "utf8");
    const { data, body } = parseFrontmatter(filePath, text);
    validationErrors.push(...validateIp(filePath, data, body));
    parsedItems.push({
      filePath,
      slug: data.slug,
      row: toDbRow(data, body),
    });
  } catch (error) {
    parseErrors.push({ filePath, message: error.message });
  }
}

const duplicateSlugs = groupDuplicateSlugs(parsedItems);
const duplicateErrors = duplicateSlugs.flatMap(({ slug, files }) =>
  files.map((filePath) => ({
    filePath,
    message: `duplicate slug "${slug}"`,
  })),
);

const allErrors = [...parseErrors, ...validationErrors, ...duplicateErrors];

console.log(`Mode: ${dryRun ? "dry-run" : "write"}`);
console.log(`Markdown files scanned: ${filePaths.length}`);
console.log(`Rows parsed: ${parsedItems.length}`);
console.log(`Duplicate slugs: ${duplicateSlugs.length}`);
console.log(`Validation errors: ${allErrors.length}`);

if (allErrors.length > 0) {
  console.error("\nImport validation failed:");
  for (const error of allErrors) {
    console.error(`- ${path.relative(rootDir, error.filePath)}: ${error.message}`);
  }
  process.exitCode = 1;
} else if (dryRun) {
  console.log("\nDry run passed. No rows were written to Supabase.");
} else {
  await upsertRows(parsedItems.map((item) => item.row));
  console.log(`\nUpserted ${parsedItems.length} rows into public.ips using slug as the conflict key.`);
}
