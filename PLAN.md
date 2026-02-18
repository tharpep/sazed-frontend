# Sazed Frontend — Backend Integration Plan

Reference mockup: `ui_reference.html` (repo root).
**Current state:** Static UI. All content comes from `src/mock/data.ts`. No network calls.
**Goal:** Wire the frontend to the Sazed agent backend. Replace mock data with live data.

---

## Which API?

**Only one backend: the Sazed agent** (`My-AI/sazed`).

The frontend talks directly to Sazed. That is the complete picture:

```
Browser (localhost:3000)  →  Sazed agent (localhost:8000)
```

Sazed itself talks to the api-gateway for tool execution (calendar, tasks, email, etc.) and to
Anthropic for LLM calls. The frontend never touches either of those — that is all internal to the
agent. The frontend only ever makes requests to Sazed.

---

## Sazed Routes (exact, verified from source)

Sazed runs on `http://localhost:8000` by default (`poetry run uvicorn app.main:app --reload`).

```
GET   /health                         public — no auth needed
                                      response: { status: "ok", service: "sazed" }

POST  /chat                           body:     { session_id?: string, message: string }
                                      response: { session_id: string, response: string }

GET   /conversations                  response: { conversations: RawSession[] }
GET   /conversations/{session_id}     response: { session_id, messages: RawMessage[], message_count }
POST  /conversations/{session_id}/process  — triggers fact extraction + summarization (not used in UI yet)

GET   /memory                         response: { facts: Fact[], count: number }
PUT   /memory                         body:     { fact_type, key, value, confidence?: float }
DELETE /memory/{id}                   response: { deleted: id }
```

**Auth:** Sazed's `API_KEY` env var is currently empty (see `sazed/.env`). Auth is disabled —
`verify_api_key()` returns immediately when `API_KEY` is empty. No `X-API-Key` header needed in dev.
If you add a key to Sazed's `.env` later, also set `VITE_API_KEY` in the frontend's `.env.local`.

**CORS:** Sazed's `allowed_origins` defaults to `["http://localhost:3000", "http://localhost:3001"]`.
Port 3000 is already in the list. No CORS changes needed.

---

## Exact Response Shapes (verified from source)

### `POST /chat`
`/chat/run_turn()` always returns `(session_id: str, response_text: str)`.
The response text is extracted from the last assistant message's `text` block (`_extract_text()`).
**The `response` field is always a plain string. No block parsing needed here.**

```json
{ "session_id": "uuid-string", "response": "plain text reply" }
```

### `GET /conversations`
`list_sessions()` queries the `sessions` table directly.

```json
{
  "conversations": [
    { "session_id": "uuid", "message_count": 4, "last_activity": "2026-02-17T08:42:00" }
  ]
}
```

### `GET /conversations/{id}`
`get_session()` fetches all messages for a session, JSON-decodes each row's `content`.

```json
{
  "session_id": "uuid",
  "message_count": 8,
  "messages": [
    { "role": "user",      "content": "plain string",  "timestamp": "..." },
    { "role": "assistant", "content": [                 "timestamp": "..." },
                             { "type": "tool_use", "id": "...", "name": "get_today", "input": {} },
                             { "type": "text", "text": "Here is your day:" }
                           ],
    { "role": "user",      "content": [                 "timestamp": "..." },
                             { "type": "tool_result", "tool_use_id": "...", "content": "..." }
                           ]
  ]
}
```

**Important:** User messages have `content` as a plain string OR an array of `tool_result` blocks.
Assistant messages have `content` as an array of `tool_use` and/or `text` blocks.
The `tool_result` (role=user) rows are internal plumbing — do not render them in the chat UI.

**Rendering rule for messages from `GET /conversations/{id}`:**
- `role === "user"` AND `content` is a string → render as a user message.
- `role === "user"` AND `content` is an array → skip entirely (tool results, not human text).
- `role === "assistant"` AND `content` is an array → extract `text` blocks (join with `\n`), extract `tool_use` blocks as `ToolCall[]`.
- `role === "tool"` → skip (does not appear in Sazed, but guard anyway).

---

## Tool Name → Category Mapping (verified from `tools.py`)

