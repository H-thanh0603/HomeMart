'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MapPin, Star, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import {
  useAddresses,
  useCreateAddress,
  useDeleteAddress,
  useSetDefaultAddress,
} from '@/hooks/use-catalog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DialogLite } from '@/components/ui/dialog-lite';
import { ListSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import type { Address } from '@/lib/types';
import { toast } from '@/stores/toast-store';

export default function AccountAddressesPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const hydrated = useAuthStore((s) => s.hydrated);

  const addressesQuery = useAddresses(hydrated && Boolean(accessToken));
  const createAddress = useCreateAddress();
  const deleteAddress = useDeleteAddress();
  const setDefault = useSetDefaultAddress();

  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (hydrated && !accessToken) {
      router.replace('/auth/login?redirect=/account/addresses');
    }
  }, [hydrated, accessToken, router]);

  if (!hydrated || !accessToken) return <ListSkeleton rows={3} />;

  const addresses = addressesQuery.data ?? [];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Sổ địa chỉ</h1>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          + Thêm địa chỉ
        </Button>
      </div>

      {addressesQuery.isLoading ? (
        <ListSkeleton rows={3} />
      ) : addressesQuery.isError ? (
        <ErrorState onRetry={() => addressesQuery.refetch()} />
      ) : addresses.length === 0 ? (
        <EmptyState
          icon={<MapPin className="h-12 w-12" />}
          title="Chưa có địa chỉ nào"
          description="Thêm địa chỉ để giao hàng nhanh hơn."
          actionLabel="Thêm địa chỉ đầu tiên"
          onAction={() => setDialogOpen(true)}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {addresses.map((addr) => (
            <li key={addr.id}>
              <div
                className={cn(
                  'flex h-full flex-col rounded-xl bg-white p-4 shadow-card ring-1 ring-slate-100',
                  addr.isDefault && 'ring-primary-300',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-slate-800">
                    {addr.fullName}
                    <span className="ml-2 text-xs font-normal text-slate-400">{addr.phone}</span>
                  </p>
                  {addr.isDefault && (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-semibold text-primary-700">
                      <Star className="h-3 w-3" /> Mặc định
                    </span>
                  )}
                </div>
                <p className="mt-1 flex-1 text-sm text-slate-500">
                  {[addr.line, addr.ward, addr.district, addr.province].join(', ')}
                </p>
                <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                  {!addr.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      loading={setDefault.isPending}
                      onClick={() =>
                        setDefault.mutate(addr.id, {
                          onError: () => toast.error('Không thể đặt làm mặc định'),
                        })
                      }
                    >
                      Đặt làm mặc định
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Xoá địa chỉ ${addr.fullName}`}
                    className="ml-auto text-red-600 hover:bg-red-50"
                    loading={deleteAddress.isPending}
                    onClick={() =>
                      deleteAddress.mutate(addr.id, {
                        onSuccess: () => toast.success('Đã xoá địa chỉ'),
                        onError: () => toast.error('Không thể xoá địa chỉ'),
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" /> Xoá
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AddressDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        submitting={createAddress.isPending}
        onSubmit={(data) =>
          createAddress.mutate(data, {
            onSuccess: () => {
              setDialogOpen(false);
              toast.success('Đã thêm địa chỉ mới');
            },
            onError: (err) => toast.error(err.message),
          })
        }
      />
    </div>
  );
}

function AddressDialog({
  open,
  onClose,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  submitting: boolean;
  onSubmit: (data: Omit<Address, 'id' | 'isDefault'> & { isDefault?: boolean }) => void;
}) {
  return (
    <DialogLite open={open} onClose={onClose} title="Thêm địa chỉ mới">
      <AddressFields
        onSubmit={onSubmit}
        submitting={submitting}
        onCancel={onClose}
      />
    </DialogLite>
  );
}

function AddressFields({
  submitting,
  onSubmit,
  onCancel,
}: {
  submitting: boolean;
  onSubmit: (data: Omit<Address, 'id' | 'isDefault'> & { isDefault?: boolean }) => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(addressSchema),
    defaultValues: { fullName: '', phone: '', province: '', district: '', ward: '', line: '' },
  });

  return (
    <form
      className="space-y-3"
      onSubmit={handleSubmit((data) => onSubmit({ ...data, isDefault: true }))}
    >
      <div>
        <label htmlFor="addr-name" className="mb-1 block text-sm font-medium text-slate-700">Họ và tên</label>
        <Input id="addr-name" {...register('fullName')} error={errors.fullName?.message} />
      </div>
      <div>
        <label htmlFor="addr-phone" className="mb-1 block text-sm font-medium text-slate-700">Số điện thoại</label>
        <Input id="addr-phone" inputMode="tel" {...register('phone')} error={errors.phone?.message} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="addr-province" className="mb-1 block text-sm font-medium text-slate-700">Tỉnh/Thành phố</label>
          <Input id="addr-province" {...register('province')} error={errors.province?.message} />
        </div>
        <div>
          <label htmlFor="addr-district" className="mb-1 block text-sm font-medium text-slate-700">Quận/Huyện</label>
          <Input id="addr-district" {...register('district')} error={errors.district?.message} />
        </div>
        <div>
          <label htmlFor="addr-ward" className="mb-1 block text-sm font-medium text-slate-700">Phường/Xã</label>
          <Input id="addr-ward" {...register('ward')} error={errors.ward?.message} />
        </div>
      </div>
      <div>
        <label htmlFor="addr-line" className="mb-1 block text-sm font-medium text-slate-700">
          Địa chỉ cụ thể (số nhà, tên đường)
        </label>
        <Input id="addr-line" {...register('line')} error={errors.line?.message} />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Huỷ
        </Button>
        <Button type="submit" loading={submitting}>
          Lưu địa chỉ
        </Button>
      </div>
    </form>
  );
}

const addressSchema = z.object({
  fullName: z.string().min(1, 'Vui lòng nhập họ tên'),
  phone: z.string().regex(/^0\d{9,10}$/, 'Số điện thoại không hợp lệ (VD: 0912345678)'),
  province: z.string().min(1, 'Vui lòng nhập tỉnh/thành phố'),
  district: z.string().min(1, 'Vui lòng nhập quận/huyện'),
  ward: z.string().min(1, 'Vui lòng nhập phường/xã'),
  line: z.string().min(1, 'Vui lòng nhập địa chỉ chi tiết'),
});
