import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, it } from 'node:test'
import { ListContext, workspace } from 'coc.nvim'
import { Helptags } from '../src/helptags'
import { wait } from '../src/util'

describe('coc-lists helptags', () => {
  it('uses the current runtimepath when the cached environment is stale', async () => {
    let nvim = workspace.nvim
    let root = await fs.mkdtemp(path.join(os.tmpdir(), 'coc-lists-helptags-'))
    let doc = path.join(root, 'doc')
    await fs.mkdir(doc)
    await fs.writeFile(path.join(doc, 'help.txt'), '*dynamic-help*\n')
    await fs.writeFile(path.join(doc, 'tags'), 'dynamic-help\thelp.txt\t/*dynamic-help*\n')
    let escaped = await nvim.call('fnameescape', [root]) as string
    try {
      await nvim.command(`noautocmd set runtimepath+=${escaped}`)
      assert.equal(workspace.env.runtimepath.split(',').includes(root), false)
      let items = await new Helptags(nvim).loadItems({} as ListContext)
      assert.ok(items.some(item => item.data.name === 'dynamic-help'))
    } finally {
      await nvim.command(`noautocmd set runtimepath-=${escaped}`)
      await fs.rm(root, { recursive: true, force: true })
      await wait(100)
    }
  })
})
