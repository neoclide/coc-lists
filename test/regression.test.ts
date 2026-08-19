import assert from 'node:assert/strict'
import { once } from 'node:events'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, it } from 'node:test'
import { listManager } from 'coc.nvim'
import { Task } from '../src/grep'
import { getSessionCwd } from '../src/session'

describe('coc-lists regressions', () => {
  it('emits one end event after all grep workspaces finish', async () => {
    let root = await fs.mkdtemp(path.join(os.tmpdir(), 'coc-lists-'))
    let first = path.join(root, 'first')
    let second = path.join(root, 'second')
    await fs.mkdir(first)
    await fs.mkdir(second)
    let task = new Task(false)
    let items = []
    task.on('data', item => items.push(item))
    task.start('', process.execPath, ['-e', "process.stdout.write('file:1:1:match\\n')"], [first, second], [], 0)
    await once(task, 'end')
    task.dispose()
    await fs.rm(root, { recursive: true, force: true })
    assert.equal(items.length, 2)
  })

  it('uses the current directory when a session has no cd command', () => {
    assert.equal(getSessionCwd('set nocompatible\n', '/tmp/project'), '/tmp/project')
    assert.equal(getSessionCwd('cd /tmp/other\n', '/tmp/project'), '/tmp/other')
  })

  it('honors the locationlist disabled-list name', () => {
    assert.equal(listManager.names.includes('locationlist'), false)
  })
})
