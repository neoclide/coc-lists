import { IList, ListAction, ListContext, ListItem, Neovim } from 'coc.nvim'
import colors from 'colors/safe'
const regex = /^[^\w]*(\w)[^\w|"]+(".)[^\w]+(.*)$/

export default class Registers implements IList {
  public readonly name = 'registers'
  public readonly description = 'registers list'
  public readonly defaultAction = 'append'
  public actions: ListAction[] = []

  constructor(private nvim: Neovim) {
    this.actions.push({
      name: 'append',
      execute: item => {
        if (Array.isArray(item)) return
        nvim.command('normal! ' + item.data.name + 'p', true)
      }
    })
    this.actions.push({
      name: 'prepend',
      execute: item => {
        if (Array.isArray(item)) return
        nvim.command('normal! ' + item.data.name + 'P', true)
      }
    })
  }

  public async loadItems(_context: ListContext): Promise<ListItem[]> {
    const { nvim } = this
    let list = await nvim.eval('split(execute("registers"), "\n")') as string[]
    list = list.slice(1)
    list = list.filter(s => regex.test(s))

    return list.map(line => {
      let [, type, name, content] = line.match(regex)
      return {
        label: `${colors.grey(type)}\t${colors.magenta(name)}\t${content}`,
        filterText: content,
        data: { name }
      }
    })
  }
}
