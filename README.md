# Knowledge Vault V2

A GitHub Pages-friendly personal knowledge database.

## V2 additions

- Visual topic dashboard
- Notes + screenshot + source + concept storage
- Topic-to-topic connections
- Interactive knowledge graph
- Search across notes/concepts/topics
- Recent and favorites views
- AI Workspace that packages your library into prompts
- Six AI workflows: explain, connect, gaps, quiz, chapter, compare
- Markdown chapter export
- JSON backup/restore
- Print-friendly architecture for future PDF/DOCX generation

## GitHub Pages

Upload `index.html`, `styles.css`, and `app.js` to a repository, then enable GitHub Pages from the `main` branch/root.

## Important V2 architecture decision

The static GitHub version does NOT put an OpenAI API key in browser code. The AI Workspace generates clean prompts/context that can be copied to ChatGPT.

For a real integrated AI backend, the next version should use a server-side function (for example Cloudflare Workers, Vercel Functions, or Supabase Edge Functions) so the API key remains private.

## Recommended V3

- IndexedDB for much larger screenshot storage
- Cloud sync + login
- OCR from screenshots
- AI-generated summaries and concept extraction
- Automatic linking between related topics
- PDF/DOCX book generation
- "Send to ChatGPT" integration
- Version history
- Tags and collections
- Timeline of when each concept was learned
- Full-text + semantic search
