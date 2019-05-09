import { BasicList, workspace, ListContext, commands, ListItem, Neovim } from 'coc.nvim'
import readline from 'readline'
import { Location, Position, Range } from 'vscode-languageserver-protocol'
import Uri from 'vscode-uri'
import fs from 'fs'
import path from 'path'

export default class Helptags extends BasicList {
  public readonly name = 'tags'
  public readonly description = 'search from tags'
  public readonly defaultAction = 'open'

  constructor(nvim: Neovim) {
    super(nvim)
    this.addLocationActions()

    this.disposables.push(commands.registerCommand('tags.generate', async () => {
      let config = workspace.getConfiguration('list.source.tags')
      let cmd = config.get<string>('command', 'ctags -R .')
      let res = await workspace.runTerminalCommand(cmd)
      if (res.success) workspace.showMessage('tagfile generated')
    }))
  }

  public async loadItems(_context: ListContext): Promise<ListItem[]> {
    let { nvim } = this
    let cwd = await nvim.call('getcwd') as string
    let tagfiles = await nvim.call('tagfiles') as string[]
    if (!tagfiles || tagfiles.length == 0) {
      throw new Error('no tag files found, use ":CocCommand tags.generate" to generate tagfile.')
    }
    let result: ListItem[] = []
    await Promise.all(tagfiles.map(file => {
      return new Promise<void>(resolve => {
        let filepath = path.isAbsolute(file) ? file : path.join(cwd, file)
        let dirname = path.dirname(filepath)
        const rl = readline.createInterface({
          input: fs.createReadStream(filepath, { encoding: 'utf8' }),
        })
        rl.on('line', line => {
          if (line.startsWith('!')) return
          let [name, file, pattern] = line.split('\t')
          if (!pattern) return
          let fullpath = path.join(dirname, file)
          let uri = Uri.file(fullpath).toString()
          let relativeFile = fullpath.startsWith(cwd) ? path.relative(cwd, fullpath) : fullpath
          result.push({
            label: `${name}\t${relativeFile}`,
            filterText: name,
            location: {
              uri,
              line: pattern.replace(/^\/\^/, '').replace(/\$\/;?"?$/, ''),
              text: name
            }
          })
        })
        rl.on('error', e => {
          nvim.errWrite(`Read file ${file} error: ${e.message}`)
          resolve()
        })
        rl.on('close', () => {
          resolve()
        })
      })
    }))
    return result
  }

  public doHighlight(): void {
    let { nvim } = this
    nvim.pauseNotification()
    nvim.command('syntax match CocTagsName /\\v^[^\\t]+/ contained containedin=CocTagsLine', true)
    nvim.command('syntax match CocTagsFile /\\t.*$/ contained containedin=CocTagsLine', true)
    nvim.command('highlight default link CocTagsName Identifier', true)
    nvim.command('highlight default link CocTagsFile Comment', true)
    nvim.resumeNotification(false, true).catch(_e => {
      // noop
    })
  }
}
