import { IList, ListAction, ListContext, ListItem, Neovim } from 'coc.nvim'
import colors from 'colors/safe'

export default class Windows implements IList {
  public readonly name = 'windows'
  public readonly description = 'windows list'
  public readonly defaultAction = 'jump'
  public actions: ListAction[] = []

  constructor(private nvim: Neovim) {
    this.actions.push({
      name: 'jump',
      execute: item => {
        if (Array.isArray(item)) return
        nvim.call('win_gotoid', item.data.id, true)
      }
    })
  }

  public async loadItems(_context: ListContext): Promise<ListItem[]> {
    let { nvim } = this
    let wins = await nvim.call('getwininfo') as any[]
    let res: ListItem[] = []
    for (let win of wins) {
      let bufname = await nvim.call('bufname', win.bufnr)
      res.push({
        label: `${colors.yellow(win.tabnr.toString())}\t${colors.yellow(win.winnr.toString())}\t${bufname}`,
        data: { id: win.winid }
      })
    }
    return res
  }
}
