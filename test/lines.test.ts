import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ListContext, workspace } from 'coc.nvim'
import { Lines } from '../src/lines'

describe('coc-lists lines', () => {
  function buildContext(input: string): Promise<ListContext> {
    return (async () => {
      let nvim = workspace.nvim
      return {
        args: [],
        buffer: await nvim.buffer,
        cwd: process.cwd(),
        input,
        listWindow: null,
        options: { interactive: true, ignorecase: false },
        window: await nvim.window
      } as ListContext
    })()
  }

  async function setLines(lines: string[]): Promise<void> {
    let nvim = workspace.nvim
    await nvim.command('enew!')
    let doc = await workspace.document
    await doc.buffer.setLines(lines, {
      start: 0,
      end: -1,
      strictIndexing: false
    })
    await doc.synchronize()
  }

  it('supports lines queries with only a negative pattern', async () => {
    await setLines(['keep', 'skip'])
    let items = await new Lines(workspace.nvim).loadItems(await buildContext('!skip'))
    assert.equal(items.length, 1)
    assert.equal(items[0].label.endsWith('keep'), true)
    assert.deepEqual(items[0].location.range.start, { line: 0, character: 0 })
  })

  it('filters lines by positive and negative patterns', async () => {
    await setLines(['foo keep', 'foo skip', 'bar'])
    let items = await new Lines(workspace.nvim).loadItems(await buildContext('foo !skip'))
    assert.equal(items.length, 1)
    assert.equal(items[0].label.endsWith('foo keep'), true)
    assert.deepEqual(items[0].location.range.start, { line: 0, character: 0 })
  })
})
