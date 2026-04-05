import {Command } from "commander"

export const program = new Command();

program
.command('extract')
.alias('$s')
.description('start extract data')
.option('-f, --file <file_path>', 'file path to extract')
.action((options) => {
    console.log(options.file)
})

program
.command('edit')
.alias('$e')
.description('edit configs')
.option('-a, --action <action>', 'action to edit', (v) => to_d(v))
.option('-t, --target <target>', 'target to edit', (v) => to_d(v))
.option('-v, --value [value]', 'value to edit', (v) => to_d(v), '')
.action((options) => {

    if (options.action === 'get') {

    }
})

const to_d = (v: string) => {
    return v.toLowerCase()
}

export const executeCommand = async (input: string) => {
  try {
    // from: 'node' will remove first two args, but user won't
    await program.parseAsync(input.split(' '), { from: 'user' });
  } catch (error: any) {
    console.error('[ERROR]', error.message);
  }
};