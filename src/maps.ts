import { IList, ListAction, ListContext, ListItem, Neovim } from 'coc.nvim'
import colors from 'colors/safe'

const regex = /^(\S+)\s+(\S+)\s+(.*)$/

export default class Maps implements IList {
  public readonly name = 'maps'
  public readonly description = 'key mappings'
  public readonly defaultAction = 'open'
  public actions: ListAction[] = []
  public options = [{
    name: '-mode=[i,n,v,x,s]',
    description: 'Filter mappings by mode.'
  }]

  constructor(private nvim: Neovim) {
    this.actions.push({
      name: 'open',
      execute: async item => {
        if (Array.isArray(item)) return
        let { mode, key } = item.data
        let res = await nvim.eval(`split(execute("verbose ${mode}map ${key}"),"\n")[-1]`) as string
        if (/Last\sset\sfrom/.test(res)) {
          let filepath = res.replace(/^\s+Last\sset\sfrom\s+/, '')
          nvim.command(`edit +/${key} ${filepath}`, true)
        }
      }
    })
  }

  public async loadItems(context: ListContext): Promise<ListItem[]> {
    let { nvim } = this
    let mode = ''
    for (let arg of context.args) {
      if (arg.startsWith('-mode=')) {
        mode = arg.replace('-mode=', '')
      }
    }
    let list = await nvim.eval(`split(execute("verbose ${mode}map"),"\n")`) as string[]
    let res: ListItem[] = []
    for (let line of list) {
      let ms = line.match(regex)
      if (ms) {
        let [, mode, key, more] = ms
        res.push({
          label: ` ${colors.magenta(mode)}\t${colors.blue(key)}\t${more}`,
          filterText: `${key} ${more}`,
          data: {
            mode,
            key,
          }
        })
      }
    }
    return res
  }
}
