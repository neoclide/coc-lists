import { BasicList, ListContext, Uri as URI, ListItem, Location, Neovim, Position, Range, workspace } from 'coc.nvim'
import { characterIndex } from './util'

export class LocationList extends BasicList {
  public readonly name = 'locationlist'
  public readonly defaultAction = 'open'
  public description = 'locationlist of current window'

  constructor(nvim: Neovim) {
    super()
    this.addLocationActions()
  }

  public async loadItems(context: ListContext): Promise<ListItem[]> {
    let { nvim } = this
    let { window } = context
    let valid = await window.valid
    if (!valid) return []
    let list = await nvim.call('getloclist', [window.id]) as any[]
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
      let bufname = await nvim.call('bufname', bufnr) as string
      let fullpath = await nvim.call('fnamemodify', [bufname, ':p']) as string
      let uri = URI.file(fullpath).toString()
      let lineIndex = Math.max(0, lnum - 1)
      let line = await workspace.getLine(uri, lineIndex)
      let pos = Position.create(lineIndex, characterIndex(line, col - 1))
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

export default LocationList
