#!/usr/bin/env bash
set -euo pipefail
cd "$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
for cmd in gh git node npm curl; do
  command -v "$cmd" >/dev/null || { printf 'Required command is missing: %s\n' "$cmd" >&2; exit 1; }
done
gh auth status --hostname github.com
account="$(gh api user --jq .login)"
if [ "$account" != "SystemH4rd" ]; then
  printf 'Expected GitHub account SystemH4rd; active account is %s. Switch accounts first.\n' "$account" >&2
  exit 1
fi
repo="$account/hexharbor"
npm test
npm run check
if gh repo view "$repo" --json name --jq .name >/dev/null 2>&1; then
  printf 'Repository %s already exists. No existing repository was changed.\n' "$repo" >&2
  printf 'Use that repository only after confirming its ownership and contents.\n' >&2
  exit 1
fi
if [ ! -d .git ]; then git init -b main; fi
if [ "$(git branch --show-current)" != main ]; then
  printf 'This directory must use branch main. No remote changes were made.\n' >&2
  exit 1
fi
if git remote get-url origin >/dev/null 2>&1; then
  printf 'An origin remote already exists. No remote changes were made.\n' >&2
  exit 1
fi
if ! git config user.name >/dev/null; then git config user.name "$account"; fi
if ! git config user.email >/dev/null; then
  account_id="$(gh api user --jq .id)"
  git config user.email "$account_id+$account@users.noreply.github.com"
fi
git add .gitignore package.json docs README.md START_HERE.md ARCHITECTURE.md ACCEPTANCE.md LICENSE scripts tests .github
if ! git diff --cached --quiet; then git commit -m "Build checked HexHarbor static demo"; fi
gh auth setup-git --hostname github.com
gh repo create "$repo" --public --description "HexHarbor cyberpunk OSINT workspace — synthetic static demo" --source . --remote origin --push
gh api --method POST "repos/$repo/pages" -f build_type=workflow >/dev/null
gh workflow run pages.yml --repo "$repo" --ref main
run_id=""
for attempt in $(seq 1 20); do
  run_id="$(gh run list --repo "$repo" --workflow pages.yml --event workflow_dispatch --branch main --limit 1 --json databaseId --jq '.[0].databaseId // empty')"
  if [ -n "$run_id" ]; then break; fi
  sleep 3
done
if [ -z "$run_id" ]; then
  printf 'Repository was created; workflow has not appeared yet. Check GitHub Actions.\n' >&2
  exit 1
fi
gh run watch "$run_id" --repo "$repo" --exit-status
gh api --method PUT "repos/$repo/pages" -F https_enforced=true >/dev/null
site_url="$(gh api "repos/$repo/pages" --jq .html_url)"
case "$site_url" in
  https://*) ;;
  *) printf 'Unexpected non-HTTPS Pages URL. Check Pages settings.\n' >&2; exit 1 ;;
esac
curl --fail --silent --show-error --location --retry 10 --retry-delay 3 --retry-all-errors --max-time 15 --output /dev/null "$site_url"
printf '\nPublished: %s\nCommit: %s\n' "$site_url" "$(git rev-parse HEAD)"
printf 'Verify the demo navigation and mobile layout at the live URL.\n'

