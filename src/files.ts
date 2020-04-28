import { ChildProcess, spawn } from 'child_process'
import { BasicList, ListContext, ListTask, Neovim, Uri, workspace } from 'coc.nvim'
import { EventEmitter } from 'events'
import fs from 'fs'
import minimatch from 'minimatch'
import path from 'path'
import readline from 'readline'
import { Location, Range } from 'vscode-languageserver-protocol'
import { executable } from './util'

class Task extends EventEmitter implements ListTask {
  private processes: ChildProcess[] = []

  public start(cmd: string, args: string[], cwds: string[], patterns: string[]): void {
    let remain = cwds.length
    for (let cwd of cwds) {
      let process = spawn(cmd, args, { cwd })
      this.processes.push(process)
      process.on('error', e => {
        this.emit('error', e.message)
      })
      const rl = readline.createInterface(process.stdout)
      const range = Range.create(0, 0, 0, 0)
      let hasPattern = patterns.length > 0
      process.stderr.on('data', chunk => {
        console.error(chunk.toString('utf8')) // tslint:disable-line
      })

      rl.on('line', line => {
        let file = line
        if (file.indexOf(cwd) < 0) {
          file = path.join(cwd, line)
        }
        if (hasPattern && patterns.some(p => minimatch(file, p))) return
        let location = Location.create(Uri.file(file).toString(), range)
        this.emit('data', {
          label: line,
          location
        })
      })
      rl.on('close', () => {
        remain = remain - 1
        if (remain == 0) {
          this.emit('end')
        }
      })
    }
  }

  public dispose(): void {
    for (let process of this.processes) {
      if (!process.killed) {
        process.kill()
      }
    }
  }
}

export default class FilesList extends BasicList {
  public readonly name = 'files'
  public readonly defaultAction = 'open'
  public description = 'Search files by rg or ag'
  public readonly detail = `Install ripgrep in your $PATH to have best experience.
Files is searched from current cwd by default.
Provide directory names as arguments to search other directories.
Use 'list.source.files.command' configuration for custom search command.
Use 'list.source.files.args' configuration for custom command arguments.
Note that rg ignore hidden files by default.`
  public options = [{
    name: '-F, -folder',
    description: 'Search files from current workspace folder instead of cwd.'
  }, {
    name: '-W, -workspace',
    description: 'Search files from all workspace folders instead of cwd.'
  }]

  constructor(nvim: Neovim) {
    super(nvim)
    this.addLocationActions()
  }

  private getArgs(args: string[], defaultArgs: string[]): string[] {
    return args.length ? args : defaultArgs
  }

  public getCommand(): { cmd: string, args: string[] } {
    let config = workspace.getConfiguration('list.source.files')
    let cmd = config.get<string>('command', '')
    let args = config.get<string[]>('args', [])
    if (!cmd) {
      if (executable('rg')) {
        return { cmd: 'rg', args: this.getArgs(args, ['--color', 'never', '--files']) }
      } else if (executable('ag')) {
        return { cmd: 'ag', args: this.getArgs(args, ['-f', '-g', '.', '--nocolor']) }
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
    let { window, args } = context
    let options = this.parseArguments(args)
    let res = this.getCommand()
    if (!res) return null
    let used = res.args.concat(['-F', '-folder', '-W', '-workspace'])
    let extraArgs = args.filter(s => used.indexOf(s) == -1)
    let cwds: string[]
    let dirArgs = []
    let searchArgs = []
    if (options.folder) {
      cwds = [workspace.rootPath]
    } else if (options.workspace) {
      cwds = workspace.workspaceFolders.map(f => Uri.parse(f.uri).fsPath)
    } else {
      if (extraArgs.length > 0) {
        // tslint:disable-next-line: prefer-for-of
        for (let i = 0; i < extraArgs.length; i++) {
          let d = await nvim.call('expand', extraArgs[i])
          try {
            if (fs.lstatSync(d).isDirectory()) {
              dirArgs.push(d)
            } else {
              searchArgs.push(d)
            }
          } catch (e) {
            searchArgs.push(d)
          }
        }
      }
      if (dirArgs.length > 0) {
        cwds = dirArgs
      } else {
        let valid = await window.valid
        if (valid) {
          cwds = [await nvim.call('getcwd', window.id)]
        } else {
          cwds = [await nvim.call('getcwd')]
        }
      }
    }
    let task = new Task()
    let excludePatterns = this.getConfig().get<string[]>('excludePatterns', [])
    task.start(res.cmd, res.args.concat(searchArgs), cwds, excludePatterns)
    return task
  }
}
