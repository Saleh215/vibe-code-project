// app/layout.js
export const metadata = {
  title: 'جسر المهارات - Skills Bridge',
  description: 'استعد لمستقبل العمل مع الذكاء الاصطناعي',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}