import type { Metadata } from 'next';
import { AccountLayoutShell } from '@/components/account/account-nav';

export const metadata: Metadata = {
  title: 'Tài khoản của tôi',
  robots: { index: false },
};

export default function AccountRootLayout({ children }: { children: React.ReactNode }) {
  return <AccountLayoutShell>{children}</AccountLayoutShell>;
}
