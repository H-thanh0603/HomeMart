import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'Đăng nhập',
  description: 'Đăng nhập tài khoản HomeMart để mua sắm và theo dõi đơn hàng.',
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-slate-400">Đang tải…</div>}>
      <LoginForm />
    </Suspense>
  );
}
