import { formatLogMessage } from '../formatter'

describe('formatLogMessage', () => {
  it('formats strings and arrays', async () => {
    await expect(
      formatLogMessage(['System Information:', 'CPU: test'], 'INFO', 'Backend')
    ).resolves.toContain('System Information: CPU: test')
  })

  it('reports a rejected promise with its path and reason', async () => {
    const result = await formatLogMessage(
      [
        'System Information:',
        Promise.reject(new Error('GPU access not allowed'))
      ],
      'INFO',
      'Backend'
    )

    expect(result).toContain('System Information:')
    expect(result).toContain(
      '[Failed to format log message at message[1] (Promise rejected): Error: GPU access not allowed]'
    )
  })

  it('reports an unserializable object with its type', async () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular

    const result = await formatLogMessage(circular, 'INFO', 'Backend')

    expect(result).toContain(
      '[Failed to format log message at message (could not format object Object):'
    )
  })

  it('reports unserializable primitives without rejecting', async () => {
    const result = await formatLogMessage(BigInt(1), 'INFO', 'Backend')

    expect(result).toContain(
      '[Failed to format log message at message (could not format bigint):'
    )
  })

  it('formats undefined without rejecting', async () => {
    await expect(
      formatLogMessage(undefined, 'INFO', 'Backend')
    ).resolves.toContain('undefined')
  })
})
