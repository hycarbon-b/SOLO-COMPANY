/**
 * 离线分析 ws-capture.jsonl，提取关键结构。
 */
import fs from 'node:fs'
const file = process.argv[2] || 'ws-capture.jsonl'
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean)

const sessionKeys = new Set()
const runIds = new Map() // runId -> { sessionKey, items: Map<callId, {events: [...]}> }
const itemEvents = []
const cmdOutEvents = []

for (const line of lines) {
  const obj = JSON.parse(line)
  const f = obj.frame
  if (f.type !== 'event') continue
  const p = f.payload || {}
  if (p.sessionKey) sessionKeys.add(p.sessionKey)
  if (f.event !== 'agent') continue
  const stream = p.stream
  const d = p.data || {}
  if (!runIds.has(p.runId)) runIds.set(p.runId, { sessionKey: p.sessionKey, items: new Map() })

  if (stream === 'item') {
    const cid = d.toolCallId
    const r = runIds.get(p.runId)
    if (!r.items.has(cid)) r.items.set(cid, [])
    r.items.get(cid).push({ stream, ...d })
    itemEvents.push({ runId: p.runId, ...d })
  } else if (stream === 'command_output') {
    cmdOutEvents.push({ runId: p.runId, ...d })
  }
}

console.log('\n=== sessionKeys observed ===')
for (const sk of sessionKeys) console.log('  ', sk)

console.log('\n=== runs ===')
for (const [runId, r] of runIds) {
  console.log(`  run ${runId} sk=${r.sessionKey} items=${r.items.size}`)
  for (const [cid, evs] of r.items) {
    const summary = evs.map(e => `${e.kind}/${e.phase}/${e.status}`).join(' → ')
    console.log(`    ${cid}  ${summary}`)
  }
}

console.log('\n=== item.end frames (kind/keys/key-value sizes) ===')
for (const e of itemEvents) {
  if (e.phase !== 'end') continue
  const keys = Object.keys(e).filter(k => !['stream'].includes(k))
  const lens = {}
  for (const k of ['summary','output','progressText','title','meta']) {
    if (typeof e[k] === 'string') lens[k] = e[k].length
  }
  console.log(`  ${e.kind} ${e.toolCallId} status=${e.status} keys=[${keys.join(',')}] lens=${JSON.stringify(lens)}`)
  if (e.summary) console.log(`     summary: ${JSON.stringify(e.summary.slice(0, 200))}`)
  if (e.output)  console.log(`     output:  ${JSON.stringify(e.output.slice(0, 200))}`)
}

console.log('\n=== command_output frames ===')
for (const c of cmdOutEvents) {
  const out = c.output ?? ''
  console.log(`  phase=${c.phase} cid=${c.toolCallId} output.len=${out.length} exitCode=${c.exitCode} status=${c.status} cwd=${c.cwd ?? ''}`)
  console.log(`     keys=[${Object.keys(c).join(',')}]`)
  console.log(`     output: ${JSON.stringify(out.slice(0, 200))}`)
}
