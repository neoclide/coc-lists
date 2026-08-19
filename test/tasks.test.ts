import assert from 'node:assert/strict'
import { once } from 'node:events'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, it } from 'node:test'
import { Uri } from 'coc.nvim'
import { Task as FilesTask } from '../src/files'
import { Task as GrepTask } from '../src/grep'
import { FileTask as TagsTask } from '../src/tags'

describe('coc-lists tasks', () => {
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

  it('keeps absolute and joins relative file paths', async () => {
    let root = await fs.mkdtemp(path.join(os.tmpdir(), 'coc-lists-files-'))
    try {
      let abs = path.join(root, 'abs.txt')
      let task = new FilesTask()
      let items = []
      task.on('data', item => items.push(item))
      let script = `process.stdout.write(${JSON.stringify(`${abs}\nrel.txt\n`)})`
      task.start(process.execPath, ['-e', script], [root], [])
      await once(task, 'end')
      task.dispose()
      assert.equal(items.length, 2)
      assert.equal(items[0].location.uri, Uri.file(abs).toString())
      assert.equal(items[1].location.uri, Uri.file(path.join(root, 'rel.txt')).toString())
    } finally {
      await fs.rm(root, { recursive: true, force: true })
    }
  })

  it('filters file list by exclude patterns', async () => {
    let root = await fs.mkdtemp(path.join(os.tmpdir(), 'coc-lists-files-'))
    try {
      let task = new FilesTask()
      let items = []
      task.on('data', item => items.push(item))
      let script = `process.stdout.write(${JSON.stringify('a.ts\nb.js\n')})`
      task.start(process.execPath, ['-e', script], [root], ['**/*.ts'])
      await once(task, 'end')
      task.dispose()
      assert.equal(items.length, 1)
      assert.equal(items[0].location.uri, Uri.file(path.join(root, 'b.js')).toString())
    } finally {
      await fs.rm(root, { recursive: true, force: true })
    }
  })

  it('parses ANSI grep output and applies exclude patterns', async () => {
    let root = await fs.mkdtemp(path.join(os.tmpdir(), 'coc-lists-grep-'))
    try {
      let abs = path.join(root, 'a.ts')
      let output = `\x1b[31m${abs}:1:1:match\x1b[0m\nb.js:1:1:match\n`
      let task = new GrepTask(false)
      let items = []
      task.on('data', item => items.push(item))
      let script = `process.stdout.write(${JSON.stringify(output)})`
      task.start('match', process.execPath, ['-e', script], [root], ['**/*.ts'], 0)
      await once(task, 'end')
      task.dispose()
      assert.equal(items.length, 1)
      assert.equal(items[0].location.uri, Uri.file(path.join(root, 'b.js')).toString())
    } finally {
      await fs.rm(root, { recursive: true, force: true })
    }
  })

  it('limits interactive grep results by maxLines', async () => {
    let root = await fs.mkdtemp(path.join(os.tmpdir(), 'coc-lists-grep-'))
    try {
      let task = new GrepTask(true)
      let items = []
      task.on('data', item => items.push(item))
      let script = `process.stdout.write(${JSON.stringify('a:1:1:m\nb:1:1:m\n')})`
      task.start('m', process.execPath, ['-e', script], [root], [], 1)
      await once(task, 'end')
      task.dispose()
      assert.equal(items.length, 1)
    } finally {
      await fs.rm(root, { recursive: true, force: true })
    }
  })

  it('ends a tags task when all tagfiles are missing', async () => {
    let task = new TagsTask()
    task.start(['/does/not/exist/tags'], process.cwd())
    await once(task, 'end')
  })

  it('resolves tag paths against the tag file directory', async () => {
    let root = await fs.mkdtemp(path.join(os.tmpdir(), 'coc-lists-tags-'))
    try {
      let tagdir = path.join(root, 'tag dir')
      await fs.mkdir(tagdir)
      let rel = path.join(tagdir, 'rel.txt')
      let abs = path.join(root, 'abs.txt')
      await fs.writeFile(rel, 'foo\n')
      await fs.writeFile(abs, 'bar\n')
      let tagfile = path.join(tagdir, 'tags')
      await fs.writeFile(tagfile, `!_TAG ignore me\nfoo\trel.txt\t/^foo$/\nbar\t${abs}\t/^bar$/\n`)
      let task = new TagsTask()
      let items = []
      task.on('data', item => items.push(item))
      task.start([tagfile], root)
      await once(task, 'end')
      task.dispose()
      assert.equal(items.length, 2)
      assert.equal(items[0].location.uri, Uri.file(rel).toString())
      assert.equal(items[1].location.uri, Uri.file(abs).toString())
    } finally {
      await fs.rm(root, { recursive: true, force: true })
    }
  })

  it('emits end when a tag file cannot be read', async () => {
    let root = await fs.mkdtemp(path.join(os.tmpdir(), 'coc-lists-tags-'))
    try {
      let dir = path.join(root, 'not a tags file')
      await fs.mkdir(dir)
      let task = new TagsTask()
      let errors = []
      task.on('error', e => errors.push(e))
      let ended = new Promise<void>(resolve => task.on('end', () => resolve()))
      task.start([dir], root)
      await ended
      assert.equal(errors.length, 1)
    } finally {
      await fs.rm(root, { recursive: true, force: true })
    }
  })
})
