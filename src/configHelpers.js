import { MacroError } from 'babel-plugin-macros'
import { resolve } from 'path'
import { existsSync, watch, utimesSync } from 'fs'
import resolveTailwindConfig from 'tailwindcss/lib/util/resolveConfig'
import defaultTailwindConfig from 'tailwindcss/stubs/defaultConfig.stub'
import { configTwinValidators, configDefaultsTwin } from './config/twinConfig'
import flatMap from 'lodash.flatmap'
import { logGeneralError } from './logging'
import { throwIf, get } from './utils'

const getAllConfigs = config => {
  const configs = flatMap(
    [...get(config, 'presets', [defaultTailwindConfig])].reverse(),
    preset => {
      const config = typeof preset === 'function' ? preset() : preset
      return getAllConfigs(config)
    }
  )

  return [config, ...configs]
}

const watchedConfigPaths = {}

const getConfigTailwindProperties = (state, config) => {
  const sourceRoot = state.file.opts.sourceRoot || '.'
  const configFile = config && config.config

  const configPath = resolve(sourceRoot, configFile || './tailwind.config.js')
  const configExists = existsSync(configPath)

  // TODO: Turn it off
  // TODO: Testing in more situations
  // TODO: Try to avoid subsequent updates
  // TODO: Find where the babel config is at?

  // Watch the tailwind.config.js file for changes
  if (configExists && !watchedConfigPaths[configPath]) {
    watchedConfigPaths[configPath] = true
    watch(configPath, {}, eventType => {
      if (eventType !== 'change') return
      // Config file changed so touch the babel config to cause a live reload
      // TODO: I can also remove the babel config - but how to get the location in each framework?
      // TODO: Can I get the babel config location from babel?
      let babelRcPath = resolve(sourceRoot, './.babelrc')
      if (!existsSync(babelRcPath)) {
        babelRcPath = resolve(sourceRoot, './.babelrc.js')
      }

      if (!existsSync(babelRcPath)) return

      try {
        console.log('Attempting to cause a page reload...')
        const time = new Date()
        utimesSync(babelRcPath, time, time)
      } catch (_) {
        // Ignore if we don't have permissions to touch the file
      }
    })
  }

  // Remove the config file from the require cache
  // to ensure we get its current contents
  /* eslint-disable-next-line @typescript-eslint/no-dynamic-delete */
  delete require.cache[configPath]

  const configTailwind = configExists
    ? resolveTailwindConfig([...getAllConfigs(require(configPath))])
    : resolveTailwindConfig([...getAllConfigs(defaultTailwindConfig)])

  if (!configTailwind) {
    throw new MacroError(`Couldn’t find the Tailwind config`)
  }

  return { configExists, configTailwind }
}

const runConfigValidator = ([item, value]) => {
  const validatorConfig = configTwinValidators[item]
  if (!validatorConfig) return true

  const [validator, errorMessage] = validatorConfig

  throwIf(validator(value) !== true, () => logGeneralError(errorMessage))

  return true
}

const getConfigTwin = (config, state) => ({
  ...configDefaultsTwin(state),
  ...config,
})

const getConfigTwinValidated = (config, state) =>
  Object.entries(getConfigTwin(config, state)).reduce(
    (result, item) => ({
      ...result,
      ...(runConfigValidator(item) && { [item[0]]: item[1] }),
    }),
    {}
  )

export {
  getConfigTailwindProperties,
  resolveTailwindConfig,
  defaultTailwindConfig,
  getConfigTwinValidated,
}
