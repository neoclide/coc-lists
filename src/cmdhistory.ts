import { IList, ListAction, ListContext, ListItem, Neovim } from 'coc.nvim'

const regex = /^\s*\d+\s+(.*)$/

export default class Cmdhistory implements IList {
  public readonly name = 'cmdhistory'
  public readonly description = 'history of vim commands'
  public readonly defaultAction = 'execute'
  public actions: ListAction[] = []

  constructor(private nvim: Neovim) {
    this.actions.push({
      name: 'execute',
      execute: async item => {
        if (Array.isArray(item)) return
        nvim.command(item.data.cmd, true)
      }
    })
  }

  public async loadItems(_context: ListContext): Promise<ListItem[]> {
    let { nvim } = this
    let list = await nvim.eval(`split(execute("history cmd"),"\n")`) as string[]
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
