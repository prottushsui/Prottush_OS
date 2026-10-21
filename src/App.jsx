import { useEffect, useMemo, useState } from 'react';
import { apps, projectLinks } from './apps.js';
import { Search, Power, Minus, Square, X, ChevronRight, Sun, Moon, Folder, FileText, Globe, Mail, Monitor, Terminal as TerminalIcon, ShieldCheck, Upload, Download, Trash2, LockKeyhole, RefreshCw, LogOut, HardDrive, AlertTriangle } from 'lucide-react';

const LAYOUT_STORAGE_KEY = 'prottush-os-layout-v1';

function readSavedWindows() {
  try {
    const saved = JSON.parse(localStorage.getItem(LAYOUT_STORAGE_KEY) || 'null');
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return {};
    return Object.fromEntries(Object.entries(saved).flatMap(([id, state]) => {
      if (!apps.some(app => app.id === id) || !state || typeof state !== 'object') return [];
      const rawX = Number(state.position?.x);
      const rawY = Number(state.position?.y);
      const x = Number.isFinite(rawX) ? Math.max(0, Math.min(Math.max(0, window.innerWidth - 300), rawX)) : 180;
      const y = Number.isFinite(rawY) ? Math.max(0, Math.min(Math.max(0, window.innerHeight - 110), rawY)) : 72;
      const rawZ = Number(state.zIndex);
      return [[id, {
        position: { x, y },
        width: Number.isFinite(Number(state.width)) ? Math.max(300, Math.min(window.innerWidth - x, Number(state.width))) : null,
        height: Number.isFinite(Number(state.height)) ? Math.max(230, Math.min(window.innerHeight - y - 70, Number(state.height))) : null,
        maximized: Boolean(state.maximized),
        minimized: Boolean(state.minimized),
        zIndex: Number.isFinite(rawZ) ? Math.max(1, Math.min(10000, rawZ)) : 10,
        snap: state.snap === 'left' || state.snap === 'right' ? state.snap : null,
      }]];
    }));
  } catch {
    return {};
  }
}

const initialWindows = readSavedWindows();
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
  const [secondaryCurrentPassword, setSecondaryCurrentPassword] = useState('');
  const [secondaryPassword, setSecondaryPassword] = useState('');
  const [secondaryLabel, setSecondaryLabel] = useState('Backup password');
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

  const addSecondaryPassword = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      await send('add-password', { currentPassword: secondaryCurrentPassword, newPassword: secondaryPassword, label: secondaryLabel });
      setSecondaryCurrentPassword(''); setSecondaryPassword('');
      setNotice('Additional unlock password added. It can now unlock this same vault.');
    } catch (err) { setError(err.message || 'Could not add another password.'); }
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
      <div className="vault-security-head"><div><h2>Additional unlock password</h2><p className="muted">Add another password that opens this same vault.</p></div></div>
      <form className="vault-emergency-form" onSubmit={addSecondaryPassword}>
        <input type="text" autoComplete="off" value={secondaryLabel} onChange={e=>setSecondaryLabel(e.target.value)} placeholder="Password label" aria-label="Password label" maxLength={40} required/>
        <input type="password" autoComplete="current-password" value={secondaryCurrentPassword} onChange={e=>setSecondaryCurrentPassword(e.target.value)} placeholder="Current vault password" required/>
        <input type="password" autoComplete="new-password" value={secondaryPassword} onChange={e=>setSecondaryPassword(e.target.value)} placeholder="New password (12+ characters)" required minLength={12}/>
        <button className="vault-secondary" type="submit" disabled={busy}>Add unlock password</button>
      </form>
    </section>
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

