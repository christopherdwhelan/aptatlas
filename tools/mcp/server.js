#!/usr/bin/env node
// Atlas of Proteomic Technologies MCP server, over stdio. Runs offline from bundled data, at one pinned version.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import * as tools from './tools.js'

const PLATFORM_IDS = ['olink-explore-ht', 'illumina-protein-prep', 'nulisa', 'nomic-omni', 'seer-proteograph', 'biognosys-truediscovery']
const TOPICS = ['study_design', 'precision', 'correlation', 'pqtl', 'specificity', 'sensitivity', 'coverage', 'stability', 'disease_association', 'ancestry', 'throughput', 'cost', 'quantification', 'cns', 'catalogue_source']
const slider = z.number().int().min(1).max(5)

const server = new McpServer({ name: 'aptatlas-mcp', version: tools.list_platforms().version })
const add = (name, description, inputSchema) => server.registerTool(
  name,
  { description, inputSchema, annotations: { readOnlyHint: true, openWorldHint: false } },
  async args => {
    const result = tools[name](args)
    return { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result, isError: !!result.error }
  },
)

add('list_platforms', 'List the six assessed platforms, the wider catalogue, or both.', {
  scope: z.enum(['assessed', 'catalogue', 'all']).optional(),
})
add('get_platform', 'Get one platform: an assessed platform by id, with its scores, or a catalogue platform by name.', {
  id: z.string().min(1),
})
add('compare_platforms', 'Compare two or more assessed platforms across the ten scored dimensions.', {
  ids: z.array(z.enum(PLATFORM_IDS)).min(2).max(6),
})
add('recommend', 'Rank the six assessed platforms for a study, using the same inputs and scoring as Help Me Choose. Platforms within the tie band of the leader are co-recommended, not ranked against each other.', {
  primaryGoal: z.enum(['drug_target', 'discovery', 'disease_char', 'validation', 'pharmacoproteomics', 'population']),
  sampleType: z.enum(['plasma', 'serum', 'csf', 'tissue', 'cell_culture', 'multiple']),
  studySize: z.enum(['small', 'medium', 'large', 'xlarge']).describe('small <100, medium 100 to 1,000, large 1,000 to 10,000, xlarge >10,000 samples'),
  weights: z.object({ cost: slider, coverage: slider, precision: slider, specificity: slider, sensitivity: slider, throughput: slider, pqtl: slider }).partial().optional().describe('Priorities from 1 to 5. Each defaults to 3.'),
  toggles: z.object({
    absoluteQuant: z.enum(['yes', 'nice', 'no']),
    ptmDetection: z.enum(['no', 'incidental', 'systematic']),
    cnsFocus: z.enum(['yes', 'no']),
    longitudinal: z.enum(['yes', 'no']),
  }).partial().optional(),
  proteinTargets: z.array(z.string()).optional().describe('Gene symbols to cover'),
  pathwayId: z.string().optional().describe('A Reactome pathway id. As on the site, this replaces proteinTargets.'),
})
add('recommend_pair', 'Rank platform pairs, using the same inputs and scoring as Help Me Combine. Give an anchor to rank partners for a platform you already use.', {
  coverageMode: z.enum(['drug_targets', 'proteome_canonical', 'proteome_atlas_union', 'fda_biomarkers', 'ptm_proteoforms']).optional(),
  anchor: z.string().optional().describe('An assessed platform id or display name'),
  priorities: z.array(z.enum(['coverage', 'complementarity', 'precision', 'specificity', 'sensitivity', 'quantification', 'pqtl', 'throughput', 'cost', 'volume', 'tissue'])).max(3).optional(),
  axisWeights: z.record(z.string(), z.number().min(0).max(6)).optional().describe('Overrides, as with the site\'s advanced sliders'),
  qualityWeights: z.record(z.string(), z.number().min(0).max(3)).optional(),
  pathwayId: z.string().optional().describe('Adds pathway coverage as a display figure; it never enters the composite'),
  sortByPathway: z.boolean().optional(),
})
add('coverage_lookup', 'Find which assessed platforms list each gene symbol or UniProt accession.', {
  queries: z.array(z.string().min(1)).min(1).max(5000),
})
add('evidence_search', 'Search the evidence base by platform, topic or text. Returns claims with DOIs, source locations and a product note where the claim names a version.', {
  platform: z.enum([...PLATFORM_IDS, 'other-ms']).optional(),
  topic: z.enum(TOPICS).optional(),
  query: z.string().optional(),
  studyId: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
})

await server.connect(new StdioServerTransport())
