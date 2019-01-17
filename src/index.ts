import { ExtensionContext, workspace, listManager } from 'coc.nvim'
import Files from './files'
import Mru from './mru'
import Grep from './grep'
import Words from './words'
import Buffers from './buffers'
import LocationList from './locationlist'
import Quickfix from './quickfix'

export async function activate(context: ExtensionContext): Promise<void> {
  let { subscriptions } = context
  let { nvim } = workspace
  let config = workspace.getConfiguration('lists')
  let disabled = config.get<string[]>('disabledLists', [])
  let lists = [
    new Buffers(nvim),
    new Words(nvim),
    new Grep(nvim),
    new Files(nvim),
    new Mru(nvim),
    new LocationList(nvim),
    new Quickfix(nvim)
  ]

  lists = lists.filter(s => disabled.indexOf(s.name) == -1)

  for (let list of lists) {
    subscriptions.push(listManager.registerList(list))
  }
}
