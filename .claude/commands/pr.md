---
description: Create a PR, request review from redaphid, and open in browser
allowed-tools: Bash
---

# Create Pull Request

Create a pull request for the current branch, request a review from @redaphid, and open it in the browser.

## Steps

1. Push the current branch to origin (with `-u` to set upstream tracking):
   ```fish
   git push -u origin (git branch --show-current)
   ```

2. Determine the base branch. Use `main` unless `$ARGUMENTS` specifies a different base.

3. Run `git log` and `git diff main...HEAD` to understand all the changes on this branch.

4. Create the PR using `gh pr create`:
   - Write a clear, concise title (under 70 chars)
   - Write a summary body with `## Summary` section describing the changes
   - Add a `## Test plan` section
   - Add the `🤖 Generated with [Claude Code](https://claude.com/claude-code)` footer
   - Request review from `redaphid` using `--reviewer redaphid`
   - Use a HEREDOC for the body to preserve formatting

5. Open the PR in the browser:
   ```fish
   gh pr view --web
   ```

6. Return the PR URL to the user.
