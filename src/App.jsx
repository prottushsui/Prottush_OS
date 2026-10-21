import { useEffect, useMemo, useState } from 'react';
import { apps, projectLinks } from './apps.js';
import { createPreferencesExport, parsePreferencesFile } from './preferences.js';
import { Search, Power, Minus, Square, X, ChevronRight, Sun, Moon, Folder, FileText, Globe, Mail, Monitor, Terminal as TerminalIcon, ShieldCheck, Upload, Download, Trash2, LockKeyhole, RefreshCw, LogOut, HardDrive, AlertTriangle, Plus, Settings2, Check, Bell as BellIcon } from 'lucide-react';

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
        width: state.width != null && Number.isFinite(Number(state.width)) ? Math.max(300, Math.min(window.innerWidth - x, Number(state.width))) : null,
        height: state.height != null && Number.isFinite(Number(state.height)) ? Math.max(230, Math.min(window.innerHeight - y - 70, Number(state.height))) : null,
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

const explorerEntries = [
  { id: 'projects', parent: 'home', type: 'folder', name: 'Projects', description: 'Websites and things I’m building', icon: '📁' },
  { id: 'documents', parent: 'home', type: 'folder', name: 'Public documents', description: 'CV and shareable records', icon: '📄' },
  { id: 'achievements', parent: 'home', type: 'folder', name: 'Achievements', description: 'Selected milestones and recognition', icon: '🏅' },
  { id: 'about-contact', parent: 'home', type: 'folder', name: 'About & contact', description: 'Profile and ways to connect', icon: '👤' },
  { id: 'ccc', parent: 'projects', type: 'link', name: 'Cambrian Climate Club', description: 'Climate education and student-led initiatives', icon: '🌱', url: 'https://cambrian-climate-club.vercel.app', location: 'Projects' },
  { id: 'github', parent: 'projects', type: 'link', name: 'GitHub profile', description: 'Source code and experiments', icon: '⌘', url: 'https://github.com/prottushsui', location: 'Projects' },
  { id: 'source', parent: 'projects', type: 'link', name: 'Prottush OS source', description: 'Repository for this portfolio desktop', icon: '💻', url: 'https://github.com/prottushsui/Prottush_OS', location: 'Projects' },
  { id: 'cv', parent: 'documents', type: 'app', name: 'Curriculum Vitae', description: 'Public CV link has not been added yet', icon: '📄', app: 'resume', location: 'Public documents' },
  { id: 'records', parent: 'documents', type: 'app', name: 'School records', description: 'No records are published here', icon: '🗂️', app: 'resume', location: 'Public documents' },
  { id: 'certificates', parent: 'documents', type: 'app', name: 'Certificates & recognition', description: 'Curated public list — not yet populated', icon: '🏅', app: 'resume', location: 'Public documents' },
  { id: 'profile', parent: 'about-contact', type: 'app', name: 'About me', description: 'Profile, interests, and current projects', icon: '👤', app: 'about', location: 'About & contact' },
  { id: 'contact', parent: 'about-contact', type: 'app', name: 'Contact', description: 'Public profile and collaboration links', icon: '✉️', app: 'contact', location: 'About & contact' },
];