When loading history, `tool_use` blocks carry a `name` field (e.g. `"get_today"`). Map to
`ToolCall.category` for icon display. Keep this as a const in `src/lib/toolMap.ts`.

```
calendar  ←  get_today, get_events, check_availability, create_event, update_event, delete_event
tasks     ←  get_upcoming_tasks, get_task_lists, create_task, update_task, delete_task
email     ←  get_recent_emails, get_unread_emails, search_emails, get_email, draft_email
notify    ←  send_notification
kb        ←  search_knowledge_base
memory    ←  memory_update
```

Default fallback for any unmapped name: `tasks`.

Note: `POST /chat` responses never expose tool names to the frontend — the `response` field is
already the final text. Tool calls only appear when loading history via `GET /conversations/{id}`.

---

## New Files to Create

```
src/
├── lib/
│   └── toolMap.ts          ← tool name → category mapping constant + lookup function
├── api/
│   ├── client.ts           ← base apiFetch(path, options?)
│   ├── chat.ts             ← postMessage()
│   ├── conversations.ts    ← listConversations(), getConversation()
│   └── memory.ts           ← listMemory(), upsertMemory(), deleteMemory()
└── store/
    ├── chatStore.ts        ← sessionId, messages[], isStreaming, send(), newSession(), loadSession()
    ├── sessionStore.ts     ← sessions[], activeSessionId, loadSessions(), selectSession()
    └── uiStore.ts          ← historyOpen, online, toggleHistory(), setOnline()
```

---

## Files to Modify

| File | What changes |
|---|---|
| `package.json` | Add `zustand` |
| `src/mock/data.ts` | Keep `Message`, `Session`, `ToolCall` interfaces; delete the `MOCK_*` constants |
| `src/App.tsx` | Replace `useState` with store hooks; add health poll on mount |
| `src/features/chat/ChatArea.tsx` | Read from `chatStore.messages`; auto-scroll; show `StreamingIndicator` when `isStreaming` |
| `src/features/chat/EmptyState.tsx` | Quick-action pills call `chatStore.send()` |
| `src/components/InputBar/InputBar.tsx` | Enter calls `chatStore.send()`; disabled when `isStreaming` |
| `src/components/TopBar/TopBar.tsx` | Pass `online` prop to `StatusDot` |
| `src/components/TopBar/StatusDot.tsx` | Accept `online: boolean`; red + no pulse when offline |
| `src/features/history/HistoryOverlay.tsx` | Load sessions from `sessionStore`; new-chat and select wired |
| `src/features/history/HistoryItem.tsx` | Accept `onClick` prop |
| `src/features/history/HistorySearch.tsx` | Control filter state in `HistoryOverlay` |

No changes to: `Message.tsx`, `ToolCard.tsx`, `ToolsRow.tsx`, `EventLine.tsx`, `TaskLine.tsx`,
`StreamingIndicator.tsx`, `TrafficLights.tsx`, `IconButton.tsx`, all CSS files.

---

## Environment Variable

Create `src/.env.local` (already git-ignored via `.gitignore`):

```
VITE_SAZED_URL=http://localhost:8000
VITE_API_KEY=
```

Leave `VITE_API_KEY` empty — Sazed has auth disabled locally. If you set `API_KEY` in Sazed's
`.env`, put the same value in `VITE_API_KEY` here.

---

## API Client (`src/api/client.ts`)

```ts
const BASE = import.meta.env.VITE_SAZED_URL   // "http://localhost:8000"
const KEY  = import.meta.env.VITE_API_KEY      // "" in dev

async function apiFetch(path: string, options?: RequestInit): Promise<unknown>
  // Prepends BASE to path.
  // Adds "Content-Type: application/json" on POST/PUT.
  // Adds "X-API-Key: KEY" only when KEY is non-empty.
  // On non-2xx: throws Error with response body text as message.
  // Returns response.json().
```

All four API modules call `apiFetch`. They do not call `fetch` directly.

---

## API Modules

### `src/api/chat.ts`
```ts
postMessage(body: { session_id?: string; message: string })
  → POST /chat
  → returns { session_id: string; response: string }
```

