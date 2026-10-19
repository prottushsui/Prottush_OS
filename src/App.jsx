import { useEffect, useMemo, useState } from 'react';
import { apps, projectLinks } from './apps.js';
import { Search, Power, Minus, Square, X, ChevronRight, Sun, Moon, Folder, FileText, Globe, Mail, Monitor, Terminal as TerminalIcon, ShieldCheck, Upload, Download, Trash2, LockKeyhole, RefreshCw, LogOut, HardDrive, AlertTriangle } from 'lucide-react';

const initialWindows = {};
const startPosition = { x: 180, y: 72 };

// Keep app content separate from the shared shell so adding a new app is predictable.

const VAULT_API = 'https://vrnyuxxexszccygnuknt.supabase.co/functions/v1/vault-api';
const VAULT_PUBLIC_KEY = 'sb_publishable_ds61h9BhbHfTV5ENh5mwcA_8vB3iqK8';

function formatVaultBytes(bytes = 0) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

function VaultApp() {
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [files, setFiles] = useState([]);
  const [usedBytes, setUsedBytes] = useState(0);
  const [remainingBytes, setRemainingBytes] = useState(1000000000);
  const [quotaBytes, setQuotaBytes] = useState(1000000000);
  const [usagePercent, setUsagePercent] = useState(0);
  const [emergencyConfigured, setEmergencyConfigured] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [emergencyPassword, setEmergencyPassword] = useState('');
  const [wipePassword, setWipePassword] = useState('');
  const [showEmergencySetup, setShowEmergencySetup] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async (action, payload = {}, sessionToken = token) => {
    const response = await fetch(VAULT_API, {
      method: 'POST',
      headers: {
        apikey: VAULT_PUBLIC_KEY,
        'Content-Type': 'application/json',
        ...(sessionToken ? { 'x-vault-token': sessionToken } : {}),
      },
      body: JSON.stringify({ action, ...payload }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'The vault request failed.');
    return data;
  };

  const loadFiles = async (sessionToken = token) => {
    const data = await send('list', {}, sessionToken);
    setFiles(data.files || []);
    setUsedBytes(data.usedBytes || 0);
    setRemainingBytes(data.remainingBytes ?? 1000000000);
    setQuotaBytes(data.quotaBytes || 1000000000);
    setUsagePercent(data.usagePercent || 0);
    setEmergencyConfigured(Boolean(data.emergencyConfigured));
  };

  const unlock = async (event) => {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await send('login', { password }, '');
      setToken(result.token); setPassword('');
      await loadFiles(result.token);
      setNotice('Vault unlocked. This session expires after 8 hours.');
    } catch (err) {
      setError(err.message || 'Could not unlock the vault.');
    } finally { setBusy(false); }
  };

  const logout = () => {
    setToken(''); setFiles([]); setUsedBytes(0); setRemainingBytes(1000000000); setUsagePercent(0);
    setCurrentPassword(''); setEmergencyPassword(''); setWipePassword('');
    setNotice('You have locked this browser session.'); setError('');
  };

  const uploadFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const form = new FormData();
      form.append('action', 'upload'); form.append('file', file);
      const response = await fetch(VAULT_API, { method: 'POST', headers: { apikey: VAULT_PUBLIC_KEY, 'x-vault-token': token }, body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Upload failed.');
      setFiles(data.files || []); setUsedBytes(data.usedBytes || 0); setRemainingBytes(data.remainingBytes ?? 1000000000);
      setQuotaBytes(data.quotaBytes || 1000000000); setUsagePercent(data.usagePercent || 0);
      setNotice('Uploaded ' + file.name + '.');
    } catch (err) { setError(err.message || 'Upload failed.'); }
    finally { setBusy(false); event.target.value = ''; }
  };

  const downloadFile = async (file) => {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch(VAULT_API, {
        method: 'POST',
        headers: { apikey: VAULT_PUBLIC_KEY, 'Content-Type': 'application/json', 'x-vault-token': token },
        body: JSON.stringify({ action: 'download', path: file.name }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Download failed.');
      }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = file.displayName || 'vault-file'; anchor.click();
      URL.revokeObjectURL(url);
      setNotice('Download started.');
    } catch (err) { setError(err.message || 'Download failed.'); }
    finally { setBusy(false); }
  };

  const deleteFile = async (file) => {
    if (!window.confirm('Permanently delete "' + file.displayName + '" from the cloud vault?')) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const data = await send('delete', { path: file.name });
      setFiles(data.files || []); setUsedBytes(data.usedBytes || 0); setRemainingBytes(data.remainingBytes ?? 1000000000);
      setQuotaBytes(data.quotaBytes || 1000000000); setUsagePercent(data.usagePercent || 0);
      setNotice('File permanently deleted from the vault.');
    } catch (err) { setError(err.message || 'Delete failed.'); }
    finally { setBusy(false); }
  };

  const saveEmergencyPassword = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      await send('set-emergency', { currentPassword, emergencyPassword });
      setEmergencyConfigured(true); setShowEmergencySetup(false);
      setCurrentPassword(''); setEmergencyPassword('');
      setNotice('Emergency wipe password configured. Keep it separate from your normal password.');
    } catch (err) { setError(err.message || 'Could not configure the emergency password.'); }
    finally { setBusy(false); }
  };

  const wipeVault = async () => {
    if (!emergencyConfigured) { setError('Configure a separate emergency password first.'); return; }
    if (!window.confirm('FINAL WARNING: this permanently deletes every file in the cloud vault and revokes all sessions. Continue?')) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await send('wipe', { emergencyPassword: wipePassword });
      setToken(''); setFiles([]); setUsedBytes(0); setRemainingBytes(quotaBytes); setUsagePercent(0);
      setWipePassword('');
      setNotice('Vault wiped. ' + result.wipedCount + ' file(s) deleted and active sessions revoked.');
    } catch (err) { setError(err.message || 'Emergency wipe failed.'); }
    finally { setBusy(false); }
  };

  if (!token) return <section className="vault-shell">
    <div className="vault-hero"><div className="vault-symbol"><LockKeyhole size={25}/></div><p className="eyebrow">PRIVATE CLOUD SPACE</p><h1>Secret Space</h1><p className="muted">Your personal file vault, available across browsers and devices.</p></div>
    <form className="vault-login" onSubmit={unlock}>
      <label htmlFor="vault-password">Vault password</label>
      <input id="vault-password" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" required maxLength={1024}/>
      <button className="vault-primary" type="submit" disabled={busy}>{busy ? 'Unlocking…' : 'Unlock vault'} <ChevronRight size={16}/></button>
    </form>
    <p className="vault-footnote"><LockKeyhole size={13}/> Private bucket · 8-hour sessions · Rate-limited sign-in</p>
    {error && <p className="vault-message error">{error}</p>}{notice && <p className="vault-message">{notice}</p>}
  </section>;

  return <section className="vault-shell">
    <header className="vault-header"><div className="vault-title"><div className="vault-symbol small"><LockKeyhole size={19}/></div><div><p className="eyebrow">PRIVATE CLOUD SPACE</p><h1>Secret Space</h1></div></div><div className="vault-actions"><button className="vault-quiet" onClick={()=>loadFiles().catch(err=>setError(err.message))} disabled={busy} title="Refresh storage"><RefreshCw size={15}/></button><button className="vault-quiet" onClick={logout}><LogOut size={15}/> Lock</button></div></header>
    <section className="vault-meter">
      <div className="vault-meter-top"><div><span className="vault-overline">STORAGE USED</span><strong>{formatVaultBytes(usedBytes)} <small>of {formatVaultBytes(quotaBytes)}</small></strong></div><b>{usagePercent.toFixed(1)}%</b></div>
      <div className="vault-progress" role="progressbar" aria-valuenow={Math.round(usagePercent)} aria-valuemin="0" aria-valuemax="100"><span style={{width:usagePercent+'%'}}/></div>
      <div className="vault-meter-bottom"><span>{formatVaultBytes(remainingBytes)} remaining</span><span>{files.length} file{files.length===1?'':'s'}</span></div>
    </section>
    <div className="vault-toolbar"><div><h2>Your files</h2><p className="muted">Stored privately in Supabase cloud storage.</p></div><label className="vault-upload"><Upload size={15}/> {busy?'Working…':'Upload file'}<input type="file" onChange={uploadFile} disabled={busy}/></label></div>
    {files.length ? <div className="vault-file-list">{files.map(file=><article className="vault-file" key={file.name}><div className="vault-file-icon"><FileText size={19}/></div><div className="vault-file-info"><strong title={file.displayName}>{file.displayName}</strong><small>{formatVaultBytes(file.size)} · {file.updatedAt ? new Date(file.updatedAt).toLocaleDateString() : 'Cloud file'}</small></div><button className="vault-file-action" onClick={()=>downloadFile(file)} disabled={busy} aria-label={'Download '+file.displayName} title="Download"><Download size={16}/></button><button className="vault-file-action danger" onClick={()=>deleteFile(file)} disabled={busy} aria-label={'Delete '+file.displayName} title="Delete"><Trash2 size={16}/></button></article>)}</div> : <div className="vault-empty"><HardDrive size={30}/><strong>No files yet</strong><p>Upload a file to keep it available when you need it.</p></div>}
    <section className="vault-security">
      <div className="vault-security-head"><div><h2>Emergency wipe</h2><p className="muted">{emergencyConfigured?'Separate emergency password configured.':'Set a separate password before relying on emergency wipe.'}</p></div><span className={'vault-status '+(emergencyConfigured?'ready':'pending')}>{emergencyConfigured?'Configured':'Setup needed'}</span></div>
      {!emergencyConfigured || showEmergencySetup ? <form className="vault-emergency-form" onSubmit={saveEmergencyPassword}>
        <input type="password" autoComplete="current-password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} placeholder="Current vault password" required/>
        <input type="password" autoComplete="new-password" value={emergencyPassword} onChange={e=>setEmergencyPassword(e.target.value)} placeholder="New emergency password (12+ characters)" required minLength={12}/>
        <button className="vault-secondary" type="submit" disabled={busy}>Save emergency password</button>
      </form> : <button className="vault-secondary" onClick={()=>setShowEmergencySetup(true)} disabled={busy}>Change emergency password</button>}
      {emergencyConfigured && <div className="vault-wipe-row"><input type="password" autoComplete="off" value={wipePassword} onChange={e=>setWipePassword(e.target.value)} placeholder="Emergency password" aria-label="Emergency password"/><button className="vault-wipe" onClick={wipeVault} disabled={busy||!wipePassword}><AlertTriangle size={14}/> Wipe all files</button></div>}
      <p className="vault-warning"><AlertTriangle size={14}/> Wiping deletes cloud objects and revokes sessions. Provider-level backups or residual copies may persist temporarily.</p>
    </section>
    {error && <p className="vault-message error">{error}</p>}{notice && <p className="vault-message">{notice}</p>}
  </section>;
}