function AppContent({ id, openApp, theme, setTheme }) {
  if (id === 'vault') return <VaultApp/>;
  if (id === 'about') return <section className="page about"><div className="profile-mark">P.</div><p className="eyebrow">USER PROFILE</p><h1>Hey, I’m Prottush.</h1><p className="muted">Student · Builder · Climate advocate</p><p className="about-intro">I like turning ideas into useful, thoughtful projects — from digital experiences to student-led initiatives. I’m especially interested in the intersection of technology, community, and positive change.</p><div className="info-grid"><article><strong>Community</strong><p>Secretary of Publicity at Cambrian Climate Club, contributing to climate awareness, student collaboration, and youth-led initiatives.</p></article><article><strong>What I explore</strong><p>Web development, product design, civic ideas, climate action, and ways technology can make complicated things easier to use.</p></article></div><h2 className="section-heading">A few things I’m building</h2><div className="info-grid project-summary"><article><strong>Prottush OS</strong><p>A Windows 11-inspired interactive portfolio designed as a desktop you can explore.</p><span className="project-tag">Web · UI</span></article><article><strong>ShasthoLink</strong><p>A healthcare SaaS showcase concept focused on a patient dashboard, medical timeline, and a clearer health journey.</p><span className="project-tag">Product concept</span></article><article><strong>Cambrian Climate Club</strong><p>A student-led climate community website supporting awareness, activities, and collaboration.</p><span className="project-tag">Community · Climate</span></article><article><strong>Climate Chronicles</strong><p>A digital magazine experience in progress, exploring how student climate stories and publications can be presented online.</p><span className="project-tag">Editorial · Web</span></article></div><p className="callout">This profile uses project and role details already available. Public contact details, personal documents, dates, and other identifying information can be added only when you choose what to share.</p></section>;
  if (id === 'explorer') return <section className="explorer"><aside className="sidebar"><b>Quick access</b><span>⌂ Home</span><span>▣ Desktop</span><span>▤ Documents</span><span>◇ Projects</span></aside><div className="explorer-main"><div className="crumb">Home　›　This PC</div><h2>Folders</h2><div className="folder-grid">{[{name:'Projects',icon:'📁',app:'browser'},{name:'CV & records',icon:'📄',app:'resume'},{name:'About me',icon:'👤',app:'about'},{name:'Contact',icon:'✉️',app:'contact'}].map(f=><button className="folder" key={f.name} onDoubleClick={()=>openApp(f.app)} onClick={()=>{}}><span>{f.icon}</span><b>{f.name}</b><small>Double-click to open</small></button>)}</div><p className="muted tiny">Tip: double-click a folder to open its window.</p></div></section>;
  if (id === 'browser') return <section className="browser"><div className="browser-bar"><span>←</span><span>→</span><div className="address">🔒　Your project speed dial</div></div><div className="browser-home"><div className="browser-logo">✳</div><h1>Where to next?</h1><p className="muted">A few places from around my digital world.</p><div className="link-grid">{projectLinks.map(p=><a className="project-link" href={p.url} target="_blank" rel="noreferrer" key={p.title}><span className="project-mark">{p.mark}</span><b>{p.title}</b><small>{p.description}</small><span className="external">↗</span></a>)}</div></div></section>;
  if (id === 'resume') return <section className="page"><div className="doc-head"><FileText size={34}/><div><p className="eyebrow">DOCUMENTS</p><h1>CV & records</h1><p className="muted">Public-safe documents will appear here.</p></div></div>{[{title:'Curriculum Vitae',desc:'Add your latest CV to public/documents and link it here.'},{title:'School records',desc:'Only include documents you intend to make public.'},{title:'Certificates & recognition',desc:'A curated list of achievements and certificates.'}].map(d=><div className="file-row" key={d.title}><FileText/><div><b>{d.title}</b><small>{d.desc}</small></div><span className="file-type">FILE</span></div>)}<p className="callout">No private student records should be published. Add only files you explicitly want visitors to access.</p></section>;
  if (id === 'contact') return <section className="page"><div className="contact-mark"><Mail/></div><p className="eyebrow">LET’S CONNECT</p><h1>Get in touch.</h1><p className="muted">For collaborations, projects, or a thoughtful conversation.</p><a className="contact-row" href="https://github.com/prottushsui" target="_blank" rel="noreferrer"><Globe/><span><b>GitHub</b><small>github.com/prottushsui</small></span><ChevronRight/></a><p className="callout">Add a public contact email or preferred social link when you are ready.</p></section>;
  if (id === 'terminal') return <section className="terminal"><div><i/> <i/> <i/> <span>PowerShell</span></div><p>Windows PowerShell</p><p>Copyright (C) Microsoft Corporation. All rights reserved.</p><br/><p>PS C:\Users\Prottush&gt; <span className="terminal-caret">_</span></p><p className="terminal-muted">This is a visual portfolio terminal, not a real shell.</p></section>;
  if (id === 'settings') return <section className="page"><div className="doc-head"><Monitor size={34}/><div><p className="eyebrow">SYSTEM</p><h1>Personalization</h1><p className="muted">Choose your desktop appearance.</p></div></div><div className="theme-row"><button className={theme==='light'?'theme-choice selected':'theme-choice'} onClick={()=>setTheme('light')}><Sun/>Light</button><button className={theme==='dark'?'theme-choice selected':'theme-choice'} onClick={()=>setTheme('dark')}><Moon/>Dark</button></div><p className="callout">Your appearance preference is saved in this browser and will be remembered on your next visit.</p></section>;
  return null;
}

