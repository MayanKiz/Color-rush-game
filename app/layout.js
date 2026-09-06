import './globals.css';

export const metadata = {
  title: 'Color Rush — Reflex Arena',
  description: 'A fast, focused colour-matching reflex challenge.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
