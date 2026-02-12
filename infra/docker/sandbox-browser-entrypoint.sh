#!/usr/bin/env bash
# Entrypoint for the browser sandbox container.
# Starts Xvfb + Chromium with CDP + socat port forward + optional noVNC.
# Based on official openclaw sandbox-browser-entrypoint.sh.
set -euo pipefail

export DISPLAY=:1
export HOME=/tmp/openclaw-home
export XDG_CONFIG_HOME="${HOME}/.config"
export XDG_CACHE_HOME="${HOME}/.cache"

CDP_PORT="${OPENCLAW_BROWSER_CDP_PORT:-9222}"
VNC_PORT="${OPENCLAW_BROWSER_VNC_PORT:-5900}"
NOVNC_PORT="${OPENCLAW_BROWSER_NOVNC_PORT:-6080}"
ENABLE_NOVNC="${OPENCLAW_BROWSER_ENABLE_NOVNC:-1}"
HEADLESS="${OPENCLAW_BROWSER_HEADLESS:-0}"

mkdir -p "${HOME}" "${HOME}/.chrome" "${XDG_CONFIG_HOME}" "${XDG_CACHE_HOME}"

# Start virtual display
Xvfb :1 -screen 0 1280x800x24 -ac -nolisten tcp &

# Chromium args
if [[ "${HEADLESS}" == "1" ]]; then
    CHROME_ARGS=("--headless=new" "--disable-gpu")
else
    CHROME_ARGS=()
fi

# CDP binds to localhost internally, socat exposes it externally
if [[ "${CDP_PORT}" -ge 65535 ]]; then
    CHROME_CDP_PORT="$((CDP_PORT - 1))"
else
    CHROME_CDP_PORT="$((CDP_PORT + 1))"
fi

CHROME_ARGS+=(
    "--remote-debugging-address=127.0.0.1"
    "--remote-debugging-port=${CHROME_CDP_PORT}"
    "--user-data-dir=${HOME}/.chrome"
    "--no-first-run"
    "--no-default-browser-check"
    "--disable-dev-shm-usage"
    "--disable-background-networking"
    "--disable-features=TranslateUI"
    "--disable-breakpad"
    "--disable-crash-reporter"
    "--metrics-recording-only"
    "--no-sandbox"
)

chromium "${CHROME_ARGS[@]}" about:blank &

# Wait for Chromium CDP to be ready
for _ in $(seq 1 50); do
    if curl -sS --max-time 1 "http://127.0.0.1:${CHROME_CDP_PORT}/json/version" >/dev/null 2>&1; then
        break
    fi
    sleep 0.1
done

# Forward CDP port to all interfaces so other containers can reach it
socat \
    TCP-LISTEN:"${CDP_PORT}",fork,reuseaddr,bind=0.0.0.0 \
    TCP:127.0.0.1:"${CHROME_CDP_PORT}" &

# Optional: VNC + noVNC for visual debugging
if [[ "${ENABLE_NOVNC}" == "1" && "${HEADLESS}" != "1" ]]; then
    x11vnc -display :1 -rfbport "${VNC_PORT}" -shared -forever -nopw -localhost &
    websockify --web /usr/share/novnc/ "${NOVNC_PORT}" "localhost:${VNC_PORT}" &
fi

# Wait for any child process to exit
wait -n
