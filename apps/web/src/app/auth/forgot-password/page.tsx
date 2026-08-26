'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useForgotPassword } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthCard } from '../auth-card';
import { toast } from '@/stores/toast-store';

const schema = z.object({
  email: z.string().email('Email không hợp lệ'),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const forgot = useForgotPassword();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  return (
    <AuthCard
      title="Quên mật khẩu"
      subtitle="Chúng tôi sẽ gửi link đặt lại mật khẩu vào email của bạn."
      footer={
        <Link href="/auth/login" className="font-medium text-primary-700 hover:underline">
          ← Quay lại đăng nhập
        </Link>
      }
    >
      <form
        onSubmit={handleSubmit((data) =>
          forgot.mutate(data, {
            onSuccess: () =>
              toast.success('Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi.'),
            onError: (err) => toast.error(err.message),
          }),
        )}
        className="space-y-4"
      >
        <div>
          <label htmlFor="fp-email" className="mb-1 block text-sm font-medium text-slate-700">
            Email
          </label>
          <Input id="fp-email" type="email" autoComplete="email" placeholder="ban@email.com" {...register('email')} error={errors.email?.message} />
        </div>
        <Button type="submit" size="lg" className="w-full" loading={forgot.isPending}>
          Gửi link đặt lại mật khẩu
        </Button>
      </form>
    </AuthCard>
  );
}
