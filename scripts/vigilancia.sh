#!/usr/bin/env bash
set -uo pipefail
: "${API_URL:?}" "${WEB_URL:?}"
RETRIES=${RETRIES:-3}
WAIT=${WAIT:-20}
problems=()

for _ in $(seq 1 "$RETRIES"); do
  status=$(curl -s -o /tmp/health.json -w '%{http_code}' --max-time 20 "$API_URL/health")
  [ "$status" = 200 ] && break
  sleep "$WAIT"
done
if [ "$status" = 200 ]; then
  errors=$(jq -r '.serverErrors.lastHour // 0' /tmp/health.json 2>/dev/null || echo 0)
  if [ "${errors:-0}" -gt 0 ]; then
    last=$(jq -r '.serverErrors.lastAt' /tmp/health.json)
    problems+=("La API tuvo $errors errores 500 en la última hora (el último, $last).")
  fi
elif [ "$status" = 503 ]; then
  problems+=("La API responde, pero la base de datos no (503).")
else
  problems+=("La API no responde: /health devolvió $status.")
fi

for _ in $(seq 1 "$RETRIES"); do
  web=$(curl -s -o /tmp/web.html -w '%{http_code}' --max-time 20 "$WEB_URL/")
  [ "$web" = 200 ] && break
  sleep "$WAIT"
done
if [ "$web" != 200 ]; then
  problems+=("La web no carga: devolvió $web.")
elif ! grep -q 'id="root"' /tmp/web.html; then
  problems+=("La web responde, pero no es la aplicación.")
fi

[ ${#problems[@]} -eq 0 ] && { echo "Todo en orden."; exit 0; }
printf '%s\n' "${problems[@]}"
exit 1
