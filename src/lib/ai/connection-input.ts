import { z } from "zod";
import { PROVIDER_IDS, providerPreset } from "./providers";

/** Shared by draft tests, model discovery and saved settings. */
export const aiConnectionSchema = z
  .object({
    provider: z.string().refine((value) => PROVIDER_IDS.has(value), {
      message: "Choose a supported provider.",
    }),
    baseUrl: z.string().trim().min(1).max(300),
    apiKey: z.string().trim().max(400).optional(),
    jsonMode: z.boolean().optional(),
    allowHttp: z.boolean().optional(),
    allowPrivate: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    const local = providerPreset(value.provider)?.local === true;
    if ((value.allowPrivate || value.allowHttp) && !local) {
      ctx.addIssue({
        code: "custom",
        message: "Local access is only available for a local provider.",
      });
    }
    if (local && !value.allowPrivate) {
      ctx.addIssue({
        code: "custom",
        message: "A local provider requires the local-access option.",
      });
    }
  });

export const aiCredentialSchema = aiConnectionSchema.safeExtend({
  model: z.string().trim().min(1, "Choose a model or enter its ID.").max(120),
});

export type AiConnectionInput = z.infer<typeof aiConnectionSchema>;
