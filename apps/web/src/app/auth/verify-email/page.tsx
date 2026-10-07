'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getData } from '@/lib/api';
import { AuthCard } from '../auth-card';

function VerifyEmailInner() {
  const token = useSearchParams().get('token') ?? '';
  const [result, setResult] = useState<'ok' | 'error' | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) return;
    let active = true;
    getData<{ message: string }>({ url: `/auth/verify-email?token=${encodeURIComponent(token)}` })
      .then(() => {
        if (active) setResult('ok');
      })
      .catch((err: Error) => {
        if (active) {
          setMessage(err.message);
          setResult('error');
        }
      });
    return () => {
      active = false;
    };
  }, [token]);

  if (!token || result === 'error') {
    return (
      <p className="text-sm text-slate-500">
        {message || 'Link xác thực không hợp lệ hoặc đã hết hạn.'}{' '}
        <Link href="/auth/login" className="font-medium text-primary-700 hover:underline">
          Về trang đăng nhập
        </Link>
      </p>
    );
  }
  if (result === 'ok') {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-slate-600">Email của bạn đã được xác thực. 🎉</p>
        <Link href="/auth/login" className="font-medium text-primary-700 hover:underline">
          Đăng nhập ngay
        </Link>
      </div>
    );
  }
  return <p className="text-sm text-slate-400">Đang xác thực…</p>;
}

export default function VerifyEmailPage() {
  return (
    <AuthCard title="Xác thực email" subtitle="Chúng tôi đang xác thực email của bạn.">
      <Suspense fallback={<p className="text-sm text-slate-400">Đang tải…</p>}>
        <VerifyEmailInner />
      </Suspense>
    </AuthCard>
  );
}
