"""Provisioning job worker.

Polls the provisioning_jobs table for PENDING jobs and executes them.
Creates Docker containers on the host server and updates assistant status.
"""

import asyncio
import logging
import uuid
from datetime import datetime

from app.config import settings
from app.database import db
from app.services.container_service import container_service
from app.services.encryption import encrypt

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("yourclaw.worker")


async def get_anthropic_key(user_id: str) -> str:
    """Get Anthropic API key for user (BYOK or shared).

    Args:
        user_id: User's UUID

    Returns:
        API key to use
    """
    from app.services.encryption import decrypt

    # Check for BYOK
    api_key_row = await db.select(
        "api_keys",
        filters={"user_id": user_id, "provider": "ANTHROPIC"},
        single=True,
    )

    if api_key_row:
        return decrypt(api_key_row["encrypted_key"])

    # Use shared key
    return settings.anthropic_api_key


async def get_user_integrations(user_id: str) -> dict[str, str]:
    """Get user's connected integrations with valid tokens.

    Args:
        user_id: User's UUID

    Returns:
        Dict of service -> access_token
    """
    from app.services.encryption import decrypt
    from app.routers.oauth import refresh_google_token, SERVICE_DB_NAMES
    from datetime import datetime, timedelta

    integrations = await db.select("user_integrations", filters={"user_id": user_id})

    if not integrations:
        return {}

    result = {}
    for integration in integrations:
        service = integration["service"]
        expires_at_str = integration["token_expires_at"]

        # Parse expiry time
        if expires_at_str:
            expires_at = datetime.fromisoformat(expires_at_str.replace("Z", "+00:00"))
        else:
            expires_at = datetime.utcnow()

        # Check if token is expired or expiring soon
        if expires_at < datetime.utcnow() + timedelta(minutes=5):
            # Find service key for refresh
            service_key = None
            for key, db_name in SERVICE_DB_NAMES.items():
                if db_name == service:
                    service_key = key
                    break

            if service_key:
                # Refresh token
                new_token = await refresh_google_token(user_id, service_key)
                if new_token:
                    result[service] = new_token
                    logger.info(f"Refreshed {service} token for user {user_id}")
                else:
                    logger.warning(f"Failed to refresh {service} token for user {user_id}")
        else:
            # Token is valid
            result[service] = decrypt(integration["access_token_encrypted"])

    return result


async def get_host_server() -> dict | None:
    """Get a host server with available capacity.

    Returns:
        Host server row or None
    """
    # For MVP, just get the first server with capacity
    servers = await db.select("host_servers")
    for server in servers:
        if server["current_containers"] < server["max_containers"]:
            return server
    return None


async def get_allocated_ports() -> list[int]:
    """Get list of already allocated ports.

    Returns:
        List of port numbers
    """
    assistants = await db.select("assistants", columns="port")
    return [a["port"] for a in assistants if a.get("port")]


async def send_ready_notification(user_id: str) -> None:
    """Send WhatsApp notification that assistant is ready.

    Args:
        user_id: User's UUID
    """
    from app.routers.webhooks import send_twilio_message

    phone_row = await db.select("user_phones", filters={"user_id": user_id}, single=True)
    if phone_row:
        await send_twilio_message(
            phone_row["phone_e164"],
            "Your YourClaw assistant is ready! Send me a message to get started."
        )


