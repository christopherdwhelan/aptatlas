import { useState } from 'react'
import SectionLayout from './SectionLayout'
import scoring from '../data/scoring.json'

function ContactButton({ email }) {
  const [copied, setCopied] = useState(false)
  function handleClick(e) {
    // Try mailto first; if it bounces back (can't detect), also copy to clipboard
    window.location.href = `mailto:${email}`
    navigator.clipboard?.writeText(email).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }
  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm transition-all hover:opacity-90"
      style={{ background: '#8B1A1A', color: '#fff', fontWeight: 400 }}
    >
      {copied ? '✓ Copied to clipboard' : email}
    </button>
  )
}

const DIMENSION_DETAIL = {
  proteome_coverage: {
    basis: 'evidence',
    note: 'Based on vendor-reported assay counts and published panel comparisons. Reflects the number of unique protein targets with validated assays. Scores follow a protein-count rubric: <1,000 proteins = 1/5; 1,000–3,000 = 2/5; 3,000–5,000 = 3/5; 5,000–7,000 = 4/5; >7,000 = 5/5. Applied to evaluated platforms: Nomic nELISA (~1,100 proteins) = 2/5; Olink Explore HT (~5,400 proteins) = 4/5; Biognosys TrueDiscovery (~4,200 proteins in plasma, up to ~13,800 in tissue) = 4/5 as a cross-matrix middle estimate.',
  },
  precision: {
    basis: 'evidence',
    note: 'Based on median CV reported in Kirsher/Ahadi et al. (2025) Alkahest benchmarking study, the most comprehensive head-to-head precision comparison to date.',
  },
  specificity: {
    basis: 'evidence',
    note: 'Based on cis-pQTL enrichment rates from Eldjarn et al. (2023) and cross-platform correlation studies. Dual-antibody and pre-colocalized antibody platforms score highest. SomaSeq scores 2/5, reflecting the lowest cis-pQTL support (~43%) of any evaluated platform and elevated single-aptamer epitope-binding artifact risk. A score of 2/5 (rather than 1/5) reflects that SomaSeq detects real protein signals; the 1/5 score was revised upward to avoid an artefactual priority-miss penalty that suppressed SomaSeq recommendations in broad discovery scenarios where specificity is not the limiting factor. Two caveats apply symmetrically: a cis-pQTL can itself arise from an epitope effect, in which the variant alters reagent binding rather than protein abundance, so cis-pQTL support is an imperfect specificity proxy on any affinity platform; and mass-spectrometry proteogenomics has confirmed correct targeting for a subset of affinity assays, indicating the issue is assay-specific rather than uniform.',
  },
  sensitivity: {
    basis: 'mixed',
    note: 'Evidence-based for established platforms (LOD comparisons, below-LOD rates in plasma). Based on Kirsher/Ahadi et al. (2025): SomaSeq scores 4/5, reflecting 96.2% of proteins detected across all samples and 97% of assays within linear range: broad consistent detection comparable to Olink. Note that aptamer cross-reactivity means some SomaScan signal may reflect off-target binding rather than genuine protein detection; the 2/5 specificity score captures this separately. Nomic nELISA scores 3/5: as a sandwich ELISA format, it does not benefit from the signal amplification of Olink\'s proximity extension assay (PEA), and there is insufficient published head-to-head LOD evidence to justify a score of 4/5 at this time. Expert assessment for other newer platforms with limited published LOD data.',
  },
  cost_efficiency: {
    basis: 'mixed',
    note: 'Scores are commercial price bands for the standard discovery service at volume (orders of roughly 1,000 samples or more), drawn from 2024 to 2026 quotations and published rates: 5 = under about $75 per sample; 4 = about $75 to $250; 3 = about $250 to $1,000; 2 = about $1,000 to $3,000; 1 = above about $3,000. The bands are approximately logarithmic, and their edges sit between observed service prices rather than at exact thresholds, so a platform\'s band does not change if an edge shifts within the gap around it. Smaller batches price higher on every platform, and population-scale consortium pricing is excluded because it is not available to individual studies. Cost structures evolve; consult vendors for study-specific quotes.',
  },
  throughput: {
    basis: 'mixed',
    note: 'Based on vendor-reported sample throughput and published workflow descriptions. Reflects steady-state capacity, not maximum theoretical throughput.',
  },
  quantification_type: {
    basis: 'evidence',
    note: 'Classifies the type of quantification each scored (standard discovery) product reports. 4 = physical concentration in mass units (ELISA-calibrated pg/mL against recombinant standard curves): Nomic nELISA, the only scored product reporting absolute concentrations. 3 = proteome-wide comparable relative quantification, i.e. label-free MS intensity, on a common scale that supports cross-protein abundance comparison (iBAQ / Total Protein Approach) but is not a physical concentration: Seer Proteograph XT and Biognosys TrueDiscovery. 2 = within-assay relative units only, not comparable across targets (Olink NPX, SomaScan RFU / SomaSeq read counts, NULISA NPQ): Olink, SomaSeq, Alamar NULISA. A score of 5 would require MS absolute quantification with isotope-labelled internal standards (SIS peptides), which no scored panel provides as standard. Note that several vendors offer absolute quantification (pg/mL) via separate products not scored here: Olink (Flex / Target 48 panels with per-assay calibrators), Alamar (NULISAseq AQ panels), and Biognosys (TrueSignature targeted MS).',
  },
  sample_flexibility: {
    basis: 'mixed',
    note: 'Reflects the breadth of sample matrices with published validation, not merely claimed compatibility. Biognosys TrueDiscovery scores 5: mass-spectrometry digestion is matrix-agnostic and yields label-free intensities on a common scale, so a single workflow is validated across plasma, serum, CSF, solid tissue and cell lysate. Seer Proteograph XT scores 3 despite also being MS: its nanoparticle enrichment requires liquid input, so the scored XT product covers biofluids only (solid tissue requires the separate Proteograph DIRECT product). The affinity platforms (Olink, SomaSeq, NULISA) score 3: their deep published validation is concentrated in plasma, serum and CSF. SomaScan/SomaSeq offers the broadest sample-matrix kit range of any affinity platform (plasma, serum, urine, CSF, tissue homogenate, cell lysate), but aptamer signal is matrix-dependent and is not comparable across matrices, so each matrix is validated in isolation rather than as a unified cross-matrix workflow; kit availability is not the same as published cross-matrix validation depth, and the bulk of published SomaScan evidence remains plasma/serum. A higher score would also overstate its fit in matrices where it is not the established choice (e.g. cell-culture secretome, led by Nomic). Nomic nELISA scores 2: its published validation is concentrated in cell-culture/secretome, with emerging blood data and no solid-tissue validation.',
  },
  evidence_depth: {
    basis: 'evidence',
    note: 'Reflects the volume and quality of published head-to-head comparative studies at time of last update. Platforms with UKB-PPP or ARIC cohort data score highest.',
  },
  pqtl_accuracy: {
    basis: 'mixed',
    note: 'Scores reflect demonstrated performance in published pQTL studies, not theoretical capability. MS-based platforms are theoretically free of epitope-binding artifacts, but scores are assigned based on the volume and consistency of published pQTL validation data available at the time of this release. Antibody and aptamer-based platforms are both susceptible to epitope-binding artifacts; Olink\'s dual-antibody PEA design may reduce single-epitope artifact risk but does not eliminate it. SomaSeq scores 2/5: aptamer-based assays are susceptible to binding QTLs (genetic variants affecting aptamer affinity rather than true protein abundance), which reduces confidence in pQTL signal interpretation relative to antibody-based platforms. NULISA scores 3/5, reflecting limited published pQTL validation data despite strong assay specificity; this score should be interpreted cautiously for genetics-first study designs. Biognosys TrueDiscovery also scores 3/5 despite being MS-based, reflecting the near-absence of published pQTL studies using that platform to date; its score may be revised upward as the field accumulates MS-based pQTL data.',
  },
}

const BASIS_BADGE = {
  evidence: { label: 'Evidence-based',     bg: 'rgba(139,26,26,0.08)', color: '#8B1A1A' },
  expert:   { label: 'Expert assessment',  bg: 'rgba(215,119,6,0.08)',  color: '#d97706' },
  mixed:    { label: 'Mixed',              bg: 'rgba(107,91,149,0.1)',  color: '#6b5b95' },
}

function SectionCard({ children, id }) {
  return (
    <div id={id} className="bg-white px-7 py-6 mb-5" style={{
      border: '1px solid #e5e4e2',
      borderTop: '2px solid #141310',
      scrollMarginTop: 64,
    }}>
      {children}
    </div>
  )
}

function SectionHeading({ children }) {
  return (
    <h2 className="text-base mb-4" style={{ color: '#141310', fontWeight: 400 }}>{children}</h2>
  )
}

function BracketCard({ children, id }) {
  return (
    <div id={id} className="px-6 py-5 mb-5" style={{
      background: 'rgba(139,26,26,0.04)',
      borderLeft: '4px solid #8B1A1A',
      scrollMarginTop: 64,
    }}>
      {children}
    </div>
  )
}

function DisclosureItem({ children }) {
  return (
    <div className="flex items-start gap-3 py-3" style={{ borderBottom: '1px solid #f3f2f0' }}>
      <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs"
        style={{ background: 'rgba(215,119,6,0.1)', color: '#d97706', fontWeight: 500 }}>!</span>
      <p className="text-sm leading-relaxed" style={{ color: '#52504a', fontWeight: 400 }}>{children}</p>
    </div>
  )
}

