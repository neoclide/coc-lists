import { Neovim } from '@chemzqm/neovim'
import { BasicList, commands, Document, ListContext, ListItem, workspace, WorkspaceConfiguration } from 'coc.nvim'
import fs from 'fs'
import minimatch from 'minimatch'
import os from 'os'
import path from 'path'
import util from 'util'
import { Location, Range } from 'vscode-languageserver-protocol'
import Uri from 'vscode-uri'

const isWindows = process.platform == 'win32'
const root = isWindows ? path.join(os.homedir(), 'AppData/Local/coc') : path.join(os.homedir(), '.config/coc')
const mruFile = path.join(root, 'mru')

export default class MruList extends BasicList {
  public readonly name = 'mru'
  public readonly defaultAction = 'open'
  public description = 'most recent used files'
  private config: WorkspaceConfiguration

  constructor(nvim: Neovim) {
    super(nvim)
    this.config = workspace.getConfiguration('list.source.mru')
    this.addLocationActions()
    this.addAction('delete', async (item, _context) => {
      let content = await util.promisify(fs.readFile)(mruFile, 'utf8')
      let lines = content.split('\n')
      let filepath = Uri.parse(item.location.uri).fsPath
      let idx = lines.indexOf(filepath)
      if (idx != -1) lines.splice(idx, 1)
      await util.promisify(fs.writeFile)(mruFile, lines.join('\n'), 'utf8')
    }, { reload: true, persist: true })

    this.disposables.push(commands.registerCommand('mru.validate', async () => {
      let content = await util.promisify(fs.readFile)(mruFile, 'utf8')
      let lines = content.split('\n')
      lines = lines.filter(line => fs.existsSync(line))
      await util.promisify(fs.writeFile)(mruFile, lines.join('\n'), 'utf8')
    }))

    let files: string[] = []
    let patterns = this.config.get<string[]>('excludePatterns', [])
    let ignoreGitIgnore = this.config.get<boolean>('ignoreGitIgnore', false)
    for (let doc of workspace.documents) {
      let uri = Uri.parse(doc.uri)
      if (uri.scheme !== 'file') continue
      let filepath = uri.fsPath
      if (ignoreGitIgnore && doc.isIgnored) continue
      if (patterns.some(p => minimatch(filepath, p))) continue
      files.push(filepath)
    }
    this.addFiles(files).catch(e => {
      console.error(e) // tslint:disable-line
    })

    let last: string
    workspace.onDidOpenTextDocument(async textDocument => {
      await wait(50)
      let doc = workspace.getDocument(textDocument.uri)
      if (!doc) return
      last = doc.uri
      await this.addRecentFile(doc)
    }, null, this.disposables)

    workspace.onDidChangeTextDocument(async ev => {
      let doc = workspace.getDocument(ev.textDocument.uri)
      if (!doc || doc.uri == last) return
      last = doc.uri
      await this.addRecentFile(doc)
    }, null, this.disposables)
  }

  private async addFiles(files: string[]): Promise<void> {
    let limit = this.config.get<number>('maxLength', 1000)
    try {
      let content = await util.promisify(fs.readFile)(mruFile, 'utf8')
      let lines = content.trim().split('\n')
      lines = lines.filter(s => files.indexOf(s) == -1)
      for (let file of files) {
        lines.unshift(file)
      }
      if (lines.length > limit) lines = lines.slice(0, limit)
      await util.promisify(fs.writeFile)(mruFile, lines.join('\n'), 'utf8')
    } catch (e) {
      // noop
    }
  }

  private async addRecentFile(doc: Document): Promise<void> {
    let uri = Uri.parse(doc.uri)
    if (uri.scheme !== 'file') return
    let preview = await workspace.nvim.call('coc#util#is_preview', doc.bufnr)
    if (preview) return
    let filepath = uri.fsPath
    let patterns = this.config.get<string[]>('excludePatterns', [])
    let ignoreGitIgnore = this.config.get<boolean>('ignoreGitIgnore', false)
    if (ignoreGitIgnore && doc.isIgnored) return
    if (patterns.some(p => minimatch(filepath, p))) return
    let limit = this.config.get<number>('maxLength', 1000)
    let content = ''
    try {
      content = await util.promisify(fs.readFile)(mruFile, 'utf8')
    } catch (e) {
      // noop
    }
    let lines = content.split('\n')
    let idx = lines.indexOf(filepath)
    if (idx != -1) lines.splice(idx, 1)
    lines.unshift(filepath)
    if (lines.length > limit) lines = lines.slice(0, limit)
    try {
      await util.promisify(fs.writeFile)(mruFile, lines.join('\n'), 'utf8')
    } catch (e) {
      // noop
    }
  }

  public async loadItems(context: ListContext): Promise<ListItem[]> {
    let cwd = context.cwd
    let findAll = context.args.indexOf('-A') !== -1
    let content = ''
    try {
      content = await util.promisify(fs.readFile)(mruFile, 'utf8')
    } catch (e) {
      // noop
    }
    if (!content) return []
    let files = content.trim().split('\n')
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

function wait(ms: number): Promise<any> {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve()
    }, ms)
  })
}