async def process_job(job: dict) -> None:
    """Process a single provisioning job.

    Args:
        job: Job row from database
    """
    job_id = job["id"]
    user_id = job["user_id"]
    attempts = job["attempts"] + 1

    logger.info(f"Processing job {job_id} for user {user_id} (attempt {attempts})")

    # Mark job as running
    await db.update(
        "provisioning_jobs",
        {"status": "RUNNING", "attempts": attempts, "updated_at": datetime.utcnow().isoformat()},
        {"id": job_id},
    )

    try:
        # Get host server
        host = await get_host_server()
        if not host:
            raise Exception("No host server available")

        # Allocate port
        existing_ports = await get_allocated_ports()
        port = await container_service.allocate_port(existing_ports)

        # Generate gateway token
        gateway_token = str(uuid.uuid4())

        # Get API key
        anthropic_key = await get_anthropic_key(user_id)

        # Get user integrations (Google Calendar, Gmail, Drive)
        integrations = await get_user_integrations(user_id)
        if integrations:
            logger.info(f"User {user_id} has integrations: {list(integrations.keys())}")

        # Create container
        container_id = await container_service.create_container(
            user_id=user_id,
            port=port,
            gateway_token=gateway_token,
            anthropic_api_key=anthropic_key,
            integrations=integrations,
        )

        # Wait for container to be ready
        healthy = await container_service.health_check(port, gateway_token)
        if not healthy:
            raise Exception("Container health check failed")

        # Update assistant record
        await db.update(
            "assistants",
            {
                "status": "READY",
                "container_id": container_id,
                "host_server_id": host["id"],
                "port": port,
                "gateway_token_encrypted": encrypt(gateway_token),
                "updated_at": datetime.utcnow().isoformat(),
            },
            {"user_id": user_id},
        )

        # Increment host container count
        await db.update(
            "host_servers",
            {"current_containers": host["current_containers"] + 1},
            {"id": host["id"]},
        )

        # Mark job completed
        await db.update(
            "provisioning_jobs",
            {"status": "COMPLETED", "updated_at": datetime.utcnow().isoformat()},
            {"id": job_id},
        )

        # Send notification
        await send_ready_notification(user_id)

        logger.info(f"Job {job_id} completed successfully")

    except Exception as e:
        logger.error(f"Job {job_id} failed: {e}")

        # Check if max attempts reached
        if attempts >= settings.worker_max_attempts:
            # Mark job as failed
            await db.update(
                "provisioning_jobs",
                {
                    "status": "FAILED",
                    "last_error": str(e),
                    "updated_at": datetime.utcnow().isoformat(),
                },
                {"id": job_id},
            )

            # Mark assistant as error
            await db.update(
                "assistants",
                {"status": "ERROR", "updated_at": datetime.utcnow().isoformat()},
                {"user_id": user_id},
            )

            # Cleanup failed container
            await container_service.stop_container(user_id)

            logger.error(f"Job {job_id} failed permanently after {attempts} attempts")
        else:
            # Reset to pending for retry
            await db.update(
                "provisioning_jobs",
                {
                    "status": "PENDING",
                    "last_error": str(e),
                    "updated_at": datetime.utcnow().isoformat(),
                },
                {"id": job_id},
            )
            logger.info(f"Job {job_id} will retry (attempt {attempts}/{settings.worker_max_attempts})")


async def cleanup_deleted_assistants() -> None:
    """Stop containers for assistants marked as NONE (deleted)."""
    assistants = await db.select("assistants", filters={"status": "NONE"})

    for assistant in assistants:
        if assistant.get("container_id"):
            user_id = assistant["user_id"]
            logger.info(f"Cleaning up container for deleted assistant {user_id}")

            await container_service.stop_container(user_id)

            # Clear container info
            await db.update(
                "assistants",
                {
                    "container_id": None,
                    "port": None,
                    "gateway_token_encrypted": None,
                    "updated_at": datetime.utcnow().isoformat(),
                },
                {"user_id": user_id},
            )

            # Decrement host container count if we know the host
            if assistant.get("host_server_id"):
                host = await db.select(
                    "host_servers",
                    filters={"id": assistant["host_server_id"]},
                    single=True,
                )
                if host and host["current_containers"] > 0:
                    await db.update(
                        "host_servers",
                        {"current_containers": host["current_containers"] - 1},
                        {"id": host["id"]},
                    )


async def worker_loop() -> None:
    """Main worker loop. Polls for jobs and processes them."""
    logger.info("Worker started")

    while True:
        try:
            # Get pending jobs (oldest first)
            jobs = await db.select("provisioning_jobs", filters={"status": "PENDING"})

            # Sort by created_at (oldest first)
            jobs = sorted(jobs, key=lambda j: j.get("created_at", ""))

            for job in jobs:
                await process_job(job)

            # Cleanup deleted assistants
            await cleanup_deleted_assistants()

        except Exception as e:
            logger.error(f"Worker error: {e}")

        # Wait before next poll
        await asyncio.sleep(settings.worker_poll_interval)


def main() -> None:
    """Entry point for worker."""
    asyncio.run(worker_loop())


if __name__ == "__main__":
    main()