function MethodsFlowchart({ id }) {
  const steps = [
    {
      num: 1,
      title: 'Curate evidence base',
      desc: '9 large-scale head-to-head comparison studies collected, covering the majority of evaluated platforms across plasma, serum, CSF, and other matrices.',
      color: '#0891B2',
    },
    {
      num: 2,
      title: 'LLM-assisted initial score extraction',
      desc: 'Claude (Anthropic) reviewed each study and extracted structured initial scores across 10 analytical dimensions, with reasoning documented for each platform and score.',
      color: '#6b5b95',
    },
    {
      num: 3,
      title: 'Expert review & calibration',
      desc: 'Scores reviewed and manually revised by Whelan & Smith-Byrne against primary literature. Scientific justification documented for every score. Fairness simulation run across 1M+ weight combinations to identify and correct structural biases in the recommendation engine.',
      color: '#8B1A1A',
      isLoopTarget: true,
    },
    {
      num: 4,
      title: 'Public soft launch',
      desc: 'Recommendation engine and scoring framework published online. Researchers invited to complete the tool and submit feedback via embedded survey.',
      color: '#1B8A4E',
    },
    {
      num: 5,
      title: 'Real-world validation & revision',
      desc: 'Responses collected from N≈50 researchers across academic, clinical, and industry settings. Recommendations reviewed; scores and algorithm revised where real-world usage revealed divergence from simulated expectations.',
      color: '#d97706',
      isLoopSource: true,
    },
  ]

  return (
    <SectionCard id={id}>
      <SectionHeading>How This Tool Was Built</SectionHeading>
      <p className="text-sm leading-relaxed mb-6" style={{ color: '#52504a', fontWeight: 400 }}>
        The scoring framework and recommendation engine were developed iteratively, combining published evidence, expert judgement, and real-world researcher feedback.
      </p>
      <div>
        {steps.map((step, i) => (
          <div key={step.num} className="flex items-start gap-4">
            {/* Left column: number + connector line */}
            <div className="flex flex-col items-center flex-shrink-0" style={{ width: 32 }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: step.color, color: '#fff', fontWeight: 500, fontSize: 13 }}>
                {step.num}
              </div>
              {i < steps.length - 1 && (
                <div style={{ width: 2, flexGrow: 1, minHeight: 28, background: '#e5e4e2', marginTop: 4 }} />
              )}
            </div>
            {/* Right column: content */}
            <div className={i < steps.length - 1 ? 'pb-5' : 'pb-1'} style={{ flex: 1 }}>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <p className="text-sm" style={{ color: '#141310', fontWeight: 500 }}>{step.title}</p>
                {step.isLoopTarget && (
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(139,26,26,0.08)', color: '#8B1A1A', fontWeight: 400 }}>
                    ↩ iterative revision returns here
                  </span>
                )}
              </div>
              <p className="text-xs leading-relaxed" style={{ color: '#52504a', fontWeight: 400 }}>{step.desc}</p>
              {step.isLoopSource && (
                <div className="mt-3 px-4 py-3 text-xs"
                  style={{ background: 'rgba(139,26,26,0.04)', borderLeft: '3px solid #8B1A1A', color: '#52504a', fontWeight: 400 }}>
                  <strong style={{ color: '#8B1A1A', fontWeight: 500 }}>Ongoing: </strong>
                  Steps 3–5 repeat as new comparative studies are published and additional researcher feedback is collected. Each revision cycle is documented in the version history below.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

const METHODS_SECTIONS = [
  { id: 'about', label: 'About This Tool' },
  { id: 'how-built', label: 'How This Tool Was Built' },
  { id: 'scoring', label: 'Platform Scoring Methodology' },
  { id: 'platform-catalog', label: 'Platform Catalog & Readiness' },
  { id: 'evidence-curation', label: 'Evidence Curation' },
  { id: 'fairness', label: 'Recommendation Engine & Fairness Testing' },
  { id: 'combine-engine', label: 'Platform Combination Engine' },
  { id: 'pathway', label: 'Pathway Selector' },
  { id: 'limitations', label: 'Limitations & Disclosures' },
  { id: 'version-history', label: 'Version History' },
]

export default function Methods() {
  const [showAllVersions, setShowAllVersions] = useState(false)
  return (
    <SectionLayout sections={METHODS_SECTIONS}>

      {/* 1 - About This Tool */}
      <BracketCard id="about">
        <p className="text-xs uppercase tracking-widest mb-2" style={{ color: '#8B1A1A', fontSize: 10, letterSpacing: '0.08em', fontWeight: 400 }}>
          About This Tool
        </p>
        <p className="text-sm leading-relaxed" style={{ color: '#52504a', fontWeight: 400 }}>
          The <strong style={{ fontWeight: 500 }}>Atlas of Proteomic Technologies (APT)</strong> is built and maintained by{' '}
          <a href="https://ignitionscientific.com" className="hover:underline" style={{ color: '#C44D18', fontWeight: 400 }}>
            Ignition Scientific
          </a>{' '}
          to help researchers select the right proteomics platform for their study. It synthesizes published
          head-to-head comparison data with expert assessment of platform capabilities from scientists at
          Oxford University and the Royal College of Surgeons in Ireland. The tool is updated monthly to
          reflect new evidence and platform changes. Scores and recommendations reflect the authors'
          assessment based on published literature and are intended to guide study design decisions, not to
          serve as definitive or commercial platform rankings.
        </p>
      </BracketCard>

      {/* 1a - How to Cite */}
      <div className="px-6 py-5 mb-5" style={{ background: 'rgba(8,145,178,0.05)', borderLeft: '4px solid #0891B2' }}>
        <p className="text-xs uppercase tracking-widest mb-2" style={{ color: '#0891B2', fontSize: 10, letterSpacing: '0.08em', fontWeight: 400 }}>
          How to Cite
        </p>
        <p className="text-sm leading-relaxed mb-3" style={{ color: '#52504a', fontWeight: 400 }}>
          If you use this tool to inform a study design or publication, please cite the accompanying preprint:
        </p>
        <div className="px-4 py-3 text-sm leading-relaxed font-mono" style={{ background: 'rgba(8,145,178,0.06)', border: '1px solid rgba(8,145,178,0.2)', color: '#52504a', fontWeight: 400 }}>
          Whelan, Christopher D. &amp; Smith-Byrne, K. (2026). Atlas of Proteomic Technologies: an evidence-based framework for selecting and combining commercial proteomics platforms. <em>bioRxiv</em>.{' '}
          <a href="https://doi.org/10.64898/2026.09.10.750723" target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: '#C44D18' }}>
            https://doi.org/10.64898/2026.09.10.750723
          </a>
        </div>
        <p className="text-xs mt-3 leading-relaxed" style={{ color: '#6f6d67', fontWeight: 400 }}>
          This preprint has not yet been peer reviewed; the citation will be updated when a peer-reviewed version is available.
        </p>
      </div>

      {/* 1b - Development process flowchart */}
      <MethodsFlowchart id="how-built" />

      {/* 1c - Starting point disclaimer */}
      <div className="px-6 py-5 mb-5" style={{ background: 'rgba(215,119,6,0.05)', borderLeft: '4px solid #d97706' }}>
        <p className="text-xs uppercase tracking-widest mb-2" style={{ color: '#d97706', fontSize: 10, letterSpacing: '0.08em', fontWeight: 500 }}>
          This tool is a starting point, not a final verdict
        </p>
        <p className="text-sm leading-relaxed" style={{ color: '#52504a', fontWeight: 400 }}>
          Scores and recommendations are based on published evidence and expert assessment at the time of release. Before committing to a platform, <strong style={{ fontWeight: 500 }}>consult directly with each vendor's scientific and commercial teams</strong>, request a pilot study where possible, and review the primary literature for your specific sample type and research question. Platform performance varies substantially by study design, sample handling, and protein targets of interest.
        </p>
      </div>

      {/* 1d - Scores are relative, not absolute */}
      <div className="px-6 py-5 mb-5" style={{ background: 'rgba(20,19,16,0.03)', borderLeft: '4px solid #141310' }}>
        <p className="text-xs uppercase tracking-widest mb-2" style={{ color: '#141310', fontSize: 10, letterSpacing: '0.08em', fontWeight: 500 }}>
          Scores are relative, not absolute
        </p>
        <p className="text-sm leading-relaxed mb-3" style={{ color: '#52504a', fontWeight: 400 }}>
          APT scores reflect each platform's <strong style={{ fontWeight: 500 }}>standing within the current evaluated set</strong>, not a verdict on any platform's absolute quality. A score of 3/5 does not mean a platform is mediocre; it means that, on that dimension, other platforms in this comparison currently perform better or worse. All six evaluated platforms are commercially viable, actively used in peer-reviewed research, and appropriate choices for the right study design.
        </p>
        <p className="text-sm leading-relaxed" style={{ color: '#52504a', fontWeight: 400 }}>
          Scores are <strong style={{ fontWeight: 500 }}>updated as evidence accumulates.</strong> Platforms with limited published validation data are scored conservatively; scores will be revised, in either direction, as independent head-to-head studies emerge. The version history below documents every score change and its scientific basis. If you believe a score is inconsistent with the published evidence, contact us.
        </p>
      </div>

      {/* 1e - Independence, trademarks, and terms of use */}
      <div className="px-6 py-5 mb-5" style={{ background: 'rgba(124,134,168,0.06)', borderLeft: '4px solid #7C86A8' }}>
        <p className="text-xs uppercase tracking-widest mb-2" style={{ color: '#4A5373', fontSize: 10, letterSpacing: '0.08em', fontWeight: 500 }}>
          Independence, trademarks, and terms of use
        </p>
        <p className="text-sm leading-relaxed mb-3" style={{ color: '#52504a', fontWeight: 400 }}>
          The Atlas of Proteomic Technologies is an independent, educational resource provided free of charge. It is not sponsored by, affiliated with, or endorsed by any platform or vendor named, and Ignition Scientific has no financial relationship with the companies whose products are compared. Scores and recommendations are the authors' good-faith interpretation of publicly available data and expert judgment as of the date shown; they are offered as opinion, not statements of fact, and are not definitive or commercial rankings, nor procurement, legal, or investment advice.
        </p>
        <p className="text-sm leading-relaxed" style={{ color: '#52504a', fontWeight: 400 }}>
          Product and company names (including Olink, SomaScan, SomaSeq, Alamar NULISA, Nomic nELISA, Seer Proteograph, and Biognosys TrueDiscovery) are trademarks of their respective owners and are used here for identification and comparison only. The tool is provided "as is," without warranty of any kind; verify all specifications and pricing with the vendor before making purchasing decisions. If you believe any statement is inaccurate or out of date, email{' '}
          <a href="mailto:chris@ignitionscientific.com" className="hover:underline" style={{ color: '#8B1A1A', fontWeight: 400 }}>chris@ignitionscientific.com</a>{' '}and we will review and correct it promptly.
        </p>
      </div>

      {/* 2 - Author Contributions */}
      <div className="px-6 py-5 mb-5" style={{ background: 'rgba(107,91,149,0.05)', borderLeft: '4px solid #6b5b95' }}>
        <p className="text-xs uppercase tracking-widest mb-2" style={{ color: '#6b5b95', fontSize: 10, letterSpacing: '0.08em', fontWeight: 400 }}>
          Author Contributions
        </p>
        <p className="text-sm leading-relaxed" style={{ color: '#52504a', fontWeight: 400 }}>
          <a href="https://scholar.google.com/citations?user=t56JLZIAAAAJ&hl=en" target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: '#141310', fontWeight: 500 }}>Christopher D. Whelan</a> conceived and developed the Atlas of Proteomic Technologies, including the scoring framework, recommendation engine, evidence curation, and web application. <a href="https://scholar.google.com/citations?user=7f1YjGgAAAAJ&hl=en" target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: '#141310', fontWeight: 500 }}>Karl Smith-Byrne</a> provided scientific oversight and critical review of the scoring methodology. C.D.W. and K.S-B. contacted their respective industry and academic networks to gather early feedback and to inform future iterations of the tool.
        </p>
      </div>

      {/* 3 - Scoring Methodology */}
      <SectionCard id="scoring">
        <SectionHeading>Platform Scoring Methodology</SectionHeading>
        <p className="text-sm mb-5 leading-relaxed" style={{ color: '#52504a', fontWeight: 400 }}>
          Each platform is scored on 10 dimensions using a 1–5 scale. Scores reflect a combination of
          published evidence and expert assessment. The basis for each dimension is indicated below.
          Scores are reviewed and updated as new comparative data is published.
        </p>

        <div className="flex flex-wrap gap-3 mb-5">
          {Object.entries(BASIS_BADGE).map(([k, b]) => (
            <span key={k} className="inline-flex items-center gap-1.5 text-xs rounded-full px-3 py-1"
              style={{ background: b.bg, color: b.color, fontWeight: 400 }}>
              {b.label}
            </span>
          ))}
        </div>

        <div className="space-y-0">
          {scoring.dimensions.map((dim, i) => {
            const detail = DIMENSION_DETAIL[dim.id]
            const badge  = BASIS_BADGE[detail?.basis || 'expert']
            return (
              <div
                key={dim.id}
                className="py-4"
                style={{ borderBottom: i < scoring.dimensions.length - 1 ? '1px solid #f3f2f0' : 'none' }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm" style={{ color: '#141310', fontWeight: 500 }}>{dim.label}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: badge.bg, color: badge.color, fontWeight: 400 }}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-xs mb-1" style={{ color: '#6f6d67', fontWeight: 400 }}>{dim.description}</p>
                    <p className="text-xs leading-relaxed" style={{ color: '#52504a', fontWeight: 400 }}>{detail?.note}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(n => (
                        <div key={n} className="w-2 h-5"
                          style={{ background: n <= 3 ? '#8B1A1A' : '#e5e4e2' }} />
                      ))}
                    </div>
                    <p className="text-xs mt-1" style={{ color: '#6f6d67', fontWeight: 400 }}>1–5 scale</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </SectionCard>

      {/* Platform catalog & integration-readiness (All Platforms tab) */}
      <SectionCard id="platform-catalog">
        <SectionHeading>Platform Catalog and Integration-Readiness</SectionHeading>
        <p className="text-sm leading-relaxed mb-4" style={{ color: '#52504a', fontWeight: 400 }}>
          The All Platforms tab situates the six scored platforms within the broader landscape. It catalogs the
          protein measurement platforms known to us at the time of writing, where a platform measures proteins as its
          primary readout by any modality (affinity or aptamer multiplex, immunoassay, mass spectrometry, or
          single-molecule protein sequencing) and is a distinct commercial or pre-commercial offering. It excludes
          extracellular-vesicle and particle-enrichment chemistries, spatial and tissue-imaging platforms, and
          non-proteomic comparators such as seed-amplification assays. Each entry records an explicit availability
          status, so superseded products (for example Olink Explore 3072) are documented with their successor rather
          than dropped.
        </p>
        <p className="text-sm leading-relaxed mb-4" style={{ color: '#52504a', fontWeight: 400 }}>
          Entries are one of three kinds. Services and assays are the unit a laboratory procures, and are the only
          entities ranked. Instrument lines (for example Orbitrap Astral, Bruker timsTOF) are shown as the enabling
          hardware that services run on, and sample-preparation chemistries are shown the same way. Because a service
          such as Seer Proteograph or Biognosys TrueDiscovery is defined by the mass spectrometer it runs on, ranking
          the instrument separately would double-count the same measurement; instruments and chemistries therefore sit
          in an enabling layer, and each service records the instrument it uses.
        </p>
        <p className="text-sm leading-relaxed mb-4" style={{ color: '#52504a', fontWeight: 400 }}>
          Platforms are scored only where the evidence supports it, at three levels. Platforms characterisable on all
          ten comparison axes receive the full score and form the integrated tier; a targeted or configurable panel with no
          fixed large content list, including any assay measuring fewer than 100 proteins, is treated as a targeted
          panel: not eligible for the integrated tier and not ranked on integration-readiness, regardless of how well it
          is otherwise characterised, since a platform that is not a candidate for integration has no meaningful position
          on a readiness-toward-integration scale. Such panels are catalogued as a separate group. Other deployable
          platforms whose measurement chemistry carries independent, peer-reviewed validation receive a lighter
          integration-readiness score and are ranked. Pre-commercial platforms and those without independent validation are catalogued as
          emerging, with no readiness score and no rank, since a number would imply a discrimination the evidence
          cannot support. An independence gate governs the readiness score: vendor posters, press releases, and
          specification sheets do not qualify. Under this gate a newly launched platform whose only evidence was a
          vendor conference poster (ProteinXI) is catalogued as emerging despite its fixed assay list, while platforms
          built on independently validated chemistries are scored even where a specific product's performance figures
          are vendor-stated.
        </p>
        <p className="text-sm leading-relaxed" style={{ color: '#52504a', fontWeight: 400 }}>
          The integration-readiness index combines three components reported for every entry: an integration tier
          (whether the platform exposes a fixed published per-protein list, a defined or configurable panel, or no fixed
          analyte list), commercial maturity on a four-level ladder, and validation depth indexed to independent
          peer-reviewed use in human cohorts. The composite is 0.5 x maturity plus 0.3 x validation plus 0.2 x (4 minus
          tier), with maturity and validation scored 0 to 3 and tier numbered 1 to 3, rounded to the nearest 0.25. It
          separates kind from rung: a mature open-discovery mass-spectrometry platform is labelled a reference method,
          not penalised as immature. Integrated platforms are held to the same evidence standard; where a headline
          specification is vendor-stated, such as the roughly 1,000-plex coverage of the Nomic Omni 1000 whose
          independent validation extends to about 191-plex, that is reflected in a low evidence-depth score rather than
          exempted. The catalog comprises 46 platforms: six are APT-assessed on all ten axes (eight catalog rows, since the SomaScan
          lineage spans array and NGS readouts and NULISA spans two integrated panels); nine carry an
          integration-readiness score as candidates for a future version; eight are targeted panels; eight are early or
          pre-commercial technologies; two are retired; and eleven are enabling instrument lines or sample-preparation chemistries. Thirty-eight are currently deployable,
          verified against vendor sources for 2026, including the consolidation of the SomaScan menu onto Illumina
          SomaScan Discovery (array) and Illumina SomaSeq Discovery (NGS) after Illumina's acquisition of SomaLogic.
        </p>
      </SectionCard>

      {/* 3 - Evidence Curation */}
      <SectionCard id="evidence-curation">
        <SectionHeading>Evidence Curation</SectionHeading>
        <p className="text-sm leading-relaxed mb-4" style={{ color: '#52504a', fontWeight: 400 }}>
          Studies are included in the Evidence Base if they meet the following criteria:
        </p>
        <ul className="space-y-2 mb-4">
          {[
            'Peer-reviewed publication or preprint from a recognized repository (bioRxiv, medRxiv)',
            'Head-to-head comparison of two or more proteomics platforms on the same biological samples',
            'Quantitative comparison of at least one analytical metric (CV, correlation, pQTL enrichment, or disease association)',
            'Plasma, serum, or other biofluid sample type (tissue-only studies excluded from primary curation)',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm leading-snug" style={{ color: '#52504a', fontWeight: 400 }}>
              <span className="mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#8B1A1A', marginTop: 6 }} />
              {item}
            </li>
          ))}
        </ul>
        <div className="px-4 py-3 text-sm" style={{ background: '#fafaf9', border: '1px solid #e5e4e2', color: '#52504a', fontWeight: 400 }}>
          <strong style={{ color: '#141310', fontWeight: 500 }}>Evidence depth varies across platforms. </strong>
          Olink and SomaScan have been compared in large population cohorts (UKB-PPP, ARIC, JHS) with
          tens of thousands of participants. Newer platforms (Nomic nELISA, NULISA, Seer Proteograph) have less
          published comparative data; scores for these platforms carry greater uncertainty.
        </div>
      </SectionCard>

      {/* 4 - Recommendation Engine and Fairness Testing */}
      <SectionCard id="fairness">
        <SectionHeading>Recommendation Engine and Fairness Testing</SectionHeading>

        <p className="text-sm leading-relaxed mb-4" style={{ color: '#52504a', fontWeight: 400 }}>
          The recommendation engine computes a weighted sum of platform scores across all dimensions.
          Users set importance weights (1–5) for seven dimensions via sliders, all defaulting to 3.
          Additional adjustments are applied automatically based on study context: large cohort sizes
          add a modest boost to cost and throughput weights (xlarge +1, large +0.5; halved in v3.0, see
          Calibration process below); CSF sample type amplifies the sensitivity weight; a CNS biomarker
          toggle, covering neuroscience applications and pTau species detection (pTau-181, pTau-217,
          pTau-231), elevates sensitivity (by 6 points for non-CSF matrices, 8 for CSF) and specificity
          (by 2 points for non-CSF, 4 for CSF), with the stronger CSF override reflecting the clinical
          pTau measurement context; and a longitudinal/repeat sampling toggle elevates precision by 2
          points, reflecting the importance of within-person change detection in repeat-measurement
          studies. Multi-matrix validation carries a fixed context weight that scales with how demanding
          the selected matrix is. A soft penalty (0.85×) applies when a platform scores 1/5 on a
          dimension the user has personally set to 5 (v3.0: gated on the user's own raw slider, not the
          context-boosted effective weight). Two hard filters (PTM detection mode and absolute
          quantification requirement) remove ineligible platforms from ranking rather than merely
          penalising them. Evidence depth (how much published head-to-head data exists for a platform) is
          not part of this weighted sum at all: it was removed from Help Me Choose's composite score at
          v2.7, on the grounds that confidence in a measurement is not an attribute of the measurement
          itself, and including it systematically penalised newer platforms for commercial immaturity
          rather than technical deficiency. It remains visible as a standalone reference dimension
          elsewhere in the Atlas (Platform Comparison, Evidence Base) but plays no role in any Help Me
          Choose recommendation. In Help Me Combine, evidence depth is one of eight selectable measurement
          properties but defaults to a weight of zero, so it is likewise excluded unless a user
          explicitly opts in via "Customize measurement properties."
        </p>

        <p className="text-sm mb-2" style={{ color: '#141310', fontWeight: 500 }}>Systematic bias simulation</p>
        <p className="text-sm leading-relaxed mb-4" style={{ color: '#52504a', fontWeight: 400 }}>
          To assess whether the engine could unfairly favour or suppress any platform, we run a full
          deterministic enumeration of 1,259,712 scenario-weight combinations: every combination of three
          weight levels (low, medium, high) across all seven user-adjustable dimensions, crossed with six
          research goals, six sample types, four study sizes, and four toggle-state combinations (CNS-focus
          × longitudinal). This is a complete enumeration, not a sample, so it carries no seed and
          reproduces exactly. Each goal, sample type, study size, and toggle-state combination is weighted
          by its observed real-world prevalence among 65 real Help Me Choose respondents rather than treated
          as equally likely; see Baseline weighting methodology, below, for why. For each scenario, every
          eligible platform within 3 points of the top score is identified (its "tie group" - the same
          condition HelpMeChoose.jsx uses internally to decide whether to show a single winner or a tied
          set). Each scenario resolves to exactly one of two mutually exclusive outcomes for a given
          platform: <strong>co-recommended</strong> - the tie group has two or more members and this platform
          is one of them, so the app shows "N platforms are statistically tied" for all of them and singles
          out no winner - or <strong>outright win</strong> - the tie group has exactly one member, this
          platform, and no other platform is even within 3 points; this is the only condition under which
          the app declares a single "Best overall match" rather than a tie.
        </p>
        <p className="text-sm leading-relaxed mb-4" style={{ color: '#52504a', fontWeight: 400 }}>
          The tables below lead with co-recommended rate. Calibrated match percentages are typically only
          a point or two apart (v2.3), so a statistically tied field is the more common outcome and the one
          the live app itself has shown users, via the tie band, since that release; leading with outright
          win rate would overstate the precision of a comparison the underlying scores do not support to
          that degree. Outright win rate is still reported in full for every dataset, not omitted - it
          answers a real, different question (is there a single best choice, with nothing else close) - but
          it is the minority outcome even for the platform that leads on it: no platform stands alone in
          62.9% of baseline scenarios, 62.1% of the secondary-check slice below, or 65.1% of scored
          real-world respondents. That imbalance is a property of the scenario population, not of any one
          platform; the full breakdown by tie-group size is in the downloadable reproducibility bundle
          rather than reproduced in full here. Neither column sums to 100% across platforms, for opposite
          reasons: co-recommended rates can sum to <em>more</em> than 100%, since every platform in a
          multi-way tie is counted once for that one scenario; outright win rates sum to <em>less</em> than
          100%, for the reason above.
        </p>
        <p className="text-sm mb-2" style={{ color: '#141310', fontWeight: 500 }}>Baseline weighting methodology</p>
        <p className="text-sm leading-relaxed mb-4" style={{ color: '#52504a', fontWeight: 400 }}>
          Earlier versions of this simulation (and an earlier manuscript draft) enumerated every goal,
          sample type, study size, and toggle combination as equally likely and called that the "baseline."
          That is not a neutral choice: real usage is far from uniform. We had already rejected equal
          weighting for the two toggles specifically, since it would imply a CNS-focus rate of 50% - flagged
          as unrepresentative before the true rate was known. The same problem existed for goals, sample
          types, and study sizes, just previously unaddressed: pharmacoproteomics, for example, was 0% of
          real sessions but received full weight in the old grid, while plasma (55.4% of real sessions) and
          discovery (55.4%) each received only a sixth. The baseline below now reweights all four axes by
          observed prevalence among the 65 real respondents, so it answers "what does a
          randomly selected real user experience" rather than "what happens if every theoretical combination
          is equally likely." One platform shows why this matters. Under the old
          uniform toggle weighting, Alamar NULISA's simulated outright win rate reached 23.7%, seeming to
          lead the field, only because CNS-focus (where NULISA is strongest) was treated as half of all
          scenarios rather than its true rate. The field's top win rate barely moved when the toggles were
          first reweighted, because a toggle-insensitive platform held first place throughout; the swing
          showed up only when every platform was checked, not just the leader. Reweighting goals, sample
          types, and study sizes on the same principle brings NULISA's simulated outright rate to 4.7%. The previous uniform methodology is retained, unchanged,
          in the downloadable reproducibility bundle as a clearly labelled superseded reference (not
          deleted), so any previously published number under it can still be reproduced exactly. This
          reweighting affects only how the aggregate simulation is summarized, not any individual real
          user's recommendation, which already reflects that user's own stated situation. It does introduce
          a real limitation the uniform grid did not have: the baseline now depends on the 65-respondent
          sample being reasonably representative of true usage, worth refreshing as more real usage data
          accumulates, the same as evidence-base scores already are.
        </p>

        <p className="text-sm mb-2" style={{ color: '#141310', fontWeight: 500 }}>Calibration process</p>
        <p className="text-sm leading-relaxed mb-4" style={{ color: '#52504a', fontWeight: 400 }}>
          Initial simulation revealed structural biases including one platform winning more than 50%
          of all scenarios at equal default weights, another platform never appearing in the top three
          under any default-weight scenario, and a fixed context multiplier for tissue and cell lysate
          matrices that disproportionately favoured a single platform. Each identified bias was reviewed
          against the underlying scores: where a bias reflected an inaccurate score, the score was
          revised with scientific justification; where it reflected a genuine platform characteristic,
          it was retained.
        </p>
        <p className="text-sm leading-relaxed mb-4" style={{ color: '#52504a', fontWeight: 400 }}>
          A v3.0 re-validation of this simulation against the current, unchanged score matrix identified
          corrections in three areas, none involving any platform's score.
          The first concerns how user inputs translate into effective weights. The soft priority-miss penalty was
          gated on the context-boosted effective weight rather than the user's own slider, so an automatic
          goal adjustment could trigger a penalty on a dimension the user never touched; it now gates on
          the raw slider value. Relatedly, the large/extra-large study-size boost applied the same input to
          both the cost and throughput weights at full strength, double-stacking one input onto two
          dimensions that happen to be Nomic nELISA's strongest, tied-max scores; the boost is now halved.
          The second area is matrix weighting: the multi-matrix-validation weight for tissue samples (8) was
          disproportionate against the same weight for the other two atypical matrices, cell culture and
          multiple sample types (5 each), with no documented reason tissue should carry more: at 8, a
          platform with the maximum flexibility score earned 40 points from matrix compatibility alone,
          more than the maximum possible contribution from a fully-maxed priority slider (5 weight × 5
          score = 25), letting sample type override any explicit user priority regardless of how strongly
          stated. Tissue now matches the other two atypical matrices at 5. The per-platform tissue scores
          reflect real validation differences: Biognosys TrueDiscovery handles native solid tissue and
          homogenates directly (5/5); Olink Explore HT and SomaSeq are validated in tissue homogenates, the
          normal affinity-platform tissue workflow, and score 3/5, the same as their general multi-matrix
          validation (the earlier tissue-specific downgrade to 2/5 was removed in v3.5, see version
          history); and Nomic nELISA, Alamar NULISA, and Seer Proteograph XT have no published solid-tissue
          validation and score 1/5. A separate v3.0 correction closed a related gap: a platform with no
          validation for the selected matrix could still win outright on unrelated strength, so the soft
          priority-miss penalty (0.85×, described above for slider dimensions) now also fires when a
          platform's multi-matrix validation score for the chosen matrix is 1/5. That brings the tissue outright
          rate of the unvalidated platforms (Nomic, NULISA, Seer) to 0%, so cost or throughput strength can
          no longer buy back a recommendation for a matrix the platform has never been deployed on.
          From v2.5 onward, the win-share figures reported as this analysis's current output are reproducible
          exactly from the archived engine specification and sweep script. This does not extend to
          prior-methodology figures quoted elsewhere for before/after comparison (for example in the version
          history below): those were not version-pinned to an archived, independently runnable state and are
          not claimed as reproducible.
        </p>
        <p className="text-sm leading-relaxed mb-4" style={{ color: '#52504a', fontWeight: 400 }}>
          A separate correction was needed in how the simulation tallies a "win," not in the recommendation
          engine, which was unaffected throughout. The live app declares a sole winner only when{' '}
          <em>no other platform at all</em> is within the 3-point tie band; a positive but sub-3-point
          margin is still shown to users as "N platforms are statistically tied," not a win. Two earlier
          tallying methods (crediting whichever platform had the single highest displayPct, then a revision
          giving fractional credit for exact numeric ties) both missed this: a platform with the numerically
          highest score could still be credited with an outright win in a scenario the app itself displays
          as tied, whenever its margin over the next platform was positive but under 3 points. For example,
          displayPct values of 68/66/65/65/61/54 put four platforms within 3 points of the 68, and the app
          shows all four as tied, but both earlier methods credited the 68 alone with a full win. Outright
          win is now defined identically to the app's own condition (exactly one platform in the tie group).
          A further revision separated this from co-recommended rate: an intermediate version reported a
          single "top-tier rate" that combined a platform's own outright wins with its co-recommendations,
          and listed the resulting "no sole winner" share as an additional row inside the platform table.
          The current version reports outright win and co-recommended as separate, mutually exclusive
          columns, with the tie-group-size distribution reported on its own as a scenario-level statistic.
          Every superseded definition is documented, not deleted, in the downloadable reproducibility
          bundle. Olink Explore HT's precision score (2/5, its weakest scored dimension) is independently
          evidenced by two published CV comparisons (Ahadi et al. 2025: 26.8%; Rooney et al. 2024 ARIC
          cohort: 35.7%) and was not revised during any of this.
        </p>

        <p className="text-sm mb-3" style={{ color: '#141310', fontWeight: 500 }}>Fairness simulation results: baseline (prevalence-weighted)</p>
        <div className="overflow-hidden mb-4" style={{ border: '1px solid #e5e4e2' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: '#fafaf9', borderBottom: '2px solid #141310' }}>
                <th className="text-left px-4 py-2.5 uppercase" style={{ color: '#6f6d67', fontSize: 10, letterSpacing: '0.08em', fontWeight: 400 }}>Platform</th>
                <th className="text-right px-4 py-2.5 uppercase" style={{ color: '#6f6d67', fontSize: 10, letterSpacing: '0.08em', fontWeight: 400 }}>Co-recommended</th>
                <th className="text-right px-4 py-2.5 uppercase" style={{ color: '#6f6d67', fontSize: 10, letterSpacing: '0.08em', fontWeight: 400 }}>Outright win</th>
                <th className="text-left px-4 py-2.5 uppercase" style={{ color: '#6f6d67', fontSize: 10, letterSpacing: '0.08em', fontWeight: 400 }}>Typically competitive when</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Seer Proteograph XT',       co: '39.2%', win: '12.3%', condition: 'Unbiased deep discovery or pQTL studies in plasma' },
                { name: 'SomaSeq', co: '33.4%', win: '9.4%',  condition: 'Coverage or precision prioritised; broad discovery designs' },
                { name: 'Olink Explore HT',          co: '33.2%', win: '3.1%',  condition: 'Throughput prioritised (tied with Nomic); broadly competitive across most goals' },
                { name: 'Nomic nELISA',              co: '28.3%', win: '6.7%',  condition: 'Low cost per sample, throughput (tied with Olink), cell-culture/screening work, or absolute quantification required' },
                { name: 'Alamar NULISA',             co: '17.4%', win: '4.7%',  condition: 'CNS biomarker focus, CSF matrix, or ultra-sensitivity required' },
                { name: 'Biognosys TrueDiscovery',   co: '16.5%', win: '1.0%',  condition: 'Tissue and cost-sensitive studies; still lowest overall, and real-world sessions rarely specify tissue (~6%)' },
              ].map((row, i) => (
                <tr key={row.name} style={{ borderTop: i > 0 ? '1px solid #f3f2f0' : 'none' }}>
                  <td className="px-4 py-2.5" style={{ color: '#141310', fontWeight: 500 }}>{row.name}</td>
                  <td className="px-4 py-2.5 text-right" style={{ color: '#8B1A1A', fontWeight: 500 }}>{row.co}</td>
                  <td className="px-4 py-2.5 text-right" style={{ color: '#52504a', fontWeight: 400 }}>{row.win}</td>
                  <td className="px-4 py-2.5" style={{ color: '#52504a', fontWeight: 400 }}>{row.condition}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-sm leading-relaxed mb-2" style={{ color: '#52504a', fontWeight: 400 }}>
          The table reports the prevalence-weighted baseline (see Baseline weighting methodology, above),
          sorted by co-recommended rate. Co-recommended rates span 16.5-39.2%: every platform is a
          statistically competitive choice in at least a sixth of scenarios. Maximising each of coverage,
          throughput, sensitivity, and pQTL in isolation, restricted to plasma (the dominant real matrix, so
          this isolates each dimension's effect from sample-type interactions entirely),
          still shifts the recommendation and separates cleanly: coverage to SomaSeq (25.0%), sensitivity to
          Alamar NULISA (33.3%), and pQTL to Seer Proteograph XT (100.0%, the most decisive single-dimension
          result in the simulation). Throughput is a genuine tie between Olink Explore HT and Nomic nELISA
          (20.8% each): both score 5/5 on throughput itself, and in plasma specifically neither platform's
          broader profile is strong enough to separate from the other, unlike in the full six-matrix sweep
          (used only as a cross-check, not reported in the figure) where Nomic's advantage in other,
          non-plasma-relevant dimensions gave it a narrow edge.
        </p>
        <p className="text-sm leading-relaxed mb-5" style={{ color: '#52504a', fontWeight: 400 }}>
          Seer Proteograph XT leads on both statistics (39.2% co-recommended, 12.3% outright), the clearest
          single result in the baseline: strong scores across multiple dimensions (coverage and pQTL both
          5/5) translate into both frequent contention and, more often than any other platform, an
          uncontested lead. SomaSeq and Olink Explore HT are close behind on co-recommended rate (33.4%,
          33.2%) but diverge sharply on outright win rate (9.4% vs. 3.1%): SomaSeq's coverage and precision
          scores (5/5 each) more often open a clean lead, while Olink's precision score (2/5) - independently
          evidenced by two published CV comparisons, see above - caps how often it separates from a crowded
          field even where it is competitive. Nomic nELISA (28.3% co-recommended, 6.7% outright) benefits
          from cost, throughput, and absolute-quantification strength; Alamar NULISA (17.4%, 4.7%) is
          concentrated in CNS-focus, CSF, and ultra-sensitivity scenarios, and is the only platform scoring
          exactly 1/5 on any of the seven user-adjustable dimensions (proteome coverage), so the only one
          the soft priority-miss penalty can affect via a slider dimension under the current, evidence-based
          score matrix. Biognosys TrueDiscovery has the lowest rate on both statistics (16.5%, 1.0%). Its
          strength is tissue: in a tissue-only slice it still has the highest outright-win rate (17.8%),
          though SomaSeq (13.0%) and Olink are much closer now that their tissue scores are corrected.
          Tissue is only about 6% of real sessions, so that strength barely moves its overall share.
          An earlier version of the engine, before the v3.0 multi-matrix-validation weight correction and the
          validation-based priority-miss extension described above, let an over-large tissue weight and
          uniform sample-type weighting inflate this narrow tissue strength into an apparent overall lead;
          those corrections removed that inflation.
        </p>

        <p className="text-sm mb-3" style={{ color: '#141310', fontWeight: 500 }}>Secondary check: plasma, discovery goal, large/extra-large study</p>
        <p className="text-sm leading-relaxed mb-3" style={{ color: '#52504a', fontWeight: 400 }}>
          As a secondary check, we evaluated the most prevalent real-world user profile: plasma matrix,
          biomarker discovery goal, large or extra-large study size (4,374 scenario-weight combinations,
          specialised toggles off), sorted by co-recommended rate. This narrow slice shows how
          recommendations concentrate when several study parameters are fixed to a single common context.
        </p>
        <div className="overflow-hidden mb-4" style={{ border: '1px solid #e5e4e2' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: '#fafaf9', borderBottom: '2px solid #141310' }}>
                <th className="text-left px-4 py-2.5 uppercase" style={{ color: '#6f6d67', fontSize: 10, letterSpacing: '0.08em', fontWeight: 400 }}>Platform</th>
                <th className="text-right px-4 py-2.5 uppercase" style={{ color: '#6f6d67', fontSize: 10, letterSpacing: '0.08em', fontWeight: 400 }}>Co-recommended</th>
                <th className="text-right px-4 py-2.5 uppercase" style={{ color: '#6f6d67', fontSize: 10, letterSpacing: '0.08em', fontWeight: 400 }}>Outright win (slice)</th>
                <th className="text-left px-4 py-2.5 uppercase" style={{ color: '#6f6d67', fontSize: 10, letterSpacing: '0.08em', fontWeight: 400 }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Seer Proteograph XT',        co: '45.0%', win: '17.6%', note: 'Maximal coverage (5/5) and pQTL (5/5) scores align with the discovery goal’s coverage boost' },
                { name: 'Olink Explore HT',          co: '39.7%', win: '4.1%',  note: 'Frequently tied here; rarely uncontested' },
                { name: 'Nomic nELISA',              co: '36.7%', win: '9.3%',  note: 'Cost and throughput boosts from large/xlarge size stack on its 5/5 scores' },
                { name: 'SomaSeq', co: '29.1%', win: '6.7%',  note: 'Coverage- and precision-dominated discovery scenarios' },
                { name: 'Alamar NULISA',              co: '8.1%',  win: '0.1%',  note: 'Coverage 1/5 is decisive against the discovery coverage boost' },
                { name: 'Biognosys TrueDiscovery',    co: '0.0%',  win: '0.0%',  note: 'Multi-matrix validation advantage does not apply to plasma; coverage (4/5) trails the coverage-boosted leaders here' },
              ].map((row, i) => (
                <tr key={row.name} style={{ borderTop: i > 0 ? '1px solid #f3f2f0' : 'none' }}>
                  <td className="px-4 py-2.5" style={{ color: '#141310', fontWeight: 500 }}>{row.name}</td>
                  <td className="px-4 py-2.5 text-right" style={{ color: '#8B1A1A', fontWeight: 500 }}>{row.co}</td>
                  <td className="px-4 py-2.5 text-right" style={{ color: '#52504a', fontWeight: 400 }}>{row.win}</td>
                  <td className="px-4 py-2.5" style={{ color: '#52504a', fontWeight: 400 }}>{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm leading-relaxed mb-5" style={{ color: '#52504a', fontWeight: 400 }}>
          Seer leads this slice on both statistics. Two of the discovery goal's three weight adjustments
          materially affect which platform leads within this narrow slice specifically: the coverage boost
          (+2, versus +1 for every other goal-adjusted dimension in the system) and the choice of
          specificity over sensitivity as the third boosted dimension - both are examined in Goal and
          context adjustment rationale, below. Reducing the coverage boost to +1 shifts the outright-win
          lead to Nomic nELISA (16.6% versus Seer's 12.9%); boosting sensitivity instead of specificity
          shifts it to SomaSeq (13.3% versus Seer's 11.9%). Neither adjustment moves Olink Explore HT's
          outright win rate by more than half a percentage point in this slice (4.1% to 4.3%, and 4.1% to
          4.6%, respectively): its position here is set by its coverage score (4/5, one tier below Seer and
          SomaSeq) and its precision score (2/5, not offset by any adjustment active in this slice), not by
          either of these two adjustable parameters. Biognosys TrueDiscovery scores 0% on both statistics
          here: its multi-matrix validation advantage provides no benefit in plasma, and its coverage score
          (4/5, one tier below Seer and SomaSeq) keeps it out of the top group in a slice where the
          discovery goal boosts coverage. This is consistent with its prevalence-weighted baseline
          outright-win rate (1.0%, the lowest of the six), where its tissue-matrix advantage is real (see
          above) but tissue is a small enough share of real usage that it barely moves the overall figure. This narrow-slice concentration is expected: with
          the discovery goal fixed for all 4,374 scenarios here, any discovery-specific adjustment is
          active in every one of them, rather than the roughly one-sixth of baseline-grid scenarios where
          it applies.
        </p>

        <p className="text-sm mb-3" style={{ color: '#141310', fontWeight: 500 }}>Real-world validation: 65 anonymized survey respondents</p>
        <p className="text-sm leading-relaxed mb-3" style={{ color: '#52504a', fontWeight: 400 }}>
          Each of the 65 Help Me Choose questionnaires completed and downloaded by real users (April-June
          2026) was rescored against the current engine using that respondent's own stated goal, sample
          type, size, priority weights, and toggles - 1 excluded as an internal test submission, 2 further
          excluded where the stated requirements hard-filtered every platform, leaving n=63, sorted by
          co-recommended rate.
        </p>
        <div className="overflow-hidden mb-4" style={{ border: '1px solid #e5e4e2' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: '#fafaf9', borderBottom: '2px solid #141310' }}>
                <th className="text-left px-4 py-2.5 uppercase" style={{ color: '#6f6d67', fontSize: 10, letterSpacing: '0.08em', fontWeight: 400 }}>Platform</th>
                <th className="text-right px-4 py-2.5 uppercase" style={{ color: '#6f6d67', fontSize: 10, letterSpacing: '0.08em', fontWeight: 400 }}>Co-recommended</th>
                <th className="text-right px-4 py-2.5 uppercase" style={{ color: '#6f6d67', fontSize: 10, letterSpacing: '0.08em', fontWeight: 400 }}>Outright win</th>
                <th className="text-left px-4 py-2.5 uppercase" style={{ color: '#6f6d67', fontSize: 10, letterSpacing: '0.08em', fontWeight: 400 }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Seer Proteograph XT',       co: '57.1%', win: '15.9%', note: 'Highest co-recommended rate of any platform in this dataset' },
                { name: 'SomaSeq', co: '44.4%', win: '0.0%',  note: 'Narrowly ahead of Olink Explore HT; zero outright wins at n=63 is a small-sample floor (baseline: 9.4%)' },
                { name: 'Olink Explore HT',          co: '42.9%', win: '0.0%',  note: 'Narrowly behind SomaSeq; zero outright wins at n=63 is a small-sample floor (baseline: 3.1%)' },
                { name: 'Nomic nELISA',              co: '33.3%', win: '19.1%', note: 'Cost, throughput, and the sole absolute-quantification platform' },
                { name: 'Alamar NULISA',             co: '19.1%', win: '0.0%',  note: 'Zero outright wins at n=63 is a small-sample floor (baseline: 4.7%)' },
                { name: 'Biognosys TrueDiscovery',   co: '20.6%', win: '0.0%',  note: 'More often co-recommended after the cost correction; still zero outright wins at n=63, and tissue (its best context) is only ~6% of respondents' },
              ].map((row, i) => (
                <tr key={row.name} style={{ borderTop: i > 0 ? '1px solid #f3f2f0' : 'none' }}>
                  <td className="px-4 py-2.5" style={{ color: '#141310', fontWeight: 500 }}>{row.name}</td>
                  <td className="px-4 py-2.5 text-right" style={{ color: '#8B1A1A', fontWeight: 500 }}>{row.co}</td>
                  <td className="px-4 py-2.5 text-right" style={{ color: '#52504a', fontWeight: 400 }}>{row.win}</td>
                  <td className="px-4 py-2.5" style={{ color: '#52504a', fontWeight: 400 }}>{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm leading-relaxed mb-5" style={{ color: '#52504a', fontWeight: 400 }}>
          The real-world spread is still wider than the prevalence-weighted baseline grid even though both
          now reflect real-world prevalence, because real respondents' characteristics are correlated (a
          tissue-focused study is more likely to also share a particular goal or toggle) in a way the
          baseline grid's independent-axis weighting cannot capture, and real respondents' own slider choices
          are not a uniform sweep across weight levels the way the grid's are. Co-recommended rates run
          higher across the board here than in the baseline grid for the same reason: real inputs cluster
          more tightly than an independent-axis model predicts, so more platforms land within reach of each
          other at once. At n=63, four platforms show zero observed outright wins; the baseline grid
          confirms all four can win outright, just rarely, so this is a small-sample floor effect rather
          than evidence any of them structurally cannot win.
        </p>

        <p className="text-sm leading-relaxed mb-5" style={{ color: '#52504a', fontWeight: 400 }}>
          <strong style={{ color: '#141310', fontWeight: 500 }}>How often is there an outright winner at all? </strong>
          A minority of the time, in every dataset above: no platform stands alone in 62.9% of baseline
          scenarios, 62.1% of the secondary-check slice, and 65.1% of scored real-world respondents. This is
          a property of the scenario population, not of any one platform, which is why it is stated here
          rather than as a row inside the platform tables. The full breakdown by tie-group size (how often
          a tie is 2-way versus larger) is in the downloadable reproducibility bundle (
          <code style={{ background: 'rgba(20,19,16,0.06)', padding: '1px 5px' }}>choose_tie_distribution.csv</code>,{' '}
          <a href="#reproducibility" className="hover:underline" style={{ color: '#8B1A1A' }}>Reproducibility</a> tab)
          rather than reproduced here; in short, ties shrink quickly by size in the prevalence-weighted
          baseline grid (each larger tie-group size is markedly less common than the last) but skew toward
          3- and 4-way in real usage, consistent with real study designs clustering around a few common
          profiles more tightly than an independent-axis prevalence model predicts.
        </p>

        <p className="text-sm mb-2" style={{ color: '#141310', fontWeight: 500 }}>Goal and context adjustment rationale</p>
        <p className="text-sm leading-relaxed mb-3" style={{ color: '#52504a', fontWeight: 400 }}>
          Every automatic weight adjustment (goal, study size, sample type, the CNS and longitudinal
          toggles) is applied on top of the user's own slider values, never in place of them, and each is
          disclosed here individually rather than folded into an undifferentiated "calibration" step. Two
          have a dated, documented rationale in the version history: the discovery goal's coverage boost
          (+1 to +2 at v2.0, "reflecting proteome breadth as a core discovery requirement") and the
          population goal's coverage boost (+1, added at v2.0). Every other goal and context adjustment has
          been part of the engine since v1.0 without an individually recorded rationale, though each maps to
          the goal's own stated definition: drug target identification boosts coverage and specificity,
          matching its definition ("broad coverage with mechanistic resolution"); validation boosts
          precision and specificity, matching its definition verbatim; population boosts cost and
          throughput, matching "tens of thousands of samples, cost-controlled." This is a lower evidentiary
          bar than the platform scores, which cite specific published sources, and we are stating that
          plainly rather than presenting expert judgement as literature-derived.
        </p>
        <p className="text-sm leading-relaxed mb-5" style={{ color: '#52504a', fontWeight: 400 }}>
          The discovery goal specifically boosts coverage (+2, the only double-magnitude adjustment in the
          system - documented above), throughput (+1, reflecting that discovery studies increasingly run at
          cohort scale), and specificity (+1). The third choice does not clear even the face-validity bar
          the others do: no record explains why specificity was boosted rather than sensitivity. A case
          exists for either - specificity, to avoid biomarker leads that fail to replicate; sensitivity, to
          avoid filtering out weak-but-real signals before downstream validation can assess them - and
          neither has, to our knowledge, been weighed against actual discovery-phase proteomics methodology.
          We tested its effect directly rather than leaving the question open: swapping to a sensitivity
          boost shifts the outright-win leader of the plasma/discovery/large-xlarge secondary check above
          from Seer Proteograph XT to SomaSeq; it does not meaningfully change Olink Explore HT's position
          in that slice or in the full baseline grid. We have not changed this weight - reasonable
          alternatives exist and neither is required by, nor improves, any specific platform's position -
          but the gap is disclosed rather than left undocumented, and we would welcome a literature-grounded
          case for either choice.
        </p>

        <p className="text-sm mb-2" style={{ color: '#141310', fontWeight: 500 }}>Absolute quantification requirement</p>
        <p className="text-sm leading-relaxed mb-5" style={{ color: '#52504a', fontWeight: 400 }}>
          In v2.4 the absolute-quantification requirement became a capability filter rather than a
          score threshold. In the absolute-quantification-required slice, only platforms whose standard
          product reports validated physical-concentration output remain eligible: among the scored
          products, Nomic nELISA alone (ELISA-calibrated pg/mL), so Nomic wins 100% of that slice.
          Olink Explore HT, SomaSeq, Seer Proteograph XT, Alamar NULISA and
          Biognosys TrueDiscovery are all excluded; several of these vendors offer absolute
          quantification through separate products not scored here (Olink Flex / Target 48, Alamar
          NULISAseq AQ, Biognosys TrueSignature). In observed survey usage, an absolute-quantification
          requirement was set by only ~11% of sessions (required 10.8%, preferred 50.8%, not needed
          38.5%; n=65), so this filter affects a minority of users while correctly steering them to the
          one scored platform that meets the requirement. The graded quantification-type scores
          (Nomic 4; Seer and Biognosys 3; Olink, SomaSeq and NULISA 2) still differentiate
          platforms in "nice-to-have" scenarios where absolute quantification is preferred but not required.
        </p>

        <p className="text-sm mb-2" style={{ color: '#141310', fontWeight: 500 }}>Known limitations of this analysis</p>
        <ul className="space-y-2 mb-2">
          {[
            'The optional protein-target search (Help Me Choose Step 1), including target lists populated by the Reactome pathway selector described below, adds a further weight and a coverage hard filter that neither sweep below exercises: the downloadable per-session results file does not record which proteins, if any, a respondent searched for or selected, so real-world usage of this path cannot be reconstructed and it is excluded from the reproducibility bundle rather than assumed to carry no effect.',
            'The real-world sample (n=63 scored respondents, of 65 downloaded) is a convenience sample of people who completed the Help Me Choose questionnaire and downloaded their results between April and June 2026, not a random sample of proteomics researchers.',
            'Co-recommended rate and outright win rate answer different questions and are not interchangeable: co-recommended rate (the metric led above) asks how often a platform is tied with at least one other platform at the top; outright win rate asks how often it is the sole, uncontested best choice. Both are reported for every dataset; neither alone is the full picture. Co-recommended rates can sum to well over 100%, since every platform in a multi-way tie is counted for that scenario; outright win rates do not sum to 100% (the remainder is scenarios with no outright winner at all; see "How often is there an outright winner at all?" above and the tie-group-size breakdown in the reproducibility bundle).',
            'Goal and context weight magnitudes carry a lower evidentiary bar than the platform scores; see Goal and context adjustment rationale, above, for the full disclosure of which are individually documented and which are not.',
            'The prevalence-weighted baseline (see Baseline weighting methodology, above) depends on the 65-respondent sample being reasonably representative of true usage, a dependency the previous uniform methodology did not have. It also assumes goal, sample type, study size, and toggle state are statistically independent (weighted as a product of their individual observed rates); real respondents\' characteristics are likely correlated, which is part of why the real-world dataset\'s spread still differs from the baseline grid\'s even though both now use real-world prevalence.',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm leading-snug" style={{ color: '#52504a', fontWeight: 400 }}>
              <span className="mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#8B1A1A', marginTop: 6 }} />
              {item}
            </li>
          ))}
        </ul>

        <div className="px-4 py-3 text-sm mt-4" style={{ background: '#fafaf9', border: '1px solid #e5e4e2', color: '#52504a', fontWeight: 400 }}>
          <strong style={{ color: '#141310', fontWeight: 500 }}>Full reproducibility bundle: </strong>
          the engine specification, a self-contained regeneration script, the anonymized real-world input
          data, and five result sets (the prevalence-weighted baseline grid, the superseded uniform baseline
          grid kept for audit purposes, secondary check, real-world, and the tie-group-size distribution -
          outright win and co-recommended rates throughout) are downloadable from the{' '}
          <a href="#reproducibility" className="hover:underline" style={{ color: '#8B1A1A' }}>Reproducibility</a>{' '}
          tab. The bundle's script comments document every superseded win-rate and weighting methodology in
          full, not just the current one.
        </div>
      </SectionCard>

      {/* 5 - Platform Combination Engine (Help Me Combine) */}
      <SectionCard id="combine-engine">
        <SectionHeading>Platform Combination Engine (Help Me Combine)</SectionHeading>

        <p className="text-sm leading-relaxed mb-4" style={{ color: '#52504a', fontWeight: 400 }}>
          The Help Me Combine tab answers a different question from Help Me Choose: many studies run more than one platform,
          so which two technologies best complement each other? It reuses the same Atlas dimension scores (each rated 1 to 5)
          as inputs, rather than creating new platform scores, and evaluates the fifteen pairs formed from all six
          coverage-bearing platforms. Seer Proteograph XT and Biognosys TrueDiscovery are modelled as two independent
          mass-spectrometry platforms, each scored against its own accession-level coverage list (Biognosys TrueDiscovery's
          list is the published Ahadi et al. 2025 depletion-workflow dataset described above); they were previously merged
          into a single "mass spectrometry" category before that list existed.
        </p>

        <p className="text-sm leading-relaxed mb-4" style={{ color: '#52504a', fontWeight: 400 }}>
          Each pair is scored on several user-weightable axes: coverage against a selectable denominator (ChEMBL drug targets,
          the SwissProt canonical proteome, the Atlas detectable-proteome union, or FDA-approved biomarkers), complementarity
          measured as the net-new targets the second platform adds beyond the better single platform (rather than a
          unique-fraction ratio, which would reward pairing a small panel with a large one for the wrong reason),
          combined measurement score, protein-class balance, and combined cost. Coverage is computed exactly for all four numeric
          denominators, not estimated: drug-target and FDA-biomarker coverage are exact set intersections against their
          external reference lists, and canonical-proteome/Atlas-union coverage are exact unions of each platform's own
          accession list. The user selects up to three priorities, for example coverage, target specificity, or throughput,
          which set the axis weights; no axis is privileged by default, so coverage leads only if it is chosen. Sample volume
          is opt-in, and the combined measurement score can be recomposed from its eight underlying measurement properties, including
          maturity properties such as throughput that are off by default. An advanced panel exposes every weight directly.
        </p>

        <p className="text-sm leading-relaxed" style={{ color: '#52504a', fontWeight: 400 }}>
          Because the pairs cluster closely, the engine reports a tiered recommendation rather than a single winner. Coverage
          percentages carry bootstrap confidence intervals, pairs whose intervals overlap are presented as co-leading rather
          than ranked, and robustness is summarised by how often a pair lands in the top three across many weightings. Coverage
          here is list membership against the chosen denominator, an upper bound on usable coverage, and combined measurement score and cost are
          the Atlas expert ratings. The full methodology, including the coverage computation and the axis-redundancy and
          robustness analyses, is described in a companion preprint.
        </p>

        <p className="text-sm leading-relaxed" style={{ color: '#52504a', fontWeight: 400 }}>
          A permutation sweep tests whether the framework structurally favours any platform. Across every combination of up to
          three priorities, evaluated over the four numeric denominators (924 scenarios), the recommendation is well balanced
          and, with six platforms in play, no pair reaches the leading-choice (Tier 1) threshold: the top pair, Nomic Omni +
          Seer Proteograph XT, wins 18.7% of scenarios and leads the field on top-3 share (48.5%), but every platform appears
          in the winning pair in 11% to 52% of scenarios (Nomic Omni 52%, Seer Proteograph XT 50%, Olink Explore HT 37%,
          SomaSeq 26%, Alamar NULISA 24%, Biognosys TrueDiscovery 11%). An unconstrained sweep of 160,000 random weightings
          was also tested during development and later withdrawn: two of the seven axes, sample volume and mass-spec tissue
          fit, are zero-weighted by default and reachable only when a user explicitly selects them, so uniform random draws
          gave them the same expected influence as coverage, a weighting the priority picker itself cannot produce; it is not
          part of this analysis or the reproducibility bundle. Platform participation is substance-driven, not bias: Seer
          Proteograph XT leads solo coverage on two of the four denominators (canonical proteome, Atlas union), and Nomic
          Omni, despite the second-lowest solo coverage of the six platforms on every denominator (Alamar NULISA is lowest),
          gains the most from pairing precisely because of that gap, on top of being the consortium's default anchor.
          Biognosys TrueDiscovery, mid-table on solo coverage across all four denominators, is the newest entrant and
          appears least in the priority sweep, even though it produces the single largest net-new contribution of
          any Nomic Omni pairing (140 net-new drug targets). The engine specification, reproduction script, and the sweep and
          bootstrap-CI outputs are downloadable from the{' '}
          <a href="#reproducibility" className="hover:underline" style={{ color: '#8B1A1A' }}>Reproducibility</a> tab.
        </p>
      </SectionCard>

      {/* 5b - Pathway Selector (Reactome) */}
      <SectionCard id="pathway">
        <SectionHeading>Pathway Selector (Reactome)</SectionHeading>

        <p className="text-sm leading-relaxed mb-4" style={{ color: '#52504a', fontWeight: 400 }}>
          Both Help Me Choose and Help Me Combine let users narrow to a specific biological pathway instead of, or
          alongside, manually listing target proteins. Pathway membership is sourced from Reactome (811 named human
          pathways with ten or more members present in the canonical proteome, retrieved via the Reactome
          ContentService); selecting one resolves to that pathway's gene list.
        </p>

        <p className="text-sm leading-relaxed mb-4" style={{ color: '#52504a', fontWeight: 400 }}>
          In Help Me Choose, the resolved list enters the exact same input as a manually typed gene list, carrying
          the same weight of 6 and the same coverage hard filter (a platform is excluded if it covers under 50% of
          three or more listed targets). In Help Me Combine, pathway coverage is shown only as a descriptive figure
          alongside each pair's existing composite score, with an optional toggle to re-order, not rescore, the
          ranked list by it; it is not one of the seven composite axes, not one of the eleven priorities, and not a
          coverage denominator, so neither engine's scoring changes.
        </p>

        <p className="text-sm leading-relaxed mb-4" style={{ color: '#52504a', fontWeight: 400 }}>
          Reactome annotation is uneven across biology: it is denser for extensively studied pathways, so high
          coverage of a sparsely annotated pathway is a weaker statement than the same figure for a well-annotated
          one, since sparse annotation may reflect incomplete curation rather than the biology being genuinely hard
          to measure.
        </p>

        <p className="text-sm leading-relaxed" style={{ color: '#52504a', fontWeight: 400 }}>
          This code path is not exercised by either engine's fairness sweep, for the same reason the existing
          protein-target search is not (see Known limitations, above): the downloadable results format does not
          record which genes, if any, a respondent searched for or selected. Routing pathway selection through that
          same existing input does not close this gap; it inherits it.
        </p>
      </SectionCard>

      {/* 6 - Limitations & Disclosures */}
      <SectionCard id="limitations">
        <SectionHeading>Limitations &amp; Disclosures</SectionHeading>
        <div>
          <DisclosureItem>
            This tool focuses on commercially available, high-plex, untargeted or semi-targeted proteomics platforms
            with published head-to-head comparison data in human samples. Targeted panels (e.g., ProcartaPlex,
            LEGENDplex), single-protein assays (ELISA, Simoa), and research-use-only or early-access platforms
            (e.g., Nautilus) are outside the current scope. Where a vendor offers multiple platforms, we evaluated
            the product best suited to large-scale discovery proteomics; other products within the same portfolio
            (e.g., Olink Reveal) were excluded to keep comparisons focused and avoid redundancy. Sample preparation
            and enrichment providers (e.g., PreOmics) were not evaluated as they supply upstream workflows rather
            than end-to-end proteomics platforms with their own quantification readout. The platform set will be
            expanded in future releases as new technologies reach commercial maturity and accumulate independent
            validation data.
          </DisclosureItem>
          <DisclosureItem>
            <strong style={{ fontWeight: 500 }}>Scores are relative to the current platform set, not absolute quality verdicts.</strong>{' '}
            A score of 3/5 on any dimension means that platform sits in the middle of the evaluated field on that metric,
            not that it performs poorly in absolute terms. All six platforms are actively used in peer-reviewed research
            and are appropriate for the right study design. Scores will be revised as new independent evidence emerges,
            and all changes are documented in the version history.
          </DisclosureItem>
          <DisclosureItem>
            This tool provides general guidance based on published evidence. Platform performance varies substantially
            by study design, sample handling, freeze-thaw cycles, and specific protein targets. Always consult with
            platform vendors and review the primary literature for your specific use case.
          </DisclosureItem>
          <DisclosureItem>
            <strong style={{ fontWeight: 500 }}>Independence policy: </strong>Ignition Scientific does not consult for any proteomics platform
            vendor. This policy is maintained to preserve the independence and credibility of this tool's assessments.
          </DisclosureItem>
          <DisclosureItem>
            Pricing ranges are approximate list-price estimates and may not reflect current negotiated rates,
            academic discounts, or volume pricing. Contact vendors directly for study-specific quotes.
          </DisclosureItem>
          <DisclosureItem>
            Some studies cited in the Evidence Base were conducted by authors with disclosed relationships to
            platform vendors. See individual study publications for full conflict of interest disclosures. Study
            inclusion is based on methodological quality, not author affiliation.
          </DisclosureItem>
        </div>
      </SectionCard>

      {/* 7 - Contact */}
      <SectionCard>
        <SectionHeading>Contact</SectionHeading>
        <div className="text-center">
          <p className="text-sm leading-relaxed mb-4" style={{ color: '#52504a', fontWeight: 400 }}>
            For custom platform selection analysis, study design consulting, or questions about this tool:
          </p>
          <ContactButton email="chris@ignitionscientific.com" />
          <p className="text-xs mt-3" style={{ color: '#6f6d67', fontWeight: 400 }}>
            Response within 2 business days. Custom analyses available for pharmaceutical, biotech, and academic groups.
          </p>
        </div>
      </SectionCard>

      {/* 8 - Version History */}
      <SectionCard id="version-history">
        <SectionHeading>Version History</SectionHeading>
        <div className="space-y-0">
          {[
            { version: 'v4.1', date: 'September 25, 2026', notes: 'Help Me Choose: the automatic per-visit log now also records any protein targets entered or Reactome pathway selected, and the app version, so every logged recommendation can be reproduced exactly from its recorded inputs. Previously these inputs affected the recommendation (through the protein-target weight and coverage filter) but were not recorded. The Results-page disclosure now lists them. Also corrected the eligibility label for the incidental (DIA-MS) PTM filter, which previously read "Requires systematic PTM enrichment", and described the excluded platforms as affinity-based rather than antibody-based. No score, weight, or recommendation logic changed.' },
            { version: 'v4.0', date: 'September 7, 2026', notes: 'Added the All Platforms tab: a catalog of 46 protein measurement platforms that situates the six APT-assessed platforms within the broader landscape. A single sortable table carries the evaluation level of each platform (APT-assessed, integration-readiness candidate, targeted panel, early technology, enabling instrument, or retired), its content-list type (fixed, configurable, or open), and an integration-readiness score for the candidates. Targeted or configurable panels with no fixed large content list are catalogued for completeness but not ranked; nine pre-commercial or not-yet-independently-validated platforms are catalogued as early technologies with no score or rank; and mass-spectrometry instrument lines and sample-preparation chemistries are listed as an enabling layer rather than ranked as platforms, so the same measurement is not double-counted. Each entry shows the platform\'s availability status and opens a detail panel; the six content-list-anchored platforms link through to their full Platform Comparison score. No change to the six-platform scores or either recommendation engine. See the new Platform Catalog and Integration-Readiness section for the full rubric.' },
            { version: 'v3.7', date: 'September 6, 2026', notes: 'Usability, accessibility, and reliability pass; no score, weight, or engine change. Fixed two bugs: the platform detail panel could open scrolled off-screen and trap the page (it now anchors to the viewport), and the Protein Coverage browser could load indefinitely if its data request failed (it now shows a retry). Accessibility: keyboard focus is visible again on the tab bar and search inputs, the platform detail overlays announce as dialogs and manage focus, the tab bar and the Help Me Choose question cards and sliders carry proper roles and labels, and the reduced-motion setting now also stops the tab and panel transitions. Help Me Choose keeps each step in the browser history, so Back and Forward move between steps instead of discarding answers. The Overview adds a second entry point to Help Me Combine, and its main button now reads "Get a platform recommendation". The Platform Comparison view toggle now shows which mode is selected on load. The Protein Coverage tab leads with search: the cross-platform overlap view and the CSV export are controls in the filter row rather than full-width banners, a coverage filter for proteins measured by all six platforms was added, and the platform data notices moved below the table. Site-wide: a clearer type-weight hierarchy and several color-contrast fixes.' },
            { version: 'v3.6', date: 'September 5, 2026', notes: 'Presentation and documentation only; no score, weight, or engine change. Added a section navigation rail to the Methods and Reproducibility pages. Documented the cost-efficiency score as commercial price bands at volume (5 = under about $75 per sample; down to 1 = above about $3,000), with the same bands shown on the cost slider and in the downloadable engine specification. Added a footnote wherever protein counts appear, noting that counts differ in kind across technologies and are mapped to UniProt identifiers for comparison. The quantification axis now reads as a level rather than a score out of 5, since its values are an ordered readout class, not a quality gradient. Platform radar profiles now render as outlines rather than filled areas, with a note that the axes are independent and the enclosed shape is not a summary statistic. "Sample flexibility" is now labelled "multi-matrix validation" in the prose, matching the score name used since v2.5. Some dense passages were tightened for readability.' },
            { version: 'v3.5', date: 'September 5, 2026', notes: 'One platform score was corrected and one tissue-specific score adjustment was removed, after an evidence review. The scoring formula, axis weights, and fairness simulation are otherwise unchanged. Biognosys TrueDiscovery\'s cost-per-sample score was updated from 2 to 3. The old "2" was based on older service quotes that no longer reflect current pricing: peer-reviewed and publicly documented pricing now places the broad discovery platforms (Olink Explore HT, SomaSeq, Seer Proteograph XT, and Biognosys) in the same commercial price band at volume, so Biognosys no longer sits a tier below the rest on cost. Olink Explore HT and SomaSeq are no longer downgraded in tissue. The engine previously overrode their multi-matrix validation score down to 2 for tissue samples; that tissue-specific downgrade was removed, so they keep their standing 3 (their general multi-matrix validation score) in tissue as well. The old downgrade penalised them for not running native solid-tissue mass-spectrometry workflows, but homogenate and lysate input is the normal way these affinity assays are run on tissue, and both have published tissue work. Platforms with no published solid-tissue validation (Alamar NULISA, Nomic Omni, and Seer Proteograph XT) keep a tissue score of 1. Help Me Choose results shift toward more statistical ties rather than a single named winner; Help Me Combine is unchanged.' },
            { version: 'v3.4.1', date: 'September 5, 2026', notes: 'Help Me Combine: renamed the "quality" axis label from Measurement quality to Combined measurement score, and its priority group from Measurement quality to Measurement properties, to distinguish the computed axis, an average across both platforms, from the individual measurement properties that feed into it. Labelling only: the underlying axis key, weighting, scoring logic, and every displayed score and ranking are unchanged.' },
            { version: 'v3.4', date: 'August 11, 2026', notes: 'Help Me Choose: the automatic per-visit log (see v3.3) now also records city (alongside country), and the study context and priority weights entered in Steps 1-2, for every visit regardless of whether "About you" is filled in. This is disclosed, not silent: a note now sits directly under the Results page\'s summary of what was entered, stating what is logged and that no name or contact details are included unless submitted separately. Skipping "About you" still means skipping your name; it no longer implies skipping everything else too. Career and identity fields (name, email, institution, career type and stage, expertise, familiarity) remain voluntary-only and are unaffected. No scoring, weighting, or recommendation logic changed.' },
            { version: 'v3.3', date: 'August 11, 2026', notes: 'Help Me Choose: the About you step is no longer required to see a recommendation. It now appears as its own step, About you (optional), with two equally-weighted actions, Skip and see results and Submit and see results, in place of a form that previously had to be completed and submitted before results were shown. Every recommendation is now also recorded automatically regardless of whether a user completes this step: a timestamp, country (derived server-side from the request, never entered or seen by the visitor), the recommended platform, and whether the result was a tie, written to a dedicated database with no name, email, institution, or other identifying field. This is separate from, and does not change, the pre-existing optional submission (the same form, now un-gated) that emails a fuller profile only when a user chooses to fill it in and submit. No scoring, weighting, or recommendation logic changed.' },
            { version: 'v3.2.1', date: 'July 30, 2026', notes: 'Added a third downloadable bundle to the Reproducibility tab: source data behind the companion preprint\'s Figure 6 pathway-specialisation and pair cost-coverage-frontier panels (6C, 6D) and Supplementary Table S11, plus the full pathway-by-platform enrichment table and pathway-by-pair coverage table those panels are drawn from (7 files, 1,285 testable pathways, 1,393 pathways with pair-coverage data, 6 platforms). These are descriptive analysis outputs, not an input to either recommendation engine, and are a separate file set from the app\'s Reactome pathway selector feature (public/pathways/, v3.2), though both use the same canonical-proteome coverage denominator, stated explicitly on the Reproducibility tab for a reader recomputing the figures. Also corrected two stale engine-version references on the Reproducibility tab left over from the v3.2 spec-file bumps (v3.0 to v3.1, v2.10 to v2.11).' },
            { version: 'v3.2', date: 'July 30, 2026', notes: 'Added a Reactome pathway selector to both Help Me Choose and Help Me Combine: users can now narrow to a specific biological pathway (811 named human pathways, Reactome ContentService) instead of, or alongside, manually listing target proteins. In Help Me Choose, a selected pathway\'s gene list enters the exact same input as a manually typed list, carrying the same weight of 6 and the same coverage hard filter; no new weight, axis, or scoring branch was introduced. In Help Me Combine, pathway coverage is shown only as a descriptive figure alongside each pair\'s existing composite score, with an optional toggle to re-order, not rescore, the ranked list by it; it is not one of the seven composite axes, the eleven priorities, or a coverage denominator, so the composite formula and the published priority sweep are unchanged. This code path is not exercised by either fairness sweep, for the same reason the existing protein-target search is not: the downloadable results format does not record which genes, if any, a respondent searched for or selected. See Pathway Selector (Reactome), above, for the full disclosure, including the Reactome annotation-density caveat. Also fixed a stale sentence in the Platform Combination Engine section that still described the random-weight sweep retired in v3.1 as an active part of the current analysis; the text now matches its already-retired status.' },
            { version: 'v3.1', date: 'July 30, 2026', notes: 'Help Me Combine: denominator correction and reproducibility cleanup. The Atlas-union coverage denominator was corrected from 15,128 to 15,123: MAPT (P10636) had six separate entries in the underlying protein list, one real protein plus five NULISA-only phospho-tau assay entries, that collapse to a single distinct UniProt accession on dedup. All Atlas-union coverage percentages (6 platforms, 15 pairs) were regenerated against the corrected denominator; five pairs shifted by 0.1pp. Separately, the random-weight sweep was retired from the reproducibility bundle: two of the engine\'s seven axis weights (sample volume, tissue fit) are zero by default and reachable only when a user explicitly selects them, so a uniform random draw over all seven does not represent a weighting the priority picker can actually produce (it placed Nomic Omni + Seer Proteograph XT 4th, versus 1st under the real priority sweep) and was never reported in the paper; the priority sweep and bootstrap coverage CIs, which use an independent RNG stream, are unaffected. Minor UI polish: font sizing brought in line with Help Me Choose, setup checklist steps reworded as questions, and the tier badges (Leading choice / Strong contender / Situational / Not recommended) now show a hover explanation of the specific platform-level reason behind each pair\'s classification, for example which axis it is strongest and weakest on, and why.' },
            { version: 'v3.0', date: 'July 29, 2026', notes: 'Help Me Choose: three corrections to the fairness simulation and recommendation engine, found during a full re-validation against the unchanged score matrix. (1) Simulation tallying: "win" is now defined identically to the app\'s own tie logic (exactly one platform within the 3-point tie band of the leader, not just the numerically highest score), with ties reported as a separate co-recommended statistic rather than blended into a single "top-tier rate." The baseline is also now weighted by observed prevalence across all four axes (goal, sample type, study size, toggle state) among 65 real respondents rather than treated as uniform, since equal weighting had inflated platforms whose strength concentrates in rare scenarios and understated platforms strong in common ones: Alamar NULISA\'s simulated outright rate falls from 23.7% to 4.8% under the corrected weighting, and Seer Proteograph XT, strong across the most common real-world profiles, becomes the clear leader on both statistics (38.3% co-recommended, 13.5% outright, up from 9.7%). (2) The priority-miss penalty (0.85× when a platform scores 1/5 on a prioritised dimension) now gates on the user\'s own slider value rather than the context-boosted effective weight, so an automatic goal-based adjustment can no longer trigger a penalty the user never asked for; the large/extra-large study-size boost to cost and throughput is halved (xlarge +1, large +0.5, previously +2/+1), correcting a double-stack that happened to favor Nomic nELISA\'s strongest dimensions. (3) The tissue sample-flexibility weight (8) was disproportionate against the same weight for other atypical matrices (5 each) and could override an explicit user priority outright; it now matches at 5. The priority-miss penalty was also extended to fire whenever a platform has no published validation for the selected matrix at all, closing a related gap: the engine could still recommend such a platform on unrelated cost or throughput strength alone (Nomic nELISA\'s tissue outright rate falls from 3.28% to 0% as a result). None of these corrections changed any platform score; all are corrections to how inputs translate into effective weights or how the simulation tallies results. The previous methodology is retained in the reproducibility bundle as a documented, superseded reference. Also in this release: the Combine composite score is now shown explicitly as a percentage everywhere pairs are ranked, and reproducibility bundles for both engines are consolidated into a new Reproducibility tab.' },
            { version: 'v2.9', date: 'July 26, 2026', notes: 'Help Me Combine rebuilt for six platforms (15 pairs, up from ten): Seer Proteograph XT and Biognosys TrueDiscovery are now modelled as independent mass-spectrometry platforms, each scored against its own accession-level coverage list, rather than merged into a single "mass spectrometry" category. Added a fourth coverage denominator, FDA-approved biomarkers (217 proteins; Bhowmick et al. 2021, J Proteome Res, PMC8041396). Pair coverage is now computed exactly for all four numeric denominators; the independence-model estimate previously used for the canonical-proteome and Atlas-union denominators (which structurally overstated coverage for overlapping platforms) has been removed. The fairness sweep, coverage bootstrap confidence intervals, and tier assignments were regenerated from scratch against the documented methodology, and a routine reproducibility audit confirmed the new results reproduce byte-for-byte from the shipped script; the prior tier labels (which had shown SomaSeq + Mass Spec as a sole Tier-1 "leading choice") predated that audit and are superseded. Under the newly verified sweep, no pair reaches Tier 1, and Nomic Omni + Seer Proteograph XT leads a genuinely close field. See the companion fairness note (APT_Combine_Fairness_v2.9.md) for the full analysis. All downloadable reproducibility files (engine specification, sweep script, sweep outputs, and a newly added coverage-CI table) were regenerated and verified to reproduce each other exactly.' },
            { version: 'v2.8', date: 'July 25, 2026', notes: 'Biognosys TrueDiscovery protein list rebuilt: replaced the PQ500 spectral-library-derived list (581 proteins) with the published, matched-cohort list from Ahadi, Kirsher et al. 2025 (Communications Chemistry, Supplementary Data 8, MS-HAP Depletion arm), 3,575 proteins by primary UniProt accession. This reflects Biognosys\'s standard depletion workflow; it is stated explicitly, in the Protein Coverage tab and the evidence base, as a conservative lower bound relative to the ~7,000 protein groups Biognosys reports for its higher-depth P2 enrichment workflow (that headline capability figure is unchanged). 100 proteins were new to the Atlas, added with UniProt-resolved gene symbols and names; 62 proteins lost Biognosys membership as not present in the new cohort, of which 8 were Biognosys-only under the old list and were removed from the database entirely (IGLC3, IGLC6, MPP4, GSG1, FREM3, TTC39A, and two immunoglobulin/heat-shock entries without a single canonical gene symbol). The Atlas now holds 15,128 unique proteins (up from 15,036). No other platform\'s data changed and no scores changed; Biognosys is not a separate coverage-bearing platform in Help Me Combine, so the combine engine and its fairness figures are unaffected.' },
            { version: 'v2.7', date: 'July 24, 2026', notes: 'Minor update. Help Me Choose: Evidence Depth is no longer folded into the composite match score. Confidence in a measurement is not an attribute of the measurement itself: Evidence Depth records which of two situations dominated when scores were anchored (peer-reviewed head-to-head data vs. manufacturer white papers or unpublished datasets), and so describes the epistemic status of the other nine scores rather than any property of the platform itself. Including it in the composite systematically penalised newer platforms for commercial immaturity rather than technical deficiency, since published volume accumulates with installed base and time on market. It remains visible as a standalone dimension in the radar chart and detail panels; readers reweighting the matrix for their own purposes should treat it as a modifier on the nine technical scores. Help Me Combine already defaulted Evidence Depth weight to zero; this change brings Help Me Choose into alignment.' },
            { version: 'v2.6', date: 'July 16, 2026', notes: 'Added the Help Me Combine tab: an engine for choosing which two platforms to run together, either by adding a second platform to one you already have or by finding the strongest pair from scratch. It reuses the Atlas dimension scores and ranks the ten platform pairs on coverage (against a selectable denominator: ChEMBL drug targets, the SwissProt canonical proteome, or the Atlas detectable-proteome union), net-new complementarity, quality, class balance, and cost. The user picks up to three priorities that set the weights, so no axis is privileged by default (an advanced panel exposes every weight and the eight quality sub-dimensions). Output is tiered rather than a single winner, with bootstrap coverage confidence intervals and co-leading treatment for pairs that are statistically tied. Mass spectrometry is modelled as one category (Seer list); Biognosys is not a separate coverage platform. See the Platform Combination Engine section above for details.' },
            { version: 'v2.5', date: 'June 18, 2026', notes: 'Platform renamed: Illumina Protein Prep is now SomaSeq, reflecting the 2026 Illumina rebrand of the NGS SOMAmer assay (the 9,500-target Protein Coverage list is the SomaSeq panel). Most published evidence still derives from the legacy array-based SomaScan readout, which is noted throughout. The "Sample Flexibility" scoring dimension was renamed "Multi-Matrix Validation" (breadth of sample matrices with published validation); no scores changed, and the rationale was expanded to explain how each platform scores. Corrected a note that implied all MS platforms score higher on matrix breadth: Seer Proteograph XT is MS but biofluid-only, so it scores 3 (solid tissue requires the separate Proteograph DIRECT product).' },
            { version: 'v2.4', date: 'June 12, 2026', notes: 'Help Me Choose: corrected how quantification is handled. (1) The "absolute quantification required" hard filter previously excluded only platforms scoring below 3/5 on quantification type, which let semi-quantitative platforms through, including Seer Proteograph XT, whose standard output is label-free DIA (relative abundance), not physical concentrations. It now filters to platforms that actually deliver validated absolute quantification in physical concentration units: among the scored products, Nomic nELISA (ELISA-calibrated pg/mL). (2) The quantification-type axis was clarified: 4 = physical concentration (Nomic); 3 = proteome-wide comparable label-free MS, which supports cross-protein comparison but is not a concentration (Seer, Biognosys); 2 = within-assay relative units (Olink NPX, SomaScan RFU, NULISA NPQ). NULISA was moved from 3 to 2 to match its relative count-based output, the only platform score that changed; no weights changed. (3) Several vendors offer absolute quantification via separate products not scored here: Olink (Flex / Target 48 panels), Alamar (NULISAseq AQ panels), and Biognosys (TrueSignature targeted MS). These are now noted where the scored relative product is filtered out.' },
            { version: 'v2.3', date: 'June 11, 2026', notes: 'Help Me Choose: match scores are now reported on a calibrated, honest scale. Percentages are anchored to the full meaningful range for your weighting (a platform scoring 1/5 on every weighted dimension reads as 0%, one scoring 5/5 across the board reads as 100%), replacing the earlier range-normalization that always pinned the top platform to 100% and floored the rest at 40%. The displayed gap between platforms now reflects the true difference in fit, which is legitimately small when priorities are evenly weighted and widens as priorities become more specific. Platforms whose scores fall within 3 points of the leader are grouped as a co-equal "top tier" rather than crowned as a single winner, since calibrated margins are typically only a point or two; a sole winner is shown only when one platform genuinely separates from the field. No platform scores, weights, or rankings changed.' },
            { version: 'v2.2', date: 'June 11, 2026', notes: 'Protein Coverage Browser: new download tools. Proteins exclusive to a single platform (captured by that one panel and no other) can now be exported as CSV from a dedicated "platform-exclusive protein lists" panel, one file per platform; the current filtered table view can also be downloaded as CSV (columns: UniProt ID, gene, protein name, platforms). Data update: the Nomic nELISA / Omni 1000 protein list was refreshed to the Omni 1000 v2.1 marker list (2026.03.31), expanding Nomic-mapped coverage from 987 to 1,058 proteins. 79 proteins gained Nomic membership, including four new to the Atlas (S1PR1, SOAT1, CDK6, FOXA2), and 8 were dropped where the v2.1 list no longer lists them; one of those (NRCAM), previously Nomic-only, was removed from the database, which now holds 15,036 unique proteins (up from 15,033). Nomic continues to clear the >1,000-protein coverage rubric, so no platform scores or rankings changed. Accessibility & readability: secondary and caption text was darkened from #a3a19d to #6f6d67, raising contrast on white from 2.6:1 to 5.2:1 (meeting the WCAG AA threshold) across labels, captions, and helper text, with the dark-header byline lightened correspondingly to stay high-contrast; radar (spider) chart axis labels were enlarged and darkened for legibility. No scores changed.' },
            { version: 'v2.1', date: 'April 16, 2026', notes: 'Minor update. Methods tab: development process flowchart added below About This Tool, illustrating the five-step iterative pipeline from evidence curation through real-world validation. Olink Reveal "also consider" callout repositioned to appear directly beneath the nELISA recommendation tile. Platform display name standardised to "Illumina Protein Prep (SomaScan)" throughout.' },
            { version: 'v2.0', date: 'April 14, 2026', notes: 'Major update informed by feedback from almost 50 real-world scientists and additional literature review. Score changes: NULISA precision 3→5 and specificity 5→4 (Kirsher/Ahadi et al. 2025 head-to-head data); Illumina Protein Prep (SomaScan) specificity 1→2 (removes artefactual priority-miss penalty in discovery scenarios; true specificity concern captured by 2/5 score) and pQTL accuracy 3→2 (aptamer binding QTL artifact risk); Nomic nELISA coverage 1→2 (protein count rubric: ~1,100 proteins exceeds 1,000 threshold) and sensitivity 4→3 (sandwich ELISA vs PEA sensitivity evidence gap). Goal weight updates: discovery goal coverage boost increased (+1→+2, reflecting proteome breadth as a core discovery requirement); population proteomics goal added coverage boost (+1). Questionnaire: dual neuro/pTau toggle system replaced with single CNS biomarker toggle (sens+6/spec+2 non-CSF; sens+8/spec+4 CSF); longitudinal/repeat sampling toggle added (prec+2). Fairness simulation: toggle system updated from 4-state neuro×pTau to 4-state CNS×longitudinal; absolute quantification usage weights recalibrated to n=45 survey data (no=28.9%, preferred=60.0%, required=11.1%); secondary fairness check (plasma + discovery + large/xlarge) added, confirming no platform exceeds 28% in the most prevalent real-world user profile.' },
            { version: 'v1.2.2', date: 'April 12, 2026', notes: 'Methods documentation updated: absolute quantification exclusion from fairness simulation updated to reflect empirically observed prevalence (6.8% of survey respondents required it, versus prior 15% estimate); sensitivity analysis added confirming that including the toggle shifts win-shares by <1pp and does not alter rankings. Scores-are-relative notice added to Methods tab.' },
            { version: 'v1.2.1', date: 'April 8, 2026', notes: 'Added Sissala et al. (2025, Communications Chemistry) to the evidence base: the largest MS–Olink head-to-head comparison by overlapping proteins (n=1,129), reporting a median cross-platform Spearman correlation of ρ=0.59. No platform scores changed.' },
            { version: 'v1.2.0', date: 'April 7, 2026', notes: 'Proteograph XT protein list updated to Seer\'s full identification dataset (PDC, April 2026): 10,698 protein groups, up from the previously cited ~8,511 (Pietzner et al.). Protein browser and platform overview updated accordingly. Database expanded from 12,331 to 15,030 total entries (isoform variants collapsed into canonical accessions).' },
            { version: 'v1.1.3', date: 'April 6, 2026', notes: 'Added "More details" button to each platform tile on the Overview tab, alongside the existing "View protein list" button.' },
            { version: 'v1.1.2', date: 'April 5, 2026', notes: 'UI refinements: slimmer header (reduced icon, title, and logo sizes), updated favicon, prominent overlap banner in Protein Coverage tab, autocomplete search, and Biognosys study-dependent protein count callout.' },
            { version: 'v1.1.1', date: 'April 4, 2026', notes: 'Favicon updated to match current colour palette.' },
            { version: 'v1.1', date: 'April 3, 2026', notes: 'Platform recommendation percentages updated to use range-based normalization (floor 40%, winner 100%), improving visual separation between platforms and making score differences more informative. No changes to underlying scores or rankings.' },
            { version: 'v1.0', date: 'April 2, 2026', notes: 'Initial public release. 6 platforms, 9 scoring dimensions, 8 head-to-head studies. Overview, Comparison, Evidence Base, Help Me Choose, and Methods tabs.' },
          ].slice(0, showAllVersions ? undefined : 4).map((entry, i, arr) => (
            <div
              key={entry.version}
              className="flex items-start gap-4 py-3"
              style={{ borderBottom: i < arr.length - 1 ? '1px solid #f3f2f0' : 'none' }}
            >
              <div className="flex-shrink-0 text-right" style={{ minWidth: 80 }}>
                <span className="text-xs px-2 py-0.5"
                  style={{ background: 'rgba(139,26,26,0.08)', color: '#8B1A1A', fontWeight: 400 }}>
                  {entry.version}
                </span>
              </div>
              <div>
                <p className="text-xs mb-0.5" style={{ color: '#141310', fontWeight: 500 }}>{entry.date}</p>
                <p className="text-xs leading-relaxed" style={{ color: '#52504a', fontWeight: 400 }}>{entry.notes}</p>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => setShowAllVersions(v => !v)}
          className="block text-xs mt-4 hover:underline focus:outline-none focus:underline"
          style={{ color: '#8B1A1A', fontWeight: 400 }}
        >
          {showAllVersions ? 'Show fewer versions' : 'Show full version history'}
        </button>
        <p className="text-xs mt-4" style={{ color: '#6f6d67', fontWeight: 400 }}>
          Evidence base and scoring are reviewed monthly. Platform additions and major score revisions are noted in the changelog.
        </p>
      </SectionCard>

    </SectionLayout>
  )
}
