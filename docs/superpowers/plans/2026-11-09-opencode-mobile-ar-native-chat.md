# OpenCode Mobile AR (Phase 2 — Native Chat UI) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and ship a native mobile chat engine (Vue 3 + Pinia + OpenCode v2 REST/SSE API) as the default session interface in OpenCode Mobile AR, with real-time streaming, collapsible tool cards, interactive permission prompts, isolated LTR code blocks, and a seamless toggle to full WebView.

**Architecture:** Connect to OpenCode v2 HTTP endpoints with Basic Auth for session management and prompts; stream tokens, status, tool calls, and permission requests in real-time via Server-Sent Events (`/api/event`); manage state in a dedicated Pinia `chatStore`; render messages with safe Markdown, syntax highlighting, and isolated LTR code blocks; and preserve full Arabic/RTL support across all chat components.

**Tech Stack:** Vue 3, TypeScript, Pinia, Tailwind CSS 4, `markdown-it`, Capacitor 8, Vitest + jsdom.

**Spec:** `docs/superpowers/specs/2026-11-09-opencode-mobile-ar-native-chat.md`

## Global Constraints

- App name is exactly `OpenCode Mobile AR`; app id is `com.opencode.mobile.ar`; version is `1.3.0-ar.1`.
- All user-facing strings must resolve through `t(key)` and be translated in both `en-US` and `ar`.
- `catalogKeys('ar')` must exactly match `catalogKeys('en-US')`.
- All code blocks, terminal outputs, file paths, and URLs must be strictly isolated with `dir="ltr"` and `text-align: left`.
- Arabic copy must use Modern Standard Arabic (فصحى مبسطة) and preserve brand names (`OpenCode`, `Pinia`, `GitHub`, `Tailscale`, `WebView`, `bash`).
- The Native Chat UI must be the default view on connect, while the existing `InAppBrowser` WebView must remain available via a single-tap action in the header and drawer.
- Zero TypeScript errors (`vue-tsc --noEmit`) and all Vitest suites must pass after every task.

## Review Focus

1. **SSE connection drop & auto-reconnect:** When network drops during streaming, the SSE parser must reconnect with exponential backoff and reconcile missed messages from `GET /api/session/{id}/message`.
2. **Permission request blocking:** When a tool requires approval (`permission.request`), an interactive card must appear immediately, and clicking Allow/Deny must send `POST /api/session/{id}/permission/{req}/reply` to unblock the agent.
3. **Interrupting running stream:** Tapping Stop/Interrupt during active generation must call `POST /api/session/{id}/interrupt` and instantly set the composer and status back to `idle`.
4. **LTR isolation of code inside RTL chat:** In Arabic mode (`dir="rtl"`), code blocks inside assistant bubbles must not invert brackets, indentations, or operators.
5. **Memory & DOM leaks on huge tool outputs:** Large terminal or diff outputs must be collapsed by default with clean clipping so mobile webview memory stays under control.

---

### Task 1: Chat Types, Dependencies & OpenCode v2 REST Client

**Files:**
- Modify: `package.json`
- Create: `src/types/chat.ts`
- Create: `src/services/opencode/chatClient.ts`
- Test: `src/tests/chatClient.test.ts`

**Interfaces:**
- Consumes: `ServerProfile` from `src/types/index.ts`, `serverStore.getPassword(id)`.
- Produces:
  - Types in `src/types/chat.ts`: `ChatMessage`, `MessageRole`, `ToolCall`, `PermissionRequest`, `SessionInfo`, `OpenCodeEvent`.
  - Class/Functions in `src/services/opencode/chatClient.ts`:
    - `fetchSessions(baseUrl, auth): Promise<SessionInfo[]>`
    - `createSession(baseUrl, auth, title?): Promise<SessionInfo>`
    - `fetchSessionMessages(baseUrl, auth, sessionId): Promise<ChatMessage[]>`
    - `sendPrompt(baseUrl, auth, sessionId, prompt, model?, agent?): Promise<void>`
    - `interruptSession(baseUrl, auth, sessionId): Promise<void>`
    - `replyPermission(baseUrl, auth, sessionId, requestId, decision): Promise<void>`
    - `fetchAgents(baseUrl, auth): Promise<string[]>`
    - `fetchModels(baseUrl, auth): Promise<string[]>`

- [ ] **Step 1: Install markdown-it dependency**

```bash
npm install markdown-it
npm install -D @types/markdown-it
```

- [ ] **Step 2: Define chat types in `src/types/chat.ts`**

Define `MessageRole`, `ToolCall`, `PermissionRequest`, `ChatMessage`, `SessionInfo`, and `OpenCodeEvent` matching the spec §4.1.

