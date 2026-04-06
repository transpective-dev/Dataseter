import {Command} from "commander"

export const program = new Command();

// Precent exiting the process when error happens
program.exitOverride();
program.configureOutput({
  writeOut: () => {},
  writeErr: () => {}
});

let currentCmdPayload: any = null;

const cleanQuotes = (v: string) => {
  if (v.length >= 2 && v.startsWith('"') && v.endsWith('"')) {
    return v.slice(1, -1);
  }
  return v;
};

program
.command('extract')
.alias(':s')
.description('start create dataset')
.option('-f, --file <file_path>', 'file path to extract', cleanQuotes)
.action((options) => {
    currentCmdPayload = { status: "extract", action: "", target: "", value: options.file || "" };
})

program
.command('hint')
.alias('?')
.description('show hints')
.action(() => {
    currentCmdPayload = { status: "hint", action: "", target: "", value: "" };
})

program
.command('config')
.alias(':c')
.description('edit configs')
.option('-a, --action <action>', 'action to edit', (v) => to_d(v), "")
.option('-t, --target <target>', 'target to edit', (v) => to_d(v), "")
.option('-v, --value [value]', 'value to edit', (v) => to_d(cleanQuotes(v)), "")
.action((options) => {
    currentCmdPayload = { status: "config", action: options.action, target: options.target, value: options.value };
})

const to_d = (v: string) => {
    return v.toLowerCase()
}

const tokenize = (str: string) => {
  const regex = /[^\s"]+|"[^"]*"/g;
  return str.match(regex) || [];
};

export const executeCommand = async (input: string) => {
  currentCmdPayload = { status: undefined, action: "", target: "", value: "" };
  try {
    // from: 'node' will remove first two args, but user won't
    const args = tokenize(input);
    await program.parseAsync(args, { from: 'user' });
    return currentCmdPayload;
  } catch (error: any) {
    return { status: undefined, action: "", target: "", value: "" };
  }
};