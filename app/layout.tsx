import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'Barber Shop System',
  description: 'Multi-tenant barber shop management',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js'); }`,
          }}
        />
      </head>
      <body className={locale === 'ar' ? 'font-arabic' : 'font-sans'}>
        <NextIntlClientProvider messages={messages} locale={locale}>
          {children}
          <Toaster position={dir === 'rtl' ? 'top-left' : 'top-right'} richColors />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
