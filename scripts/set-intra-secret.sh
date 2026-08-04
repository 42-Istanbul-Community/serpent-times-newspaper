#!/usr/bin/env bash
#
# Push the current 42 client secret to the server.
# Usage:
#   ./scripts/set-intra-secret.sh <server-url> [client-secret]
#
# Examples:
#   ./scripts/set-intra-secret.sh http://localhost:5173/
#   ./scripts/set-intra-secret.sh https://serpenttimes.example s-s4t2ud-...

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

die() {
	echo "error: $*" >&2
	exit 1
}

usage() {
	echo "usage: $(basename "$0") <server-url> [client-secret]" >&2
	exit 2
}

[ $# -ge 1 ] && [ $# -le 2 ] || usage
command -v curl >/dev/null || die "curl is required"

SERVER_URL="${1%/}"
case "$SERVER_URL" in
	http://* | https://*) ;;
	*) die "server url must start with http:// or https:// (got '$1')" ;;
esac

# .env values may be quoted and may contain '=' - strip only the outer quotes.
read_env() {
	[ -f "$ENV_FILE" ] || return 1
	local value
	value="$(sed -n "s/^[[:space:]]*$1[[:space:]]*=//p" "$ENV_FILE" | tail -n 1)" || return 1
	value="${value%\"}" && value="${value#\"}"
	value="${value%\'}" && value="${value#\'}"
	[ -n "$value" ] || return 1
	printf '%s' "$value"
}

UPDATE_KEY="${INTRA_SECRET_UPDATE_KEY:-}"
if [ -z "$UPDATE_KEY" ]; then
	UPDATE_KEY="$(read_env INTRA_SECRET_UPDATE_KEY || true)"
fi
if [ -z "$UPDATE_KEY" ]; then
	read -rsp "INTRA_SECRET_UPDATE_KEY: " UPDATE_KEY
	echo
fi
[ -n "$UPDATE_KEY" ] || die "no update key - set INTRA_SECRET_UPDATE_KEY in .env or the environment"

if [ $# -eq 2 ]; then
	SECRET="$2"
else
	read -rsp "42 client secret: " SECRET
	echo
fi
[ -n "$SECRET" ] || die "empty client secret"

# hand-rolled JSON: the secret is opaque, so escape backslashes and quotes.
escaped="${SECRET//\\/\\\\}"
escaped="${escaped//\"/\\\"}"

echo "POST $SERVER_URL/api/intra-secret"
response="$(
	curl -sS -X POST "$SERVER_URL/api/intra-secret" \
		-H "Authorization: Bearer $UPDATE_KEY" \
		-H "Content-Type: application/json" \
		-d "{\"secret\":\"$escaped\"}" \
		-w $'\n%{http_code}'
)" || die "request failed - is the server running at $SERVER_URL ?"

status="${response##*$'\n'}"
body="${response%$'\n'*}"

case "$status" in
	200)
		echo "ok - secret stored, Intra login should work again"
		;;
	401)
		die "401 unauthorized - INTRA_SECRET_UPDATE_KEY doesn't match the server's"
		;;
	400)
		die "400 - the server says: ${body:-no details}"
		;;
	*)
		die "unexpected $status: ${body:-no body}"
		;;
esac