### `src/api/conversations.ts`
```ts
listConversations()
  → GET /conversations
  → returns { conversations: { session_id: string; message_count: number; last_activity: string }[] }

getConversation(id: string)
  → GET /conversations/{id}
  → returns { session_id: string; messages: RawMessage[]; message_count: number }
  where RawMessage = { role: string; content: string | object[]; timestamp: string }
```

### `src/api/memory.ts`
```ts
listMemory()            → GET    /memory
upsertMemory(fact)      → PUT    /memory     body: { fact_type, key, value, confidence? }
deleteMemory(id)        → DELETE /memory/{id}
```

---

## Stores

### `src/store/uiStore.ts`
```ts
historyOpen: boolean    default false
online: boolean         default false (set by health poll in App)

toggleHistory()
setOnline(v: boolean)
```

### `src/store/chatStore.ts`
```ts
sessionId: string | null  default null
messages: Message[]       default []     (Message interface from mock/data.ts)
isStreaming: boolean       default false

send(text: string): Promise<void>
  1. append { role: "user", content: text, tools: undefined } to messages immediately (optimistic)
  2. isStreaming = true
  3. call postMessage({ session_id: sessionId ?? undefined, message: text })
  4. sessionId = response.session_id
  5. append { role: "assistant", content: response.response, tools: undefined }
  6. isStreaming = false
  7. call sessionStore.getState().loadSessions()   ← refresh sidebar list
  — on error: isStreaming = false; append error message as assistant turn

newSession(): void
  → sessionId = null, messages = [], isStreaming = false
  → sessionStore.getState().activeSessionId = null

loadSession(id: string): Promise<void>
  → call getConversation(id)
  → filter + map raw messages to Message[]:
      skip: role === "user" AND content is array (tool_result rows)
      user:      { role: "user", content: content as string }
      assistant: {
        role: "assistant",
        content: join all text blocks with "\n",
        tools: map tool_use blocks → ToolCall[] using toolMap.ts
      }
  → sessionId = id, messages = result
```

### `src/store/sessionStore.ts`
```ts
sessions: Session[]           default []    (Session interface from mock/data.ts)
activeSessionId: string | null default null

loadSessions(): Promise<void>
  → call listConversations()
  → map each item to Session:
      id:        session_id
      title:     "Session {session_id.slice(0,8)}"   ← Sazed has no title field yet
      time:      format last_activity as "h:mm AM/PM" if today, else "MMM D, h:mm AM/PM"
      dateGroup: bucket by last_activity vs today:
                   same calendar day  → "Today"
                   1 day ago          → "Yesterday"
                   2–7 days ago       → "This Week"
                   else               → "Older"
  → sessions = result (ordered by most recent first — API returns that order)

selectSession(id: string): void
  → activeSessionId = id
  → chatStore.getState().loadSession(id)
  → uiStore.getState().historyOpen = false
```

**Title note:** `GET /conversations` returns `session_id`, `message_count`, `last_activity`. There
is no session title in the current Sazed schema. For now, display the first 8 chars of the UUID as
the title (e.g. `"a3f2b1c0…"`). When session processing is wired, summaries will provide real titles.

---

## Component Changes (exact)

### `App.tsx`
```tsx
const historyOpen = useUiStore(s => s.historyOpen)
const toggleHistory = useUiStore(s => s.toggleHistory)
const setOnline = useUiStore(s => s.setOnline)
const messages = useChatStore(s => s.messages)
const view = messages.length === 0 ? "empty" : "chat"

// On mount: ping /health, set online, repeat every 30s
useEffect(() => {
  const check = () => apiFetch("/health").then(() => setOnline(true)).catch(() => setOnline(false))
  check()
  const id = setInterval(check, 30_000)
  return () => clearInterval(id)
}, [])
```
Pass `online={useUiStore(s => s.online)}` to `<TopBar>`.

### `InputBar`
- Accept props: `onSend: (text: string) => void`, `disabled: boolean`.
- Enter key: call `onSend(value)` then `setValue("")`.
- Apply `.disabled` CSS class when `disabled` — already specced in the existing CSS.
- In `App.tsx`: `<InputBar onSend={chatStore.send} disabled={chatStore.isStreaming} />`

