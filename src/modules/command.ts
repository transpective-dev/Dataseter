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

// test command

program
.command('test')
.alias('/t')
.description('test command')
.action(() => {
    currentCmdPayload = { status: "extract", action: "", target: "", value: "E:\\WSL-Kali\\LSFP\\Just play\\c2ds\\$test\\pretest.md" };
    // currentCmdPayload = { status: "extract", action: "", target: "", value: "C:\\Users\\shin2\\Downloads\\input.pdf" };
})

program
.command('extract')
.alias('/s')
.description('start create dataset')
.option('-f, --file <file_path>', 'file path to extract', cleanQuotes)
.action((options) => {
    currentCmdPayload = { status: "extract", action: "", target: "", value: options.file || "" };
})

program
.command('hint')
.alias('/?')
.description('show hints')
.action(() => {
    currentCmdPayload = { status: "hint", action: "", target: "", value: "" };
})

program
  .command('config')
  .alias('/c')
  .description('edit configs')

  // set of -a
  .option('-g, --get <target>', 'get configs')
  .option('-s, --set <target...>', 'set configs')

  .option('-a, --action <action>', 'action to edit')
  
  .option('-t, --target <target>', 'target to edit')
  .option('-v, --value [value]', 'value to edit')
  .action((options) => {

    const action = options.get ? 'get' : options.set ? 'set' : options.action || '';
    const target = options.get ? options.get : options.set ? options.set[0] : options.target || '';
    const value = options.get ? '' : options.set ? options.set[1] : options.value || '';

    const trimmed = value.replace(/^"(.*)"$/, '$1');
    
    currentCmdPayload = { 
      status: "config", 
      action, 
      target, 
      value: trimmed || '' 
    };
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
    console.log(currentCmdPayload);
    return currentCmdPayload;
  } catch (error: any) {
    return { status: undefined, action: "", target: "", value: "" };
  }
};