function WindowFrame({ app, state, active, onFocus, onClose, onMinimize, onMaximize, onMove, onResize, onDragStart, onSnap, children }) {
  const Icon = app.icon;
  const drag = (event) => {
    if (event.target.closest('button') || event.button !== 0) return;
    onFocus();
    const rect = event.currentTarget.closest('.window').getBoundingClientRect();
    const origin = { x: event.clientX, y: event.clientY, wx: rect.left, wy: rect.top };
    onDragStart();
    const move = (e) => onMove({
      x: Math.max(0, Math.min(window.innerWidth - 300, origin.wx + e.clientX - origin.x)),
      y: Math.max(0, Math.min(window.innerHeight - 110, origin.wy + e.clientY - origin.y))
    });
    const up = (e) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (window.innerWidth >= 720 && e.clientX <= 12) onSnap('left');
      else if (window.innerWidth >= 720 && e.clientX >= window.innerWidth - 12) onSnap('right');
      else if (e.clientY <= 8) onMaximize();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  const beginResize = (event, direction) => {
    if (event.button !== 0 || state.maximized || state.snap || window.innerWidth < 720) return;
    event.preventDefault();
    event.stopPropagation();
    onFocus();
    const rect = event.currentTarget.closest('.window').getBoundingClientRect();
    const origin = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    const move = (e) => {
      const dx = e.clientX - origin.x;
      const dy = e.clientY - origin.y;
      let left = origin.left;
      let top = origin.top;
      let width = origin.width;
      let height = origin.height;
      if (direction.includes('e')) width = origin.width + dx;
      if (direction.includes('s')) height = origin.height + dy;
      if (direction.includes('w')) { width = origin.width - dx; left = origin.left + dx; }
      if (direction.includes('n')) { height = origin.height - dy; top = origin.top + dy; }
      width = Math.max(300, Math.min(window.innerWidth - left, width));
      height = Math.max(230, Math.min(window.innerHeight - 70 - top, height));
      if (direction.includes('w')) left = origin.left + origin.width - width;
      if (direction.includes('n')) top = origin.top + origin.height - height;
      left = Math.max(0, Math.min(window.innerWidth - 300, left));
      top = Math.max(0, Math.min(window.innerHeight - 110, top));
      onResize({ position: { x: left, y: top }, width, height });
    };
    const cleanup = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', cleanup);
      window.removeEventListener('pointercancel', cleanup);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', cleanup);
    window.addEventListener('pointercancel', cleanup);
  };
  const windowClass = 'window '+(active?'active ':'')+(state.maximized?'maximized ':'')+(state.snap ? 'snapped-'+state.snap : '');
  const frameStyle = {
    left: state.maximized ? 12 : state.position.x,
    top: state.maximized ? 12 : state.position.y,
    zIndex: state.zIndex,
    ...(state.maximized || state.snap ? {} : {
      ...(Number.isFinite(state.width) ? { width: state.width } : {}),
      ...(Number.isFinite(state.height) ? { height: state.height } : {}),
    }),
  };
  return <section className={windowClass} style={frameStyle} onPointerDown={onFocus}>
    <header className="titlebar" onPointerDown={drag} onDoubleClick={event => { if (!event.target.closest("button")) onMaximize(); }}><span className="title-icon"><Icon size={15}/></span><span>{app.title}</span><div className="window-controls"><button aria-label="Minimize" onClick={onMinimize}><Minus size={14}/></button><button aria-label={state.maximized?'Restore':'Maximize'} onClick={onMaximize}><Square size={11}/></button><button className="close" aria-label="Close" onClick={onClose}><X size={15}/></button></div></header>
    <div className="window-content">{children}</div>
    {!state.maximized && !state.snap && window.innerWidth >= 720 && <div className="resize-handles" aria-hidden="true">
      {['n','e','s','w','ne','nw','se','sw'].map(direction => <div key={direction} className={'resize-handle resize-'+direction} onPointerDown={event => beginResize(event, direction)} />)}
    </div>}
  </section>;
}

export default function App() {
  const [windows,setWindows] = useState(initialWindows);
  const [activeId,setActiveId] = useState(null);
  const [startOpen,setStartOpen] = useState(false);
  const [search,setSearch] = useState('');
  // Keep appearance preferences across reloads without making storage mandatory.
  const [theme,setTheme] = useState(() => {
    try { return localStorage.getItem('prottush-os-theme') === 'dark' ? 'dark' : 'light'; }
    catch { return 'light'; }
  });
  const [clock,setClock] = useState(() => new Date());
  useEffect(() => {
    try { localStorage.setItem('prottush-os-theme', theme); } catch { /* Storage may be unavailable in private contexts. */ }
  }, [theme]);

  // Persist only window geometry and visibility state. App contents, vault passwords,
  // session tokens, and file data are never included in the saved desktop layout.
  useEffect(() => {
    try {
      const layout = Object.fromEntries(Object.entries(windows).map(([id, state]) => [id, {
        position: state.position,
        width: Number.isFinite(state.width) ? state.width : null,
        height: Number.isFinite(state.height) ? state.height : null,
        maximized: Boolean(state.maximized),
        minimized: Boolean(state.minimized),
        zIndex: state.zIndex,
        snap: state.snap === 'left' || state.snap === 'right' ? state.snap : null,
      }]));
      localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    } catch { /* Keep the desktop usable when storage is unavailable or full. */ }
  }, [windows]);
  // A live clock refreshes independently of other desktop interactions.
  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  const [z,setZ] = useState(10);
  const openApp = (id) => {
    const nextZ=z+1; setZ(nextZ);
    setWindows(current=>({...current,[id]:current[id]?{...current[id],minimized:false,zIndex:nextZ}:{position:{x:startPosition.x+Object.keys(current).length*22,y:startPosition.y+Object.keys(current).length*18},maximized:false,minimized:false,zIndex:nextZ}}));
    setActiveId(id); setStartOpen(false); setSearch('');
  };
  const focusApp = (id) => { const nextZ=z+1; setZ(nextZ); setWindows(current=>({...current,[id]:{...current[id],minimized:false,zIndex:nextZ}})); setActiveId(id); };
  const selectTopWindow = (candidates) => {
    const next = Object.entries(candidates)
      .filter(([, state]) => !state.minimized)
      .sort((a, b) => (b[1].zIndex || 0) - (a[1].zIndex || 0))[0];
    setActiveId(next?.[0] ?? null);
  };
  const closeApp = (id) => {
    const copy = { ...windows };
    delete copy[id];
    setWindows(copy);
    if (activeId === id) selectTopWindow(copy);
  };
  const minimizeApp = (id) => {
    const copy = { ...windows, [id]: { ...windows[id], minimized: true } };
    setWindows(copy);
    if (activeId === id) selectTopWindow(copy);
  };
  const toggleMaximize = (id) => setWindows(current => ({
    ...current,
    [id]: { ...current[id], maximized: !current[id].maximized, snap: null }
  }));
  const moveWindow = (id, position) => setWindows(current => ({
    ...current, [id]: { ...current[id], position }
  }));
  const resizeWindow = (id, geometry) => setWindows(current => ({
    ...current, [id]: { ...current[id], ...geometry, maximized: false, snap: null }
  }));
  const startWindowDrag = (id) => setWindows(current => ({
    ...current, [id]: { ...current[id], maximized: false, snap: null }
  }));
  const snapWindow = (id, side) => setWindows(current => ({
    ...current, [id]: { ...current[id], maximized: false, snap: side }
  }));
  const visible = useMemo(()=>Object.entries(windows).filter(([,w])=>!w.minimized),[windows]);
  const filtered = apps.filter(a=>a.title.toLowerCase().includes(search.toLowerCase()));
  useEffect(() => {
    const key = (event) => {
      const targetElement = event.target instanceof HTMLElement ? event.target : null;
      const isEditing = Boolean(targetElement && (
        targetElement.matches('input, textarea, select, [contenteditable="true"]') ||
        targetElement.isContentEditable
      ));

      // Escape should always dismiss Start, including while its search field is focused.
      if (event.key === 'Escape' && startOpen) {
        event.preventDefault();
        setStartOpen(false);
        return;
      }

      // Do not steal typing shortcuts from text fields or editable app content.
      // Alt+F4 remains available as a conventional window-close shortcut.
      if (isEditing && !(event.altKey && event.key === 'F4')) return;

      const shortcut = event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey;
      if (shortcut && !event.repeat) {
        const shortcuts = { s: 'start', e: 'explorer', b: 'browser', t: 'terminal' };
        const target = shortcuts[event.key.toLowerCase()];
        if (target) {
          event.preventDefault();
          if (target === 'start') setStartOpen(value => !value);
          else openApp(target);
          return;
        }
      }
      if (event.key === 'Escape' && activeId) closeApp(activeId);
      if (event.altKey && event.key === 'F4' && activeId) {
        event.preventDefault();
        closeApp(activeId);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [activeId, startOpen, z]);
  return <main className={'desktop theme-'+theme} onPointerDown={e=>{if(e.target===e.currentTarget)setStartOpen(false);}}>
    <div className="wallpaper-shape shape-one"/><div className="wallpaper-shape shape-two"/>
    <div className="desktop-icons">{apps.filter(a=>['about','explorer','browser','resume','contact','vault'].includes(a.id)).map(a=>{const Icon=a.icon;return <button className="desktop-icon" key={a.id} onDoubleClick={()=>openApp(a.id)}><span className={'icon-tile icon-'+a.id}><Icon size={25}/></span><span>{a.title}</span></button>})}</div>
    <div className="welcome"><span>PERSONAL DESKTOP</span><h1>Good to see you.</h1><p>Double-click an icon to explore.</p></div>
    {visible.map(([id,state])=>{const app=apps.find(a=>a.id===id);return <WindowFrame key={id} app={app} state={state} active={activeId===id} onFocus={()=>focusApp(id)} onClose={()=>closeApp(id)} onMinimize={()=>minimizeApp(id)} onMaximize={()=>toggleMaximize(id)} onMove={pos=>moveWindow(id,pos)} onResize={geometry=>resizeWindow(id,geometry)} onDragStart={()=>startWindowDrag(id)} onSnap={side=>snapWindow(id,side)}><AppContent id={id} openApp={openApp} theme={theme} setTheme={setTheme}/></WindowFrame>})}
    {startOpen&&<><button className="dismiss" aria-label="Dismiss Start menu" onClick={()=>setStartOpen(false)}/><section className="start-menu"><label className="start-search"><Search size={16}/><input autoFocus value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search for apps, settings, and documents"/></label><div className="start-heading"><b>{search?'Search results':'Pinned'}</b><span>All apps　›</span></div><div className="start-grid">{filtered.map(a=>{const Icon=a.icon;return <button key={a.id} onClick={()=>openApp(a.id)}><span className={'icon-tile icon-'+a.id}><Icon size={22}/></span><small>{a.title}</small></button>})}</div><footer><span className="profile-mini">P.</span><b>Prottush</b><button aria-label="Power menu" onClick={()=>setStartOpen(false)}><Power size={16}/></button></footer></section></>}
    <footer className="taskbar"><div className="weather"><span>☀</span><div><b>Clear skies</b><small>Make today count</small></div></div><div className="taskbar-center"><button className="task-icon windows-logo" aria-label="Start" onClick={()=>setStartOpen(v=>!v)}><span>▦</span></button>{[...new Set([...Object.keys(windows)])].map(id=>{const a=apps.find(app=>app.id===id);const Icon=a.icon;return <button key={id} className={'task-icon '+(activeId===id?'task-active':'')} title={a.title} onClick={()=>windows[id].minimized?openApp(id):activeId===id?minimizeApp(id):focusApp(id)}><Icon size={19}/></button>})}<button className="task-icon" title="Search" onClick={()=>setStartOpen(true)}><Search size={18}/></button></div><div className="system-tray"><span>⌃</span><span>◖</span><span>◕</span><time>{clock.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</time><time>{clock.toLocaleDateString([], {month:'numeric',day:'numeric',year:'numeric'})}</time></div></footer>
  </main>;
}
