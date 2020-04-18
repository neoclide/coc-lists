import { BasicList, ListContext, ListItem, Neovim, workspace } from 'coc.nvim'
import colors from 'colors/safe'
import { Location, Range } from 'vscode-languageserver-protocol'
import { pad } from './util'

const matchOperatorsRe = /[|\\{}()[\]^$+*?.]/g

export default class Words extends BasicList {
  public readonly name = 'words'
  public readonly searchHighlight = false
  public readonly interactive = true
  public readonly description = 'word matches of current buffer'
  public options = [{
    name: '-w, -word',
    description: 'Match word boundary.'
  }]

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
    let { args } = context
    let wordMatch = args.indexOf('-w') !== -1 || args.indexOf('-word') !== -1
    let content = doc.getDocumentContent()
    let result: ListItem[] = []
    let lnum = 1
    let total = doc.lineCount.toString().length
    let flags = context.options.ignorecase ? 'iu' : 'u'
    let source = input.replace(matchOperatorsRe, '\\$&')
    if (wordMatch) source = `\\b${source}\\b`
    let regex = new RegExp(source, flags)
    let replaceRegex = new RegExp(source, flags + 'g')
    for (let line of content.split('\n')) {
      let ms = line.match(regex)
      if (ms) {
        let range = Range.create(lnum - 1, ms.index, lnum - 1, ms.index + input.length)
        let pre = `${colors.magenta(lnum.toString())}${pad(lnum.toString(), total)}`
        let text = line.replace(replaceRegex, match => {
          return colors.red(match)
        })
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
