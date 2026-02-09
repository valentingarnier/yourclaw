import { createClient } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function getAuthHeaders(): Promise<HeadersInit> {
  const supabase = createClient();

  // First try to get session
  let { data: { session } } = await supabase.auth.getSession();

  // If no session, try refreshing
  if (!session) {
    const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
    session = refreshedSession;
  }

  if (!session?.access_token) {
    console.error("No session found after refresh attempt");
    throw new Error("Not authenticated");
  }

  return {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  };
}

export async function apiGet<T>(path: string): Promise<T> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}${path}`, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response.json();
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response.json();
}

export async function apiDelete(path: string): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}${path}`, {
    method: "DELETE",
    headers,
  });

  if (!response.ok && response.status !== 204) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `API error: ${response.status}`);
  }
}

// API Types
export interface UserProfile {
  id: string;
  email: string;
  phone: string | null;
  subscription_status: string | null;
  assistant_status: string | null;
}

// Available models for selection
export const AVAILABLE_MODELS = [
  // Anthropic
  { id: "anthropic/claude-sonnet-4-5-20250929", name: "Claude Sonnet 4.5", description: "Fast and capable", provider: "anthropic" },
  { id: "anthropic/claude-opus-4-5-20251101", name: "Claude Opus 4.5", description: "Most powerful", provider: "anthropic" },
  { id: "anthropic/claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", description: "Fastest responses", provider: "anthropic" },
  // OpenAI
  { id: "openai/gpt-4o", name: "GPT-4o", description: "OpenAI's flagship model", provider: "openai" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", description: "Fast and affordable", provider: "openai" },
  // Google
  { id: "google/gemini-2.0-flash", name: "Gemini 2.0 Flash", description: "Google's fast model", provider: "google" },
  { id: "google/gemini-2.0-flash-lite", name: "Gemini 2.0 Flash Lite", description: "Lightweight and fast", provider: "google" },
] as const;

export const DEFAULT_MODEL = "anthropic/claude-sonnet-4-5-20250929";

export interface AssistantResponse {
  status: string;
  model: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface UsageResponse {
  today: {
    date: string;
    inbound_count: number;
    outbound_count: number;
  };
  credits_used_cents: number;
  credits_total_cents: number;
}

export interface IntegrationInfo {
  email: string;
  connected_at: string;
}

export interface IntegrationsResponse {
  google_calendar: IntegrationInfo | null;
  google_gmail: IntegrationInfo | null;
  google_drive: IntegrationInfo | null;
}

export interface ConnectResponse {
  auth_url: string;
}

// API Keys (BYOK)
export interface ApiKeyResponse {
  provider: string;
  created_at: string;
  has_key: boolean;
}

export const API_KEY_PROVIDERS = [
  { id: "ANTHROPIC", name: "Anthropic", description: "Claude models" },
  { id: "OPENAI", name: "OpenAI", description: "GPT models" },
  { id: "GOOGLE", name: "Google", description: "Gemini models" },
] as const;

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}${path}`, {
    method: "PATCH",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response.json();
}

// API Functions
export const api = {
  getMe: () => apiGet<UserProfile>("/api/v1/users/me"),
  setPhone: (phone: string) => apiPost<UserProfile>("/api/v1/users/me/phone", { phone }),
  getAssistant: () => apiGet<AssistantResponse>("/api/v1/assistants"),
  createAssistant: (model?: string) => apiPost<{ status: string; model: string }>("/api/v1/assistants", { model: model || DEFAULT_MODEL }),
  updateAssistant: (model: string) => apiPatch<AssistantResponse>("/api/v1/assistants", { model }),
  deleteAssistant: () => apiDelete("/api/v1/assistants"),
  getUsage: () => apiGet<UsageResponse>("/api/v1/usage"),
  createCheckout: () => apiPost<{ checkout_url: string }>("/api/v1/checkout"),

  // Integrations
  getIntegrations: () => apiGet<IntegrationsResponse>("/api/v1/oauth/integrations"),
  connectService: (service: string) => apiGet<ConnectResponse>(`/api/v1/oauth/google/${service}/connect`),
  disconnectService: (service: string) => apiDelete(`/api/v1/oauth/google/${service}`),

  // API Keys (BYOK)
  getApiKeys: () => apiGet<ApiKeyResponse[]>("/api/v1/api-keys"),
  addApiKey: (provider: string, key: string) => apiPost<ApiKeyResponse>("/api/v1/api-keys", { provider, key }),
  deleteApiKey: (provider: string) => apiDelete(`/api/v1/api-keys?provider=${provider}`),
};