### `ChatArea`
- Read `messages` and `isStreaming` from `chatStore`.
- Append `<StreamingIndicator />` as last child when `isStreaming`.
- Scroll ref: `const bottom = useRef<HTMLDivElement>(null)` + `useEffect(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), [messages, isStreaming])`.

### `EmptyState`
- `onClick` on each pill: `useChatStore(s => s.send)(promptText)`.

### `StatusDot`
- Accept `online: boolean` prop.
- When `false`: `background: var(--pastel-red)`, no animation.
- When `true`: existing pulse animation unchanged.

### `TopBar`
- Accept `online: boolean` prop. Pass to `<StatusDot online={online} />`.

### `HistoryOverlay`
- Remove `MOCK_SESSIONS` import.
- Read `sessions` and `activeSessionId` from `sessionStore`.
- `useEffect(() => loadSessions(), [])` on mount.
- `+` button: `chatStore.newSession()` then `setHistoryOpen(false)`.
- Filter: local `useState<string>("")` for search query; filter `sessions` by `title.toLowerCase().includes(q)`.
- Pass `active={s.id === activeSessionId}` and `onClick={() => selectSession(s.id)}` to each `HistoryItem`.

### `HistoryItem`
- Add `onClick?: () => void` prop. Add `onClick={onClick}` to the outer div.

### `HistorySearch`
- Accept `value: string` and `onChange: (v: string) => void` props.
- Controlled input (currently uncontrolled). Controlled by `HistoryOverlay`.

---

## Build Order

Start Sazed before step 10: `poetry run uvicorn app.main:app --reload` in `My-AI/sazed`.
Run `pnpm dev` and verify at each numbered step.

1. **`pnpm add zustand`** — install. Confirm no errors.
2. **`.env.local`** — create at repo root with `VITE_SAZED_URL` and empty `VITE_API_KEY`.
3. **`src/lib/toolMap.ts`** — tool name → category map + `getCategory(name)` function.
4. **`src/api/client.ts`** — `apiFetch`. No test yet.
5. **`src/api/chat.ts`** — `postMessage`.
6. **`src/api/conversations.ts`** — `listConversations`, `getConversation`.
7. **`src/api/memory.ts`** — `listMemory`, `upsertMemory`, `deleteMemory`.
8. **`src/store/uiStore.ts`** — `historyOpen`, `online`, actions.
9. **`src/store/chatStore.ts`** — full store with `send`, `newSession`, `loadSession`.
10. **`src/store/sessionStore.ts`** — full store with `loadSessions`, `selectSession`, date grouping.
11. **`src/mock/data.ts`** — delete `MOCK_MESSAGES`, `MOCK_SESSIONS`, `MOCK_EVENTS` constants. Keep interfaces.
12. **`StatusDot`** — add `online` prop.
13. **`TopBar`** — pass `online` prop through.
14. **`HistoryItem`** — add `onClick` prop.
15. **`HistorySearch`** — make controlled.
16. **`InputBar`** — wire `onSend` + `disabled`.
17. **`EmptyState`** — wire quick-action `onClick`.
18. **`ChatArea`** — wire store, streaming indicator, scroll-to-bottom.
19. **`HistoryOverlay`** — wire store, search filter, new-chat, select.
20. **`App.tsx`** — wire all stores, health poll, view condition.
21. **Smoke test:**
    - Send a message → appears in chat, response comes back.
    - Send a second message in the same session → `session_id` is preserved.
    - Open history → sessions appear with UUID titles.
    - Select a past session → messages load.
    - StatusDot is green when Sazed is running, red when stopped.

---

## What Is Not In Scope

- **`POST /conversations/{id}/process`** — available on Sazed but not surfaced in UI.
- **Memory management UI** — `GET/PUT/DELETE /memory` are implemented in the API module but
  the memory view (icon button in TopBar) remains a no-op stub.
- **Streaming** — Sazed has no streaming endpoint. `isStreaming` shows the indicator while the
  request is in-flight; the full response arrives in one HTTP response.
- **Session titles** — not in the current schema. Displayed as truncated UUID for now.
- **Mobile layout** — desktop only.
- **KB management** — not in scope.
