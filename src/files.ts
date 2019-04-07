import { ChildProcess, spawn } from 'child_process'
import { BasicList, ListContext, ListTask, Neovim, workspace } from 'coc.nvim'
import { EventEmitter } from 'events'
import findUp from 'find-up'
import minimatch from 'minimatch'
import path from 'path'
import readline from 'readline'
import { Location, Range } from 'vscode-languageserver-protocol'
import Uri from 'vscode-uri'
import { executable } from './util'

class Task extends EventEmitter implements ListTask {
  private process: ChildProcess
  constructor() {
    super()
  }

  public start(cmd: string, args: string[], cwd: string, patterns: string[]): void {
    this.process = spawn(cmd, args, { cwd })
    this.process.on('error', e => {
      this.emit('error', e.message)
    })
    const rl = readline.createInterface(this.process.stdout)
    const range = Range.create(0, 0, 0, 0)
    let hasPattern = patterns.length > 0
    this.process.stderr.on('data', chunk => {
      console.error(chunk.toString('utf8')) // tslint:disable-line
    })

    rl.on('line', line => {
      let file = path.join(cwd, line)
      if (hasPattern && patterns.some(p => minimatch(file, p))) return
      let location = Location.create(Uri.file(file).toString(), range)
      this.emit('data', {
        label: line,
        location
      })
    })
    rl.on('close', () => {
      this.emit('end')
    })
  }

  public dispose(): void {
    if (this.process) {
      this.process.kill()
    }
  }
}

export default class FilesList extends BasicList {
  public readonly name = 'files'
  public readonly defaultAction = 'open'
  public description = 'search file from cwd'
  private excludePatterns: string[]

  constructor(nvim: Neovim) {
    super(nvim)
    this.addLocationActions()
    let config = workspace.getConfiguration('list.source.files')
    this.excludePatterns = config.get<string[]>('excludePatterns', [])
    workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('list.source.files')) {
        let config = workspace.getConfiguration('list.source.files')
        this.excludePatterns = config.get<string[]>('excludePatterns', [])
      }
    })
  }

  private getArgs(args: string[], defaultArgs: string[]): string[] {
    return args.length ? args : defaultArgs
  }

  public getCommand(cwd: string): { cmd: string, args: string[] } {
    let config = workspace.getConfiguration('list.source.files')
    let cmd = config.get<string>('command', '')
    let args = config.get<string[]>('args', [])
    if (!cmd) {
      if (executable('rg')) {
        return { cmd: 'rg', args: this.getArgs(args, ['--color', 'never', '--files']) }
      } else if (executable('ag')) {
        return { cmd: 'ag', args: this.getArgs(args, ['-f', '-g', '.', '--nocolor']) }
      } else if (executable('git') && findUp.sync('.git', { cwd })) {
        return { cmd: 'git', args: this.getArgs(args, ['ls-files']) }
      } else if (process.platform == 'win32') {
        return { cmd: 'dir', args: this.getArgs(args, ['/a-D', '/S', '/B']) }
      } else if (executable('find')) {
        return { cmd: 'find', args: this.getArgs(args, ['.', '-type', 'f']) }
      } else {
        throw new Error('Unable to find command for files list.')
        return null
      }
    } else {
      return { cmd, args }
    }
  }

  public async loadItems(context: ListContext): Promise<ListTask> {
    let { nvim } = this
    let { window } = context
    let valid = await window.valid
    let cwd: string
    if (valid) {
      cwd = await nvim.call('getcwd', window.id)
    } else {
      cwd = await nvim.call('getcwd')
    }
    let res = this.getCommand(cwd)
    if (!res) return null
    let task = new Task()
    task.start(res.cmd, res.args, cwd, this.excludePatterns)
    return task
  }
}
