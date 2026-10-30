# Knowledge Vault

GitHub Pages version of the personal Knowledge Vault.

## Architecture
Library → Collection / Label → Equal-status Main Topics.

A collection such as `IPO` is only an organizational label. `QuickMart` and `Anthropic` inside it are both main topics with the same capabilities. There is no parent/child topic hierarchy.

## Files
- `index.html`
- `app.js`
- `styles.css`

## Storage
The app continues to use the existing browser storage key `knowledge_vault_v2`. On first launch after this upgrade, legacy V2 topic/subtopic data is migrated into collections and equal main topics in memory and saved back to the same key.

Images are resized/compressed in the browser before being stored.
