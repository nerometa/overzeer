import { BasePlatformAdapter } from './base';
import type { PlatformCredentials, PlatformEventMapping, PlatformSaleRecord } from './types';

export class AtDoorAdapter extends BasePlatformAdapter {
  readonly name = 'At Door';
  readonly slug = 'At Door';
  readonly supportsApi = false;

  async authenticate(_credentials: PlatformCredentials): Promise<boolean> {
    return true;
  }

  async fetchSales(mapping: PlatformEventMapping, since?: Date): Promise<PlatformSaleRecord[]> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const cutoffDate = since || thirtyDaysAgo;

    const ticketTypes = ['Walk-in', 'Guest List'];
    const priceMap = { 'Walk-in': 1000, 'Guest List': 0 };
    const feesMap = { 'Walk-in': 0, 'Guest List': 0 };

    const records: PlatformSaleRecord[] = [];
    const recordCount = 8;

    for (let i = 0; i < recordCount; i++) {
      const ticketType = ticketTypes[i % ticketTypes.length] ?? 'Walk-in';
      const daysAgo = (i * 3.5) % 30;
      const saleDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      if (saleDate >= cutoffDate) {
        records.push({
          externalId: `DOOR-${mapping.externalEventId}-${4000 + i}`,
          ticketType,
          quantity: 1,
          pricePerTicket: priceMap[ticketType as keyof typeof priceMap],
          fees: feesMap[ticketType as keyof typeof feesMap],
          saleDate,
          metadata: {
            entryMethod: 'manual',
            staffMember: `staff${(i % 3) + 1}`,
            notes: ticketType === 'Guest List' ? 'Promoter list' : 'Cash payment',
          },
        });
      }
    }

    return records;
  }
}
