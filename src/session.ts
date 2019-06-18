import { Uri, BasicList, events, Mru, commands, Document, ListContext, ListItem, Neovim, workspace, WorkspaceConfiguration } from 'coc.nvim'
import fs from 'fs'
import os from 'os'
import minimatch from 'minimatch'
import path from 'path'
import { Location, Range } from 'vscode-languageserver-protocol'
import { wait, isParentFolder } from './util'
import { promisify } from 'util'

export default class SessionList extends BasicList {
  public readonly name = 'sessions'
  public readonly defaultAction = 'load'
  public description = 'session list'
  public detail = `After session load, coc service would be restarted.`
  private config: WorkspaceConfiguration
  private mru: Mru

  constructor(nvim: Neovim) {
    super(nvim)
    this.mru = workspace.createMru('sessions')
    this.config = workspace.getConfiguration('list.source.sessions')
    this.addLocationActions()

    this.addAction('delete', async item => {
      let filepath = Uri.parse(item.location.uri).fsPath
      await this.mru.remove(filepath)
      await promisify(fs.unlink)(filepath)
    }, { reload: true, persist: true })

    this.addAction('load', async (item, context) => {
      let filepath = Uri.parse(item.location.uri).fsPath
      await this.mru.add(filepath)
      let escaped = await nvim.call('fnameescape', [filepath])
      nvim.pauseNotification()
      nvim.command('noautocmd silent! %bwipeout!', true)
      nvim.command(`silent! source ${escaped}`, true)
      nvim.command('CocRestart', true)
      await nvim.resumeNotification(false, true)
    })

    this.disposables.push(commands.registerCommand('session.save', async (name?: string) => {
      if (!name) {
        name = await nvim.getVvar('this_session') as string
        if (!name) {
          let defaultValue = path.basename(workspace.rootPath)
          name = await workspace.requestInput('session name:', defaultValue)
          if (!name) return
        }
      }
      if (!name.endsWith('.vim')) name = name + '.vim'
      let escaped: string
      if (!path.isAbsolute(name)) {
        let folder = await this.getSessionFolder()
        escaped = await nvim.call('fnameescape', [path.join(folder, name)])
      } else {
        escaped = await nvim.call('fnameescape', [name])
        name = path.basename(name, '.vim')
      }
      await nvim.command(`silent mksession! ${escaped}`)
      workspace.showMessage(`Saved session: ${name}`, 'more')
    }))
    this.disposables.push(workspace.registerAutocmd({
      event: 'VimLeavePre',
      request: true,
      callback: async () => {
        let curr = await this.nvim.getVvar('this_session') as string
        await nvim.command(`silent mksession! ${curr}`)
      }
    }))
  }

  private async getSessionFolder(): Promise<string> {
    let config = workspace.getConfiguration('session')
    let directory = config.get<string>('directory', '')
    if (!directory) directory = path.join(os.homedir(), '.vim/sessions')
    if (!fs.existsSync(directory)) {
      await promisify(fs.mkdir)(directory, { recursive: true })
    }
    return directory
  }

  public async loadItems(context: ListContext): Promise<ListItem[]> {
    let folder = await this.getSessionFolder()
    let files = await promisify(fs.readdir)(folder, { encoding: 'utf8' })
    let range = Range.create(0, 0, 0, 0)
    let curr = await this.nvim.getVvar('this_session') as string
    return files.map(file => {
      let filepath = path.join(folder, file)
      let location = Location.create(Uri.file(filepath).toString(), range)
      let name = path.basename(filepath, '.vim')
      let active = curr && curr == filepath
      return {
        label: `${active ? '*' : ' '} ${name}\t${filepath.replace(os.homedir(), '~')}`,
        location
      }
    })
  }

  public doHighlight(): void {
    let { nvim } = this
    nvim.pauseNotification()
    nvim.command('syntax match CocSessionsActivited /\\v^\\*/ contained containedin=CocSessionsLine', true)
    nvim.command('syntax match CocSessionsName /\\v%3c\\S+/ contained containedin=CocSessionsLine', true)
    nvim.command('syntax match CocSessionsRoot /\\v\\t[^\\t]*$/ contained containedin=CocSessionsLine', true)
    nvim.command('highlight default link CocSessionsActivited Special', true)
    nvim.command('highlight default link CocSessionsName Type', true)
    nvim.command('highlight default link CocSessionsRoot Comment', true)
    nvim.resumeNotification().catch(_e => {
      // noop
    })
  }
}
