import { BasicList, ListContext, ListItem, Location, Neovim, Position, Range, workspace } from 'coc.nvim'
import { URI } from 'vscode-uri'
import { characterIndex } from './util'

export default class QuickfixList extends BasicList {
  public readonly name = 'quickfix'
  public readonly defaultAction = 'open'
  public description = 'quickfix list'

  constructor(nvim: Neovim) {
    super(nvim)
    this.addLocationActions()
  }

  public async loadItems(context: ListContext): Promise<ListItem[]> {
    let { nvim } = this
    let { window } = context
    let list = await nvim.call('getqflist')
    if (list.length == 0) return []
    let res: ListItem[] = []
    let bufnr: number
    let valid = await window.valid
    if (valid) {
      let buf = await window.buffer
      bufnr = buf.id
    }

    let ignoreFilepath = list.every(o => o.bufnr && bufnr && o.bufnr == bufnr)
    for (let item of list) {
      let { bufnr, col, text, type, lnum } = item
      if (type == 'E') {
        type = 'Error'
      } else if (type == 'W') {
        type = 'Warning'
      }
      let bufname = await nvim.call('bufname', bufnr)
      let fullpath = await nvim.call('fnamemodify', [bufname, ':p'])
      let uri = URI.file(fullpath).toString()
      let line = await workspace.getLine(uri, lnum - 1)
      let pos = Position.create(lnum - 1, characterIndex(line, col - 1))
      res.push({
        label: `${ignoreFilepath ? '' : bufname} |${type ? type + ' ' : ''}${lnum} col ${col}| ${text}`,
        location: Location.create(uri, Range.create(pos, pos)),
        filterText: `${ignoreFilepath ? '' : bufname}${text}`
      })
    }
    return res
  }

  public doHighlight(): void {
    let { nvim } = this
    nvim.pauseNotification()
    nvim.command('syntax match CocQuickfixName /\\v^[^|]+/ contained containedin=CocQuickfixLine', true)
    nvim.command('syntax match CocQuickfixPosition /\\v\\|\\w*\\s?\\d+\\scol\\s\\d+\\|/ contained containedin=CocQuickfixLine', true)
    nvim.command('syntax match CocQuickfixError /Error/ contained containedin=CocQuickfixPosition', true)
    nvim.command('syntax match CocQuickfixWarning /Warning/ contained containedin=CocQuickfixPosition', true)
    nvim.command('highlight default link CocQuickfixName Directory', true)
    nvim.command('highlight default link CocQuickfixPosition LineNr', true)
    nvim.command('highlight default link CocQuickfixError Error', true)
    nvim.command('highlight default link CocQuickfixWarning WarningMsg', true)
    nvim.resumeNotification().catch(_e => {
      // noop
    })
  }
}
