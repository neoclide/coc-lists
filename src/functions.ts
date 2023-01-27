import { IList, ListAction, ListContext, ListItem, Neovim, window } from 'coc.nvim'
import colors from 'colors/safe'

export default class Functions implements IList {
  public readonly name = 'functions'
  public readonly description = 'function list'
  public readonly defaultAction = 'open'
  public actions: ListAction[] = []

  constructor(private nvim: Neovim) {
    this.actions.push({
      name: 'open',
      execute: async item => {
        if (Array.isArray(item)) return
        const { funcname } = item.data
        const res = await nvim.eval(`split(execute("verbose function ${funcname}"),"\n")[1]`) as string

        const [filepath, _ ,line] = res.replace(/^\s+Last\sset\sfrom\s+/, '').split(/\s+/)
        if (line) {
          nvim.command(`edit +${line} ${filepath}`, true)
        } else {
          nvim.command(`edit +/${funcname} ${filepath}`, true)
        }
      }
    })
    this.actions.push({
      name: 'break',
      execute: async item => {
        if (Array.isArray(item)) return
        const { funcname } = item.data
        const breakcmd = `breakadd func ${funcname}`
        nvim.command(breakcmd, true)
        // close coc-list after setting breakpoint
        nvim.command("CocListCancel", true)
        window.showMessage(breakcmd)
      }
    })
  }

  public async loadItems(_context: ListContext): Promise<ListItem[]> {
    let { nvim } = this
    let list = await nvim.eval('split(execute("function"),"\n")') as string[]
    list = list.slice(1)
    let res: ListItem[] = []
    for (let str of list) {
      let name = str.slice(8).split(/\(/)[0]
      let end = str.slice(8 + name.length)
      res.push({
        label: str.slice(0, 8) + colors.magenta(name) + end,
        filterText: name,
        data: {
          funcname: name
        }
      })
    }
    return res
  }
}
