import { BasicList, ListContext, ListItem, Neovim, workspace } from 'coc.nvim'
import { Location, Position, Range } from 'vscode-languageserver-protocol'
import Uri from 'vscode-uri'
import fs from 'fs'
import path from 'path'
import { isParentFolder } from './util'

export default class Helptags extends BasicList {
  public readonly name = 'helptags'
  public readonly description = 'helptags of vim'
  public readonly defaultAction = 'show'

  constructor(nvim: Neovim) {
    super(nvim)
    this.addAction('show', item => {
      nvim.command(`help ${item.data.name}`, true)
    })
    this.addLocationActions()
  }

  public async loadItems(_context: ListContext): Promise<ListItem[]> {
    let rtp = workspace.env.runtimepath
    if (!rtp) return []
    let folders = rtp.split(',')
    let result: ListItem[] = []
    let cwd = await this.nvim.call('getcwd')
    await Promise.all(folders.map(folder => {
      return new Promise<void>(resolve => {
        let file = path.join(folder, 'doc/tags')
        fs.readFile(file, 'utf8', (err, content) => {
          if (err) return resolve()
          let lines = content.split(/\r?\n/)
          for (let line of lines) {
            if (line) {
              let [name, filepath, regex] = line.split('\t')
              let fullpath = path.join(folder, 'doc', filepath)
              let uri = Uri.file(fullpath).toString()
              let file = isParentFolder(cwd, fullpath) ? path.relative(cwd, fullpath) : fullpath
              result.push({
                label: `${name}\t${file}`,
                filterText: name,
                location: {
                  uri,
                  line: regex.replace(/^\//, '').replace(/\$\//, ''),
                  text: name
                },
                data: { name }
              })
            }
          }
          resolve()
        })
      })
    }))
    return result
  }

  public doHighlight(): void {
    let { nvim } = this
    nvim.pauseNotification()
    nvim.command('syntax match CocHelptagsName /\\v^[^\\t]+/ contained containedin=CocHelptagsLine', true)
    nvim.command('syntax match CocHelptagsFile /\\t.*$/ contained containedin=CocHelptagsLine', true)
    nvim.command('highlight default link CocHelptagsName Identifier', true)
    nvim.command('highlight default link CocHelptagsFile Comment', true)
    nvim.resumeNotification(false, true).catch(_e => {
      // noop
    })
  }
}
