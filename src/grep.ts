import { Neovim } from '@chemzqm/neovim'
import { ChildProcess, spawn } from 'child_process'
import { BasicList, ListContext, ListTask, workspace } from 'coc.nvim'
import { EventEmitter } from 'events'
import path from 'path'
import readline from 'readline'
import { Location, Position, Range } from 'vscode-languageserver-protocol'
import Uri from 'vscode-uri'
import minimatch from 'minimatch'
import { convertOptions } from './option'
import { ansiparse } from './ansiparse'

const lineRegex = /^(.+):(\d+):(\d+):(.*)/
const controlCode = '\x1b'

class Task extends EventEmitter implements ListTask {
  private process: ChildProcess
  constructor() {
    super()
  }

  public start(cmd: string, args: string[], cwd: string, patterns: string[]): void {
    this.process = spawn(cmd, args, { cwd })
    const rl = readline.createInterface(this.process.stdout)
    let hasPattern = patterns.length > 0
    this.process.stderr.on('data', chunk => {
      this.emit('error', chunk.toString('utf8'))
    })

    rl.on('line', line => {
      let ms: RegExpMatchArray
      if (line.indexOf(controlCode) !== -1) {
        let parts = ansiparse(line)
        let content = parts.reduce((s, curr) => s + curr.text, '')
        ms = content.match(lineRegex)
      } else {
        ms = line.match(lineRegex)
      }
      if (!ms) return
      let file = path.join(cwd, ms[1])
      if (hasPattern && patterns.some(p => minimatch(file, p))) return
      let pos = Position.create(Number(ms[2]) - 1, byteSlice(ms[4], 0, Number(ms[3]) - 1).length)
      let location = Location.create(Uri.file(file).toString(), Range.create(pos, pos))
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

export default class GrepList extends BasicList {
  public readonly interactive = true
  public readonly name = 'grep'
  public readonly defaultAction = 'open'
  public description = 'grep text by rg or ag'

  constructor(nvim: Neovim) {
    super(nvim)
    this.addLocationActions()
  }

  public async loadItems(context: ListContext): Promise<ListTask> {
    let { nvim } = this
    let config = workspace.getConfiguration('list.source.grep')
    let cmd = config.get<string>('command', 'rg')
    let args = config.get<string[]>('args', []).slice()
    if (cmd == 'rg') {
      args.push('--color', 'always', '--vimgrep', '--colors', 'path:fg:white')
    } else if (cmd == 'ag') {
      args.push('--color', '--vimgrep')
    }
    if (context.options.interactive && !context.input) return null
    args.push(...context.args)
    if (context.input) args.push(context.input)

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
    if (cmd == 'rg' || cmd == 'ag') {
      args = convertOptions(args, cmd)
    }
    task.start(cmd, args, cwd, patterns)
    return task
  }
}

function byteSlice(content: string, start: number, end?: number): string {
  let buf = Buffer.from(content, 'utf8')
  return buf.slice(start, end).toString('utf8')
}
