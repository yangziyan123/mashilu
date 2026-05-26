import type { CollectionEntry } from "astro:content";
import { categoryDefinitions } from "@/data/categories";

export type IpEntry = CollectionEntry<"ips">;
export type ProductLink = IpEntry["data"]["productLinks"][number];

const statusRank = new Map([
  ["已核验", 0],
  ["公开页待二次核验", 1],
  ["待二次核验", 2],
  ["经典归档", 3],
]);

export function sortIps(ips: IpEntry[]) {
  return [...ips].sort((a, b) => {
    const statusDiff =
      (statusRank.get(a.data.dataStatus) ?? 9) -
      (statusRank.get(b.data.dataStatus) ?? 9);
    if (statusDiff !== 0) return statusDiff;

    return a.data.name.localeCompare(b.data.name, "zh-CN");
  });
}

export function getCategorySlug(category: string) {
  return (
    categoryDefinitions.find((item) => item.name === category)?.slug ||
    category
      .toLowerCase()
      .replace(/[\s/]+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
  );
}

export function getCategoryBySlug(slug: string) {
  return categoryDefinitions.find((item) => item.slug === slug);
}

export function getCategoryMeta(category: string) {
  return (
    categoryDefinitions.find((item) => item.name === category) || {
      name: category,
      slug: getCategorySlug(category),
      description: "该分类下的计算机教学个人 IP 汇总。",
    }
  );
}

export function getCategoryStats(ips: IpEntry[]) {
  const counts = new Map<string, number>();
  for (const ip of ips) {
    for (const category of ip.data.categories) {
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([name, count]) => ({
      ...getCategoryMeta(name),
      count,
    }))
    .sort((a, b) => {
      const ai = categoryDefinitions.findIndex((item) => item.name === a.name);
      const bi = categoryDefinitions.findIndex((item) => item.name === b.name);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
}

export function getIpDescription(ip: IpEntry) {
  const data = ip.data;
  const audience = data.suitableFor.slice(0, 3).join("、");
  return `${data.name} 主要覆盖 ${data.primaryDirection}，适合${audience}，免费资源包括${data.freeResources}，付费形态为${data.paidProducts}。`;
}

export function getImageSrc(ip: IpEntry) {
  const src = ip.data.image.src;
  if (/^https?:\/\//.test(src)) return src;
  return src.startsWith("/") ? src : `/${src}`;
}

export function getLinkHost(link: ProductLink) {
  try {
    return new URL(link.url).hostname.replace(/^www\./, "");
  } catch {
    return link.url;
  }
}

export function getAllTags(ips: IpEntry[]) {
  return [...new Set(ips.flatMap((ip) => ip.data.tags))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "zh-CN"));
}

export function getRelatedIps(current: IpEntry, ips: IpEntry[], limit = 4) {
  const categories = new Set(current.data.categories);
  return sortIps(
    ips.filter((ip) => {
      if (ip.data.slug === current.data.slug) return false;
      return ip.data.categories.some((category) => categories.has(category));
    }),
  ).slice(0, limit);
}
