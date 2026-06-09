'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

// ─── UPDATE THIS every time you release new features ───────────────────────
const CURRENT_VERSION = '1.1';

const WHATS_NEW: { ar: string; en: string }[] = [
  {
    ar: 'صفحة الحسابات: تتبع مصاريف المحل وتقاريرها',
    en: 'Accounts page: track and report shop expenses',
  },
  {
    ar: 'تغيير كلمة المرور من صفحة الإعدادات مباشرةً',
    en: 'Change your password directly from Settings',
  },
  {
    ar: 'البحث عن العملاء في نافذة المواعيد',
    en: 'Search clients in the appointments modal',
  },
  {
    ar: 'إصلاح ملخص الوردية — يظهر الآن جميع الفواتير بشكل صحيح',
    en: 'Shift summary fix — all invoices now appear correctly',
  },
];
// ───────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'autome-whats-new-version';

export function WhatsNewModal() {
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (seen !== CURRENT_VERSION) {
      setOpen(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#1a1a2e] to-[#2d2d5e] px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-yellow-300" />
            </div>
            <div>
              <p className="text-xs text-white/50 font-medium">
                {locale === 'ar' ? `الإصدار ${CURRENT_VERSION}` : `Version ${CURRENT_VERSION}`}
              </p>
              <h2 className="text-white font-bold text-lg leading-tight">
                {locale === 'ar' ? 'ما الجديد؟ ✨' : "What's New ✨"}
              </h2>
            </div>
          </div>
          <button
            onClick={dismiss}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feature list */}
        <div className="px-6 py-5 space-y-3">
          {WHATS_NEW.map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-green-500" />
              </div>
              <p className="text-sm text-gray-700 leading-snug">
                {locale === 'ar' ? item.ar : item.en}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5">
          <Button onClick={dismiss} className="w-full">
            {locale === 'ar' ? 'فهمت، شكراً! 👍' : "Got it, thanks! 👍"}
          </Button>
        </div>
      </div>
    </div>
  );
}
