import * as command from "./command.ts"

const SOH = 0x01
const EOT = 0x04
const NL = 0x0A
const CR = 0x0D
const ESC = "\x1b"

// Terminal control sequences
const SAVE_CURSOR = `${ESC}7`
const RESTORE_CURSOR = `${ESC}8`
const CLEAR_TO_END = `${ESC}[J`
const CLEAR_SCREEN = `${ESC}[2J`
const CURSOR_UP = (n: number) => `${ESC}[${n}A`
const CURSOR_TO_START = `${ESC}[H`

// Platform-specific implementations
const isWindows = Deno.build.os === "windows"

interface TerminalController {
  startGroup(name: string): string
  endGroup(name: string, close: boolean): string
  updateGroup(
    name: string,
    lines: string[],
    total: number,
    maxLines: number,
  ): string
}

// Unix implementation with ANSI escape sequences
const UnixTerminal: TerminalController = {
  startGroup(name: string) {
    return `${SAVE_CURSOR}--- ${name}\n`
  },
  endGroup(name: string, close: boolean) {
    if (close) {
      return `^^^\n${RESTORE_CURSOR}${CLEAR_TO_END}~~~ ${name}\n`
    }
    return "^^^\n"
  },
  updateGroup(name: string, lines: string[], total: number, maxLines: number) {
    if (maxLines === Number.MAX_SAFE_INTEGER) {
      // For unlimited lines, don't do any cursor manipulation
      return lines[lines.length - 1]
    }
    return `${RESTORE_CURSOR}${CLEAR_TO_END}--- ${name} (${total} lines)\n${
      lines.slice(-maxLines).join("")
    }`
  },
}

// Windows implementation using VT100 sequences
const WindowsTerminal: TerminalController = {
  startGroup(name: string) {
    return `${CURSOR_TO_START}${CLEAR_SCREEN}--- ${name}\n`
  },
  endGroup(name: string, close: boolean) {
    if (close) {
      return `^^^\n${CURSOR_TO_START}${CLEAR_SCREEN}~~~ ${name}\n`
    }
    return "^^^\n"
  },
  updateGroup(name: string, lines: string[], total: number, maxLines: number) {
    if (maxLines === Number.MAX_SAFE_INTEGER) {
      // For unlimited lines, don't do any cursor manipulation
      return lines[lines.length - 1]
    }
    const visibleLines = lines.slice(-maxLines)
    return `${CURSOR_UP(visibleLines.length + 1)}${CLEAR_SCREEN}--- ${name} (${total} lines)\n${
      visibleLines.join("")
    }`
  },
}

const terminal = isWindows ? WindowsTerminal : UnixTerminal

export function startListener() {
  const redactions: Set<string> = new Set()
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buffer = new Uint8Array(0)
  const config: { maxVisibleLines: number } = {
    maxVisibleLines: 10,
  }

  // Group state
  let inGroup = false
  let groupLines: string[] = []
  let groupName = ""

  const transform = new TransformStream<Uint8Array, Uint8Array>({
    transform: (chunk, controller) => {
      // If we have a partial line in buffer, append this chunk
      if (buffer.length > 0) {
        const newBuffer = new Uint8Array(buffer.length + chunk.length)
        newBuffer.set(buffer)
        newBuffer.set(chunk, buffer.length)
        chunk = newBuffer
        buffer = new Uint8Array(0)
      }

      let start = 0
      for (let i = 0; i < chunk.length; i++) {
        if (
          chunk[i] === NL ||
          (chunk[i] === CR && i + 1 < chunk.length && chunk[i + 1] === NL)
        ) {
          const lineEnd = chunk[i] === CR ? i + 2 : i + 1
          const line = chunk.slice(start, lineEnd)

          // Look for command in this line
          const cmdStart = line.indexOf(SOH)
          if (cmdStart !== -1) {
            const cmdEnd = line.indexOf(EOT, cmdStart)
            if (cmdEnd !== -1) {
              const cmdStr = decoder.decode(line.slice(cmdStart, cmdEnd + 1))
              const cmd = command.parse(cmdStr)

              switch (cmd?.command) {
                case "config":
                  if (cmd.data?.maxVisibleLines) {
                    if (cmd.data.maxVisibleLines <= 0) {
                      config.maxVisibleLines = Number.MAX_SAFE_INTEGER
                    } else {
                      config.maxVisibleLines = cmd.data.maxVisibleLines
                    }
                  }
                  break
                case "redact":
                  if (cmd.value != null) {
                    redactions.add(cmd.value)
                  }
                  break
                case "start-group":
                  inGroup = true
                  groupLines = []
                  groupName = cmd.value ?? ""
                  controller.enqueue(
                    encoder.encode(terminal.startGroup(groupName)),
                  )
                  break
                case "end-group":
                  if (inGroup) {
                    controller.enqueue(
                      encoder.encode(
                        terminal.endGroup(groupName, cmd.data?.close ?? false),
                      ),
                    )
                    inGroup = false
                    groupLines = []
                  }
                  break
                case "log":
                  if (cmd.value != null) {
                    const prefix = cmd.data?.level === "warning"
                      ? "WARNING: "
                      : cmd.data?.level === "error"
                      ? "ERROR: "
                      : ""
                    outputLine(`${prefix}${cmd.value}\n`, controller)
                  }
                  break
              }

              start = lineEnd
              i = lineEnd - 1 // -1 because loop will increment
              continue
            }
          }

          // Process and output the line
          if (redactions.size === 0) {
            outputLine(decoder.decode(line), controller)
          } else {
            let output = decoder.decode(line)
            for (const r of redactions) {
              output = output.replaceAll(r, "▓".repeat(r.length))
            }
            outputLine(output, controller)
          }

          start = lineEnd
          if (chunk[i] === CR) {
            i++ // Skip the LF if we just handled CR
          }
        }
      }

      // Store any remaining partial line in buffer
      if (start < chunk.length) {
        buffer = chunk.slice(start)
      }
    },
  })

  function outputLine(
    line: string,
    controller: TransformStreamDefaultController<Uint8Array>,
  ) {
    if (inGroup) {
      groupLines.push(line)
      if (config.maxVisibleLines === Number.MAX_SAFE_INTEGER) {
        // When showing all lines, just print directly
        controller.enqueue(encoder.encode(line))
      } else if (groupLines.length > config.maxVisibleLines) {
        controller.enqueue(encoder.encode(
          terminal.updateGroup(
            groupName,
            groupLines,
            groupLines.length,
            config.maxVisibleLines,
          ),
        ))
      } else {
        controller.enqueue(encoder.encode(line))
      }
    } else {
      controller.enqueue(encoder.encode(line))
    }
  }

  Deno.stdin.readable
    .pipeThrough(transform)
    .pipeTo(Deno.stdout.writable)
}

if (import.meta.main) {
  startListener()
}
