import { Neovim } from '@chemzqm/neovim'
import { ChildProcess, spawn } from 'child_process'
import { BasicList, ListContext, ListTask, workspace } from 'coc.nvim'
import { EventEmitter } from 'events'
import path from 'path'
import readline from 'readline'
import { Location, Range } from 'vscode-languageserver-protocol'
import Uri from 'vscode-uri'
import minimatch from 'minimatch'

class Task extends EventEmitter implements ListTask {
  private process: ChildProcess
  constructor() {
    super()
  }

  public start(cmd: string, args: string[], cwd: string, patterns: string[]): void {
    this.process = spawn(cmd, args, { cwd })
    const rl = readline.createInterface(this.process.stdout)
    const range = Range.create(0, 0, 0, 0)
    let hasPattern = patterns.length > 0
    this.process.stderr.on('data', chunk => {
      this.emit('error', chunk.toString('utf8'))
    })

    rl.on('line', line => {
      if (hasPattern && patterns.some(p => minimatch(file, p))) return
      let file = path.join(cwd, line)
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

  constructor(nvim: Neovim) {
    super(nvim)
    this.addLocationActions()
  }

  public async loadItems(context: ListContext): Promise<ListTask> {
    let { nvim } = this
    let config = workspace.getConfiguration('list.source.files')
    let cmd = config.get<string>('command', 'rg')
    let args = config.get<string[]>('args', ['--color', 'never', '--files'])
    let patterns = config.get<string[]>('excludePatterns', [])
    let { window } = context
    let valid = await window.valid
    let cwd: string
    if (valid) {
      cwd = await nvim.call('getcwd', window.id)
    } else {
      cwd = await nvim.call('getcwd')
    }
    let task = new Task()
    task.start(cmd, args, cwd, patterns)
    return task
  }

  public doHighlight(): void {
  }
}
