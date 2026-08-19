import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, it } from 'node:test'
import { workspace } from 'coc.nvim'
import { isMruExcluded, MruList } from '../src/mru'
import { isGitIgnored } from '../src/util'

describe('coc-lists mru', () => {
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
})
