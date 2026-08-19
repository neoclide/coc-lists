import { IList, ListAction, ListContext, ListItem, Neovim } from 'coc.nvim'
import colors from 'colors/safe'
import { findVimSource } from './util'

export class Functions implements IList {
  public readonly name = 'functions'
  public readonly description = 'function list'
  public readonly defaultAction = 'open'
  public actions: ListAction[] = []

  constructor(private nvim: Neovim) {
    this.actions.push({
      name: 'open',
      execute: async item => {
        if (Array.isArray(item)) return
        let { funcname } = item.data
        let lines = await nvim.eval(`split(execute("verbose function ${funcname}"),"\n")`) as string[]
        let source = findVimSource(lines)
        if (!source) return
        let filepath = await nvim.call('fnameescape', [source.filepath]) as string
        if (source.line) {
          nvim.command(`edit +${source.line} ${filepath}`, true)
        } else {
          nvim.command(`edit +/${funcname} ${filepath}`, true)
        }
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

export default Functions
