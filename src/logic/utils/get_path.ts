// =============================
//       file structure
// =============================
//
// ./c2ds
//    |- c2ds.exe
//    |- output
//        |- data.jsonl
//    |- config.json
//    |- models
//    |- temp
//        |- status.json
//    |- others
//
// =============================

import path from 'path';
import fs from 'fs';
import { type config_interface } from '../interface/general.interface.ts';

import appRoot from 'app-root-path';

// get root path
// if exe: ./path/to/exe
// if dev: ./path/to/c2ds

export const ROOT_PATH = path.join(appRoot.path, '$test');

export const DATA_PATH = path.join(ROOT_PATH, 'output');

export const MODELS_PATH = path.join(ROOT_PATH, 'models');

export const TEMP_PATH = path.join(ROOT_PATH, 'temp');

export const OTHER_PATH = path.join(ROOT_PATH, 'other');

export const CONFIG_PATH = path.join(ROOT_PATH, 'config.json');

export interface Paths {

    // root
    main: string;

    // config folder
    file_config: string;

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

}

let _paths: Paths | null = null;

export const get_path = () => {

    if (_paths) return _paths

    _paths = {
        main: ROOT_PATH,
        file_config: CONFIG_PATH,
        saved_data: DATA_PATH,
        models: MODELS_PATH,
        temp: TEMP_PATH,
        other: OTHER_PATH,
        file_dataset: path.join(DATA_PATH, 'data.jsonl'),
        file_status: path.join(TEMP_PATH, 'status.json'),
        file_processed_history: path.join(OTHER_PATH, 'processed_history.jsonl'),
    }

    create_file(_paths)

    return _paths
}

const create_file = (paths: Paths) => {
    
    for ( const i of Object.values(paths)) {

        const isExist = fs.existsSync(i)

        if (isExist) continue

        if (i.includes('.')) {
            fs.writeFileSync(i, '')
        } else {
            fs.mkdirSync(i, { recursive: true })
        }

    }
}

export const paths = get_path()
