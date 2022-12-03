import { IList, ListAction, ListContext, ListItem, Neovim } from 'coc.nvim'
import colors from 'colors/safe'
import fs from 'fs'
import util from 'util'
import { pad } from './util/index'

const regex = /^\|:(\S+)\|\t(\S+)\t(.*)$/

export default class Commands implements IList {
  public readonly name = 'vimcommands'
  public readonly description = 'command list'
  public readonly defaultAction = 'execute'
  public actions: ListAction[] = []

  constructor(private nvim: Neovim) {
    this.actions.push({
      name: 'execute',
      execute: async item => {
        if (Array.isArray(item)) return
        let { command, shabang, hasArgs } = item.data
        if (!hasArgs) {
          nvim.command(command, true)
        } else {
          const feedableCommand = `:${command}${shabang ? '' : ' '}`
          const mode = await nvim.call('mode')
          const isInsertMode = mode.startsWith('i')
          if (isInsertMode) {
            // For some reason `nvim.feedkeys` doesn't support CSI escapes, even though the
            // docs say it should. So we force the escape here with double backslashes.
            nvim.command(`call feedkeys("\\<C-O>${feedableCommand}", 'n')`, true)
          } else {
            await nvim.feedKeys(feedableCommand, 'n', true)
          }
        }
      }
    })
    this.actions.push({
      name: 'open',
      execute: async item => {
        if (Array.isArray(item)) return
        let { command } = item.data
        if (!/^[A-Z]/.test(command)) return
        let res = await nvim.eval(`split(execute("verbose command ${command}"),"\n")[2]`) as string
        if (/Last\sset\sfrom/.test(res)) {
          let [filepath, _ ,line] = res.replace(/^\s+Last\sset\sfrom\s+/, '').split(/\s+/)
          if (line) {
            nvim.command(`edit +${line} ${filepath}`, true)
          } else {
            nvim.command(`edit +/${command} ${filepath}`, true)
          }
        }
      }
    })
  }

  public async loadItems(_context: ListContext): Promise<ListItem[]> {
    let { nvim } = this
    let list = await nvim.eval('split(execute("command"),"\n")') as string[]
    list = list.slice(1)
    let res: ListItem[] = []
    for (let str of list) {
      let name = str.slice(4).match(/\S+/)[0]
      let end = str.slice(4 + name.length)
      res.push({
        label: str.slice(0, 4) + colors.magenta(name) + end,
        filterText: name,
        data: {
          command: name,
          shabang: str.startsWith('!'),
          hasArgs: !end.match(/^\s*0\s/)
        }
      })
    }
    let help = await nvim.eval(`globpath($VIMRUNTIME, 'doc/index.txt')`) as string
    if (help && fs.existsSync(help)) {
      let content = await util.promisify(fs.readFile)(help, 'utf8')
      for (let line of content.split(/\r?\n/)) {
        let ms = line.match(regex)
        if (ms) {
          let [, cmd, chars, description] = ms
          res.push({
            label: `    ${colors.magenta(cmd)}${pad(cmd, 20)}${chars}${pad(chars, 30)}${description}`,
            filterText: cmd,
            data: {
              command: cmd,
              shabang: false,
              hasArgs: true
            }
          })
        }
      }
    }
    return res
  }
}
