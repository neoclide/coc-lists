import { ChildProcess, spawn } from 'child_process'
import { BasicList, ListContext, ListItem, ListTask, Neovim, workspace } from 'coc.nvim'
import { EventEmitter } from 'events'
import minimatch from 'minimatch'
import path from 'path'
import readline from 'readline'
import { Location, Position, Range } from 'vscode-languageserver-protocol'
import Uri from 'vscode-uri'
import { executable } from './util'
import { ansiparse } from './util/ansiparse'
import { convertOptions } from './util/option'

const lineRegex = /^(.+):(\d+):(\d+):(.*)/
const controlCode = '\x1b'

class Task extends EventEmitter implements ListTask {
  private process: ChildProcess
  constructor(private interactive: boolean) {
    super()
  }

  public start(cmd: string, args: string[], cwd: string, patterns: string[]): void {
    this.process = spawn(cmd, args, { cwd })
    this.process.on('error', e => {
      this.emit('error', e.message)
    })
    this.process.stderr.on('data', chunk => {
      console.error(chunk.toString('utf8')) // tslint:disable-line
    })
    const rl = readline.createInterface(this.process.stdout)
    let hasPattern = patterns.length > 0

    rl.on('line', line => {
      let ms: RegExpMatchArray
      let escaped: string
      if (line.indexOf(controlCode) !== -1) {
        let parts = ansiparse(line)
        escaped = parts.reduce((s, curr) => s + curr.text, '')
        ms = escaped.match(lineRegex)
      } else {
        ms = line.match(lineRegex)
        escaped = line
      }
      if (!ms) return
      let file = path.join(cwd, ms[1])
      if (hasPattern && patterns.some(p => minimatch(file, p))) return
      let pos = Position.create(Number(ms[2]) - 1, byteSlice(ms[4], 0, Number(ms[3]) - 1).length)
      let location = Location.create(Uri.file(file).toString(), Range.create(pos, pos))
      this.emit('data', {
        label: line,
        filterText: this.interactive ? '' : escaped,
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
  public readonly description = 'grep text by rg or ag'
  public readonly name = 'grep'
  public readonly defaultAction = 'open'
  public readonly detail = 'Literal match is used by default.\nTo use interactive mode, add `-I` to LIST OPTIONS.\nTo change colors, checkout `man rg` or `man ag`\nGrep source provide some uniformed options to ease differences between rg and ag.\n'
  public options = [{
    name: '-S, -smartcase',
    description: 'Use smartcase match.'
  }, {
    name: '-i, -ignorecase',
    description: 'Use ignorecase match.'
  }, {
    name: '-l, -literal',
    description: 'Treat the pattern as a literal string, used when -regex is not used.'
  }, {
    name: '-w, -word',
    description: 'Use word match.'
  }, {
    name: '-e, -regex',
    description: 'Use regex match.'
  }, {
    name: '-u, -skip-vcs-ignores',
    description: 'Don\'t respect version control ignore files(.gitignore, etc.)'
  }, {
    name: '-t, -extension EXTENSION',
    description: 'Grep files with specified extension only, could be used multiple times.'
  }]

  constructor(nvim: Neovim) {
    super(nvim)
    this.addLocationActions()
  }

  public async loadItems(context: ListContext): Promise<ListTask | ListItem[]> {
    let { nvim } = this
    let { interactive } = context.options
    let config = workspace.getConfiguration('list.source.grep')
    let cmd = config.get<string>('command', 'rg')
    let args = config.get<string[]>('args', []).slice()
    let useLiteral = config.get<boolean>('useLiteral', true)
    if (cmd == 'rg') {
      args.push('--color', 'always', '--vimgrep', '--colors', 'path:fg:white')
    } else if (cmd == 'ag') {
      args.push('--color', '--vimgrep')
    }
    if (!executable(cmd)) throw new Error(`Command '${cmd}' not found on $PATH`)
    if (interactive && !context.input) return []
    args.push(...context.args)
    if (context.input) {
      if (interactive && context.input.indexOf(' ') != -1) {
        let input = context.input.split(/\s+/).join('.*')
        if (!args.includes('-regex') && !args.includes('-e')) {
          args.push('-regex')
        }
        args.push(input)
      } else {
        args.push(context.input)
      }
    }

    let patterns = config.get<string[]>('excludePatterns', [])
    let { window } = context
    let valid = await window.valid
    let cwd: string
    if (valid) {
      cwd = await nvim.call('getcwd', window.id)
    } else {
      cwd = await nvim.call('getcwd')
    }
    let task = new Task(interactive)
    if (cmd == 'rg' || cmd == 'ag') {
      args = convertOptions(args, cmd, useLiteral)
    }
    task.start(cmd, args, cwd, patterns)
    return task
  }
}

function byteSlice(content: string, start: number, end?: number): string {
  let buf = Buffer.from(content, 'utf8')
  return buf.slice(start, end).toString('utf8')
}
