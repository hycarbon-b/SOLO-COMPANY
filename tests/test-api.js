import assert from 'assert'

async function run() {
  const base = 'http://localhost:3000'

  console.log('Checking /api/health...')
  const h = await fetch(`${base}/api/health`)
  if (!h.ok) throw new Error('/api/health returned ' + h.status)
  const hj = await h.json()
  console.log('Health:', hj)

  console.log('Checking /api/files...')
  const f = await fetch(`${base}/api/files`)
  if (!f.ok) throw new Error('/api/files returned ' + f.status)
  const fj = await f.json()
  console.log('Files root:', fj.base)
  console.log('Entries:', fj.tree.length)

  assert(Array.isArray(fj.tree), 'tree should be an array')
  console.log('Test passed')
}

run().catch(err => {
  console.error('Test failed:', err)
  process.exit(2)
})
