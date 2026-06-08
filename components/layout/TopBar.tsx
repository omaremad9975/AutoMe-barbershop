'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Menu, Globe, Clock } from 'lucide-react';
import { ShiftSummaryModal } from '@/components/shift/ShiftSummaryModal';
import type { User } from '@/lib/types';

interface Props {
  onMenuClick: () => void;
  currentUser: User;
}

export function TopBar({ onMenuClick, currentUser }: Props) {
  const locale = useLocale();
  const t = useTranslations('shiftClose');
  const router = useRouter();

  const [shiftModalOpen, setShiftModalOpen] = useState(false);

  async function toggleLocale() {
    const newLocale = locale === 'ar' ? 'en' : 'ar';
    await fetch('/api/locale', {
      method: 'POST',
      body: JSON.stringify({ locale: newLocale }),
      headers: { 'Content-Type': 'application/json' },
    });
    router.refresh();
  }

  return (
    <>
      <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3 shrink-0">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex-1" />

        {/* ── Close Shift button (visible to all roles) ── */}
        <button
          id="close-shift-btn"
          onClick={() => setShiftModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                     bg-amber-50 text-amber-700 border border-amber-200
                     hover:bg-amber-100 transition"
        >
          <Clock className="w-4 h-4" />
          <span className="hidden sm:inline">{t('button')}</span>
        </button>

        {/* Language toggle */}
        <button
          onClick={toggleLocale}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition"
        >
          <Globe className="w-4 h-4" />
          <span className="font-medium">{locale === 'ar' ? 'EN' : 'ع'}</span>
        </button>
      </header>

      {/* Shift Summary Modal */}
      {shiftModalOpen && (
        <ShiftSummaryModal
          open={shiftModalOpen}
          onClose={() => setShiftModalOpen(false)}
          cashierName={currentUser.name}
        />
      )}
    </>
  );
}
