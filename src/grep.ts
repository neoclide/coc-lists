import { ChildProcess, spawn } from 'child_process'
import { BasicList, ListContext, ListItem, ListTask, Location, Neovim, Position, Range, workspace } from 'coc.nvim'
import { EventEmitter } from 'events'
import minimatch from 'minimatch'
import path from 'path'
import readline from 'readline'
import { URI } from 'vscode-uri'
import { executable } from './util'
import { ansiparse } from './util/ansiparse'
import { convertOptions } from './util/option'

const lineRegex = /^(.+):(\d+):(\d+):(.*)/
const controlCode = '\x1b'

class Task extends EventEmitter implements ListTask {
  private processes: ChildProcess[] = []
  private lines: number = 0
  constructor(private interactive: boolean) {
    super()
  }

  public start(cmd: string, args: string[], cwds: string[], patterns: string[], maxLines: number): void {
    for (let cwd of cwds) {
      let remain = cwds.length
      let process = spawn(cmd, args, { cwd })
      process.on('error', e => {
        this.emit('error', e.message)
      })
      process.stderr.on('data', chunk => {
        let parts = ansiparse(chunk.toString('utf8'))
        let escaped = parts.reduce((s, curr) => s + curr.text, '')
        console.error(escaped) // tslint:disable-line
      })
      const rl = readline.createInterface(process.stdout)
      let hasPattern = patterns.length > 0
      rl.on('line', line => {
        if (this.interactive && (maxLines > 0) && (this.lines >= maxLines)) return
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
        let location = Location.create(URI.file(file).toString(), Range.create(pos, pos))
        this.emit('data', {
          label: line,
          filterText: this.interactive ? '' : escaped,
          location
        })
        this.lines++;
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

export default class GrepList extends BasicList {
  public readonly interactive = true
  public readonly description = 'grep text by rg or ag'
  public readonly name = 'grep'
  public readonly defaultAction = 'open'
  public readonly detail = `Literal match is used by default.
To use interactive mode, add '-I' or '--interactive' to LIST OPTIONS.
To change colors, checkout 'man rg' or 'man ag'.
To search from workspace folders instead of cwd, use '-folder' or '-workspace' argument.
Grep source provide some uniformed options to ease differences between rg and ag.`
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
    description: 'Grep files with specified extension only, could be used multiple times.',
    hasValue: true
  }, {
    name: '-F, -folder',
    description: 'Grep files from current workspace folder instead of cwd.'
  }, {
    name: '-W, -workspace',
    description: 'Grep files from all workspace folders instead of cwd.'
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
    let maxLines = config.get<number>("maxLines", 0)
    if (cmd == 'rg') {
      let maxColumns = config.get<number>('maxColumns', 300)
      args.push('--color', 'always', '--max-columns', maxColumns.toString(), '--vimgrep')
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
    let cwds: string[]
    if (args.indexOf('-F') != -1 || args.indexOf('-folder') != -1) {
      cwds = [workspace.rootPath]
    } else if (args.indexOf('-W') != -1 || args.indexOf('-workspace') != -1) {
      cwds = workspace.workspaceFolders.map(f => URI.parse(f.uri).fsPath)
    } else {
      let valid = await window.valid
      if (valid) {
        cwds = [await nvim.call('getcwd', window.id)]
      } else {
        cwds = [await nvim.call('getcwd')]
      }
    }
    let task = new Task(interactive)
    if (cmd == 'rg' || cmd == 'ag') {
      args = convertOptions(args, cmd, useLiteral)
      args = args.filter(s => ['-F', '-folder', '-W', '-workspace'].indexOf(s) == -1)
    }
    if (!args.includes('--')) {
      args.push('--', './')
    }
    task.start(cmd, args, cwds, patterns, maxLines)
    return task
  }
}

function byteSlice(content: string, start: number, end?: number): string {
  let buf = Buffer.from(content, 'utf8')
  return buf.slice(start, end).toString('utf8')
}
