import assert from 'node:assert/strict'
import path from 'node:path'
import { describe, it } from 'node:test'
import { characterIndex, findVimSource, isParentFolder, parseVimSource } from '../src/util'

describe('coc-lists util', () => {
  it('parses Vim source locations with spaces and clamps invalid columns', () => {
    let withLine = parseVimSource('  Last set from /tmp/with space/plugin.vim line 42')
    assert.equal(withLine.filepath, '/tmp/with space/plugin.vim')
    assert.equal(withLine.line, 42)
    let withoutLine = parseVimSource('Last set from /tmp/with space/plugin.vim')
    assert.equal(withoutLine.filepath, '/tmp/with space/plugin.vim')
    assert.equal(withoutLine.line, undefined)
    assert.equal(parseVimSource('No source'), undefined)
    assert.equal(characterIndex('abc', -1), 0)
    let found = findVimSource(['foo', '\tLast set from /a b/plugin.vim line 3'])
    assert.equal(found.filepath, '/a b/plugin.vim')
    assert.equal(found.line, 3)
    assert.equal(findVimSource(['foo', 'bar']), undefined)
  })

  it('accepts child folders whose names start with two dots', () => {
    let root = path.join(path.sep, 'tmp', 'root')
    assert.equal(isParentFolder(root, path.join(root, '..cache', 'file')), true)
    assert.equal(isParentFolder(root, path.join(root, '..', 'outside')), false)
  })
})
