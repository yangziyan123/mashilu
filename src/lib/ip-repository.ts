import fs from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { createSupabaseClient } from "@/lib/supabase";
import type { IpData, IpEntry, IpImage, ProductLink } from "@/lib/ips";

interface IpRow {
  id: string;
  slug: string;
  name: string;
  owner: string;
  type: string;
  categories: string[];
  primary_direction: string;
  tags: string[];
  image: unknown;
  official_url: string;
  platforms: string[];
  content_types: string[];
  product_links: unknown;
  representative_products: string;
  free_resources: string;
  paid_products: string;
  suitable_for: string[];
  recommended_use_case: string;
  risk_notes: string;
  data_status: string;
  last_verified: string | null;
  sources: string[];
  note: string | null;
  body_markdown: string;
}

function asImage(value: unknown): IpImage {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { src: "", alt: "" };
  }

  const image = value as Partial<IpImage>;
  return {
    src: typeof image.src === "string" ? image.src : "",
    alt: typeof image.alt === "string" ? image.alt : "",
    source: typeof image.source === "string" ? image.source : undefined,
  };
}

function asProductLinks(value: unknown): ProductLink[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object" && !Array.isArray(item))
    .map((item) => ({
      label: typeof item.label === "string" ? item.label : "",
      type: typeof item.type === "string" ? item.type : "",
      url: typeof item.url === "string" ? item.url : "",
      note: typeof item.note === "string" ? item.note : undefined,
    }));
}

function rowToIpEntry(row: IpRow): IpEntry {
  const data: IpData = {
    name: row.name,
    slug: row.slug,
    owner: row.owner,
    type: row.type,
    categories: row.categories,
    primaryDirection: row.primary_direction,
    tags: row.tags,
    image: asImage(row.image),
    officialUrl: row.official_url,
    platforms: row.platforms,
    contentTypes: row.content_types,
    productLinks: asProductLinks(row.product_links),
    representativeProducts: row.representative_products,
    freeResources: row.free_resources,
    paidProducts: row.paid_products,
    suitableFor: row.suitable_for,
    recommendedUseCase: row.recommended_use_case,
    riskNotes: row.risk_notes,
    dataStatus: row.data_status,
    lastVerified: row.last_verified ?? "",
    sources: row.sources,
    note: row.note ?? undefined,
  };

  return {
    id: row.slug,
    slug: row.slug,
    body: row.body_markdown,
    bodyMarkdown: row.body_markdown,
    collection: "ips",
    data,
  };
}

function markdownToIpEntry(filePath: string, data: IpData, bodyMarkdown: string): IpEntry {
  return {
    id: data.slug,
    slug: data.slug,
    body: bodyMarkdown,
    bodyMarkdown,
    collection: "ips",
    data,
  };
}

function parseMarkdownEntry(filePath: string, text: string): IpEntry {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    throw new Error(`${filePath} does not contain YAML frontmatter.`);
  }

  const data = parseYaml(match[1]) as IpData;
  const bodyMarkdown = text.slice(match[0].length);
  return markdownToIpEntry(filePath, data, bodyMarkdown);
}

async function getAllIpsFromMarkdown(): Promise<IpEntry[]> {
  const contentDir = path.join(process.cwd(), "src", "content", "ips");
  const filenames = await fs.readdir(contentDir);
  const entries = await Promise.all(
    filenames
      .filter((name) => name.endsWith(".md"))
      .sort((a, b) => a.localeCompare(b, "zh-CN"))
      .map(async (filename) => {
        const filePath = path.join(contentDir, filename);
        const text = await fs.readFile(filePath, "utf8");
        return parseMarkdownEntry(filePath, text);
      }),
  );

  return entries.filter((ip) => ip.data.dataStatus !== "草稿");
}

export async function getAllIps(): Promise<IpEntry[]> {
  if (import.meta.env.SUPABASE_FALLBACK_TO_MARKDOWN === "true") {
    console.warn("Using local Markdown fallback for IP data because SUPABASE_FALLBACK_TO_MARKDOWN=true.");
    return getAllIpsFromMarkdown();
  }

  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("ips")
    .select(
      [
        "id",
        "slug",
        "name",
        "owner",
        "type",
        "categories",
        "primary_direction",
        "tags",
        "image",
        "official_url",
        "platforms",
        "content_types",
        "product_links",
        "representative_products",
        "free_resources",
        "paid_products",
        "suitable_for",
        "recommended_use_case",
        "risk_notes",
        "data_status",
        "last_verified",
        "sources",
        "note",
        "body_markdown",
      ].join(","),
    )
    .neq("data_status", "草稿");

  if (error) {
    throw new Error(`Failed to fetch public.ips from Supabase: ${error.message}`);
  }

  return ((data ?? []) as IpRow[]).map(rowToIpEntry);
}
