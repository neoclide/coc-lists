import { BasicList, commands, Uri as URI, ListContext, ListTask, Neovim, window, workspace } from 'coc.nvim'
import colors from 'colors/safe'
import { EventEmitter } from 'events'
import fs, { ReadStream } from 'fs'
import path from 'path'
import readline from 'readline'
import { isParentFolder } from './util'

export class FileTask extends EventEmitter implements ListTask {
  private streams: ReadStream[] = []
  constructor() {
    super()
  }

  public start(files: string[], cwd: string): void {
    let filepaths = files
      .map(file => path.isAbsolute(file) ? file : path.join(cwd, file))
      .filter(filepath => fs.existsSync(filepath))
    let count = filepaths.length
    if (count == 0) {
      process.nextTick(() => this.emit('end'))
      return
    }
    let done = new Set<string>()
    filepaths.forEach((filepath, index) => {
      let stream = fs.createReadStream(filepath, { encoding: 'utf8' })
      this.streams.push(stream)
      const rl = readline.createInterface({
        input: stream
      })
      let dirname = path.dirname(filepath)
      let finish = (): void => {
        if (done.has(index.toString())) return
        done.add(index.toString())
        count = count - 1
        if (count == 0) {
          this.emit('end')
        }
      }
      rl.on('line', line => {
        if (line.startsWith('!')) return
        let [name, file, pattern] = line.split('\t')
        if (!pattern) return
        let fullpath = path.isAbsolute(file) ? file : path.join(dirname, file)
        let uri = URI.file(fullpath).toString()
        let relativeFile = isParentFolder(cwd, fullpath) ? path.relative(cwd, fullpath) : fullpath
        this.emit('data', {
          label: `${colors.blue(name)} ${colors.grey(relativeFile)}`,
          filterText: name,
          location: {
            uri,
            line: pattern.replace(/^\/\^/, '').replace(/\$\/;?"?$/, ''),
            text: name
          }
        })
      })
      rl.on('error', e => {
        this.emit('error', e.message)
        finish()
      })
      rl.on('close', () => {
        finish()
      })
    })
  }

  public dispose(): void {
    for (let stream of this.streams) {
      stream.close()
    }
  }
}

export default class Helptags extends BasicList {
  public readonly name = 'tags'
  public readonly description = 'search from tags'
  public readonly defaultAction = 'open'

  constructor(nvim: Neovim) {
    super()
    this.addLocationActions()

    this.disposables.push(commands.registerCommand('tags.generate', async () => {
      let config = workspace.getConfiguration('list.source.tags')
      let cmd = config.get<string>('command', 'ctags -R .')
      let res = await window.runTerminalCommand(cmd)
      if (res.success) window.showMessage('tagfile generated')
    }))
  }

  public async loadItems(_context: ListContext): Promise<ListTask> {
    let { nvim } = this
    let cwd = await nvim.call('getcwd') as string
    let tagfiles = await nvim.call('tagfiles') as string[]
    if (!tagfiles || tagfiles.length == 0) {
      throw new Error('no tag files found, use ":CocCommand tags.generate" to generate tagfile.')
    }
    let task = new FileTask()
    task.start(tagfiles, cwd)
    return task
  }
}
