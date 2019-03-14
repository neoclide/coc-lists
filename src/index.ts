import { ExtensionContext, workspace, listManager } from 'coc.nvim'
import FilesList from './files'
import BufferList from './buffers'
import GrepList from './grep'
import LocationList from './locationlist'
import QuickfixList from './quickfix'
import MruList from './mru'
import Words from './words'

export async function activate(context: ExtensionContext): Promise<void> {
  let { subscriptions } = context
  let config = workspace.getConfiguration('lists')
  let disabled = config.get<string[]>('disabledLists', [])

  function isDisabled(name) {
    return disabled.indexOf(name) !== -1
  }
  if (!isDisabled('files')) {
    subscriptions.push(listManager.registerList(new FilesList(workspace.nvim)))
  }
  if (!isDisabled('buffers')) {
    subscriptions.push(listManager.registerList(new BufferList(workspace.nvim)))
  }
  if (!isDisabled('grep')) {
    subscriptions.push(listManager.registerList(new GrepList(workspace.nvim)))
  }
  if (!isDisabled('LocationList')) {
    subscriptions.push(listManager.registerList(new LocationList(workspace.nvim)))
  }
  if (!isDisabled('mru')) {
    subscriptions.push(listManager.registerList(new MruList(workspace.nvim)))
  }
  if (!isDisabled('quickfix')) {
    subscriptions.push(listManager.registerList(new QuickfixList(workspace.nvim)))
  }
  if (!isDisabled('words')) {
    subscriptions.push(listManager.registerList(new Words(workspace.nvim)))
  }
}
