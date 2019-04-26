import { IList, ListAction, ListContext, ListItem, Neovim } from 'coc.nvim'

const regex = /^\s*\d+\s+(.*)$/

export default class Searchhistory implements IList {
  public readonly name = 'searchhistory'
  public readonly description = 'search history'
  public readonly defaultAction = 'feedkeys'
  public actions: ListAction[] = []

  constructor(private nvim: Neovim) {
    this.actions.push({
      name: 'feedkeys',
      execute: async item => {
        if (Array.isArray(item)) return
        nvim.call('feedkeys', [`/${item.data.cmd}`, 'n'], true)
      }
    })
  }

  public async loadItems(_context: ListContext): Promise<ListItem[]> {
    let { nvim } = this
    let list = await nvim.eval(`split(execute("history search"),"\n")`) as string[]
    list = list.slice(1)
    let res: ListItem[] = []
    for (let line of list) {
      let ms = line.match(regex)
      if (ms) {
        let [, cmd] = ms
        res.push({
          label: cmd,
          filterText: cmd,
          data: {
            cmd
          }
        })
      }
    }
    return res
  }
}
