import SectionLayout from './SectionLayout'

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

function DownloadGrid({ base, files }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {files.map(d => (
        <a key={d.file} href={`${base}/${d.file}`} download
          className="group block border border-[#e5e4e2] hover:border-[#8B1A1A] transition-colors"
          style={{ padding: '13px 15px' }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="uppercase" style={{ color: '#8B1A1A', fontSize: 10, letterSpacing: '0.08em', fontWeight: 600 }}>{d.type}</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#c4c2ba] group-hover:text-[#8B1A1A] transition-colors" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </div>
          <div style={{ color: '#141310', fontWeight: 500, fontSize: 13 }}>{d.title}</div>
          <div className="font-mono mt-0.5" style={{ color: '#6f6d67', fontWeight: 400, fontSize: 11.5 }}>{d.file}</div>
          <div className="mt-1.5" style={{ color: '#6f6d67', fontWeight: 400, fontSize: 12, lineHeight: 1.5 }}>{d.desc}</div>
        </a>
      ))}
    </div>
  )
}

const CHOOSE_FILES = [
  { file: 'choose_engine_spec.json', type: 'JSON', title: 'Engine specification', desc: 'Every scoring constant, goal adjustment, hard filter, prevalence weight, and the platform score matrix (engine v3.7).' },
  { file: 'regen_fairness.py', type: 'PY', title: 'Reproducible fairness script', desc: 'Regenerates all five result sets from the spec. Python 3, standard library only.' },
  { file: 'choose_real_world_data.csv', type: 'CSV', title: 'Anonymized real-world inputs', desc: '65 real Help Me Choose sessions: study design and priority weights only, no identifying fields.' },
  { file: 'choose_baseline_grid_results.csv', type: 'CSV', title: 'Baseline grid outputs (prevalence-weighted)', desc: 'Co-recommended rate and outright win rate per platform, 1,259,712 scenarios weighted by real-world goal/matrix/size/toggle prevalence.' },
  { file: 'choose_baseline_grid_uniform_legacy.csv', type: 'CSV', title: 'Baseline grid outputs (superseded, uniform)', desc: 'Same two statistics under the previous uniform-weighting methodology, n=314,928. Kept for audit only; do not use for reporting.' },
  { file: 'choose_secondary_check_results.csv', type: 'CSV', title: 'Secondary-check outputs', desc: 'Same two statistics for the plasma / discovery / large-xlarge slice, n=4,374.' },
  { file: 'choose_real_world_results.csv', type: 'CSV', title: 'Real-world rescoring outputs', desc: 'Same two statistics, computed from the 63 scored anonymized real sessions.' },
  { file: 'choose_tie_distribution.csv', type: 'CSV', title: 'Tie-group-size distribution', desc: 'Scenario-level: share of each dataset resolving to an outright win vs. a 2- through 6-way tie.' },
]

const COMBINE_FILES = [
  { file: 'combine_engine_spec.json', type: 'JSON', title: 'Engine specification', desc: 'Axes, default weights, and scoring formulas (engine v3.7).' },
  { file: 'regen_fairness.py', type: 'PY', title: 'Reproducible sweep script', desc: 'Regenerates the priority sweep and the coverage CIs from the spec. Seeded, Python 3, requires numpy.' },
  { file: 'fairness_priority_sweep.csv', type: 'CSV', title: 'Priority-sweep outputs', desc: 'Win, top-3, regret, and rank per pair and platform across 924 priority scenarios.' },
  { file: 'coverage_bootstrap_ci.csv', type: 'CSV', title: 'Coverage confidence intervals', desc: '2,000-resample bootstrap 95% CI per pair, drug-target denominator.' },
]

