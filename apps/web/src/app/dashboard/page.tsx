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
} from "@heroicons/react/20/solid";

type Section = "assistant" | "services" | "usage";

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [assistant, setAssistant] = useState<AssistantResponse | null>(null);
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectingService, setConnectingService] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<Section>("assistant");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [userData, assistantData, usageData, integrationsData] = await Promise.all([
        api.getMe(),
        api.getAssistant().catch(() => null),
        api.getUsage().catch(() => null),
        api.getIntegrations().catch(() => null),
      ]);

      setUser(userData);
      setAssistant(assistantData);
      setUsage(usageData);
      setIntegrations(integrationsData);

      if (!userData.phone) {
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
      await api.createAssistant();
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
            <span className="text-lg font-bold">YourClaw</span>
          </SidebarItem>
        </SidebarSection>
      </SidebarHeader>

      <SidebarBody>
        <SidebarSection>
          <SidebarItem current={activeSection === "assistant"} onClick={() => setActiveSection("assistant")}>
            <SparklesIcon />
            <SidebarLabel>Assistant</SidebarLabel>
          </SidebarItem>
          <SidebarItem current={activeSection === "services"} onClick={() => setActiveSection("services")}>
            <LinkIcon />
            <SidebarLabel>Connected Services</SidebarLabel>
          </SidebarItem>
          <SidebarItem current={activeSection === "usage"} onClick={() => setActiveSection("usage")}>
            <ChartBarIcon />
            <SidebarLabel>Usage</SidebarLabel>
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
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{user?.phone}</span>
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
            onCreateAssistant={handleCreateAssistant}
            onDeleteAssistant={handleDeleteAssistant}
            onRefresh={loadData}
          />
        )}

        {activeSection === "services" && (
          <ServicesSection
            integrations={integrations}
            connectingService={connectingService}
            onConnectService={handleConnectService}
            onDisconnectService={handleDisconnectService}
          />
        )}

        {activeSection === "usage" && <UsageSection usage={usage} user={user} />}
      </div>
    </SidebarLayout>
  );
}

function AssistantSection({
  user,
  assistant,
  onCreateAssistant,
  onDeleteAssistant,
  onRefresh,
}: {
  user: UserProfile | null;
  assistant: AssistantResponse | null;
  onCreateAssistant: () => void;
  onDeleteAssistant: () => void;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-8">
      <div>
        <Heading>Assistant</Heading>
        <Text className="mt-2">Manage your AI assistant on WhatsApp.</Text>
      </div>

      <Divider />

      <div className="rounded-lg border border-zinc-950/10 dark:border-white/10 p-6">
        <div className="flex items-center justify-between mb-6">
          <Subheading>Status</Subheading>
          <StatusBadge status={assistant?.status || "NONE"} />
        </div>

        <div className="mb-6">
          {assistant?.status === "READY" && (
            <Text>
              Your assistant is ready! Message your WhatsApp number to start chatting.
            </Text>
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
            <Text>Create your AI assistant to get started with WhatsApp automation.</Text>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          {(!assistant || assistant.status === "NONE" || assistant.status === "ERROR") && (
            <Button color="dark" onClick={onCreateAssistant}>
              <PlusIcon />
              {user?.subscription_status === "ACTIVE" ? "Create Assistant" : "Subscribe & Create Assistant"}
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
            <p className="text-sm text-zinc-500 dark:text-zinc-400">WhatsApp</p>
            <p className="text-sm font-medium text-zinc-950 dark:text-white mt-1">{user?.phone}</p>
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
