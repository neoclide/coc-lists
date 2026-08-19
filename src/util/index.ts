import { spawn } from 'child_process'
import which from 'which'
import path from 'path'

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
  return buf.slice(0, Math.max(0, byteIndex)).toString('utf8').length
}

/**
 * Check whether filepath is excluded by git ignore rules.
 * Returns false when git is not available or filepath is not in a git repo.
 */
export function isGitIgnored(filepath: string): Promise<boolean> {
  return new Promise(resolve => {
    let proc = spawn('git', ['check-ignore', '-q', '--', filepath], {
      cwd: path.dirname(filepath)
    })
    let timer = setTimeout(() => {
      proc.kill()
      resolve(false)
    }, 2000)
    let done = (result: boolean): void => {
      clearTimeout(timer)
      resolve(result)
    }
    proc.on('error', () => {
      done(false)
    })
    proc.on('close', code => {
      done(code === 0)
    })
  })
}

export function parseVimSource(value: string): { filepath: string, line?: number } | undefined {
  let text = value.trim()
  let withLine = text.match(/^Last set from (.+) line (\d+)$/)
  if (withLine) return { filepath: withLine[1], line: Number(withLine[2]) }
  let withoutLine = text.match(/^Last set from (.+)$/)
  return withoutLine ? { filepath: withoutLine[1] } : undefined
}

/**
 * Find the "Last set from" line in verbose command/function/map output.
 * The line index differs between Vim and Neovim, so search instead of slicing.
 */
export function findVimSource(lines: string[]): { filepath: string, line?: number } | undefined {
  for (let line of lines) {
    if (/^\s*Last set from/.test(line)) {
      return parseVimSource(line)
    }
  }
  return undefined
}

export function wait(ms: number): Promise<any> {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(undefined)
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

export function isParentFolder(folder: string, filepath: string): boolean {
  let rel = path.relative(folder, filepath)
  return rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel)
}
