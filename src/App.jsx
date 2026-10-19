import { useEffect, useMemo, useState } from 'react';
import { apps, projectLinks } from './apps.js';
import { Search, Power, Minus, Square, X, ChevronRight, Sun, Moon, Folder, FileText, Globe, Mail, Monitor, Terminal as TerminalIcon } from 'lucide-react';

const initialWindows = {};
const startPosition = { x: 180, y: 72 };

// Keep app content separate from the shared shell so adding a new app is predictable.
function AppContent({ id, openApp, theme, setTheme }) {
  if (id === 'about') return <section className="page about"><div className="profile-mark">P.</div><p className="eyebrow">USER PROFILE</p><h1>Hey, I’m Prottush.</h1><p className="muted">Student · Builder · Climate advocate</p><div className="info-grid"><article><strong>Currently</strong><p>Learning, building projects, and working with student communities.</p></article><article><strong>Interested in</strong><p>Technology, civic ideas, climate action, and thoughtful design.</p></article></div><p className="callout">This is your personal desktop. Explore the folders and apps to learn more.</p></section>;
  if (id === 'explorer') return <section className="explorer"><aside className="sidebar"><b>Quick access</b><span>⌂ Home</span><span>▣ Desktop</span><span>▤ Documents</span><span>◇ Projects</span></aside><div className="explorer-main"><div className="crumb">Home　›　This PC</div><h2>Folders</h2><div className="folder-grid">{[{name:'Projects',icon:'📁',app:'browser'},{name:'CV & records',icon:'📄',app:'resume'},{name:'About me',icon:'👤',app:'about'},{name:'Contact',icon:'✉️',app:'contact'}].map(f=><button className="folder" key={f.name} onDoubleClick={()=>openApp(f.app)} onClick={()=>{}}><span>{f.icon}</span><b>{f.name}</b><small>Double-click to open</small></button>)}</div><p className="muted tiny">Tip: double-click a folder to open its window.</p></div></section>;
  if (id === 'browser') return <section className="browser"><div className="browser-bar"><span>←</span><span>→</span><div className="address">🔒　Your project speed dial</div></div><div className="browser-home"><div className="browser-logo">✳</div><h1>Where to next?</h1><p className="muted">A few places from around my digital world.</p><div className="link-grid">{projectLinks.map(p=><a className="project-link" href={p.url} target="_blank" rel="noreferrer" key={p.title}><span className="project-mark">{p.mark}</span><b>{p.title}</b><small>{p.description}</small><span className="external">↗</span></a>)}</div></div></section>;
  if (id === 'resume') return <section className="page"><div className="doc-head"><FileText size={34}/><div><p className="eyebrow">DOCUMENTS</p><h1>CV & records</h1><p className="muted">Public-safe documents will appear here.</p></div></div>{[{title:'Curriculum Vitae',desc:'Add your latest CV to public/documents and link it here.'},{title:'School records',desc:'Only include documents you intend to make public.'},{title:'Certificates & recognition',desc:'A curated list of achievements and certificates.'}].map(d=><div className="file-row" key={d.title}><FileText/><div><b>{d.title}</b><small>{d.desc}</small></div><span className="file-type">FILE</span></div>)}<p className="callout">No private student records should be published. Add only files you explicitly want visitors to access.</p></section>;
  if (id === 'contact') return <section className="page"><div className="contact-mark"><Mail/></div><p className="eyebrow">LET’S CONNECT</p><h1>Get in touch.</h1><p className="muted">For collaborations, projects, or a thoughtful conversation.</p><a className="contact-row" href="https://github.com/prottushsui" target="_blank" rel="noreferrer"><Globe/><span><b>GitHub</b><small>github.com/prottushsui</small></span><ChevronRight/></a><p className="callout">Add a public contact email or preferred social link when you are ready.</p></section>;
  if (id === 'terminal') return <section className="terminal"><div><i/> <i/> <i/> <span>PowerShell</span></div><p>Windows PowerShell</p><p>Copyright (C) Microsoft Corporation. All rights reserved.</p><br/><p>PS C:\Users\Prottush&gt; <span className="terminal-caret">_</span></p><p className="terminal-muted">This is a visual portfolio terminal, not a real shell.</p></section>;
  if (id === 'settings') return <section className="page"><div className="doc-head"><Monitor size={34}/><div><p className="eyebrow">SYSTEM</p><h1>Personalization</h1><p className="muted">Choose your desktop appearance.</p></div></div><div className="theme-row"><button className={theme==='light'?'theme-choice selected':'theme-choice'} onClick={()=>setTheme('light')}><Sun/>Light</button><button className={theme==='dark'?'theme-choice selected':'theme-choice'} onClick={()=>setTheme('dark')}><Moon/>Dark</button></div><p className="callout">Settings are currently session-only; persistent preferences can be added later.</p></section>;
  return null;
}

