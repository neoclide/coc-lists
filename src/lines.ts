import { BasicList, ListContext, ListItem, Neovim, workspace, AnsiHighlight } from 'coc.nvim'
import { Location, Range } from 'vscode-languageserver-protocol'
import { pad } from './util'

export default class Lines extends BasicList {
  public readonly name = 'lines'
  public readonly searchHighlight = false
  public readonly interactive = true
  public readonly description = 'match lines of current buffer by regexp'
  public readonly detail = `Patterns are separated by space, pattern starts with '!' means nagitive.`

  constructor(nvim: Neovim) {
    super(nvim)
    this.addLocationActions()
  }

  public async loadItems(context: ListContext): Promise<ListItem[]> {
    let { input, window } = context
    if (!context.options.interactive) {
      throw new Error('lines list works on interactive mode only.')
    }
    if (!input.trim()) return []
    let valid = await window.valid
    if (!valid) return []
    let buf = await window.buffer
    let doc = workspace.getDocument(buf.id)
    if (!doc) return []
    let lines = await buf.lines
    let result: ListItem[] = []
    let inputs = input.trim().split(/\s+/)
    let flags = context.options.ignorecase ? 'iu' : 'u'
    let patterns: RegExp[] = []
    let nagitives: RegExp[] = []
    for (let s of inputs) {
      try {
        let nagitive = s.startsWith('!')
        let re = new RegExp(nagitive ? s.slice(1) : s, flags)
        if (nagitive) {
          nagitives.push(re)
        } else {
          patterns.push(re)
        }
      } catch (_e) {
        // noop invalid
      }
    }
    if (patterns.length == 0 && nagitives.length == 0) return []
    let hasNagitive = nagitives.length > 0
    let total = lines.length.toString().length
    let lnum = 0
    for (let line of lines) {
      lnum = lnum + 1
      if (hasNagitive && nagitives.some(r => r.test(line))) {
        continue
      }
      let ranges: [number, number][] = []
      for (let pattern of patterns) {
        let ms = line.match(pattern)
        if (ms == null) continue
        ranges.push([ms.index, ms.index + ms[0].length])
      }
      if (ranges.length != patterns.length) {
        continue
      }
      let range = Range.create(lnum - 1, ranges[0][0], lnum - 1, ranges[0][1])
      let pre = `${lnum}${pad(lnum.toString(), total)}`
      let pl = pre.length
      let ansiHighlights: AnsiHighlight[] = ranges.map(r => {
        return {
          span: [byteIndex(line, r[0]) + pl + 1, byteIndex(line, r[1]) + pl + 1],
          hlGroup: 'CocListFgRed'
        }
      })
      ansiHighlights.push({
        span: [0, pl],
        hlGroup: 'CocListFgMagenta'
      })
      // let text = line.replace(regex, colors.red(input))
      result.push({
        ansiHighlights,
        label: `${pre} ${line}`,
        location: Location.create(doc.uri, range),
        filterText: ''
      })
    }
    return result
  }
}

function byteIndex(content: string, index: number): number {
  let s = content.slice(0, index)
  return Buffer.byteLength(s)
}
