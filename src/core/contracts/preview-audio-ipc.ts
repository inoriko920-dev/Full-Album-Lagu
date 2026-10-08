import { z } from "zod";

export const PREVIEW_AUDIO_ISSUE_CHANNEL = "media:issue-preview-audio" as const;

export const previewAudioIssueRequestSchema = z
  .object({
    batchId: z.string().min(1).max(150),
    projectId: z.string().min(1).max(150),
    assetId: z.string().min(1).max(150),
  })
  .strict();

export const previewAudioIssueResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("blocked") }).strict(),
  z
    .object({
      status: z.literal("granted"),
      url: z.string().regex(/^lfa-preview:\/\/media\/[0-9a-f]{64}$/),
    })
    .strict(),
]);

export type PreviewAudioIssueRequest = z.infer<
  typeof previewAudioIssueRequestSchema
>;
export type PreviewAudioIssueResult = z.infer<
  typeof previewAudioIssueResultSchema
>;
