import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, it } from 'node:test'
import { commands } from 'coc.nvim'
import { getSessionCwd } from '../src/session'

describe('coc-lists session', () => {
  it('uses the current directory when a session has no cd command', () => {
    assert.equal(getSessionCwd('set nocompatible\n', '/tmp/project'), '/tmp/project')
    assert.equal(getSessionCwd('cd /tmp/other\n', '/tmp/project'), '/tmp/other')
  })

  it('parses session cd with spaces', () => {
    assert.equal(getSessionCwd('cd /Users/me/My Projects\n', '/fallback'), '/Users/me/My Projects')
    assert.equal(getSessionCwd('set nocompatible\n', '/fallback'), '/fallback')
  })

  it('waits until a session file has been written', async () => {
    let root = await fs.mkdtemp(path.join(os.tmpdir(), 'coc-lists-session-'))
    let folder = path.join(root, 'with space')
    let filepath = path.join(folder, 'test.vim')
    await fs.mkdir(folder)
    try {
      await commands.executeCommand('session.save', filepath)
      await fs.access(filepath)
    } finally {
      await fs.rm(root, { recursive: true, force: true })
    }
  })
})
