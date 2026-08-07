#!/usr/bin/env bash
#
# Change a user's role, for devs who want to see the app as someone else.
# Usage:
#   ./scripts/set-user-role.sh <server-url> <login> <role>
#
# Roles: dev, admin, editor, writer, designer, user
#   'dev' clears the override and hands the role back to INTRA_DEV_IDS.
#
# Examples:
#   ./scripts/set-user-role.sh http://localhost:5173/ mtaheri writer
#   ./scripts/set-user-role.sh http://localhost:5173/ mtaheri dev

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
ROLES="dev admin editor writer designer user"

die() {
	echo "error: $*" >&2
	exit 1
}

usage() {
	echo "usage: $(basename "$0") <server-url> <login> <role>" >&2
	echo "roles: ${ROLES// /, }" >&2
	exit 2
}

[ $# -eq 3 ] || usage
command -v curl >/dev/null || die "curl is required"

SERVER_URL="${1%/}"
case "$SERVER_URL" in
	http://* | https://*) ;;
	*) die "server url must start with http:// or https:// (got '$1')" ;;
esac

LOGIN="$2"
ROLE="$3"
case " $ROLES " in
	*" $ROLE "*) ;;
	*) die "unknown role '$ROLE' - pick one of: ${ROLES// /, }" ;;
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

KEY="${SCRIPT_KEY:-}"
if [ -z "$KEY" ]; then
	KEY="$(read_env SCRIPT_KEY || true)"
fi
if [ -z "$KEY" ]; then
	read -rsp "SCRIPT_KEY: " KEY
	echo
fi
[ -n "$KEY" ] || die "no key - set SCRIPT_KEY in .env or the environment"

echo "POST $SERVER_URL/api/user-role  ($LOGIN -> $ROLE)"
response="$(
	curl -sS -X POST "$SERVER_URL/api/user-role" \
		-H "Authorization: Bearer $KEY" \
		-H "Content-Type: application/json" \
		-d "{\"login\":\"$LOGIN\",\"role\":\"$ROLE\"}" \
		-w $'\n%{http_code}'
)" || die "request failed - is the server running at $SERVER_URL ?"

status="${response##*$'\n'}"
body="${response%$'\n'*}"

case "$status" in
	200)
		echo "ok - $LOGIN is now '$ROLE'"
		;;
	401)
		die "401 unauthorized - SCRIPT_KEY doesn't match the server's"
		;;
	404)
		die "404 - the server says: ${body:-no details}"
		;;
	400)
		die "400 - the server says: ${body:-no details}"
		;;
	*)
		die "unexpected $status: ${body:-no body}"
		;;
esac
