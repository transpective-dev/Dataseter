import { type agent_ls, type config_interface, type c_or_l } from "../interface/general.interface.ts";

import { readFile, writeFile } from "fs/promises";
import { getPaths } from "./get_path.ts";

export class Config {

    public static agent_config: agent_ls = {}

    public static user_config: config_interface = {
        default_model: undefined,
        output: {
            output_dir: undefined,
        }
    }

    public static async get_agent_ls() {
        const config = await readFile(getPaths().file_agent_config, 'utf-8');
        Config.agent_config = JSON.parse(config);
        console.log(Config.agent_config)
    }

    public static async get_config() {
        const config = await readFile(getPaths().file_user_config, 'utf-8');
        Config.user_config = JSON.parse(config);
        console.log(Config.user_config)
    }

    public static check_agent_status = () => {
        if (Object.keys(Config.agent_config).length > 0) {
            return true;
        }
        return false;
    }

    public static async get_everything() {
        await Config.get_agent_ls();
        await Config.get_config();
    }

    public static save_agent_changes = async (model_config: c_or_l) => {
        
        this.agent_config[model_config.model_name] = model_config;

        return await this.save_agent();
    }

    public static save_agent = async () => {
        try {
            await writeFile(getPaths().file_agent_config, JSON.stringify(Config.agent_config, null, 2));
            return { status: true }
        } catch (error) {
            console.log(error)
            return { status: false }
        }
    }

    public static save_changes = async () => {
        try {
            await writeFile(getPaths().file_user_config, JSON.stringify(Config.user_config, null, 2));
            return { status: true }
        } catch (error) {
            console.log(error)
            return { status: false }
        }
    }

}
