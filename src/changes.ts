import { IList, ListAction, ListContext, ListItem, Neovim } from 'coc.nvim'
import colors from 'colors/safe'
const regex = /^[^\d]*(\d+)[^\d]+(\d+)[^\d]+(\d+)[^\w]+(.*)$/

export default class ChangeList implements IList {
  public readonly name = 'changes'
  public readonly description = 'changes list'
  public readonly defaultAction = 'jump'
  public actions: ListAction[] = []

  constructor(private nvim: Neovim) {
    this.actions.push({
      name: 'jump',
      execute: item => {
        if (Array.isArray(item)) return
        nvim.command(`normal! ${item.data.lnum}G${item.data.col}|zz`, true)
      }
    })
  }

  public async loadItems(_context: ListContext): Promise<ListItem[]> {
    const { nvim } = this
    let list = await nvim.eval('split(execute("changes"), "\n")') as string[]
    list = list.slice(1)
    list = list.filter(s => regex.test(s))

    return list.map(line => {
      let [, change, lnum, col, text] = line.match(regex)
      return {
        label: `${colors.magenta(change)}\t${colors.grey(lnum)}\t${colors.grey(col)}\t${text}`,
        filterText: text,
        data: { lnum, col }
      }
    })
  }
}
