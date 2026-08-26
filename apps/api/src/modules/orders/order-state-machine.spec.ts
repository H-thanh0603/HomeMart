import { OrderStatus } from '@prisma/client';
import { ORDER_TRANSITIONS, CUSTOMER_CANCELLABLE } from './orders.service';

describe('Order State Machine (BR-5)', () => {
  const happyPath = [
    OrderStatus.PENDING,
    OrderStatus.CONFIRMED,
    OrderStatus.PROCESSING,
    OrderStatus.PACKING,
    OrderStatus.SHIPPED,
    OrderStatus.DELIVERED,
    OrderStatus.COMPLETED,
  ];

  it('allows the full forward lifecycle', () => {
    for (let i = 0; i < happyPath.length - 1; i++) {
      expect(ORDER_TRANSITIONS[happyPath[i]]).toContain(happyPath[i + 1]);
    }
  });

  it('rejects backward transitions (e.g. DELIVERED → PENDING)', () => {
    expect(ORDER_TRANSITIONS[OrderStatus.DELIVERED]).not.toContain(OrderStatus.PENDING);
    expect(ORDER_TRANSITIONS[OrderStatus.SHIPPED]).not.toContain(OrderStatus.PENDING);
    expect(ORDER_TRANSITIONS[OrderStatus.COMPLETED]).not.toContain(OrderStatus.PENDING);
  });

  it('rejects arbitrary jumps', () => {
    expect(ORDER_TRANSITIONS[OrderStatus.PENDING]).not.toContain(OrderStatus.SHIPPED);
    expect(ORDER_TRANSITIONS[OrderStatus.PENDING]).not.toContain(OrderStatus.DELIVERED);
    expect(ORDER_TRANSITIONS[OrderStatus.PROCESSING]).not.toContain(OrderStatus.DELIVERED);
  });

  it('terminal states cannot transition anywhere', () => {
    expect(ORDER_TRANSITIONS[OrderStatus.CANCELLED]).toEqual([]);
    expect(ORDER_TRANSITIONS[OrderStatus.COMPLETED]).toEqual([]);
    expect(ORDER_TRANSITIONS[OrderStatus.REFUNDED]).toEqual([]);
  });

  it('return flow: SHIPPED/DELIVERED → RETURN_REQUESTED → RETURNED → REFUNDED', () => {
    expect(ORDER_TRANSITIONS[OrderStatus.SHIPPED]).toContain(OrderStatus.RETURN_REQUESTED);
    expect(ORDER_TRANSITIONS[OrderStatus.DELIVERED]).toContain(OrderStatus.RETURN_REQUESTED);
    expect(ORDER_TRANSITIONS[OrderStatus.RETURN_REQUESTED]).toContain(OrderStatus.RETURNED);
    expect(ORDER_TRANSITIONS[OrderStatus.RETURNED]).toContain(OrderStatus.REFUNDED);
  });

  it('customer may cancel only before shipping', () => {
    expect(CUSTOMER_CANCELLABLE).not.toContain(OrderStatus.SHIPPED);
    expect(CUSTOMER_CANCELLABLE).not.toContain(OrderStatus.DELIVERED);
    expect(CUSTOMER_CANCELLABLE).toContain(OrderStatus.PENDING);
  });
});
