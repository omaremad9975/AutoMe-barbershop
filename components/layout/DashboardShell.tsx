'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import type { Shop, User } from '@/lib/types';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { WhatsNewModal } from './WhatsNewModal';

interface Props {
  shop: Shop;
  currentUser: User;
  children: React.ReactNode;
}

export function DashboardShell({ shop, currentUser, children }: Props) {
  const locale = useLocale();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Apply brand color
    document.documentElement.style.setProperty('--brand-color', shop.brand_color);

    // #10 — apply saved theme
    const saved = localStorage.getItem('barber-theme') ?? 'default';
    document.documentElement.setAttribute('data-theme', saved);

    // Record shift start time if not already set for this session
    if (!localStorage.getItem('shift-start-time')) {
      localStorage.setItem('shift-start-time', new Date().toISOString());
    }
  }, [shop.brand_color]);

  return (
    <div
      className="flex h-screen overflow-hidden bg-gray-50"
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
    >
      <Sidebar
        shop={shop}
        currentUser={currentUser}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <TopBar onMenuClick={() => setSidebarOpen(true)} currentUser={currentUser} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>

      <WhatsNewModal />
    </div>
  );
}
