# Sazed Frontend — Backend Integration Plan

Reference mockup: `ui_reference.html` (repo root).
Backend: Sazed agent running at `http://localhost:8000` by default.

**Current state:** Static UI built. All content comes from `src/mock/data.ts`. No network calls.
**Goal:** Replace mock data with live Sazed API calls. Keep all visual components unchanged.

---

## Backend API Surface (Sazed)

All routes are prefixed from the root. Auth is disabled in local dev when `API_KEY` env var is not set.

```
POST   /chat                          — send message → { session_id, response }
GET    /conversations                 — list sessions → { conversations: Session[] }
GET    /conversations/{id}            — get messages → { session_id, messages, message_count }
POST   /conversations/{id}/process    — trigger fact extraction + summarization
GET    /memory                        — list facts → { facts: Fact[], count }
PUT    /memory                        — upsert fact
DELETE /memory/{id}                   — delete fact
GET    /health                        — public health check → { status, service }
```

**Request types:**
- `POST /chat` body: `{ session_id?: string, message: string }`
- `PUT /memory` body: `{ fact_type, key, value, confidence? }`

**Message object from `GET /conversations/{id}`:**
```
{ role: "user" | "assistant" | "tool", content: string | object[], timestamp: string }
```
Note: assistant messages may have `content` as an array of blocks (`{ type: "text", text }`, `{ type: "tool_use", name, input }`). The frontend should extract the `text` block and parse `tool_use` blocks into `ToolCall` objects.

---

## Environment Variables

Create `src/.env.local` (git-ignored):

```
VITE_SAZED_URL=http://localhost:8000
VITE_API_KEY=
```

`VITE_API_KEY` is empty in dev since Sazed has auth disabled by default locally. Provide the key if `API_KEY` is set in Sazed's `.env`.

---

## New Files to Create

```
src/
├── api/
│   ├── client.ts           ← base fetch wrapper (base URL + optional X-API-Key header)
│   ├── chat.ts             ← postMessage()
│   ├── conversations.ts    ← listConversations(), getConversation()
│   └── memory.ts           ← listMemory(), upsertMemory(), deleteMemory()
└── store/
    ├── chatStore.ts        ← sessionId, messages[], isStreaming, send(), newSession(), loadSession()
    ├── sessionStore.ts     ← sessions[], activeSessionId, loadSessions(), selectSession()
    └── uiStore.ts          ← historyOpen, toggleHistory()
```

---

## Files to Modify

| File | Change |
|---|---|
| `package.json` | Add `zustand` |
| `src/mock/data.ts` | Keep interfaces (`Message`, `Session`, `ToolCall`); remove or comment out mock constants |
| `src/App.tsx` | Replace `useState` toggles with store hooks; pass live data to children |
| `src/features/chat/ChatArea.tsx` | Read messages from `chatStore` instead of `MOCK_MESSAGES` |
| `src/features/chat/EmptyState.tsx` | Quick actions call `chatStore.send()` |
| `src/components/InputBar/InputBar.tsx` | Enter calls `chatStore.send()`; disable when `isStreaming` |
| `src/components/TopBar/TopBar.tsx` | StatusDot reflects real health state |
| `src/features/history/HistoryOverlay.tsx` | Read sessions from `sessionStore`; new-chat button calls `chatStore.newSession()` |
| `src/features/history/HistoryItem.tsx` | `active` prop driven by `sessionStore.activeSessionId`; click calls `sessionStore.selectSession()` |
| `src/features/history/HistorySearch.tsx` | Wire to local filter state in `HistoryOverlay` |
| `src/features/chat/Message.tsx` | Handle `content` as array of blocks (parse `tool_use` blocks) |

---

## Zustand Install

```bash
pnpm add zustand
```

---

## API Client (`src/api/client.ts`)

- Reads `import.meta.env.VITE_SAZED_URL` and `import.meta.env.VITE_API_KEY`.
- Adds `X-API-Key` header only when `VITE_API_KEY` is non-empty.
- Throws on non-2xx with the error detail from the response body.
- Exported as a base `apiFetch(path, options?)` function that all api modules use.

---

## API Modules

### `src/api/chat.ts`
```
postMessage(body: { session_id?: string; message: string })
  → POST /chat
  → returns { session_id: string; response: string }
```

