import { BasicList, commands, ListContext, ListItem, Mru, Neovim, Uri, workspace } from 'coc.nvim'
import fs from 'fs'
import mkdirp from 'mkdirp'
import os from 'os'
import path from 'path'
import { promisify } from 'util'
import { Location, Range } from 'vscode-languageserver-protocol'

export default class SessionList extends BasicList {
  public readonly name = 'sessions'
  public readonly defaultAction = 'load'
  public description = 'session list'
  public detail = `After session load, coc service would be restarted.`
  private mru: Mru

  constructor(nvim: Neovim, private extensionPath: string) {
    super(nvim)
    this.mru = workspace.createMru('sessions')
    this.addLocationActions()

    this.addAction('delete', async item => {
      let filepath = item.data.filepath
      await this.mru.remove(filepath)
      await promisify(fs.unlink)(filepath)
    }, { reload: true, persist: true })

    this.addAction('load', async (item, _context) => {
      let filepath = item.data.filepath
      await this.loadSession(filepath)
    })

    this.disposables.push(commands.registerCommand('session.save', async (name?: string) => {
      if (!name) {
        name = await nvim.getVvar('this_session') as string
        if (!name) {
          let defaultValue = path.basename(workspace.rootPath)
          name = await workspace.requestInput('session name', defaultValue)
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

    this.disposables.push(commands.registerCommand('session.load', async (name?: string) => {
      if (!name) {
        let folder = await this.getSessionFolder()
        let files = await promisify(fs.readdir)(folder, { encoding: 'utf8' })
        files = files.filter(p => p.endsWith('.vim'))
        files = files.map(p => path.basename(p, '.vim'))
        let idx = await workspace.showQuickpick(files, 'choose session:')
        if (idx == -1) return
        name = files[idx]
      }
      let filepath: string
      if (path.isAbsolute(name)) {
        filepath = name
      } else {
        let folder = await this.getSessionFolder()
        filepath = path.join(folder, name.endsWith('.vim') ? name : `${name}.vim`)
      }
      setTimeout(async () => {
        await this.loadSession(filepath)
      }, 30)
    }))

    this.disposables.push(commands.registerCommand('session.restart', async () => {
      if (!workspace.isNvim || process.env.TERM_PROGRAM != 'iTerm.app') {
        workspace.showMessage('Sorry, restart support iTerm and neovim only.', 'warning')
        return
      }
      let filepath = await this.nvim.getVvar('this_session') as string
      if (!filepath) {
        let folder = await this.getSessionFolder()
        filepath = path.join(folder, 'default.vim')
      }
      await nvim.command(`silent mksession! ${filepath}`)
      let cwd = await nvim.call('getcwd')
      let cmd = `${path.join(this.extensionPath, 'nvimstart')} ${filepath} ${cwd}`
      nvim.call('jobstart', [cmd, { detach: 1 }], true)
      nvim.command('silent! wa | silent quitall!', true)
    }))

    let cfg = workspace.getConfiguration('session')
    let automake = cfg.get<boolean>('saveOnVimLeave', true)
    if (automake) {
      this.disposables.push(workspace.registerAutocmd({
        event: 'VimLeavePre',
        request: true,
        callback: async () => {
          let curr = await this.nvim.getVvar('this_session') as string
          if (!curr) {
            let folder = await this.getSessionFolder()
            curr = path.join(folder, 'default.vim')
          }
          await nvim.command(`silent mksession! ${curr}`)
        }
      }))
    }
  }

  private async loadSession(filepath: string): Promise<void> {
    let { nvim } = this
    let config = workspace.getConfiguration('session')
    let restart = config.get<boolean>('restartOnSessionLoad', false)
    if (restart && workspace.isNvim && process.env.TERM_PROGRAM.startsWith('iTerm.app')) {
      let content = await promisify(fs.readFile)(filepath, 'utf8')
      let line = content.split(/\r?\n/).find(s => s.startsWith('cd '))
      let cwd = line.replace(/^cd\s+/, '')
      let cmd = `${path.join(this.extensionPath, 'nvimstart')} ${filepath} ${cwd}`
      nvim.call('jobstart', [cmd, { detach: 1 }], true)
      nvim.command('silent! wa | silent quitall!', true)
    } else {
      await this.mru.add(filepath)
      let escaped = await nvim.call('fnameescape', [filepath])
      nvim.pauseNotification()
      nvim.command('noautocmd silent! %bwipeout!', true)
      nvim.command(`silent! source ${escaped}`, true)
      nvim.command('CocRestart', true)
      await nvim.resumeNotification(false, true)
    }
  }

  private async getSessionFolder(): Promise<string> {
    let config = workspace.getConfiguration('session')
    let directory = config.get<string>('directory', '')
    if (directory && /^~/.test(directory)) {
      directory = directory.replace(/^~/, os.homedir())
    }
    if (!directory) directory = path.join(os.homedir(), '.vim/sessions')
    if (!fs.existsSync(directory)) {
      mkdirp.sync(directory)
    }
    return directory
  }

  public async loadItems(_context: ListContext): Promise<ListItem[]> {
    let folder = await this.getSessionFolder()
    let files = await promisify(fs.readdir)(folder, { encoding: 'utf8' })
    files = files.filter(p => p.endsWith('.vim'))
    let range = Range.create(0, 0, 0, 0)
    let curr = await this.nvim.getVvar('this_session') as string
    let arr = await Promise.all(files.map(file => {
      let filepath = path.join(folder, file)
      return promisify(fs.stat)(filepath).then(stat => {
        return {
          atime: stat.atime,
          filepath
        }
      })
    }))
    arr.sort((a, b) => {
      return a.atime.getTime() - b.atime.getTime()
    })
    files = arr.map(o => o.filepath)
    return files.map(filepath => {
      let uri = Uri.file(filepath).toString()
      let location = Location.create(uri, range)
      let name = path.basename(filepath, '.vim')
      let active = curr && curr == filepath
      return {
        label: `${active ? '*' : ' '} ${name}\t${filepath}`,
        data: { filepath },
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
