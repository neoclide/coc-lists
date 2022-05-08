import { BasicList, ListContext, ListItem, Neovim } from 'coc.nvim'
import colors from 'colors/safe'
const regex = /^\s*(\d+)(.+?)"(.+?)".*/

export default class BufferList extends BasicList {
  public readonly name = 'buffers'
  public readonly defaultAction = 'open'
  public description = 'get buffer list'

  constructor(nvim: Neovim) {
    super(nvim)
    this.addAction('open', async (item: ListItem) => {
      let { bufnr } = item.data
      await nvim.command(`buffer ${bufnr}`)
    })
    this.addAction('drop', async (item: ListItem) => {
      let { bufnr, visible } = item.data
      if (visible) {
        let info = await nvim.call('getbufinfo', bufnr) as any[]
        if (info.length && info[0].windows.length) {
          let winid = info[0].windows[0]
          await nvim.call('win_gotoid', winid)
          return
        }
      }
      await nvim.command(`buffer ${bufnr}`)
    })
    this.addAction('split', async (item: ListItem) => {
      let { bufnr } = item.data
      await nvim.command(`sb ${bufnr}`)
    })
    this.addAction('tabe', async (item: ListItem) => {
      let { bufname } = item.data
      let escaped = await nvim.call('fnameescape', bufname)
      await nvim.command(`tabe ${escaped}`)
    })
    this.addAction('vsplit', async (item: ListItem) => {
      let { bufname } = item.data
      let escaped = await nvim.call('fnameescape', bufname)
      await nvim.command(`vs ${escaped}`)
    })

    // unload buffer
    this.addAction('delete', async item => {
      let { bufnr, bufname, isArgs } = item.data
      await nvim.command(`bdelete ${bufnr}`)
      if (isArgs) {
        await nvim.command(`argdelete ${bufname}`)
      }
    }, { persist: true, reload: true })

    this.addAction('wipe', async item => {
      let { bufnr } = item.data
      await nvim.command(`bwipeout ${bufnr}`)
    }, { persist: true, reload: true })

    this.addAction('preview', async (item, context) => {
      let { nvim } = this
      let { bufname, bufnr } = item.data
      let lines = await nvim.call('getbufline', [bufnr, 1, 200]) as string[]
      let filetype = await nvim.call('getbufvar', [bufnr, '&filetype', 'txt']) as string
      if (lines.length == 0) {
        lines = [`Unable to get lines for buffer ${bufname}, add 'set hidden' in your vimrc.`]
      }
      await this.preview({
        filetype,
        bufname,
        lines,
        sketch: true
      }, context)
    })
  }

  public async loadItems(context: ListContext): Promise<ListItem[]> {
    const { nvim } = this
    const bufnrAlt = Number(await nvim.call('bufnr', '#'))
    const content = await nvim.call('execute', 'ls') as string
    const isArgs = context.args.indexOf('--args') !== -1
    const isPWD = context.args.indexOf('--pwd') !== -1
    const args = isArgs ? await nvim.eval("map(argv(), 'bufnr(v:val)')") as number[] : []

    return content.split(/\n/).reduce((res, line) => {
      const ms = line.match(regex)
      if (!ms) return res
      const bufnr = Number(ms[1])
      const bufname = ms[3]
      if (isArgs && args.indexOf(bufnr) === -1) return res
      if (isPWD && (bufname[0] === '/' || bufname[0] === '~')) return res

      const item = {
        label: ` ${colors.magenta(ms[1])}${colors.america(ms[2])}${ms[3]}`,
        filterText: bufname,
        sortText: ms[1],
        data: {
          bufnr,
          bufname,
          visible: ms[2].indexOf('a') !== -1,
          isArgs,
        }
      } as ListItem

      return bufnr === bufnrAlt
        ? [item, ...res]
        : [...res, item]
    }, [])
  }
}
