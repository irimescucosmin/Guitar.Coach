#!/usr/bin/env bash
# Generates the certificate pnpm dev:https serves. Next's own --experimental-https
# only covers localhost, so lvh.me and the phone address would fail; this covers all
# three. Regenerates only when a name is missing, e.g. after the Mac changes network.
set -euo pipefail

cd "$(dirname "$0")/.."
cert="certificates/localhost.pem"
key="certificates/localhost-key.pem"

mkcert=$(command -v mkcert || true)
if [ -z "$mkcert" ]; then
  # The one next dev --experimental-https downloads, so no brew install is required.
  mkcert=$(ls -t "$HOME/Library/Caches/mkcert/mkcert-v"* 2>/dev/null | head -1 || true)
fi
if [ -z "$mkcert" ]; then
  echo "dev-cert: mkcert not found. Install it with: brew install mkcert" >&2
  exit 1
fi

# The leaf certificate needs no privileges; trusting the local CA does, and only
# mkcert -install can do it. Without it every browser still shows a warning, so say
# so on the way out whether or not the certificate itself had to be rebuilt.
warn_untrusted_ca() {
  if ! security find-certificate -c mkcert /Library/Keychains/System.keychain >/dev/null 2>&1; then
    echo ""
    echo "dev-cert: the local CA is not trusted yet. Run once, it asks for your password:"
    echo "  $mkcert -install"
  fi
}
trap warn_untrusted_ca EXIT

names=(localhost 127.0.0.1 ::1 lvh.me "*.lvh.me")
lan=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)
if [ -n "$lan" ]; then names+=("$lan"); fi

if [ -f "$cert" ] && [ -f "$key" ]; then
  # openssl writes ::1 expanded, as IP Address:0:0:0:0:0:0:0:1, so fold it back
  # before looking the names up or every run would think ::1 is missing.
  sans=$(openssl x509 -in "$cert" -noout -ext subjectAltName 2>/dev/null || true)
  sans=${sans//0:0:0:0:0:0:0:1/::1}
  missing=""
  for n in "${names[@]}"; do
    case "$sans" in *"$n"*) ;; *) missing="$n" ;; esac
  done
  if [ -z "$missing" ]; then
    echo "dev-cert: certificate already covers ${names[*]}"
    exit 0
  fi
  echo "dev-cert: $missing is missing from the certificate, regenerating"
fi

mkdir -p certificates
"$mkcert" -key-file "$key" -cert-file "$cert" "${names[@]}"
