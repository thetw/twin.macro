// import { mergeImportant } from './important'
import get from 'lodash.get'
import pick from 'lodash.pick'
import { isEmpty } from './utils'

// const transformImportant = ({ style, pieces: { hasImportant } }) =>
//   mergeImportant(style, hasImportant)

const applyTransforms = context => {
  const { style, pieces, state } = context

  const twinPlugins = get(state, 'config.twinPlugins')

  let changedOutput
  if (twinPlugins) {
    const env = pick(state, 'isDev', 'isProd')
    const process = pick(state, 'cwd', 'filename')
    const twinConfigData = pick(
      state,
      'isEmotion',
      'isStyledComponents',
      'isGoober',
      'userPluginData',
      'styledImport',
      'cssImport',
      'styledIdentifier',
      'cssIdentifier'
    )
    const { configTwin } = state
    const tailwindConfig = pick(
      state.config,
      'theme',
      'plugins',
      'twinPlugins',
      'presets',
      'darkMode',
      'prefix'
    )

    const replaceRule = (declaration, matchProperty = true) => (
      original,
      replacement
    ) => {
      if (isEmpty(declaration)) return

      return Object.entries(declaration).reduce((result, declaration) => {
        const [property, value] = declaration

        const matcher = matchProperty ? property : value

        const hasMatch =
          (typeof original === 'string' && matcher === original) ||
          (String(original).startsWith('/') &&
            new RegExp(original).test(matcher))

        if (!hasMatch) {
          const item = { [property]: value }
          return { ...result, ...item }
        }

        const formatReturned = returned =>
          (typeof returned === 'string' && {
            [property]: returned,
          }) ||
          (Array.isArray(returned) && {
            [returned[0]]: returned[1],
          }) ||
          (typeof returned === 'object' && returned) ||
          (typeof returned === 'function' &&
            formatReturned(returned({ property, value }))) ||
          null

        return {
          ...result,
          ...formatReturned(replacement),
        }
      }, {})
    }

    // TODO: Allow multiple plugins - I can't simply return here
    // function twinPlugin({ transforms }) {
    //   return transforms.replaceRuleByProperty(/display/, "asd");
    // }
    for (const plugin of twinPlugins) {
      changedOutput = {
        ...changedOutput,
        ...plugin({
          input: { ...pieces },
          output: style,
          transforms: {
            replaceRuleByProperty: replaceRule(style),
            replaceRuleByValue: replaceRule(style, false),
          },
          process: { ...process, env },
          tailwindConfig,
          twinConfig: configTwin,
          twinConfigData,
        }),
      }
    }
  }

  context.style = (!isEmpty(changedOutput) && changedOutput) || style

  // ====
  // if (!context.style) return
  // let result = context.style

  // TODO: Readd important here
  // if (type !== 'corePlugin') context = transformImportant(context)
  return context
}

export default applyTransforms
