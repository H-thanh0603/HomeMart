import { PaymentsReconcileService } from './payments-reconcile.service';

process.env.NODE_ENV ||= 'test';
process.env.DATABASE_URL ||= 'postgresql://homemart:homemart_secret@localhost:54329/homemart';
process.env.JWT_ACCESS_SECRET ||= 'x'.repeat(32);
process.env.JWT_REFRESH_SECRET ||= 'y'.repeat(32);

describe('PaymentsReconcileService — CSV gateway report (issue 1.2)', () => {
  const service = new PaymentsReconcileService({ payment: { findMany: async () => [] } } as never);

  it('throws on empty CSV', async () => {
    await expect(service.reconcileWithGatewayReport('VNPAY', '')).rejects.toThrow('CSV rỗng');
  });

  it('throws when header lacks reference/amount columns', async () => {
    await expect(service.reconcileWithGatewayReport('VNPAY', 'a,b\n1,2')).rejects.toThrow('Không tìm thấy cột');
  });

  it('flags rows missing in DB', async () => {
    const csv = 'TxnRef,Amount,Response Code\nORD-1-123,500000,00';
    const res = await service.reconcileWithGatewayReport('VNPAY', csv);
    expect(res.missingInDb).toHaveLength(1);
    expect(res.missingInDb[0].providerRef).toBe('ORD-1-123');
  });
});

describe('PaymentsReconcileService — against DB payments', () => {
  const csv = [
    '"Order ID","Amount","Result Code"', // quoted headers, MoMo naming
    '"ORD-1-1","250000","0"',
    '"ORD-1-2","999999","0"', // amount mismatch
    '"ORD-1-3","100000","49"', // FAILED in report but SUCCESS in DB → status mismatch
  ].join('\n');

  const dbPayments = [
    { providerRef: 'ORD-1-1', amount: 250000, status: 'SUCCESS' },
    { providerRef: 'ORD-1-2', amount: 250000, status: 'SUCCESS' },
    { providerRef: 'ORD-1-3', amount: 100000, status: 'SUCCESS' },
  ];

  it('matches, flags amount + status mismatches, handles quoted CSV', async () => {
    const service = new PaymentsReconcileService({
      payment: { findMany: async () => dbPayments },
    } as never);
    const res = await service.reconcileWithGatewayReport('MOMO', csv);
    expect(res.rows).toBe(3);
    expect(res.matched).toBe(1);
    expect(res.mismatched.map((m) => m.providerRef)).toEqual(['ORD-1-2', 'ORD-1-3']);
    expect(res.missingInDb).toHaveLength(0);
  });

  it('VNPay x100 amounts are normalized (5000_00 → 500000)', async () => {
    const service = new PaymentsReconcileService({
      payment: { findMany: async () => [{ providerRef: 'ORD-9-1', amount: 500000, status: 'SUCCESS' }] },
    } as never);
    const res = await service.reconcileWithGatewayReport('VNPAY', 'vnp_TxnRef,vnp_Amount\nORD-9-1,50000000');
    expect(res.matched).toBe(1);
    expect(res.mismatched).toHaveLength(0);
  });
});
