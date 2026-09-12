import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import test from 'node:test'

const app = readFileSync('src/main.jsx', 'utf8')
const migration1 = readFileSync('supabase/migrations/202609120001_hackathon_hub.sql', 'utf8')
const migration2 = readFileSync('supabase/migrations/202609120002_harden_ballots_and_leaderboard.sql', 'utf8')

test('React app connects voting, auth, submission and storage', () => {
  assert.match(app, /signInWithOtp/)
  assert.match(app, /rpc\('submit_ballot'/)
  assert.match(app, /rpc\('get_leaderboard'/)
  assert.match(app, /storage\.from\('project-assets'\)/)
  assert.match(app, /from\('projects'\)\.insert/)
})

test('database migrations enforce RLS and exactly three votes', () => {
  assert.match(migration1, /alter table public\.projects enable row level security/)
  assert.match(migration1, /alter table public\.votes enable row level security/)
  assert.match(migration2, /count\(\*\) from inserted_votes\) <> 3/)
  assert.match(migration2, /security invoker/)
})

test('GitHub Pages build is complete', () => {
  assert.ok(existsSync('docs/index.html'))
  assert.ok(existsSync('docs/404.html'))
  assert.ok(existsSync('docs/assets/hosted-622882c9e1bd6021.png'))
})
