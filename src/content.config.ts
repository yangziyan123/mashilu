import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const ips = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/ips" }),
  schema: z.object({
    name: z.string(),
    slug: z.string(),
    owner: z.string(),
    type: z.string(),
    categories: z.array(z.string()),
    primaryDirection: z.string(),
    tags: z.array(z.string()).default([]),
    image: z.object({
      src: z.string(),
      alt: z.string(),
      source: z.string().optional(),
    }),
    officialUrl: z.string().url(),
    platforms: z.array(z.string()).default([]),
    contentTypes: z.array(z.string()).default([]),
    productLinks: z
      .array(
        z.object({
          label: z.string(),
          type: z.string(),
          url: z.string().url(),
          note: z.string().optional(),
        }),
      )
      .min(1),
    representativeProducts: z.string(),
    freeResources: z.string(),
    paidProducts: z.string(),
    suitableFor: z.array(z.string()).default([]),
    recommendedUseCase: z.string(),
    riskNotes: z.string(),
    dataStatus: z.string(),
    lastVerified: z.string(),
    sources: z.array(z.string()).default([]),
    note: z.string().optional(),
  }),
});

export const collections = { ips };
