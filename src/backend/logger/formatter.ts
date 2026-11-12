import { LogPrefix, MaxLogPrefixLength, MaxLogLevelLength } from './constants'

import type { LogLevel } from './constants'

async function formatLogMessage(
  message: unknown,
  logLevel: LogLevel,
  logPrefix: LogPrefix
): Promise<string> {
  const prefixes: string[] = []

  const now = new Date()
  const timePrefix = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((n) => n.toString().padStart(2, '0'))
    .join(':')
  prefixes.push(`(${timePrefix})`)

  const logLevelPrefix = `[${logLevel}]:`.padEnd(MaxLogLevelLength + 3, ' ')
  prefixes.push(logLevelPrefix)

  if (logPrefix)
    prefixes.push(`[${logPrefix}]:`.padEnd(MaxLogPrefixLength + 3, ' '))

  const joinedPrefixes = prefixes.join(' ')
  const messageStr = await convertUnknownToString(message)
  // HACK: Return an empty string if `messageStr` is empty. This is done to skip
  //       logging completely if we only have (usually hardcoded) prefixes
  if (!messageStr.length) return ''
  return `${joinedPrefixes} ${messageStr}`
}

async function convertUnknownToString(
  message: unknown,
  path = 'message'
): Promise<string> {
  try {
    if (Array.isArray(message)) {
      const messageParts = await Promise.all(
        message.map((part, index) =>
          convertUnknownToString(part, `${path}[${index}]`)
        )
      )
      return messageParts.join(' ')
    }

    if (message instanceof Promise) {
      return await message.then(
        (resolved) => convertUnknownToString(resolved, path),
        (error) => formatFailure(path, 'Promise rejected', error)
      )
    }

    if (message instanceof Error) return message.stack ?? message.message

    if (
      typeof message === 'string' ||
      typeof message === 'number' ||
      typeof message === 'boolean'
    )
      return message.toString()

    return JSON.stringify(message, null, 2) ?? String(message)
  } catch (error) {
    return formatFailure(
      path,
      `could not format ${describeType(message)}`,
      error
    )
  }
}

function formatFailure(path: string, reason: string, error: unknown): string {
  return `[Failed to format log message at ${path} (${reason}): ${describeError(error)}]`
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    const cause = error.cause ? ` (cause: ${describeError(error.cause)})` : ''
    return `${error.name}: ${error.message}${cause}`
  }

  return `${describeType(error)}: ${safeString(error)}`
}

function describeType(value: unknown): string {
  if (value === null) return 'null'

  const type = typeof value
  if (type !== 'object') return type

  try {
    const name = (value as { constructor?: { name?: unknown } }).constructor
      ?.name
    return typeof name === 'string' && name ? `object ${name}` : 'object'
  } catch {
    return 'object'
  }
}

function safeString(value: unknown): string {
  try {
    return String(value)
  } catch {
    return '<unprintable>'
  }
}

export { formatLogMessage }