function AppContent({ id, openApp, theme, setTheme }) {\n  if (id === 'vault') return <VaultApp/>;
  if (id === 'about') return <section className="page about"><div className="profile-mark">P.</div><p className="eyebrow">USER PROFILE</p><h1>Hey, I’m Prottush.</h1><p className="muted">Student · Builder · Climate advocate</p><p className="about-intro">I like turning ideas into useful, thoughtful projects — from digital experiences to student-led initiatives. I’m especially interested in the intersection of technology, community, and positive change.</p><div className="info-grid"><article><strong>Community</strong><p>Secretary of Publicity at Cambrian Climate Club, contributing to climate awareness, student collaboration, and youth-led initiatives.</p></article><article><strong>What I explore</strong><p>Web development, product design, civic ideas, climate action, and ways technology can make complicated things easier to use.</p></article></div><h2 className="section-heading">A few things I’m building</h2><div className="info-grid project-summary"><article><strong>Prottush OS</strong><p>A Windows 11-inspired interactive portfolio designed as a desktop you can explore.</p><span className="project-tag">Web · UI</span></article><article><strong>ShasthoLink</strong><p>A healthcare SaaS showcase concept focused on a patient dashboard, medical timeline, and a clearer health journey.</p><span className="project-tag">Product concept</span></article><article><strong>Cambrian Climate Club</strong><p>A student-led climate community website supporting awareness, activities, and collaboration.</p><span className="project-tag">Community · Climate</span></article><article><strong>Climate Chronicles</strong><p>A digital magazine experience in progress, exploring how student climate stories and publications can be presented online.</p><span className="project-tag">Editorial · Web</span></article></div><p className="callout">This profile uses project and role details already available. Public contact details, personal documents, dates, and other identifying information can be added only when you choose what to share.</p></section>;
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
    <div className="desktop-icons">{apps.filter(a=>['about','explorer','browser','resume','contact','vault'].includes(a.id)).map(a=>{const Icon=a.icon;return <button className="desktop-icon" key={a.id} onDoubleClick={()=>openApp(a.id)}><span className={'icon-tile icon-'+a.id}><Icon size={25}/></span><span>{a.title}</span></button>})}</div>
    <div className="welcome"><span>PERSONAL DESKTOP</span><h1>Good to see you.</h1><p>Double-click an icon to explore.</p></div>
    {visible.map(([id,state])=>{const app=apps.find(a=>a.id===id);return <WindowFrame key={id} app={app} state={state} active={activeId===id} onFocus={()=>focusApp(id)} onClose={()=>closeApp(id)} onMinimize={()=>minimizeApp(id)} onMaximize={()=>toggleMaximize(id)} onMove={pos=>moveWindow(id,pos)}><AppContent id={id} openApp={openApp} theme={theme} setTheme={setTheme}/></WindowFrame>})}
    {startOpen&&<><button className="dismiss" aria-label="Dismiss Start menu" onClick={()=>setStartOpen(false)}/><section className="start-menu"><label className="start-search"><Search size={16}/><input autoFocus value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search for apps, settings, and documents"/></label><div className="start-heading"><b>{search?'Search results':'Pinned'}</b><span>All apps　›</span></div><div className="start-grid">{filtered.map(a=>{const Icon=a.icon;return <button key={a.id} onClick={()=>openApp(a.id)}><span className={'icon-tile icon-'+a.id}><Icon size={22}/></span><small>{a.title}</small></button>})}</div><footer><span className="profile-mini">P.</span><b>Prottush</b><button aria-label="Power menu" onClick={()=>setStartOpen(false)}><Power size={16}/></button></footer></section></>}
    <footer className="taskbar"><div className="weather"><span>☀</span><div><b>Clear skies</b><small>Make today count</small></div></div><div className="taskbar-center"><button className="task-icon windows-logo" aria-label="Start" onClick={()=>setStartOpen(v=>!v)}><span>▦</span></button>{[...new Set([...Object.keys(windows)])].map(id=>{const a=apps.find(app=>app.id===id);const Icon=a.icon;return <button key={id} className={'task-icon '+(activeId===id?'task-active':'')} title={a.title} onClick={()=>windows[id].minimized?openApp(id):activeId===id?minimizeApp(id):focusApp(id)}><Icon size={19}/></button>})}<button className="task-icon" title="Search" onClick={()=>setStartOpen(true)}><Search size={18}/></button></div><div className="system-tray"><span>⌃</span><span>◖</span><span>◕</span><time>{new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</time><time>{new Date().toLocaleDateString([], {month:'numeric',day:'numeric',year:'numeric'})}</time></div></footer>
  </main>;
}
