import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { once } from 'node:events'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, it } from 'node:test'
import { commands, ListContext, listManager, workspace } from 'coc.nvim'
import { Task as FilesTask } from '../src/files'
import { Task as GrepTask } from '../src/grep'
import { Lines } from '../src/lines'
import { isMruExcluded, MruList } from '../src/mru'
import { getSessionCwd } from '../src/session'
import { FileTask as TagsTask } from '../src/tags'
import { characterIndex, isGitIgnored, isParentFolder, parseVimSource } from '../src/util'

describe('coc-lists regressions', () => {
  it('emits one end event after all grep workspaces finish', async () => {
    let root = await fs.mkdtemp(path.join(os.tmpdir(), 'coc-lists-'))
    let first = path.join(root, 'first')
    let second = path.join(root, 'second')
    await fs.mkdir(first)
    await fs.mkdir(second)
    let task = new GrepTask(false)
    let items = []
    task.on('data', item => items.push(item))
    task.start('', process.execPath, ['-e', "process.stdout.write('file:1:1:match\\n')"], [first, second], [], 0)
    await once(task, 'end')
    task.dispose()
    await fs.rm(root, { recursive: true, force: true })
    assert.equal(items.length, 2)
    assert.ok(items.every(item => item.location.uri.startsWith('file:')))
  })

  it('ends file and grep tasks with no workspaces', async () => {
    let files = new FilesTask()
    let grep = new GrepTask(false)
    files.start(process.execPath, [], [], [])
    grep.start('', process.execPath, [], [], [], 0)
    await Promise.all([once(files, 'end'), once(grep, 'end')])
  })

  it('ends a tags task when all tagfiles are missing', async () => {
    let task = new TagsTask()
    task.start(['/does/not/exist/tags'], process.cwd())
    await once(task, 'end')
  })

  it('uses the current directory when a session has no cd command', () => {
    assert.equal(getSessionCwd('set nocompatible\n', '/tmp/project'), '/tmp/project')
    assert.equal(getSessionCwd('cd /tmp/other\n', '/tmp/project'), '/tmp/other')
  })

  it('honors the locationlist disabled-list name', () => {
    assert.equal(listManager.names.includes('locationlist'), false)
  })

  it('supports lines queries with only a negative pattern', async () => {
    let nvim = workspace.nvim
    await nvim.command('enew!')
    let doc = await workspace.document
    await doc.buffer.setLines(['keep', 'skip'], {
      start: 0,
      end: -1,
      strictIndexing: false
    })
    await doc.synchronize()
    let context = {
      args: [],
      buffer: await nvim.buffer,
      cwd: process.cwd(),
      input: '!skip',
      listWindow: null,
      options: { interactive: true, ignorecase: false },
      window: await nvim.window
    } as ListContext
    let items = await new Lines(nvim).loadItems(context)
    assert.equal(items.length, 1)
    assert.equal(items[0].label.endsWith('keep'), true)
    assert.deepEqual(items[0].location.range.start, { line: 0, character: 0 })
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

  it('applies MRU exclusion and maximum-length settings', () => {
    assert.equal(isMruExcluded('/tmp/file.ts', ['**/*.ts']), true)
    assert.equal(isMruExcluded('/tmp/file.js', ['**/*.ts']), false)
    let list = new MruList(workspace.nvim)
    assert.equal((list as any).mru.maximum, 1000)
    list.dispose()
  })

  it('detects git ignored files for MRU exclusion', async () => {
    let root = await fs.mkdtemp(path.join(os.tmpdir(), 'coc-lists-git-'))
    try {
      execFileSync('git', ['init', '-q'], { cwd: root })
      await fs.writeFile(path.join(root, '.gitignore'), 'ignored.ts\n')
      await fs.writeFile(path.join(root, 'ignored.ts'), '')
      await fs.writeFile(path.join(root, 'kept.ts'), '')
      assert.equal(await isGitIgnored(path.join(root, 'ignored.ts')), true)
      assert.equal(await isGitIgnored(path.join(root, 'kept.ts')), false)
      assert.equal(await isGitIgnored(path.join(root, 'missing.ts')), false)
    } finally {
      await fs.rm(root, { recursive: true, force: true })
    }
  })

  it('accepts child folders whose names start with two dots', () => {
    let root = path.join(path.sep, 'tmp', 'root')
    assert.equal(isParentFolder(root, path.join(root, '..cache', 'file')), true)
    assert.equal(isParentFolder(root, path.join(root, '..', 'outside')), false)
  })

  it('parses Vim source locations with spaces and clamps invalid columns', () => {
    let withLine = parseVimSource('  Last set from /tmp/with space/plugin.vim line 42')
    assert.equal(withLine.filepath, '/tmp/with space/plugin.vim')
    assert.equal(withLine.line, 42)
    let withoutLine = parseVimSource('Last set from /tmp/with space/plugin.vim')
    assert.equal(withoutLine.filepath, '/tmp/with space/plugin.vim')
    assert.equal(withoutLine.line, undefined)
    assert.equal(parseVimSource('No source'), undefined)
    assert.equal(characterIndex('abc', -1), 0)
  })
})
