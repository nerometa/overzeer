import { NextRequest, NextResponse } from "next/server";

/**
 * Catch-all API proxy route.
 * Forwards all /api/* requests to the backend service.
 * 
 * This is needed because:
 * - Browser requests go to the frontend domain
 * - Backend runs in a separate container
 * - We need to proxy API calls to the backend
 */

const getBackendUrl = (): string => {
  // Server-side: use Docker internal network
  if (typeof window === "undefined") {
    return process.env.API_INTERNAL_URL ?? "http://backend:3000";
  }
  // Client-side should never hit this route (direct fetch to backend)
  return process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000";
};

async function proxyRequest(
  request: NextRequest,
  method: string
): Promise<NextResponse> {
  const backendUrl = getBackendUrl();
  const path = request.nextUrl.pathname;
  const searchParams = request.nextUrl.search;
  const targetUrl = `${backendUrl}${path}${searchParams}`;

  // Forward headers (except host)
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "host") {
      headers.set(key, value);
    }
  });

  // Build fetch options
  const fetchOptions: RequestInit = {
    method,
    headers,
    credentials: "include",
  };

  // Forward body for methods that have one
  if (["POST", "PUT", "PATCH"].includes(method)) {
    try {
      const body = await request.text();
      if (body) {
        fetchOptions.body = body;
      }
    } catch {
      // No body or failed to read - that's okay
    }
  }

  try {
    const response = await fetch(targetUrl, fetchOptions);

    // Build response headers (use append for Set-Cookie to handle multiple)
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") {
        responseHeaders.append(key, value);
      } else {
        responseHeaders.set(key, value);
      }
    });

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`[API Proxy] Error proxying ${method} ${path}:`, error);
    return NextResponse.json(
      { error: "Proxy error", message: "Failed to reach backend service" },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest) {
  return proxyRequest(request, "GET");
}

export async function POST(request: NextRequest) {
  return proxyRequest(request, "POST");
}

export async function PUT(request: NextRequest) {
  return proxyRequest(request, "PUT");
}

export async function PATCH(request: NextRequest) {
  return proxyRequest(request, "PATCH");
}

export async function DELETE(request: NextRequest) {
  return proxyRequest(request, "DELETE");
}

export async function OPTIONS(request: NextRequest) {
  return proxyRequest(request, "OPTIONS");
}
