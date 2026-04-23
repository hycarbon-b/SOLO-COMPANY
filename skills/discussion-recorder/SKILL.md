---
name: discussion_recorder
description: Record employee task lifecycle events as timestamped JSON files in the discussion/ folder. Always call this skill immediately before and after invoking any employee skill.
user-invocable: false
---

# Discussion Recorder

This skill writes structured JSON records to the `discussion/` folder to track
the full lifecycle of every employee skill invocation. It serves as the
persistent audit log that the frontend reads to render the task panel — keeping
structured data out of the conversation context.

## When to call this skill

Call this skill **twice** for every employee skill you invoke:

1. **Before** calling the employee skill → write a `start` record
2. **After** the employee skill completes → write an `end` record

## How to write the records

### Step 1 — Ensure the folder exists

Use the `create_directory` tool (or equivalent) to ensure `discussion/` exists:

```
create_directory("discussion")
```

### Step 2 — Generate a timestamp key

Use the current UTC time formatted as `YYYYMMDDHHmmss`, e.g. `20260422103000`.
This becomes the filename prefix.

### Step 3 — Write the start record (before calling the employee skill)

Write a file named `discussion/{timestamp}_{skill_id}_start.json`:

```json
{
  "schema": "discussion_entry_v1",
  "event": "start",
  "timestamp": "<ISO 8601 UTC timestamp>",
  "skill_id": "<employee skill name, e.g. employee_cto>",
  "worker_label": "<display name, e.g. CTO · 首席技术官>",
  "worker_name": "<person name, e.g. David Zhang>",
  "task_objective": "<one-sentence description of what this employee will do>",
  "task_context": "<relevant context from the user's request>"
}
```

### Step 4 — Call the employee skill

Invoke the employee skill normally and wait for its response.

### Step 5 — Write the end record (after the employee skill completes)

Write a file named `discussion/{timestamp}_{skill_id}_end.json`
(use the **same timestamp** as the start record for this invocation):

```json
{
  "schema": "discussion_entry_v1",
  "event": "end",
  "timestamp": "<ISO 8601 UTC timestamp>",
  "skill_id": "<same skill_id as the start record>",
  "worker_label": "<same worker_label as the start record>",
  "worker_name": "<same worker_name as the start record>",
  "task_objective": "<same task_objective as the start record>",
  "summary": "<one-sentence core conclusion from the employee's response>",
  "key_findings": [
    { "key": "<finding name>", "value": "<finding content>" }
  ],
  "next_actions": ["<suggested action 1>", "<suggested action 2>"],
  "status": "success"
}
```

## Field rules

- `schema` — always `"discussion_entry_v1"`, never change this value
- `timestamp` — ISO 8601 with milliseconds, e.g. `"2026-04-22T10:30:00.000Z"`
- `skill_id` — use the snake_case skill name, e.g. `"employee_cto"`, `"employee_cpo"`
- `worker_label` — human-readable role title in the format `"ROLE · 中文职位"` 
- `summary` — **end only** — extract the single most important conclusion; 1–2 sentences max
- `key_findings` — **end only** — 2–4 most important findings; keep `value` concise
- `next_actions` — **end only** — concrete actionable items, not vague phrases
- `status` — **end only** — `"success"` | `"failed"` | `"partial"`

## Important

- Always use UTF-8 encoding for the JSON files
- The `discussion/` folder path is relative to the current workspace root
- Do **not** include the employee skill's full raw text in any discussion record field; keep all values concise
- If an employee skill call fails or times out, still write an `end` record with `"status": "failed"` and a brief `"summary"` describing what went wrong
