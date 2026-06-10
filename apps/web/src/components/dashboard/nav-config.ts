import {
  Bell,
  BellRing,
  FolderOpen,
  Heart,
  LayoutDashboard,
  LineChart,
  Package,
  Settings,
  ShieldCheck,
  Store,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** When true, only ADMIN role sees the link. */
  adminOnly?: boolean;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Workspace',
    items: [
      { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
      { href: '/products', label: 'Products', icon: Package },
      { href: '/saved', label: 'Saved', icon: Heart },
      { href: '/collections', label: 'Collections', icon: FolderOpen },
      { href: '/analytics', label: 'Analytics', icon: LineChart },
      { href: '/alerts', label: 'Alerts', icon: BellRing },
      { href: '/notifications', label: 'Notifications', icon: Bell },
      { href: '/marketplaces', label: 'Marketplaces', icon: Store },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
  {
    label: 'Administration',
    items: [{ href: '/admin', label: 'Admin', icon: ShieldCheck, adminOnly: true }],
  },
];

export function isPathActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
