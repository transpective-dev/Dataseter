import { paths } from "./get_path.ts";

export class Utils {

    public static generateId = (length: number = 6) => {
        const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    public static lineSplit = (text: string) => {

        // standardize line breaks
        text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        // split the line
        let lines = text.split('\n');

        // remove empty lines
        lines = lines.map(line => line.trim()).filter(line => line.length > 0);

        return lines;
    };

}

import { readFile } from 'fs/promises';

export class history {

    public static get = async () => {
        return await readFile(paths.file_processed_history, 'utf-8').then((i) => {
            return i.length < 5 ? null : Utils.lineSplit(i).map((i) => JSON.parse(i));
        })
    }

}

import { type schema_base } from '../interface/session.interface.ts';

export const schema_builder = (schema: schema_base) => {

    if (!schema.format) {
        console.error('format is missing');
    }

    if (!schema.format.input) {
        console.error('input is missing');
    }

    const schema_type: 'array' = 'array';

    const properties: {
        [key: string]: {
            type: string,
            description: string,
            enum?: string[]
        }
    } = {};

    const required: string[] = [];

    for (const key in schema.format) {

        const i = schema.format[key];

        // in can check key_value 
        const description = 'requirement' in i! ? i.requirement : i!.exp;

        properties[key] = {
            type: 'string',
            description,
        };

        if (i!.options) {
            properties[key].enum = i!.options;
        }

        required.push(key);

    }

    return {
        name: "data_extraction",
        strict: true,
        schema: {
            type: schema_type,
            properties,
            required,
            additionalProperties: false,
        }
    }
}

import { appendFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { type write_into_file } from '../interface/session.interface.ts';

export const writeIntoFile = async (kind: 'dataset' | "config" | 'status', path: string, payloads: write_into_file) => {

    const file_exist = existsSync(path);

    if (!file_exist) {
        await writeFile(path, '');
    }

    switch (kind) {
        case 'dataset':
            try {

                if (!payloads.dataset?.content) return { status: false, msg: 'content is empty' };

                if (Array.isArray(payloads.dataset.content)) {
                    for (const i of payloads.dataset.content) {
                        await appendFile(path, JSON.stringify(i) + '\n');
                    }
                } else {
                    await appendFile(path, JSON.stringify(payloads.dataset.content) + '\n');
                }

                return { status: true, msg: 'success' }

            } catch (error) {

                console.error(error);
                return { status: false, msg: error }

            }

        case 'config':
            break

        case 'status':
            
            try {
                
                await writeFile(path, JSON.stringify(payloads.status?.content));
                return { status: true, msg: 'success' }
                
            } catch (error) {
                
                console.error(error);
                return { status: false, msg: error }

            }

        default:
            console.error('something went wrong with writeIntoFile');
    }
}

export const pretestWrite = async (data: string[], path: string) => {

    for (const i of data) {
        await appendFile(path, i)
    }
}

