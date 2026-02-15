set -a && source .env && set +a

curl -X POST \
-H "Host: api.yourclaw.dev" \
-H "Authorization: Bearer $YOURCLAW_API_KEY" \
-H "Content-Type: application/json" \
http://142.132.244.217/provision \
-d '{
    "user_id": "test-user-1",
    "claw_id": "claw-1",
    "ai_gateway_key": "'"$AI_GATEWAY_API_KEY"'",
    "model": "openai/gpt-5.2-codex",
    "telegram_bot_token": "'"$TELEGRAM_BOT_TOKEN"'",
    "telegram_allow_from": ["'"$TELEGRAM_ALLOW_FROM"'"]
}'

# curl -X POST \
# -H "Host: api.yourclaw.dev" \
# -H "Authorization: Bearer $YOURCLAW_API_KEY" \
# -H "Content-Type: application/json" \
# http://142.132.244.217/deprovision \
# -d '{"user_id": "test-user-1", "claw_id": "claw-1"}'