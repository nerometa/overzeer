import { BasePlatformAdapter } from './base';
import type { PlatformCredentials, PlatformEventMapping, PlatformSaleRecord } from './types';

export class TicketmelonAdapter extends BasePlatformAdapter {
  readonly name = 'Ticketmelon';
  readonly slug = 'Ticketmelon';
  readonly supportsApi = true;

  async authenticate(_credentials: PlatformCredentials): Promise<boolean> {
    return true;
  }

  async fetchSales(mapping: PlatformEventMapping, since?: Date): Promise<PlatformSaleRecord[]> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const cutoffDate = since || thirtyDaysAgo;

    const ticketTypes = ['General Admission', 'Premium', 'Meet & Greet'];
    const priceMap = { 'General Admission': 1200, 'Premium': 2200, 'Meet & Greet': 3000 };
    const feesMap = { 'General Admission': 120, 'Premium': 220, 'Meet & Greet': 300 };

    const records: PlatformSaleRecord[] = [];
    const recordCount = 12;

    for (let i = 0; i < recordCount; i++) {
      const ticketType = ticketTypes[i % ticketTypes.length] ?? 'General Admission';
      const daysAgo = (i * 2.5) % 30;
      const saleDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      if (saleDate >= cutoffDate) {
        records.push({
          externalId: `TM-${mapping.externalEventId}-${2000 + i}`,
          ticketType,
          quantity: 1 + (i % 4),
          pricePerTicket: priceMap[ticketType as keyof typeof priceMap],
          fees: feesMap[ticketType as keyof typeof feesMap],
          saleDate,
          buyerEmail: `customer${i}@email.com`,
          metadata: {
            paymentMethod: i % 3 === 0 ? 'bank_transfer' : i % 3 === 1 ? 'credit_card' : 'truemoney',
            orderNumber: `TM-ORD-${2000 + i}`,
          },
        });
      }
    }

    return records;
  }
}
