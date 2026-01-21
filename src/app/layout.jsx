import AuthWrapper from './components/AuthWrapper';
import { ToastProvider } from './components/ToastContext';
import './globals.css';

export const metadata = {
  title: 'نظام إدارة متكامل للصيدلية',
  description: 'نظام إدارة المخزون والمبيعات المتقدم ',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/Bg.jpeg" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen">
        <div className="flex flex-col min-h-screen">
          <ToastProvider>
            <AuthWrapper>{children}</AuthWrapper>
          </ToastProvider>
        </div>
      </body>
    </html>
  );
}
