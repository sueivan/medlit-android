#!/usr/bin/env bash
set -euo pipefail

if find . -type f \( \
  -name '*.jks' -o -name '*.keystore' -o -name '*.p12' -o -name '*.pfx' -o \
  -name '*.pem' -o -name '*.key' -o -name 'keystore.properties' \
\) -not -path './.git/*' | grep -q .; then
  echo 'Forbidden signing file found in repository' >&2
  exit 1
fi

if git grep --untracked -IqE 'ANDROID_(KEYSTORE|KEY)_PASSWORD=.+|BEGIN ([A-Z0-9]+ )?PRIVATE KEY|github_pat_[A-Za-z0-9_]+|gh[pousr]_[A-Za-z0-9]+' -- .; then
  echo 'Potential secret found' >&2
  exit 1
fi

echo 'secret scan OK'
