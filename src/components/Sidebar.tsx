import { useExecutionStore } from '../store/executionStore'
import { SNIPPETS, LANGUAGE_LABELS } from '../data/snippets'
import type { Language } from '../types/execution'

const LANGUAGES: Language[] = ['javascript', 'python', 'java', 'c', 'cpp', 'pseudocode']

export default function Sidebar() {
  const { language, setLanguage, setCode } = useExecutionStore()

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column' }}>
      <div style={{ padding:'12px 10px 8px', borderBottom:'1px solid var(--border)' }}>
        <div style={{ fontSize:'10px', color:'var(--text-dim)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'6px' }}>Language</div>
        <select
          value={language}
          onChange={e => setLanguage(e.target.value as Language)}
          style={{ width:'100%', background:'var(--bg)', color:'var(--text)', border:'1px solid var(--border-active)', borderRadius:'var(--radius-sm)', padding:'5px 8px', fontFamily:'var(--font-ui)', fontSize:'12px', cursor:'pointer', outline:'none' }}
        >
          {LANGUAGES.map(l => <option key={l} value={l}>{LANGUAGE_LABELS[l]}</option>)}
        </select>
      </div>

      <div style={{ padding:'8px 10px 4px' }}>
        <div style={{ fontSize:'10px', color:'var(--text-dim)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Examples</div>
      </div>

      <div style={{ flex:1, overflow:'auto' }}>
        {SNIPPETS[language].map((s, i) => (
          <button
            key={i}
            onClick={() => setCode(s.code)}
            style={{
              display:'block', width:'100%', textAlign:'left', padding:'7px 10px',
              background:'none', border:'none', borderBottom:'1px solid var(--border)',
              color:'var(--text)', fontFamily:'var(--font-ui)', fontSize:'12px',
              cursor:'pointer', transition:'background 0.15s'
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}
