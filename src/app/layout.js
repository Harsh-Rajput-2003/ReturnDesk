import './globals.css';

export const metadata = {
  title: 'ReturnDesk — Return Management System',
  description: 'Create, review and complete customer return requests.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
