const SOH = "\x01"
const STX = "\x02"
const ETX = "\x03"
const EOT = "\x04"

const COMMAND_RE = new RegExp(
  `^${SOH}(?<command>.*?)(?:${STX}(?<data>.*?))?(?:${ETX}(?<value>.*?))?${EOT}`,
)

export type Command = {
  name: CommandName
  data?: any
  value?: string
}

export type CommandName =
  | "redact"
  | "start-group"
  | "end-group"
  | "log"
  | "config"

export function stringify({ name, data, value }: Command): string {
  let str = `${SOH}${name}`
  if (data) {
    str += `${STX}${JSON.stringify(data, null, 0)}`
  }
  if (value) {
    str += `${ETX}${value}`
  }
  return `${str}${EOT}`
}

export function parse(raw: string) {
  const match = raw.match(COMMAND_RE)

  if (match == null) {
    return null
  }

  return {
    command: match.groups?.command as CommandName,
    data: match.groups?.data ? JSON.parse(match.groups.data) : undefined,
    value: match.groups?.value,
  }
}