function ExplorerApp({ openApp }) {
  const [currentFolder, setCurrentFolder] = useState('home');
  const [query, setQuery] = useState('');
  const folders = [{ id: 'home', name: 'Home' }, ...explorerEntries.filter(item => item.type === 'folder').map(({ id, name }) => ({ id, name }))];
  const current = folders.find(folder => folder.id === currentFolder) || folders[0];
  const normalizedQuery = query.trim().toLowerCase();
  const entries = normalizedQuery
    ? explorerEntries.filter(item => [item.name, item.description, item.location].filter(Boolean).join(' ').toLowerCase().includes(normalizedQuery))
    : explorerEntries.filter(item => item.parent === currentFolder);
  const breadcrumbs = currentFolder === 'home' ? [{ id: 'home', name: 'Home' }] : [{ id: 'home', name: 'Home' }, current];
  const activate = item => {
    if (item.type === 'folder') {
      setCurrentFolder(item.id);
      setQuery('');
    } else if (item.type === 'app') {
      openApp(item.app);
    } else if (item.url) {
      window.open(item.url, '_blank', 'noopener,noreferrer');
    }
  };
  const folderShortcut = id => { setCurrentFolder(id); setQuery(''); };
  return <section className="explorer">
    <aside className="sidebar" aria-label="File Explorer navigation">
      <b>Quick access</b>
      <button className={currentFolder === 'home' ? 'selected' : ''} onClick={() => folderShortcut('home')}>⌂ <span>Home</span></button>
      <button className={currentFolder === 'projects' ? 'selected' : ''} onClick={() => folderShortcut('projects')}>◇ <span>Projects</span></button>
      <button className={currentFolder === 'documents' ? 'selected' : ''} onClick={() => folderShortcut('documents')}>▤ <span>Documents</span></button>
      <button className={currentFolder === 'achievements' ? 'selected' : ''} onClick={() => folderShortcut('achievements')}>☆ <span>Achievements</span></button>
      <button className={currentFolder === 'about-contact' ? 'selected' : ''} onClick={() => folderShortcut('about-contact')}>♙ <span>About & contact</span></button>
    </aside>
    <div className="explorer-main">
      <div className="explorer-toolbar">
        <div className="explorer-breadcrumbs" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, index) => <span key={crumb.id}>
            {index > 0 && <span className="crumb-separator">›</span>}
            <button onClick={() => folderShortcut(crumb.id)}>{crumb.name}</button>
          </span>)}
        </div>
        <label className="explorer-search"><Search size={14}/><input aria-label="Search public portfolio files" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search this workspace"/></label>
      </div>
      <div className="explorer-heading"><div><p className="eyebrow">PUBLIC WORKSPACE</p><h2>{normalizedQuery ? 'Search results' : current.name}</h2></div><span>{entries.length} item{entries.length === 1 ? '' : 's'}</span></div>
      {entries.length ? <div className="explorer-items" role="list">
        {entries.map(item => <button className="explorer-item" key={item.id} onDoubleClick={() => activate(item)} onClick={event => { if (event.detail === 0) activate(item); }} title={item.type === 'folder' ? 'Double-click to open folder' : 'Double-click to open'}>
          <span className="explorer-item-icon">{item.icon}</span><span className="explorer-item-copy"><b>{item.name}</b><small>{item.description}</small>{normalizedQuery && item.location && <em>{item.location}</em>}</span><span className="explorer-item-kind">{item.type === 'folder' ? 'FOLDER' : item.type === 'link' ? 'LINK' : 'SHORTCUT'}</span>
        </button>)}
      </div> : <div className="explorer-empty"><span>⌕</span><b>{normalizedQuery ? 'No matching items' : currentFolder === 'achievements' ? 'Nothing published here yet' : 'This folder is empty'}</b><p>{normalizedQuery ? 'Try another name or keyword.' : currentFolder === 'achievements' ? 'Verified achievements can be added here when they are ready to share publicly.' : 'Public files can be added when there is a verified, shareable version.'}</p></div>}
      <p className="explorer-footnote">Only curated public links and shortcuts appear here. Secret Space and private records are kept separate.</p>
    </div>
  </section>;
}

