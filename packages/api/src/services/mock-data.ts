interface MockSalesOptions {
  eventId: string;
  platformId: string;
  count: number;
  dateRange?: {
    startDays: number;
    endDays: number;
  };
  priceRange?: {
    min: number;
    max: number;
  };
  ticketTypes?: string[];
}

interface MockSalesRecord {
  eventId: string;
  platformId: string;
  externalSaleId: string;
  ticketType: string;
  quantity: number;
  pricePerTicket: number;
  fees: number;
  saleDate: Date;
  buyerEmail?: string;
  metadata?: Record<string, unknown>;
}

export function generateMockSales(options: MockSalesOptions): MockSalesRecord[] {
  const {
    eventId,
    platformId,
    count,
    dateRange = { startDays: 30, endDays: 0 },
    priceRange = { min: 500, max: 2000 },
    ticketTypes = ['Standard', 'VIP', 'Early Bird'],
  } = options;

  const records: MockSalesRecord[] = [];
  const now = new Date();
  const daySpan = dateRange.startDays - dateRange.endDays;
  const priceSpan = priceRange.max - priceRange.min;

  for (let i = 0; i < count; i++) {
    const ticketType = ticketTypes[i % ticketTypes.length] ?? 'Standard';
    
    const dayOffset = dateRange.startDays - ((i * daySpan) / count);
    const saleDate = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
    
    const priceIndex = (i % 5) / 4;
    const pricePerTicket = Math.floor(priceRange.min + priceSpan * priceIndex);
    const fees = Math.floor(pricePerTicket * 0.1);
    
    const quantity = 1 + (i % 4);
    
    const buyerIndex = (i * 7) % 100;
    const buyerEmail = `buyer${buyerIndex}@example.com`;

    records.push({
      eventId,
      platformId,
      externalSaleId: `MOCK-${platformId}-${eventId.slice(0, 8)}-${1000 + i}`,
      ticketType,
      quantity,
      pricePerTicket,
      fees,
      saleDate,
      buyerEmail,
      metadata: {
        source: 'mock-generator',
        generatedAt: new Date().toISOString(),
        index: i,
      },
    });
  }

  return records;
}

export function generateMockSalesForPlatform(
  eventId: string,
  platformSlug: string,
  platformId: string,
  count: number = 10
): MockSalesRecord[] {
  const platformConfigs: Record<string, Partial<MockSalesOptions>> = {
    'Megatix': {
      priceRange: { min: 300, max: 2500 },
      ticketTypes: ['Standard', 'VIP', 'Early Bird'],
    },
    'Ticketmelon': {
      priceRange: { min: 500, max: 3000 },
      ticketTypes: ['General Admission', 'Premium', 'Meet & Greet'],
    },
    'Resident Advisor': {
      priceRange: { min: 15, max: 80 },
      ticketTypes: ['First Release', 'Second Release', 'Door'],
    },
    'At-Door': {
      priceRange: { min: 500, max: 1500 },
      ticketTypes: ['Walk-in', 'Guest List'],
    },
  };

  const config = platformConfigs[platformSlug] || {};

  return generateMockSales({
    eventId,
    platformId,
    count,
    ...config,
  });
}
