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

export function pad(n: string, total: number): string {
  let l = total - n.length
  if (l <= 0) return ''
  return ((new Array(l)).fill(' ').join(''))
}

/**
 * Removes duplicates from the given array. The optional keyFn allows to specify
 * how elements are checked for equalness by returning a unique string for each.
 */
export function distinct<T>(array: T[], keyFn?: (t: T) => string): T[] {
  if (!keyFn) {
    return array.filter((element, position) => {
      return array.indexOf(element) === position
    })
  }

  const seen: { [key: string]: boolean } = Object.create(null)
  return array.filter(elem => {
    const key = keyFn(elem)
    if (seen[key]) {
      return false
    }

    seen[key] = true

    return true
  })
}
