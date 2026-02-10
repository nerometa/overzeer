import type {
  PlatformAdapter,
  PlatformCredentials,
  PlatformEventMapping,
  PlatformSaleRecord,
  SalesInsert,
  SyncResult,
} from './types';

export abstract class BasePlatformAdapter implements PlatformAdapter {
  abstract readonly name: string;
  abstract readonly slug: string;
  abstract readonly supportsApi: boolean;

  abstract authenticate(credentials: PlatformCredentials): Promise<boolean>;
  abstract fetchSales(mapping: PlatformEventMapping, since?: Date): Promise<PlatformSaleRecord[]>;

  async validateCredentials(credentials: PlatformCredentials): Promise<boolean> {
    try {
      return await this.authenticate(credentials);
    } catch {
      return false;
    }
  }

  async sync(mapping: PlatformEventMapping, credentials: PlatformCredentials): Promise<SyncResult> {
    const syncedAt = new Date();
    const errors: Array<{ message: string; record?: unknown }> = [];
    let salesImported = 0;
    let salesUpdated = 0;

    try {
      const authenticated = await this.authenticate(credentials);
      if (!authenticated) {
        return {
          success: false,
          salesImported: 0,
          salesUpdated: 0,
          errors: [{ message: 'Authentication failed' }],
          syncedAt,
        };
      }

      const records = await this.fetchSales(mapping);
      const existingExternalIds = await this.fetchExistingExternalIds(mapping.eventId, mapping.platformId);
      const newRecords = this.deduplicateSales(records, existingExternalIds);

      salesImported = newRecords.length;
      salesUpdated = records.length - newRecords.length;

      return {
        success: true,
        salesImported,
        salesUpdated,
        errors,
        syncedAt,
      };
    } catch (error) {
      errors.push({
        message: error instanceof Error ? error.message : 'Unknown error during sync',
      });

      return {
        success: false,
        salesImported,
        salesUpdated,
        errors,
        syncedAt,
      };
    }
  }

  protected mapToSalesInsert(
    record: PlatformSaleRecord,
    eventId: string,
    platformId: string
  ): SalesInsert {
    return {
      eventId,
      platformId,
      externalSaleId: record.externalId,
      ticketType: record.ticketType,
      quantity: record.quantity,
      pricePerTicket: record.pricePerTicket,
      fees: record.fees,
      saleDate: record.saleDate,
      buyerEmail: record.buyerEmail,
      metadata: record.metadata,
    };
  }

  protected deduplicateSales(
    records: PlatformSaleRecord[],
    existingExternalIds: string[]
  ): PlatformSaleRecord[] {
    const existingSet = new Set(existingExternalIds);
    return records.filter(record => !existingSet.has(record.externalId));
  }

  protected async fetchExistingExternalIds(_eventId: string, _platformId: string): Promise<string[]> {
    return [];
  }
}
