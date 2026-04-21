import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const repoRoot = resolve(process.cwd())
const userscriptPath = resolve(repoRoot, 'g-unlock.user.js')
const readmePath = resolve(repoRoot, 'README.md')
const planPath = resolve(repoRoot, 'docs', 'plans', '2026-04-21-g-unlock-inline-reconstruction-design.md')

const userscript = readFileSync(userscriptPath, 'utf8')
const readme = readFileSync(readmePath, 'utf8')

test('userscript metadata points at canonical repo paths', () => {
  assert.match(userscript, /@name\s+G-unlock/)
  assert.match(userscript, /@updateURL\s+https:\/\/raw\.githubusercontent\.com\/mr-pr0\/G-unlock\/main\/g-unlock\.user\.js/)
  assert.match(userscript, /@downloadURL\s+https:\/\/raw\.githubusercontent\.com\/mr-pr0\/G-unlock\/main\/g-unlock\.user\.js/)
  assert.match(userscript, /@home\s+https:\/\/github\.com\/mr-pr0\/G-unlock/)
})

test('userscript targets Google hosts and uses cross-origin fetch grant', () => {
  assert.match(userscript, /@include\s+\*:\/\/google\.\*\/\*/)
  assert.match(userscript, /@include\s+\*:\/\/www\.google\.\*\/\*/)
  assert.match(userscript, /@grant\s+GM_xmlhttpRequest/)
  assert.match(userscript, /function isSupportedGoogleHost\(/)
})

test('repo branding no longer contains old upstream naming in current userscript/readme', () => {
  assert.doesNotMatch(userscript, /Ibit-to\/google-unlocked/)
  assert.doesNotMatch(userscript, /The Best Torrents/)
  assert.doesNotMatch(readme, /Ibit-to\/google-unlocked/)
  assert.match(readme, /G-unlock userscript/)
})

test('design plan exists in docs/plans', () => {
  assert.equal(existsSync(planPath), true)
})
