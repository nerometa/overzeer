import { QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const API_BASE = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      toast.error(error instanceof Error ? error.message : "An error occurred", {
        action: {
          label: "retry",
          onClick: () => query.invalidate(),
        },
      });
    },
  }),
});

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// Events API
export const eventsApi = {
  list: () => ({
    queryKey: ["events"],
    queryFn: () => fetchAPI<Event[]>('/api/events'),
  }),
  byId: ({ params: { id } }: { params: { id: string } }) => ({
    queryKey: ["events", id],
    queryFn: () => fetchAPI<EventWithRelations>(`/api/events/${id}`),
  }),
  create: (data: CreateEventInput) =>
    fetchAPI<Event>('/api/events', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (input: { id: string } & UpdateEventInput) => {
    const { id, ...data } = input;
    return fetchAPI<Event>(`/api/events/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  delete: (id: string) =>
    fetchAPI<{ success: true }>(`/api/events/${id}`, {
      method: 'DELETE',
    }),
};

// Sales API
export const salesApi = {
  listByEvent: ({ params: { eventId } }: { params: { eventId: string } }) => ({
    queryKey: ["sales", eventId],
    queryFn: () => fetchAPI<Sale[]>(`/api/sales?eventId=${eventId}`),
  }),
  byEvent: ({ params: { eventId } }: { params: { eventId: string } }) => ({
    queryKey: ["sales", eventId],
    queryFn: () => fetchAPI<Sale[]>(`/api/sales?eventId=${eventId}`),
  }),
  create: (data: CreateSaleInput) =>
    fetchAPI<Sale>('/api/sales', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (input: { id: string } & UpdateSaleInput) => {
    const { id, ...data } = input;
    return fetchAPI<Sale>(`/api/sales/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  delete: (id: string) =>
    fetchAPI<{ success: true }>(`/api/sales/${id}`, {
      method: 'DELETE',
    }),
};

// Platforms API
export const platformsApi = {
  list: () => ({
    queryKey: ["platforms"],
    queryFn: () => fetchAPI<Platform[]>('/api/platforms'),
  }),
};

// Analytics API
export const analyticsApi = {
  revenue: ({ params: { eventId } }: { params: { eventId: string } }) => ({
    queryKey: ["analytics", "revenue", eventId],
    queryFn: () => fetchAPI<RevenueBreakdown>(`/api/analytics/revenue?eventId=${eventId}`),
  }),
  velocity: ({ params: { eventId } }: { params: { eventId: string } }) => ({
    queryKey: ["analytics", "velocity", eventId],
    queryFn: () => fetchAPI<SalesVelocity>(`/api/analytics/velocity?eventId=${eventId}`),
  }),
  projections: ({ params: { eventId } }: { params: { eventId: string } }) => ({
    queryKey: ["analytics", "projections", eventId],
    queryFn: () => fetchAPI<Projections>(`/api/analytics/projections?eventId=${eventId}`),
  }),
  comprehensive: ({ params: { eventId } }: { params: { eventId: string } }) => ({
    queryKey: ["analytics", "comprehensive", eventId],
    queryFn: () => fetchAPI<ComprehensiveAnalytics>(`/api/analytics/comprehensive?eventId=${eventId}`),
  }),
};

// Dashboard API
export const dashboardApi = {
  overview: () => ({
    queryKey: ["dashboard"],
    queryFn: () => fetchAPI<DashboardOverview>('/api/dashboard'),
  }),
};

// Types
export interface Event {
  id: string;
  userId: string | null;
  name: string;
  date: string;
  venue: string | null;
  totalCapacity: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface EventWithRelations extends Event {
  sales: SaleWithPlatform[];
  projections: Projection[];
  manualSales: ManualSale[];
}

export interface Sale {
  id: string;
  eventId: string;
  platformId: string | null;
  platform: Platform | null;
  ticketType: string | null;
  quantity: number;
  pricePerTicket: number;
  fees: number;
  saleDate: number | string | Date;
  syncedAt: number;
}

export interface SaleWithPlatform extends Sale {
  platform: Platform | null;
}

export interface Platform {
  id: string;
  name: string;
  apiEnabled: boolean;
  colorHex: string | null;
  createdAt: number;
}

export interface Projection {
  id: string;
  eventId: string;
  projectedTotal: number | null;
  confidenceLevel: string | null;
  calculationDate: number;
}

export interface ManualSale {
  id: string;
  eventId: string;
  entryTime: number;
  quantity: number;
  totalAmount: number;
  notes: string | null;
  createdBy: string | null;
  createdAt: number;
}

export interface CreateEventInput {
  name: string;
  date: string;
  venue?: string;
  totalCapacity?: number;
}

export interface UpdateEventInput {
  name?: string;
  date?: string;
  venue?: string | null;
  totalCapacity?: number | null;
}

export interface CreateSaleInput {
  eventId: string;
  platformId?: string | null;
  ticketType?: string | null;
  quantity: number;
  pricePerTicket: number;
  fees?: number;
}

export interface UpdateSaleInput {
  platformId?: string | null;
  ticketType?: string | null;
  quantity?: number;
  pricePerTicket?: number;
  fees?: number;
}

export interface RevenueByPlatform {
  platformId: string | null;
  platformName: string;
  colorHex: string | null;
  revenue: number;
  fees: number;
  netRevenue: number;
  ticketsSold: number;
}

export interface RevenueByTicketType {
  ticketType: string;
  revenue: number;
  ticketsSold: number;
  avgPrice: number;
}

export interface RevenueBreakdown {
  totalRevenue: number;
  totalFees: number;
  netRevenue: number;
  revenueByPlatform: RevenueByPlatform[];
  revenueByTicketType: RevenueByTicketType[];
}

export interface SalesByDay {
  date: string;
  ticketsSold: number;
  revenue: number;
}

export interface SalesVelocity {
  totalTicketsSold: number;
  dailyAverage: number;
  weeklyAverage: number;
  trend: "increasing" | "decreasing" | "stable";
  salesByDay: SalesByDay[];
}

export interface Projections {
  projectedTotalRevenue: number;
  projectedTotalTickets: number;
  percentageSold: number | null;
  daysUntilSellout: number | null;
  confidenceLevel: "high" | "medium" | "low";
  asOf: string;
}

export interface ComprehensiveAnalytics {
  revenue: RevenueBreakdown;
  velocity: SalesVelocity;
  projections: Projections;
}

export interface DashboardOverview {
  totalEvents: number;
  totalRevenue: number;
  totalTicketsSold: number;
  totalFees: number;
  eventSummaries: Array<{
    eventId: string;
    eventName: string;
    date: string;
    venue: string | null;
    revenue: number;
    ticketsSold: number;
  }>;
  recentSales: Array<{
    saleId: string;
    eventId: string;
    eventName: string;
    platformId: string | null;
    platformName: string;
    ticketType: string | null;
    quantity: number;
    pricePerTicket: number;
    fees: number;
    revenue: number;
    saleDate: string;
  }>;
}