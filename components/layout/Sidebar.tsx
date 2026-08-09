'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import {
  ShoppingCart, Calendar, Users, Scissors, UserCheck,
  BarChart3, Settings, X, Package, LogOut, Pin, PinOff, Wallet, Fingerprint,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { Shop, User } from '@/lib/types';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

interface Props {
  shop: Shop;
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { key: 'pos', href: '/dashboard/pos', icon: ShoppingCart, ownerOnly: false },
  { key: 'appointments', href: '/dashboard/appointments', icon: Calendar, ownerOnly: false },
  { key: 'clients', href: '/dashboard/clients', icon: Users, ownerOnly: false },
  { key: 'services', href: '/dashboard/services', icon: Scissors, ownerOnly: false },
  { key: 'products', href: '/dashboard/products', icon: Package, ownerOnly: false },
  { key: 'employees', href: '/dashboard/employees', icon: UserCheck, ownerOnly: true },
  { key: 'attendance', href: '/dashboard/attendance', icon: Fingerprint, ownerOnly: true },
  { key: 'reports',   href: '/dashboard/reports',   icon: BarChart3, ownerOnly: true },
  { key: 'finance',   href: '/dashboard/finance',   icon: Wallet,    ownerOnly: true },
  { key: 'settings',  href: '/dashboard/settings',  icon: Settings,  ownerOnly: true },
];

const S = {
  bg: { backgroundColor: 'var(--sidebar-bg)' },
  text: { color: 'var(--sidebar-text)' },
  textActive: { color: 'var(--sidebar-text-active)' },
  activeBg: { backgroundColor: 'var(--sidebar-active-bg)' },
  hoverClass: 'hover:bg-[var(--sidebar-hover-bg)]',
  divider: { borderColor: 'var(--sidebar-divider)' },
  footer: { color: 'var(--sidebar-footer-text)' },
  iconMuted: { color: 'var(--sidebar-icon-muted)' },
};

