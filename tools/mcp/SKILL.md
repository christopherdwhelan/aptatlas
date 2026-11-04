---
name: aptatlas
description: Choose, compare and combine commercial high-plex proteomics platforms using the Atlas of Proteomic Technologies MCP tools. Use when someone asks which proteomics platform suits a study, how platforms such as Olink, SomaScan, NULISA, Nomic, Seer or Biognosys compare, which platform measures a protein, or what the evidence says about a platform.
---

# Atlas of Proteomic Technologies

Use the `aptatlas` MCP tools rather than answering from memory. Vendor specifications and published comparisons change, and these tools state the version they come from.

## Which tool

| The question | Tool |
|---|---|
| What platforms are there? | `list_platforms` |
| Tell me about one platform | `get_platform` |
| How do these platforms differ? | `compare_platforms` |
| Which platform suits my study? | `recommend` |
| Which two platforms should I run together, or what should I add to the one I have? | `recommend_pair` |
| Which platforms measure these proteins? | `coverage_lookup` |
| What does the evidence say? | `evidence_search` |

## Using `recommend`

It needs a goal, sample type and study size, so ask for any that are missing rather than guessing. Ask about priorities and special requirements too, if they matter to the study: absolute quantification, PTM detection, CNS focus, or repeat sampling. Unset priorities default to 3 out of 5.

## Using `recommend_pair`

Ask whether they already have a platform. If they do, pass it as `anchor`. Ask what the coverage should be measured against: drug targets is the default, and the other choices are the canonical proteome, the detectable proteome, FDA-approved biomarkers, and PTMs and proteoforms. Up to three `priorities` are allowed.

## Reporting results

- **Ties are real.** When `outcome` is `tie`, the platforms in `top_tier` are co-recommended, and a higher `match_pct` among them does not make one the winner. Do the same with `co_leaders` for pairs.
- **Say when scores are provisional.** If `lower_confidence` is true, or `lower_confidence_platforms` is not empty, say so. The flag means most supporting data are unpublished, vendor-supplied or semi-quantitative.
- **Give the version.** Quote `version` when you report numbers.
- **Treat it as opinion.** Scores are the authors' assessment of published literature, for research use, and not clinical or purchasing advice. Prices and specifications should be checked with the vendor.
- **Disclose how scores were made if asked.** `scores_provenance` has the account, and it should be quoted rather than paraphrased.

## Citing evidence

- Cite claims with their `study.citation` and `study.doi`. Mention `vendor_authorship` and `disclosure` when they are present.
- Read `product_note`. A platform tag covers the whole product family, so a claim tagged `olink-explore-ht` may be about Explore 3072. Do not present that as a result for Explore HT.
- If `source.version` is `unverified`, say the value has not been confirmed against the published paper. If it is `preprint`, say so.

## Protein coverage

- `coverage_lookup` reports what each vendor's catalogue lists. It does not show that an assay performs well for that protein.
- For a protein with `found: false`, use neutral wording: it is not on any catalogue in the atlas, or the name was not recognised. Do not say a platform missed or failed to detect it.

## Limits

- Scores exist only for the six assessed platforms. Catalogue platforms have evaluation levels, not scores.
- Pathway coverage is a display figure in `recommend_pair`, and it never enters the composite score.
- The data are from one release. For the latest, see https://aptatlas.org/data.
