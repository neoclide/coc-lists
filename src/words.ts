import { Range, Location } from 'vscode-languageserver-protocol'
import { Neovim } from '@chemzqm/neovim'
import { workspace, BasicList, ListContext, ListItem } from 'coc.nvim'
import colors from 'colors/safe'

const matchOperatorsRe = /[|\\{}()[\]^$+*?.]/g

export default class Words extends BasicList {
  public readonly name = 'words'
  public readonly searchHighlight = false
  public readonly interactive = true
  public readonly description = 'word matches of current buffer'

  constructor(nvim: Neovim) {
    super(nvim)
    this.addLocationActions()
  }

  public async loadItems(context: ListContext): Promise<ListItem[]> {
    let { input, window } = context
    if (!input) return []
    let valid = await window.valid
    if (!valid) return []
    let buf = await window.buffer
    let doc = workspace.getDocument(buf.id)
    if (!doc) return
    let content = doc.getDocumentContent()
    let result: ListItem[] = []
    let lnum = 1
    let total = doc.lineCount.toString().length
    let flags = context.options.ignorecase ? 'ig' : 'g'
    let regex = new RegExp(input.replace(matchOperatorsRe, '\\$&'), flags)
    for (let line of content.split('\n')) {
      let idx = line.indexOf(input)
      if (idx != -1) {
        let range = Range.create(lnum - 1, idx, lnum - 1, idx + input.length)
        let pre = `${colors.magenta(lnum.toString())}${pad(lnum, total)}`
        let text = line.replace(regex, colors.red(input))
        result.push({
          label: `${pre} ${text}`,
          location: Location.create(doc.uri, range),
          filterText: ''
        })
      }
      lnum = lnum + 1
    }
    return result
  }
}

function pad(n: number, total: number): string {
  let l = total - String(n).length
  if (l <= 0) return ''
  return ((new Array(l)).fill(' ').join(''))
}
