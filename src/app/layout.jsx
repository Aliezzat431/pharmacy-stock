import AuthWrapper from './components/AuthWrapper';
import './globals.css';



export default function RootLayout({ children }) {
  

  return (
<html lang="ar">
  <head>{/* محتوى head هنا */}</head>
  <body className="min-h-screen bg-gray-100 dark:bg-zinc-900">
    <div className="flex flex-col min-h-screen">
      <AuthWrapper>{children}</AuthWrapper>
    </div>
  </body>
</html>

  );
}
