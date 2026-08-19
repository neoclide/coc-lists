import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, it } from 'node:test'
import { ListContext, workspace } from 'coc.nvim'
import { BufferList } from '../src/buffers'
import { Commands } from '../src/commands'
import { Functions } from '../src/functions'
import { Maps } from '../src/maps'
import { wait } from '../src/util'

async function waitFor<T>(fn: () => Promise<T>, cond: (v: T) => boolean): Promise<T> {
  let deadline = Date.now() + 3000
  let last: T
  while (Date.now() < deadline) {
    last = await fn()
    if (cond(last)) return last
    await wait(50)
  }
  throw new Error('waitFor: condition not met')
}

describe('coc-lists actions', () => {
  it('opens the source file of a vim command', async () => {
    let nvim = workspace.nvim
    let root = await fs.mkdtemp(path.join(os.tmpdir(), 'coc-lists-cmd-'))
    let folder = path.join(root, 'vim dir')
    await fs.mkdir(folder)
    let filepath = path.join(folder, 'mycmd.vim')
    await fs.writeFile(filepath, 'command! MyAuditCmd echo "x"\n')
    try {
      await nvim.command('source ' + await nvim.call('fnameescape', [filepath]))
      let list = new Commands(nvim)
      let action = list.actions.find(a => a.name === 'open')
      await action.execute({ data: { command: 'MyAuditCmd' } }, null)
      let real = await fs.realpath(filepath)
      let name = await waitFor(() => nvim.call('bufname', '%') as Promise<string>, s => {
        let p = path.resolve(s)
        return p === path.resolve(filepath) || p === real
      })
      assert.ok(name)
    } finally {
      await fs.rm(root, { recursive: true, force: true })
    }
  })

  it('opens the source file of a vim function', async () => {
    let nvim = workspace.nvim
    let root = await fs.mkdtemp(path.join(os.tmpdir(), 'coc-lists-fn-'))
    let folder = path.join(root, 'vim dir')
    await fs.mkdir(folder)
    let filepath = path.join(folder, 'myfn.vim')
    await fs.writeFile(filepath, 'function! MyAuditFunc() abort\n  echo "x"\nendfunction\n')
    try {
      await nvim.command('source ' + await nvim.call('fnameescape', [filepath]))
      let list = new Functions(nvim)
      let action = list.actions.find(a => a.name === 'open')
      await action.execute({ data: { funcname: 'MyAuditFunc' } }, null)
      let real = await fs.realpath(filepath)
      let name = await waitFor(() => nvim.call('bufname', '%') as Promise<string>, s => {
        let p = path.resolve(s)
        return p === path.resolve(filepath) || p === real
      })
      assert.ok(name)
    } finally {
      await fs.rm(root, { recursive: true, force: true })
    }
  })

  it('opens the source file of a key mapping', async () => {
    let nvim = workspace.nvim
    let root = await fs.mkdtemp(path.join(os.tmpdir(), 'coc-lists-map-'))
    let folder = path.join(root, 'vim dir')
    await fs.mkdir(folder)
    let filepath = path.join(folder, 'mymap.vim')
    await fs.writeFile(filepath, 'nnoremap <leader>z :echo "x"<CR>\n')
    try {
      await nvim.command('source ' + await nvim.call('fnameescape', [filepath]))
      let list = new Maps(nvim)
      let action = list.actions.find(a => a.name === 'open')
      await action.execute({ data: { mode: 'n', key: '<leader>z' } }, null)
      let real = await fs.realpath(filepath)
      let name = await waitFor(() => nvim.call('bufname', '%') as Promise<string>, s => {
        let p = path.resolve(s)
        return p === path.resolve(filepath) || p === real
      })
      assert.ok(name)
    } finally {
      await fs.rm(root, { recursive: true, force: true })
    }
  })

  it('removes the arglist entry when deleting an arg buffer', async () => {
    let nvim = workspace.nvim
    let root = await fs.mkdtemp(path.join(os.tmpdir(), 'coc-lists-args-'))
    let filepath = path.join(root, 'with space.txt')
    await fs.writeFile(filepath, '')
    try {
      let escaped = await nvim.call('fnameescape', [filepath]) as string
      await nvim.command('argadd ' + escaped)
      await nvim.command('badd ' + escaped)
      let list = new BufferList(nvim)
      let items = await list.loadItems({ args: ['--args'] } as ListContext)
      let item = items.find(i => i.data.bufname === filepath)
      assert.ok(item, 'buffer should appear in arglist')
      await list.actions.find(a => a.name === 'delete').execute(item, null)
      let argv = await nvim.eval('argv()') as string[]
      assert.equal(argv.includes(filepath), false)
    } finally {
      await fs.rm(root, { recursive: true, force: true })
    }
  })
})
