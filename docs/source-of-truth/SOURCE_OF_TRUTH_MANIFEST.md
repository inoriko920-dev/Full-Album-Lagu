# SOURCE OF TRUTH MANIFEST

This register ties the original conversation/workspace artifacts to the repository-readable compact copies used for AI continuity.

## Original artifacts and hashes

| Original artifact | Bytes | SHA-256 | Repository role |
|---|---:|---|---|
| 00_MASTER_PRODUCT_DEFINITION_LAGU_FULL_ALBUM.docx | 66681 | ea6b86929d233d5345b81de7d66ef786d3cf07a695a48a67381488ab343ebef8 | current planning compact copy |
| 01_STEP_00_PROJECT_INTAKE_LAGU_FULL_ALBUM_FINAL.docx | 47194 | 0953fe8c09fa1095f89a5ed1ab2b8cc1d81f30f8c3fdcc33b4c8d542c63adad4 | current planning compact copy |
| 02_STEP_01_PRODUCT_DEFINITION_BASELINE_LAGU_FULL_ALBUM_v1_1.docx | 81253 | fe983f7a2c7645227036f135036a6a6090829fee0cee4d28adfb48502d57906b | current planning compact copy |
| 03_STEP_02_EXISTING_SOLUTION_GITHUB_DISCOVERY_LAGU_FULL_ALBUM_v1_0.docx | 64643 | 5ab575b1ed41afe2867e1ee12a9bede73661c2daffd05f7feacc2da780faf472 | current planning compact copy |
| 04_STEP_03_UI_UX_INVENTORY_LAGU_FULL_ALBUM_v1_1_REVISED_GEMINI_AGENT.docx | 56570 | 97a06c8a6dfc744d89ec974f8d31afc3ad29099804aed44152b56043bc64727b | current planning compact copy |
| 05_STEP_04_UI_DESIGN_SYSTEM_PROMPT_PACK_LAGU_FULL_ALBUM_v1_1_REVISED_GEMINI_AGENT.docx | 64567 | eab5fe700acbc4a5006c81f4f6dc6783d86c695972ba52356d08d23dd78707d8 | current planning compact copy |
| 06_STEP_04_FINAL_UI_REFERENCE_LAGU_FULL_ALBUM_v1_1.docx | 38071478 | e790850e394e621fd7e8a16ccbedebb973e1ae84df44e09e16ade078e7b2e548 | full-resolution original; repo uses visual compact copy |
| 06_STEP_04_FINAL_UI_REFERENCE_LAGU_FULL_ALBUM_v1_1_REPO_COMPACT_SMALL.docx | 344911 | 0800373e64e19866e7b09b8964e3b701740c71b08de465a818fac0c7036d1885 | current repository visual reference; 29 embedded images |
| 07_STEP_05_UI_FREEZE_LAGU_FULL_ALBUM_v1_0.docx | 49928 | 65cc18349d8ada1a773d729a3cc18e69784272784e0b6a1579630a5dbf71ee4f | current planning compact copy |
| 08_STEP_06_ARCHITECTURE_TECHNOLOGY_DECISION_LAGU_FULL_ALBUM_v1_0.docx | 76605 | ce2fb5f758b14472d5c84e9138d8965c66e055cb2cda1cd80d0cfb9a5a7d9f80 | current planning compact copy |
| 09_STEP_07_CODE_CONSTITUTION_REPOSITORY_ARCHITECTURE_LAGU_FULL_ALBUM_v1_0.docx | 68730 | 4c3a25a823eb354a09a1c93050fc5574b9e712aa392bf7354039050bd4cde8fa | current planning compact copy |
| SOFTWARE_FACTORY_ASTRA_SOL_COMPLETE_FINAL_V2(1).zip | 1196213 | 7e75836fd291b9794481dc33d1e711ce358d706bb0c9228aa7780747c85edcd9 | source package for combined guide |
| SOFTWARE_FACTORY_V2_COMPLETE_GUIDE.txt | 418639 | 8ce786f467836671184e6e6bb546efc9041ef7713a9cb335effd95189056a9b6 | complete repository-readable guide |

## Important note
Repository compact planning DOCX files preserve the extracted planning content for handoff and are the operative repository copies. The UI visual compact DOCX is a binary copy generated from the approved UI reference and contains all 29 images; only embedded-image quality was reduced to keep the repository lightweight.

No compacting operation changes the locked product/UI/architecture decisions.


## Repository-created planning authorities and repairs

These files were created inside the repository after the original artifact import. They are intentionally separated from the **Original artifacts and hashes** table above.

| Repository artifact | Provenance | Repository role |
|---|---|---|
| `10_STEP_11_FEATURE_REGISTRY_DEPENDENCY_GRAPH_WAVE_01_CHARTER_LAGU_FULL_ALBUM_v1_0.docx` | **RECONSTRUCTED REPOSITORY COPY**. The previously referenced historical compact DOCX was missing from checkout. Rebuilt from current normalized Feature Registry + Dependency Graph with an explicit integrity notice. Not claimed byte-identical to the missing historical artifact. | mandatory STEP 11 registry/dependency handoff authority |
| `14_STEP_11_W11_05_MANUAL_LAYER_EDITOR_TEMPLATES_CHARTER_LAGU_FULL_ALBUM_v1_0.docx` | Created by ASTRA from the verified Product Definition, Product Baseline, frozen UI authority, architecture/constitution, W11-04 closure and normalized registry/dependency sources. | current W11-05 detailed planning source-of-truth |

The Git blob SHA of these repository-created DOCX files is authoritative for the committed repository snapshot; do not substitute an original-artifact hash for the reconstructed STEP 11 file.
