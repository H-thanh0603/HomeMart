'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreditCard, MapPin, ShoppingBag, Wallet } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { postData } from '@/lib/api';
import {
  useAddresses,
  useCart,
  useCreateAddress,
} from '@/hooks/use-catalog';
import {
  useCheckout,
  useOrderPreview,
  useShippingMethods,
} from '@/hooks/use-orders';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DialogLite } from '@/components/ui/dialog-lite';
import { ListSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { cn, formatCurrency, PAYMENT_METHOD_LABELS } from '@/lib/utils';
import type { PaymentMethodType } from '@/lib/types';
import { toast } from '@/stores/toast-store';
import { useCartStore } from '@/stores/cart-store';

const addressSchema = z.object({
  fullName: z.string().min(1, 'Vui lòng nhập họ tên'),
  phone: z
    .string()
    .regex(/^0\d{9,10}$/, 'Số điện thoại không hợp lệ (VD: 0912345678)'),
  province: z.string().min(1, 'Vui lòng nhập tỉnh/thành phố'),
  district: z.string().min(1, 'Vui lòng nhập quận/huyện'),
  ward: z.string().min(1, 'Vui lòng nhập phường/xã'),
  line: z.string().min(1, 'Vui lòng nhập địa chỉ chi tiết'),
});

type AddressForm = z.infer<typeof addressSchema>;

const PAYMENT_METHODS: { value: PaymentMethodType; icon: React.ReactNode; hint?: string }[] = [
  { value: 'COD', icon: <Wallet className="h-4 w-4" />, hint: 'Thanh toán tiền mặt khi nhận hàng' },
  { value: 'VNPAY', icon: <CreditCard className="h-4 w-4" />, hint: 'Cổng thanh toán VNPay' },
  { value: 'MOMO', icon: <Wallet className="h-4 w-4" />, hint: 'Quét mã QR MoMo' },
  { value: 'STRIPE', icon: <CreditCard className="h-4 w-4" />, hint: 'Thẻ Visa/Mastercard' },
  { value: 'BANK_TRANSFER', icon: <CreditCard className="h-4 w-4" />, hint: 'Chuyển khoản ngân hàng' },
];

export function CheckoutView() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const hydrated = useAuthStore((s) => s.hydrated);

  const cartQuery = useCart(hydrated && Boolean(accessToken));
  const addressesQuery = useAddresses(hydrated && Boolean(accessToken));
  const shippingQuery = useShippingMethods();
  const createAddress = useCreateAddress();
  const checkout = useCheckout();
  const setCount = useCartStore((s) => s.setCount);

  // Guard: yêu cầu đăng nhập
  useEffect(() => {
    if (hydrated && !accessToken) {
      toast.info('Vui lòng đăng nhập để thanh toán');
      router.replace('/auth/login?redirect=/checkout');
    }
  }, [hydrated, accessToken, router]);

  const [addressId, setAddressId] = useState<string>('');
  const [shippingMethodId, setShippingMethodId] = useState<string>('');
  const [voucherInput, setVoucherInput] = useState('');
  const [voucherCode, setVoucherCode] = useState<string | undefined>(undefined);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('COD');
  const [note, setNote] = useState('');
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);

  const addresses = useMemo(() => addressesQuery.data ?? [], [addressesQuery.data]);
  const items = useMemo(
    () => (cartQuery.data?.items ?? []).filter((i) => !i.savedForLater),
    [cartQuery.data],
  );

  // Chọn mặc định
  useEffect(() => {
    if (!addressId && addresses.length > 0) {
      setAddressId((addresses.find((a) => a.isDefault) ?? addresses[0]).id);
    }
  }, [addresses, addressId]);

  useEffect(() => {
    if (!shippingMethodId && (shippingQuery.data?.length ?? 0) > 0) {
      setShippingMethodId(shippingQuery.data![0].id);
    }
  }, [shippingQuery.data, shippingMethodId]);

  const previewBody = useMemo(
    () => ({
      addressId: addressId || undefined,
      shippingMethodId: shippingMethodId || undefined,
      voucherCode,
    }),
    [addressId, shippingMethodId, voucherCode],
  );

  const preview = useOrderPreview(previewBody);

  if (!hydrated || !accessToken) {
    return <ListSkeleton rows={3} />;
  }

  if (cartQuery.isLoading || addressesQuery.isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Thanh toán</h1>
        <ListSkeleton rows={5} />
      </div>
    );
  }

  if (cartQuery.isError) {
    return <ErrorState message="Không thể tải giỏ hàng" onRetry={() => cartQuery.refetch()} />;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag className="h-12 w-12" />}
        title="Giỏ hàng của bạn đang trống"
        description="Thêm sản phẩm để tiến hành thanh toán."
        actionLabel="Mua sắm ngay"
        href="/products"
      />
    );
  }

  const onApplyVoucher = () => {
    const code = voucherInput.trim();
    if (!code) return;
    setVoucherCode(code.toUpperCase());
  };

  // Hiện thông báo khi preview trả lỗi voucher
  const voucherError =
    voucherCode && preview.isError ? 'Mã giảm giá không hợp lệ hoặc không áp dụng được' : '';

  const onSubmitCheckout = () => {
    if (!addressId) {
      toast.error('Vui lòng chọn địa chỉ giao hàng');
      return;
    }
    if (!shippingMethodId) {
      toast.error('Vui lòng chọn phương thức vận chuyển');
      return;
    }
    checkout.mutate(
      {
        addressId,
        shippingMethodId,
        voucherCode,
        paymentMethod,
        note: note.trim() || undefined,
      },
      {
        onSuccess: async (order) => {
          setCount(0);
          toast.success('Đặt hàng thành công!');
          if (paymentMethod === 'COD') {
            router.push(`/orders/${order.id}`);
            return;
          }
          // Non-COD: open a payment session and follow the gateway redirect
          try {
            const { orderId, payment } = await postData<{
              orderId: string;
              payment: { redirectUrl?: string; instructions?: string };
            }>(`/payments/orders/${order.id}/create`);
            if (payment?.redirectUrl) {
              window.location.href = payment.redirectUrl;
              return;
            }
            if (payment?.instructions) {
              toast.info(payment.instructions);
            }
            router.push(`/orders/${orderId ?? order.id}`);
          } catch {
            // Payment session failed — order stays PENDING, user can retry from the order page
            toast.error('Không tạo được phiên thanh toán, bạn có thể thử lại trong chi tiết đơn hàng');
            router.push(`/orders/${order.id}`);
          }
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-slate-900">Thanh toán</h1>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {/* 1. Địa chỉ */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary-600" /> 1. Địa chỉ giao hàng
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => setAddressDialogOpen(true)}>
                + Thêm địa chỉ
              </Button>
            </CardHeader>
            <CardContent>
              {addressesQuery.isError ? (
                <ErrorState message="Không thể tải danh sách địa chỉ" onRetry={() => addressesQuery.refetch()} />
              ) : addresses.length === 0 ? (
                <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
                  Bạn chưa có địa chỉ nào. Hãy thêm địa chỉ giao hàng mới.
                </p>
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {addresses.map((addr) => (
                    <li key={addr.id}>
                      <label
                        className={cn(
                          'flex h-full cursor-pointer gap-2 rounded-xl border p-3 transition-colors',
                          addressId === addr.id
                            ? 'border-primary-600 bg-primary-50/60 ring-1 ring-primary-600'
                            : 'border-slate-200 hover:border-slate-300',
                        )}
                      >
                        <input
                          type="radio"
                          name="address"
                          checked={addressId === addr.id}
                          onChange={() => setAddressId(addr.id)}
                          className="mt-1 h-4 w-4 accent-emerald-600"
                          aria-label={`Địa chỉ ${addr.fullName}`}
                        />
                        <span className="text-sm">
                          <span className="font-medium text-slate-800">
                            {addr.fullName}
                            {addr.isDefault && (
                              <span className="ml-2 rounded-full bg-primary-100 px-1.5 py-0.5 text-[10px] font-semibold text-primary-700">
                                Mặc định
                              </span>
                            )}
                          </span>
                          <span className="block text-xs text-slate-500">{addr.phone}</span>
                          <span className="mt-0.5 block text-xs text-slate-500">
                            {[addr.line, addr.ward, addr.district, addr.province].join(', ')}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* 2. Vận chuyển */}
          <Card>
            <CardHeader>
              <CardTitle>2. Phương thức vận chuyển</CardTitle>
            </CardHeader>
            <CardContent>
              {shippingQuery.isLoading ? (
                <ListSkeleton rows={2} />
              ) : shippingQuery.isError ? (
                <ErrorState message="Không thể tải phương thức vận chuyển" onRetry={() => shippingQuery.refetch()} />
              ) : (
                <ul className="space-y-2">
                  {(shippingQuery.data ?? []).map((method) => (
                    <li key={method.id}>
                      <label
                        className={cn(
                          'flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 transition-colors',
                          shippingMethodId === method.id
                            ? 'border-primary-600 bg-primary-50/60 ring-1 ring-primary-600'
                            : 'border-slate-200 hover:border-slate-300',
                        )}
                      >
                        <span className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="shipping"
                            checked={shippingMethodId === method.id}
                            onChange={() => setShippingMethodId(method.id)}
                            className="h-4 w-4 accent-emerald-600"
                            aria-label={method.name}
                          />
                          <span>
                            <span className="font-medium text-slate-800">{method.name}</span>
                            <span className="block text-xs text-slate-400">
                              Dự kiến {method.estimatedDaysMin}–{method.estimatedDaysMax} ngày
                            </span>
                          </span>
                        </span>
                        <span className="text-sm font-medium text-slate-700">
                          {formatCurrency(method.baseFee)}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* 3. Thanh toán */}
          <Card>
            <CardHeader>
              <CardTitle>3. Phương thức thanh toán</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {PAYMENT_METHODS.map(({ value, icon, hint }) => (
                  <li key={value}>
                    <label
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors',
                        paymentMethod === value
                          ? 'border-primary-600 bg-primary-50/60 ring-1 ring-primary-600'
                          : 'border-slate-200 hover:border-slate-300',
                      )}
                    >
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === value}
                        onChange={() => setPaymentMethod(value)}
                        className="h-4 w-4 accent-emerald-600"
                        aria-label={PAYMENT_METHOD_LABELS[value]}
                      />
                      <span className="flex items-center gap-2 text-sm">
                        <span className="text-primary-600">{icon}</span>
                        <span>
                          <span className="font-medium text-slate-800">{PAYMENT_METHOD_LABELS[value]}</span>
                          {hint && <span className="block text-xs text-slate-400">{hint}</span>}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <Textarea
                className="mt-3"
                placeholder="Ghi chú cho đơn hàng (không bắt buộc)"
                aria-label="Ghi chú đơn hàng"
                value={note}
                maxLength={300}
                onChange={(e) => setNote(e.target.value)}
              />
            </CardContent>
          </Card>
        </div>

        {/* Tóm tắt đơn — CHỈ hiển thị số liệu từ backend */}
        <aside aria-label="Tóm tắt đơn hàng">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Đơn hàng của bạn</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
              <ul className="max-h-40 space-y-2 overflow-y-auto pr-1">
                {items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-2 text-xs text-slate-500">
                    <span className="line-clamp-1">
                      {item.product.name} × {item.quantity}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="flex gap-2 border-t border-dashed border-slate-200 pt-3">
                <Input
                  placeholder="Nhập mã giảm giá"
                  aria-label="Mã giảm giá"
                  value={voucherInput}
                  onChange={(e) => setVoucherInput(e.target.value)}
                  className="!py-2 text-xs uppercase"
                />
                <Button variant="outline" size="sm" onClick={onApplyVoucher} className="shrink-0">
                  Áp dụng
                </Button>
              </div>
              {voucherError && <p className="-mt-1 text-xs text-red-600">{voucherError}</p>}
              {voucherCode && !preview.isError && !preview.isPending && (
                <p className="-mt-1 text-xs text-emerald-600">Đã áp dụng mã {voucherCode}</p>
              )}

              <dl className="space-y-1.5 border-t border-dashed border-slate-200 pt-3 text-sm">
                <Row label="Tạm tính" value={preview.data?.subtotalAmount} pending={preview.isFetching} />
                <Row label="Giảm giá" value={preview.data?.discountAmount} negate pending={preview.isFetching} />
                <Row label="Phí vận chuyển" value={preview.data?.shippingFee} pending={preview.isFetching} />
                <Row label="Thuế (VAT)" value={preview.data?.taxAmount} pending={preview.isFetching} />
              </dl>

              <div className="flex items-baseline justify-between border-t border-dashed border-slate-200 pt-3">
                <span className="font-semibold text-slate-900">Tổng cộng</span>
                <span className="text-lg font-bold text-accent-600">
                  {preview.isFetching ? '…' : formatCurrency(preview.data?.totalAmount ?? 0)}
                </span>
              </div>
              {preview.isError && !voucherCode && (
                <p className="text-xs text-red-600">
                  Không tính được tạm tính. Vui lòng thử lại.
                </p>
              )}
              {preview.isError && !voucherCode && (
                <Button variant="ghost" size="sm" className="w-full" onClick={() => preview.refetch()}>
                  Thử lại
                </Button>
              )}

              <Button
                variant="accent"
                size="lg"
                className="w-full"
                loading={checkout.isPending}
                disabled={!addressId || !shippingMethodId || (preview.isPending && !preview.data)}
                onClick={onSubmitCheckout}
              >
                Đặt hàng
              </Button>
              <p className="text-center text-[11px] leading-relaxed text-slate-400">
                Bằng việc đặt hàng, bạn đồng ý với điều khoản sử dụng của HomeMart.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* Dialog thêm địa chỉ mới */}
      <AddressDialog
        open={addressDialogOpen}
        onClose={() => setAddressDialogOpen(false)}
        submitting={createAddress.isPending}
        onSubmit={(data) =>
          createAddress.mutate(data, {
            onSuccess: () => {
              setAddressDialogOpen(false);
              toast.success('Đã thêm địa chỉ mới');
            },
            onError: (err) => toast.error(err.message),
          })
        }
      />

      {/* Giữ link tới trang đơn hàng để điều hướng nhanh sau đặt hàng */}
      <Link href="/account/orders" className="sr-only">
        Đơn hàng của tôi
      </Link>
    </div>
  );
}

function Row({
  label,
  value,
  negate,
  pending,
}: {
  label: string;
  value?: number;
  negate?: boolean;
  pending?: boolean;
}) {
  return (
    <div className="flex justify-between text-slate-600">
      <dt>{label}</dt>
      <dd className={cn('tabular-nums', negate && 'text-emerald-600')}>
        {pending || value === undefined ? '—' : `${negate ? '-' : ''}${formatCurrency(value)}`}
      </dd>
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
  onSubmit: (data: AddressForm & { isDefault?: boolean }) => void;
  submitting: boolean;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      province: '',
      district: '',
      ward: '',
      line: '',
    },
  });

  return (
    <DialogLite open={open} onClose={onClose} title="Thêm địa chỉ giao hàng mới">
      <form
        onSubmit={handleSubmit((data) => {
          onSubmit({ ...data, isDefault: true });
          reset();
        })}
        className="space-y-3"
      >
        <div>
          <label htmlFor="ad-name" className="mb-1 block text-sm font-medium text-slate-700">
            Họ và tên
          </label>
          <Input id="ad-name" {...register('fullName')} error={errors.fullName?.message} />
        </div>
        <div>
          <label htmlFor="ad-phone" className="mb-1 block text-sm font-medium text-slate-700">
            Số điện thoại
          </label>
          <Input id="ad-phone" inputMode="tel" {...register('phone')} error={errors.phone?.message} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="ad-province" className="mb-1 block text-sm font-medium text-slate-700">
              Tỉnh/Thành phố
            </label>
            <Input id="ad-province" {...register('province')} error={errors.province?.message} />
          </div>
          <div>
            <label htmlFor="ad-district" className="mb-1 block text-sm font-medium text-slate-700">
              Quận/Huyện
            </label>
            <Input id="ad-district" {...register('district')} error={errors.district?.message} />
          </div>
          <div>
            <label htmlFor="ad-ward" className="mb-1 block text-sm font-medium text-slate-700">
              Phường/Xã
            </label>
            <Input id="ad-ward" {...register('ward')} error={errors.ward?.message} />
          </div>
        </div>
        <div>
          <label htmlFor="ad-line" className="mb-1 block text-sm font-medium text-slate-700">
            Địa chỉ cụ thể (số nhà, tên đường)
          </label>
          <Input id="ad-line" {...register('line')} error={errors.line?.message} />
        </div>
        <Button type="submit" className="w-full" loading={submitting}>
          Lưu địa chỉ
        </Button>
      </form>
    </DialogLite>
  );
}
