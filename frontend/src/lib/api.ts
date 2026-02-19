import { createClient } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function getAuthHeaders(): Promise<HeadersInit> {
  // Dev mode: skip Supabase session, send dummy token
  if (process.env.NEXT_PUBLIC_DEV_MODE === "true") {
    return {
      Authorization: "Bearer dev-token",
      "Content-Type": "application/json",
    };
  }

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
  channel: string | null; // "WHATSAPP" | "TELEGRAM"
  telegram_connected: boolean;
  subscription_status: string | null;
  assistant_status: string | null;
}

export const TELEGRAM_BOT_USERNAME = "Yourclawdev_bot";

// Available models for selection
export const AVAILABLE_MODELS = [
  // OpenAI
  { id: "openai/gpt-5.2-codex", name: "GPT-5.2 Codex", description: "OpenAI's most capable", provider: "openai", comingSoon: false },
  { id: "openai/gpt-5-mini", name: "GPT-5 Mini", description: "Fast and affordable", provider: "openai", comingSoon: false },
  // Anthropic
  { id: "anthropic/claude-opus-4-6", name: "Claude Opus 4.6", description: "Most powerful", provider: "anthropic", comingSoon: false },
  { id: "anthropic/claude-sonnet-4-5", name: "Claude Sonnet 4.5", description: "Fast and capable", provider: "anthropic", comingSoon: false },
  { id: "anthropic/claude-haiku-4-5", name: "Claude Haiku 4.5", description: "Fastest responses", provider: "anthropic", comingSoon: false },
  // Vercel AI Gateway (cheap alternative models)
  { id: "minimax/minimax-m2.1", name: "MiniMax M2.1", description: "Fast and budget-friendly", provider: "vercel", comingSoon: false },
] as const;

export const DEFAULT_MODEL = "openai/gpt-5.2-codex";

export interface AssistantResponse {
  status: string;
  model: string;
  channel: string | null;
  claw_id: string | null;
  created_at: string | null;
  updated_at: string | null;
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

// Subscription
export interface SubscriptionDetails {
  status: string; // ACTIVE, PAST_DUE, CANCELED
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  plan_name: string;
  price: string;
  trial_end: string | null;
}

export const API_KEY_PROVIDERS = [
  { id: "VERCEL", name: "Vercel AI Gateway", description: "Access MiniMax and other cheap models" },
  { id: "ANTHROPIC", name: "Anthropic", description: "Required for Claude models" },
  { id: "OPENAI", name: "OpenAI", description: "Required for GPT models" },
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
  setChannel: (channel: string, phone?: string, telegram_username?: string) =>
    apiPost<UserProfile>("/api/v1/users/me/channel", {
      channel,
      phone: phone || undefined,
      telegram_username: telegram_username || undefined,
    }),
  getAssistant: () => apiGet<AssistantResponse>("/api/v1/assistants"),
  createAssistant: (data?: {
    model?: string;
    channel?: string;
    telegram_bot_token?: string;
    telegram_username?: string;
  }) => apiPost<{ status: string; model: string; channel: string | null; claw_id: string | null }>("/api/v1/assistants", {
    model: data?.model || DEFAULT_MODEL,
    channel: data?.channel || "TELEGRAM",
    telegram_bot_token: data?.telegram_bot_token || undefined,
    telegram_username: data?.telegram_username || undefined,
  }),
  updateAssistant: (model: string) => apiPatch<AssistantResponse>("/api/v1/assistants", { model }),
  deleteAssistant: () => apiDelete("/api/v1/assistants"),
  createCheckout: () => apiPost<{ checkout_url: string }>("/api/v1/checkout"),

  // Subscription
  getSubscription: () => apiGet<SubscriptionDetails>("/api/v1/subscription"),
  cancelSubscription: () => apiPost<{ status: string; cancels_at: string }>("/api/v1/subscription/cancel"),

  // Integrations
  getIntegrations: () => apiGet<IntegrationsResponse>("/api/v1/oauth/integrations"),
  connectService: (service: string) => apiGet<ConnectResponse>(`/api/v1/oauth/google/${service}/connect`),
  disconnectService: (service: string) => apiDelete(`/api/v1/oauth/google/${service}`),

  // API Keys (BYOK)
  getApiKeys: () => apiGet<ApiKeyResponse[]>("/api/v1/api-keys"),
  addApiKey: (provider: string, key: string) => apiPost<ApiKeyResponse>("/api/v1/api-keys", { provider, key }),
  deleteApiKey: (provider: string) => apiDelete(`/api/v1/api-keys?provider=${provider}`),

  // Feedback
  sendFeedback: (message: string) => apiPost<{ status: string }>("/api/v1/feedback", { message }),
};
