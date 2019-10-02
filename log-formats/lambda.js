const clc = require("cli-color")

module.exports = (message, timestamp) => {
  const splittedMessage = message.split("\t")
  const header = splittedMessage.shift().split(" ")
  const body = splittedMessage.join(" ").slice(0, -1)
  let out
  switch (header[0].toUpperCase()){
    case "START":
      out = [
        "┌──────────────────────",
        timestamp,
        ` ${clc.green(header[0])}`,
        body,
        "\n│"
      ]
      break
    case "END":
      out = [
        "│",
        "\n└──────────────────────",
        timestamp,
        ` ${clc.magenta(header[0])}`,
        body
      ]
      break
    case "REPORT":
      out = [
        `${clc.yellow(header[0])} `,
        body,
        "\n"
      ]
      break
    default:
      out = [
        "│ ",
        timestamp,
        " "
        ,
        body.split("\n").map((row, i) => i > 0 ? `│ ${row}` : row).join("\n")
      ]
  }

  // eslint-disable-next-line no-console
  console.log(out.join(""))
}
