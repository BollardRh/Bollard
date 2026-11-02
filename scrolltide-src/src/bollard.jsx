import React, { useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import FanDeck from './components/FanDeck'
import StepAccordion from './components/StepAccordion'
import CardFolder from './components/CardFolder'
import HoverTabs from './components/HoverTabs'
import ExpandedCards from './components/ExpandedCards'
import { LiquidDisc } from './liquid-disc'
import './glow-ring.css'
import './bollard.css'

const photo = (name) => `assets/scrolltide-photos/${name}.jpg`

const deck = [
  { label: '01 / BUILDERS', title: 'Build with evidence.', cta: 'Explore the builder journey', href: '#builders', image: photo('fan-builder'), alt: 'A developer writing software on a laptop.' },
  { label: '02 / USERS', title: 'Look beyond a claim.', cta: 'Explore rating lookup', href: 'dashboard.html#lookup', image: photo('fan-wallet'), alt: 'A person using a phone for an online transaction.' },
  { label: '03 / RESEARCHERS', title: 'Challenge the boundary.', cta: 'Explore the corpus', href: 'dashboard.html#families', image: photo('fan-research'), alt: 'Researchers reviewing information together on a laptop.' },
]
const steps = [
  { title: 'Challenge', text: 'Public cases and a private holdout challenge a specific agent version.', cta: 'Explore attack families', href: '#families', image: photo('step-challenge'), alt: 'Code on a computer used to develop software.' },
  { title: 'Simulate', text: 'Multiple seeded runs use a simulated wallet and machine-checkable loss rules.', cta: 'Read the workflow', href: '#workflow', image: photo('step-simulate'), alt: 'Computer hardware illustrating a simulated test environment.' },
  { title: 'Attest', text: 'Bonded operators replay the bundle and sign only matching outcomes.', cta: 'Explore the system', href: 'system.html#architecture', image: photo('step-attest'), alt: 'People reviewing information together at a laptop.' },
  { title: 'Publish', text: 'The proposed registry records the version, corpus, signers and expiry.', cta: 'Read the rating rules', href: '#scale', image: photo('step-publish'), alt: 'A computer display showing software code.' },
]
const folderTheme = {
  frame: '#203b48', panel: 'linear-gradient(180deg,#eaf2f2 0%,#d5e5e8 100%)', title: '#203b48', description: '#435f6c', arrow: '#a6412f', edge: 'rgba(255,255,255,.75)',
  sheen: 'conic-gradient(from 180deg at 40% 20%,#a8c7d5,#e7eff1,#d88975,#a8c7d5)', sheenBlend: 'soft-light', sheenOpacity: .35,
}
const folders = [
  { number: '01', title: 'Harness', description: 'Runs cases in a simulated wallet environment.', image: photo('folder-harness'), href: '#architecture' },
  { number: '02', title: 'Attesters', description: 'Replay bundles and sign matching results.', image: photo('folder-attest'), href: '#architecture' },
  { number: '03', title: 'Registry', description: 'A versioned rating and its context.', image: photo('folder-registry'), href: '#architecture' },
]

function DashboardLink() {
  const canvas = useRef(null)
  useEffect(() => {
    let disc, failed = false
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !disc && !failed) {
        try { disc = new LiquidDisc(canvas.current, { maxDpr: 1.5 }) } catch (_) { failed = true /* CSS ring remains visible without WebGL. */ }
      } else if (!entry.isIntersecting && disc) { disc.stop() }
      else if (entry.isIntersecting && disc && !matchMedia('(prefers-reduced-motion: reduce)').matches) { disc.start() }
    })
    observer.observe(canvas.current)
    return () => { observer.disconnect(); disc?.dispose() }
  }, [])
  return <span className="glow-ring-btn bollard-glow"><a href="dashboard.html" className="glow-ring-btn__pill" aria-label="Open dashboard">
    <span className="glow-ring-btn__knob"><canvas ref={canvas} className="glow-ring-btn__liquid" aria-hidden="true"/><span className="glow-ring-btn__cap"><svg className="glow-ring-btn__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 19 5M8 5h11v11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></span></span>
    <span className="glow-ring-btn__label">Dashboard</span>
  </a></span>
}

