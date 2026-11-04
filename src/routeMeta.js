// The title, description and social tags for each page. Numbers come from the site's data.
import { pathForTab, NOT_FOUND_TAB } from './routes'
import { SITE_URL } from './siteConfig'
import {
  coverage, catalogueCount, assessedCount, scoredDimensionCount, proteinsOnNoPlatform,
  studyCount, independentHeadToHeadCount, foundationalCount,
} from './data/siteStats'

const SITE = 'Atlas of Proteomic Technologies'
const fmt = n => n.toLocaleString('en-US')
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen']
const word = n => WORDS[n] ?? String(n)
const platforms = word(assessedCount)
const pairCount = (assessedCount * (assessedCount - 1)) / 2

const META = {
  overview: {
    title: `${SITE} (APT) | Ignition Scientific`,
    description: 'An independent, evidence-based overview of commercial high-plex proteomics platforms, built to inform study design for scientists across industry and academia.',
  },
  platforms: {
    title: `All Platforms | ${SITE}`,
    description: `Evidence collated for ${catalogueCount} protein measurement platforms, with each one's level of evaluation, chemistry, depth and availability.`,
  },
  comparison: {
    title: `Platform Comparison | ${SITE}`,
    description: `Side-by-side comparison of ${platforms} commercial proteomics platforms across ${word(scoredDimensionCount)} scored dimensions.`,
  },
  proteins: {
    title: `Protein Coverage | ${SITE}`,
    description: `Search ${fmt(coverage.proteins)} distinct human proteins across ${platforms} platforms and see which platforms list each one.`,
  },
  unassayed: {
    title: `Unassayed Proteome | ${SITE}`,
    description: `The ${fmt(proteinsOnNoPlatform)} reviewed human proteins not on the catalogue of any of the ${platforms} platforms, with tissue detection, localisation and drug-target status.`,
  },
  chooser: {
    title: `Help Me Choose | ${SITE}`,
    description: `Answer questions about your study and priorities to get a ranked recommendation across ${platforms} proteomics platforms.`,
  },
  combine: {
    title: `Help Me Combine | ${SITE}`,
    description: `Find the best pair of proteomics platforms for your priorities, ranked across all ${word(pairCount)} combinations.`,
  },
  evidence: {
    title: `Evidence Base | ${SITE}`,
    description: `The ${studyCount} studies behind the atlas: ${independentHeadToHeadCount} independent head-to-head comparisons and ${foundationalCount} foundational papers, with sample sizes and key findings checked against each paper.`,
  },
  methods: {
    title: `Methods | ${SITE}`,
    description: 'How the platform scores were built, how the recommendation tools work and were tested, and the full version history.',
  },
  reproducibility: {
    title: `Reproducibility | ${SITE}`,
    description: 'Download the engine specifications, scripts and outputs behind the Help Me Choose and Help Me Combine figures.',
  },
  [NOT_FOUND_TAB]: {
    title: `Page not found | ${SITE}`,
    description: 'This address is not part of the Atlas of Proteomic Technologies.',
  },
}

const metaFor = tab => META[tab] ?? META[NOT_FOUND_TAB]
const urlFor = tab => (pathForTab(tab) === '/' ? `${SITE_URL}/` : `${SITE_URL}${pathForTab(tab)}`)
const esc = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

// The <head> tags written into each prerendered page.
export function headHtml(tab) {
  const { title, description } = metaFor(tab)
  const image = `${SITE_URL}/og-image.png`
  const tags = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
  ]
  if (tab === NOT_FOUND_TAB) return [...tags, '<meta name="robots" content="noindex" />'].join('\n    ')
  tags.push(
    `<link rel="canonical" href="${urlFor(tab)}" />`,
    '<meta property="og:type" content="website" />',
    `<meta property="og:site_name" content="${SITE}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${urlFor(tab)}" />`,
    `<meta property="og:image" content="${image}" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    `<meta property="og:image:alt" content="${SITE} (APT)" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    `<meta name="twitter:image" content="${image}" />`,
  )
  if (tab === 'overview') {
    const site = { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE, alternateName: 'APT', url: `${SITE_URL}/` }
    tags.push(`<script type="application/ld+json">${JSON.stringify(site)}</script>`)
  }
  return tags.join('\n    ')
}

// Keeps the document in step when moving between pages in the browser.
export function applyHead(tab) {
  const { title, description } = metaFor(tab)
  document.title = title
  const set = (selector, attr, value) => document.querySelector(selector)?.setAttribute(attr, value)
  set('meta[name="description"]', 'content', description)
  set('meta[property="og:title"]', 'content', title)
  set('meta[property="og:description"]', 'content', description)
  set('meta[name="twitter:title"]', 'content', title)
  set('meta[name="twitter:description"]', 'content', description)
  set('link[rel="canonical"]', 'href', urlFor(tab))
  set('meta[property="og:url"]', 'content', urlFor(tab))
}
