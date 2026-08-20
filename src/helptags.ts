import { BasicList, Uri, ListContext, ListItem, Neovim } from 'coc.nvim'
import fs from 'fs'
import path from 'path'
import { isParentFolder } from './util'

export class Helptags extends BasicList {
  public readonly name = 'helptags'
  public readonly description = 'helptags of vim'
  public readonly defaultAction = 'show'

  constructor(nvim: Neovim) {
    super()
    this.addAction('show', item => {
      nvim.command(`help ${item.data.name}`, true)
    })
    this.addLocationActions()
  }

  public async loadItems(_context: ListContext): Promise<ListItem[]> {
    let folders = await this.nvim.runtimePaths
    let result: ListItem[] = []
    let cwd = await this.nvim.call('getcwd') as string
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
    nvim.resumeNotification(false, true)
  }
}

export default Helptags
