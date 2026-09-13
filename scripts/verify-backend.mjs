const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  console.error('缺少 VITE_SUPABASE_URL 或 VITE_SUPABASE_PUBLISHABLE_KEY；先执行 cp .env.example .env.local 并加载变量。')
  process.exit(1)
}

const headers = { apikey: key, Authorization: `Bearer ${key}` }
const checks = [
  ['projects', `${url}/rest/v1/projects?select=id,name,team_name,status&limit=5`],
  ['votes', `${url}/rest/v1/votes?select=id,project_id,rank&limit=5`],
  ['participants', `${url}/rest/v1/participants?select=id,display_name&limit=5`],
  ['leaderboard RPC', `${url}/rest/v1/rpc/get_leaderboard`],
]

let failed = false
for (const [name, endpoint] of checks) {
  const response = await fetch(endpoint, {
    method: name === 'leaderboard RPC' ? 'POST' : 'GET',
    headers: { ...headers, ...(name === 'leaderboard RPC' ? { 'Content-Type': 'application/json' } : {}) },
    body: name === 'leaderboard RPC' ? '{}' : undefined,
  })
  const body = await response.text()
  let parsed
  try { parsed = JSON.parse(body) } catch { parsed = body }
  const size = Array.isArray(parsed) ? parsed.length : 'n/a'
  console.log(`${name}: HTTP ${response.status}; rows=${size}`)
  if (!response.ok) {
    console.error(body)
    failed = true
  }
}

if (failed) process.exit(1)
console.log('Supabase backend smoke check: PASS')