const PATHWAY_FILES = [
  { file: 'reactome_enrichment_by_platform.csv', type: 'CSV', title: 'Pathway enrichment by platform', desc: 'Hypergeometric enrichment of each platform\'s covered proteins against 1,285 testable Reactome pathways: observed vs. expected count, fold enrichment, and raw/FDR-adjusted p-values (n=6,713 platform-pathway rows, 6 platforms).' },
  { file: 'pathway_pair_coverage_full.csv', type: 'CSV', title: 'Per-pathway pair coverage', desc: 'Best single platform and best platform pair for every one of 1,393 pathways, each with its coverage percentage and the gain from pairing over the best single platform alone.' },
  { file: 'reactome_pathway_names.json', type: 'JSON', title: 'Pathway accession-to-name map', desc: 'Maps each Reactome stable identifier (e.g. R-HSA-1059683) to its full pathway name, 1,242 entries. The enrichment and pair-coverage files below carry their own name columns too, but the enrichment file\'s is blank for 817 of its 1,285 pathways; this map resolves 293 of those, leaving 524 (40.8%) identifiable by accession only.' },
  { file: 'panelC_specialisation.json', type: 'JSON', title: 'Figure 6C source data', desc: 'The 18 platform-pathway pairings behind Figure 6C: each platform\'s most specialised pathways, with coverage percentage, effective-coverage score, fold enrichment, and pathway size.' },
  { file: 'panelD_frontier.json', type: 'JSON', title: 'Figure 6D source data', desc: 'Per-pair druggable-assay count, median and 90th-percentile pathway coverage, and cost-coverage frontier membership, all 15 platform pairs.' },
  { file: 'supp_table_S11_class_coverage.csv', type: 'CSV', title: 'Supplementary Table S11 (protein-class coverage)', desc: 'Best single-platform and best-pair coverage by protein class, the six-platform union, and an affinity-vs-mass-spectrometry coverage-skew label, 11 classes.' },
  { file: 'druggable_target_family_partition.csv', type: 'CSV', title: 'Druggable-target family partition', desc: 'How the druggable target set splits by which platform family reaches it: affinity-only, mass-spectrometry-only, both, or neither (292 / 152 / 713 / 293).' },
]

const REPRO_SECTIONS = [
  { id: 'repro-choose', label: 'Help Me Choose' },
  { id: 'repro-combine', label: 'Help Me Combine' },
  { id: 'repro-pathway', label: 'Pathway coverage' },
  { id: 'repro-verify', label: 'Verifying a result' },
]

