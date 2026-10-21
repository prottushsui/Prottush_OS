import { UserRound, FolderOpen, Globe, FileText, Mail, Terminal, Settings, ShieldCheck, CircleHelp } from 'lucide-react';

// The registry is the single source of truth for desktop shortcuts and Start menu apps.
export const apps = [
  { id: 'about', title: 'About me', icon: UserRound, subtitle: 'A little introduction', group: 'Personal' },
  { id: 'explorer', title: 'File Explorer', icon: FolderOpen, subtitle: 'Projects and documents', group: 'System' },
  { id: 'browser', title: 'Project browser', icon: Globe, subtitle: 'Places around the web', group: 'Internet' },
  { id: 'resume', title: 'CV & records', icon: FileText, subtitle: 'Public documents', group: 'Personal' },
  { id: 'contact', title: 'Contact', icon: Mail, subtitle: 'Get in touch', group: 'Personal' },
  { id: 'terminal', title: 'Terminal', icon: Terminal, subtitle: 'A tiny command prompt', group: 'System' },
  { id: 'settings', title: 'Settings', icon: Settings, subtitle: 'Appearance and preferences', group: 'System' },
  { id: 'help', title: 'Help & tips', icon: CircleHelp, subtitle: 'Shortcuts, privacy, and getting started', group: 'System' },
  { id: 'vault', title: 'Secret Space', icon: ShieldCheck, subtitle: 'Private cloud file vault', group: 'Personal' },
];

// Replace or extend these links with the final, verified project destinations.
export const projectLinks = [
  { title: 'Cambrian Climate Club', description: 'Climate education and student-led initiatives', url: 'https://cambrian-climate-club.vercel.app', mark: 'CCC' },
  { title: 'GitHub', description: 'Source code and experiments', url: 'https://github.com/prottushsui', mark: 'GH' },
  { title: 'Portfolio source', description: 'The Prottush OS repository', url: 'https://github.com/prottushsui/Prottush_OS', mark: 'OS' },
];
