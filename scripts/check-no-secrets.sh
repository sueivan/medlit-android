#!/usr/bin/env bash
set -euo pipefail

if find . -type f \( -name '*.jks' -o -name '*.keystore' -o -name 'keystore.properties' \) -not -path './.git/*' | grep -q .; then
  echo 'Forbidden signing file found in repository' >&2
  exit 1
fi

if git grep -En 'ANDROID_(KEYSTORE|KEY)_PASSWORD=.+|BEGIN (RSA )?PRIVATE KEY' -- ':!docs/**'; then
  echo 'Potential secret found' >&2
  exit 1
fi

echo 'secret scan OK'
