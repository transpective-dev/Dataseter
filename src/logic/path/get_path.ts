// =============================
//       file structure
// =============================
//
// ./c2ds
//    |- c2ds.exe
//    |- saved_data
//        |- data.jsonl
//    |- configs
//        |- agent.config.json
//        |- user.config.json
//    |- models
//    |- temp
//        |- status.json
//    |- others
//
// =============================

import path from 'path';
import fs from 'fs';
import { type config_interface } from '../interface/general.interface.ts';

export interface Paths {

    // root
    main: string;

    // config folder
    config: string;
    file_agent_config: string;
    file_user_config: string;

    // initial folder to save extraceted datasets 
    saved_data: string;

    // place gguf files and loras
    models: string;

    // temporary folder. for saving data extraction status, and etc.
    temp: string;
    file_dataset: string;
    file_status: string;

    // msg_logs and processed_history
    other: string;
    file_processed_history: string;
    file_msg_log: string;

}

let _paths: Paths | null = null;

const init_config: config_interface = {
    default_model: undefined,
    output: {
        output_dir: undefined
    }
}

export function getPaths(): Paths {
    if (_paths) return _paths;

    const isPackaged = app.isPackaged;

    // root for after packaged
    const EXE_DIR = path.dirname(app.getPath('exe'));

    // root for development
    const DEV_DIR = process.cwd();

    const MAIN_DIR = isPackaged ? EXE_DIR : DEV_DIR;

    let config_path: string;
    let saved_data_path: string;
    let models_path: string;
    let temp_path: string;
    let other_path: string;

    if (isPackaged) {
        config_path = path.join(MAIN_DIR, 'configs');
        saved_data_path = path.join(MAIN_DIR, 'saved_data');
        models_path = path.join(MAIN_DIR, 'models');
        temp_path = path.join(MAIN_DIR, 'temp');
        other_path = path.join(MAIN_DIR, 'other');
    } else {
        config_path = path.join(MAIN_DIR, '.test', 'configs');
        saved_data_path = path.join(MAIN_DIR, '.test', 'saved_data');
        models_path = path.join(MAIN_DIR, '.test', 'models');
        temp_path = path.join(MAIN_DIR, '.test', 'temp');
        other_path = path.join(MAIN_DIR, '.test', 'other');
    }

    if (!fs.existsSync(config_path)) {
        fs.mkdirSync(config_path, { recursive: true });
        fs.writeFileSync(path.join(config_path, 'agent.config.json'), JSON.stringify({}));
        fs.writeFileSync(path.join(config_path, 'user.config.json'), JSON.stringify(init_config, null, 2));
    }

    if (!fs.existsSync(saved_data_path)) {
        fs.mkdirSync(saved_data_path, { recursive: true });
    }

    if (!fs.existsSync(other_path)) {
        fs.mkdirSync(other_path, { recursive: true });
        fs.writeFileSync(path.join(other_path, 'processed_history.jsonl'), '');
        fs.writeFileSync(path.join(other_path, 'msg_log.jsonl'), '');
    }

    if (!fs.existsSync(models_path)) {
        fs.mkdirSync(models_path, { recursive: true });
    }

    if (!fs.existsSync(temp_path)) {
        fs.mkdirSync(temp_path, { recursive: true });
    }

    _paths = {
        main: MAIN_DIR,
        config: config_path,
        saved_data: saved_data_path,
        models: models_path,
        temp: temp_path,
        other: other_path,
        file_agent_config: path.join(config_path, 'agent.config.json'),
        file_user_config: path.join(config_path, 'user.config.json'),
        file_dataset: path.join(saved_data_path, 'data.jsonl'),
        file_status: path.join(saved_data_path, 'status.json'),
        file_processed_history: path.join(other_path, 'processed_history.jsonl'),
        file_msg_log: path.join(other_path, 'msg_log.jsonl'),
    };

    return _paths;
}

