import { ExtensionContext, workspace } from 'coc.nvim'

export async function activate(context: ExtensionContext): Promise<void> {
  let { subscriptions } = context
  let config = workspace.getConfiguration('lists')
  let disabled = config.get<string[]>('disabledLists', [])
    ; (await import('./mru')).regist(disabled, subscriptions)
    ; (await import('./grep')).regist(disabled, subscriptions)
    ; (await import('./words')).regist(disabled, subscriptions)
    ; (await import('./buffers')).regist(disabled, subscriptions)
    ; (await import('./locationlist')).regist(disabled, subscriptions)
    ; (await import('./quickfix')).regist(disabled, subscriptions)
    ; (await import('./files')).regist(disabled, subscriptions)
}
