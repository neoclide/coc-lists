import which from 'which'

export function executable(cmd: string): boolean {
  try {
    which.sync(cmd)
  } catch (e) {
    return false
  }
  return true
}

export function characterIndex(content: string, byteIndex: number): number {
  let buf = Buffer.from(content, 'utf8')
  return buf.slice(0, byteIndex).toString('utf8').length
}

export function wait(ms: number): Promise<any> {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve()
    }, ms)
  })
}

export function pad(n: number, total: number): string {
  let l = total - String(n).length
  if (l <= 0) return ''
  return ((new Array(l)).fill(' ').join(''))
}
