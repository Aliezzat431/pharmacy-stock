import AuthWrapper from './components/AuthWrapper';
import './globals.css';



export default function RootLayout({ children }) {
  

  return (
    <html lang="ar">
      <head>

       
        </head>
      <body className={`flex min-h-screen bg-gray-100 dark:bg-zinc-900`}>
        <div className="flex-1 p-4">
          <AuthWrapper>{children}</AuthWrapper>
        </div>
      </body>
    </html>
  );
}
