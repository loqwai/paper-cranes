---
description: Create a short link on 2cb.pw
allowed-tools: Bash
---

# Create Short Link

Create a short URL on 2cb.pw using the Cloudflare KV store directly via wrangler.

## Input

`$ARGUMENTS` contains the long URL to shorten, and optionally a custom slug.

Formats:
- `https://example.com/long/path` — auto-generate a short slug
- `https://example.com/long/path myslug` — use "myslug" as the short URL
- `myslug https://example.com/long/path` — also works (detect which is the URL)

## Steps

1. Parse `$ARGUMENTS` to extract the long URL and optional slug. The URL is whichever argument looks like a URL (contains `://` or `.`). The other argument (if present) is the slug.

2. If no slug was provided, generate a short random one (4-6 lowercase alphanumeric characters). Use:
   ```fish
   python3 -c "import random, string; print(''.join(random.choices(string.ascii_lowercase + string.digits, k=5)))"
   ```

3. Write the mapping to Cloudflare KV using wrangler from the url-shortener project directory:
   ```fish
   npx wrangler kv key put --namespace-id e239df04697f45d78631c29760c1a5b9 "$SLUG" "$LONG_URL"
   ```

4. Verify it works:
   ```fish
   npx wrangler kv key get --namespace-id e239df04697f45d78631c29760c1a5b9 "$SLUG"
   ```

5. Tell the user their short link: `https://2cb.pw/$SLUG` → `$LONG_URL`
