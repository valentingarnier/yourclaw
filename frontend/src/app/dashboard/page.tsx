"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  api,
  UserProfile,
  AssistantResponse,
  UsageResponse,
  IntegrationsResponse,
  ApiKeyResponse,
  SubscriptionDetails,
  AVAILABLE_MODELS,
  DEFAULT_MODEL,
  API_KEY_PROVIDERS,
} from "@/lib/api";

// Catalyst components
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import { Heading, Subheading } from "@/components/heading";
import { Text } from "@/components/text";
import { Divider } from "@/components/divider";
import { Avatar } from "@/components/avatar";
import { SidebarLayout } from "@/components/sidebar-layout";
import {
  Sidebar,
  SidebarHeader,
  SidebarBody,
  SidebarFooter,
  SidebarSection,
  SidebarItem,
  SidebarLabel,
  SidebarSpacer,
} from "@/components/sidebar";
import {
  Dropdown,
  DropdownButton,
  DropdownMenu,
  DropdownItem,
  DropdownLabel,
  DropdownDivider,
} from "@/components/dropdown";
import { Navbar, NavbarSpacer } from "@/components/navbar";
import { Logo } from "@/components/logo";
import { Dialog, DialogTitle, DialogDescription, DialogBody, DialogActions } from "@/components/dialog";

// Heroicons
import {
  CalendarIcon,
  EnvelopeIcon,
  FolderIcon,
  ArrowPathIcon,
  TrashIcon,
  PlusIcon,
  Cog6ToothIcon,
  ArrowRightStartOnRectangleIcon,
  ChevronUpIcon,
  SparklesIcon,
  LinkIcon,
  ChartBarIcon,
  KeyIcon,
  CheckIcon,
  XMarkIcon,
  WrenchScrewdriverIcon,
  ClockIcon,
  PaperAirplaneIcon,
  LightBulbIcon,
  CreditCardIcon,
} from "@heroicons/react/20/solid";

type Section = "assistant" | "tools" | "services" | "usage" | "apikeys" | "subscription";

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [assistant, setAssistant] = useState<AssistantResponse | null>(null);
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationsResponse | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKeyResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [connectingService, setConnectingService] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<Section>("assistant");
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [userData, assistantData, usageData, integrationsData, apiKeysData] = await Promise.all([
        api.getMe(),
        api.getAssistant().catch(() => null),
        api.getUsage().catch(() => null),
        api.getIntegrations().catch(() => null),
        api.getApiKeys().catch(() => []),
      ]);

      setUser(userData);
      setAssistant(assistantData);
      setUsage(usageData);
      setIntegrations(integrationsData);
      setApiKeys(apiKeysData);

      // Set selected model from assistant data
      if (assistantData?.model) {
        setSelectedModel(assistantData.model);
      }

      if (!userData.phone && userData.channel !== "TELEGRAM") {
        router.push("/onboarding");
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateAssistant() {
    try {
      setError(null);
      await api.createAssistant({ model: selectedModel });
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create assistant";

      if (message.includes("subscription") || message.includes("402")) {
        try {
          const { checkout_url } = await api.createCheckout();
          window.location.href = checkout_url;
          return;
        } catch {
          setError("Failed to start checkout");
          return;
        }
      }

      setError(message);
    }
  }

  async function handleUpdateModel(newModel: string) {
    try {
      setError(null);
      setSelectedModel(newModel);
      await api.updateAssistant(newModel);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update model");
      // Revert on error
      if (assistant?.model) {
        setSelectedModel(assistant.model);
      }
    }
  }

  async function handleDeleteAssistant() {
    if (!confirm("Are you sure you want to delete your assistant?")) return;

    try {
      setError(null);
      await api.deleteAssistant();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete assistant");
    }
  }

  async function handleConnectService(service: string) {
    try {
      setConnectingService(service);
      setError(null);
      const { auth_url } = await api.connectService(service);
      window.location.href = auth_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to connect ${service}`);
      setConnectingService(null);
    }
  }

  async function handleDisconnectService(service: string) {
    const serviceName =
      service === "calendar" ? "Google Calendar" : service === "gmail" ? "Gmail" : "Google Drive";
    if (!confirm(`Disconnect ${serviceName}? Your assistant will no longer have access.`)) return;

    try {
      setError(null);
      await api.disconnectService(service);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to disconnect ${service}`);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 dark:border-white"></div>
      </div>
    );
  }

  const userInitials = user?.email ? user.email.slice(0, 2).toUpperCase() : "??";

  const sidebar = (
    <Sidebar>
      <SidebarHeader>
        <SidebarSection>
          <SidebarItem href="/dashboard">
            <Logo size="md" showText={true} href={undefined} />
          </SidebarItem>
        </SidebarSection>
      </SidebarHeader>

      <SidebarBody>
        <SidebarSection>
          <SidebarItem current={activeSection === "assistant"} onClick={() => setActiveSection("assistant")}>
            <SparklesIcon />
            <SidebarLabel>Assistant</SidebarLabel>
          </SidebarItem>
          <SidebarItem current={activeSection === "apikeys"} onClick={() => setActiveSection("apikeys")}>
            <KeyIcon />
            <SidebarLabel>API Keys</SidebarLabel>
          </SidebarItem>
          <SidebarItem current={activeSection === "tools"} onClick={() => setActiveSection("tools")}>
            <WrenchScrewdriverIcon />
            <SidebarLabel>Tools</SidebarLabel>
          </SidebarItem>
          {/* Connected Services hidden until Google OAuth is production-ready */}
          {/* <SidebarItem current={activeSection === "services"} onClick={() => setActiveSection("services")}>
            <LinkIcon />
            <SidebarLabel>Connected Services</SidebarLabel>
          </SidebarItem> */}
          <SidebarItem current={activeSection === "usage"} onClick={() => setActiveSection("usage")}>
            <ChartBarIcon />
            <SidebarLabel>Usage</SidebarLabel>
          </SidebarItem>
          <SidebarItem current={activeSection === "subscription"} onClick={() => setActiveSection("subscription")}>
            <CreditCardIcon />
            <SidebarLabel>Subscription</SidebarLabel>
          </SidebarItem>
        </SidebarSection>

        <SidebarSpacer />
      </SidebarBody>

      <SidebarFooter>
        <Dropdown>
          <DropdownButton as={SidebarItem}>
            <Avatar initials={userInitials} className="size-8 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" />
            <SidebarLabel className="flex flex-col items-start">
              <span className="text-sm font-medium">{user?.email?.split("@")[0]}</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{user?.channel === "TELEGRAM" ? "Telegram" : user?.phone}</span>
            </SidebarLabel>
            <ChevronUpIcon className="ml-auto size-4" />
          </DropdownButton>
          <DropdownMenu anchor="top start" className="min-w-64">
            <DropdownItem href="/settings">
              <Cog6ToothIcon />
              <DropdownLabel>Settings</DropdownLabel>
            </DropdownItem>
            <DropdownDivider />
            <DropdownItem onClick={handleSignOut}>
              <ArrowRightStartOnRectangleIcon />
              <DropdownLabel>Sign out</DropdownLabel>
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </SidebarFooter>
    </Sidebar>
  );

  const navbar = (
    <Navbar>
      <NavbarSpacer />
      <span className="text-lg font-bold text-zinc-950 dark:text-white">YourClaw</span>
      <NavbarSpacer />
    </Navbar>
  );

  return (
    <SidebarLayout navbar={navbar} sidebar={sidebar}>
      <div className="space-y-10">
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {activeSection === "assistant" && (
          <AssistantSection
            user={user}
            assistant={assistant}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            onUpdateModel={handleUpdateModel}
            onCreateAssistant={handleCreateAssistant}
            onDeleteAssistant={handleDeleteAssistant}
            onRefresh={loadData}
          />
        )}

        {activeSection === "apikeys" && (
          <ApiKeysSection
            apiKeys={apiKeys}
            assistant={assistant}
            onRefresh={loadData}
            setError={setError}
          />
        )}

        {activeSection === "tools" && <ToolsSection userEmail={user?.email || ""} />}

        {/* Connected Services hidden until Google OAuth is production-ready */}
        {/* {activeSection === "services" && (
          <ServicesSection
            integrations={integrations}
            connectingService={connectingService}
            onConnectService={handleConnectService}
            onDisconnectService={handleDisconnectService}
          />
        )} */}

        {activeSection === "usage" && <UsageSection usage={usage} user={user} />}

        {activeSection === "subscription" && <SubscriptionSection />}
      </div>
    </SidebarLayout>
  );
}