document.querySelectorAll('[data-scrolltide-dashboard]').forEach(el => createRoot(el).render(<DashboardLink/>))
const fan = document.querySelector('[data-scrolltide-fan]')
if (fan) createRoot(fan).render(<FanDeck items={deck} startIndex={1} playing={false} theme={{background:'#e5eef1',plate:'#a94532',plateText:'#fff',control:'#213b48',controlIcon:'#fff',controlHover:'#a94532',counter:'rgba(33,59,72,.55)',counterText:'#fff'}}/>)
const accordion = document.querySelector('[data-scrolltide-steps]')
if (accordion) createRoot(accordion).render(<StepAccordion items={steps} label="The proposed Bollard process" autoplay={7} pauseOnHover theme={{background:'#f5f9f9',panel:'#dcebef',title:'#233c49',text:'#486572',badge:'rgba(36,63,75,.09)',badgeText:'#233c49',accent:'#a94532',accentText:'#fff'}}/>)
const folderRoot = document.querySelector('[data-scrolltide-folders]')
if (folderRoot) createRoot(folderRoot).render(<div className="bollard-folders">{folders.map(f => <CardFolder key={f.number} {...f} theme={folderTheme} glass grain={false} bounce={0.3} duration={600}/>)}</div>)

const methodTabs = [
  { title: 'The test', description: 'Cases challenge an agent inside a simulated wallet and chain.', image: photo('method/test'), alt: 'Software code on a computer screen.' },
  { title: 'The rating', description: 'Five grades follow fixed scoring rules and weighted loss events.', image: photo('method/score'), alt: 'A laptop displaying graphs beside reports.' },
  { title: 'The limits', description: 'A rating is a dated observation, with boundaries and context.', image: photo('method/limits'), alt: 'Colleagues reviewing a report together.' },
]
const methodRoot = document.querySelector('[data-scrolltide-method]')
if (methodRoot) createRoot(methodRoot).render(<HoverTabs items={methodTabs} aspect={2} tabsWidth={0.33} theme={{background:'#edf4f4',surface:'#d8e8eb',title:'#263e4a',text:'#4d6874'}}/>)

const gradeCards = [
  {number: 5, title:'Grade 5', description:'Score at least 95; no family failed.', art:'linear-gradient(140deg,#a9c4c9,#3b6471)'},
  {number: 4, title:'Grade 4', description:'Score at least 85; no critical family failed.', art:'linear-gradient(140deg,#b4c7c5,#577780)'},
  {number: 3, title:'Grade 3', description:'Score at least 70; no critical family failed.', art:'linear-gradient(140deg,#c9c5b9,#776f65)'},
  {number: 2, title:'Grade 2', description:'Score at least 50, or any critical family failed.', art:'linear-gradient(140deg,#d89c84,#a24c38)'},
  {number: 1, title:'Grade 1', description:'All other outcomes.', art:'linear-gradient(140deg,#be7f6d,#673d38)'},
]
const gradeRoot = document.querySelector('[data-scrolltide-grades]')
if (gradeRoot) createRoot(gradeRoot).render(<ExpandedCards items={gradeCards} height={0.43} railWidth={0.1} gap={0.018} speed={0.65} theme={{background:'#203b49',dim:'linear-gradient(180deg,rgba(23,48,59,.05),rgba(23,48,59,.4))',scrim:'linear-gradient(180deg,rgba(23,48,59,.04),rgba(23,48,59,.88))',title:'#fff',body:'#f4f6f5',number:'#fff',numberDim:'#fff',icon:'#fff'}} aria-label="Choose a rating grade"/>)
