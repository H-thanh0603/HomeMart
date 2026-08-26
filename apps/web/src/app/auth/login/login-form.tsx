'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLogin } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthCard } from '../auth-card';
import { toast } from '@/stores/toast-store';

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/account';
  const login = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit((data) =>
    login.mutate(data, {
      onSuccess: () => {
        toast.success('Đăng nhập thành công!');
        router.push(redirect);
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  return (
    <AuthCard
      title="Đăng nhập"
      subtitle="Chào mừng bạn quay trở lại HomeMart!"
      footer={
        <>
          Chưa có tài khoản?{' '}
          <Link href="/auth/register" className="font-medium text-primary-700 hover:underline">
            Đăng ký ngay
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="login-email" className="mb-1 block text-sm font-medium text-slate-700">
            Email
          </label>
          <Input id="login-email" type="email" autoComplete="email" placeholder="ban@email.com" {...register('email')} error={errors.email?.message} />
        </div>
        <div>
          <label htmlFor="login-password" className="mb-1 block text-sm font-medium text-slate-700">
            Mật khẩu
          </label>
          <Input id="login-password" type="password" autoComplete="current-password" placeholder="••••••••" {...register('password')} error={errors.password?.message} />
        </div>
        <div className="flex justify-end">
          <Link href="/auth/forgot-password" className="text-xs font-medium text-primary-700 hover:underline">
            Quên mật khẩu?
          </Link>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={login.isPending}>
          Đăng nhập
        </Button>
      </form>
    </AuthCard>
  );
}
