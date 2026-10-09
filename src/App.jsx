import { useState, useEffect } from 'react'
import { Analytics, track } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import Header from './components/Header'
import TabNav from './components/TabNav'
import Overview from './components/Overview'
import AllPlatforms from './components/AllPlatforms'
import Comparison from './components/Comparison'
import EvidenceBase from './components/EvidenceBase'
import ProteinBrowser from './components/ProteinBrowser'
import UnassayedProteome from './components/UnassayedProteome'
import HelpMeChoose from './components/HelpMeChoose'
import HelpMeCombine from './components/HelpMeCombine'
import Methods from './components/Methods'
import Reproducibility from './components/Reproducibility'

const VALID_TABS = ['overview', 'platforms', 'comparison', 'evidence', 'proteins', 'unassayed', 'chooser', 'combine', 'methods', 'reproducibility']

function getTabFromHash() {
  // The chooser wizard encodes its step as `#chooser/2` etc.; the tab is the part
  // before the slash, so step changes keep the same tab (and don't remount the wizard).
  const base = window.location.hash.slice(1).split('/')[0]
  return VALID_TABS.includes(base) ? base : 'overview'
}

export default function App() {
  const [activeTab, setActiveTab] = useState(getTabFromHash)
  const [proteinFilter, setProteinFilter] = useState(null)
  // Search and scope handed to the Unassayed Proteome tab by a Protein Coverage lookup;
  // cleared when the tab is opened directly from the nav.
  const [unassayedInit, setUnassayedInit] = useState(null)

  // Keep URL hash in sync when tab changes programmatically
  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    window.location.hash = tabId
    track('tab_view', { tab: tabId })
  }

  const navigateToProteins = (platformId) => {
    setProteinFilter(platformId)
    handleTabChange('proteins')
  }

  const navigateToUnassayed = (search, scope) => {
    setUnassayedInit({ search, scope })
    handleTabChange('unassayed')
  }

  // Header version badge → Methods tab, scrolled to the changelog.
  // Methods remounts on tab change and plays a ~0.18s translateY fade (.tab-content in
  // index.css); scrolling mid-transform undershoots, so wait for it to settle, then glide.
  const navigateToChangelog = () => {
    handleTabChange('methods')
    setTimeout(() => {
      document.getElementById('version-history')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 240)
  }

  // Sync tab state if user navigates via back/forward
  useEffect(() => {
    const onHashChange = () => {
      const tab = getTabFromHash()
      setActiveTab(tab)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#ffffff' }}>
      <Header onVersionClick={navigateToChangelog} />
      <TabNav activeTab={activeTab} onTabChange={(tabId) => { setUnassayedInit(null); handleTabChange(tabId) }} />

      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-5 sm:py-6">
        {/* key={activeTab} triggers remount → CSS fade animation plays on each switch */}
        <div key={activeTab} className="tab-content" role="tabpanel" id="tabpanel" aria-labelledby={`tab-${activeTab}`}>
          {activeTab === 'overview'    && <Overview onNavigateToProteins={navigateToProteins} />}
          {activeTab === 'platforms'   && <AllPlatforms onCompareInDepth={() => handleTabChange('comparison')} />}
          {activeTab === 'comparison'  && <Comparison />}
          {activeTab === 'evidence'    && <EvidenceBase />}
          {activeTab === 'proteins'    && <ProteinBrowser key={proteinFilter} initialPlatform={proteinFilter} onOpenUnassayed={navigateToUnassayed} />}
          {activeTab === 'unassayed'   && <UnassayedProteome initialSearch={unassayedInit?.search} initialScope={unassayedInit?.scope} />}
          {activeTab === 'chooser'     && <HelpMeChoose />}
          {activeTab === 'combine'     && <HelpMeCombine />}
          {activeTab === 'methods'     && <Methods />}
          {activeTab === 'reproducibility' && <Reproducibility />}
        </div>
      </main>

      <footer className="px-4 sm:px-6 pt-4 pb-6 mt-auto" style={{ background: '#ffffff', borderTop: '1px solid #e5e4e2' }}>
        <div className="max-w-screen-xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-center sm:text-left" style={{ color: '#6f6d67', fontWeight: 400 }}>
            © 2026 Ignition Scientific LLC&nbsp;&middot;&nbsp;
            <a href="https://ignitionscientific.com" target="_blank" rel="noopener noreferrer"
              style={{ color: '#8B1A1A' }}>
              ignitionscientific.com
            </a>
          </p>
          <p className="text-xs text-center sm:text-right" style={{ color: '#6f6d67', fontWeight: 400 }}>
            For research use only. Not for clinical decision making.
          </p>
        </div>
        <div className="max-w-screen-xl mx-auto mt-2">
          <p className="text-[11px] leading-relaxed text-center" style={{ color: '#6f6d67', fontWeight: 400 }}>
            An independent resource, provided free of charge; not sponsored by, affiliated with, or endorsed by any platform or vendor named. Scores and recommendations reflect the authors' assessment of published literature, offered as opinion to guide study-design decisions, not definitive or commercial rankings, and not procurement, legal, or investment advice. Product and company names are trademarks of their respective owners, used for identification and comparison only. Provided without warranty; verify specifications and pricing with vendors. Believe something is inaccurate?{' '}
            <a href="mailto:chris@ignitionscientific.com" style={{ color: '#8B1A1A' }}>Email us</a>{' '}and we will review it. See Methods for full disclosure.
          </p>
        </div>
      </footer>
      <Analytics />
      <SpeedInsights />
    </div>
  )
}