export function Sidebar({ shop, currentUser, isOpen, onClose }: Props) {
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const isRTL = locale === 'ar';

  const [pinned, setPinned] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-pinned');
    if (saved === 'false') {
      setPinned(false);
    } else if (saved === 'true') {
      setPinned(true);
    } else {
      // Default state on desktop: collapsed (not pinned)
      setPinned(false);
    }
  }, []);

  function togglePinned() {
    const next = !pinned;
    setPinned(next);
    localStorage.setItem('sidebar-pinned', String(next));
  }

  async function handleLogout() {
    if (DEMO_MODE) {
      await fetch('/api/demo-logout', { method: 'POST' });
    } else {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    router.push('/login');
    router.refresh();
  }

  const visibleItems = navItems.filter(
    (item) => !item.ownerOnly || currentUser.role === 'owner'
  );

  const roleLabel = currentUser.role === 'owner'
    ? (locale === 'ar' ? 'مالك' : 'Owner')
    : (locale === 'ar' ? 'كاشير' : 'Cashier');

  const renderSidebarContent = (isMobile: boolean) => {
    const collapsed = isMobile ? false : !(pinned || isHovered);

    return (
      <div
        className="flex flex-col h-full border-e w-full overflow-hidden"
        style={{ ...S.bg, borderColor: 'var(--sidebar-border)' }}
      >
        {/* ── Header ───────────────────────────────── */}
        <div className="flex items-center gap-3 px-3 py-4 border-b overflow-hidden" style={S.divider}>
          {shop.logo_url ? (
            <Image src={shop.logo_url} alt={shop.name} width={36} height={36} className="rounded-lg object-cover shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-white/15">
              <Scissors className="w-4 h-4" style={S.text} />
            </div>
          )}
          <div className={cn(
            "flex-1 min-w-0 transition-opacity duration-300 ease-in-out whitespace-nowrap",
            collapsed ? "opacity-0 w-0 pointer-events-none" : "opacity-100"
          )}>
            <p className="font-semibold text-sm truncate" style={S.textActive}>{shop.name}</p>
          </div>
          <button onClick={onClose} className="lg:hidden p-1" style={S.iconMuted}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Nav ─────────────────────────────────── */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {visibleItems.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={onClose}
                title={collapsed ? t(item.key as Parameters<typeof t>[0]) : undefined}
                className={cn(
                  'flex items-center rounded-xl text-sm font-medium transition-all duration-150 w-full',
                  collapsed ? 'px-0 py-2.5 justify-center' : 'px-3 py-2.5 gap-3',
                  S.hoverClass
                )}
                style={active ? { ...S.activeBg, ...S.textActive } : S.text}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className={cn(
                  "truncate transition-opacity duration-300 ease-in-out whitespace-nowrap",
                  collapsed ? "opacity-0 w-0 pointer-events-none" : "opacity-100"
                )}>
                  {t(item.key as Parameters<typeof t>[0])}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* ── Pin button ── */}
        <div
          className="hidden lg:flex items-center justify-center py-2 border-t border-b overflow-hidden"
          style={S.divider}
        >
          <button
            onClick={togglePinned}
            className={cn(
              'flex items-center justify-center h-8 rounded-lg transition font-medium text-xs',
              collapsed ? 'w-10' : 'w-full mx-4 px-3',
              S.hoverClass
            )}
            style={S.iconMuted}
            title={pinned
              ? (locale === 'ar' ? 'إلغاء التثبيت' : 'Unpin')
              : (locale === 'ar' ? 'تثبيت' : 'Pin')}
          >
            {pinned ? <PinOff className="w-4 h-4 shrink-0" /> : <Pin className="w-4 h-4 shrink-0" />}
            <span className={cn(
              "ms-2 truncate transition-opacity duration-300 ease-in-out whitespace-nowrap",
              collapsed ? "opacity-0 w-0 pointer-events-none" : "opacity-100"
            )}>
              {pinned ? (locale === 'ar' ? 'إلغاء التثبيت' : 'Unpin') : (locale === 'ar' ? 'تثبيت القائمة' : 'Pin Sidebar')}
            </span>
          </button>
        </div>

        {/* ── User info ── */}
        <div
          className={cn(
            'flex items-center border-t py-3 transition-all duration-300 overflow-hidden',
            collapsed ? 'justify-center px-0' : 'gap-2.5 px-3'
          )}
          style={S.divider}
        >
          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
            style={{ backgroundColor: 'var(--brand-color)' }}
          >
            {currentUser.name[0]}
          </div>

          {/* Name + role */}
          <div className={cn(
            "flex-1 min-w-0 transition-opacity duration-300 ease-in-out whitespace-nowrap",
            collapsed ? "opacity-0 w-0 pointer-events-none" : "opacity-100"
          )}>
            <p className="text-xs font-semibold truncate" style={S.textActive}>{currentUser.name}</p>
            <p className="text-xs truncate" style={S.footer}>{roleLabel}</p>
          </div>

          {/* Logout icon */}
          <button
            onClick={handleLogout}
            className={cn(
              'p-1.5 rounded-lg transition shrink-0 transition-opacity duration-300 ease-in-out',
              collapsed ? 'opacity-0 w-0 pointer-events-none' : 'opacity-100'
            )}
            style={S.iconMuted}
            title={locale === 'ar' ? 'تسجيل الخروج' : 'Logout'}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 z-50 transition-transform duration-300 lg:hidden',
          isRTL ? 'right-0' : 'left-0',
          isOpen ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full'
        )}
      >
        <div className="w-64 h-full">{renderSidebarContent(true)}</div>
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex lg:flex-col shrink-0 transition-[width] duration-300 ease-in-out",
          (pinned || isHovered) ? "w-64" : "w-16"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {renderSidebarContent(false)}
      </aside>
    </>
  );
}
