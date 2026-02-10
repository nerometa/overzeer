export * from './types';
export * from './base';
export { MegatixAdapter } from './megatix';
export { TicketmelonAdapter } from './ticketmelon';
export { ResidentAdvisorAdapter } from './resident-advisor';
export { AtDoorAdapter } from './at-door';

import type { PlatformAdapter } from './types';
import { MegatixAdapter } from './megatix';
import { TicketmelonAdapter } from './ticketmelon';
import { ResidentAdvisorAdapter } from './resident-advisor';
import { AtDoorAdapter } from './at-door';

const adapterRegistry = new Map<string, PlatformAdapter>([
  ['Megatix', new MegatixAdapter()],
  ['Ticketmelon', new TicketmelonAdapter()],
  ['Resident Advisor', new ResidentAdvisorAdapter()],
  ['At-Door', new AtDoorAdapter()],
]);

export function getAdapter(slug: string): PlatformAdapter | undefined {
  return adapterRegistry.get(slug);
}

export function getAllAdapters(): PlatformAdapter[] {
  return Array.from(adapterRegistry.values());
}

export function listAdapterSlugs(): string[] {
  return Array.from(adapterRegistry.keys());
}