### `src/api/conversations.ts`
```
listConversations()
  → GET /conversations
  → returns { conversations: RawSession[] }
  where RawSession = { session_id, message_count, last_activity }

getConversation(id: string)
  → GET /conversations/{id}
  → returns { session_id, messages: RawMessage[], message_count }
  where RawMessage = { role, content, timestamp }
```

### `src/api/memory.ts`
```
listMemory()            → GET  /memory
upsertMemory(fact)      → PUT  /memory
deleteMemory(id)        → DELETE /memory/{id}
```

---

## Stores

### `src/store/chatStore.ts`

```
State:
  sessionId: string | null
  messages: Message[]       ← uses the Message interface from mock/data.ts
  isStreaming: boolean

Actions:
  send(text: string)
    1. append { role: 'user', content: text } to messages
    2. set isStreaming = true
    3. call postMessage({ session_id: sessionId, message: text })
    4. set sessionId from response.session_id
    5. parse response.response into { role: 'assistant', content: response.response }
    6. append assistant message
    7. set isStreaming = false
    8. call sessionStore.loadSessions() to refresh the history list

  newSession()
    → set sessionId = null, messages = [], isStreaming = false
    → set sessionStore.activeSessionId = null

  loadSession(id: string)
    → call getConversation(id)
    → map raw messages to Message[] (extract text blocks, parse tool_use blocks)
    → set sessionId = id, messages = result
```

**Parsing raw assistant messages:**
An assistant message from `GET /conversations/{id}` may have `content` as a JSON array. Extract all `{ type: "text" }` blocks into the `content` string. Extract `{ type: "tool_use", name, input }` blocks and convert each to a `ToolCall` — map tool name to category using a static lookup table (see below).

### `src/store/sessionStore.ts`

```
State:
  sessions: Session[]         ← uses Session interface from mock/data.ts
  activeSessionId: string | null

Actions:
  loadSessions()
    → call listConversations()
    → map RawSession[] to Session[] (group by date bucket: Today/Yesterday/This Week/Older)
    → set sessions

  selectSession(id: string)
    → set activeSessionId = id
    → call chatStore.loadSession(id)
    → close history overlay (uiStore.historyOpen = false)
```

**Date grouping logic:**
Compare `last_activity` timestamp to today's date:
- Same day → "Today"
- Yesterday → "Yesterday"
- Within 7 days → "This Week"
- Else → "Older"

### `src/store/uiStore.ts`

```
State:
  historyOpen: boolean
  online: boolean

Actions:
  toggleHistory()
  setOnline(value: boolean)
```

---

## Tool Name → Category Mapping

Sazed's backend sends tool names like `get_today`, `create_task`, `search_emails`, etc. Map them to the frontend's `ToolCall` category for icon display:

```
calendar → get_today, get_events, check_availability, create_event, update_event, delete_event
tasks    → get_upcoming_tasks, get_task_lists, create_task, update_task, delete_task
email    → get_recent_emails, get_unread_emails, search_emails, get_email, draft_email
notify   → send_notification
kb       → search_knowledge_base
memory   → memory_update
```

Any unmapped tool name defaults to `tasks` category (neutral color). Store this as a constant in `src/api/chat.ts` or a shared `src/lib/toolMap.ts`.

---

## Component Changes (detailed)

### App.tsx
- Import `useChatStore`, `useSessionStore`, `useUiStore`.
- Replace `useState` for `historyOpen` with `uiStore.historyOpen` + `uiStore.toggleHistory`.
- On mount: call `uiStore.setOnline` by pinging `GET /health`. Poll every 30s.
- Replace `const [view] = useState<'empty' | 'chat'>('chat')` with:
  `const view = chatStore.messages.length === 0 ? 'empty' : 'chat'`
- Pass `online={uiStore.online}` to `<TopBar>`.

### InputBar
- Accept `onSend: (text: string) => void` and `disabled: boolean` props (passed from App).
- In App: `onSend={chatStore.send}` and `disabled={chatStore.isStreaming}`.
- Enter key calls `onSend(value)` then clears input.
- Apply `disabled` CSS class when disabled (already specced in PLAN).

