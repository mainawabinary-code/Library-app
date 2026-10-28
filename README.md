# Knowledge Vault V2.1

A GitHub Pages personal knowledge system for organizing topics, notes, concepts, screenshots, sources, connections, review items, and AI-ready prompts.

## V2.1 fixes
- Preserves the original `knowledge_vault_v2` browser storage key so existing local data remains available.
- Reads the previous `knowledge_vault_v2_edited` key as a fallback.
- Fixes mobile sidebar labels so navigation text remains visible.
- Fixes layout selector mismatches between the HTML and CSS.
- Makes text inputs, textareas, captions, and concept editors explicitly readable.
- Keeps multiple images in Notes and Concepts.
- Keeps editable Concepts and removes the one-press concept deletion control.
- Keeps Backup/Restore, Review Queue, Knowledge Graph, and AI Workspace.

## Storage
The app stores its working library in the browser's local storage. Export a JSON backup regularly. Large screenshot collections may eventually be better moved to IndexedDB/cloud object storage in a future version.

## GitHub Pages
Upload these four files to the repository root:
- `index.html`
- `styles.css`
- `app.js`
- `README.md`

GitHub Pages should deploy from the branch/folder containing the root `index.html`.

## Important
Do not clear the browser's site data if you want to keep the current local library. Keep a downloaded JSON backup before major upgrades.
