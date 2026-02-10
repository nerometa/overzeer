import { BasePlatformAdapter } from './base';
import type { PlatformCredentials, PlatformEventMapping, PlatformSaleRecord } from './types';

export class ResidentAdvisorAdapter extends BasePlatformAdapter {
  readonly name = 'Resident Advisor';
  readonly slug = 'Resident Advisor';
  readonly supportsApi = true;

  async authenticate(_credentials: PlatformCredentials): Promise<boolean> {
    return true;
  }

  async fetchSales(mapping: PlatformEventMapping, since?: Date): Promise<PlatformSaleRecord[]> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const cutoffDate = since || thirtyDaysAgo;

    const ticketTypes = ['First Release', 'Second Release', 'Door'];
    const priceMap = { 'First Release': 25, 'Second Release': 40, 'Door': 60 };
    const feesMap = { 'First Release': 3, 'Second Release': 5, 'Door': 8 };

    const records: PlatformSaleRecord[] = [];
    const recordCount = 15;

    for (let i = 0; i < recordCount; i++) {
      const ticketType = ticketTypes[i % ticketTypes.length] ?? 'First Release';
      const daysAgo = (i * 2) % 30;
      const saleDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      if (saleDate >= cutoffDate) {
        records.push({
          externalId: `RA-${mapping.externalEventId}-${3000 + i}`,
          ticketType,
          quantity: 1 + (i % 2),
          pricePerTicket: priceMap[ticketType as keyof typeof priceMap],
          fees: feesMap[ticketType as keyof typeof feesMap],
          saleDate,
          buyerEmail: `attendee${i}@domain.com`,
          metadata: {
            paymentMethod: 'stripe',
            ticketCode: `RA-TKT-${3000 + i}`,
            region: 'international',
          },
        });
      }
    }

    return records;
  }
}
