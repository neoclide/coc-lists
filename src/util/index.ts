import which from 'which'

export function executable(cmd: string): boolean {
  try {
    which.sync(cmd)
  } catch (e) {
    return false
  }
  return true
}
