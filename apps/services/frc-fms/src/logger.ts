import * as Winston from "winston";

const doPad = (str: string, longestWord: number) => {
  return `[${str}]`.padEnd(longestWord + 2, " ");
}

const logger = (instance: string) => Winston.createLogger({
  transports: [
    new Winston.transports.Console()
  ],
  format: Winston.format.combine(
    Winston.format.colorize({level: true}),
    Winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss"
    }),
    Winston.format.printf(info => `[frc-fms]${doPad(info.level, 17)}[${info.timestamp}]${doPad(instance, 13)}: ${info.message}`)
  ),
  exitOnError: false
});

export default logger;