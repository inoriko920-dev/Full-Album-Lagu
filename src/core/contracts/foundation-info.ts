import { z } from "zod";

export const FOUNDATION_INFO_CHANNEL = "foundation:get-info" as const;

export const foundationInfoSchema = z.object({
  platform: z.string().min(1),
  arch: z.string().min(1),
  phase: z.literal("foundation")
});

export type FoundationInfo = z.infer<typeof foundationInfoSchema>;
