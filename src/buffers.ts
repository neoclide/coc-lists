import { BasicList, ListContext, ListItem, Neovim } from 'coc.nvim'
import colors from 'colors/safe'
const regex = /^\s(\s*\d+)(.+?)"(.+?)".*/

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
      let { bufnr } = item.data
      await nvim.command(`bdelete ${bufnr}`)
    }, { persist: true, reload: true })

    this.addAction('wipe', async item => {
      let { bufnr } = item.data
      await nvim.command(`bwipeout ${bufnr}`)
    }, { persist: true, reload: true })

    this.addAction('preview', async (item, context) => {
      let { nvim } = this
      let { bufname, bufnr } = item.data
      let info = await nvim.call('getbufinfo', bufnr) as any
      if (bufname.startsWith('term://')) return
      let height = this.previewHeight
      let mod = context.options.position == 'top' ? 'below' : ''
      let winid = context.listWindow.id
      nvim.pauseNotification()
      nvim.command('pclose', true)
      nvim.call('coc#util#open_file', [`${mod} ${height}sp +${info.lnum}`, bufname], true)
      let cmd = 'setl previewwindow winfixheight'
      nvim.command(cmd, true)
      nvim.command('normal! zt', true)
      nvim.call('win_gotoid', [winid], true)
      await nvim.resumeNotification()
    })
  }

  public async loadItems(_context: ListContext): Promise<ListItem[]> {
    const { nvim } = this
    const bufnrAlt = Number(await nvim.call('bufnr', '#'))
    const content = await nvim.call('execute', 'ls') as string

    return content.split(/\n/).reduce((res, line) => {
      const ms = line.match(regex)
      if (!ms) return res

      const bufnr = Number(ms[1].trim())
      const item: ListItem = {
        label: ` ${colors.magenta(ms[1])}${colors.america(ms[2])}${ms[3]}`,
        filterText: ms[3],
        data: {
          bufnr,
          bufname: ms[3],
          visible: ms[2].indexOf('a') !== -1
        }
      }

      return bufnr === bufnrAlt
        ? [item, ...res]
        : [...res, item]
    }, [])
  }
}
