import { ExtensionContext, workspace, listManager } from 'coc.nvim'
import FilesList from './files'
import BufferList from './buffers'
import GrepList from './grep'
import LocationList from './locationlist'
import QuickfixList from './quickfix'
import MruList from './mru'
import Words from './words'
import Helptags from './helptags'
import Tags from './tags'
import Filetypes from './filetypes'
import Colors from './colors'
import Marks from './marks'
import Windows from './windows'
import Commands from './commands'
import Maps from './maps'
import Cmdhistory from './cmdhistory'
import Searchhistory from './searchhistory'

export async function activate(context: ExtensionContext): Promise<void> {
  let { subscriptions } = context
  let config = workspace.getConfiguration('lists')
  let disabled = config.get<string[]>('disabledLists', [])

  function isDisabled(name): boolean {
    return disabled.indexOf(name) !== -1
  }
  if (!isDisabled('cmdhistory')) {
    subscriptions.push(listManager.registerList(new Cmdhistory(workspace.nvim)))
  }
  if (!isDisabled('searchhistory')) {
    subscriptions.push(listManager.registerList(new Searchhistory(workspace.nvim)))
  }
  if (!isDisabled('vimcommands')) {
    subscriptions.push(listManager.registerList(new Commands(workspace.nvim)))
  }
  if (!isDisabled('maps')) {
    subscriptions.push(listManager.registerList(new Maps(workspace.nvim)))
  }
  if (!isDisabled('colors')) {
    subscriptions.push(listManager.registerList(new Colors(workspace.nvim)))
  }
  if (!isDisabled('windows')) {
    subscriptions.push(listManager.registerList(new Windows(workspace.nvim)))
  }
  if (!isDisabled('marks')) {
    subscriptions.push(listManager.registerList(new Marks(workspace.nvim)))
  }
  if (!isDisabled('filetypes')) {
    subscriptions.push(listManager.registerList(new Filetypes(workspace.nvim)))
  }
  if (!isDisabled('files')) {
    subscriptions.push(listManager.registerList(new FilesList(workspace.nvim)))
  }
  if (!isDisabled('tags')) {
    subscriptions.push(listManager.registerList(new Tags(workspace.nvim)))
  }
  if (!isDisabled('helptags')) {
    subscriptions.push(listManager.registerList(new Helptags(workspace.nvim)))
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
