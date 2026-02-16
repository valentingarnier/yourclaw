"""Supabase Data API client.

Uses Supabase REST API instead of direct Postgres connection.
All CRUD operations go through /rest/v1/ endpoints.
"""

import logging

import httpx

from app.config import settings

logger = logging.getLogger("yourclaw.database")


class SupabaseClient:
    """Async client for Supabase Data API."""

    def __init__(self) -> None:
        self.base_url = f"{settings.supabase_url}/rest/v1"
        self.headers = {
            "apikey": settings.supabase_service_role_key,
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }

    async def select(
        self,
        table: str,
        columns: str = "*",
        filters: dict | None = None,
        single: bool = False,
        order_by: str | None = None,
        order_desc: bool = False,
        limit: int | None = None,
    ) -> list[dict] | dict | None:
        """SELECT query.

        Args:
            table: Table name
            columns: Columns to select (default: *)
            filters: Dict of column=value filters (uses eq operator)
            single: If True, return single row or None instead of list
            order_by: Column to order by
            order_desc: If True, order descending (default: ascending)
            limit: Max rows to return

        Returns:
            List of rows, single row, or None
        """
        params = {"select": columns}
        if filters:
            for key, value in filters.items():
                params[key] = f"eq.{value}"

        if order_by:
            params["order"] = f"{order_by}.{'desc' if order_desc else 'asc'}"

        if limit:
            params["limit"] = str(limit)

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self.base_url}/{table}",
                headers=self.headers,
                params=params,
            )
            resp.raise_for_status()
            data = resp.json()

            if single:
                return data[0] if data else None
            return data

    async def insert(self, table: str, data: dict) -> dict:
        """INSERT a single row.

        Args:
            table: Table name
            data: Row data as dict

        Returns:
            Inserted row
        """
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}/{table}",
                headers=self.headers,
                json=data,
            )
            if resp.status_code >= 400:
                logger.error(f"Supabase INSERT {table} failed ({resp.status_code}): {resp.text}")
            resp.raise_for_status()
            result = resp.json()
            return result[0] if result else {}

    async def upsert(self, table: str, data: dict, on_conflict: str = "id") -> dict:
        """UPSERT (insert or update on conflict).

        Args:
            table: Table name
            data: Row data as dict
            on_conflict: Column(s) to check for conflict

        Returns:
            Upserted row
        """
        headers = {**self.headers, "Prefer": "return=representation,resolution=merge-duplicates"}
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}/{table}",
                headers=headers,
                params={"on_conflict": on_conflict},
                json=data,
            )
            resp.raise_for_status()
            result = resp.json()
            return result[0] if result else {}

    async def update(self, table: str, data: dict, filters: dict) -> list[dict]:
        """UPDATE rows matching filters.

        Args:
            table: Table name
            data: Fields to update
            filters: Dict of column=value filters

        Returns:
            Updated rows
        """
        params = {}
        for key, value in filters.items():
            params[key] = f"eq.{value}"

        async with httpx.AsyncClient() as client:
            resp = await client.patch(
                f"{self.base_url}/{table}",
                headers=self.headers,
                params=params,
                json=data,
            )
            resp.raise_for_status()
            return resp.json()

    async def delete(self, table: str, filters: dict) -> list[dict]:
        """DELETE rows matching filters.

        Args:
            table: Table name
            filters: Dict of column=value filters

        Returns:
            Deleted rows
        """
        params = {}
        for key, value in filters.items():
            params[key] = f"eq.{value}"

        async with httpx.AsyncClient() as client:
            resp = await client.delete(
                f"{self.base_url}/{table}",
                headers=self.headers,
                params=params,
            )
            resp.raise_for_status()
            return resp.json()


# Singleton instance
db = SupabaseClient()
