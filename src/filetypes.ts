import { IList, ListContext, ListItem, Neovim, ListAction } from 'coc.nvim'
import { distinct } from './util'

export default class Filetypes implements IList {
  public readonly name = 'filetypes'
  public readonly description = 'available filetypes'
  public readonly defaultAction = 'set'
  public actions: ListAction[] = []

  constructor(private nvim: Neovim) {
    this.actions.push({
      name: 'set',
      execute: item => {
        if (Array.isArray(item)) {
          for (let i of item) {
            nvim.command(`setf ${i.label}`, true)
          }
        } else {
          nvim.command(`setf ${item.label}`, true)
        }
      }
    })
  }

  public async loadItems(_context: ListContext): Promise<ListItem[]> {
    let { nvim } = this
    let filetypes = await nvim.eval(`sort(map(split(globpath(&rtp, 'syntax/*.vim'), '\n'),'fnamemodify(v:val, ":t:r")'))`) as string[]
    filetypes = distinct(filetypes)
    return filetypes.map(filetype => {
      return { label: filetype }
    })
  }
}
