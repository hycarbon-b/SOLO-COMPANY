# OpenClaw Health And Tool UI

- Date: 2026-04-28 09:00
- Scope: front-end

## Changes
- Added Gateway health state parsing and subscription in `src/services/openclawGateway.ts`.
- Added tool event parsing for `session.tool` / `tool*` broadcasts and exposed them to chat callers.
- Subscribed chat session state to Gateway health updates in `src/app/hooks/useChatSession.ts`.
- Injected tool call updates into the conversation as dedicated tool messages.
- Displayed agent health status in the chat header and rendered tool-event bubbles in the chat panel.

## Validation
- `npm run build` in `front-end` passed.
- Build warning remains for large chunks, but the build completed successfully.
