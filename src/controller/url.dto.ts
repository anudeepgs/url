import { z } from "zod";
import { ALIAS_PATTERN } from "../util/short-code.js";

const alias = z.string().regex(ALIAS_PATTERN, "Alias must be 3-32 chars of [0-9a-zA-Z_-]");

export const createUrlSchema = z.object({
  url: z
    .string()
    .trim()
    .max(2048)
    .url()
    .refine((value) => /^https?:$/.test(new URL(value).protocol), "Only http(s) URLs are allowed"),
  alias: alias.optional(),
  expiresAt: z.coerce
    .date()
    .refine((date) => date > new Date(), "expiresAt must be in the future")
    .optional(),
});

export const aliasParamSchema = z.object({ alias });