function AssistantSection({
  user,
  assistant,
  selectedModel,
  onModelChange,
  onUpdateModel,
  onCreateAssistant,
  onDeleteAssistant,
  onRefresh,
}: {
  user: UserProfile | null;
  assistant: AssistantResponse | null;
  selectedModel: string;
  onModelChange: (model: string) => void;
  onUpdateModel: (model: string) => void;
  onCreateAssistant: () => void;
  onDeleteAssistant: () => void;
  onRefresh: () => void;
}) {
  const canChangeModel = !assistant || assistant.status === "NONE" || assistant.status === "ERROR";
  const currentModelInfo = AVAILABLE_MODELS.find((m) => m.id === selectedModel);
  const [editingChannel, setEditingChannel] = useState(false);
  const [newChannel, setNewChannel] = useState<"WHATSAPP" | "TELEGRAM">(
    (user?.channel as "WHATSAPP" | "TELEGRAM") || "TELEGRAM"
  );
  const [newPhone, setNewPhone] = useState(user?.phone || "");
  const [newBotToken, setNewBotToken] = useState("");
  const [newTelegramUsername, setNewTelegramUsername] = useState("");
  const [showBotTutorial, setShowBotTutorial] = useState(false);
  const [channelSaving, setChannelSaving] = useState(false);
  const [channelError, setChannelError] = useState<string | null>(null);

  async function handleCreateWithChannel() {
    setChannelError(null);
    if (newChannel === "WHATSAPP") {
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      if (!phoneRegex.test(newPhone)) {
        setChannelError("Enter a valid phone number (e.g., +15551234567)");
        return;
      }
    } else {
      if (!newBotToken || !newBotToken.includes(":")) {
        setChannelError("Enter a valid Telegram bot token (from @BotFather)");
        return;
      }
      if (!newTelegramUsername.trim()) {
        setChannelError("Enter your Telegram username so only you can message the bot");
        return;
      }
    }
    try {
      setChannelSaving(true);
      const username = newTelegramUsername.replace(/^@/, "").trim();
      await api.setChannel(
        newChannel,
        newChannel === "WHATSAPP" ? newPhone : undefined,
        newChannel === "TELEGRAM" ? username : undefined,
      );
      // Channel saved, now create the assistant with bot token + username
      await api.createAssistant({
        model: selectedModel,
        telegram_bot_token: newChannel === "TELEGRAM" ? newBotToken : undefined,
        telegram_username: newChannel === "TELEGRAM" ? username : undefined,
      });
      onRefresh();
    } catch (err) {
      setChannelError(err instanceof Error ? err.message : "Failed to save channel");
    } finally {
      setChannelSaving(false);
    }
  }

  async function handleSaveChannel() {
    setChannelError(null);
    if (newChannel === "WHATSAPP") {
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      if (!phoneRegex.test(newPhone)) {
        setChannelError("Enter a valid phone (e.g., +15551234567)");
        return;
      }
    }
    try {
      setChannelSaving(true);
      await api.setChannel(
        newChannel,
        newChannel === "WHATSAPP" ? newPhone : undefined,
      );
      setEditingChannel(false);
      onRefresh();
    } catch (err) {
      setChannelError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setChannelSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <Heading>Assistant</Heading>
        <Text className="mt-2">Manage your AI assistant on {user?.channel === "TELEGRAM" ? "Telegram" : "WhatsApp"}.</Text>
      </div>

      <Divider />

      {/* Model Selection */}
      <div className="rounded-lg border border-zinc-950/10 dark:border-white/10 p-6">
        <Subheading className="mb-6">AI Model</Subheading>

        {/* Anthropic */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <img src="/claude-logo.png" alt="Anthropic" className="size-5" />
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Anthropic</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {AVAILABLE_MODELS.filter((m) => m.provider === "anthropic").map((model) => (
              <ModelButton
                key={model.id}
                model={model}
                selected={selectedModel === model.id}
                disabled={assistant?.status === "PROVISIONING"}
                onClick={() => {
                  if (canChangeModel) {
                    onModelChange(model.id);
                  } else if (assistant?.status === "READY") {
                    onUpdateModel(model.id);
                  }
                }}
              />
            ))}
          </div>
        </div>

        {/* OpenAI */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <img src="/openai-logo.png" alt="OpenAI" className="size-5" />
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">OpenAI</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {AVAILABLE_MODELS.filter((m) => m.provider === "openai").map((model) => (
              <ModelButton
                key={model.id}
                model={model}
                selected={selectedModel === model.id}
                disabled={assistant?.status === "PROVISIONING"}
                onClick={() => {
                  if (canChangeModel) {
                    onModelChange(model.id);
                  } else if (assistant?.status === "READY") {
                    onUpdateModel(model.id);
                  }
                }}
              />
            ))}
          </div>
        </div>

        {/* Google */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <img src="/gemini-logo.png" alt="Google" className="size-5" />
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Google</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {AVAILABLE_MODELS.filter((m) => m.provider === "google").map((model) => (
              <ModelButton
                key={model.id}
                model={model}
                selected={selectedModel === model.id}
                disabled={assistant?.status === "PROVISIONING"}
                onClick={() => {
                  if (canChangeModel) {
                    onModelChange(model.id);
                  } else if (assistant?.status === "READY") {
                    onUpdateModel(model.id);
                  }
                }}
              />
            ))}
          </div>
        </div>

        {assistant?.status === "READY" && (
          <Text className="mt-6 text-xs">Changing model will reprovision your assistant.</Text>
        )}
      </div>

      {/* Status */}
      <div className="rounded-lg border border-zinc-950/10 dark:border-white/10 p-6">
        <div className="flex items-center justify-between mb-6">
          <Subheading>Status</Subheading>
          <StatusBadge status={assistant?.status || "NONE"} />
        </div>

        <div className="mb-6">
          {assistant?.status === "READY" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
                  <CheckIcon className="size-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-950 dark:text-white">Your assistant is live</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {currentModelInfo?.name || selectedModel}
                  </p>
                </div>
              </div>

              {/* Channel-specific card */}
              {user?.channel === "TELEGRAM" ? (
                <div className="rounded-xl border border-zinc-950/10 dark:border-white/10 overflow-hidden">
                  <div className="bg-[#0088CC] px-4 py-3 flex items-center gap-3">
                    <div className="size-8 rounded-full bg-white/20 flex items-center justify-center">
                      <svg className="size-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-white">Telegram</span>
                    <Badge color="emerald" className="ml-auto">Live</Badge>
                  </div>
                  <div className="px-4 py-4 space-y-3">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Your assistant is ready! Open your bot on Telegram to start chatting.
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Only messages from your Telegram account are allowed.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-950/10 dark:border-white/10 overflow-hidden">
                  <div className="bg-[#075E54] px-4 py-3 flex items-center gap-3">
                    <div className="size-8 rounded-full bg-white/20 flex items-center justify-center">
                      <svg className="size-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.61.61l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.387 0-4.593-.838-6.315-2.234l-.44-.366-3.09 1.036 1.036-3.09-.366-.44A9.953 9.953 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-white">WhatsApp</span>
                  </div>
                  <div className="px-4 py-4 space-y-3">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Send a message to start chatting with your assistant:
                    </p>
                    <div className="flex items-center justify-between rounded-lg bg-zinc-50 dark:bg-zinc-800/50 px-4 py-3">
                      <span className="text-base font-mono font-semibold text-zinc-950 dark:text-white tracking-wide">
                        +1 (555) 758-9499
                      </span>
                    </div>
                    <a
                      href={`https://wa.me/15557589499?text=${encodeURIComponent("Hello, are you there?")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] hover:bg-[#20BD5A] px-4 py-2.5 text-sm font-medium text-white transition-colors"
                    >
                      <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                      </svg>
                      Open WhatsApp
                    </a>
                    <p className="text-xs text-center text-zinc-400 dark:text-zinc-500">
                      Save this number as &quot;YourClaw&quot; for easy access
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {assistant?.status === "PROVISIONING" && (
            <Text>Your assistant is being set up. This usually takes 1-2 minutes.</Text>
          )}

          {assistant?.status === "ERROR" && (
            <Text className="text-red-600 dark:text-red-400">
              There was an error setting up your assistant. Try recreating it.
            </Text>
          )}

          {(!assistant || assistant.status === "NONE") && (
            <Text>Choose your messaging channel and create your AI assistant.</Text>
          )}
        </div>

        {/* Channel setup for new assistants */}
        {(!assistant || assistant.status === "NONE" || assistant.status === "ERROR") && (
          <div className="space-y-4 mb-6">
            <p className="text-sm font-medium text-zinc-950 dark:text-white">Connect via</p>
            {/* Channel toggle */}
            <div className="flex rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1">
              <button
                type="button"
                disabled
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-zinc-400 dark:text-zinc-500 cursor-not-allowed opacity-50"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.613.613l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.352 0-4.55-.676-6.422-1.842l-.448-.292-2.652.889.889-2.652-.292-.448A9.963 9.963 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                WhatsApp
                <span className="text-[10px] uppercase tracking-wider font-semibold bg-zinc-200 dark:bg-zinc-600 text-zinc-500 dark:text-zinc-400 px-1.5 py-0.5 rounded-full">Soon</span>
              </button>
              <button
                type="button"
                onClick={() => setNewChannel("TELEGRAM")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  newChannel === "TELEGRAM"
                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                }`}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                Telegram
              </button>
            </div>

            {/* Contact input */}
            {newChannel === "WHATSAPP" ? (
              <>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+15551234567"
                  className="w-full rounded-lg border border-zinc-950/10 dark:border-white/10 bg-transparent px-3 py-2.5 text-sm text-zinc-950 dark:text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white"
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Include country code (e.g., +1 for US)</p>
              </>
            ) : (
              <div className="space-y-4">
                {/* Bot token */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Bot token</p>
                    <button
                      type="button"
                      onClick={() => setShowBotTutorial(!showBotTutorial)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {showBotTutorial ? "Hide guide" : "How to get a bot token?"}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={newBotToken}
                    onChange={(e) => setNewBotToken(e.target.value.trim())}
                    placeholder="123456789:ABCdefGhIjKlMnOpQrStUvWxYz"
                    className="w-full rounded-lg border border-zinc-950/10 dark:border-white/10 bg-transparent px-3 py-2.5 text-sm font-mono text-zinc-950 dark:text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white"
                  />
                </div>

                {/* Telegram username */}
                <div>
                  <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Your Telegram username</p>
                  <input
                    type="text"
                    value={newTelegramUsername}
                    onChange={(e) => setNewTelegramUsername(e.target.value)}
                    placeholder="@yourusername"
                    className="w-full rounded-lg border border-zinc-950/10 dark:border-white/10 bg-transparent px-3 py-2.5 text-sm text-zinc-950 dark:text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white"
                  />
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Only this account will be able to message the bot.</p>
                </div>

                {/* BotFather tutorial */}
                {showBotTutorial && (
                  <div className="rounded-xl border border-blue-200 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-950/30 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-blue-500"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                      <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">Create your Telegram bot in 30 seconds</p>
                    </div>
                    <ol className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
                      <li className="flex gap-2">
                        <span className="flex-shrink-0 flex size-5 items-center justify-center rounded-full bg-blue-200 dark:bg-blue-800 text-xs font-bold text-blue-700 dark:text-blue-300">1</span>
                        <span>Open Telegram and search for <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="font-semibold underline">@BotFather</a></span>
                      </li>
                      <li className="flex gap-2">
                        <span className="flex-shrink-0 flex size-5 items-center justify-center rounded-full bg-blue-200 dark:bg-blue-800 text-xs font-bold text-blue-700 dark:text-blue-300">2</span>
                        <span>Send <code className="px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900 font-mono text-xs">/newbot</code> and follow the prompts</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="flex-shrink-0 flex size-5 items-center justify-center rounded-full bg-blue-200 dark:bg-blue-800 text-xs font-bold text-blue-700 dark:text-blue-300">3</span>
                        <span>Choose a name (e.g., &quot;My AI Assistant&quot;)</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="flex-shrink-0 flex size-5 items-center justify-center rounded-full bg-blue-200 dark:bg-blue-800 text-xs font-bold text-blue-700 dark:text-blue-300">4</span>
                        <span>Choose a username ending in <code className="px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900 font-mono text-xs">bot</code> (e.g., <code className="px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900 font-mono text-xs">my_ai_assistant_bot</code>)</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="flex-shrink-0 flex size-5 items-center justify-center rounded-full bg-blue-200 dark:bg-blue-800 text-xs font-bold text-blue-700 dark:text-blue-300">5</span>
                        <span>Copy the <strong>HTTP API token</strong> and paste it above</span>
                      </li>
                    </ol>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      The token looks like: <code className="font-mono">123456789:ABCdefGhIjKlMnOpQrStUvWxYz</code>
                    </p>
                  </div>
                )}
              </div>
            )}

            {channelError && (
              <p className="text-sm text-red-600 dark:text-red-400">{channelError}</p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {(!assistant || assistant.status === "NONE" || assistant.status === "ERROR") && (
            <Button color="dark" onClick={handleCreateWithChannel} disabled={channelSaving}>
              <PlusIcon />
              {channelSaving ? "Setting up..." : user?.subscription_status === "ACTIVE" ? "Create Assistant" : "Subscribe & Create Assistant"}
            </Button>
          )}

          {assistant?.status === "READY" && (
            <Button color="red" onClick={onDeleteAssistant}>
              <TrashIcon />
              Delete Assistant
            </Button>
          )}

          {assistant?.status === "PROVISIONING" && (
            <Button outline onClick={onRefresh}>
              <ArrowPathIcon />
              Refresh Status
            </Button>
          )}
        </div>
      </div>

      {/* Channel Settings (only when assistant exists) */}
      {assistant && assistant.status !== "NONE" && assistant.status !== "ERROR" && (
        <div className="rounded-lg border border-zinc-950/10 dark:border-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <Subheading>Channel</Subheading>
            {!editingChannel && (
              <Button plain onClick={() => {
                setNewChannel((user?.channel as "WHATSAPP" | "TELEGRAM") || "WHATSAPP");
                setNewPhone(user?.phone || "");
                setNewTelegramUsername("");
                setChannelError(null);
                setEditingChannel(true);
              }}>
                Edit
              </Button>
            )}
          </div>

          {editingChannel ? (
            <div className="space-y-4">
              <div className="flex rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1">
                <button type="button" onClick={() => setNewChannel("WHATSAPP")} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${newChannel === "WHATSAPP" ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}>
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.613.613l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.352 0-4.55-.676-6.422-1.842l-.448-.292-2.652.889.889-2.652-.292-.448A9.963 9.963 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                  WhatsApp
                </button>
                <button type="button" onClick={() => setNewChannel("TELEGRAM")} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${newChannel === "TELEGRAM" ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}>
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                  Telegram
                </button>
              </div>
              {newChannel === "WHATSAPP" && (
                <input type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+15551234567" className="w-full rounded-lg border border-zinc-950/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm text-zinc-950 dark:text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white" />
              )}
              {channelError && <p className="text-sm text-red-600 dark:text-red-400">{channelError}</p>}
              <div className="flex gap-2">
                <Button color="dark" onClick={handleSaveChannel} disabled={channelSaving}>{channelSaving ? "Saving..." : "Save"}</Button>
                <Button plain onClick={() => setEditingChannel(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className={`flex size-10 items-center justify-center rounded-full ${user?.channel === "TELEGRAM" ? "bg-[#0088CC]/10" : "bg-[#25D366]/10"}`}>
                {user?.channel === "TELEGRAM" ? (
                  <svg className="size-5 text-[#0088CC]" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                ) : (
                  <svg className="size-5 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.613.613l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.352 0-4.55-.676-6.422-1.842l-.448-.292-2.652.889.889-2.652-.292-.448A9.963 9.963 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-950 dark:text-white">{user?.channel === "TELEGRAM" ? "Telegram" : "WhatsApp"}</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{user?.channel === "TELEGRAM" ? "Telegram" : user?.phone}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ServicesSection({
  integrations,
  connectingService,
  onConnectService,
  onDisconnectService,
}: {
  integrations: IntegrationsResponse | null;
  connectingService: string | null;
  onConnectService: (service: string) => void;
  onDisconnectService: (service: string) => void;
}) {
  return (
    <div className="space-y-8">
      <div>
        <Heading>Connected Services</Heading>
        <Text className="mt-2">
          Connect your Google services to let your assistant access your calendar, email, and files.
        </Text>
      </div>

      <Divider />

      <div className="space-y-4">
        <ServiceCard
          icon={<CalendarIcon className="size-5" />}
          name="Google Calendar"
          description="View and manage calendar events"
          connected={integrations?.google_calendar}
          connecting={connectingService === "calendar"}
          onConnect={() => onConnectService("calendar")}
          onDisconnect={() => onDisconnectService("calendar")}
        />
        <ServiceCard
          icon={<EnvelopeIcon className="size-5" />}
          name="Gmail"
          description="Read and send emails"
          connected={integrations?.google_gmail}
          connecting={connectingService === "gmail"}
          onConnect={() => onConnectService("gmail")}
          onDisconnect={() => onDisconnectService("gmail")}
        />
        <ServiceCard
          icon={<FolderIcon className="size-5" />}
          name="Google Drive"
          description="Access files and folders"
          connected={integrations?.google_drive}
          connecting={connectingService === "drive"}
          onConnect={() => onConnectService("drive")}
          onDisconnect={() => onDisconnectService("drive")}
        />
      </div>
    </div>
  );
}

function UsageSection({ usage, user }: { usage: UsageResponse | null; user: UserProfile | null }) {
  return (
    <div className="space-y-8">
      <div>
        <Heading>Usage</Heading>
        <Text className="mt-2">Monitor your assistant usage and remaining credits.</Text>
      </div>

      <Divider />

      {usage ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <UsageCard
            value={usage.today.inbound_count + usage.today.outbound_count}
            label="Messages today"
          />
          <UsageCard
            value={`$${((usage.credits_total_cents - usage.credits_used_cents) / 100).toFixed(2)}`}
            label="Credits remaining"
          />
          <UsageCard
            value={`$${(usage.credits_used_cents / 100).toFixed(2)}`}
            label="Credits used"
          />
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-950/10 dark:border-white/10 p-6 text-center">
          <Text>No usage data available yet.</Text>
        </div>
      )}

      <Divider soft />

      <div>
        <Subheading>Account</Subheading>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-zinc-950/10 dark:border-white/10 p-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Email</p>
            <p className="text-sm font-medium text-zinc-950 dark:text-white mt-1">{user?.email}</p>
          </div>
          <div className="rounded-lg border border-zinc-950/10 dark:border-white/10 p-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{user?.channel === "TELEGRAM" ? "Telegram" : "WhatsApp"}</p>
            <p className="text-sm font-medium text-zinc-950 dark:text-white mt-1">{user?.channel === "TELEGRAM" ? "Telegram" : user?.phone}</p>
          </div>
          <div className="rounded-lg border border-zinc-950/10 dark:border-white/10 p-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Subscription</p>
            <div className="mt-1">
              <Badge color={user?.subscription_status === "ACTIVE" ? "green" : "zinc"}>
                {user?.subscription_status || "None"}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, "zinc" | "amber" | "green" | "red"> = {
    NONE: "zinc",
    PROVISIONING: "amber",
    READY: "green",
    ERROR: "red",
  };

  return <Badge color={colors[status] || "zinc"}>{status}</Badge>;
}

function ServiceCard({
  icon,
  name,
  description,
  connected,
  connecting,
  onConnect,
  onDisconnect,
}: {
  icon: React.ReactNode;
  name: string;
  description: string;
  connected: { email: string; connected_at: string } | null | undefined;
  connecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-zinc-950/10 dark:border-white/10 p-4">
      <div className="flex items-center gap-4">
        <div className="flex size-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-950 dark:text-white">{name}</p>
          {connected ? (
            <p className="text-sm text-green-600 dark:text-green-400">{connected.email}</p>
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
          )}
        </div>
      </div>

      {connected ? (
        <Button plain onClick={onDisconnect}>
          Disconnect
        </Button>
      ) : (
        <Button outline onClick={onConnect} disabled={connecting}>
          {connecting ? "Connecting..." : "Connect"}
        </Button>
      )}
    </div>
  );
}

function UsageCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-lg border border-zinc-950/10 dark:border-white/10 p-6 text-center">
      <p className="text-3xl font-semibold text-zinc-950 dark:text-white">{value}</p>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
    </div>
  );
}

function ApiKeysSection({
  apiKeys,
  assistant,
  onRefresh,
  setError,
}: {
  apiKeys: ApiKeyResponse[];
  assistant: AssistantResponse | null;
  onRefresh: () => void;
  setError: (error: string | null) => void;
}) {
  const [savingProvider, setSavingProvider] = useState<string | null>(null);
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});

  const hasKey = (provider: string) => apiKeys.some((k) => k.provider === provider);

  async function handleSaveKey(provider: string) {
    const key = keyInputs[provider];
    if (!key || key.trim().length < 10) {
      setError("Please enter a valid API key");
      return;
    }

    try {
      setSavingProvider(provider);
      setError(null);
      await api.addApiKey(provider, key.trim());
      setKeyInputs((prev) => ({ ...prev, [provider]: "" }));
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to save ${provider} key`);
    } finally {
      setSavingProvider(null);
    }
  }

  async function handleDeleteKey(provider: string) {
    const providerInfo = API_KEY_PROVIDERS.find((p) => p.id === provider);
    if (!confirm(`Remove your ${providerInfo?.name} API key? Your assistant will use the shared key instead.`)) return;

    try {
      setSavingProvider(provider);
      setError(null);
      await api.deleteApiKey(provider);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to remove ${provider} key`);
    } finally {
      setSavingProvider(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <Heading>API Keys</Heading>
        <Text className="mt-2">
          Use your own API keys to avoid usage limits or use your existing accounts.
          {assistant?.status === "READY" && " Your assistant will be restarted when you add or remove keys."}
        </Text>
      </div>

      <Divider />

      <div className="space-y-4">
        {API_KEY_PROVIDERS.map((provider) => {
          const hasOwnKey = hasKey(provider.id);
          const isSaving = savingProvider === provider.id;

          return (
            <div
              key={provider.id}
              className="rounded-lg border border-zinc-950/10 dark:border-white/10 p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    <KeyIcon className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-950 dark:text-white">{provider.name}</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{provider.description}</p>
                  </div>
                </div>
                {hasOwnKey && (
                  <Badge color="green" className="flex items-center gap-1">
                    <CheckIcon className="size-3" />
                    Custom key
                  </Badge>
                )}
              </div>

              {hasOwnKey ? (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-950/5 dark:border-white/5">
                  <Text className="text-sm">Your API key is configured and encrypted.</Text>
                  <Button
                    plain
                    onClick={() => handleDeleteKey(provider.id)}
                    disabled={isSaving}
                  >
                    {isSaving ? "Removing..." : "Remove key"}
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2 mt-3">
                  <input
                    type="password"
                    placeholder={`Enter your ${provider.name} API key`}
                    value={keyInputs[provider.id] || ""}
                    onChange={(e) =>
                      setKeyInputs((prev) => ({ ...prev, [provider.id]: e.target.value }))
                    }
                    className="flex-1 rounded-lg border border-zinc-950/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm text-zinc-950 dark:text-white placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white"
                  />
                  <Button
                    color="dark"
                    onClick={() => handleSaveKey(provider.id)}
                    disabled={isSaving || !keyInputs[provider.id]}
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/50 p-4">
        <Text className="text-sm">
          <strong>Note:</strong> Your API keys are encrypted and stored securely. We never log or share your keys.
          When you add a custom key, your assistant will use it instead of the shared key for that provider.
        </Text>
      </div>
    </div>
  );
}

const MCP_TOOLS = [
  {
    id: "gmail",
    name: "Gmail",
    description: "Read, search, and send emails directly from your assistant",
    icon: EnvelopeIcon,
    status: "coming_soon" as const,
  },
  {
    id: "calendar",
    name: "Google Calendar",
    description: "View, create, and manage calendar events",
    icon: CalendarIcon,
    status: "coming_soon" as const,
  },
  {
    id: "drive",
    name: "Google Drive",
    description: "Access and manage files in your Google Drive",
    icon: FolderIcon,
    status: "coming_soon" as const,
  },
];

function ToolsSection({ userEmail }: { userEmail: string }) {
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [toolName, setToolName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmitRequest() {
    if (!description.trim()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/tool-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          toolName: toolName.trim(),
          description: description.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit request");
      }

      setSubmitSuccess(true);
      setToolName("");
      setDescription("");
      setTimeout(() => {
        setIsRequestOpen(false);
        setSubmitSuccess(false);
      }, 2000);
    } catch {
      setSubmitError("Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <Heading>Tools</Heading>
        <Text className="mt-2">
          Extend your assistant&apos;s capabilities by connecting external services. Tools let your assistant
          interact with apps like Gmail, Google Calendar, and more on your behalf.
        </Text>
      </div>

      <Divider />

      {/* How it works */}
      <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/50 p-6">
        <Subheading className="mb-3">How Tools Work</Subheading>
        <Text className="text-sm">
          Tools use the <strong>Model Context Protocol (MCP)</strong> to securely connect your assistant to external
          services. When you connect a tool, your assistant gains the ability to perform actions like reading emails,
          checking your calendar, or accessing files — all through natural conversation.
        </Text>
      </div>

      {/* Available Tools */}
      <div>
        <Subheading className="mb-4">Available Tools</Subheading>
        <div className="space-y-4">
          {MCP_TOOLS.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      </div>

      {/* Request a Tool */}
      <div className="rounded-lg border border-dashed border-zinc-950/20 dark:border-white/20 p-6 text-center">
        <LightBulbIcon className="size-8 mx-auto text-amber-500 dark:text-amber-400 mb-3" />
        <Text className="text-sm mb-4">
          <strong>Need a different tool?</strong>
          <br />
          Let us know what integrations would be most useful for you.
        </Text>
        <Button outline onClick={() => setIsRequestOpen(true)}>
          <PaperAirplaneIcon className="size-4" />
          Request a Tool
        </Button>
      </div>

      {/* Request Dialog */}
      <Dialog open={isRequestOpen} onClose={() => setIsRequestOpen(false)} size="md">
        <DialogTitle>Request a Tool</DialogTitle>
        <DialogDescription>
          Tell us what tool or integration you&apos;d like to see. We&apos;ll prioritize based on user requests.
        </DialogDescription>
        <DialogBody>
          {submitSuccess ? (
            <div className="text-center py-4">
              <CheckIcon className="size-12 mx-auto text-green-500 mb-3" />
              <Text className="font-medium text-green-600 dark:text-green-400">
                Request submitted! We&apos;ll review it soon.
              </Text>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-950 dark:text-white mb-1.5">
                  Tool Name (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Slack, Notion, Jira..."
                  value={toolName}
                  onChange={(e) => setToolName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-950/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm text-zinc-950 dark:text-white placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-950 dark:text-white mb-1.5">
                  What would you like it to do?
                </label>
                <textarea
                  placeholder="Describe the tool and how you'd use it with your assistant..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-zinc-950/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm text-zinc-950 dark:text-white placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white resize-none"
                />
              </div>
              {submitError && (
                <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>
              )}
            </div>
          )}
        </DialogBody>
        {!submitSuccess && (
          <DialogActions>
            <Button plain onClick={() => setIsRequestOpen(false)}>
              Cancel
            </Button>
            <Button
              color="dark"
              onClick={handleSubmitRequest}
              disabled={isSubmitting || !description.trim()}
            >
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogActions>
        )}
      </Dialog>
    </div>
  );
}

function ToolCard({ tool }: { tool: typeof MCP_TOOLS[number] }) {
  const Icon = tool.icon;
  const isComingSoon = tool.status === "coming_soon";

  return (
    <div className={`rounded-lg border border-zinc-950/10 dark:border-white/10 p-4 ${isComingSoon ? "opacity-75" : ""}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex size-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            <Icon className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-zinc-950 dark:text-white">{tool.name}</p>
              {isComingSoon && (
                <Badge color="amber" className="flex items-center gap-1">
                  <ClockIcon className="size-3" />
                  Coming Soon
                </Badge>
              )}
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{tool.description}</p>
          </div>
        </div>

        {isComingSoon ? (
          <Button outline disabled>
            Connect
          </Button>
        ) : (
          <Button outline>
            Connect
          </Button>
        )}
      </div>
    </div>
  );
}

function ModelButton({
  model,
  selected,
  disabled,
  onClick,
}: {
  model: typeof AVAILABLE_MODELS[number];
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const isComingSoon = model.comingSoon;
  const isDisabled = disabled || isComingSoon;

  return (
    <button
      onClick={isComingSoon ? undefined : onClick}
      disabled={isDisabled}
      className={`relative rounded-lg border p-4 text-left transition-all ${
        isComingSoon
          ? "border-zinc-950/5 dark:border-white/5 opacity-60 cursor-default"
          : selected
            ? "border-zinc-950 dark:border-white bg-zinc-50 dark:bg-zinc-800"
            : "border-zinc-950/10 dark:border-white/10 hover:border-zinc-950/30 dark:hover:border-white/30"
      } ${isDisabled && !isComingSoon ? "opacity-50 cursor-not-allowed" : !isComingSoon ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-950 dark:text-white">{model.name}</p>
        {isComingSoon && (
          <Badge color="amber" className="flex items-center gap-1 text-[10px]">
            <ClockIcon className="size-3" />
            Soon
          </Badge>
        )}
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{model.description}</p>
      {selected && !isComingSoon && (
        <div className="absolute top-2 right-2 size-2 rounded-full bg-green-500" />
      )}
    </button>
  );
}


// ─── Subscription Section ─────────────────────────────────────────────────

function SubscriptionSection() {
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSubscription();
  }, []);

  async function loadSubscription() {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getSubscription();
      setSubscription(data);
    } catch (err) {
      if (err instanceof Error && err.message.includes("404")) {
        setSubscription(null);
      } else {
        setError(err instanceof Error ? err.message : "Failed to load subscription");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    try {
      setCanceling(true);
      setError(null);
      await api.cancelSubscription();
      await loadSubscription();
      setCancelDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel subscription");
    } finally {
      setCanceling(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 dark:border-white" />
      </div>
    );
  }

  const isTrialing = subscription?.trial_end && new Date(subscription.trial_end) > new Date();

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const periodEndDate = subscription?.current_period_end
    ? formatDate(subscription.current_period_end)
    : null;

  return (
    <div className="space-y-8">
      <div>
        <Heading>Subscription</Heading>
        <Text className="mt-2">Manage your YourClaw subscription and billing.</Text>
      </div>

      <Divider />

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {!subscription ? (
        <div className="rounded-lg border border-zinc-950/10 dark:border-white/10 p-6 text-center">
          <CreditCardIcon className="mx-auto size-8 text-zinc-400 dark:text-zinc-600" />
          <p className="mt-3 text-sm font-medium text-zinc-950 dark:text-white">No active subscription</p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Subscribe to get your own AI assistant.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Plan Card */}
          <div className="rounded-lg border border-zinc-950/10 dark:border-white/10 p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <Subheading>{subscription.plan_name}</Subheading>
                <p className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-white">
                  {subscription.price}
                </p>
              </div>
              <SubscriptionBadge
                status={subscription.status}
                cancelAtPeriodEnd={subscription.cancel_at_period_end}
                isTrialing={!!isTrialing}
              />
            </div>

            <Divider soft />

            {/* Status Details */}
            <div className="mt-6 space-y-4">
              {isTrialing && (
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                    <SparklesIcon className="size-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-950 dark:text-white">Free Trial Active</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Your trial ends on {formatDate(subscription.trial_end!)}. After that, you&apos;ll be charged {subscription.price}.
                    </p>
                  </div>
                </div>
              )}

              {subscription.cancel_at_period_end ? (
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
                    <ClockIcon className="size-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-950 dark:text-white">Subscription Ending</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Your subscription will cancel on {periodEndDate}. You&apos;ll keep full access until then.
                    </p>
                  </div>
                </div>
              ) : subscription.status === "ACTIVE" && !isTrialing ? (
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
                    <CheckIcon className="size-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-950 dark:text-white">Active Subscription</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {periodEndDate ? `Next billing date: ${periodEndDate}` : "Your subscription is active."}
                    </p>
                  </div>
                </div>
              ) : null}

              {subscription.status === "PAST_DUE" && (
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
                    <XMarkIcon className="size-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-950 dark:text-white">Payment Failed</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Your last payment failed. Please update your payment method to continue service. Contact hello@yourclaw.dev for help.
                    </p>
                  </div>
                </div>
              )}

              {subscription.status === "CANCELED" && (
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
                    <XMarkIcon className="size-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-950 dark:text-white">Subscription Canceled</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Your subscription has been canceled. Your assistant has been stopped.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Cancel Action */}
            {subscription.status === "ACTIVE" && !subscription.cancel_at_period_end && (
              <div className="mt-6 pt-6 border-t border-zinc-950/5 dark:border-white/5">
                <button
                  onClick={() => setCancelDialogOpen(true)}
                  className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  Cancel subscription
                </button>
              </div>
            )}
          </div>

          {/* Credits Card */}
          <div className="rounded-lg border border-zinc-950/10 dark:border-white/10 p-6">
            <Subheading className="mb-4">API Credits</Subheading>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-semibold text-zinc-950 dark:text-white">
                  ${(subscription.credits_remaining_cents / 100).toFixed(2)}
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Remaining credits</p>
              </div>
              <SparklesIcon className="size-8 text-zinc-400 dark:text-zinc-600" />
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-4">
              Credits are used when your assistant uses our shared API keys.
              Add your own API keys to avoid credit usage.
            </p>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)}>
        <DialogTitle>Cancel Subscription?</DialogTitle>
        <DialogDescription>
          {periodEndDate
            ? `Your subscription will remain active until ${periodEndDate}. You'll keep full access to your assistant until then.`
            : "Your subscription will be canceled at the end of the current billing period."}
        </DialogDescription>
        <DialogBody>
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-4">
            <div className="flex gap-3">
              <ClockIcon className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                  No immediate changes
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Your assistant will continue working until the end of the billing period.
                  After that, your container will be stopped.
                </p>
              </div>
            </div>
          </div>
        </DialogBody>
        <DialogActions>
          <Button plain onClick={() => setCancelDialogOpen(false)}>
            Keep Subscription
          </Button>
          <Button
            color="red"
            onClick={handleCancel}
            disabled={canceling}
          >
            {canceling ? "Canceling..." : "Cancel Subscription"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

function SubscriptionBadge({
  status,
  cancelAtPeriodEnd,
  isTrialing,
}: {
  status: string;
  cancelAtPeriodEnd: boolean;
  isTrialing: boolean;
}) {
  if (isTrialing && status === "ACTIVE") {
    return <Badge color="emerald">Free Trial</Badge>;
  }
  if (cancelAtPeriodEnd) {
    return <Badge color="amber">Canceling</Badge>;
  }
  const colors: Record<string, "green" | "amber" | "red" | "zinc"> = {
    ACTIVE: "green",
    PAST_DUE: "amber",
    CANCELED: "red",
  };
  return <Badge color={colors[status] || "zinc"}>{status}</Badge>;
}
