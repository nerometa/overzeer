/**
 * Platform Adapter Types
 * 
 * Defines the contract for integrating with external ticketing platforms.
 * These interfaces enable a unified way to sync sales data from different platforms.
 */

/**
 * Represents a single sale/transaction from an external platform
 */
export interface PlatformSaleRecord {
  externalId: string;         // Platform's sale ID
  ticketType: string;
  quantity: number;
  pricePerTicket: number;
  fees: number;
  saleDate: Date;
  buyerEmail?: string;        // Optional, for platforms that provide it
  metadata?: Record<string, unknown>; // Platform-specific extra data
}

/**
 * Maps our internal event to a platform's external event
 */
export interface PlatformEventMapping {
  platformId: string;         // Our platform ID (from platforms table)
  externalEventId: string;    // Platform's event ID
  eventId: string;            // Our event ID
}

/**
 * Platform-specific authentication credentials
 */
export interface PlatformCredentials {
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
}

/**
 * Result of a sync operation
 */
export interface SyncResult {
  success: boolean;
  salesImported: number;
  salesUpdated: number;
  errors: Array<{ message: string; record?: unknown }>;
  syncedAt: Date;
}

/**
 * Core platform adapter interface
 * Each platform (Megatix, Ticketmelon, etc.) implements this interface
 */
export interface PlatformAdapter {
  readonly name: string;
  readonly slug: string;      // Matches platforms.name in DB
  readonly supportsApi: boolean;
  
  /**
   * Authenticate with the platform using provided credentials
   */
  authenticate(credentials: PlatformCredentials): Promise<boolean>;
  
  /**
   * Fetch sales records from the platform for a specific event
   * @param mapping Event mapping details
   * @param since Optional date to fetch sales after
   */
  fetchSales(mapping: PlatformEventMapping, since?: Date): Promise<PlatformSaleRecord[]>;
  
  /**
   * Full sync operation: authenticate, fetch, deduplicate, and return results
   */
  sync(mapping: PlatformEventMapping, credentials: PlatformCredentials): Promise<SyncResult>;
  
  /**
   * Validate credentials without performing a full sync
   */
  validateCredentials(credentials: PlatformCredentials): Promise<boolean>;
}

/**
 * Shape for inserting sales into our database
 * Mapped from PlatformSaleRecord
 */
export interface SalesInsert {
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
