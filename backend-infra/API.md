# YourClaw Control Plane API

**Base URL:** `https://infra.api.yourclaw.dev`

**Swagger:** `https://infra.api.yourclaw.dev/docs`

**Auth:** All endpoints except `/health` require a Bearer token in the `Authorization` header.

```
Authorization: Bearer <API_KEY>
```

---

## GET /health

Health check. No auth required.

**Response:**
```json
{"status": "ok"}
```

---

## POST /provision

Provision a new OpenClaw instance for a user. Idempotent — re-provisioning replaces existing resources.

Creates: Deployment, Service, ConfigMap, Secret, PVC (10Gi persistent volume), CiliumNetworkPolicy.

**Request:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `user_id` | string | yes | | User identifier |
| `claw_id` | string | yes | | Claw instance identifier (unique per user) |
| `anthropic_key` | string | no | `""` | Anthropic API key |
| `openai_key` | string | no | `""` | OpenAI API key |
| `google_key` | string | no | `""` | Google API key |
| `ai_gateway_key` | string | no | `""` | Vercel AI Gateway key (routes to all providers) |
| `model` | string | no | `anthropic/claude-sonnet-4.5` | LLM model identifier |
| `system_instructions` | string \| null | no | Default personality | Custom system prompt (stored as SOUL.md) |
| `telegram_bot_token` | string | no | `""` | Telegram bot token for channel support (open DM policy) |

**Example:**
```bash
curl -X POST https://infra.api.yourclaw.dev/provision \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-abc",
    "claw_id": "claw-1",
    "ai_gateway_key": "vck_...",
    "model": "anthropic/claude-sonnet-4.5",
    "telegram_bot_token": "123456:ABC..."
  }'
```

**Response:**
```json
{
  "user_id": "user-abc",
  "claw_id": "claw-1",
  "service_name": "claw-user-abc-claw-1",
  "service_dns": "claw-user-abc-claw-1.default.svc.cluster.local",
  "gateway_port": 18789
}
```

The OpenClaw gateway is reachable within the cluster at `service_dns:gateway_port`. Use the `/v1/chat/completions` endpoint (OpenAI-compatible) to send messages.

---

## POST /deprovision

Tear down a single claw instance. Deletes all associated resources (Deployment, Service, ConfigMap, Secret, PVC, CiliumNetworkPolicy).

**Request:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `user_id` | string | yes | User identifier |
| `claw_id` | string | yes | Claw instance to destroy |

**Example:**
```bash
curl -X POST https://infra.api.yourclaw.dev/deprovision \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user-abc", "claw_id": "claw-1"}'
```

**Response:**
```json
{
  "status": "deprovisioned",
  "user_id": "user-abc",
  "claw_id": "claw-1"
}
```

---

## POST /deprovision-user

Tear down ALL claw instances for a user. Finds and deletes every resource labeled with the given `user_id`.

**Request:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `user_id` | string | yes | User whose claws should all be destroyed |

**Example:**
```bash
curl -X POST https://infra.api.yourclaw.dev/deprovision-user \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user-abc"}'
```

**Response:**
```json
{
  "status": "deprovisioned",
  "user_id": "user-abc"
}
```

---

## GET /claws

List all running claw instances.

**Response:**
```json
[
  {
    "user_id": "user-abc",
    "claw_id": "claw-1",
    "ready": true,
    "pod_phase": "Running",
    "node_name": "node-1",
    "pod_ip": "10.42.0.5"
  }
]
```

**Example:**
```bash
curl -s -X GET https://infra.api.yourclaw.dev/claws \
  -H "Authorization: Bearer $API_KEY" | python3 -m json.tool
```

---

## GET /claws/{user_id}/{claw_id}/logs

Get pod logs for a specific claw instance.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `tail` | int | `100` | Number of lines from the end of the logs |

**Response:**
```json
{
  "user_id": "user-abc",
  "claw_id": "claw-1",
  "logs": "..."
}
```

**Example:**
```bash
curl -s -X GET "https://infra.api.yourclaw.dev/claws/user-abc/claw-1/logs?tail=50" \
  -H "Authorization: Bearer $API_KEY" | python3 -m json.tool
```

---

## Resource Labeling

Every Kubernetes resource created by `/provision` is labeled with:

```yaml
app: yourclaw
component: claw
user-id: <user_id>
claw-id: <claw_id>
```

You can inspect resources with:
```bash
# All resources for a specific claw
kubectl get deploy,svc,cm,secret,pvc,ciliumnetworkpolicy -l claw-id=<claw_id>

# All resources for a user
kubectl get deploy,svc,cm,secret,pvc,ciliumnetworkpolicy -l user-id=<user_id>
```

## Errors

All errors return:
```json
{"detail": "Error message"}
```

| Status | Meaning |
|--------|---------|
| 401 | Invalid or missing Bearer token |
| 422 | Request validation error (missing/wrong fields) |
| 500 | Internal server error (check pod logs) |
