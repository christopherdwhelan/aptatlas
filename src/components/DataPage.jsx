import SectionLayout from './SectionLayout'
import RouteLink from './RouteLink'
import { SectionCard, SectionHeading } from './Reproducibility'
import { APP_VERSION, LAST_UPDATED } from '../version'
import { SITE_URL } from '../siteConfig'
import { ARCHIVE_DOI, CITATION, DATA_CHANGELOG, DATA_FILES, LICENCE_URL, SCORING_PROVENANCE, CLASS_BALANCE_PROVENANCE, fileName, schemaName } from '../dataFiles'

// The single-file build has no /data folder beside it, so its links go to the live site.
const BASE = import.meta.env.VITE_HASH_NAV === 'true' ? `${SITE_URL}/data` : '/data'

const SECTIONS = [
  { id: 'data-files', label: 'Files' },
  { id: 'data-urls', label: 'URLs and versions' },
  { id: 'data-mcp', label: 'MCP server' },
  { id: 'data-licence', label: 'Licence' },
  { id: 'data-citation', label: 'Citation' },
  { id: 'data-scores', label: 'Where the scores come from' },
  { id: 'data-changelog', label: 'Changelog' },
]

const bodyStyle = { color: '#52504a', fontWeight: 400 }
const linkStyle = { color: 'var(--color-brand-500)' }
const code = { background: 'rgba(20,19,16,0.06)', padding: '1px 5px', overflowWrap: 'anywhere' }

function FileCard({ file }) {
  const name = fileName(file)
  return (
    <div className="border border-[#e5e4e2]" style={{ padding: '13px 15px' }}>
      <h3 style={{ color: '#141310', fontWeight: 500, fontSize: 13 }}>{file.title}</h3>
      <p className="mt-1.5" style={{ color: 'var(--color-surface-400)', fontWeight: 400, fontSize: 12, lineHeight: 1.45 }}>{file.desc}</p>
      <p className="mt-2 flex flex-wrap gap-x-4" style={{ fontSize: 12 }}>
        <a className="apt-tap font-mono hover:underline [overflow-wrap:anywhere]" href={`${BASE}/${name}`} style={linkStyle}>{name}</a>
        <a className="apt-tap hover:underline" href={`${BASE}/${schemaName(file)}`} style={linkStyle} aria-label={`Schema for ${name}`}>Schema</a>
      </p>
    </div>
  )
}