- [ ] **Step 3: Write the failing tests in `src/tests/chatClient.test.ts`**

Test REST methods: `fetchSessions`, `createSession`, `fetchSessionMessages`, `sendPrompt`, `interruptSession`, and `replyPermission` with mocked `fetch`.

- [ ] **Step 4: Run the test to confirm it fails**

Run: `node node_modules/vitest/vitest.mjs run src/tests/chatClient.test.ts`
Expected: FAIL (module does not exist).

- [ ] **Step 5: Implement `src/services/opencode/chatClient.ts`**

Implement the typed REST operations with Basic Auth headers and JSON parsing.

- [ ] **Step 6: Run tests and type-check**

Run: `node node_modules/vitest/vitest.mjs run src/tests/chatClient.test.ts && node node_modules/vue-tsc/bin/vue-tsc.js --noEmit`
Expected: PASS and clean typecheck.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/types/chat.ts src/services/opencode/chatClient.ts src/tests/chatClient.test.ts
git commit -m "feat(chat): add chat types and OpenCode v2 REST client"
```

---

### Task 2: Server-Sent Events (SSE) Stream Parser & Reconnection

**Files:**
- Modify: `src/services/opencode/chatClient.ts`
- Test: `src/tests/chatEvents.test.ts`

**Interfaces:**
- Consumes: `OpenCodeEvent` from `src/types/chat.ts`.
- Produces:
  - `parseSseChunk(chunk: string): OpenCodeEvent[]`
  - `connectSseStream(baseUrl: string, auth: { username: string; password?: string }, onEvent: (event: OpenCodeEvent) => void, onError: (err: Error) => void): () => void` (returns abort/cleanup function).

- [ ] **Step 1: Write the failing tests in `src/tests/chatEvents.test.ts`**

Test SSE line parsing (`data: {...}`, `event: ...`), multi-chunk buffering, event classification (`session.message.delta`, `session.tool.start`, `session.tool.finish`, `session.permission.request`, `session.status`), and error/close handling.

- [ ] **Step 2: Run test to confirm it fails**

Run: `node node_modules/vitest/vitest.mjs run src/tests/chatEvents.test.ts`
Expected: FAIL with "parseSseChunk is not defined".

- [ ] **Step 3: Implement SSE chunk parser and stream connection in `src/services/opencode/chatClient.ts`**

Use `fetch` with `ReadableStream` reader (standard in modern web/Capacitor) to parse SSE lines into typed `OpenCodeEvent`s.

- [ ] **Step 4: Run tests**

Run: `node node_modules/vitest/vitest.mjs run src/tests/chatEvents.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/opencode/chatClient.ts src/tests/chatEvents.test.ts
git commit -m "feat(chat): add SSE event parser and real-time streaming connection"
```

---

### Task 3: Pinia Chat Store (`chatStore.ts`)

**Files:**
- Create: `src/stores/chatStore.ts`
- Test: `src/tests/chatStore.test.ts`

**Interfaces:**
- Consumes: REST and SSE functions from `src/services/opencode/chatClient.ts`, `useServerStore`.
- Produces:
  - `useChatStore()`:
    - State: `currentSessionId`, `sessions`, `messages`, `streamingStatus`, `activeModel`, `activeAgent`, `availableModels`, `availableAgents`, `pendingPermissions`.
    - Actions: `initForServer(serverId)`, `loadSessions()`, `selectSession(sessionId)`, `newSession(title?)`, `sendMessage(prompt)`, `interrupt()`, `respondPermission(requestId, allow)`, `cleanup()`.

- [ ] **Step 1: Write the failing tests in `src/tests/chatStore.test.ts`**

Test:
- Store initialization and loading sessions.
- Adding user message immediately on `sendMessage`.
- Appending streaming token deltas to assistant message.
- Creating and updating tool call entries on `session.tool.start` / `finish`.
- Adding pending permission and resolving it on `respondPermission`.
- Calling interrupt on active generation.

- [ ] **Step 2: Run test to confirm it fails**

Run: `node node_modules/vitest/vitest.mjs run src/tests/chatStore.test.ts`
Expected: FAIL (store does not exist).

- [ ] **Step 3: Implement `src/stores/chatStore.ts`**

Implement Pinia store tying together REST and SSE events with reactive state updates.

- [ ] **Step 4: Run tests**

Run: `node node_modules/vitest/vitest.mjs run src/tests/chatStore.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stores/chatStore.ts src/tests/chatStore.test.ts
git commit -m "feat(chat): implement Pinia chatStore for session and message state"
```

---

### Task 4: Markdown Renderer & Isolated LTR Code Blocks

**Files:**
- Create: `src/components/chat/ChatMarkdown.vue`
- Test: `src/tests/chatMarkdown.test.ts`

**Interfaces:**
- Consumes: `markdown-it`, `t` from `src/i18n`.
- Produces:
  - `<ChatMarkdown :content="markdownText" />`
  - Renders sanitized HTML, headers, lists, blockquotes, tables.
  - Wraps all `<pre><code>` blocks in a container with `dir="ltr"` and `text-align: left`.
  - Adds a top bar to each code block showing the language name and a click-to-copy button.

- [ ] **Step 1: Write the failing tests in `src/tests/chatMarkdown.test.ts`**

Test:
- Basic markdown rendering (bold, italics, lists, links).
- Code blocks carry `dir="ltr"` container.
- Code blocks include copy button with `aria-label`.
- Script tags and malicious HTML are escaped/sanitized.

- [ ] **Step 2: Run test to confirm it fails**

Run: `node node_modules/vitest/vitest.mjs run src/tests/chatMarkdown.test.ts`
Expected: FAIL (component does not exist).

- [ ] **Step 3: Implement `src/components/chat/ChatMarkdown.vue`**

Configure `markdown-it` with custom fence renderer for code block headers and copy action.

- [ ] **Step 4: Run tests**

Run: `node node_modules/vitest/vitest.mjs run src/tests/chatMarkdown.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/chat/ChatMarkdown.vue src/tests/chatMarkdown.test.ts
git commit -m "feat(chat): add ChatMarkdown with LTR code block isolation and copy action"
```

---

### Task 5: Interactive Tool Cards & Permission Dialog

**Files:**
- Create: `src/components/chat/ChatToolCallCard.vue`
- Create: `src/components/chat/ChatPermissionCard.vue`
- Test: `src/tests/chatCards.test.ts`

**Interfaces:**
- Consumes: `ToolCall` and `PermissionRequest` from `src/types/chat.ts`, `t` from `src/i18n`.
- Produces:
  - `<ChatToolCallCard :tool="toolCall" />`: collapsible card with icon by tool name (`bash`, `edit`, `read`), status badge, and expandable output (clipped with max-height).
  - `<ChatPermissionCard :request="permissionReq" @allow="..." @deny="..." />`: alert card with tool name, command/path, and Allow / Deny action buttons.

- [ ] **Step 1: Write the failing tests in `src/tests/chatCards.test.ts`**

Test:
- Tool card renders icon and arguments.
- Tool card expands/collapses output on click.
- Tool outputs have `dir="ltr"`.
- Permission card renders description and emits allow/deny events on button click.

- [ ] **Step 2: Run test to confirm it fails**

Run: `node node_modules/vitest/vitest.mjs run src/tests/chatCards.test.ts`
Expected: FAIL (components do not exist).

- [ ] **Step 3: Implement `ChatToolCallCard.vue` and `ChatPermissionCard.vue`**

Use Tailwind logical utilities, Lucide icons (`Terminal`, `FileEdit`, `FileText`, `Check`, `X`), and accessible button labels.

- [ ] **Step 4: Run tests**

Run: `node node_modules/vitest/vitest.mjs run src/tests/chatCards.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/chat/ChatToolCallCard.vue src/components/chat/ChatPermissionCard.vue src/tests/chatCards.test.ts
git commit -m "feat(chat): add interactive tool call cards and permission prompt cards"
```

---

### Task 6: Message Bubbles, Composer & Chat Header

**Files:**
- Create: `src/components/chat/ChatMessageItem.vue`
- Create: `src/components/chat/ChatMessageList.vue`
- Create: `src/components/chat/ChatComposer.vue`
- Create: `src/components/chat/ChatHeader.vue`
- Test: `src/tests/chatComposer.test.ts`

**Interfaces:**
- Consumes: `ChatMessage` from `src/types/chat.ts`, `ChatMarkdown`, `ChatToolCallCard`, `ChatPermissionCard`.
- Produces:
  - `<ChatMessageItem :message="msg" />`: user bubble (right-aligned in RTL, distinct background) / assistant bubble with markdown and tool cards.
  - `<ChatMessageList :messages="messages" :streaming="isStreaming" />`: scrollable message history with auto-scroll and jump-to-bottom floating button.
  - `<ChatComposer :disabled="disabled" :streaming="isStreaming" @send="..." @interrupt="..." />`: autogrowing textarea, attachment trigger, model selector pill, send/interrupt toggle button.
  - `<ChatHeader :title="title" :status="status" :model="model" @openDrawer="..." @openWebView="..." />`: top bar with drawer button, title, status dot, model selector, and WebView icon.

- [ ] **Step 1: Write the failing tests in `src/tests/chatComposer.test.ts`**

Test:
- Composer emits `send` on Enter (without Shift) and on button tap.
- Send button transforms into Interrupt button when `isStreaming` is true, emitting `interrupt`.
- Textarea auto-expands on long input.
- Header emits `openDrawer` and `openWebView`.

- [ ] **Step 2: Run test to confirm it fails**

Run: `node node_modules/vitest/vitest.mjs run src/tests/chatComposer.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the 4 components in `src/components/chat/`**