### ChatArea
- Read messages from `chatStore.messages` (not `MOCK_MESSAGES`).
- When `chatStore.isStreaming`, append `<StreamingIndicator />` after the last message.
- Add scroll-to-bottom: `useEffect(() => bottomRef.current?.scrollIntoView(), [messages, isStreaming])`.

### Message
- The `content` field is always a `string` at this point (already parsed in the store).
- Tool calls are already a `ToolCall[]` — no change needed in the component itself.

### EmptyState
- Import `useChatStore`.
- Quick-action pill `onClick`: `chatStore.send(promptText)`.

### TopBar
- Accept `online?: boolean` prop. Pass to `<StatusDot online={online} />`.
- `StatusDot` currently always renders as online. Add `online` prop: if `false`, use `color: var(--pastel-red)` and no pulse animation.

### HistoryOverlay
- Read `sessions` and `activeSessionId` from `sessionStore`.
- On mount: call `sessionStore.loadSessions()`.
- `+` button: call `chatStore.newSession()` + close overlay.
- Pass `activeSessionId` to `HistoryItem` `active` prop.
- `HistorySearch`: filter `sessions` by substring match on `title` using local state.

### HistoryItem
- Accept `onClick?: () => void` prop.
- In `HistoryOverlay`: `onClick={() => sessionStore.selectSession(s.id)}`.

---

## Build Order

Run `pnpm dev` and verify at each step before continuing.

1. **Install Zustand** — `pnpm add zustand`. Confirm no type errors.
2. **`.env.local`** — Create with `VITE_SAZED_URL=http://localhost:8000` and empty `VITE_API_KEY`.
3. **`src/api/client.ts`** — Base fetch wrapper. No test yet.
4. **`src/api/chat.ts`** — `postMessage`. No test yet.
5. **`src/api/conversations.ts`** — `listConversations`, `getConversation`. No test yet.
6. **`src/api/memory.ts`** — `listMemory`, `upsertMemory`, `deleteMemory`. No test yet.
7. **`src/store/uiStore.ts`** — `historyOpen`, `online`, `toggleHistory`, `setOnline`.
8. **`src/store/chatStore.ts`** — Full implementation with `send`, `newSession`, `loadSession`.
9. **`src/store/sessionStore.ts`** — Full implementation with `loadSessions`, `selectSession`, date grouping.
10. **Wire `App.tsx`** — Replace useState with stores. Add health poll. Update view condition.
11. **Wire `InputBar`** — Accept `onSend` + `disabled` props; call `onSend` on Enter.
12. **Wire `ChatArea`** — Read from store, add `StreamingIndicator`, scroll-to-bottom.
13. **Wire `EmptyState`** — Quick actions call `chatStore.send()`.
14. **Wire `StatusDot`** — Accept `online` prop, update color when offline.
15. **Wire `HistoryOverlay`** — Load sessions on mount, new-chat button, select session.
16. **Wire `HistoryItem`** — Accept and call `onClick`.
17. **Wire `HistorySearch`** — Filter sessions by title substring in `HistoryOverlay`.
18. **Smoke test** — Start Sazed (`poetry run uvicorn app.main:app --reload`). Send a message. Verify it appears. Verify history loads. Verify selecting a session restores the conversation.

---

## CORS

Sazed's `allowed_origins` defaults to `["http://localhost:3000", "http://localhost:3001"]`. Port 3000 is already in the allowlist. No CORS changes needed for local dev.

---

## What Stays Unchanged

- All CSS, all component styles, all design tokens — visual output is identical.
- `src/mock/data.ts` TypeScript interfaces (`Message`, `Session`, `ToolCall`) — the stores use them.
- `src/features/chat/Message.tsx` component internals — content is already a string by the time it reaches the component.
- `src/features/chat/EventLine.tsx`, `TaskLine.tsx`, `ToolCard.tsx`, `ToolsRow.tsx` — no changes.

---

## What Is Not In Scope

- KB management view — out of scope; the KB icon button remains a stub.
- Memory management UI — not needed; memory is written by the agent automatically.
- Session processing trigger — `POST /conversations/{id}/process` is available but not surfaced in the UI yet.
- Streaming / WebSocket — Sazed has no streaming endpoint yet. `isStreaming` will show the indicator while the request is in-flight; response arrives in one shot.
- Mobile layout — desktop only.
