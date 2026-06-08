'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Scissors } from 'lucide-react';
import { toast } from 'sonner';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export default function LoginPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    if (DEMO_MODE) {
      const res = await fetch('/api/demo-login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        router.push('/dashboard/pos');
        router.refresh();
      } else {
        toast.error(t('loginError'));
        setLoading(false);
      }
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error(t('loginError'));
      setLoading(false);
      return;
    }

    router.push('/dashboard/pos');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ backgroundColor: '#1a1a2e' }}
          >
            <Scissors className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">{t('loginTitle')}</h1>
          <p className="text-gray-400 mt-1">{t('loginSubtitle')}</p>
          {DEMO_MODE && (
            <span className="inline-block mt-2 px-3 py-1 text-xs bg-yellow-500/20 text-yellow-300 rounded-full border border-yellow-500/30">
              Demo Mode
            </span>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t('email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 transition"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t('password')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 transition"
                placeholder="••••••••"
              />
            </div>

            {DEMO_MODE && (
              <p className="text-xs text-gray-400 text-center">
                Use: <span className="font-mono text-gray-600">omaremad9975@gmail.com</span> / <span className="font-mono text-gray-600">123</span>
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-white font-semibold transition hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#1a1a2e' }}
            >
              {loading ? '...' : t('loginButton')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