Build `ChatMessageItem.vue`, `ChatMessageList.vue`, `ChatComposer.vue`, and `ChatHeader.vue` with complete RTL layout and keyboard accessibility.

- [ ] **Step 4: Run tests**

Run: `node node_modules/vitest/vitest.mjs run src/tests/chatComposer.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/chat/ChatMessageItem.vue src/components/chat/ChatMessageList.vue src/components/chat/ChatComposer.vue src/components/chat/ChatHeader.vue src/tests/chatComposer.test.ts
git commit -m "feat(chat): add message list, autogrow composer, and chat header"
```

---

### Task 7: Sessions Drawer, i18n & ConnectionShell Integration

**Files:**
- Create: `src/components/chat/ChatSessionsDrawer.vue`
- Create: `src/components/chat/ChatView.vue`
- Modify: `src/components/ConnectionShell.vue`
- Modify: `src/i18n/index.ts`
- Test: `src/tests/chatView.test.ts`

**Interfaces:**
- Consumes: `useChatStore`, `useConnectionStore`, `useServerStore`.
- Produces:
  - Full Native Chat screen at `ChatView.vue`.
  - Integration in `ConnectionShell.vue`: opens `ChatView.vue` by default after health check passes; clicking "Open in WebView" transitions to the native in-app browser.
  - Localized strings for all Phase 2 features in `en-US` and `ar` with key parity.

