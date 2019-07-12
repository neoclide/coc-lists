import { IList, ListAction, ListContext, ListItem, Neovim } from 'coc.nvim'
import path from 'path'

export default class Colors implements IList {
  public readonly name = 'colors'
  public readonly description = 'color schemes'
  public readonly defaultAction = 'set'
  public actions: ListAction[] = []

  constructor(private nvim: Neovim) {
    this.actions.push({
      name: 'set',
      execute: item => {
        if (Array.isArray(item)) return
        nvim.command(`colorscheme ${item.data.name}`, true)
      }
    })
    this.actions.push({
      name: 'edit',
      execute: item => {
        if (Array.isArray(item)) return
        nvim.command(`edit ${item.location.uri}`, true)
      }
    })
  }

  public async loadItems(_context: ListContext): Promise<ListItem[]> {
    let { nvim } = this
    let colors = await nvim.eval('split(globpath(&rtp, "colors/*.vim"),"\n")') as string[]
    let hasPackages = await nvim.call('has', ['packages'])
    if (hasPackages) {
      let packageColors = await nvim.eval('split(globpath(&packpath, "pack/*/opt/*/colors/*.vim"),"\n")') as string[]
      colors.push(...packageColors)
    }
    return colors.map(file => {
      let name = path.basename(file, '.vim')
      return {
        label: `${name}\t${file}`,
        filterText: name,
        data: {name},
        location: {uri: file, line: '0'}
      }
    })
  }

  public doHighlight(): void {
    let { nvim } = this
    nvim.pauseNotification()
    nvim.command('syntax match CocColorsName /\\v^[^\\t]+/ contained containedin=CocColorsLine', true)
    nvim.command('syntax match CocColorsFile /\\t.*$/ contained containedin=CocColorsLine', true)
    nvim.command('highlight default link CocColorsName Identifier', true)
    nvim.command('highlight default link CocColorsFile Comment', true)
    nvim.resumeNotification(false, true).catch(_e => {
      // noop
    })
  }
}