function WindowFrame({ app, state, active, onFocus, onClose, onMinimize, onMaximize, onMove, children }) {
  const Icon = app.icon;
  const drag = (event) => {
    if (event.target.closest('button')) return;
    onFocus();
    const origin = { x: event.clientX, y: event.clientY, wx: state.position.x, wy: state.position.y };
    const move = (e) => onMove({ x: Math.max(0, origin.wx + e.clientX - origin.x), y: Math.max(0, origin.wy + e.clientY - origin.y) });
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return <section className={'window '+(active?'active ':'')+(state.maximized?'maximized':'')} style={{left:state.maximized?12:state.position.x,top:state.maximized?12:state.position.y,zIndex:state.zIndex}} onPointerDown={onFocus}>
    <header className="titlebar" onPointerDown={drag}><span className="title-icon"><Icon size={15}/></span><span>{app.title}</span><div className="window-controls"><button aria-label="Minimize" onClick={onMinimize}><Minus size={14}/></button><button aria-label="Maximize" onClick={onMaximize}><Square size={11}/></button><button className="close" aria-label="Close" onClick={onClose}><X size={15}/></button></div></header>
    <div className="window-content">{children}</div>
  </section>;
}

export default function App() {
  const [windows,setWindows] = useState(initialWindows);
  const [activeId,setActiveId] = useState(null);
  const [startOpen,setStartOpen] = useState(false);
  const [search,setSearch] = useState('');
  const [theme,setTheme] = useState('light');
  const [z,setZ] = useState(10);
  const openApp = (id) => {
    const nextZ=z+1; setZ(nextZ);
    setWindows(current=>({...current,[id]:current[id]?{...current[id],minimized:false,zIndex:nextZ}:{position:{x:startPosition.x+Object.keys(current).length*22,y:startPosition.y+Object.keys(current).length*18},maximized:false,minimized:false,zIndex:nextZ}}));
    setActiveId(id); setStartOpen(false); setSearch('');
  };
  const focusApp = (id) => { const nextZ=z+1; setZ(nextZ); setWindows(current=>({...current,[id]:{...current[id],minimized:false,zIndex:nextZ}})); setActiveId(id); };
  const closeApp = (id) => { setWindows(current=>{const copy={...current};delete copy[id];return copy;});setActiveId(current=>current===id?null:current); };
  const minimizeApp = (id) => { setWindows(current=>({...current,[id]:{...current[id],minimized:true}}));setActiveId(current=>current===id?null:current); };
  const toggleMaximize = (id) => setWindows(current=>({...current,[id]:{...current[id],maximized:!current[id].maximized}}));
  const moveWindow = (id,position) => setWindows(current=>({...current,[id]:{...current[id],position}}));
  const visible = useMemo(()=>Object.entries(windows).filter(([,w])=>!w.minimized),[windows]);
  const filtered = apps.filter(a=>a.title.toLowerCase().includes(search.toLowerCase()));
  useEffect(()=>{const key=e=>{if(e.key==='Escape'){setStartOpen(false);if(activeId)closeApp(activeId);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[activeId]);
  return <main className={'desktop theme-'+theme} onPointerDown={e=>{if(e.target===e.currentTarget)setStartOpen(false);}}>
    <div className="wallpaper-shape shape-one"/><div className="wallpaper-shape shape-two"/>
    <div className="desktop-icons">{apps.filter(a=>['about','explorer','browser','resume','contact'].includes(a.id)).map(a=>{const Icon=a.icon;return <button className="desktop-icon" key={a.id} onDoubleClick={()=>openApp(a.id)}><span className={'icon-tile icon-'+a.id}><Icon size={25}/></span><span>{a.title}</span></button>})}</div>
    <div className="welcome"><span>PERSONAL DESKTOP</span><h1>Good to see you.</h1><p>Double-click an icon to explore.</p></div>
    {visible.map(([id,state])=>{const app=apps.find(a=>a.id===id);return <WindowFrame key={id} app={app} state={state} active={activeId===id} onFocus={()=>focusApp(id)} onClose={()=>closeApp(id)} onMinimize={()=>minimizeApp(id)} onMaximize={()=>toggleMaximize(id)} onMove={pos=>moveWindow(id,pos)}><AppContent id={id} openApp={openApp} theme={theme} setTheme={setTheme}/></WindowFrame>})}
    {startOpen&&<><button className="dismiss" aria-label="Dismiss Start menu" onClick={()=>setStartOpen(false)}/><section className="start-menu"><label className="start-search"><Search size={16}/><input autoFocus value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search for apps, settings, and documents"/></label><div className="start-heading"><b>{search?'Search results':'Pinned'}</b><span>All apps　›</span></div><div className="start-grid">{filtered.map(a=>{const Icon=a.icon;return <button key={a.id} onClick={()=>openApp(a.id)}><span className={'icon-tile icon-'+a.id}><Icon size={22}/></span><small>{a.title}</small></button>})}</div><footer><span className="profile-mini">P.</span><b>Prottush</b><button aria-label="Power menu" onClick={()=>setStartOpen(false)}><Power size={16}/></button></footer></section></>}
    <footer className="taskbar"><div className="weather"><span>☀</span><div><b>Clear skies</b><small>Make today count</small></div></div><div className="taskbar-center"><button className="task-icon windows-logo" aria-label="Start" onClick={()=>setStartOpen(v=>!v)}><span>▦</span></button>{[...new Set([...Object.keys(windows)])].map(id=>{const a=apps.find(app=>app.id===id);const Icon=a.icon;return <button key={id} className={'task-icon '+(activeId===id?'task-active':'')} title={a.title} onClick={()=>windows[id].minimized?openApp(id):activeId===id?minimizeApp(id):focusApp(id)}><Icon size={19}/></button>})}<button className="task-icon" title="Search" onClick={()=>setStartOpen(true)}><Search size={18}/></button></div><div className="system-tray"><span>⌃</span><span>◖</span><span>◕</span><time>{new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</time><time>{new Date().toLocaleDateString([], {month:'numeric',day:'numeric',year:'numeric'})}</time></div></footer>
  </main>;
}
