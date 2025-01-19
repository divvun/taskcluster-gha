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
const MAX_VISIBLE_LINES = 10

type Config = {
  maxVisibleLines: number
}

export function startListener() {
  const redactions: Set<string> = new Set()
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buffer = new Uint8Array(0)
  let config: Config = {
    maxVisibleLines: MAX_VISIBLE_LINES,
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
                  if (cmd.data) {
                    if (cmd.data.maxVisibleLines) {
                      if (cmd.data.maxVisibleLines <= 0) {
                        config.maxVisibleLines = Number.MAX_SAFE_INTEGER
                      } else {
                        config.maxVisibleLines = cmd.data.maxVisibleLines
                      }
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
                    encoder.encode(`${SAVE_CURSOR}--- ${groupName}\n`),
                  )
                  break
                case "end-group":
                  if (inGroup) {
                    if (cmd.data?.close) {
                      controller.enqueue(
                        encoder.encode(
                          `^^^\n${RESTORE_CURSOR}${CLEAR_TO_END}~~~ ${groupName}\n`,
                        ),
                      )
                    } else {
                      controller.enqueue(
                        encoder.encode(`^^^\n`),
                      )
                    }
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
                    outputLine(
                      `${prefix}${cmd.value}\n`,
                      controller,
                      config.maxVisibleLines,
                    )
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
    maxLines: number,
  ) {
    if (inGroup) {
      groupLines.push(line)
      if (groupLines.length > maxLines) {
        // Clear previous output and show last N lines
        const output =
          `${RESTORE_CURSOR}${CLEAR_TO_END}--- ${groupName} (${groupLines.length} lines)\n` +
          groupLines.slice(-maxLines).join("")
        controller.enqueue(encoder.encode(output))
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
