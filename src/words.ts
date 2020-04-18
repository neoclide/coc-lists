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
    let flags = context.options.ignorecase ? 'igu' : 'gu'
    let source = input.replace(matchOperatorsRe, '\\$&')
    if (wordMatch) source = `\\b${source}\\b`
    let regex = new RegExp(source, flags)
    for (let line of content.split('\n')) {
      let idx = line.indexOf(input)
      if (context.options.ignorecase) {
        idx = line.toLowerCase().indexOf(input.toLowerCase());
      }
      if (idx != -1) {
        if (wordMatch && !regex.test(line)) {
          continue
        }
        let range = Range.create(lnum - 1, idx, lnum - 1, idx + input.length)
        let pre = `${colors.magenta(lnum.toString())}${pad(lnum.toString(), total)}`
        const matchedString = line.substr(idx, input.length);
        let text = line.replace(regex, safe_1.default.red(matchedString));
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
