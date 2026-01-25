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
        <link rel="icon" href="https://media.istockphoto.com/id/1313889711/vector/pharmacy-logo-icon-design-vector.jpg?s=612x612&w=0&k=20&c=VCXSKZSViMbf3eXYZ8EeUqJmuw67M13H1MehDvR3wxI=" />
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
