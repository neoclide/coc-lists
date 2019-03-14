import { BasicList, events, Mru, commands, Document, ListContext, ListItem, Neovim, workspace, WorkspaceConfiguration } from 'coc.nvim'
import fs from 'fs'
import minimatch from 'minimatch'
import path from 'path'
import { Location, Range } from 'vscode-languageserver-protocol'
import Uri from 'vscode-uri'
import { wait } from './util'

export default class MruList extends BasicList {
  public readonly name = 'mru'
  public readonly defaultAction = 'open'
  public description = 'most recent used files'
  public detail = `Use command 'mru.validate' to remove files that not exists any more.`
  public options = [{
    name: '-A',
    description: 'Show all recent files instead of filter by cwd.'
  }]
  private promise: Promise<void> = Promise.resolve(undefined)
  private config: WorkspaceConfiguration
  private mru: Mru

  constructor(nvim: Neovim) {
    super(nvim)
    this.mru = workspace.createMru('mru')
    this.config = workspace.getConfiguration('list.source.mru')
    this.addLocationActions()
    this.addAction('delete', async (item, _context) => {
      let filepath = Uri.parse(item.location.uri).fsPath
      await this.mru.remove(filepath)
    }, { reload: true, persist: true })

    this.disposables.push(commands.registerCommand('mru.validate', async () => {
      let files = await this.mru.load()
      for (let file of files) {
        if (!fs.existsSync(file)) {
          await this.mru.remove(file)
        }
      }
    }))

    for (let doc of workspace.documents) {
      this.addRecentFile(doc)
    }

    workspace.onDidOpenTextDocument(async textDocument => {
      await wait(50)
      let doc = workspace.getDocument(textDocument.uri)
      if (doc) this.addRecentFile(doc)
    }, null, this.disposables)

    events.on('BufEnter', bufnr => {
      let doc = workspace.getDocument(bufnr)
      if (doc) this.addRecentFile(doc)
    }, null, this.disposables)
  }

  private addRecentFile(doc: Document): void {
    this.promise = this.promise.then(() => {
      return this._addRecentFile(doc)
    }, () => {
      return this._addRecentFile(doc)
    })
  }

  private async _addRecentFile(doc: Document): Promise<void> {
    let uri = Uri.parse(doc.uri)
    if (uri.scheme !== 'file') return
    let parts = uri.fsPath.split(path.sep)
    if (parts.indexOf('.git') !== -1) return
    let preview = await workspace.nvim.call('coc#util#is_preview', doc.bufnr)
    if (preview) return
    let filepath = uri.fsPath
    let patterns = this.config.get<string[]>('excludePatterns', [])
    let ignoreGitIgnore = this.config.get<boolean>('ignoreGitIgnore', false)
    if (ignoreGitIgnore && doc.isIgnored) return
    if (patterns.some(p => minimatch(filepath, p))) return
    await this.mru.add(filepath)
  }

  public async loadItems(context: ListContext): Promise<ListItem[]> {
    let cwd = context.cwd
    let findAll = context.args.indexOf('-A') !== -1
    let files = await this.mru.load()
    const range = Range.create(0, 0, 0, 0)
    if (!findAll) files = files.filter(file => file.startsWith(cwd))
    return files.map(file => {
      let location = Location.create(Uri.file(file).toString(), range)
      return {
        label: findAll ? file : path.relative(cwd, file),
        location
      }
    })
  }
}
