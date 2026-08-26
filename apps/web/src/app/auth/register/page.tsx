'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRegister } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthCard } from '../auth-card';
import { toast } from '@/stores/toast-store';

const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Vui lòng nhập họ tên đầy đủ'),
    email: z.string().email('Email không hợp lệ'),
    phone: z
      .string()
      .regex(/^0\d{9,10}$/, 'Số điện thoại không hợp lệ')
      .or(z.literal('')),
    password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const registerMutation = useRegister();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', phone: '', password: '', confirmPassword: '' },
  });

  return (
    <AuthCard
      title="Tạo tài khoản"
      subtitle="Đăng ký để mua sắm và nhận ưu đãi độc quyền."
      footer={
        <>
          Đã có tài khoản?{' '}
          <Link href="/auth/login" className="font-medium text-primary-700 hover:underline">
            Đăng nhập
          </Link>
        </>
      }
    >
      <form
        onSubmit={handleSubmit((data) =>
          registerMutation.mutate(
            { email: data.email, password: data.password, fullName: data.fullName },
            {
              onSuccess: () => {
                toast.success('Đăng ký thành công! Vui lòng đăng nhập.');
                router.push('/auth/login');
              },
              onError: (err) => toast.error(err.message),
            },
          ),
        )}
        className="space-y-4"
      >
        <div>
          <label htmlFor="reg-name" className="mb-1 block text-sm font-medium text-slate-700">Họ và tên</label>
          <Input id="reg-name" autoComplete="name" placeholder="Nguyễn Văn A" {...register('fullName')} error={errors.fullName?.message} />
        </div>
        <div>
          <label htmlFor="reg-email" className="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <Input id="reg-email" type="email" autoComplete="email" placeholder="ban@email.com" {...register('email')} error={errors.email?.message} />
        </div>
        <div>
          <label htmlFor="reg-phone" className="mb-1 block text-sm font-medium text-slate-700">
            Số điện thoại <span className="font-normal text-slate-400">(không bắt buộc)</span>
          </label>
          <Input id="reg-phone" inputMode="tel" placeholder="0912345678" {...register('phone')} error={errors.phone?.message} />
        </div>
        <div>
          <label htmlFor="reg-password" className="mb-1 block text-sm font-medium text-slate-700">Mật khẩu</label>
          <Input id="reg-password" type="password" autoComplete="new-password" placeholder="Tối thiểu 6 ký tự" {...register('password')} error={errors.password?.message} />
        </div>
        <div>
          <label htmlFor="reg-confirm" className="mb-1 block text-sm font-medium text-slate-700">Xác nhận mật khẩu</label>
          <Input id="reg-confirm" type="password" autoComplete="new-password" {...register('confirmPassword')} error={errors.confirmPassword?.message} />
        </div>
        <Button type="submit" size="lg" className="w-full" loading={registerMutation.isPending}>
          Đăng ký
        </Button>
      </form>
    </AuthCard>
  );
}
