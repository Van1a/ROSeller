import chalk from "chalk";
import { config } from "../configuration.js";
const time = () =>
  `[${new Date().toLocaleTimeString("en-US", { hour12: true })}]`;

const error = (message: string): void =>
  console.log(`${time()} ${chalk.red(message)}`);

const success = (message: string): void =>
  console.log(`${time()} ${chalk.green(message)}`);

const warning = (message: string): void =>
  console.log(`${time()} ${chalk.yellow(message)}`);

const info = (message: string): void =>
  console.log(`${time()} ${chalk.blue(message)}`);

const devmodelog = (message: string): void => {
  if (config.developer.enable !== true) return;
  const tag = chalk.black.bgYellow.bold(" DEVMODE ");
  const timeStamp = chalk.gray(time());

  console.log(`${timeStamp} ${tag} ${chalk.bgBlue.white.bold(message)}`);
};

export { error, success, warning, info, devmodelog };
