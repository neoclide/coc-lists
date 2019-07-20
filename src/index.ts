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
import SessionList from './session'
import LinesList from './lines'

export async function activate(context: ExtensionContext): Promise<void> {
  let { subscriptions } = context
  let config = workspace.getConfiguration('lists')
  let disabled = config.get<string[]>('disabledLists', [])
  let { nvim } = workspace

  function isDisabled(name): boolean {
    return disabled.indexOf(name) !== -1
  }
  if (!isDisabled('lines')) {
    subscriptions.push(listManager.registerList(new LinesList(nvim)))
  }
  if (!isDisabled('session')) {
    subscriptions.push(listManager.registerList(new SessionList(nvim, context.extensionPath)))
  }
  if (!isDisabled('cmdhistory')) {
    subscriptions.push(listManager.registerList(new Cmdhistory(nvim)))
  }
  if (!isDisabled('searchhistory')) {
    subscriptions.push(listManager.registerList(new Searchhistory(nvim)))
  }
  if (!isDisabled('vimcommands')) {
    subscriptions.push(listManager.registerList(new Commands(nvim)))
  }
  if (!isDisabled('maps')) {
    subscriptions.push(listManager.registerList(new Maps(nvim)))
  }
  if (!isDisabled('colors')) {
    subscriptions.push(listManager.registerList(new Colors(nvim)))
  }
  if (!isDisabled('windows')) {
    subscriptions.push(listManager.registerList(new Windows(nvim)))
  }
  if (!isDisabled('marks')) {
    subscriptions.push(listManager.registerList(new Marks(nvim)))
  }
  if (!isDisabled('filetypes')) {
    subscriptions.push(listManager.registerList(new Filetypes(nvim)))
  }
  if (!isDisabled('files')) {
    subscriptions.push(listManager.registerList(new FilesList(nvim)))
  }
  if (!isDisabled('tags')) {
    subscriptions.push(listManager.registerList(new Tags(nvim)))
  }
  if (!isDisabled('helptags')) {
    subscriptions.push(listManager.registerList(new Helptags(nvim)))
  }
  if (!isDisabled('buffers')) {
    subscriptions.push(listManager.registerList(new BufferList(nvim)))
  }
  if (!isDisabled('grep')) {
    subscriptions.push(listManager.registerList(new GrepList(nvim)))
  }
  if (!isDisabled('LocationList')) {
    subscriptions.push(listManager.registerList(new LocationList(nvim)))
  }
  if (!isDisabled('mru')) {
    subscriptions.push(listManager.registerList(new MruList(nvim)))
  }
  if (!isDisabled('quickfix')) {
    subscriptions.push(listManager.registerList(new QuickfixList(nvim)))
  }
  if (!isDisabled('words')) {
    subscriptions.push(listManager.registerList(new Words(nvim)))
  }
}
