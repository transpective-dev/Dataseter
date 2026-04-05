import Conf from 'conf'
import { paths } from './logic/utils/get_path.ts'
import { config_schema, type ConfigSchema } from './assets/schema.ts'
import fs from 'fs'

export class ConfigManager {
  public config: Conf<ConfigSchema>

  constructor() {

    if (!fs.readFileSync(paths.file_config, 'utf-8')) {
      fs.writeFileSync(paths.file_config, '{}');
    }

    this.config = new Conf<ConfigSchema>({
      cwd: paths.main,
      configName: 'config'
    })

    if (!this.has('model_config')) {
      // parse schema
      const defaultConfig = config_schema.parse({})

      // set default config
      Object.entries(defaultConfig).forEach(([key, value]) => {
        !this.has(key as keyof ConfigSchema) &&

          // set default as value 
          this.set(key as keyof ConfigSchema, value)
      })
    }
  }

  get<T extends keyof ConfigSchema>(key: T): ConfigSchema[T] {
    return this.config.get(key)
  }

  set<T extends keyof ConfigSchema>(key: T, value: ConfigSchema[T]) {
    this.config.set(key, value)
  }

  has<T extends keyof ConfigSchema>(key: T): boolean {
    return this.config.has(key)
  }
}

export const configManager = new ConfigManager()