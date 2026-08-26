'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useResetPassword } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthCard } from '../auth-card';
import { toast } from '@/stores/toast-store';

const schema = z
  .object({
    newPassword: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const reset = useResetPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  if (!token) {
    return (
      <p className="text-sm text-slate-500">
        Link không hợp lệ hoặc đã hết hạn.{' '}
        <Link href="/auth/forgot-password" className="font-medium text-primary-700 hover:underline">
          Yêu cầu lại
        </Link>
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((data) =>
        reset.mutate(
          { token, newPassword: data.newPassword },
          {
            onSuccess: () => {
              toast.success('Đổi mật khẩu thành công! Vui lòng đăng nhập lại.');
              router.push('/auth/login');
            },
            onError: (err) => toast.error(err.message),
          },
        ),
      )}
      className="space-y-4"
    >
      <div>
        <label htmlFor="rp-password" className="mb-1 block text-sm font-medium text-slate-700">
          Mật khẩu mới
        </label>
        <Input id="rp-password" type="password" autoComplete="new-password" {...register('newPassword')} error={errors.newPassword?.message} />
      </div>
      <div>
        <label htmlFor="rp-confirm" className="mb-1 block text-sm font-medium text-slate-700">
          Xác nhận mật khẩu mới
        </label>
        <Input id="rp-confirm" type="password" autoComplete="new-password" {...register('confirmPassword')} error={errors.confirmPassword?.message} />
      </div>
      <Button type="submit" size="lg" className="w-full" loading={reset.isPending}>
        Đặt lại mật khẩu
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthCard title="Đặt lại mật khẩu" subtitle="Nhập mật khẩu mới cho tài khoản của bạn.">
      <Suspense fallback={<p className="text-sm text-slate-400">Đang tải…</p>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthCard>
  );
}
