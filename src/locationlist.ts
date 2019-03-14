import { BasicList, ListContext, ListItem, Neovim, workspace } from 'coc.nvim'
import { Location, Position, Range } from 'vscode-languageserver-protocol'
import Uri from 'vscode-uri'
import { characterIndex } from './util'

export default class LocationList extends BasicList {
  public readonly name = 'locationlist'
  public readonly defaultAction = 'open'
  public description = 'locationlist of current window'

  constructor(nvim: Neovim) {
    super(nvim)
    this.addLocationActions()
  }

  public async loadItems(context: ListContext): Promise<ListItem[]> {
    let { nvim } = this
    let { window } = context
    let valid = await window.valid
    if (!valid) return []
    let list = await nvim.call('getloclist', [window.id])
    if (list.length == 0) return []
    let res: ListItem[] = []
    let buf = await context.window.buffer
    let bufnr = buf.id

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
      let uri = Uri.file(fullpath).toString()
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
    nvim.command('syntax match CocLocationlistName /\\v^[^|]+/ contained containedin=CocLocationlistLine', true)
    nvim.command('syntax match CocLocationlistPosition /\\v\\|\\w*\\s?\\d+\\scol\\s\\d+\\|/ contained containedin=CocLocationlistLine', true)
    nvim.command('syntax match CocLocationlistError /Error/ contained containedin=CocLocationlistPosition', true)
    nvim.command('syntax match CocLocationlistWarning /Warning/ contained containedin=CocLocationlistPosition', true)
    nvim.command('highlight default link CocLocationlistName Directory', true)
    nvim.command('highlight default link CocLocationlistPosition LineNr', true)
    nvim.command('highlight default link CocLocationlistError Error', true)
    nvim.command('highlight default link CocLocationlistWarning WarningMsg', true)
    nvim.resumeNotification().catch(_e => {
      // noop
    })
  }
}
