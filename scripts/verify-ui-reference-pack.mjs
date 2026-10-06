import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const manifestPaths = [
  "docs/ui/manifests/UI_REFERENCE_MANIFEST.json",
  "docs/ui/manifests/UI_FREEZE_MANIFEST.json",
];

function gitBlobSha(buffer) {
  const header = Buffer.from(`blob ${buffer.length}\0`);
  return createHash("sha1").update(header).update(buffer).digest("hex");
}

async function verifyFileRef(label, ref) {
  if (
    !ref ||
    typeof ref.path !== "string" ||
    typeof ref.gitBlobSha !== "string"
  ) {
    throw new Error(`${label} is missing path/gitBlobSha.`);
  }

  const bytes = await readFile(ref.path);
  const actual = gitBlobSha(bytes);

  if (actual !== ref.gitBlobSha) {
    throw new Error(
      `${label} hash mismatch for ${ref.path}: expected ${ref.gitBlobSha}, got ${actual}`,
    );
  }
}

const [referenceRaw, freezeRaw] = await Promise.all(
  manifestPaths.map((path) => readFile(path, "utf8")),
);

const reference = JSON.parse(referenceRaw);
const freeze = JSON.parse(freezeRaw);

if (reference.status !== "FROZEN") {
  throw new Error("UI reference pack must be FROZEN.");
}

if (freeze.status !== "FROZEN") {
  throw new Error("UI freeze manifest must be FROZEN.");
}

if (reference.visualReference?.approvedVisualStateCount !== 29) {
  throw new Error(
    "UI reference pack must declare exactly 29 approved visual states.",
  );
}

if (freeze.referencePackId !== reference.packId) {
  throw new Error(
    "UI freeze manifest does not point to the active reference pack.",
  );
}

await verifyFileRef("promptPack", reference.promptPack);
await verifyFileRef("visualReference", reference.visualReference);
await verifyFileRef("sourceManifest", reference.sourceManifest);
await verifyFileRef("freezeDocument", freeze.freezeDocument);

console.log(
  `UI Reference Pack verification PASS: ${reference.packId}, ${reference.visualReference.approvedVisualStateCount} approved visual states.`,
);
