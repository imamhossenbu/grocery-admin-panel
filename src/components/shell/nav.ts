import {
  LayoutDashboard,
  MessageSquareText,
  Newspaper,
  Package,
  Settings,
  ShoppingBag,
  Star,
  TicketPercent,
  UserCog,
  Users,
  FolderTree,
  type LucideIcon,
} from 'lucide-react';
import type { Pulse } from '@/types/admin';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** "g" + key jumps here. */
  key: string;
  badge?: (p: Pulse) => { count: number; tone: 'highlight' | 'danger' | 'gray'; label: string } | null;
  keywords?: string;
}

export interface NavGroup {
  label: string | null;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    label: null,
    items: [{ href: '/', label: 'Overview', icon: LayoutDashboard, key: 'd', keywords: 'dashboard home analytics' }],
  },
  {
    label: 'Sales',
    items: [
      {
        href: '/orders',
        label: 'Orders',
        icon: ShoppingBag,
        key: 'o',
        keywords: 'sales cod payments',
        badge: (p) => (p.pendingOrders ? { count: p.pendingOrders, tone: 'highlight', label: `${p.pendingOrders} pending orders` } : null),
      },
      { href: '/customers', label: 'Customers', icon: Users, key: 'u', keywords: 'people buyers accounts' },
    ],
  },
  {
    label: 'Catalog',
    items: [
      {
        href: '/products',
        label: 'Products',
        icon: Package,
        key: 'p',
        keywords: 'inventory stock items',
        badge: (p) => (p.lowStock ? { count: p.lowStock, tone: 'danger', label: `${p.lowStock} products low on stock` } : null),
      },
      { href: '/categories', label: 'Categories', icon: FolderTree, key: 'c', keywords: 'aisles tree' },
      { href: '/coupons', label: 'Coupons', icon: TicketPercent, key: 'k', keywords: 'discounts promo codes' },
    ],
  },
  {
    label: 'Engagement',
    items: [
      {
        href: '/reviews',
        label: 'Reviews',
        icon: Star,
        key: 'r',
        keywords: 'ratings moderation',
        badge: (p) => (p.hiddenReviews ? { count: p.hiddenReviews, tone: 'gray', label: `${p.hiddenReviews} hidden reviews` } : null),
      },
      {
        href: '/messages',
        label: 'Messages',
        icon: MessageSquareText,
        key: 'm',
        keywords: 'contact inbox support',
        badge: (p) => (p.messagesThisWeek ? { count: p.messagesThisWeek, tone: 'gray', label: `${p.messagesThisWeek} messages this week` } : null),
      },
      { href: '/newsletter', label: 'Newsletter', icon: Newspaper, key: 'n', keywords: 'subscribers email' },
    ],
  },
  {
    label: null,
    items: [
      { href: '/profile', label: 'Profile', icon: UserCog, key: 'a', keywords: 'account password name me' },
      { href: '/settings', label: 'Settings', icon: Settings, key: 's', keywords: 'store admins cache' },
    ],
  },
];

export const NAV_ITEMS = NAV.flatMap((g) => g.items);

export function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

/** Breadcrumb trail for a pathname. */
export function crumbsFor(pathname: string): { label: string; href?: string }[] {
  if (pathname === '/') return [{ label: 'Overview' }];
  const parts = pathname.split('/').filter(Boolean);
  const section = NAV.find((g) => g.items.some((i) => i.href === `/${parts[0]}`));
  const item = NAV_ITEMS.find((i) => i.href === `/${parts[0]}`);
  const out: { label: string; href?: string }[] = [];
  if (section?.label) out.push({ label: section.label });
  if (item) out.push({ label: item.label, href: parts.length > 1 ? item.href : undefined });
  if (parts.length > 1) {
    const id = decodeURIComponent(parts[1]);
    const label =
      parts[0] === 'products'
        ? id === 'new'
          ? 'New product'
          : 'Edit product'
        : parts[0] === 'customers'
          ? 'Customer profile'
          : parts[0] === 'orders'
            ? `Order ${id}`
            : id;
    out.push({ label });
  }
  return out;
}
