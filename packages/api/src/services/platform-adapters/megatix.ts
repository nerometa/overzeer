import { BasePlatformAdapter } from './base';
import type { PlatformCredentials, PlatformEventMapping, PlatformSaleRecord } from './types';

export class MegatixAdapter extends BasePlatformAdapter {
  readonly name = 'Megatix';
  readonly slug = 'Megatix';
  readonly supportsApi = true;

  async authenticate(_credentials: PlatformCredentials): Promise<boolean> {
    return true;
  }

  async fetchSales(mapping: PlatformEventMapping, since?: Date): Promise<PlatformSaleRecord[]> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const cutoffDate = since || thirtyDaysAgo;

    const ticketTypes = ['Standard', 'VIP', 'Early Bird'];
    const priceMap = { 'Standard': 800, 'VIP': 2500, 'Early Bird': 500 };
    const feesMap = { 'Standard': 80, 'VIP': 200, 'Early Bird': 50 };

    const records: PlatformSaleRecord[] = [];
    const recordCount = 10;

    for (let i = 0; i < recordCount; i++) {
      const ticketType = ticketTypes[i % ticketTypes.length] ?? 'Standard';
      const daysAgo = (i * 3) % 30;
      const saleDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      if (saleDate >= cutoffDate) {
        records.push({
          externalId: `MGX-${mapping.externalEventId}-${1000 + i}`,
          ticketType,
          quantity: 1 + (i % 3),
          pricePerTicket: priceMap[ticketType as keyof typeof priceMap],
          fees: feesMap[ticketType as keyof typeof feesMap],
          saleDate,
          buyerEmail: `buyer${i}@example.com`,
          metadata: {
            paymentMethod: i % 2 === 0 ? 'credit_card' : 'promptpay',
            confirmationCode: `MGX-${1000 + i}`,
          },
        });
      }
    }

    return records;
  }
}
