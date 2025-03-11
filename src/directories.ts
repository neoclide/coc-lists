import { ChildProcess, spawn } from 'child_process'
import { workspace } from 'coc.nvim'
import FilesList, { Task as FilesTask } from './files'
import { executable } from './util'

class Task extends FilesTask {
  protected post_process_hook(process: ChildProcess) {
    let post_process = spawn('sh', ['-c', 'xargs -I {} gdirname {} | sort | uniq'])
    this.processes.push(post_process)
    post_process.on('error', e => {
      this.emit('error', e.message)
    })
    process.stdout.pipe(post_process.stdin)

    return post_process.stdout
  }
}

export default class DirectoriesList extends FilesList {
  public task = Task
  public readonly name = 'directories'
  public description = 'Search directories by rg or ag'
  public readonly detail = `Install ripgrep in your $PATH to have best experience.
Directories are searched from current cwd by default.
Provide directory names as arguments to search other directories.
Use 'list.source.directories.command' configuration for custom search command.
Use 'list.source.directories.args' configuration for custom command arguments.
Note that rg ignore hidden directories by default.`
  public options = [{
    name: '-F, -folder',
    description: 'Search directories from current workspace folder instead of cwd.'
  }, {
    name: '-W, -workspace',
    description: 'Search directories from all workspace folders instead of cwd.'
  }]

  public getCommand(): { cmd: string, args: string[] } {
    let config = workspace.getConfiguration('list.source.directories')
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
        throw new Error('Unable to find command for directories list.')
        return null
      }
    } else {
      return { cmd, args }
    }
  }
}
