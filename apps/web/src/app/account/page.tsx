'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/stores/auth-store';
import { useMe } from '@/hooks/use-auth';
import { patchData } from '@/lib/api';
import type { User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListSkeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';
import { toast } from '@/stores/toast-store';

const profileSchema = z.object({
  fullName: z.string().min(1, 'Vui lòng nhập họ tên'),
  phone: z
    .string()
    .regex(/^0\d{9,10}$/, 'Số điện thoại không hợp lệ')
    .or(z.literal('')),
});

type ProfileForm = z.infer<typeof profileSchema>;

function ProfileContent() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const hydrated = useAuthStore((s) => s.hydrated);
  const setUser = useAuthStore((s) => s.setUser);
  const meQuery = useMe();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (hydrated && !accessToken) {
      router.replace('/auth/login?redirect=/account');
    }
  }, [hydrated, accessToken, router]);

  const user: User | undefined = meQuery.data;

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: {
      fullName: user?.fullName ?? '',
      phone: user?.phone ?? '',
    },
  });

  if (!hydrated || !accessToken) return <ListSkeleton rows={3} />;

  if (meQuery.isLoading) return <ListSkeleton rows={3} />;
  if (meQuery.isError) return <div className="py-8 text-center text-sm text-red-600">Không thể tải thông tin. <button className="underline" onClick={() => meQuery.refetch()}>Thử lại</button></div>;

  const onSubmit = form.handleSubmit(async (data) => {
    setSaving(true);
    try {
      const updated = await patchData<User>('/users/me', { ...data, phone: data.phone || undefined });
      setUser(updated);
      toast.success('Đã cập nhật hồ sơ');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Cập nhật thất bại');
    } finally {
      setSaving(false);
    }
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Hồ sơ của tôi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-xl font-bold text-primary-700">
              {(user?.fullName ?? 'U').charAt(0).toUpperCase()}
            </span>
            <div>
              <p className="font-semibold text-slate-900">{user?.fullName}</p>
              <p className="text-xs text-slate-400">
                Thành viên từ {user ? formatDate(user.createdAt).split(' ')[0] : '—'}
              </p>
              {!user?.emailVerifiedAt && (
                <p className="mt-0.5 text-xs text-amber-600">Email chưa được xác thực</p>
              )}
            </div>
          </div>

          <form onSubmit={onSubmit} className="max-w-md space-y-3">
            <div>
              <label htmlFor="pf-email" className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <Input id="pf-email" value={user?.email ?? ''} disabled />
            </div>
            <div>
              <label htmlFor="pf-name" className="mb-1 block text-sm font-medium text-slate-700">
                Họ và tên
              </label>
              <Input id="pf-name" {...form.register('fullName')} error={form.formState.errors.fullName?.message} />
            </div>
            <div>
              <label htmlFor="pf-phone" className="mb-1 block text-sm font-medium text-slate-700">
                Số điện thoại
              </label>
              <Input id="pf-phone" inputMode="tel" {...form.register('phone')} error={form.formState.errors.phone?.message} />
            </div>
            <Button type="submit" loading={saving}>
              Lưu thay đổi
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bảo mật</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            Bạn có thể đổi mật khẩu trong phần cài đặt bảo mật.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AccountPage() {
  return <ProfileContent />;
}
