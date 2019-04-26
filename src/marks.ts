import { IList, ListAction, ListContext, ListItem, Neovim } from 'coc.nvim'
import colors from 'colors/safe'

const regex = /^\s*(\S)\s+(\d+)\s+(\d+)\s*(.*)$/

export default class Marks implements IList {
  public readonly name = 'marks'
  public readonly description = 'marks list'
  public readonly defaultAction = 'jump'
  public actions: ListAction[] = []

  constructor(private nvim: Neovim) {
    this.actions.push({
      name: 'jump',
      execute: item => {
        if (Array.isArray(item)) return
        nvim.command('normal! `' + item.data.name + 'zz', true)
      }
    })
  }

  public async loadItems(_context: ListContext): Promise<ListItem[]> {
    let { nvim } = this
    let list = await nvim.eval('split(execute("marks"), "\n")') as string[]
    list = list.slice(1)
    list = list.filter(s => regex.test(s))
    return list.map(line => {
      let [, name, lnum, col, text] = line.match(regex)
      return {
        label: `${colors.magenta(name)}\t${text}\t${colors.grey(lnum)}\t${colors.grey(col)}`,
        filterText: name + ' ' + text,
        data: { name }
      }
    })
  }
}
