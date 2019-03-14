import { BasicList, ListContext, ListItem, Neovim, Window } from 'coc.nvim'
import colors from 'colors/safe'
const regex = /^\s(\s*\d+)(.+?)"(.+)"\s+line\s+(\d+)/

export default class BufferList extends BasicList {
  public readonly name = 'buffers'
  public readonly defaultAction = 'drop'
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
      let { lnum, bufname } = item.data
      if (bufname.startsWith('term://')) return
      let height = this.previewHeight
      let mod = context.options.position == 'top' ? 'below' : ''
      let winid = context.listWindow.id
      nvim.pauseNotification()
      nvim.command('pclose', true)
      nvim.call('coc#util#open_file', [`${mod} ${height}sp +${lnum}`, bufname], true)
      let cmd = 'setl previewwindow winfixheight'
      nvim.command(cmd, true)
      nvim.command('normal! zt', true)
      nvim.call('win_gotoid', [winid], true)
      await nvim.resumeNotification()
    })
  }

  public async loadItems(context: ListContext): Promise<ListItem[]> {
    let { nvim } = this
    let { window } = context
    let currWin: Window
    let buf = await window.buffer
    let bufnr = await nvim.call('bufnr', '%')
    if (bufnr != buf.id) {
      // run command in invoked buffer
      currWin = await nvim.window
      await nvim.call('win_gotoid', window.id)
    }
    // let wins = await nvim.windows
    let content = await nvim.call('execute', 'ls') as string
    if (currWin) {
      await nvim.call('win_gotoid', currWin.id)
    }
    let res: ListItem[] = []
    for (let line of content.split(/\n/)) {
      let ms = line.match(regex)
      if (!ms) continue
      res.push({
        label: ` ${colors.magenta(ms[1])}${colors.america(ms[2])}${ms[3]}`,
        filterText: ms[3],
        data: {
          bufname: ms[3],
          bufnr: Number(ms[1].trim()),
          lnum: Number(ms[4]),
          visible: ms[2].indexOf('a') !== -1
        }
      })
    }
    return res
  }
}
