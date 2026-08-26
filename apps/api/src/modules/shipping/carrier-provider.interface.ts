export interface CarrierFeeInput {
  serviceType: string;          // 'STANDARD' | 'EXPRESS' | 'SAME_DAY'
  fromProvince: string;
  fromDistrict: string;
  toProvince: string;
  toDistrict: string;
  toWard: string;
  weightGrams: number;
  codAmount?: number;          // giá trị thu hộ (COD)
}

export interface CarrierFeeResult {
  fee: number;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  carrierName: string;
}

export interface CreateShipmentInput {
  orderId: string;
  orderNumber: string;
  contactName: string;
  contactPhone: string;
  address: string;
  province: string;
  district: string;
  ward: string;
  weightGrams: number;
  codAmount?: number;
  serviceType: string;
  items: Array<{ name: string; quantity: number; weight: number }>;
}

export interface CreateShipmentResult {
  trackingCode: string;
  carrierName: string;
  fee: number;
  estimatedDelivery: string;
  rawResponse?: unknown;
}

export interface CarrierProvider {
  readonly name: string;
  calculateFee(input: CarrierFeeInput): Promise<CarrierFeeResult>;
  createOrder(input: CreateShipmentInput): Promise<CreateShipmentResult>;
  verifyWebhook(headers: Record<string, string>, body: unknown): boolean;
  parseWebhook(body: unknown): {
    trackingCode: string;
    status: string;
    note?: string;
    timestamp: string;
  } | null;
}
