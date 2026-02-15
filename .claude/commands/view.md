---
description: Open the Cloudflare Pages preview for the current branch
allowed-tools: Bash
---

# View Branch Preview

Open the Cloudflare Pages preview URL for the current branch in the browser.

## Steps

1. Get the current branch name and construct the preview URL:
   ```fish
   set branch (git branch --show-current)
   open "https://$branch.paper-cranes.pages.dev/list"
   ```

2. Tell the user the URL that was opened.
