// What /data publishes. No data imports, so the build script, the prerender step and the /data page
// can all read it. scripts/build-data.js wraps each source file and writes it at build time.
export const LICENCE = 'CC-BY-4.0'
export const LICENCE_URL = 'https://creativecommons.org/licenses/by/4.0/'
export const CITATION = 'Whelan CD, Smith-Byrne K. Atlas of Proteomic Technologies: an evidence-based framework for selecting and combining commercial proteomics platforms. bioRxiv 2026. https://doi.org/10.64898/2026.09.10.750723'
export const ARCHIVE_DOI = '10.5281/zenodo.22697191'

// Who made the scores, in the words Methods uses. Published with scoring.json and on the /data page.
export const SCORING_PROVENANCE = 'Claude drafted the first scores, and the authors scored the platforms before opening that draft, then compared the two sets and adjudicated. Every score change, before and since release, was decided by Whelan and Smith-Byrne; Claude made edits only on their instruction. The prompt file generated in the same session as the draft also told the build to adjust scores so that platform totals fell between 28 and 33; the authors did not set this range or use platform totals when scoring or adjudicating.'

// How the Help Me Combine class_balance axis is computed. Published with scoring.json and on the /data page.
export const CLASS_BALANCE_PROVENANCE = 'class_balance, a Help Me Combine axis, is not one of the ten scored dimensions. It is computed, not assigned: the normalised Shannon entropy of the target classes among the drug targets a pair covers, using nine ChEMBL/UniProt classes with Unclassified excluded, divided by ln(9). It is therefore derived from the ChEMBL drug-target list. The per-protein list is not published here, so the values can be checked but not regenerated from these files alone.'

const CHEMBL = {
  name: 'ChEMBL',
  licence: 'CC-BY-SA-3.0',
  url: 'https://www.ebi.ac.uk/chembl/',
  relationship: 'derived',
  note: 'The listed fields are derived from ChEMBL (CC BY-SA 3.0): they are counts and percentages computed against a ChEMBL drug-target list. The per-protein list itself is not published here.',
}
const UNIPROT = { name: 'UniProt', licence: 'CC-BY-4.0', url: 'https://www.uniprot.org/', relationship: 'source', note: 'Accessions, gene symbols and protein names.' }
const REACTOME = { name: 'Reactome', licence: 'CC0-1.0', url: 'https://reactome.org/license', relationship: 'source', note: 'Pathway membership.' }

export const DATA_FILES = [
  { name: 'platforms', format: 'json', title: 'Assessed platforms', desc: 'Specifications, strengths and limitations for the six assessed platforms.', third_party: [] },
  { name: 'all_platforms', format: 'json', title: 'Platform catalogue', desc: 'The 46-platform catalogue, with evaluation level and integration readiness.', third_party: [] },
  { name: 'scoring', format: 'json', title: 'Scores', desc: 'The ten scored dimensions, each platform\'s scores, and which platforms are flagged lower confidence.', third_party: [] },
  { name: 'evidence', format: 'json', title: 'Evidence base', desc: 'Studies with their key findings as claim objects: text, platforms, topics, figures and source location.', third_party: [] },
  { name: 'evidence', format: 'csv', title: 'Evidence base, flat', desc: 'One row per key finding, with study, DOI, claim, figures, source location and platforms.', third_party: [] },
  {
    name: 'helpMeCombine', format: 'json', title: 'Help Me Combine data', desc: 'Per-platform and per-pair coverage, quality and cost values used by the pairing engine. Some fields are derived from ChEMBL (CC BY-SA 3.0); see third_party.',
    third_party: [{
      ...CHEMBL,
      fields: [
        '$.universe.drug_targets', '$.universe.drug_targets_on_a_platform', '$.universe.approved_phase4', '$.universe.chembl_fetch_date',
        "$.coverage_modes[?(@.key=='drug_targets')]", '$.platforms.*.coverage.drug_targets',
        '$.pairs[*].coverage_pct', '$.pairs[*].coverage_ci_lo', '$.pairs[*].coverage_ci_hi', '$.pairs[*].net_new_targets', '$.pairs[*].net_new_pct', '$.pairs[*].class_balance',
        '$.anchor_recommendations.*.anchor_solo_pct', '$.anchor_recommendations.*.tiered_partners[*].pair_coverage_pct',
        '$.anchor_recommendations.*.tiered_partners[*].net_new_targets', '$.anchor_recommendations.*.tiered_partners[*].coverage_gain_pp',
      ],
      fields_derived_in_part: [
        '$.pairs[*].composite', '$.pairs[*].pareto_nondominated', '$.pairs[*].top3_pct', '$.pairs[*].mean_regret', '$.pairs[*].win_pct_secondary', '$.pairs[*].tier',
        '$.anchor_recommendations.*.tiered_partners[*].composite', '$.anchor_recommendations.*.tiered_partners[*].top3_pct',
        '$.anchor_recommendations.*.tiered_partners[*].mean_regret', '$.anchor_recommendations.*.tiered_partners[*].pareto', '$.anchor_recommendations.*.tiered_partners[*].tier',
      ],
    }],
  },
  { name: 'coverage_counts', format: 'json', title: 'Coverage counts', desc: 'Distinct proteins overall and per platform, counted from the protein catalogue.', third_party: [UNIPROT] },
  { name: 'proteins', format: 'json', title: 'Protein catalogue', desc: 'Per-protein coverage: gene, UniProt accessions and the platforms that list each protein, compiled from vendor catalogues.', third_party: [UNIPROT] },
  { name: 'reactome_pathways', format: 'json', title: 'Reactome pathways', desc: 'Pathway names and members used by the pathway selector.', third_party: [REACTOME, UNIPROT] },
  { name: 'pathway_coverage', format: 'json', title: 'Pathway coverage', desc: 'Precomputed per-pathway coverage for each platform and pair.', third_party: [REACTOME] },
  { name: 'choose_engine_spec', format: 'json', title: 'Help Me Choose engine specification', desc: 'Every scoring constant the Help Me Choose engine uses.', third_party: [] },
  {
    name: 'combine_engine_spec', format: 'json', title: 'Help Me Combine engine specification', desc: 'Axes, weights and pair values the Help Me Combine engine uses. Some fields are derived from ChEMBL (CC BY-SA 3.0); see third_party.',
    third_party: [{ ...CHEMBL, fields: ['$.denominators.drug_targets', '$.platforms.*.coverage.drug_targets', '$.pairs[*].coverage_pct', '$.pairs[*].coverage_ci_lo', '$.pairs[*].coverage_ci_hi', '$.pairs[*].net_new_targets', '$.pairs[*].net_new_pct', '$.pairs[*].class_balance'] }],
  },
]

export const fileName = f => `${f.name}.${f.format}`
export const schemaName = f => (f.format === 'csv' ? `${f.name}.csv.schema.json` : `${f.name}.schema.json`)

export const DATA_CHANGELOG = [
  { version: 'v4.6', date: 'November 4, 2026', notes: 'First release of the data files and schemas, and of the aptatlas-mcp server.' },
]