export default function DataPage() {
  return (
    <SectionLayout sections={SECTIONS}>
      <div className="px-6 py-5 mb-5" style={{ background: 'rgba(139,26,26,0.04)', borderLeft: '4px solid var(--color-brand-500)' }}>
        <h2 className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--color-brand-500)', fontSize: 10, letterSpacing: '0.08em', fontWeight: 400 }}>
          Data
        </h2>
        <p className="text-sm leading-relaxed" style={bodyStyle}>
          The data behind the atlas, as versioned files you can download and reuse. Each file is generated from
          the same sources the site reads when the site is built, so the two cannot disagree. Each one states its
          version, date and licence, and each has a JSON Schema beside it. This is release {APP_VERSION}, last
          updated {LAST_UPDATED}. For research use only; scores and recommendations reflect the authors' assessment
          of published literature.
        </p>
      </div>

      <SectionCard id="data-files">
        <SectionHeading>Files</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {DATA_FILES.map(f => <FileCard key={fileName(f)} file={f} />)}
        </div>
      </SectionCard>

      <SectionCard id="data-urls">
        <SectionHeading>URLs and versions</SectionHeading>
        <p className="text-sm leading-relaxed mb-3" style={bodyStyle}>
          Files at <code style={code}>/data/</code> are always the latest release. Files
          at <code style={code}>/data/{APP_VERSION}/</code> are frozen and do not change, so cite or pin those when
          you need a result to stay reproducible. The build fails if published data changes without a new version.
        </p>
        <p className="text-sm leading-relaxed" style={bodyStyle}>
          The <a className="hover:underline" href={`${BASE}/manifest.json`} style={linkStyle}>manifest</a> lists every
          file in the release with its schema, size and SHA-256.
        </p>
      </SectionCard>

      <SectionCard id="data-mcp">
        <SectionHeading>MCP server</SectionHeading>
        <p className="text-sm leading-relaxed mb-3" style={bodyStyle}>
          <code style={code}>aptatlas-mcp</code> lets AI assistants and other tools query this data and run the same
          recommendation engines as this site. It runs on your own machine from data pinned to one release, makes no
          network calls and logs nothing. Its results are tested against the published fairness files, byte for byte.
        </p>
        <p className="text-sm leading-relaxed" style={bodyStyle}>
          Install and configuration instructions are in its{' '}
          <a className="hover:underline" href="https://github.com/christopherdwhelan/aptatlas/tree/main/tools/mcp" style={linkStyle}>README</a>.
        </p>
      </SectionCard>

      <SectionCard id="data-licence">
        <SectionHeading>Licence</SectionHeading>
        <p className="text-sm leading-relaxed mb-3" style={bodyStyle}>
          The files are released under <a className="hover:underline" href={LICENCE_URL} style={linkStyle}>CC BY 4.0</a>,
          with these sources noted in each file's <code style={code}>third_party</code> field:
        </p>
        <ul className="text-sm leading-relaxed list-disc pl-5 space-y-1" style={bodyStyle}>
          <li>
            <strong style={{ fontWeight: 500 }}>ChEMBL (CC BY-SA 3.0):</strong> some fields in <code style={code}>helpMeCombine.json</code> and{' '}
            <code style={code}>combine_engine_spec.json</code> are derived from ChEMBL. Each file lists them by path.
          </li>
          <li><strong style={{ fontWeight: 500 }}>UniProt (CC BY 4.0):</strong> accessions, gene symbols and protein names.</li>
          <li><strong style={{ fontWeight: 500 }}>Reactome (CC0):</strong> pathway membership.</li>
        </ul>
        <p className="text-sm leading-relaxed mt-3" style={bodyStyle}>
          The <RouteLink tab="unassayed" className="hover:underline" style={linkStyle}>Unassayed Proteome</RouteLink> list
          is not part of this release. Its files and their attribution stay on that page.
        </p>
      </SectionCard>

      <SectionCard id="data-citation">
        <SectionHeading>Citation</SectionHeading>
        <p className="text-sm leading-relaxed mb-3" style={bodyStyle}>{CITATION}</p>
        <p className="text-sm leading-relaxed" style={bodyStyle}>
          Software and data archive, all versions:{' '}
          <a className="hover:underline [overflow-wrap:anywhere]" href={`https://doi.org/${ARCHIVE_DOI}`} style={linkStyle}>https://doi.org/{ARCHIVE_DOI}</a>
        </p>
      </SectionCard>

      <SectionCard id="data-scores">
        <SectionHeading>Where the scores come from</SectionHeading>
        <p className="text-sm leading-relaxed mb-3" style={bodyStyle}>{SCORING_PROVENANCE}</p>
        <p className="text-sm leading-relaxed mb-3" style={bodyStyle}>{CLASS_BALANCE_PROVENANCE}</p>
        <p className="text-sm leading-relaxed" style={bodyStyle}>
          The full account is in <RouteLink tab="methods" className="hover:underline" style={linkStyle}>Methods</RouteLink>, and
          the scripts that regenerate the fairness results are on <RouteLink tab="reproducibility" className="hover:underline" style={linkStyle}>Reproducibility</RouteLink>.
          In <code style={code}>evidence.json</code>, a claim with a <code style={code}>source.version</code> of{' '}
          <code style={code}>unverified</code> has not been confirmed against the published version of the paper.
        </p>
      </SectionCard>

      <SectionCard id="data-changelog">
        <SectionHeading>Changelog</SectionHeading>
        <ul className="text-sm leading-relaxed space-y-2" style={bodyStyle}>
          {DATA_CHANGELOG.map(c => (
            <li key={c.version}><span style={{ color: '#141310', fontWeight: 500 }}>{c.version}</span>, {c.date}: {c.notes}</li>
          ))}
        </ul>
        <p className="text-sm leading-relaxed mt-3" style={bodyStyle}>
          The site's full version history is in <RouteLink tab="methods" className="hover:underline" style={linkStyle}>Methods</RouteLink>.
        </p>
      </SectionCard>
    </SectionLayout>
  )
}
