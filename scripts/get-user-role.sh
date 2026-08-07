#!/usr/bin/env bash
#
# Say who is what, one sentence per line:
#   mtaheri is a writer
#   kkaya is an editor
#   ahmet is a dev
#   zeynep is a dev in designer's clothing   <- a dev who set a role on
#       themselves; `set-user-role.sh <login> dev` clears it and gives 'dev' back
#   emre is just a reader
#
# Usage:
#   ./scripts/get-user-role.sh <server-url> [login]
#
# Devs who have never signed in have no db row yet and so are not listed.
# Add --json for the raw report (effective role + stored role + dev flag).
#
# Examples:
#   ./scripts/get-user-role.sh http://localhost:5173/
#   ./scripts/get-user-role.sh http://localhost:5173/ mtaheri

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

die() {
	echo "error: $*" >&2
	exit 1
}

usage() {
	echo "usage: $(basename "$0") <server-url> [login] [--json]" >&2
	exit 2
}

FORMAT="text"
ARGS=()
for arg in "$@"; do
	case "$arg" in
		--json) FORMAT="json" ;;
		*) ARGS+=("$arg") ;;
	esac
done
set -- ${ARGS[@]+"${ARGS[@]}"}

[ $# -ge 1 ] && [ $# -le 2 ] || usage
command -v curl >/dev/null || die "curl is required"

SERVER_URL="${1%/}"
case "$SERVER_URL" in
	http://* | https://*) ;;
	*) die "server url must start with http:// or https:// (got '$1')" ;;
esac

LOGIN="${2:-}"

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

query=()
[ -n "$LOGIN" ] && query+=(--data-urlencode "login=$LOGIN")
[ "$FORMAT" = "text" ] && query+=(--data-urlencode "format=text")

response="$(
	curl -sS -G "$SERVER_URL/api/user-role" ${query[@]+"${query[@]}"} \
		-H "Authorization: Bearer $KEY" \
		-w $'\n%{http_code}'
)" || die "request failed - is the server running at $SERVER_URL ?"

status="${response##*$'\n'}"
body="${response%$'\n'*}"
body="${body%$'\n'}"

case "$status" in
	200) printf '%s\n' "$body" ;;
	401) die "401 unauthorized - SCRIPT_KEY doesn't match the server's" ;;
	404) die "404 - the server says: ${body:-no details}" ;;
	*) die "unexpected $status: ${body:-no body}" ;;
esac