- [ ] **Step 1: Add Phase 2 translation keys to `src/i18n/index.ts`**

Add keys for:
- `chat.title`, `chat.newSession`, `chat.sessions`, `chat.inputPlaceholder`, `chat.send`, `chat.interrupt`, `chat.copy`, `chat.copied`, `chat.toolRunning`, `chat.toolCompleted`, `chat.toolFailed`, `chat.permissionTitle`, `chat.allow`, `chat.deny`, `chat.openWebView`, `chat.switchToWebView`, `chat.noSessions`, `chat.selectModel`, `chat.attachFile`.
Ensure `catalogKeys('ar') === catalogKeys('en-US')`.

- [ ] **Step 2: Write failing integration test in `src/tests/chatView.test.ts`**

Test that `ChatView.vue` renders header, message list, composer, opens drawer on menu click, and triggers webview transition.

- [ ] **Step 3: Implement `ChatSessionsDrawer.vue` and `ChatView.vue`**

Assemble the complete chat experience with session switching and new session creation.

- [ ] **Step 4: Wire into `ConnectionShell.vue`**

Set `ChatView.vue` as the active view on connected state, with a method to open the InAppBrowser when the user clicks the WebView button.

- [ ] **Step 5: Run tests and typecheck**

Run: `node node_modules/vitest/vitest.mjs run && node node_modules/vue-tsc/bin/vue-tsc.js --noEmit`
Expected: ALL test suites pass (100% green) and 0 type errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/chat/ChatSessionsDrawer.vue src/components/chat/ChatView.vue src/components/ConnectionShell.vue src/i18n/index.ts src/tests/chatView.test.ts
git commit -m "feat(chat): assemble ChatView and integrate Native Chat as default session view"
```

---

### Task 8: Full Verification, Store Readiness & Documentation

**Files:**
- Modify: `docs/fork.md`
- Modify: `package.json` (bump version to `1.3.0-ar.1`)

**Interfaces:**
- Consumes: All completed tasks.
- Produces: Production build and green verification report.

- [ ] **Step 1: Update package version to `1.3.0-ar.1`**

Update `version` in `package.json`.

- [ ] **Step 2: Update `docs/fork.md`**

Document Phase 2 Native Chat UI, architecture, OpenCode v2 API usage, and manual verification checklist.

- [ ] **Step 3: Run all verification gates**

```bash
npm run lint
npm test
npm run build
node scripts/verify-store-readiness.mjs
git status --short
```

Expected: All gates PASS with 0 errors.

- [ ] **Step 4: Commit**

```bash
git add package.json docs/fork.md
git commit -m "chore(release): bump version to 1.3.0-ar.1 and update fork documentation"
```
