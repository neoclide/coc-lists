import { ExtensionContext, listManager, workspace } from 'coc.nvim'
import BufferList from './buffers'
import ChangeList from './changes'
import Cmdhistory from './cmdhistory'
import Colors from './colors'
import Commands from './commands'
import FilesList from './files'
import Filetypes from './filetypes'
import GrepList from './grep'
import Helptags from './helptags'
import LinesList from './lines'
import LocationList from './locationlist'
import Maps from './maps'
import Marks from './marks'
import MruList from './mru'
import QuickfixList from './quickfix'
import RegisterList from './registers'
import Searchhistory from './searchhistory'
import SessionList from './session'
import Tags from './tags'
import Windows from './windows'
import Words from './words'
import Functions from './functions'

export async function activate(context: ExtensionContext): Promise<void> {
  let { subscriptions } = context
  let config = workspace.getConfiguration(undefined, null)
  let disabled = config.get<string[]>('lists.disabledLists', [])
  let { nvim } = workspace

  function isDisabled(name): boolean {
    return disabled.indexOf(name) !== -1
  }
  if (!isDisabled('lines')) {
    subscriptions.push(listManager.registerList(new LinesList(nvim)))
  }
  if (!isDisabled('session')) {
    let saveOnVimLeave = config.get<boolean>('session.saveOnVimLeave', true)
    subscriptions.push(listManager.registerList(new SessionList(nvim, context.extensionPath, saveOnVimLeave)))
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
  if (!isDisabled('registers')) {
    subscriptions.push(listManager.registerList(new RegisterList(nvim)))
  }
  if (!isDisabled('buffers')) {
    subscriptions.push(listManager.registerList(new BufferList(nvim)))
  }
  if (!isDisabled('changes')) {
    subscriptions.push(listManager.registerList(new ChangeList(nvim)))
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
  if (!isDisabled('functions')) {
    subscriptions.push(listManager.registerList(new Functions(nvim)))
  }
}
