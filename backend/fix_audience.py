"""Fetch all users from Supabase and add them to Resend General audience."""

import os
import requests
import resend

RESEND_API_KEY = os.environ["RESEND_API_KEY"]
AUDIENCE_ID = "4cd8abe1-a7ff-4ad8-b45b-ab6b88900efb"

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://lmnitiavyljlkdouzlpr.supabase.co")
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]


def main():
    resend.api_key = RESEND_API_KEY

    # Fetch users from Supabase admin API
    print("Fetching users from Supabase...")
    resp = requests.get(
        f"{SUPABASE_URL}/auth/v1/admin/users",
        headers={
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        },
        params={"per_page": 100},
    )
    resp.raise_for_status()
    data = resp.json()
    users = data.get("users", data) if isinstance(data, dict) else data
    print(f"Found {len(users)} users")

    added = 0
    skipped = 0
    for user in users:
        email = user.get("email", "")
        metadata = user.get("user_metadata", {}) or {}
        full_name = metadata.get("full_name", "") or metadata.get("name", "") or ""
        parts = full_name.split(" ", 1)
        first_name = parts[0] if parts else ""
        last_name = parts[1] if len(parts) > 1 else ""

        if not email:
            skipped += 1
            continue

        try:
            resend.Contacts.create({
                "audience_id": AUDIENCE_ID,
                "email": email,
                "first_name": first_name,
                "last_name": last_name,
                "unsubscribed": False,
            })
            print(f"  Added: {email} ({first_name})")
            added += 1
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
                print(f"  Already exists: {email}")
            else:
                print(f"  Error for {email}: {e}")
            skipped += 1

    print(f"\nDone: {added} added, {skipped} skipped")

    # Verify count
    contacts = resend.Contacts.list(audience_id=AUDIENCE_ID)
    contact_list = contacts.get("data", []) if isinstance(contacts, dict) else getattr(contacts, "data", [])
    print(f"Contacts now in General audience: {len(contact_list)}")


if __name__ == "__main__":
    main()