export default function Reproducibility() {
  return (
    <SectionLayout sections={REPRO_SECTIONS}>

      <div className="px-6 py-5 mb-5" style={{ background: 'rgba(139,26,26,0.04)', borderLeft: '4px solid #8B1A1A' }}>
        <p className="text-xs uppercase tracking-widest mb-2" style={{ color: '#8B1A1A', fontSize: 10, letterSpacing: '0.08em', fontWeight: 400 }}>
          Reproducibility
        </p>
        <p className="text-sm leading-relaxed" style={{ color: '#52504a', fontWeight: 400 }}>
          Every simulated or derived number this tool publishes (fairness win rates, co-recommendation rates,
          coverage sweeps, bootstrap confidence intervals) is reproducible from a downloadable engine
          specification and a self-contained script, without needing this repository or any part of the live
          app. This page collects that bundle for both recommendation engines, plus a separate descriptive
          pathway-coverage analysis that ships as source data rather than a spec-and-script pair (it feeds no
          engine, so there is nothing to regenerate), in one place. Platform scores themselves are not
          simulated; they are curated from published evidence and expert assessment, and their sourcing is
          documented dimension-by-dimension in Methods and per-study in the Evidence Base.
        </p>
      </div>

      <SectionCard id="repro-choose">
        <SectionHeading>Help Me Choose: recommendation engine fairness</SectionHeading>
        <p className="text-sm leading-relaxed mb-4" style={{ color: '#52504a', fontWeight: 400 }}>
          Covers a full deterministic 1,259,712-scenario baseline grid (goals, sample types, study sizes, and
          toggle states weighted by real-world prevalence, not treated as equally likely; see Methods), a
          4,374-scenario secondary check (plasma, biomarker discovery, large/extra-large study size, the
          single most prevalent real-world profile), and a rescoring of 65 anonymized real user sessions. The
          baseline grid and secondary check are complete enumerations, not samples, so they carry no seed and
          reproduce exactly; running{' '}
          <code style={{ background: 'rgba(20,19,16,0.06)', padding: '1px 5px' }}>regen_fairness.py</code>{' '}
          against the engine specification below regenerates all five result files byte-for-byte, including
          the previous uniform-weighting methodology, kept as a documented, superseded reference. Full
          methodology, including how outright win and co-recommended rates are defined, why an earlier
          version's win-rate tallying was revised twice, and why the baseline moved from uniform to
          prevalence-weighted, is in Methods.
        </p>
        <DownloadGrid base="/choose" files={CHOOSE_FILES} />
      </SectionCard>

      <SectionCard id="repro-combine">
        <SectionHeading>Help Me Combine: pairing engine fairness</SectionHeading>
        <p className="text-sm leading-relaxed mb-4" style={{ color: '#52504a', fontWeight: 400 }}>
          Covers a deterministic priority sweep (924 scenarios: every combination of up to three priorities,
          over all four coverage denominators), plus bootstrap confidence intervals on coverage. The priority
          sweep reproduces exactly, no seed involved; the bootstrap draws reproduce under the seed recorded in
          the script. A random-weight sweep was previously part of this bundle and has been withdrawn: two of
          the seven axis weights it drew uniformly are zero-weighted by default and reachable only when a user
          selects them, so it does not represent a weighting the priority picker can actually produce, and it
          is not reported in the paper. Full methodology is in Methods, under Platform Combination Engine.
        </p>
        <DownloadGrid base="/combine" files={COMBINE_FILES} />
      </SectionCard>

      <SectionCard id="repro-pathway">
        <SectionHeading>Pathway coverage analysis (Figure 6C, 6D, Supplementary Table S11)</SectionHeading>
        <p className="text-sm leading-relaxed mb-4" style={{ color: '#52504a', fontWeight: 400 }}>
          Source data behind Figure 6's platform-specialisation and pair cost-coverage-frontier panels (6C,
          6D) and Supplementary Table S11, together with the full pathway-by-platform and pathway-by-pair
          tables those panels are drawn from: 1,285 testable pathways checked for enrichment across 6
          platforms, and per-pathway coverage for all 15 platform pairs across 1,393 pathways. Pathway
          coverage throughout this bundle is computed against the canonical proteome, that is, each pathway's
          full Reactome membership; this matches the denominator used by the live pathway-coverage feature in
          Help Me Choose and Help Me Combine, so recomputing coverage from these files should use the same
          canonical reference set. These are descriptive
          analysis outputs, not an input to either recommendation engine: pathway coverage does not enter the
          Help Me Choose or Help Me Combine scoring formulas, and nothing in this bundle is consumed by either
          engine's reproducibility script. Full methodology for the enrichment and specialisation analysis is
          described in a companion preprint.
        </p>
        <DownloadGrid base="/pathway-analysis" files={PATHWAY_FILES} />
      </SectionCard>

      <div id="repro-verify" className="px-6 py-5" style={{ background: 'rgba(20,19,16,0.03)', borderLeft: '4px solid #141310', scrollMarginTop: 64 }}>
        <p className="text-xs uppercase tracking-widest mb-2" style={{ color: '#141310', fontSize: 10, letterSpacing: '0.08em', fontWeight: 500 }}>
          Verifying a result yourself
        </p>
        <p className="text-sm leading-relaxed" style={{ color: '#52504a', fontWeight: 400 }}>
          Download the engine specification and the script for the tool you want to check into the same
          folder, then run the script (<code style={{ background: 'rgba(20,19,16,0.06)', padding: '1px 5px' }}>python3 regen_fairness.py</code>).
          It writes its own output files and prints a summary table; compare either against the downloadable
          result files above. If you find a discrepancy, email{' '}
          <a href="mailto:chris@ignitionscientific.com" className="hover:underline" style={{ color: '#8B1A1A' }}>chris@ignitionscientific.com</a>{' '}
          with the script output and we will investigate.
        </p>
      </div>

    </SectionLayout>
  )
}
