'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  CreditCard,
  Lock,
  MapPin,
  QrCode,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Wallet,
} from 'lucide-react';
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
  { value: 'VNPAY', icon: <QrCode className="h-4 w-4" />, hint: 'Cổng thanh toán & QR VNPay' },
  { value: 'MOMO', icon: <Wallet className="h-4 w-4" />, hint: 'Ví điện tử MoMo' },
  { value: 'STRIPE', icon: <CreditCard className="h-4 w-4" />, hint: 'Thẻ quốc tế Visa, Mastercard' },
  { value: 'BANK_TRANSFER', icon: <CreditCard className="h-4 w-4" />, hint: 'Chuyển khoản trực tiếp ngân hàng' },
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
  const idempotencyRef = useRef<{ payload: string; key: string } | null>(null);

  const addresses = useMemo(() => addressesQuery.data ?? [], [addressesQuery.data]);
  const items = useMemo(
    () => (cartQuery.data?.items ?? []).filter((i) => !i.savedForLater),
    [cartQuery.data],
  );

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
        icon={<ShoppingBag className="h-12 w-12 text-emerald-600" />}
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
    // One idempotency key per checkout intent: unchanged payload → same key,
    // so double-clicks and retry-after-network-loss never create two orders.
    const payloadKey = JSON.stringify({
      addressId,
      shippingMethodId,
      voucherCode,
      paymentMethod,
      note: note.trim(),
      items: items.map((i) => `${i.productId}:${i.variantId ?? ''}:${i.quantity}`),
    });
    if (idempotencyRef.current?.payload !== payloadKey) {
      idempotencyRef.current = { payload: payloadKey, key: crypto.randomUUID() };
    }
    checkout.mutate(
      {
        addressId,
        shippingMethodId,
        voucherCode,
        paymentMethod,
        note: note.trim() || undefined,
        idempotencyKey: idempotencyRef.current.key,
      },
      {
        onSuccess: async (order) => {
          setCount(0);
          toast.success('Đặt hàng thành công!');
          if (paymentMethod === 'COD') {
            router.push(`/orders/${order.id}`);
            return;
          }
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
      {/* Checkout step progress */}
      <div className="mb-6 flex items-center justify-center gap-3 text-xs font-bold text-slate-500">
        <Link href="/cart" className="flex items-center gap-1.5 text-emerald-700 hover:underline">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs text-emerald-800">
            ✓
          </span>
          Giỏ hàng
        </Link>
        <span className="text-slate-300">———</span>
        <span className="flex items-center gap-1.5 text-emerald-700 font-extrabold">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs text-white shadow-sm">
            2
          </span>
          Thanh toán
        </span>
        <span className="text-slate-300">———</span>
        <span className="flex items-center gap-1.5 text-slate-400">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs text-slate-600">
            3
          </span>
          Hoàn tất
        </span>
      </div>

      <h1 className="mb-5 text-2xl font-black text-slate-900">Thông Tin Thanh Toán</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {/* 1. Địa chỉ giao hàng */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-5 w-5 text-emerald-600" /> 1. Địa chỉ nhận hàng
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => setAddressDialogOpen(true)}>
                + Thêm địa chỉ mới
              </Button>
            </CardHeader>
            <CardContent>
              {addressesQuery.isError ? (
                <ErrorState message="Không thể tải danh sách địa chỉ" onRetry={() => addressesQuery.refetch()} />
              ) : addresses.length === 0 ? (
                <p className="rounded-xl bg-amber-50 p-4 text-xs font-semibold text-amber-800">
                  Bạn chưa có địa chỉ nhận hàng nào. Vui lòng bấm &quot;+ Thêm địa chỉ mới&quot; ở góc trên.
                </p>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {addresses.map((addr) => (
                    <li key={addr.id}>
                      <label
                        className={cn(
                          'flex h-full cursor-pointer gap-3 rounded-2xl border p-4 transition-all',
                          addressId === addr.id
                            ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 bg-white',
                        )}
                      >
                        <input
                          type="radio"
                          name="address"
                          checked={addressId === addr.id}
                          onChange={() => setAddressId(addr.id)}
                          className="mt-0.5 h-4 w-4 accent-emerald-600"
                          aria-label={`Địa chỉ ${addr.fullName}`}
                        />
                        <span className="text-sm">
                          <span className="font-bold text-slate-900 flex items-center gap-2">
                            {addr.fullName}
                            {addr.isDefault && (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                Mặc định
                              </span>
                            )}
                          </span>
                          <span className="block text-xs font-semibold text-slate-600 mt-0.5">{addr.phone}</span>
                          <span className="mt-1 block text-xs text-slate-500 leading-relaxed">
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

          {/* 2. Phương thức vận chuyển */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Truck className="h-5 w-5 text-emerald-600" /> 2. Hình thức vận chuyển
              </CardTitle>
            </CardHeader>
            <CardContent>
              {shippingQuery.isLoading ? (
                <ListSkeleton rows={2} />
              ) : shippingQuery.isError ? (
                <ErrorState message="Không thể tải phương thức vận chuyển" onRetry={() => shippingQuery.refetch()} />
              ) : (
                <ul className="space-y-3">
                  {(shippingQuery.data ?? []).map((method) => (
                    <li key={method.id}>
                      <label
                        className={cn(
                          'flex cursor-pointer items-center justify-between gap-3 rounded-2xl border p-4 transition-all',
                          shippingMethodId === method.id
                            ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 bg-white',
                        )}
                      >
                        <span className="flex items-center gap-3 text-sm">
                          <input
                            type="radio"
                            name="shipping"
                            checked={shippingMethodId === method.id}
                            onChange={() => setShippingMethodId(method.id)}
                            className="h-4 w-4 accent-emerald-600"
                            aria-label={method.name}
                          />
                          <span>
                            <span className="font-bold text-slate-900 block">{method.name}</span>
                            <span className="text-xs text-slate-400">
                              Dự kiến giao trong {method.estimatedDaysMin}–{method.estimatedDaysMax} ngày làm việc
                            </span>
                          </span>
                        </span>
                        <span className="text-sm font-extrabold text-emerald-700">
                          {formatCurrency(method.baseFee)}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* 3. Phương thức thanh toán */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-5 w-5 text-emerald-600" /> 3. Phương thức thanh toán
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5">
                {PAYMENT_METHODS.map(({ value, icon, hint }) => (
                  <li key={value}>
                    <label
                      className={cn(
                        'flex cursor-pointer items-center gap-3.5 rounded-2xl border p-3.5 transition-all',
                        paymentMethod === value
                          ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white',
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
                      <span className="flex items-center gap-2.5 text-sm flex-1">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-emerald-700">
                          {icon}
                        </span>
                        <span>
                          <span className="font-bold text-slate-900 block">{PAYMENT_METHOD_LABELS[value]}</span>
                          {hint && <span className="text-xs text-slate-400">{hint}</span>}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>

              <div className="mt-4 pt-3 border-t border-slate-100">
                <label htmlFor="order-note" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Ghi chú cho đơn hàng
                </label>
                <Textarea
                  id="order-note"
                  placeholder="Ví dụ: Giao giờ hành chính, gọi trước khi giao..."
                  aria-label="Ghi chú đơn hàng"
                  value={note}
                  maxLength={300}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tóm tắt đơn hàng */}
        <aside aria-label="Tóm tắt đơn hàng">
          <Card className="sticky top-28">
            <CardHeader>
              <CardTitle className="text-base">Chi tiết thanh toán</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              {/* Product items mini list */}
              <ul className="max-h-48 space-y-2 overflow-y-auto pr-1">
                {items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-2 text-xs text-slate-600">
                    <span className="line-clamp-1 font-medium">
                      {item.product.name} × {item.quantity}
                    </span>
                    <span className="shrink-0 font-semibold text-slate-800">
                      {formatCurrency((item.variant?.price ?? item.product.price) * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Voucher Code Form */}
              <div className="border-t border-dashed border-slate-200 pt-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Mã giảm giá"
                    aria-label="Mã giảm giá"
                    value={voucherInput}
                    onChange={(e) => setVoucherInput(e.target.value)}
                    className="!py-2 text-xs uppercase font-bold"
                  />
                  <Button variant="outline" size="sm" onClick={onApplyVoucher} className="shrink-0">
                    Áp dụng
                  </Button>
                </div>
                {voucherError && <p className="mt-1 text-xs text-red-600 font-medium">{voucherError}</p>}
                {voucherCode && !preview.isError && !preview.isPending && (
                  <p className="mt-1 text-xs text-emerald-700 font-bold">✓ Đã áp dụng mã {voucherCode}</p>
                )}
              </div>

              {/* Price Breakdown */}
              <dl className="space-y-2 border-t border-dashed border-slate-200 pt-3 text-sm">
                <Row label="Tạm tính" value={preview.data?.subtotalAmount} pending={preview.isFetching} />
                <Row label="Giảm giá voucher" value={preview.data?.discountAmount} negate pending={preview.isFetching} />
                <Row label="Phí vận chuyển" value={preview.data?.shippingFee} pending={preview.isFetching} />
                <Row label="Thuế VAT" value={preview.data?.taxAmount} pending={preview.isFetching} />
              </dl>

              <div className="flex items-baseline justify-between border-t border-dashed border-slate-200 pt-3">
                <span className="font-extrabold text-slate-900">Tổng thanh toán</span>
                <span className="text-xl font-black text-accent-600">
                  {preview.isFetching ? '…' : formatCurrency(preview.data?.totalAmount ?? 0)}
                </span>
              </div>

              <Button
                variant="accent"
                size="lg"
                className="w-full shadow-lg shadow-accent-500/25"
                loading={checkout.isPending}
                disabled={!addressId || !shippingMethodId || (preview.isPending && !preview.data)}
                onClick={onSubmitCheckout}
              >
                <Lock className="mr-1.5 h-4 w-4" /> Đặt hàng an toàn
              </Button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-400 pt-1">
                <ShieldCheck className="h-4 w-4 text-emerald-600" /> Bảo mật thanh toán SSL 256-bit
              </div>
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
      <dd className={cn('tabular-nums font-semibold', negate && 'text-emerald-700')}>
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
        className="space-y-3.5"
      >
        <div>
          <label htmlFor="ad-name" className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
            Họ và tên
          </label>
          <Input id="ad-name" placeholder="Nguyễn Văn A" {...register('fullName')} error={errors.fullName?.message} />
        </div>
        <div>
          <label htmlFor="ad-phone" className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
            Số điện thoại
          </label>
          <Input id="ad-phone" inputMode="tel" placeholder="0912345678" {...register('phone')} error={errors.phone?.message} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="ad-province" className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
              Tỉnh/Thành phố
            </label>
            <Input id="ad-province" placeholder="Hà Nội" {...register('province')} error={errors.province?.message} />
          </div>
          <div>
            <label htmlFor="ad-district" className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
              Quận/Huyện
            </label>
            <Input id="ad-district" placeholder="Cầu Giấy" {...register('district')} error={errors.district?.message} />
          </div>
          <div>
            <label htmlFor="ad-ward" className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
              Phường/Xã
            </label>
            <Input id="ad-ward" placeholder="Dịch Vọng" {...register('ward')} error={errors.ward?.message} />
          </div>
        </div>
        <div>
          <label htmlFor="ad-line" className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
            Địa chỉ cụ thể (số nhà, tên đường)
          </label>
          <Input id="ad-line" placeholder="Số 123 đường Cầu Giấy" {...register('line')} error={errors.line?.message} />
        </div>
        <Button type="submit" className="w-full mt-2" loading={submitting}>
          Lưu địa chỉ nhận hàng
        </Button>
      </form>
    </DialogLite>
  );
}
