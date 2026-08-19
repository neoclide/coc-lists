import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, it } from 'node:test'
import { ListContext, listManager, workspace } from 'coc.nvim'
import { LocationList } from '../src/locationlist'
import { QuickfixList } from '../src/quickfix'

describe('coc-lists locations', () => {
  it('honors the locationlist disabled-list name', () => {
    assert.equal(listManager.names.includes('locationlist'), false)
  })

  it('clamps quickfix entries with zero lnum', async () => {
    let nvim = workspace.nvim
    let root = await fs.mkdtemp(path.join(os.tmpdir(), 'coc-lists-qf-'))
    let filepath = path.join(root, 'qf.txt')
    await fs.writeFile(filepath, 'line1\nline2\n')
    try {
      await nvim.command('edit ' + await nvim.call('fnameescape', [filepath]))
      let buf = await nvim.buffer
      await nvim.call('setqflist', [[{ bufnr: buf.id, lnum: 0, col: 0, text: 'no line' }], 'r'])
      let items = await new QuickfixList(nvim).loadItems({ args: [], window: await nvim.window } as ListContext)
      assert.equal(items.length, 1)
      assert.deepEqual(items[0].location.range.start, { line: 0, character: 0 })
    } finally {
      await fs.rm(root, { recursive: true, force: true })
    }
  })

  it('clamps locationlist entries with zero lnum', async () => {
    let nvim = workspace.nvim
    let root = await fs.mkdtemp(path.join(os.tmpdir(), 'coc-lists-loc-'))
    let filepath = path.join(root, 'loc.txt')
    await fs.writeFile(filepath, 'a\nb\n')
    try {
      await nvim.command('edit ' + await nvim.call('fnameescape', [filepath]))
      let win = await nvim.window
      let buf = await nvim.buffer
      await nvim.call('setloclist', [win.id, [{ bufnr: buf.id, lnum: 0, col: 0, text: 'no line' }], 'r'])
      let items = await new LocationList(nvim).loadItems({ args: [], window: win } as ListContext)
      assert.equal(items.length, 1)
      assert.deepEqual(items[0].location.range.start, { line: 0, character: 0 })
    } finally {
      await fs.rm(root, { recursive: true, force: true })
    }
  })
})