function AppContent({ id, openApp, theme, setTheme, wallpaper, setWallpaper, accent, setAccent }) {
  const [settingsMessage, setSettingsMessage] = useState('');
  const exportPreferences = () => {
    try {
      const payload = createPreferencesExport({ theme, wallpaper, accent });
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'prottush-os-settings.json';
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setSettingsMessage('Appearance settings exported. This file contains only theme, wallpaper, and accent.');
    } catch {
      setSettingsMessage('Could not export settings in this browser.');
    }
  };
  const importPreferences = async (event) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const preferences = parsePreferencesFile(await file.text());
      setTheme(preferences.theme);
      setWallpaper(preferences.wallpaper);
      setAccent(preferences.accent);
      setSettingsMessage('Appearance settings imported. No app, window, or vault data was changed.');
    } catch (error) {
      setSettingsMessage(error instanceof Error ? error.message : 'Could not import this settings file.');
    } finally {
      input.value = '';
    }
  };
  if (id === 'vault') return <VaultApp/>;
  if (id === 'about') return <section className="page about"><div className="profile-mark">P.</div><p className="eyebrow">USER PROFILE</p><h1>Hey, I’m Prottush.</h1><p className="muted">Student · Builder · Climate advocate</p><p className="about-intro">I like turning ideas into useful, thoughtful projects — from digital experiences to student-led initiatives. I’m especially interested in the intersection of technology, community, and positive change.</p><div className="info-grid"><article><strong>Community</strong><p>Secretary of Publicity at Cambrian Climate Club, contributing to climate awareness, student collaboration, and youth-led initiatives.</p></article><article><strong>What I explore</strong><p>Web development, product design, civic ideas, climate action, and ways technology can make complicated things easier to use.</p></article></div><h2 className="section-heading">A few things I’m building</h2><div className="info-grid project-summary"><article><strong>Prottush OS</strong><p>A Windows 11-inspired interactive portfolio designed as a desktop you can explore.</p><span className="project-tag">Web · UI</span></article><article><strong>ShasthoLink</strong><p>A healthcare SaaS showcase concept focused on a patient dashboard, medical timeline, and a clearer health journey.</p><span className="project-tag">Product concept</span></article><article><strong>Cambrian Climate Club</strong><p>A student-led climate community website supporting awareness, activities, and collaboration.</p><span className="project-tag">Community · Climate</span></article><article><strong>Climate Chronicles</strong><p>A digital magazine experience in progress, exploring how student climate stories and publications can be presented online.</p><span className="project-tag">Editorial · Web</span></article></div><p className="callout">This profile uses project and role details already available. Public contact details, personal documents, dates, and other identifying information can be added only when you choose what to share.</p></section>;
  if (id === 'explorer') return <ExplorerApp openApp={openApp}/>;
  if (id === 'browser') return <section className="browser"><div className="browser-bar"><span>←</span><span>→</span><div className="address">🔒　Your project speed dial</div></div><div className="browser-home"><div className="browser-logo">✳</div><h1>Where to next?</h1><p className="muted">A few places from around my digital world.</p><div className="link-grid">{projectLinks.map(p=><a className="project-link" href={p.url} target="_blank" rel="noreferrer" key={p.title}><span className="project-mark">{p.mark}</span><b>{p.title}</b><small>{p.description}</small><span className="external">↗</span></a>)}</div></div></section>;
  if (id === 'resume') return <section className="page"><div className="doc-head"><FileText size={34}/><div><p className="eyebrow">DOCUMENTS</p><h1>CV & records</h1><p className="muted">Public-safe documents will appear here.</p></div></div>{[{title:'Curriculum Vitae',desc:'Add your latest CV to public/documents and link it here.'},{title:'School records',desc:'Only include documents you intend to make public.'},{title:'Certificates & recognition',desc:'A curated list of achievements and certificates.'}].map(d=><div className="file-row" key={d.title}><FileText/><div><b>{d.title}</b><small>{d.desc}</small></div><span className="file-type">FILE</span></div>)}<p className="callout">No private student records should be published. Add only files you explicitly want visitors to access.</p></section>;
  if (id === 'contact') return <section className="page"><div className="contact-mark"><Mail/></div><p className="eyebrow">LET’S CONNECT</p><h1>Get in touch.</h1><p className="muted">For collaborations, projects, or a thoughtful conversation.</p><a className="contact-row" href="https://github.com/prottushsui" target="_blank" rel="noreferrer"><Globe/><span><b>GitHub</b><small>github.com/prottushsui</small></span><ChevronRight/></a><p className="callout">Add a public contact email or preferred social link when you are ready.</p></section>;
  if (id === 'terminal') return <section className="terminal"><div><i/> <i/> <i/> <span>PowerShell</span></div><p>Windows PowerShell</p><p>Copyright (C) Microsoft Corporation. All rights reserved.</p><br/><p>PS C:\Users\Prottush&gt; <span className="terminal-caret">_</span></p><p className="terminal-muted">This is a visual portfolio terminal, not a real shell.</p></section>;
  if (id === 'settings') return <section className="page settings-page">
    <div className="doc-head"><Monitor size={34}/><div><p className="eyebrow">SYSTEM</p><h1>Personalization</h1><p className="muted">Make this desktop feel like yours.</p></div></div>
    <section className="settings-section" aria-labelledby="appearance-heading"><div className="settings-section-heading"><h2 id="appearance-heading">Appearance</h2><span>01</span></div><p className="muted">Choose a light or dark window and taskbar treatment.</p><div className="theme-row"><button className={theme==='light'?'theme-choice selected':'theme-choice'} aria-pressed={theme==='light'} onClick={()=>setTheme('light')}><Sun size={18}/>Light</button><button className={theme==='dark'?'theme-choice selected':'theme-choice'} aria-pressed={theme==='dark'} onClick={()=>setTheme('dark')}><Moon size={18}/>Dark</button></div></section>
    <section className="settings-section" aria-labelledby="wallpaper-heading"><div className="settings-section-heading"><h2 id="wallpaper-heading">Desktop wallpaper</h2><span>02</span></div><p className="muted">Pick a backdrop. It applies instantly and stays saved in this browser.</p><div className="wallpaper-options">
      {[{id:'default',name:'Windows blue',detail:'Soft blue glass'},{id:'aurora',name:'Aurora',detail:'Northern lights'},{id:'sunset',name:'Sunset',detail:'Warm dusk'},{id:'forest',name:'Forest',detail:'Deep green'},{id:'midnight',name:'Midnight',detail:'Indigo night'}].map(option=><button key={option.id} className={'wallpaper-option '+(wallpaper===option.id?'selected':'')} aria-pressed={wallpaper===option.id} onClick={()=>setWallpaper(option.id)}><span className={'wallpaper-preview wallpaper-preview-'+option.id}><i/><i/></span><span className="wallpaper-option-copy"><b>{option.name}</b><small>{option.detail}</small></span><span className="wallpaper-check" aria-hidden="true">{wallpaper===option.id?'✓':''}</span></button>)}
    </div></section>
    <section className="settings-section" aria-labelledby="accent-heading"><div className="settings-section-heading"><h2 id="accent-heading">Accent colour</h2><span>03</span></div><p className="muted">Use a subtle highlight for active apps and selected controls.</p><div className="accent-options" role="group" aria-label="Accent colour">
      {[{id:'blue',name:'Blue',value:'#176bd2'},{id:'violet',name:'Violet',value:'#7955d9'},{id:'teal',name:'Teal',value:'#128779'},{id:'rose',name:'Rose',value:'#cc4f78'},{id:'amber',name:'Amber',value:'#b77916'}].map(option=><button key={option.id} className={'accent-option '+(accent===option.id?'selected':'')} aria-label={option.name+' accent'} aria-pressed={accent===option.id} title={option.name} onClick={()=>setAccent(option.id)} style={{'--swatch':option.value}}><span/></button>)}
    </div></section>
    <section className="settings-section" aria-labelledby="settings-transfer-heading"><div className="settings-section-heading"><h2 id="settings-transfer-heading">Backup appearance settings</h2><span>04</span></div><p className="muted">Move your visual preferences to another browser using a small JSON file. Only theme, wallpaper, and accent are included.</p><div className="settings-transfer"><button type="button" className="settings-transfer-button" onClick={exportPreferences}><Download size={15}/> Export settings</button><label className="settings-transfer-button"><Upload size={15}/> Import settings<input type="file" accept="application/json,.json" onChange={importPreferences}/></label><button type="button" className="settings-transfer-button quiet" onClick={()=>{setTheme('light');setWallpaper('default');setAccent('blue');setSettingsMessage('Appearance settings reset to defaults.')}}>Reset appearance</button></div>{settingsMessage&&<p className="settings-message" role="status">{settingsMessage}</p>}</section>
    <p className="callout settings-note">Your theme, wallpaper, and accent are saved locally in this browser only. Export files contain only those three validated preferences. Secret Space, credentials, tokens, window layout, and app contents are never included.</p>
  </section>;
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
  return <section className={windowClass} style={frameStyle} onPointerDown={onFocus} role="group" aria-label={app.title}>
    <header className="titlebar" onPointerDown={drag} onDoubleClick={event => { if (!event.target.closest("button")) onMaximize(); }}><span className="title-icon"><Icon size={15}/></span><span>{app.title}</span><div className="window-controls"><button aria-label="Minimize" onClick={onMinimize}><Minus size={14}/></button><button aria-label={state.maximized?'Restore':'Maximize'} onClick={onMaximize}><Square size={11}/></button><button className="close" aria-label={"Close "+app.title} onClick={onClose}><X size={15}/></button></div></header>
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
  const [showAllApps,setShowAllApps] = useState(false);
  const [highlightedApp,setHighlightedApp] = useState(0);
  const [selectedDesktopIcon,setSelectedDesktopIcon] = useState(null);
  const [contextMenu,setContextMenu] = useState(null);
  const [shortcutPickerOpen,setShortcutPickerOpen] = useState(false);
  const [desktopNotice,setDesktopNotice] = useState('');
  const [desktopRestoreIds,setDesktopRestoreIds] = useState(null);
  const [quickSettingsOpen,setQuickSettingsOpen] = useState(false);
  const [notificationsOpen,setNotificationsOpen] = useState(false);
  const [calendarOpen,setCalendarOpen] = useState(false);
  const [shortcutsOpen,setShortcutsOpen] = useState(false);
  const [focusMode,setFocusMode] = useState(false);
  const [reduceMotion,setReduceMotion] = useState(false);
  const [notifications,setNotifications] = useState([]);
  const notify = (title, message) => setNotifications(current => [{id:Date.now()+Math.random(),title,message,time:new Date()},...current].slice(0,20));
  const [shortcutIds,setShortcutIds] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('prottush-os-desktop-shortcuts') || '[]');
      return Array.isArray(saved) ? [...new Set(saved.filter(id => apps.some(item => item.id === id) && id !== 'vault'))] : [];
    } catch { return []; }
  });
  // Keep appearance preferences across reloads without making storage mandatory.
  const [theme,setTheme] = useState(() => {
    try { return localStorage.getItem('prottush-os-theme') === 'dark' ? 'dark' : 'light'; }
    catch { return 'light'; }
  });
  const [wallpaper,setWallpaper] = useState(() => {
    try {
      const saved = localStorage.getItem('prottush-os-wallpaper');
      return ['default','aurora','sunset','forest','midnight'].includes(saved) ? saved : 'default';
    } catch { return 'default'; }
  });
  const [accent,setAccent] = useState(() => {
    try {
      const saved = localStorage.getItem('prottush-os-accent');
      return ['blue','violet','teal','rose','amber'].includes(saved) ? saved : 'blue';
    } catch { return 'blue'; }
  });
  const accentColors = { blue:'#176bd2', violet:'#7955d9', teal:'#128779', rose:'#cc4f78', amber:'#b77916' };
  const [clock,setClock] = useState(() => new Date());
  useEffect(() => {
    try { localStorage.setItem('prottush-os-theme', theme); } catch { /* Storage may be unavailable in private contexts. */ }
  }, [theme]);
  useEffect(() => {
    try { localStorage.setItem('prottush-os-wallpaper', wallpaper); } catch { /* Preferences remain usable when storage is unavailable. */ }
  }, [wallpaper]);
  useEffect(() => {
    try { localStorage.setItem('prottush-os-accent', accent); } catch { /* Preferences remain usable when storage is unavailable. */ }
  }, [accent]);

  useEffect(() => {
    try { localStorage.setItem('prottush-os-desktop-shortcuts', JSON.stringify(shortcutIds)); }
    catch { /* Shortcuts still work for this session when storage is unavailable. */ }
  }, [shortcutIds]);
  useEffect(() => {
    if (!desktopNotice) return undefined;
    const timer = window.setTimeout(() => setDesktopNotice(''), 2200);
    return () => window.clearTimeout(timer);
  }, [desktopNotice]);
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
  const closeContextMenu = () => { setContextMenu(null); setShortcutPickerOpen(false); };
  const showContextMenu = (event, targetId = null) => {
    event.preventDefault();
    event.stopPropagation();
    const menuWidth = 228;
    const menuHeight = targetId ? 174 : 250;
    const bounds = event.currentTarget?.getBoundingClientRect?.();
    const pointerX = Number.isFinite(event.clientX) && event.clientX > 0 ? event.clientX : (bounds ? bounds.left + Math.min(bounds.width / 2, 90) : 16);
    const pointerY = Number.isFinite(event.clientY) && event.clientY > 0 ? event.clientY : (bounds ? bounds.top + Math.min(bounds.height / 2, 40) : 16);
    setContextMenu({
      x: Math.max(8, Math.min(pointerX, window.innerWidth - menuWidth - 8)),
      y: Math.max(8, Math.min(pointerY, window.innerHeight - menuHeight - 66)),
      targetId,
    });
    setShortcutPickerOpen(false);
    setStartOpen(false);
  };
  const refreshDesktop = () => {
    setSelectedDesktopIcon(null);
    closeContextMenu();
    setDesktopNotice('Desktop refreshed');
    notify('Desktop refreshed','Icon selection and context menus were cleared.');
  };
  const toggleDesktopShortcut = (id) => {
    if (id === 'vault') return;
    setShortcutIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
    const removed = shortcutIds.includes(id);
    setDesktopNotice(removed ? 'Shortcut removed' : 'Shortcut added');
    notify(removed ? 'Shortcut removed' : 'Shortcut added', apps.find(item=>item.id===id)?.title || 'Desktop shortcut');
    closeContextMenu();
  };
  const openApp = (id) => {
    setDesktopRestoreIds(null);
    const nextZ=z+1; setZ(nextZ);
    setWindows(current=>({...current,[id]:current[id]?{...current[id],minimized:false,zIndex:nextZ}:{position:{x:startPosition.x+Object.keys(current).length*22,y:startPosition.y+Object.keys(current).length*18},maximized:false,minimized:false,zIndex:nextZ}}));
    setActiveId(id); setStartOpen(false); setSearch(''); setShowAllApps(false); setHighlightedApp(0);
    setQuickSettingsOpen(false); setNotificationsOpen(false); setCalendarOpen(false); setShortcutsOpen(false);
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
  const toggleShowDesktop = () => {
    if (desktopRestoreIds) {
      const restoreIds = desktopRestoreIds.filter(id => windows[id]);
      setWindows(current => {
        const next = { ...current };
        let nextZ = z;
        restoreIds.forEach(id => { nextZ += 1; next[id] = { ...next[id], minimized: false, zIndex: nextZ }; });
        return next;
      });
      setZ(current => current + restoreIds.length);
      setActiveId(restoreIds[restoreIds.length - 1] ?? null);
      setDesktopRestoreIds(null);
      return;
    }
    const restoreIds = Object.entries(windows).filter(([, state]) => !state.minimized).sort((a, b) => (a[1].zIndex || 0) - (b[1].zIndex || 0)).map(([id]) => id);
    if (!restoreIds.length) return;
    setDesktopRestoreIds(restoreIds);
    setWindows(current => Object.fromEntries(Object.entries(current).map(([id, state]) => [id, { ...state, minimized: true }])));
    setActiveId(null);
  };
  const visible = useMemo(()=>Object.entries(windows).filter(([,w])=>!w.minimized),[windows]);
  const query = search.trim().toLowerCase();
  const searchResults = apps.filter(a => [a.title, a.subtitle, a.group].some(value => value.toLowerCase().includes(query)));
  const pinnedIds = ['about','explorer','browser','resume','settings','contact'];
  const displayedApps = query ? searchResults : showAllApps ? apps : apps.filter(a => pinnedIds.includes(a.id));
  const launchHighlightedApp = () => {
    const selected = displayedApps[Math.max(0, Math.min(highlightedApp, displayedApps.length - 1))];
    if (selected) openApp(selected.id);
  };
  useEffect(() => {
    const key = (event) => {
      const targetElement = event.target instanceof HTMLElement ? event.target : null;
      const isEditing = Boolean(targetElement && (
        targetElement.matches('input, textarea, select, [contenteditable="true"]') ||
        targetElement.isContentEditable
      ));

      // Escape should always dismiss Start, including while its search field is focused.
      if (event.key === 'Escape' && contextMenu) {
        event.preventDefault();
        closeContextMenu();
        return;
      }
      if (event.key === 'Escape' && (quickSettingsOpen || notificationsOpen || calendarOpen || shortcutsOpen)) {
        event.preventDefault();
        setQuickSettingsOpen(false); setNotificationsOpen(false); setCalendarOpen(false); setShortcutsOpen(false);
        return;
      }
      if (event.key === '?' && !event.ctrlKey && !event.metaKey && !event.altKey && !isEditing) {
        event.preventDefault(); setShortcutsOpen(value=>!value); return;
      }
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
  }, [activeId, startOpen, z, contextMenu, quickSettingsOpen, notificationsOpen, calendarOpen, shortcutsOpen]);
  return <main className={'desktop theme-'+theme+' wallpaper-'+wallpaper+(reduceMotion?' reduced-motion':'')+(focusMode?' focus-mode':'')} style={{'--accent':accentColors[accent] || accentColors.blue}} onContextMenu={event=>{if(!event.target.closest('.window,.taskbar,.start-menu,.desktop-context-menu'))showContextMenu(event);}} onPointerDown={e=>{if(e.target===e.currentTarget){setStartOpen(false);setSelectedDesktopIcon(null);closeContextMenu();}}}>
    <div className="wallpaper-shape shape-one"/><div className="wallpaper-shape shape-two"/>
    <div className="desktop-icons" onContextMenu={event=>{if(event.target===event.currentTarget)showContextMenu(event);}}>{[...apps.filter(a=>['about','explorer','browser','resume','contact','vault'].includes(a.id)),...apps.filter(a=>shortcutIds.includes(a.id)&&!['about','explorer','browser','resume','contact','vault'].includes(a.id))].map(a=>{const Icon=a.icon;return <button className={'desktop-icon '+(selectedDesktopIcon===a.id?'desktop-icon-selected':'')} key={a.id} onClick={()=>setSelectedDesktopIcon(a.id)} onDoubleClick={()=>openApp(a.id)} onContextMenu={event=>showContextMenu(event,a.id)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openApp(a.id);}if(event.key==='ContextMenu'||(event.shiftKey&&event.key==='F10'))showContextMenu(event,a.id);}} aria-label={"Open "+a.title} aria-pressed={selectedDesktopIcon===a.id}><span className={'icon-tile icon-'+a.id}><Icon size={25}/></span><span>{a.title}</span></button>})}</div>
    <div className="welcome"><span>PERSONAL DESKTOP</span><h1>Good to see you.</h1><p>Double-click an icon to explore. Right-click for options.</p></div>
    {contextMenu&&<><button className="context-dismiss" aria-label="Close desktop context menu" onClick={closeContextMenu}/><section className="desktop-context-menu" role="menu" aria-label="Desktop options" style={{left:contextMenu.x,top:contextMenu.y}} onContextMenu={event=>event.preventDefault()}>
      {contextMenu.targetId ? <>
        <button role="menuitem" onClick={()=>{const id=contextMenu.targetId;closeContextMenu();openApp(id);}}><Folder size={15}/> Open <span>↵</span></button>
        <button role="menuitem" onClick={()=>{closeContextMenu();openApp('settings');}}><Settings2 size={15}/> Personalize <span> </span></button>
        {shortcutIds.includes(contextMenu.targetId)&&<button role="menuitem" onClick={()=>toggleDesktopShortcut(contextMenu.targetId)}><X size={15}/> Remove shortcut</button>}
      </> : <>
        <button role="menuitem" onClick={refreshDesktop}><RefreshCw size={15}/> Refresh desktop <span> </span></button>
        <button role="menuitem" onClick={()=>{setShortcutPickerOpen(value=>!value);}}><Plus size={15}/> New shortcut <ChevronRight size={14}/></button>
        {shortcutPickerOpen&&<div className="shortcut-picker" role="group" aria-label="Choose an app shortcut">{apps.filter(item=>item.id!=='vault'&&!['about','explorer','browser','resume','contact'].includes(item.id)&&!shortcutIds.includes(item.id)).map(item=><button key={item.id} onClick={()=>toggleDesktopShortcut(item.id)}><span className={'icon-tile icon-'+item.id}><item.icon size={16}/></span><span>{item.title}</span><Plus size={13}/></button>)}{apps.filter(item=>item.id!=='vault'&&!['about','explorer','browser','resume','contact'].includes(item.id)&&!shortcutIds.includes(item.id)).length===0&&<p>All available shortcuts are already on the desktop.</p>}</div>}
        <button role="menuitem" onClick={()=>{closeContextMenu();openApp('settings');}}><Monitor size={15}/> Personalize <span> </span></button>
      </>}
    </section></>}
    {desktopNotice&&<div className="desktop-notice" role="status">{desktopNotice}</div>}
    {quickSettingsOpen&&<><button className="panel-dismiss" aria-label="Close quick settings" onClick={()=>setQuickSettingsOpen(false)}/><section className="system-panel quick-panel" role="dialog" aria-label="Quick settings"><header><b>Quick settings</b><button onClick={()=>setQuickSettingsOpen(false)} aria-label="Close quick settings"><X size={15}/></button></header><div className="quick-grid"><button aria-pressed={theme==='dark'} className={theme==='dark'?'quick-tile selected':'quick-tile'} onClick={()=>{setTheme(value=>value==='dark'?'light':'dark');notify('Appearance changed',theme==='dark'?'Light theme enabled':'Dark theme enabled')}}><Moon size={18}/><span>Dark theme</span><small>{theme==='dark'?'On':'Off'}</small></button><button aria-pressed={focusMode} className={focusMode?'quick-tile selected':'quick-tile'} onClick={()=>{setFocusMode(value=>!value);notify('Focus mode',focusMode?'Focus mode disabled':'Focus mode enabled')}}><Monitor size={18}/><span>Focus mode</span><small>{focusMode?'On':'Off'}</small></button><button aria-pressed={reduceMotion} className={reduceMotion?'quick-tile selected':'quick-tile'} onClick={()=>{setReduceMotion(value=>!value);notify('Motion preference',reduceMotion?'Reduced motion disabled':'Reduced motion enabled')}}><Sun size={18}/><span>Reduce motion</span><small>{reduceMotion?'On':'Off'}</small></button><button className="quick-tile" onClick={()=>{setQuickSettingsOpen(false);openApp('settings')}}><Settings2 size={18}/><span>Settings</span><small>Personalize</small></button></div><p className="panel-footnote">These controls affect this desktop session; theme preferences are saved locally.</p></section></>}
    {notificationsOpen&&<><button className="panel-dismiss" aria-label="Close notifications" onClick={()=>setNotificationsOpen(false)}/><section className="system-panel notification-panel" role="dialog" aria-label="Notification center"><header><b>Notifications</b><button onClick={()=>setNotifications([])} disabled={!notifications.length}>Clear all</button></header>{notifications.length?<div className="notification-list">{notifications.map(item=><article key={item.id}><b>{item.title}</b><p>{item.message}</p><time>{item.time.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</time></article>)}</div>:<div className="panel-empty"><BellIcon/><b>You're all caught up</b><p>Desktop updates will appear here while this session is open.</p></div>}</section></>}
    {calendarOpen&&<><button className="panel-dismiss" aria-label="Close calendar" onClick={()=>setCalendarOpen(false)}/><section className="system-panel calendar-panel" role="dialog" aria-label="Date and time"><header><b>{clock.toLocaleDateString([], {weekday:'long',month:'long',day:'numeric'})}</b><button onClick={()=>setCalendarOpen(false)} aria-label="Close calendar"><X size={15}/></button></header><div className="calendar-clock">{clock.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'})}</div><p>{clock.toLocaleDateString([], {year:'numeric',month:'long',day:'numeric'})}</p><div className="calendar-week"><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span><span>SUN</span></div><div className="calendar-days">{Array.from({length:new Date(clock.getFullYear(),clock.getMonth(),1).getDay()===0?6:new Date(clock.getFullYear(),clock.getMonth(),1).getDay()-1},(_,i)=><span key={'blank'+i}/>)}{Array.from({length:new Date(clock.getFullYear(),clock.getMonth()+1,0).getDate()},(_,i)=><span key={i+1} className={i+1===clock.getDate()?'today':''}>{i+1}</span>)}</div><p className="panel-footnote">Local device date and time. No calendar account is connected.</p></section></>}
    {shortcutsOpen&&<><button className="panel-dismiss" aria-label="Close keyboard shortcuts" onClick={()=>setShortcutsOpen(false)}/><section className="system-panel shortcuts-panel" role="dialog" aria-label="Keyboard shortcuts"><header><b>Keyboard shortcuts</b><button onClick={()=>setShortcutsOpen(false)} aria-label="Close shortcuts"><X size={15}/></button></header><div className="shortcut-row"><span>Open Start</span><kbd>Alt</kbd><kbd>Shift</kbd><kbd>S</kbd></div><div className="shortcut-row"><span>Open File Explorer</span><kbd>Alt</kbd><kbd>Shift</kbd><kbd>E</kbd></div><div className="shortcut-row"><span>Open Project browser</span><kbd>Alt</kbd><kbd>Shift</kbd><kbd>B</kbd></div><div className="shortcut-row"><span>Open Terminal</span><kbd>Alt</kbd><kbd>Shift</kbd><kbd>T</kbd></div><div className="shortcut-row"><span>Close active window</span><kbd>Alt</kbd><kbd>F4</kbd></div><div className="shortcut-row"><span>Show this guide</span><kbd>?</kbd></div><p className="panel-footnote">Shortcuts are ignored while typing in editable fields.</p></section></>}
    {visible.map(([id,state])=>{const app=apps.find(a=>a.id===id);return <WindowFrame key={id} app={app} state={state} active={activeId===id} onFocus={()=>focusApp(id)} onClose={()=>closeApp(id)} onMinimize={()=>minimizeApp(id)} onMaximize={()=>toggleMaximize(id)} onMove={pos=>moveWindow(id,pos)} onResize={geometry=>resizeWindow(id,geometry)} onDragStart={()=>startWindowDrag(id)} onSnap={side=>snapWindow(id,side)}><AppContent id={id} openApp={openApp} theme={theme} setTheme={setTheme} wallpaper={wallpaper} setWallpaper={setWallpaper} accent={accent} setAccent={setAccent}/></WindowFrame>})}
    {startOpen&&<><button className="dismiss" aria-label="Dismiss Start menu" onClick={()=>setStartOpen(false)}/><section className="start-menu" role="dialog" aria-label="Start menu"><label className="start-search"><Search size={16}/><input autoFocus value={search} aria-label="Search apps by name, description, or category" aria-controls="start-app-results" aria-keyshortcuts="ArrowDown ArrowUp Enter" onChange={e=>{setSearch(e.target.value);setHighlightedApp(0);}} onKeyDown={event=>{if(event.key==='ArrowDown'){event.preventDefault();setHighlightedApp(index=>Math.min(index+1,Math.max(0,displayedApps.length-1)));}else if(event.key==='ArrowUp'){event.preventDefault();setHighlightedApp(index=>Math.max(0,index-1));}else if(event.key==='Enter'){event.preventDefault();launchHighlightedApp();}}} placeholder="Search apps, descriptions, categories…"/></label><div className="start-heading"><b>{query?'Search results':showAllApps?'All apps':'Pinned'}</b><button className="start-view-toggle" onClick={()=>{setShowAllApps(value=>!value);setHighlightedApp(0);}}>{showAllApps?'Pinned':'All apps'} <ChevronRight size={12}/></button></div><div className="start-grid" id="start-app-results" role="listbox" aria-label={query?'Search results':showAllApps?'All apps':'Pinned apps'}>{displayedApps.map((a,index)=>{const Icon=a.icon;return <button key={a.id} role="option" aria-selected={highlightedApp===index} className={highlightedApp===index?'app-result highlighted':'app-result'} onMouseEnter={()=>setHighlightedApp(index)} onClick={()=>openApp(a.id)}><span className={'icon-tile icon-'+a.id}><Icon size={22}/></span><span className="app-result-copy"><small>{a.title}</small><em>{a.subtitle}</em></span></button>})}{displayedApps.length===0&&<p className="start-empty">No apps match “{search}”. Try a name like Settings or Explorer.</p>}</div><p className="start-hint"><kbd>↑</kbd><kbd>↓</kbd> navigate <kbd>Enter</kbd> open <kbd>Esc</kbd> close</p><footer><span className="profile-mini">P.</span><b>Prottush</b><button aria-label="Close Start menu" onClick={()=>setStartOpen(false)}><Power size={16}/></button></footer></section></>}
    <footer className="taskbar"><div className="weather"><span>☀</span><div><b>Clear skies</b><small>Make today count</small></div></div><div className="taskbar-center"><button className="task-icon windows-logo" aria-label="Start menu" aria-expanded={startOpen} onClick={()=>setStartOpen(v=>!v)}><span>▦</span></button>{[...new Set([...Object.keys(windows)])].map(id=>{const a=apps.find(app=>app.id===id);const Icon=a.icon;return <button key={id} className={'task-icon '+(activeId===id&&!windows[id].minimized?'task-active':'')+(windows[id].minimized?' task-minimized':'')} data-window-state={windows[id].minimized?'minimized':activeId===id?'active':'open'} title={a.title} aria-label={(windows[id].minimized?'Restore ':activeId===id?'Minimize ':'Focus ')+a.title} aria-pressed={activeId===id&&!windows[id].minimized} onClick={()=>windows[id].minimized?openApp(id):activeId===id?minimizeApp(id):focusApp(id)}><Icon size={19}/></button>})}<button className="task-icon" title="Search" aria-label="Open app search" onClick={()=>setStartOpen(true)}><Search size={18}/></button></div><div className="system-tray"><button className="tray-button" aria-label="Open quick settings" aria-expanded={quickSettingsOpen} onClick={()=>{setQuickSettingsOpen(value=>!value);setNotificationsOpen(false);setCalendarOpen(false)}}><Sun size={15}/><span>Quick</span></button><button className="tray-button notification-trigger" aria-label={'Open notifications, '+notifications.length+' new'} aria-expanded={notificationsOpen} onClick={()=>{setNotificationsOpen(value=>!value);setQuickSettingsOpen(false);setCalendarOpen(false)}}><BellIcon size={15}/>{notifications.length>0&&<i>{notifications.length>9?'9+':notifications.length}</i>}</button><button className="tray-clock" aria-label="Open calendar and clock" aria-expanded={calendarOpen} onClick={()=>{setCalendarOpen(value=>!value);setQuickSettingsOpen(false);setNotificationsOpen(false)}}><time>{clock.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</time><time>{clock.toLocaleDateString([], {month:'numeric',day:'numeric',year:'numeric'})}</time></button></div><button className="show-desktop" title="Show desktop" aria-label={desktopRestoreIds ? 'Restore windows' : 'Show desktop'} aria-pressed={Boolean(desktopRestoreIds)} onClick={toggleShowDesktop}/></footer>
  </main>;
}
