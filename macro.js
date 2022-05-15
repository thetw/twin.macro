var babelPluginMacros = require('babel-plugin-macros');
var babylon = require('@babel/parser');
var color$1 = require('tailwindcss/lib/util/color');
var deepMerge = require('lodash.merge');
var get = require('lodash.get');
var dataTypes = require('tailwindcss/lib/util/dataTypes');
var stringSimilarity = require('string-similarity');
var chalk = require('chalk');
var path = require('path');
var fs = require('fs');
var resolveTailwindConfig = require('tailwindcss/lib/util/resolveConfig');
var defaultTailwindConfig = require('tailwindcss/stubs/defaultConfig.stub');
var flatMap = require('lodash.flatmap');
var template = require('@babel/template');
var timSort = require('timsort');
var cleanSet = require('clean-set');
var parseBoxShadowValue = require('tailwindcss/lib/util/parseBoxShadowValue');
var postcss = require('postcss');
var require$$0 = require('util');
var transformThemeValue$1 = require('tailwindcss/lib/util/transformThemeValue');
var parseObjectStyles = require('tailwindcss/lib/util/parseObjectStyles');
var isPlainObject = require('tailwindcss/lib/util/isPlainObject');
var toPath = require('tailwindcss/lib/util/toPath');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var babylon__default = /*#__PURE__*/_interopDefaultLegacy(babylon);
var deepMerge__default = /*#__PURE__*/_interopDefaultLegacy(deepMerge);
var get__default = /*#__PURE__*/_interopDefaultLegacy(get);
var stringSimilarity__default = /*#__PURE__*/_interopDefaultLegacy(stringSimilarity);
var chalk__default = /*#__PURE__*/_interopDefaultLegacy(chalk);
var resolveTailwindConfig__default = /*#__PURE__*/_interopDefaultLegacy(resolveTailwindConfig);
var defaultTailwindConfig__default = /*#__PURE__*/_interopDefaultLegacy(defaultTailwindConfig);
var flatMap__default = /*#__PURE__*/_interopDefaultLegacy(flatMap);
var template__default = /*#__PURE__*/_interopDefaultLegacy(template);
var timSort__default = /*#__PURE__*/_interopDefaultLegacy(timSort);
var cleanSet__default = /*#__PURE__*/_interopDefaultLegacy(cleanSet);
var postcss__default = /*#__PURE__*/_interopDefaultLegacy(postcss);
var require$$0__default = /*#__PURE__*/_interopDefaultLegacy(require$$0);
var transformThemeValue__default = /*#__PURE__*/_interopDefaultLegacy(transformThemeValue$1);
var parseObjectStyles__default = /*#__PURE__*/_interopDefaultLegacy(parseObjectStyles);
var isPlainObject__default = /*#__PURE__*/_interopDefaultLegacy(isPlainObject);

const SPACE_ID = '__SPACE_ID__';

const throwIf = (expression, callBack) => {
  if (!expression) return;
  throw new babelPluginMacros.MacroError(callBack());
};

const isEmpty$1 = value => value === undefined || value === null || typeof value === 'object' && Object.keys(value).length === 0 || typeof value === 'string' && value.trim().length === 0;

function transformThemeValue(themeSection) {
  if (['fontSize', 'outline'].includes(themeSection)) {
    return value => Array.isArray(value) ? value[0] : value;
  }

  if (['fontFamily', 'boxShadow', 'transitionProperty', 'transitionDuration', 'transitionDelay', 'transitionTimingFunction', 'backgroundImage', 'backgroundSize', 'backgroundColor', 'cursor', 'animation'].includes(themeSection)) {
    return value => Array.isArray(value) ? value.join(', ') : value;
  }

  if (themeSection === 'colors') {
    return value => typeof value === 'function' ? value({}) : value;
  }

  return value => value;
}

const objectToStringValues = obj => {
  if (typeof obj === 'object' && !Array.isArray(obj)) return Object.entries(obj).reduce((result, [key, value]) => deepMerge__default["default"](result, {
    [key]: objectToStringValues(value)
  }), {});
  if (Array.isArray(obj)) return obj.map(i => objectToStringValues(i));
  if (typeof obj === 'number') return String(obj); // typeof obj = string / function

  return obj;
};

const getTheme = configTheme => grab => {
  if (!grab) return configTheme; // Allow theme`` which gets supplied as an array

  const value = Array.isArray(grab) ? grab[0] : grab; // Get the theme key so we can apply certain rules in transformThemeValue

  const themeKey = value.split('.')[0]; // Get the resulting value from the config

  const themeValue = get__default["default"](configTheme, value);
  return objectToStringValues(transformThemeValue(themeKey)(themeValue));
};

const stripNegative = string => string && string.length > 1 && string.slice(0, 1) === '-' ? string.slice(1, string.length) : string;

const camelize = string => string && string.replace(/\W+(.)/g, (_, chr) => chr.toUpperCase());

const isNumeric = str => {
  /* eslint-disable-next-line eqeqeq */
  if (typeof str != 'string') return false;
  return !Number.isNaN(str) && !Number.isNaN(Number.parseFloat(str));
};

const isClass = str => new RegExp(/(\s*\.|{{)\w/).test(str);

const isMediaQuery = str => str.startsWith('@media');

const isShortCss = className => new RegExp(/[^/-]\[/).test(className);

const isArbitraryCss = className => new RegExp(/-\[/).test(className); // Split a string at a value


function splitOnFirst(input, delim) {
  return (([first, ...rest]) => [first, rest.join(delim)])(input.split(delim));
}

const formatProp = classes => replaceSpaceId(classes // Normalize spacing
.replace(/\s\s+/g, ' ') // Remove newline characters
.replace(/\n/g, ' ').trim());

const isSpaceSeparatedColor = color => {
  const spaceMatch = typeof color === 'string' ? color.split(/\s+(?=[^)\]}]*(?:[([{]|$))/) : [];
  if (spaceMatch.length === 0) return;
  const hasValidSpaceSeparatedColors = spaceMatch.every(color => // FIXME: Remove comment and fix next line
  // eslint-disable-next-line unicorn/prefer-regexp-test
  Boolean(/^var\(--\w*\)$/.exec(color) ? color : color$1.parseColor(color)));
  return hasValidSpaceSeparatedColors;
};

const isObject = val => // eslint-disable-next-line eqeqeq, no-eq-null, @typescript-eslint/no-unnecessary-boolean-literal-compare
val != null && typeof val === 'object' && Array.isArray(val) === false;

const getFirstValue = (list, getValue) => {
  let firstValue;
  const listLength = list.length - 1;
  const listItem = list.find((listItem, index) => {
    const isLast = index === listLength;
    firstValue = getValue(listItem, {
      index,
      isLast
    });
    return Boolean(firstValue);
  });
  return [firstValue, listItem];
};

const replaceSpaceId = className => className.replace(new RegExp(SPACE_ID, 'g'), ' ');

const toArray = arr => Array.isArray(arr) ? arr : [arr];

const formatCssProperty = string => {
  // https://stackoverflow.com/questions/448981/which-characters-are-valid-in-css-class-names-selectors
  // FIXME: Remove comment and fix next line
  // eslint-disable-next-line unicorn/prefer-regexp-test
  if (string && string.match(/^-{2,3}[_a-z]+[\w-]*/i)) return string;
  return camelize(string);
};

function _extends() {
  _extends = Object.assign || function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];

      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }

    return target;
  };

  return _extends.apply(this, arguments);
}

function _objectWithoutPropertiesLoose(source, excluded) {
  if (source == null) return {};
  var target = {};
  var sourceKeys = Object.keys(source);
  var key, i;

  for (i = 0; i < sourceKeys.length; i++) {
    key = sourceKeys[i];
    if (excluded.indexOf(key) >= 0) continue;
    target[key] = source[key];
  }

  return target;
}

const buildStyleSet = (property, color, pieces) => {
  const value = `${color}${pieces.important}`;
  if (!property) return value;
  return {
    [property]: value
  };
};

const maybeAddAlpha = (value, {
  pieces,
  variable = ''
}) => typeof value === 'function' || pieces.alpha && typeof value === 'string' && dataTypes.color(value) ? toAlpha({
  pieces,
  variable,
  property: undefined
})(value, pieces.alpha, value) : value;

const toAlpha = ({
  pieces,
  property,
  variable
}) => (color, alpha, fallBackColor) => {
  const newPieces = pieces.hasVariantVisited && _extends({}, pieces, {
    alpha: '',
    hasAlpha: false
  }) || alpha && _extends({}, pieces, {
    alpha,
    hasAlpha: true
  }) || pieces;
  return withAlpha(_extends({
    color,
    property
  }, !pieces.hasVariantVisited && {
    variable
  }, {
    pieces: newPieces,
    fallBackColor
  }));
};

const withAlpha = ({
  color,
  property,
  variable,
  pieces = {
    hasAlpha: false,
    alpha: '',
    important: ''
  },
  fallBackColor = false
}) => {
  if (!color) return;
  if (Array.isArray(color)) color = color.join(',');

  if (typeof color === 'function') {
    if (variable && property) {
      if (pieces.hasAlpha) return buildStyleSet(property, color({
        opacityValue: pieces.alpha
      }), pieces);
      return {
        [variable]: '1',
        [property]: `${color({
          opacityVariable: variable,
          opacityValue: `var(${variable})`
        })}${pieces.important}`
      };
    }

    color = color({
      opacityVariable: variable
    });
  }

  const parsed = color$1.parseColor(color);

  if (parsed === null) {
    // next-line: "!fallBackColor" is a workaround for variables used within these classes:
    // from-[var(--color)] + via-[var(--color)]
    const hasValidSpaceSeparatedColors = !fallBackColor && isSpaceSeparatedColor(color);
    if (hasValidSpaceSeparatedColors) return buildStyleSet(property, color, pieces);
    if (dataTypes.gradient(color)) return buildStyleSet(property, color, pieces);
    if (fallBackColor) return buildStyleSet(property, fallBackColor, pieces);
    return;
  }

  if (parsed.alpha !== undefined) {
    // For gradients
    if (color === 'transparent' && fallBackColor) return buildStyleSet(property, pieces.alpha ? color$1.formatColor(_extends({}, parsed, {
      alpha: pieces.alpha
    })) : color, pieces); // Has an alpha value, return color as-is

    return buildStyleSet(property, color, pieces);
  }

  if (pieces.alpha) return buildStyleSet(property, color$1.formatColor(_extends({}, parsed, {
    alpha: pieces.alpha
  })), pieces);
  if (variable) return {
    [variable]: '1',
    [property]: `${color$1.formatColor(_extends({}, parsed, {
      alpha: `var(${variable})`
    }))}${pieces.important}`
  };
  return buildStyleSet(property, color, pieces);
};

const addDataTwPropToPath = ({
  t,
  attributes,
  rawClasses,
  path,
  state,
  propName = 'data-tw'
}) => {
  const dataTwPropAllEnvironments = propName === 'data-tw' && state.configTwin.dataTwProp === 'all';
  const dataCsPropAllEnvironments = propName === 'data-cs' && state.configTwin.dataCsProp === 'all';
  if (state.isProd && !dataTwPropAllEnvironments && !dataCsPropAllEnvironments) return;
  if (propName === 'data-tw' && !state.configTwin.dataTwProp) return;
  if (propName === 'data-cs' && !state.configTwin.dataCsProp) return; // Remove the existing debug attribute if you happen to have it

  const dataProperty = attributes.filter(p => p.node && p.node.name && p.node.name.name === propName); // FIXME: Remove comment and fix next line
  // eslint-disable-next-line unicorn/no-array-for-each

  dataProperty.forEach(path => path.remove());
  const classes = formatProp(rawClasses); // Add the attribute

  path.insertAfter(t.jsxAttribute(t.jsxIdentifier(propName), t.stringLiteral(classes)));
};

const addDataPropToExistingPath = ({
  t,
  attributes,
  rawClasses,
  path,
  state,
  propName = 'data-tw'
}) => {
  const dataTwPropAllEnvironments = propName === 'data-tw' && state.configTwin.dataTwProp === 'all';
  const dataCsPropAllEnvironments = propName === 'data-cs' && state.configTwin.dataCsProp === 'all';
  if (state.isProd && !dataTwPropAllEnvironments && !dataCsPropAllEnvironments) return;
  if (propName === 'data-tw' && !state.configTwin.dataTwProp) return;
  if (propName === 'data-cs' && !state.configTwin.dataCsProp) return; // Append to the existing debug attribute

  const dataProperty = attributes.find(p => p.node && p.node.name && p.node.name.name === propName);

  if (dataProperty) {
    try {
      // Existing data prop
      if (dataProperty.node.value.value) {
        dataProperty.node.value.value = `${[dataProperty.node.value.value, rawClasses].filter(Boolean).join(' | ')}`;
        return;
      } // New data prop


      dataProperty.node.value.expression.value = `${[dataProperty.node.value.expression.value, rawClasses].filter(Boolean).join(' | ')}`;
    } catch (_) {}

    return;
  }

  const classes = formatProp(rawClasses); // Add a new attribute

  path.pushContainer('attributes', t.jSXAttribute(t.jSXIdentifier(propName), t.jSXExpressionContainer(t.stringLiteral(classes))));
};

// https://tailwindcss.com/docs/font-variant-numeric
// This feature uses var+comment hacks to get around property stripping:
// https://github.com/tailwindlabs/tailwindcss.com/issues/522#issuecomment-687667238
const cssFontVariantNumericValue = 'var(--tw-ordinal) var(--tw-slashed-zero) var(--tw-numeric-figure) var(--tw-numeric-spacing) var(--tw-numeric-fraction)';
const cssTransformValue = ['translate(var(--tw-translate-x), var(--tw-translate-y))', 'rotate(var(--tw-rotate))', 'skewX(var(--tw-skew-x))', 'skewY(var(--tw-skew-y))', 'scaleX(var(--tw-scale-x))', 'scaleY(var(--tw-scale-y))'].join(' ');
const cssFilterValue = ['var(--tw-blur)', 'var(--tw-brightness)', 'var(--tw-contrast)', 'var(--tw-grayscale)', 'var(--tw-hue-rotate)', 'var(--tw-invert)', 'var(--tw-saturate)', 'var(--tw-sepia)', 'var(--tw-drop-shadow)'].join(' ');
const cssBackdropFilterValue = ['var(--tw-backdrop-blur)', 'var(--tw-backdrop-brightness)', 'var(--tw-backdrop-contrast)', 'var(--tw-backdrop-grayscale)', 'var(--tw-backdrop-hue-rotate)', 'var(--tw-backdrop-invert)', 'var(--tw-backdrop-opacity)', 'var(--tw-backdrop-saturate)', 'var(--tw-backdrop-sepia)'].join(' ');
const cssTouchActionValue = 'var(--tw-pan-x) var(--tw-pan-y) var(--tw-pinch-zoom)';
var corePlugins = {
  // https://tailwindcss.com/docs/container
  container: {
    output({
      theme,
      pieces
    }) {
      const {
        className
      } = pieces;
      if (className !== 'container') return;
      const container = theme('container');
      const {
        padding,
        margin,
        center
      } = container;
      const screens = container.screens || theme('screens'); // eslint-disable-next-line unicorn/consistent-function-scoping

      const properties = type => ({
        left: `${type}Left`,
        right: `${type}Right`
      });

      const getSpacingFromArray = ({
        values,
        left,
        right
      }) => {
        if (!Array.isArray(values)) return;
        const [valueLeft, valueRight] = values;
        return {
          [left]: valueLeft,
          [right]: valueRight
        };
      };

      const getSpacingStyle = (type, values, key) => {
        if (Array.isArray(values) || typeof values !== 'object') return;
        const propertyValue = values[key];
        if (!propertyValue) return;
        const objectArraySpacing = getSpacingFromArray(_extends({
          values: propertyValue
        }, properties(type)));
        if (objectArraySpacing) return objectArraySpacing;
        return {
          [properties(type).left]: propertyValue,
          [properties(type).right]: propertyValue
        };
      };

      const mediaScreens = Object.entries(screens).reduce((accumulator, [key, rawValue]) => {
        const value = typeof rawValue === 'object' ? rawValue.min || rawValue['min-width'] : rawValue;
        return _extends({}, accumulator, {
          [`@media (min-width: ${value})`]: _extends({
            maxWidth: value
          }, padding && getSpacingStyle('padding', padding, key), !center && margin && getSpacingStyle('margin', margin, key))
        });
      }, {});
      const paddingStyles = Array.isArray(padding) ? getSpacingFromArray(_extends({
        values: padding
      }, properties('padding'))) : typeof padding === 'object' ? getSpacingStyle('padding', padding, 'DEFAULT') : {
        paddingLeft: padding,
        paddingRight: padding
      };
      let marginStyles = Array.isArray(margin) ? getSpacingFromArray(_extends({
        values: margin
      }, properties('margin'))) : typeof margin === 'object' ? getSpacingStyle('margin', margin, 'DEFAULT') : {
        marginLeft: margin,
        marginRight: margin
      }; // { center: true } overrides any margin styles

      if (center) marginStyles = {
        marginLeft: 'auto',
        marginRight: 'auto'
      };
      return _extends({
        width: '100%'
      }, paddingStyles, marginStyles, mediaScreens);
    },

    supportsImportant: false
  },
  // https://tailwindcss.com/docs/screen-readers
  'sr-only': {
    output: {
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: '0',
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      borderWidth: '0'
    },
    config: 'accessibility'
  },
  'not-sr-only': {
    output: {
      position: 'static',
      width: 'auto',
      height: 'auto',
      padding: '0',
      margin: '0',
      overflow: 'visible',
      clip: 'auto',
      whiteSpace: 'normal'
    },
    config: 'accessibility'
  },
  // https://tailwindcss.com/docs/pointer-events
  'pointer-events-none': {
    output: {
      pointerEvents: 'none'
    }
  },
  'pointer-events-auto': {
    output: {
      pointerEvents: 'auto'
    }
  },
  // https://tailwindcss.com/docs/visibility
  visible: {
    output: {
      visibility: 'visible'
    }
  },
  invisible: {
    output: {
      visibility: 'hidden'
    }
  },
  // https://tailwindcss.com/docs/position
  static: {
    output: {
      position: 'static'
    }
  },
  fixed: {
    output: {
      position: 'fixed'
    }
  },
  absolute: {
    output: {
      position: 'absolute'
    }
  },
  relative: {
    output: {
      position: 'relative'
    }
  },
  sticky: {
    output: {
      position: 'sticky'
    }
  },
  // https://tailwindcss.com/docs/top-right-bottom-left
  'inset-y': {
    property: ['top', 'bottom'],
    config: 'inset',
    supportsNegativeValues: true
  },
  'inset-x': {
    property: ['left', 'right'],
    config: 'inset',
    supportsNegativeValues: true
  },
  inset: {
    property: ['top', 'right', 'bottom', 'left'],
    config: 'inset',
    supportsNegativeValues: true
  },
  // https://tailwindcss.com/docs/top-right-bottom-left
  top: {
    property: 'top',
    config: 'inset',
    supportsNegativeValues: true
  },
  bottom: {
    property: 'bottom',
    config: 'inset',
    supportsNegativeValues: true
  },
  right: {
    property: 'right',
    config: 'inset',
    supportsNegativeValues: true
  },
  left: {
    property: 'left',
    config: 'inset',
    supportsNegativeValues: true
  },
  // https://tailwindcss.com/docs/isolation
  isolate: {
    output: {
      isolation: 'isolate'
    }
  },
  'isolation-auto': {
    output: {
      isolation: 'auto'
    }
  },
  // https://tailwindcss.com/docs/z-index
  z: {
    property: 'zIndex',
    config: 'zIndex',
    supportsNegativeValues: true
  },
  // https://tailwindcss.com/docs/order
  order: {
    property: 'order',
    config: 'order',
    supportsNegativeValues: true
  },
  // https://tailwindcss.com/docs/grid-column
  col: {
    property: 'gridColumn',
    config: 'gridColumn'
  },
  'col-start': {
    property: 'gridColumnStart',
    config: 'gridColumnStart'
  },
  'col-end': {
    property: 'gridColumnEnd',
    config: 'gridColumnEnd'
  },
  // Deprecated since tailwindcss v1.7.0
  'col-gap': {
    property: 'columnGap',
    config: 'gap'
  },
  'row-gap': {
    property: 'rowGap',
    config: 'gap'
  },
  // https://tailwindcss.com/docs/grid-row
  row: {
    property: 'gridRow',
    config: 'gridRow'
  },
  'row-start': {
    property: 'gridRowStart',
    config: 'gridRowStart'
  },
  'row-end': {
    property: 'gridRowEnd',
    config: 'gridRowEnd'
  },
  // https://tailwindcss.com/docs/float
  'float-right': {
    output: {
      float: 'right'
    }
  },
  'float-left': {
    output: {
      float: 'left'
    }
  },
  'float-none': {
    output: {
      float: 'none'
    }
  },
  // https://tailwindcss.com/docs/clear
  'clear-left': {
    output: {
      clear: 'left'
    }
  },
  'clear-right': {
    output: {
      clear: 'right'
    }
  },
  'clear-both': {
    output: {
      clear: 'both'
    }
  },
  'clear-none': {
    output: {
      clear: 'none'
    }
  },
  // https://tailwindcss.com/docs/margin
  mt: {
    property: 'marginTop',
    config: 'margin',
    supportsNegativeValues: true
  },
  mr: {
    property: 'marginRight',
    config: 'margin',
    supportsNegativeValues: true
  },
  mb: {
    property: 'marginBottom',
    config: 'margin',
    supportsNegativeValues: true
  },
  ml: {
    property: 'marginLeft',
    config: 'margin',
    supportsNegativeValues: true
  },
  mx: {
    property: ['marginLeft', 'marginRight'],
    config: 'margin',
    supportsNegativeValues: true
  },
  my: {
    property: ['marginTop', 'marginBottom'],
    config: 'margin',
    supportsNegativeValues: true
  },
  m: {
    property: 'margin',
    config: 'margin',
    supportsNegativeValues: true
  },
  // https://tailwindcss.com/docs/box-sizing
  'box-border': {
    output: {
      boxSizing: 'border-box'
    }
  },
  'box-content': {
    output: {
      boxSizing: 'content-box'
    }
  },
  // https://tailwindcss.com/docs/display
  block: {
    output: {
      display: 'block'
    }
  },
  'inline-block': {
    output: {
      display: 'inline-block'
    }
  },
  inline: {
    output: {
      display: 'inline'
    }
  },
  'inline-flex': {
    output: {
      display: 'inline-flex'
    }
  },
  table: {
    output: {
      display: 'table'
    }
  },
  'inline-table': {
    output: {
      display: 'inline-table'
    }
  },
  'table-caption': {
    output: {
      display: 'table-caption'
    }
  },
  'table-cell': {
    output: {
      display: 'table-cell'
    }
  },
  'table-column': {
    output: {
      display: 'table-column'
    }
  },
  'table-column-group': {
    output: {
      display: 'table-column-group'
    }
  },
  'table-footer-group': {
    output: {
      display: 'table-footer-group'
    }
  },
  'table-header-group': {
    output: {
      display: 'table-header-group'
    }
  },
  'table-row-group': {
    output: {
      display: 'table-row-group'
    }
  },
  'table-row': {
    output: {
      display: 'table-row'
    }
  },
  'flow-root': {
    output: {
      display: 'flow-root'
    }
  },
  grid: {
    output: {
      display: 'grid'
    }
  },
  'inline-grid': {
    output: {
      display: 'inline-grid'
    }
  },
  contents: {
    output: {
      display: 'contents'
    }
  },
  'list-item': {
    output: {
      display: 'list-item'
    }
  },
  hidden: {
    output: {
      display: 'none'
    }
  },
  // https://tailwindcss.com/docs/aspect-ratio
  aspect: {
    property: 'aspectRatio',
    config: 'aspectRatio'
  },
  // https://tailwindcss.com/docs/height
  h: {
    property: 'height',
    config: 'height'
  },
  // https://tailwindcss.com/docs/max-height
  'max-h': {
    property: 'maxHeight',
    config: 'maxHeight'
  },
  // https://tailwindcss.com/docs/min-height
  'min-h': {
    property: 'minHeight',
    config: 'minHeight'
  },
  // https://tailwindcss.com/docs/width
  w: {
    property: 'width',
    config: 'width'
  },
  // https://tailwindcss.com/docs/min-width
  'min-w': {
    property: 'minWidth',
    config: 'minWidth'
  },
  // https://tailwindcss.com/docs/max-width
  'max-w': {
    property: 'maxWidth',
    config: 'maxWidth'
  },
  // https://tailwindcss.com/docs/flex
  flex: [{
    output: {
      display: 'flex'
    }
  }, {
    property: 'flex',
    config: 'flex'
  }],
  // https://tailwindcss.com/docs/flex-shrink
  shrink: {
    property: 'flexShrink',
    config: 'flexShrink'
  },
  'flex-shrink': {
    property: 'flexShrink',
    config: 'flexShrink'
  },
  // https://tailwindcss.com/docs/flex-grow
  'flex-grow': {
    property: 'flexGrow',
    config: 'flexGrow'
  },
  grow: {
    property: 'flexGrow',
    config: 'flexGrow'
  },
  // https://tailwindcss.com/docs/flex-basis
  basis: {
    property: 'flexBasis',
    config: 'flexBasis'
  },
  // https://tailwindcss.com/docs/table-layout
  'table-auto': {
    output: {
      tableLayout: 'auto'
    }
  },
  'table-fixed': {
    output: {
      tableLayout: 'fixed'
    }
  },
  // https://tailwindcss.com/docs/border-collapse
  'border-collapse': {
    output: {
      borderCollapse: 'collapse'
    }
  },
  'border-separate': {
    output: {
      borderCollapse: 'separate'
    }
  },
  // TODO: Border spacing
  // https://tailwindcss.com/docs/transform-origin
  origin: {
    property: 'transformOrigin',
    config: 'transformOrigin'
  },
  // https://tailwindcss.com/docs/translate
  'translate-x': {
    output: ({
      value
    }) => ({
      '--tw-translate-x': value,
      transform: cssTransformValue
    }),
    config: 'translate',
    supportsNegativeValues: true
  },
  'translate-y': {
    output: ({
      value
    }) => ({
      '--tw-translate-y': value,
      transform: cssTransformValue
    }),
    config: 'translate',
    supportsNegativeValues: true
  },
  // https://tailwindcss.com/docs/rotate
  rotate: {
    output: ({
      value
    }) => ({
      '--tw-rotate': value,
      transform: cssTransformValue
    }),
    config: 'rotate',
    supportsNegativeValues: true
  },
  // https://tailwindcss.com/docs/skew
  'skew-x': {
    output: ({
      value
    }) => ({
      '--tw-skew-x': value,
      transform: cssTransformValue
    }),
    config: 'skew',
    supportsNegativeValues: true
  },
  'skew-y': {
    output: ({
      value
    }) => ({
      '--tw-skew-y': value,
      transform: cssTransformValue
    }),
    config: 'skew',
    supportsNegativeValues: true
  },
  // https://tailwindcss.com/docs/scale
  'scale-x': {
    output: ({
      value
    }) => ({
      '--tw-scale-x': value,
      transform: cssTransformValue
    }),
    config: 'scale',
    supportsNegativeValues: true
  },
  'scale-y': {
    output: ({
      value
    }) => ({
      '--tw-scale-y': value,
      transform: cssTransformValue
    }),
    config: 'scale',
    supportsNegativeValues: true
  },
  scale: {
    output: ({
      value
    }) => ({
      '--tw-scale-x': value,
      '--tw-scale-y': value,
      transform: cssTransformValue
    }),
    config: 'scale',
    supportsNegativeValues: true
  },
  transform: {
    output: {
      transform: cssTransformValue
    }
  },
  'transform-cpu': {
    output: {
      transform: cssTransformValue
    }
  },
  'transform-gpu': {
    output: {
      transform: cssTransformValue.replace('translate(var(--tw-translate-x), var(--tw-translate-y))', 'translate3d(var(--tw-translate-x), var(--tw-translate-y), 0)')
    }
  },
  'transform-none': {
    output: {
      transform: 'none'
    }
  },
  // https://tailwindcss.com/docs/animation
  animate: {
    property: 'animation',
    config: 'animation'
  },
  // https://tailwindcss.com/docs/cursor
  cursor: {
    property: 'cursor',
    config: 'cursor'
  },
  // https://tailwindcss.com/docs/touch-action
  'touch-auto': {
    output: {
      touchAction: 'auto'
    }
  },
  'touch-none': {
    output: {
      touchAction: 'none'
    }
  },
  'touch-pan-x': {
    output: {
      '--tw-pan-x': 'pan-x',
      touchAction: cssTouchActionValue
    }
  },
  'touch-pan-left': {
    output: {
      '--tw-pan-x': 'pan-left',
      touchAction: cssTouchActionValue
    }
  },
  'touch-pan-right': {
    output: {
      '--tw-pan-x': 'pan-right',
      touchAction: cssTouchActionValue
    }
  },
  'touch-pan-y': {
    output: {
      '--tw-pan-y': 'pan-y',
      touchAction: cssTouchActionValue
    }
  },
  'touch-pan-up': {
    output: {
      '--tw-pan-y': 'pan-up',
      touchAction: cssTouchActionValue
    }
  },
  'touch-pan-down': {
    output: {
      '--tw-pan-y': 'pan-down',
      touchAction: cssTouchActionValue
    }
  },
  'touch-pinch-zoom': {
    output: {
      '--tw-pinch-zoom': 'pinch-zoom',
      touchAction: cssTouchActionValue
    }
  },
  'touch-manipulation': {
    output: {
      touchAction: 'manipulation'
    }
  },
  // https://tailwindcss.com/docs/user-select
  'select-none': {
    output: {
      userSelect: 'none'
    }
  },
  'select-text': {
    output: {
      userSelect: 'text'
    }
  },
  'select-all': {
    output: {
      userSelect: 'all'
    }
  },
  'select-auto': {
    output: {
      userSelect: 'auto'
    }
  },
  // https://tailwindcss.com/docs/resize
  'resize-none': {
    output: {
      resize: 'none'
    }
  },
  'resize-y': {
    output: {
      resize: 'vertical'
    }
  },
  'resize-x': {
    output: {
      resize: 'horizontal'
    }
  },
  resize: {
    output: {
      resize: 'both'
    }
  },
  // https://tailwindcss.com/docs/scroll-snap-type
  'snap-none': {
    output: {
      scrollSnapType: 'none'
    }
  },
  'snap-x': {
    output: {
      scrollSnapType: 'x var(--tw-scroll-snap-strictness)'
    }
  },
  'snap-y': {
    output: {
      scrollSnapType: 'y var(--tw-scroll-snap-strictness)'
    }
  },
  'snap-both': {
    output: {
      scrollSnapType: 'both var(--tw-scroll-snap-strictness)'
    }
  },
  'snap-mandatory': {
    output: {
      '--tw-scroll-snap-strictness': 'mandatory'
    }
  },
  'snap-proximity': {
    output: {
      '--tw-scroll-snap-strictness': 'proximity'
    }
  },
  // https://tailwindcss.com/docs/scroll-snap-align
  'snap-start': {
    output: {
      scrollSnapAlign: 'start'
    }
  },
  'snap-end': {
    output: {
      scrollSnapAlign: 'end'
    }
  },
  'snap-center': {
    output: {
      scrollSnapAlign: 'center'
    }
  },
  'snap-align-none': {
    output: {
      scrollSnapAlign: 'none'
    }
  },
  // https://tailwindcss.com/docs/scroll-snap-stop
  'snap-normal': {
    output: {
      scrollSnapStop: 'normal'
    }
  },
  'snap-always': {
    output: {
      scrollSnapStop: 'always'
    }
  },
  // https://tailwindcss.com/docs/scroll-margin
  'scroll-m': {
    property: 'scrollMargin',
    config: 'scrollMargin',
    supportsNegativeValues: true
  },
  'scroll-mx': {
    property: ['scrollMarginLeft', 'scrollMarginRight'],
    config: 'scrollMargin',
    supportsNegativeValues: true
  },
  'scroll-my': {
    property: ['scrollMarginTop', 'scrollMarginBottom'],
    config: 'scrollMargin',
    supportsNegativeValues: true
  },
  'scroll-mt': {
    property: 'scrollMarginTop',
    config: 'scrollMargin',
    supportsNegativeValues: true
  },
  'scroll-mr': {
    property: 'scrollMarginRight',
    config: 'scrollMargin',
    supportsNegativeValues: true
  },
  'scroll-mb': {
    property: 'scrollMarginBottom',
    config: 'scrollMargin',
    supportsNegativeValues: true
  },
  'scroll-ml': {
    property: 'scrollMarginLeft',
    config: 'scrollMargin',
    supportsNegativeValues: true
  },
  // https://tailwindcss.com/docs/scroll-padding
  'scroll-p': {
    property: 'scrollPadding',
    config: 'scrollPadding'
  },
  'scroll-px': {
    property: ['scrollPaddingLeft', 'scrollPaddingRight'],
    config: 'scrollPadding'
  },
  'scroll-py': {
    property: ['scrollPaddingTop', 'scrollPaddingBottom'],
    config: 'scrollPadding'
  },
  'scroll-pt': {
    property: 'scrollPaddingTop',
    config: 'scrollPadding'
  },
  'scroll-pr': {
    property: 'scrollPaddingRight',
    config: 'scrollPadding'
  },
  'scroll-pb': {
    property: 'scrollPaddingBottom',
    config: 'scrollPadding'
  },
  'scroll-pl': {
    property: 'scrollPaddingLeft',
    config: 'scrollPadding'
  },
  // https://tailwindcss.com/docs/list-style-position
  'list-inside': {
    output: {
      listStylePosition: 'inside'
    }
  },
  'list-outside': {
    output: {
      listStylePosition: 'outside'
    }
  },
  // https://tailwindcss.com/docs/list-style-type
  list: {
    property: 'listStyleType',
    config: 'listStyleType'
  },
  // https://tailwindcss.com/docs/appearance
  'appearance-none': {
    output: {
      appearance: 'none'
    }
  },
  // https://tailwindcss.com/docs/columns
  columns: {
    property: 'columns',
    config: 'columns'
  },
  // https://tailwindcss.com/docs/break-before
  'break-before-auto': {
    output: {
      breakBefore: 'auto'
    }
  },
  'break-before-avoid': {
    output: {
      breakBefore: 'avoid'
    }
  },
  'break-before-all': {
    output: {
      breakBefore: 'all'
    }
  },
  'break-before-avoid-page': {
    output: {
      breakBefore: 'avoid-page'
    }
  },
  'break-before-page': {
    output: {
      breakBefore: 'page'
    }
  },
  'break-before-left': {
    output: {
      breakBefore: 'left'
    }
  },
  'break-before-right': {
    output: {
      breakBefore: 'right'
    }
  },
  'break-before-column': {
    output: {
      breakBefore: 'column'
    }
  },
  // https://tailwindcss.com/docs/break-inside
  'break-inside-auto': {
    output: {
      breakInside: 'auto'
    }
  },
  'break-inside-avoid': {
    output: {
      breakInside: 'avoid'
    }
  },
  'break-inside-avoid-page': {
    output: {
      breakInside: 'avoid-page'
    }
  },
  'break-inside-avoid-column': {
    output: {
      breakInside: 'avoid-column'
    }
  },
  // https://tailwindcss.com/docs/break-after
  'break-after-auto': {
    output: {
      breakAfter: 'auto'
    }
  },
  'break-after-avoid': {
    output: {
      breakAfter: 'avoid'
    }
  },
  'break-after-all': {
    output: {
      breakAfter: 'all'
    }
  },
  'break-after-avoid-page': {
    output: {
      breakAfter: 'avoid-page'
    }
  },
  'break-after-page': {
    output: {
      breakAfter: 'page'
    }
  },
  'break-after-left': {
    output: {
      breakAfter: 'left'
    }
  },
  'break-after-right': {
    output: {
      breakAfter: 'right'
    }
  },
  'break-after-column': {
    output: {
      breakAfter: 'column'
    }
  },
  // https://tailwindcss.com/docs/grid-auto-columns
  'auto-cols': {
    property: 'gridAutoColumns',
    config: 'gridAutoColumns'
  },
  // https://tailwindcss.com/docs/grid-auto-flow
  'grid-flow-row': {
    output: {
      gridAutoFlow: 'row'
    }
  },
  'grid-flow-col': {
    output: {
      gridAutoFlow: 'column'
    }
  },
  'grid-flow-row-dense': {
    output: {
      gridAutoFlow: 'row dense'
    }
  },
  'grid-flow-col-dense': {
    output: {
      gridAutoFlow: 'column dense'
    }
  },
  // https://tailwindcss.com/docs/grid-auto-rows
  'auto-rows': {
    property: 'gridAutoRows',
    config: 'gridAutoRows'
  },
  // https://tailwindcss.com/docs/grid-template-columns
  'grid-cols': {
    property: 'gridTemplateColumns',
    config: 'gridTemplateColumns'
  },
  // https://tailwindcss.com/docs/grid-template-rows
  'grid-rows': {
    property: 'gridTemplateRows',
    config: 'gridTemplateRows'
  },
  // https://tailwindcss.com/docs/flexbox-direction
  'flex-row': {
    output: {
      flexDirection: 'row'
    }
  },
  'flex-row-reverse': {
    output: {
      flexDirection: 'row-reverse'
    }
  },
  'flex-col': {
    output: {
      flexDirection: 'column'
    }
  },
  'flex-col-reverse': {
    output: {
      flexDirection: 'column-reverse'
    }
  },
  // https://tailwindcss.com/docs/flex-wrap
  'flex-wrap': {
    output: {
      flexWrap: 'wrap'
    }
  },
  'flex-wrap-reverse': {
    output: {
      flexWrap: 'wrap-reverse'
    }
  },
  'flex-nowrap': {
    output: {
      flexWrap: 'nowrap'
    }
  },
  // https://tailwindcss.com/docs/place-content
  'place-content-center': {
    output: {
      placeContent: 'center'
    }
  },
  'place-content-start': {
    output: {
      placeContent: 'start'
    }
  },
  'place-content-end': {
    output: {
      placeContent: 'end'
    }
  },
  'place-content-between': {
    output: {
      placeContent: 'space-between'
    }
  },
  'place-content-around': {
    output: {
      placeContent: 'space-around'
    }
  },
  'place-content-evenly': {
    output: {
      placeContent: 'space-evenly'
    }
  },
  'place-content-stretch': {
    output: {
      placeContent: 'stretch'
    }
  },
  // https://tailwindcss.com/docs/place-items
  'place-items-start': {
    output: {
      placeItems: 'start'
    }
  },
  'place-items-end': {
    output: {
      placeItems: 'end'
    }
  },
  'place-items-center': {
    output: {
      placeItems: 'center'
    }
  },
  'place-items-stretch': {
    output: {
      placeItems: 'stretch'
    }
  },
  // https://tailwindcss.com/docs/align-content
  'content-center': {
    output: {
      alignContent: 'center'
    }
  },
  'content-start': {
    output: {
      alignContent: 'flex-start'
    }
  },
  'content-end': {
    output: {
      alignContent: 'flex-end'
    }
  },
  'content-between': {
    output: {
      alignContent: 'space-between'
    }
  },
  'content-around': {
    output: {
      alignContent: 'space-around'
    }
  },
  'content-evenly': {
    output: {
      alignContent: 'space-evenly'
    }
  },
  // https://tailwindcss.com/docs/align-items
  'items-start': {
    output: {
      alignItems: 'flex-start'
    }
  },
  'items-end': {
    output: {
      alignItems: 'flex-end'
    }
  },
  'items-center': {
    output: {
      alignItems: 'center'
    }
  },
  'items-baseline': {
    output: {
      alignItems: 'baseline'
    }
  },
  'items-stretch': {
    output: {
      alignItems: 'stretch'
    }
  },
  // https://tailwindcss.com/docs/justify-content
  'justify-start': {
    output: {
      justifyContent: 'flex-start'
    }
  },
  'justify-end': {
    output: {
      justifyContent: 'flex-end'
    }
  },
  'justify-center': {
    output: {
      justifyContent: 'center'
    }
  },
  'justify-between': {
    output: {
      justifyContent: 'space-between'
    }
  },
  'justify-around': {
    output: {
      justifyContent: 'space-around'
    }
  },
  'justify-evenly': {
    output: {
      justifyContent: 'space-evenly'
    }
  },
  // https://tailwindcss.com/docs/justify-items
  'justify-items-start': {
    output: {
      justifyItems: 'start'
    }
  },
  'justify-items-end': {
    output: {
      justifyItems: 'end'
    }
  },
  'justify-items-center': {
    output: {
      justifyItems: 'center'
    }
  },
  'justify-items-stretch': {
    output: {
      justifyItems: 'stretch'
    }
  },
  // https://tailwindcss.com/docs/gap
  gap: {
    property: 'gap',
    config: 'gap'
  },
  'gap-x': {
    property: 'columnGap',
    config: 'gap'
  },
  'gap-y': {
    property: 'rowGap',
    config: 'gap'
  },
  // https://tailwindcss.com/docs/space
  'space-y': {
    config: 'space',
    output: ({
      value
    }) => ({
      '> :not([hidden]) ~ :not([hidden])': {
        '--tw-space-y-reverse': '0',
        marginTop: `calc(${value} * calc(1 - var(--tw-space-y-reverse)))`,
        marginBottom: `calc(${value} * var(--tw-space-y-reverse))`
      }
    }),
    supportsNegativeValues: true
  },
  'space-x': {
    config: 'space',
    output: ({
      value
    }) => ({
      '> :not([hidden]) ~ :not([hidden])': {
        '--tw-space-x-reverse': '0',
        marginRight: `calc(${value} * var(--tw-space-x-reverse))`,
        marginLeft: `calc(${value} * calc(1 - var(--tw-space-x-reverse)))`
      }
    }),
    supportsNegativeValues: true
  },
  // https://tailwindcss.com/docs/space
  'space-x-reverse': {
    output: {
      '> :not([hidden]) ~ :not([hidden])': {
        '--tw-space-x-reverse': '1'
      }
    }
  },
  'space-y-reverse': {
    output: {
      '> :not([hidden]) ~ :not([hidden])': {
        '--tw-space-y-reverse': '1'
      }
    }
  },
  'divide-y': {
    config: 'divideWidth',
    output: ({
      value
    }) => ({
      '> :not([hidden]) ~ :not([hidden])': {
        '--tw-divide-y-reverse': '0',
        borderTopWidth: `calc(${value} * calc(1 - var(--tw-divide-y-reverse)))`,
        borderBottomWidth: `calc(${value} * var(--tw-divide-y-reverse))`
      }
    }),
    coerced: {
      'line-width': value => ({
        '> :not([hidden]) ~ :not([hidden])': {
          '--tw-divide-y-reverse': '0',
          borderTopWidth: `calc(${value} * calc(1 - var(--tw-divide-y-reverse)))`,
          borderBottomWidth: `calc(${value} * var(--tw-divide-y-reverse))`
        }
      }),
      length: value => ({
        '> :not([hidden]) ~ :not([hidden])': {
          '--tw-divide-y-reverse': '0',
          borderTopWidth: `calc(${value} * calc(1 - var(--tw-divide-y-reverse)))`,
          borderBottomWidth: `calc(${value} * var(--tw-divide-y-reverse))`
        }
      })
    }
  },
  'divide-x': {
    config: 'divideWidth',
    output: ({
      value
    }) => ({
      '> :not([hidden]) ~ :not([hidden])': {
        '--tw-divide-x-reverse': '0',
        borderRightWidth: `calc(${value} * var(--tw-divide-x-reverse))`,
        borderLeftWidth: `calc(${value} * calc(1 - var(--tw-divide-x-reverse)))`
      }
    }),
    coerced: {
      'line-width': value => ({
        '> :not([hidden]) ~ :not([hidden])': {
          '--tw-divide-x-reverse': '0',
          borderRightWidth: `calc(${value} * var(--tw-divide-x-reverse))`,
          borderLeftWidth: `calc(${value} * calc(1 - var(--tw-divide-x-reverse)))`
        }
      }),
      length: value => ({
        '> :not([hidden]) ~ :not([hidden])': {
          '--tw-divide-x-reverse': '0',
          borderRightWidth: `calc(${value} * var(--tw-divide-x-reverse))`,
          borderLeftWidth: `calc(${value} * calc(1 - var(--tw-divide-x-reverse)))`
        }
      })
    }
  },
  divide: {
    config: 'divideColor',
    coerced: {
      color: {
        property: 'borderColor',
        variable: '--tw-divide-opacity',
        wrapWith: '> :not([hidden]) ~ :not([hidden])',
        forceReturn: true
      }
    }
  },
  // https://tailwindcss.com/docs/divide-width
  'divide-x-reverse': {
    output: {
      '> :not([hidden]) ~ :not([hidden])': {
        '--tw-divide-x-reverse': '1'
      }
    }
  },
  'divide-y-reverse': {
    output: {
      '> :not([hidden]) ~ :not([hidden])': {
        '--tw-divide-y-reverse': '1'
      }
    }
  },
  // https://tailwindcss.com/docs/divide-style
  'divide-solid': {
    output: {
      '> :not([hidden]) ~ :not([hidden])': {
        borderStyle: 'solid'
      }
    }
  },
  'divide-dashed': {
    output: {
      '> :not([hidden]) ~ :not([hidden])': {
        borderStyle: 'dashed'
      }
    }
  },
  'divide-dotted': {
    output: {
      '> :not([hidden]) ~ :not([hidden])': {
        borderStyle: 'dotted'
      }
    }
  },
  'divide-double': {
    output: {
      '> :not([hidden]) ~ :not([hidden])': {
        borderStyle: 'double'
      }
    }
  },
  'divide-none': {
    output: {
      '> :not([hidden]) ~ :not([hidden])': {
        borderStyle: 'none'
      }
    }
  },
  // https://tailwindcss.com/docs/divide-width/
  'divide-opacity': {
    config: 'divideOpacity',
    property: '--tw-divide-opacity',
    output: ({
      value
    }) => ({
      '> :not([hidden]) ~ :not([hidden])': {
        '--tw-divide-opacity': value
      }
    })
  },
  // https://tailwindcss.com/docs/place-self
  'place-self-auto': {
    output: {
      placeSelf: 'auto'
    }
  },
  'place-self-start': {
    output: {
      placeSelf: 'start'
    }
  },
  'place-self-end': {
    output: {
      placeSelf: 'end'
    }
  },
  'place-self-center': {
    output: {
      placeSelf: 'center'
    }
  },
  'place-self-stretch': {
    output: {
      placeSelf: 'stretch'
    }
  },
  // https://tailwindcss.com/docs/align-self
  'self-auto': {
    output: {
      alignSelf: 'auto'
    }
  },
  'self-start': {
    output: {
      alignSelf: 'flex-start'
    }
  },
  'self-end': {
    output: {
      alignSelf: 'flex-end'
    }
  },
  'self-center': {
    output: {
      alignSelf: 'center'
    }
  },
  'self-stretch': {
    output: {
      alignSelf: 'stretch'
    }
  },
  'self-baseline': {
    output: {
      alignSelf: 'baseline'
    }
  },
  // https://tailwindcss.com/docs/justify-self
  'justify-self-auto': {
    output: {
      justifySelf: 'auto'
    }
  },
  'justify-self-start': {
    output: {
      justifySelf: 'start'
    }
  },
  'justify-self-end': {
    output: {
      justifySelf: 'end'
    }
  },
  'justify-self-center': {
    output: {
      justifySelf: 'center'
    }
  },
  'justify-self-stretch': {
    output: {
      justifySelf: 'stretch'
    }
  },
  // https://tailwindcss.com/docs/overflow
  'overflow-auto': {
    output: {
      overflow: 'auto'
    },
    config: 'overflow'
  },
  'overflow-hidden': {
    output: {
      overflow: 'hidden'
    },
    config: 'overflow'
  },
  'overflow-clip': {
    output: {
      overflow: 'clip'
    },
    config: 'overflow'
  },
  'overflow-visible': {
    output: {
      overflow: 'visible'
    },
    config: 'overflow'
  },
  'overflow-scroll': {
    output: {
      overflow: 'scroll'
    },
    config: 'overflow'
  },
  'overflow-x-auto': {
    output: {
      overflowX: 'auto'
    },
    config: 'overflow'
  },
  'overflow-y-auto': {
    output: {
      overflowY: 'auto'
    },
    config: 'overflow'
  },
  'overflow-x-hidden': {
    output: {
      overflowX: 'hidden'
    },
    config: 'overflow'
  },
  'overflow-y-hidden': {
    output: {
      overflowY: 'hidden'
    },
    config: 'overflow'
  },
  'overflow-x-clip': {
    output: {
      overflowX: 'clip'
    },
    config: 'overflow'
  },
  'overflow-y-clip': {
    output: {
      overflowY: 'clip'
    },
    config: 'overflow'
  },
  'overflow-x-visible': {
    output: {
      overflowX: 'visible'
    },
    config: 'overflow'
  },
  'overflow-y-visible': {
    output: {
      overflowY: 'visible'
    },
    config: 'overflow'
  },
  'overflow-x-scroll': {
    output: {
      overflowX: 'scroll'
    },
    config: 'overflow'
  },
  'overflow-y-scroll': {
    output: {
      overflowY: 'scroll'
    },
    config: 'overflow'
  },
  // https://tailwindcss.com/docs/overscroll-behavior
  'overscroll-auto': {
    output: {
      overscrollBehavior: 'auto'
    }
  },
  'overscroll-contain': {
    output: {
      overscrollBehavior: 'contain'
    }
  },
  'overscroll-none': {
    output: {
      overscrollBehavior: 'none'
    }
  },
  'overscroll-y-auto': {
    output: {
      overscrollBehaviorY: 'auto'
    }
  },
  'overscroll-y-contain': {
    output: {
      overscrollBehaviorY: 'contain'
    }
  },
  'overscroll-y-none': {
    output: {
      overscrollBehaviorY: 'none'
    }
  },
  'overscroll-x-auto': {
    output: {
      overscrollBehaviorX: 'auto'
    }
  },
  'overscroll-x-contain': {
    output: {
      overscrollBehaviorX: 'contain'
    }
  },
  'overscroll-x-none': {
    output: {
      overscrollBehaviorX: 'none'
    }
  },
  // https://tailwindcss.com/docs/scroll-behavior
  'scroll-auto': {
    output: {
      scrollBehavior: 'auto'
    }
  },
  'scroll-smooth': {
    output: {
      scrollBehavior: 'smooth'
    }
  },
  // https://tailwindcss.com/docs/text-overflow
  truncate: {
    output: {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  },
  'overflow-ellipsis': {
    output: {
      textOverflow: 'ellipsis'
    }
  },
  'text-ellipsis': {
    output: {
      textOverflow: 'ellipsis'
    }
  },
  // Deprecated
  'text-clip': {
    output: {
      textOverflow: 'clip'
    }
  },
  // https://tailwindcss.com/docs/whitespace
  'whitespace-normal': {
    output: {
      whiteSpace: 'normal'
    }
  },
  'whitespace-nowrap': {
    output: {
      whiteSpace: 'nowrap'
    }
  },
  'whitespace-pre': {
    output: {
      whiteSpace: 'pre'
    }
  },
  'whitespace-pre-line': {
    output: {
      whiteSpace: 'pre-line'
    }
  },
  'whitespace-pre-wrap': {
    output: {
      whiteSpace: 'pre-wrap'
    }
  },
  // https://tailwindcss.com/docs/word-break
  'break-normal': {
    output: {
      wordBreak: 'normal',
      overflowWrap: 'normal'
    },
    config: 'wordbreak'
  },
  'break-words': {
    output: {
      overflowWrap: 'break-word'
    },
    config: 'wordbreak'
  },
  'break-all': {
    output: {
      wordBreak: 'break-all'
    },
    config: 'wordbreak'
  },
  // https://tailwindcss.com/docs/border-radius
  'rounded-t': {
    property: ['borderTopLeftRadius', 'borderTopRightRadius'],
    config: 'borderRadius'
  },
  'rounded-r': {
    property: ['borderTopRightRadius', 'borderBottomRightRadius'],
    config: 'borderRadius'
  },
  'rounded-b': {
    property: ['borderBottomLeftRadius', 'borderBottomRightRadius'],
    config: 'borderRadius'
  },
  'rounded-l': {
    property: ['borderTopLeftRadius', 'borderBottomLeftRadius'],
    config: 'borderRadius'
  },
  'rounded-tl': {
    property: 'borderTopLeftRadius',
    config: 'borderRadius'
  },
  'rounded-tr': {
    property: 'borderTopRightRadius',
    config: 'borderRadius'
  },
  'rounded-br': {
    property: 'borderBottomRightRadius',
    config: 'borderRadius'
  },
  'rounded-bl': {
    property: 'borderBottomLeftRadius',
    config: 'borderRadius'
  },
  rounded: {
    property: 'borderRadius',
    config: 'borderRadius'
  },
  // https://tailwindcss.com/docs/border-style
  'border-solid': {
    output: {
      borderStyle: 'solid'
    }
  },
  'border-dashed': {
    output: {
      borderStyle: 'dashed'
    }
  },
  'border-dotted': {
    output: {
      borderStyle: 'dotted'
    }
  },
  'border-double': {
    output: {
      borderStyle: 'double'
    }
  },
  'border-hidden': {
    output: {
      borderStyle: 'hidden'
    }
  },
  'border-none': {
    output: {
      borderStyle: 'none'
    }
  },
  border: [// https://tailwindcss.com/docs/border-width
  {
    config: 'borderWidth',
    coerced: {
      'line-width': {
        property: 'borderWidth'
      },
      length: {
        property: 'borderWidth'
      }
    }
  }, // https://tailwindcss.com/docs/border-color
  {
    config: 'borderColor',
    coerced: {
      color: {
        property: 'borderColor',
        variable: '--tw-border-opacity'
      }
    }
  }],
  'border-x': [// https://tailwindcss.com/docs/border-width
  {
    config: 'borderWidth',
    coerced: {
      'line-width': {
        property: ['borderLeftWidth', 'borderRightWidth']
      },
      length: {
        property: ['borderLeftWidth', 'borderRightWidth']
      }
    }
  }, // https://tailwindcss.com/docs/border-color
  {
    config: 'borderColor',
    coerced: {
      color: {
        property: ['borderLeftColor', 'borderRightColor'],
        variable: '--tw-border-opacity'
      }
    }
  }],
  'border-y': [// https://tailwindcss.com/docs/border-width
  {
    config: 'borderWidth',
    coerced: {
      'line-width': {
        property: ['borderTopColor', 'borderBottomColor']
      },
      length: {
        property: ['borderTopColor', 'borderBottomColor']
      }
    }
  }, // https://tailwindcss.com/docs/border-color
  {
    config: 'borderColor',
    coerced: {
      color: {
        property: ['borderTopColor', 'borderBottomColor'],
        variable: '--tw-border-opacity'
      }
    }
  }],
  // https://tailwindcss.com/docs/border-width
  'border-t': [// https://tailwindcss.com/docs/border-width
  {
    config: 'borderWidth',
    coerced: {
      'line-width': {
        property: 'borderTopWidth'
      },
      length: {
        property: 'borderTopWidth'
      }
    }
  }, // https://tailwindcss.com/docs/border-color
  {
    config: 'borderColor',
    coerced: {
      color: {
        property: 'borderTopColor',
        variable: '--tw-border-opacity'
      }
    }
  }],
  'border-b': [// https://tailwindcss.com/docs/border-width
  {
    config: 'borderWidth',
    coerced: {
      'line-width': {
        property: 'borderBottomWidth'
      },
      length: {
        property: 'borderBottomWidth'
      }
    }
  }, // https://tailwindcss.com/docs/border-color
  {
    config: 'borderColor',
    coerced: {
      color: {
        property: 'borderBottomColor',
        variable: '--tw-border-opacity'
      }
    }
  }],
  'border-l': [// https://tailwindcss.com/docs/border-width
  {
    config: 'borderWidth',
    coerced: {
      'line-width': {
        property: 'borderLeftWidth'
      },
      length: {
        property: 'borderLeftWidth'
      }
    }
  }, // https://tailwindcss.com/docs/border-color
  {
    config: 'borderColor',
    coerced: {
      color: {
        property: 'borderLeftColor',
        variable: '--tw-border-opacity'
      }
    }
  }],
  'border-r': [// https://tailwindcss.com/docs/border-width
  {
    config: 'borderWidth',
    coerced: {
      'line-width': {
        property: 'borderRightWidth'
      },
      length: {
        property: 'borderRightWidth'
      }
    }
  }, // https://tailwindcss.com/docs/border-color
  {
    config: 'borderColor',
    coerced: {
      color: {
        property: 'borderRightColor',
        variable: '--tw-border-opacity'
      }
    }
  }],
  'border-opacity': {
    property: '--tw-border-opacity',
    config: 'borderOpacity'
  },
  bg: [// https://tailwindcss.com/docs/background-image
  // https://tailwindcss.com/docs/background-attachment
  {
    config: 'backgroundImage',
    coerced: {
      url: {
        property: 'backgroundImage'
      },
      image: {
        property: 'backgroundImage'
      }
    }
  }, // https://tailwindcss.com/docs/background-position
  // https://tailwindcss.com/docs/background-origin
  {
    config: 'backgroundPosition',
    coerced: {
      position: {
        property: 'backgroundPosition'
      },
      percentage: {
        property: 'backgroundPosition'
      }
    }
  }, // https://tailwindcss.com/docs/background-size
  {
    config: 'backgroundSize',
    coerced: {
      length: {
        property: 'backgroundSize'
      }
    }
  }, // https://tailwindcss.com/docs/background-color
  {
    config: 'backgroundColor',
    coerced: {
      color: {
        property: 'backgroundColor',
        variable: '--tw-bg-opacity'
      }
    }
  }],
  // https://tailwindcss.com/docs/background-opacity
  'bg-opacity': {
    property: '--tw-bg-opacity',
    config: 'backgroundOpacity'
  },
  // https://tailwindcss.com/docs/gradient-color-stops
  from: {
    config: 'gradientColorStops',
    coerced: {
      color: {
        output: (value, {
          withAlpha
        }) => ({
          '--tw-gradient-from': withAlpha(value) || value,
          '--tw-gradient-stops': `var(--tw-gradient-from), var(--tw-gradient-to, ${withAlpha(value, '0', 'rgb(255 255 255 / 0)') || value})`
        })
      }
    }
  },
  via: {
    config: 'gradientColorStops',
    coerced: {
      color: {
        output: (value, {
          withAlpha
        }) => ({
          '--tw-gradient-stops': `var(--tw-gradient-from), ${withAlpha(value) || value}, var(--tw-gradient-to, ${withAlpha(value, '0', 'rgb(255 255 255 / 0)')})`
        })
      }
    }
  },
  to: {
    config: 'gradientColorStops',
    coerced: {
      color: {
        output: (value, {
          withAlpha
        }) => ({
          '--tw-gradient-to': `${withAlpha(value) || value}`
        })
      }
    }
  },
  // https://tailwindcss.com/docs/box-decoration-break
  'decoration-slice': {
    output: {
      boxDecorationBreak: 'slice'
    }
  },
  // Deprecated
  'decoration-clone': {
    output: {
      boxDecorationBreak: 'clone'
    }
  },
  // Deprecated
  'box-decoration-slice': {
    output: {
      boxDecorationBreak: 'slice'
    }
  },
  'box-decoration-clone': {
    output: {
      boxDecorationBreak: 'clone'
    }
  },
  // https://tailwindcss.com/docs/background-attachment
  'bg-fixed': {
    output: {
      backgroundAttachment: 'fixed'
    }
  },
  'bg-local': {
    output: {
      backgroundAttachment: 'local'
    }
  },
  'bg-scroll': {
    output: {
      backgroundAttachment: 'scroll'
    }
  },
  // https://tailwindcss.com/docs/background-clip
  'bg-clip-border': {
    output: {
      backgroundClip: 'border-box'
    }
  },
  'bg-clip-padding': {
    output: {
      backgroundClip: 'padding-box'
    }
  },
  'bg-clip-content': {
    output: {
      backgroundClip: 'content-box'
    }
  },
  'bg-clip-text': {
    output: {
      backgroundClip: 'text'
    }
  },
  // https://tailwindcss.com/docs/background-repeat
  'bg-repeat': {
    output: {
      backgroundRepeat: 'repeat'
    }
  },
  'bg-no-repeat': {
    output: {
      backgroundRepeat: 'no-repeat'
    }
  },
  'bg-repeat-x': {
    output: {
      backgroundRepeat: 'repeat-x'
    }
  },
  'bg-repeat-y': {
    output: {
      backgroundRepeat: 'repeat-y'
    }
  },
  'bg-repeat-round': {
    output: {
      backgroundRepeat: 'round'
    }
  },
  'bg-repeat-space': {
    output: {
      backgroundRepeat: 'space'
    }
  },
  // https://tailwindcss.com/docs/background-origin
  'bg-origin-border': {
    output: {
      backgroundOrigin: 'border-box'
    }
  },
  'bg-origin-padding': {
    output: {
      backgroundOrigin: 'padding-box'
    }
  },
  'bg-origin-content': {
    output: {
      backgroundOrigin: 'content-box'
    }
  },
  // https://tailwindcss.com/docs/fill
  fill: {
    config: 'fill',
    coerced: {
      color: {
        property: 'fill'
      },
      any: {
        property: 'fill'
      }
    }
  },
  stroke: [// https://tailwindcss.com/docs/stroke-width
  {
    config: 'strokeWidth',
    coerced: {
      length: {
        property: 'strokeWidth'
      },
      number: {
        property: 'strokeWidth'
      },
      percentage: {
        property: 'strokeWidth'
      }
    }
  }, // https://tailwindcss.com/docs/stroke
  {
    config: 'stroke',
    coerced: {
      url: {
        property: 'stroke'
      },
      color: {
        property: 'stroke'
      }
    }
  }],
  // https://tailwindcss.com/docs/object-fit
  'object-contain': {
    output: {
      objectFit: 'contain'
    }
  },
  'object-cover': {
    output: {
      objectFit: 'cover'
    }
  },
  'object-fill': {
    output: {
      objectFit: 'fill'
    }
  },
  'object-none': {
    output: {
      objectFit: 'none'
    }
  },
  'object-scale-down': {
    output: {
      objectFit: 'scale-down'
    }
  },
  // https://tailwindcss.com/docs/object-position
  object: {
    property: 'objectPosition',
    config: 'objectPosition'
  },
  // https://tailwindcss.com/docs/padding
  pt: {
    property: 'paddingTop',
    config: 'padding'
  },
  pr: {
    property: 'paddingRight',
    config: 'padding'
  },
  pb: {
    property: 'paddingBottom',
    config: 'padding'
  },
  pl: {
    property: 'paddingLeft',
    config: 'padding'
  },
  px: {
    property: ['paddingLeft', 'paddingRight'],
    config: 'padding'
  },
  py: {
    property: ['paddingTop', 'paddingBottom'],
    config: 'padding'
  },
  p: {
    property: 'padding',
    config: 'padding'
  },
  // https://tailwindcss.com/docs/text-align
  'text-left': {
    output: {
      textAlign: 'left'
    }
  },
  'text-center': {
    output: {
      textAlign: 'center'
    }
  },
  'text-right': {
    output: {
      textAlign: 'right'
    }
  },
  'text-justify': {
    output: {
      textAlign: 'justify'
    }
  },
  'text-start': {
    output: {
      textAlign: 'start'
    }
  },
  'text-end': {
    output: {
      textAlign: 'end'
    }
  },
  // https://tailwindcss.com/docs/text-indent
  indent: {
    config: 'textIndent',
    coerced: {
      length: {
        property: 'textIndent'
      },
      position: {
        property: 'textIndent'
      },
      lookup: {
        property: 'textIndent'
      }
    },
    supportsNegativeValues: true
  },
  // https://tailwindcss.com/docs/vertical-align
  'align-baseline': {
    output: {
      verticalAlign: 'baseline'
    }
  },
  'align-top': {
    output: {
      verticalAlign: 'top'
    }
  },
  'align-middle': {
    output: {
      verticalAlign: 'middle'
    }
  },
  'align-bottom': {
    output: {
      verticalAlign: 'bottom'
    }
  },
  'align-text-top': {
    output: {
      verticalAlign: 'text-top'
    }
  },
  'align-text-bottom': {
    output: {
      verticalAlign: 'text-bottom'
    }
  },
  'align-sub': {
    output: {
      verticalAlign: 'sub'
    }
  },
  'align-super': {
    output: {
      verticalAlign: 'super'
    }
  },
  align: {
    output: ({
      value
    }) => value && {
      verticalAlign: value
    }
  },
  font: [// https://tailwindcss.com/docs/font-weight
  {
    config: 'fontWeight',
    coerced: {
      number: {
        property: 'fontWeight'
      }
    }
  }, // https://tailwindcss.com/docs/font-family
  {
    config: 'fontFamily',
    coerced: {
      'generic-name': {
        property: 'fontFamily'
      },
      'family-name': {
        property: 'fontFamily'
      }
    }
  }],
  // https://tailwindcss.com/docs/text-transform
  uppercase: {
    output: {
      textTransform: 'uppercase'
    }
  },
  lowercase: {
    output: {
      textTransform: 'lowercase'
    }
  },
  capitalize: {
    output: {
      textTransform: 'capitalize'
    }
  },
  'normal-case': {
    output: {
      textTransform: 'none'
    }
  },
  // https://tailwindcss.com/docs/font-style
  italic: {
    output: {
      fontStyle: 'italic'
    }
  },
  'not-italic': {
    output: {
      fontStyle: 'normal'
    }
  },
  // https://tailwindcss.com/docs/font-variant-numeric
  'normal-nums': {
    output: {
      fontVariantNumeric: 'normal'
    }
  },
  ordinal: {
    output: {
      '--tw-ordinal': 'ordinal',
      fontVariantNumeric: cssFontVariantNumericValue
    }
  },
  'slashed-zero': {
    output: {
      '--tw-slashed-zero': 'slashed-zero',
      fontVariantNumeric: cssFontVariantNumericValue
    }
  },
  'lining-nums': {
    output: {
      '--tw-numeric-figure': 'lining-nums',
      fontVariantNumeric: cssFontVariantNumericValue
    }
  },
  'oldstyle-nums': {
    output: {
      '--tw-numeric-figure': 'oldstyle-nums',
      fontVariantNumeric: cssFontVariantNumericValue
    }
  },
  'proportional-nums': {
    output: {
      '--tw-numeric-spacing': 'proportional-nums',
      fontVariantNumeric: cssFontVariantNumericValue
    }
  },
  'tabular-nums': {
    output: {
      '--tw-numeric-spacing': 'tabular-nums',
      fontVariantNumeric: cssFontVariantNumericValue
    }
  },
  'diagonal-fractions': {
    output: {
      '--tw-numeric-fraction': 'diagonal-fractions',
      fontVariantNumeric: cssFontVariantNumericValue
    }
  },
  'stacked-fractions': {
    output: {
      '--tw-numeric-fraction': 'stacked-fractions',
      fontVariantNumeric: cssFontVariantNumericValue
    }
  },
  // https://tailwindcss.com/docs/line-height
  leading: {
    property: 'lineHeight',
    config: 'lineHeight'
  },
  // https://tailwindcss.com/docs/letter-spacing
  tracking: {
    property: 'letterSpacing',
    config: 'letterSpacing',
    supportsNegativeValues: true
  },
  text: [// https://tailwindcss.com/docs/text-color
  {
    config: 'textColor',
    coerced: {
      color: {
        property: 'color',
        variable: '--tw-text-opacity'
      }
    }
  }, // https://tailwindcss.com/docs/font-size
  {
    config: 'fontSize',
    coerced: {
      'absolute-size': {
        property: 'fontSize'
      },
      'relative-size': {
        property: 'fontSize'
      },
      length: {
        property: 'fontSize'
      },
      percentage: {
        property: 'fontSize'
      }
    }
  }],
  'text-opacity': {
    property: '--tw-text-opacity',
    config: 'textOpacity'
  },
  // https://tailwindcss.com/docs/text-decoration
  underline: {
    output: {
      textDecorationLine: 'underline'
    }
  },
  overline: {
    output: {
      textDecorationLine: 'overline'
    }
  },
  'line-through': {
    output: {
      textDecorationLine: 'line-through'
    }
  },
  'no-underline': {
    output: {
      textDecorationLine: 'none'
    }
  },
  decoration: [// https://tailwindcss.com/docs/text-decoration-color
  {
    config: 'textDecorationColor',
    coerced: {
      color: {
        property: 'textDecorationColor'
      }
    }
  }, // https://tailwindcss.com/docs/text-decoration-thickness
  {
    config: 'textDecorationThickness',
    coerced: {
      length: {
        property: 'textDecorationThickness'
      },
      percentage: {
        property: 'textDecorationThickness'
      },
      any: {
        property: 'textDecorationThickness'
      }
    }
  }],
  // https://tailwindcss.com/docs/text-decoration-style
  'decoration-solid': {
    output: {
      textDecorationStyle: 'solid'
    }
  },
  'decoration-double': {
    output: {
      textDecorationStyle: 'double'
    }
  },
  'decoration-dotted': {
    output: {
      textDecorationStyle: 'dotted'
    }
  },
  'decoration-dashed': {
    output: {
      textDecorationStyle: 'dashed'
    }
  },
  'decoration-wavy': {
    output: {
      textDecorationStyle: 'wavy'
    }
  },
  // https://tailwindcss.com/docs/text-underline-offset
  'underline-offset': {
    config: 'textUnderlineOffset',
    coerced: {
      length: {
        property: 'textUnderlineOffset'
      },
      percentage: {
        property: 'textUnderlineOffset'
      }
    }
  },
  // https://tailwindcss.com/docs/font-smoothing
  antialiased: {
    output: {
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale'
    }
  },
  'subpixel-antialiased': {
    output: {
      WebkitFontSmoothing: 'auto',
      MozOsxFontSmoothing: 'auto'
    }
  },
  // https://tailwindcss.com/docs/placeholder-color
  placeholder: {
    config: 'placeholderColor',
    coerced: {
      color: {
        property: 'color',
        variable: '--tw-placeholder-opacity',
        wrapWith: '::placeholder'
      },
      any: {
        property: 'color',
        wrapWith: '::placeholder'
      }
    }
  },
  // https://tailwindcss.com/docs/placeholder-opacity
  'placeholder-opacity': {
    config: 'placeholderOpacity',
    output: ({
      value
    }) => ({
      '::placeholder': {
        '--tw-placeholder-opacity': value
      }
    })
  },
  // https://tailwindcss.com/docs/caret-color
  caret: {
    config: 'caretColor',
    coerced: {
      color: {
        property: 'caretColor'
      },
      any: {
        property: 'caretColor'
      }
    }
  },
  // https://tailwindcss.com/docs/accent-color
  accent: {
    config: 'accentColor',
    coerced: {
      color: {
        property: 'accentColor'
      },
      any: {
        property: 'accentColor'
      }
    }
  },
  // https://tailwindcss.com/docs/opacity
  opacity: {
    property: 'opacity',
    config: 'opacity'
  },
  // https://tailwindcss.com/docs/background-blend-mode
  'bg-blend-normal': {
    output: {
      backgroundBlendMode: 'normal'
    }
  },
  'bg-blend-multiply': {
    output: {
      backgroundBlendMode: 'multiply'
    }
  },
  'bg-blend-screen': {
    output: {
      backgroundBlendMode: 'screen'
    }
  },
  'bg-blend-overlay': {
    output: {
      backgroundBlendMode: 'overlay'
    }
  },
  'bg-blend-darken': {
    output: {
      backgroundBlendMode: 'darken'
    }
  },
  'bg-blend-lighten': {
    output: {
      backgroundBlendMode: 'lighten'
    }
  },
  'bg-blend-color-dodge': {
    output: {
      backgroundBlendMode: 'color-dodge'
    }
  },
  'bg-blend-color-burn': {
    output: {
      backgroundBlendMode: 'color-burn'
    }
  },
  'bg-blend-hard-light': {
    output: {
      backgroundBlendMode: 'hard-light'
    }
  },
  'bg-blend-soft-light': {
    output: {
      backgroundBlendMode: 'soft-light'
    }
  },
  'bg-blend-difference': {
    output: {
      backgroundBlendMode: 'difference'
    }
  },
  'bg-blend-exclusion': {
    output: {
      backgroundBlendMode: 'exclusion'
    }
  },
  'bg-blend-hue': {
    output: {
      backgroundBlendMode: 'hue'
    }
  },
  'bg-blend-saturation': {
    output: {
      backgroundBlendMode: 'saturation'
    }
  },
  'bg-blend-color': {
    output: {
      backgroundBlendMode: 'color'
    }
  },
  'bg-blend-luminosity': {
    output: {
      backgroundBlendMode: 'luminosity'
    }
  },
  // https://tailwindcss.com/docs/mix-blend-mode
  'mix-blend-normal': {
    output: {
      mixBlendMode: 'normal'
    }
  },
  'mix-blend-multiply': {
    output: {
      mixBlendMode: 'multiply'
    }
  },
  'mix-blend-screen': {
    output: {
      mixBlendMode: 'screen'
    }
  },
  'mix-blend-overlay': {
    output: {
      mixBlendMode: 'overlay'
    }
  },
  'mix-blend-darken': {
    output: {
      mixBlendMode: 'darken'
    }
  },
  'mix-blend-lighten': {
    output: {
      mixBlendMode: 'lighten'
    }
  },
  'mix-blend-color-dodge': {
    output: {
      mixBlendMode: 'color-dodge'
    }
  },
  'mix-blend-color-burn': {
    output: {
      mixBlendMode: 'color-burn'
    }
  },
  'mix-blend-hard-light': {
    output: {
      mixBlendMode: 'hard-light'
    }
  },
  'mix-blend-soft-light': {
    output: {
      mixBlendMode: 'soft-light'
    }
  },
  'mix-blend-difference': {
    output: {
      mixBlendMode: 'difference'
    }
  },
  'mix-blend-exclusion': {
    output: {
      mixBlendMode: 'exclusion'
    }
  },
  'mix-blend-hue': {
    output: {
      mixBlendMode: 'hue'
    }
  },
  'mix-blend-saturation': {
    output: {
      mixBlendMode: 'saturation'
    }
  },
  'mix-blend-color': {
    output: {
      mixBlendMode: 'color'
    }
  },
  'mix-blend-luminosity': {
    output: {
      mixBlendMode: 'luminosity'
    }
  },
  shadow: [// https://tailwindcss.com/docs/box-shadow
  {
    config: 'boxShadow',
    coerced: {
      shadow: {
        config: 'boxShadow'
      }
    }
  }, // https://tailwindcss.com/docs/box-shadow-color
  {
    config: 'boxShadowColor',
    coerced: {
      color: {
        output: (value, {
          withAlpha
        }) => ({
          '--tw-shadow-color': withAlpha(value) || value,
          '--tw-shadow': 'var(--tw-shadow-colored)'
        })
      }
    }
  }],
  // https://tailwindcss.com/docs/outline-style
  'outline-none': {
    output: {
      outline: '2px solid transparent',
      outlineOffset: '2px'
    }
  },
  'outline-dashed': {
    output: {
      outlineStyle: 'dashed'
    }
  },
  'outline-dotted': {
    output: {
      outlineStyle: 'dotted'
    }
  },
  'outline-double': {
    output: {
      outlineStyle: 'double'
    }
  },
  'outline-hidden': {
    output: {
      outlineStyle: 'hidden'
    }
  },
  outline: [{
    output: {
      outlineStyle: 'solid'
    }
  }, // https://tailwindcss.com/docs/outline-width
  {
    config: 'outlineWidth',
    coerced: {
      length: {
        property: 'outlineWidth'
      },
      number: {
        property: 'outlineWidth'
      },
      percentage: {
        property: 'outlineWidth'
      }
    }
  }, // https://tailwindcss.com/docs/outline-color
  {
    config: 'outlineColor',
    coerced: {
      color: {
        property: 'outlineColor'
      }
    }
  }],
  // https://tailwindcss.com/docs/outline-offset
  'outline-offset': {
    config: 'outlineOffset',
    coerced: {
      length: {
        property: 'outlineOffset'
      },
      number: {
        property: 'outlineOffset'
      },
      percentage: {
        property: 'outlineOffset'
      }
    }
  },
  ring: [// https://tailwindcss.com/docs/ring-width
  {
    config: 'ringWidth',
    coerced: {
      length: value => ({
        '--tw-ring-offset-shadow': 'var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color)',
        '--tw-ring-shadow': `var(--tw-ring-inset) 0 0 0 calc(${value} + var(--tw-ring-offset-width)) var(--tw-ring-color)`,
        boxShadow: [`var(--tw-ring-offset-shadow)`, `var(--tw-ring-shadow)`, `var(--tw-shadow, 0 0 #0000)`].join(', ')
      })
    }
  }, // https://tailwindcss.com/docs/ring-color
  {
    config: 'ringColor',
    coerced: {
      color: {
        property: '--tw-ring-color',
        variable: '--tw-ring-opacity'
      }
    }
  }],
  'ring-inset': {
    output: {
      '--tw-ring-inset': 'inset'
    }
  },
  // https://tailwindcss.com/docs/ring-opacity
  'ring-opacity': {
    property: '--tw-ring-opacity',
    config: 'ringOpacity'
  },
  'ring-offset': [// https://tailwindcss.com/docs/ring-offset-width
  {
    config: 'ringOffsetWidth',
    coerced: {
      length: {
        property: '--tw-ring-offset-width'
      }
    }
  }, // https://tailwindcss.com/docs/ring-offset-color
  {
    config: 'ringOffsetColor',
    coerced: {
      color: {
        property: '--tw-ring-offset-color'
      }
    }
  }],
  // https://tailwindcss.com/docs/blur
  blur: {
    config: 'blur',
    output: ({
      value
    }) => ({
      '--tw-blur': `blur(${value})`,
      filter: cssFilterValue
    })
  },
  // https://tailwindcss.com/docs/brightness
  brightness: {
    config: 'brightness',
    output: ({
      value
    }) => ({
      '--tw-brightness': `brightness(${value})`,
      filter: cssFilterValue
    })
  },
  // https://tailwindcss.com/docs/contrast
  contrast: {
    config: 'contrast',
    output: ({
      value
    }) => ({
      '--tw-contrast': `contrast(${value})`,
      filter: cssFilterValue
    })
  },
  // https://tailwindcss.com/docs/drop-shadow
  'drop-shadow': {
    config: 'dropShadow',

    output({
      value
    }) {
      const dropShadowValue = Array.isArray(value) ? value.map(v => `drop-shadow(${v})`).join(' ') : `drop-shadow(${value})`;
      return {
        '--tw-drop-shadow': dropShadowValue,
        filter: cssFilterValue
      };
    }

  },
  // https://tailwindcss.com/docs/grayscale
  grayscale: {
    config: 'grayscale',
    output: ({
      value
    }) => ({
      '--tw-grayscale': `grayscale(${value})`,
      filter: cssFilterValue
    })
  },
  // https://tailwindcss.com/docs/hue-rotate
  'hue-rotate': {
    config: 'hueRotate',
    output: ({
      value
    }) => ({
      '--tw-hue-rotate': `hue-rotate(${value})`,
      filter: cssFilterValue
    }),
    supportsNegativeValues: true
  },
  // https://tailwindcss.com/docs/invert
  invert: {
    config: 'invert',
    output: ({
      value
    }) => ({
      '--tw-invert': `invert(${value})`,
      filter: cssFilterValue
    })
  },
  // https://tailwindcss.com/docs/saturate
  saturate: {
    config: 'saturate',
    output: ({
      value
    }) => ({
      '--tw-saturate': `saturate(${value})`,
      filter: cssFilterValue
    })
  },
  // https://tailwindcss.com/docs/sepia
  sepia: {
    config: 'sepia',
    output: ({
      value
    }) => ({
      '--tw-sepia': `sepia(${value})`,
      filter: cssFilterValue
    })
  },
  // https://tailwindcss.com/docs/filter
  'filter-none': {
    output: {
      filter: 'none'
    }
  },
  filter: {
    output: {
      filter: cssFilterValue
    }
  },
  // https://tailwindcss.com/docs/backdrop-blur
  'backdrop-blur': {
    config: 'backdropBlur',
    output: ({
      value
    }) => ({
      '--tw-backdrop-blur': `blur(${value})`,
      backdropFilter: cssBackdropFilterValue
    })
  },
  // https://tailwindcss.com/docs/backdrop-brightness
  'backdrop-brightness': {
    config: 'backdropBrightness',
    output: ({
      value
    }) => ({
      '--tw-backdrop-brightness': `brightness(${value})`,
      backdropFilter: cssBackdropFilterValue
    })
  },
  // https://tailwindcss.com/docs/backdrop-contrast
  'backdrop-contrast': {
    config: 'backdropContrast',
    output: ({
      value
    }) => ({
      '--tw-backdrop-contrast': `contrast(${value})`,
      backdropFilter: cssBackdropFilterValue
    })
  },
  // https://tailwindcss.com/docs/backdrop-grayscale
  'backdrop-grayscale': {
    config: 'backdropGrayscale',
    output: ({
      value
    }) => ({
      '--tw-backdrop-grayscale': `grayscale(${value})`,
      backdropFilter: cssBackdropFilterValue
    })
  },
  // https://tailwindcss.com/docs/backdrop-hue-rotate
  'backdrop-hue-rotate': {
    config: 'backdropHueRotate',
    output: ({
      value
    }) => ({
      '--tw-backdrop-hue-rotate': `hue-rotate(${value})`,
      backdropFilter: cssBackdropFilterValue
    }),
    supportsNegativeValues: true
  },
  // https://tailwindcss.com/docs/backdrop-invert
  'backdrop-invert': {
    config: 'backdropInvert',
    output: ({
      value
    }) => ({
      '--tw-backdrop-invert': `invert(${value})`,
      backdropFilter: cssBackdropFilterValue
    })
  },
  // https://tailwindcss.com/docs/backdrop-opacity
  'backdrop-opacity': {
    config: 'backdropOpacity',
    output: ({
      value
    }) => ({
      '--tw-backdrop-opacity': `opacity(${value})`,
      backdropFilter: cssBackdropFilterValue
    })
  },
  // https://tailwindcss.com/docs/backdrop-saturate
  'backdrop-saturate': {
    config: 'backdropSaturate',
    output: ({
      value
    }) => ({
      '--tw-backdrop-saturate': `saturate(${value})`,
      backdropFilter: cssBackdropFilterValue
    })
  },
  // https://tailwindcss.com/docs/backdrop-sepia
  'backdrop-sepia': {
    config: 'backdropSepia',
    output: ({
      value
    }) => ({
      '--tw-backdrop-sepia': `sepia(${value})`,
      backdropFilter: cssBackdropFilterValue
    })
  },
  // https://tailwindcss.com/docs/backdrop-filter
  'backdrop-filter': {
    output: {
      backdropFilter: cssBackdropFilterValue
    }
  },
  'backdrop-filter-none': {
    output: {
      backdropFilter: 'none'
    }
  },
  // https://tailwindcss.com/docs/transtiion-property
  // Note: Tailwind doesn't allow an arbitrary value but it's likely just an accident so it's been added here
  transition: [{
    config: 'transitionProperty',

    output({
      value,
      theme
    }) {
      const defaultTimingFunction = theme('transitionTimingFunction.DEFAULT');
      const defaultDuration = theme('transitionDuration.DEFAULT');
      return _extends({
        transitionProperty: value
      }, value === 'none' ? {} : {
        transitionTimingFunction: defaultTimingFunction,
        transitionDuration: defaultDuration
      });
    },

    coerced: {
      lookup: (value, theme) => ({
        transitionProperty: value,
        transitionTimingFunction: theme('transitionTimingFunction.DEFAULT'),
        transitionDuration: theme('transitionDuration.DEFAULT')
      })
    }
  }],
  // https://tailwindcss.com/docs/transition-delay
  delay: {
    property: 'transitionDelay',
    config: 'transitionDelay'
  },
  // https://tailwindcss.com/docs/transition-duration
  duration: {
    property: 'transitionDuration',
    config: 'transitionDuration'
  },
  // https://tailwindcss.com/docs/transition-timing-function
  ease: {
    property: 'transitionTimingFunction',
    config: 'transitionTimingFunction'
  },
  // https://tailwindcss.com/docs/will-change
  'will-change': {
    property: 'willChange',
    config: 'willChange'
  },
  // https://tailwindcss.com/docs/content
  content: [{
    config: 'content',

    output({
      value,
      isEmotion
    }) {
      // Temp fix until emotion supports css variables with the content property
      if (isEmotion) return {
        content: value
      };
      return {
        '--tw-content': value,
        content: 'var(--tw-content)'
      };
    }

  }, {
    output: {
      content: '""'
    }
  } // Deprecated (keep last in array here)
  ]
};

/**
 * Pseudo-classes (Variants)
 * In Twin, these are always available on just about any class
 *
 * See MDN web docs for more information
 * https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-classes
 */
const variantConfig = ({
  variantDarkMode,
  variantLightMode,
  prefixDarkLightModeClass,
  createPeer
}) => ({
  // Before/after pseudo elements
  // Usage: tw`before:(block w-10 h-10 bg-black)`
  before: ':before',
  after: ':after',
  // Interactive links/buttons
  hover: ':hover',
  focus: ':focus',
  active: ':active',
  visited: ':visited',
  hocus: ':hover, :focus',
  link: ':link',
  target: ':target',
  'focus-visible': ':focus-visible',
  'focus-within': ':focus-within',
  // Form elements
  file: '::file-selector-button',
  // Form element states
  autofill: ':autofill',
  disabled: ':disabled',
  checked: ':checked',
  'not-checked': ':not(:checked)',
  default: ':default',
  enabled: ':enabled',
  indeterminate: ':indeterminate',
  'in-range': ':in-range',
  invalid: ':invalid',
  valid: ':valid',
  optional: ':optional',
  'out-of-range': ':out-of-range',
  required: ':required',
  'placeholder-shown': ':placeholder-shown',
  'not-placeholder-shown': ':not(:placeholder-shown)',
  placeholder: '::placeholder',
  'read-only': ':read-only',
  'read-write': ':read-write',
  open: ':open',
  'not-open': ':not(:open)',
  // Child selectors
  'not-disabled': ':not(:disabled)',
  'first-of-type': ':first-of-type',
  'not-first-of-type': ':not(:first-of-type)',
  'last-of-type': ':last-of-type',
  'not-last-of-type': ':not(:last-of-type)',
  'first-letter': '::first-letter',
  'first-line': '::first-line',
  first: ':first-child',
  'not-first': ':not(:first-child)',
  last: ':last-child',
  'not-last': ':not(:last-child)',
  only: ':only-child',
  'not-only': ':not(:only-child)',
  'only-of-type': ':only-of-type',
  'not-only-of-type': ':not(:only-of-type)',
  even: ':nth-child(even)',
  odd: ':nth-child(odd)',
  'even-of-type': ':nth-of-type(even)',
  'odd-of-type': ':nth-of-type(odd)',
  svg: 'svg',
  all: '*',
  'all-child': '> *',
  sibling: '~ *',
  // Content
  empty: ':empty',
  // Group states
  // You'll need to add className="group" to an ancestor to make these work
  // https://github.com/ben-rogerson/twin.macro/blob/master/docs/group.md
  'group-hocus': variantData => prefixDarkLightModeClass('.group:hover &, .group:focus &', variantData),
  'group-first': variantData => prefixDarkLightModeClass('.group:first-child &', variantData),
  'group-last': variantData => prefixDarkLightModeClass('.group:last-child &', variantData),
  'group-only': variantData => prefixDarkLightModeClass('.group:only-child &', variantData),
  'group-even': variantData => prefixDarkLightModeClass('.group:nth-child(even) &', variantData),
  'group-odd': variantData => prefixDarkLightModeClass('.group:nth-child(odd) &', variantData),
  'group-first-of-type': variantData => prefixDarkLightModeClass('.group:first-of-type &', variantData),
  'group-last-of-type': variantData => prefixDarkLightModeClass('.group:last-of-type &', variantData),
  'group-only-of-type': variantData => prefixDarkLightModeClass('.group:not(:first-of-type) &', variantData),
  'group-hover': variantData => prefixDarkLightModeClass('.group:hover &', variantData),
  'group-focus': variantData => prefixDarkLightModeClass('.group:focus &', variantData),
  'group-disabled': variantData => prefixDarkLightModeClass('.group:disabled &', variantData),
  'group-active': variantData => prefixDarkLightModeClass('.group:active &', variantData),
  'group-target': variantData => prefixDarkLightModeClass('.group:target &', variantData),
  'group-visited': variantData => prefixDarkLightModeClass('.group:visited &', variantData),
  'group-default': variantData => prefixDarkLightModeClass('.group:default &', variantData),
  'group-checked': variantData => prefixDarkLightModeClass('.group:checked &', variantData),
  'group-indeterminate': variantData => prefixDarkLightModeClass('.group:indeterminate &', variantData),
  'group-placeholder-shown': variantData => prefixDarkLightModeClass('.group:placeholder-shown &', variantData),
  'group-autofill': variantData => prefixDarkLightModeClass('.group:autofill &', variantData),
  'group-focus-within': variantData => prefixDarkLightModeClass('.group:focus-within &', variantData),
  'group-focus-visible': variantData => prefixDarkLightModeClass('.group:focus-visible &', variantData),
  'group-required': variantData => prefixDarkLightModeClass('.group:required &', variantData),
  'group-valid': variantData => prefixDarkLightModeClass('.group:valid &', variantData),
  'group-invalid': variantData => prefixDarkLightModeClass('.group:invalid &', variantData),
  'group-in-range': variantData => prefixDarkLightModeClass('.group:in-range &', variantData),
  'group-out-of-range': variantData => prefixDarkLightModeClass('.group:out-of-range &', variantData),
  'group-read-only': variantData => prefixDarkLightModeClass('.group:read-only &', variantData),
  'group-empty': variantData => prefixDarkLightModeClass('.group:empty &', variantData),
  'group-open': variantData => prefixDarkLightModeClass('.group:open &', variantData),
  'group-not-open': variantData => prefixDarkLightModeClass('.group:not(:open) &', variantData),
  // Media types
  print: '@media print',
  screen: '@media screen',
  // Direction variants
  rtl: '[dir="rtl"] &',
  ltr: '[dir="ltr"] &',
  // https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
  'motion-safe': '@media (prefers-reduced-motion: no-preference)',
  'motion-reduce': '@media (prefers-reduced-motion: reduce)',
  // https://developer.mozilla.org/en-US/docs/Web/CSS/@media/any-pointer
  'any-pointer-none': '@media (any-pointer: none)',
  'any-pointer-fine': '@media (any-pointer: fine)',
  'any-pointer-coarse': '@media (any-pointer: coarse)',
  // https://developer.mozilla.org/en-US/docs/Web/CSS/@media/pointer
  'pointer-none': '@media (pointer: none)',
  'pointer-fine': '@media (pointer: fine)',
  'pointer-coarse': '@media (pointer: coarse)',
  // https://developer.mozilla.org/en-US/docs/Web/CSS/@media/any-hover
  'any-hover-none': '@media (any-hover: none)',
  'any-hover': '@media (any-hover: hover)',
  // https://developer.mozilla.org/en-US/docs/Web/CSS/@media/hover
  'can-hover': '@media (hover: hover)',
  'cant-hover': '@media (hover: none)',
  // https://developer.mozilla.org/en-US/docs/Web/CSS/@media/orientation
  landscape: '@media (orientation: landscape)',
  portrait: '@media (orientation: portrait)',
  // Dark mode / Light mode
  dark: variantDarkMode,
  light: variantLightMode,
  // Peer variants
  'peer-first': createPeer('first-child'),
  'peer-last': createPeer('last-child'),
  'peer-only': createPeer('only-child'),
  'peer-even': createPeer('nth-child(even)'),
  'peer-odd': createPeer('nth-child(odd)'),
  'peer-first-of-type': createPeer('first-of-type'),
  'peer-last-of-type': createPeer('last-of-type'),
  'peer-only-of-type': createPeer('only-of-type'),
  'peer-hover': createPeer('hover'),
  'peer-focus': createPeer('focus'),
  'peer-disabled': createPeer('disabled'),
  'peer-active': createPeer('active'),
  'peer-target': createPeer('target'),
  'peer-visited': createPeer('visited'),
  'peer-default': createPeer('default'),
  'peer-checked': createPeer('checked'),
  'peer-indeterminate': createPeer('indeterminate'),
  'peer-placeholder-shown': createPeer('placeholder-shown'),
  'peer-not-placeholder-shown': createPeer('not(:placeholder-shown)'),
  'peer-autofill': createPeer('autofill'),
  'peer-focus-within': createPeer('focus-within'),
  'peer-focus-visible': createPeer('focus-visible'),
  'peer-required': createPeer('required'),
  'peer-valid': createPeer('valid'),
  'peer-invalid': createPeer('invalid'),
  'peer-in-range': createPeer('in-range'),
  'peer-out-of-range': createPeer('out-of-range'),
  'peer-read-only': createPeer('read-only'),
  'peer-empty': createPeer('empty'),
  'peer-open': createPeer('open'),
  'peer-not-open': createPeer('not(:open)'),
  // Selection
  selection: '::selection',
  // Lists
  marker: '::marker, *::marker'
});

const color = {
  error: chalk__default["default"].hex('#ff8383'),
  errorLight: chalk__default["default"].hex('#ffd3d3'),
  success: chalk__default["default"].greenBright,
  highlight: chalk__default["default"].yellowBright,
  highlight2: chalk__default["default"].blue,
  subdued: chalk__default["default"].hex('#999'),
  hex: hex => chalk__default["default"].hex(hex)
};

const spaced = string => `\n\n${string}\n`;

const warning = string => color.error(`✕ ${string}`);

const inOutPlugins = (input, output, layer) => `${layer} ${color.highlight2('→')} ${input} ${color.highlight2(JSON.stringify(output))}`;

const inOut = (input, output) => `${color.success('✓')} ${input} ${color.success(JSON.stringify(output))}`;

const logNoVariant = (variant, validVariants) => spaced(`${warning(`The variant ${color.errorLight(`${variant}:`)} was not found`)}\n\n${Object.entries(validVariants).map(([k, v]) => `${k}\n${v.map((item, index) => `${v.length > 6 && index % 6 === 0 && index > 0 ? '\n' : ''}${color.highlight(item)}:`).join(color.subdued(' / '))}`).join('\n\n')}\n\nRead more at https://twinredirect.page.link/variantList`);

const logNotAllowed = (className, error, fix) => spaced([warning(`${color.errorLight(className)} ${error}`), fix ? typeof fix === 'function' ? fix(color) : fix : ''].filter(Boolean).join('\n\n'));

const logBadGood = (bad, good) => good ? spaced(`${color.error('✕ Bad:')} ${typeof bad === 'function' ? bad(color) : bad}\n${color.success('✓ Good:')} ${typeof good === 'function' ? good(color) : good}`) : logGeneralError(bad);

const logErrorFix = (error, good) => spaced(`${color.error(error)}\n${color.success('Fix:')} ${good}`);

const logGeneralError = error => spaced(warning(error));

const debugSuccess = (className, log) => inOut(formatProp(className), log);

const formatPluginKey = key => key.replace(/(\\|(}}))/g, '').replace(/{{/g, '.');

const debugPlugins = processedPlugins => {
  console.log(Object.entries(processedPlugins).map(([layer, group]) => Object.entries(group).map(([className, styles]) => inOutPlugins(formatPluginKey(className), styles, layer)).join('\n')).join(`\n`));
};

const formatSuggestions = suggestions => suggestions.map(s => `${color.subdued('-')} ${color.highlight(s.target)}${s.value ? ` ${color.subdued('>')} ${isHex(s.value) ? color.hex(s.value)(`▣ `) : ''}${s.value}` : ''}`).join('\n');

const logNoClass = properties => {
  const {
    pieces: {
      classNameRawNoVariants
    }
  } = properties;
  const text = warning(`${classNameRawNoVariants ? color.errorLight(classNameRawNoVariants) : 'Class'} was not found`);
  return text;
};

const logDeeplyNestedClass = properties => {
  const {
    pieces: {
      classNameRawNoVariants
    }
  } = properties;
  const text = warning(`${classNameRawNoVariants ? color.errorLight(classNameRawNoVariants) : 'Class'} is too deeply nested in your tailwind.config.js`);
  return text;
};

const checkDarkLightClasses = className => throwIf(['dark', 'light'].includes(className), () => `\n\n"${className}" must be added as className:${logBadGood(`tw\`${className}\``, `<div className="${className}">`)}\nRead more at https://twinredirect.page.link/darkLightMode\n`);

const isHex = hex => /^#([\da-f]{3}){1,2}$/i.test(hex);

const errorSuggestions = properties => {
  const {
    state: {
      configTwin: {
        hasSuggestions
      },
      config: {
        prefix
      }
    },
    pieces: {
      className
    },
    isCsOnly
  } = properties;
  if (isCsOnly) return spaced(`${color.highlight(className)} isn’t valid “short css”.\n\nThe syntax is like this: max-width[100vw]\nRead more at https://twinredirect.page.link/cs-classes`);
  checkDarkLightClasses(className);
  const textNotFound = logNoClass(properties);
  if (!hasSuggestions) return spaced(textNotFound);
  const suggestions = getSuggestions$1(properties);
  if (suggestions.length === 0) return spaced(textNotFound);

  if (typeof suggestions === 'string') {
    if (suggestions === className) return spaced(logDeeplyNestedClass(properties)); // Provide a suggestion for the default key update

    if (suggestions.endsWith('-default')) return spaced(`${textNotFound}\n\n${color.highlight(`To fix this, rename the 'default' key to 'DEFAULT' in your tailwind config or use the class '${className}-default'`)}\nRead more at https://twinredirect.page.link/default-to-DEFAULT`);
    return spaced(`${textNotFound}\n\nDid you mean ${color.highlight([prefix, suggestions].filter(Boolean).join(''))}?`);
  }

  const suggestion = [...suggestions].shift();
  const suggestionText = suggestions.length === 1 ? `Did you mean ${color.highlight([prefix, suggestion.target].filter(Boolean).join(''))}?` : `Try one of these classes:\n\n${formatSuggestions(suggestions)}`;
  return spaced(`${textNotFound}\n\n${suggestionText}`);
};

const themeErrorNotFound = ({
  theme,
  input,
  trimInput
}) => {
  if (typeof theme === 'string') return logBadGood(input, trimInput);
  const textNotFound = warning(`${color.errorLight(input)} was not found in your theme`);
  if (!theme) return spaced(textNotFound);
  const suggestionText = `Try one of these values:\n${formatSuggestions(Object.entries(theme).map(([k, v]) => ({
    target: k.includes && k.includes('.') ? `[${k}]` : k,
    value: typeof v === 'string' ? v : '...'
  })))}`;
  return spaced(`${textNotFound}\n\n${suggestionText}`);
};

const opacityErrorNotFound = ({
  className
}) => logBadGood(`The class \`${className}\` had an unsupported slash opacity`, `Remove the opacity from the end of the class`);

const logNotFoundVariant = ({
  classNameRaw
}) => logBadGood(`${classNameRaw}`, [`${classNameRaw}flex`, `${classNameRaw}(flex bg-black)`].join(color.subdued(' / ')));

const logNotFoundClass = logGeneralError('That class was not found');
const logStylePropertyError = logErrorFix('Styles shouldn’t be added within a `style={...}` prop', 'Use the tw or css prop instead: <div tw="" /> or <div css={tw``} />\n\nDisable this error by adding this in your twin config: `{ "allowStyleProp": true }`\nRead more at https://twinredirect.page.link/style-prop');

const debug = state => message => {
  if (state.isDev !== true) return;
  if (state.configTwin.debug !== true) return;
  return console.log(message);
};

const getCustomSuggestions = className => {
  const suggestions = {
    'flex-center': 'items-center / justify-center',
    'display-none': 'hidden',
    'display-inline': 'inline-block',
    'display-flex': 'flex',
    'border-radius': 'rounded',
    'flex-column': 'flex-col',
    'flex-column-reverse': 'flex-col-reverse',
    'text-italic': 'italic',
    'text-normal': 'font-normal / not-italic',
    ellipsis: 'text-ellipsis',
    'flex-no-wrap': 'flex-nowrap'
  }[className];
  if (suggestions) return suggestions;
};

const flattenObject = (object, prefix = '') => {
  if (!object) return {};
  return Object.keys(object).reduce((result, k) => {
    const pre = prefix.length > 0 ? prefix + '-' : '';
    const value = object[k];
    const fullKey = pre + k;

    if (Array.isArray(value)) {
      result[fullKey] = value;
    } else if (typeof value === 'object') {
      Object.assign(result, flattenObject(value, fullKey));
    } else {
      result[fullKey] = value;
    }

    return result;
  }, {});
};

const targetTransforms = [({
  target
}) => target === 'DEFAULT' ? '' : target, ({
  corePluginName,
  target
}) => {
  const prefix = target !== stripNegative(target) ? '-' : '';
  return `${prefix}${[corePluginName, stripNegative(target)].filter(Boolean).join('-')}`;
}];

const filterKeys = (object, negativesOnly) => Object.entries(object).reduce((result, [k, v]) => _extends({}, result, (negativesOnly ? k.startsWith('-') : !k.startsWith('-')) && {
  [k.replace('-DEFAULT', '')]: v
}), {});

const normalizeCoreConfig = ({
  config,
  input,
  corePluginName,
  hasNegative
}) => {
  const results = Object.entries(filterKeys(flattenObject(config), hasNegative)).map(([target, value]) => _extends({}, input && {
    rating: Number(stringSimilarity__default["default"].compareTwoStrings([corePluginName, target].join('-'), input))
  }, {
    target: targetTransforms.reduce((result, transformer) => transformer({
      corePluginName,
      target: result
    }), target),
    value: typeof value === 'function' ? '' : String(value) // Make sure objects are flattened and viewable

  }));
  const filteredResults = results.filter(item => !item.target.includes('-array-') && (input.rating ? typeof item.rating !== 'undefined' : true));
  return filteredResults;
};

const matchConfig = ({
  config,
  theme,
  className,
  corePluginName,
  hasNegative
}) => [...config].reduce((results, item) => // eslint-disable-next-line unicorn/prefer-spread
results.concat(normalizeCoreConfig({
  config: theme(item),
  input: className,
  corePluginName,
  hasNegative
})), []).sort((a, b) => b.rating - a.rating);

const getConfig = properties => matchConfig(_extends({}, properties, {
  className: null
})).slice(0, 20);

const sortRatingHighestFirst$1 = (a, b) => b.rating - a.rating;

const getSuggestions$1 = args => {
  const {
    pieces: {
      className,
      hasNegative
    },
    state,
    config,
    corePluginName
  } = args;
  const customSuggestions = getCustomSuggestions(className);
  if (customSuggestions) return customSuggestions;

  if (!isEmpty$1(config)) {
    const theme = getTheme(state.config.theme);
    const properties = {
      config,
      theme,
      corePluginName,
      className,
      hasNegative
    };
    const matches = matchConfig(properties);
    if (matches.length === 0) return getConfig(properties); // Check if the user means to select a default class

    const defaultFound = matches.find(match => match.target.endsWith('-default') && match.target.replace('-default', '') === className);
    if (defaultFound) return [defaultFound]; // If there's high rated suggestions then return them

    const trumpMatches = matches.filter(match => match.rating >= 0.5);
    if (!isEmpty$1(trumpMatches)) return trumpMatches.slice(0, 5);
    return matches.slice(0, 5);
  }

  const classMatches = [...new Set(Object.entries(corePlugins).map(([k, v]) => toArray(v).map(v => isObject(v.output) ? `${k}` : !isEmpty$1(v.config) ? getSuggestions$1(_extends({}, args, {
    config: toArray(v.config)
  })).map(s => s.target ? [k, s.target].join('-') : k) : `${k}-___`)).filter(Boolean).flat(2))];
  let matches = stringSimilarity__default["default"].findBestMatch(className, classMatches).ratings.filter(item => item.rating > 0.2);
  if (matches.length === 0) return []; // Bump up the rating on matches where the first few letters match

  const [firstPart] = splitOnFirst(className, '-');
  matches = matches.map(m => _extends({}, m, {
    rating: Number(m.rating) + (stringSimilarity__default["default"].compareTwoStrings(firstPart, m.target) > 0.2 ? 0.2 : 0)
  }));
  matches = matches.sort(sortRatingHighestFirst$1); // Single trumping match - good chance this is the one

  const trumpMatch = matches.find(match => match.rating >= 0.6);
  if (trumpMatch) return trumpMatch.target;
  return matches.slice(0, 5);
};

const getUnsupportedError = feature => logErrorFix(`A plugin is trying to use the unsupported “${feature}” function`, `Either remove the plugin or add this in your twin config: \`{ "allowUnsupportedPlugins": true }\``);

const SPREAD_ID = '__spread__';
const COMPUTED_ID = '__computed__';

function addImport({
  types: t,
  program,
  mod,
  name,
  identifier
}) {
  const importName = name === 'default' ? [t.importDefaultSpecifier(identifier)] : name ? [t.importSpecifier(identifier, t.identifier(name))] : [];
  program.unshiftContainer('body', t.importDeclaration(importName, t.stringLiteral(mod)));
}

function objectExpressionElements(literal, t, spreadType) {
  return Object.keys(literal).filter(k => typeof literal[k] !== 'undefined').map(k => {
    if (k.startsWith(SPREAD_ID)) {
      return t[spreadType](babylon__default["default"].parseExpression(literal[k]));
    }

    const computed = k.startsWith(COMPUTED_ID);
    const key = computed ? babylon__default["default"].parseExpression(k.slice(12)) : t.stringLiteral(k);
    return t.objectProperty(key, astify(literal[k], t), computed);
  });
}
/**
 * Convert plain js into babel ast
 */


function astify(literal, t) {
  if (literal === null) {
    return t.nullLiteral();
  }

  switch (typeof literal) {
    case 'function':
      return t.unaryExpression('void', t.numericLiteral(0), true);

    case 'number':
      return t.numericLiteral(literal);

    case 'boolean':
      return t.booleanLiteral(literal);

    case 'undefined':
      return t.unaryExpression('void', t.numericLiteral(0), true);

    case 'string':
      if (literal.startsWith(COMPUTED_ID)) {
        return babylon__default["default"].parseExpression(literal.slice(COMPUTED_ID.length));
      }

      return t.stringLiteral(literal);

    default:
      // Assuming literal is an object
      if (Array.isArray(literal)) {
        return t.arrayExpression(literal.map(x => astify(x, t)));
      }

      try {
        return t.objectExpression(objectExpressionElements(literal, t, 'spreadElement'));
      } catch (_) {
        return t.objectExpression(objectExpressionElements(literal, t, 'spreadProperty'));
      }

  }
}

const setStyledIdentifier = ({
  state,
  path,
  styledImport
}) => {
  const importFromStitches = state.isStitches && styledImport.from.includes(path.node.source.value);
  const importFromLibrary = path.node.source.value === styledImport.from;
  if (!importFromLibrary && !importFromStitches) return; // Look for an existing import that matches the config,
  // if found then reuse it for the rest of the function calls

  path.node.specifiers.some(specifier => {
    if (specifier.type === 'ImportDefaultSpecifier' && styledImport.import === 'default' && // fixes an issue in gatsby where the styled-components plugin has run
    // before twin. fix is to ignore import aliases which babel creates
    // https://github.com/ben-rogerson/twin.macro/issues/192
    !specifier.local.name.startsWith('_')) {
      state.styledIdentifier = specifier.local;
      state.existingStyledIdentifier = true;
      return true;
    }

    if (specifier.imported && specifier.imported.name === styledImport.import) {
      state.styledIdentifier = specifier.local;
      state.existingStyledIdentifier = true;
      return true;
    }

    state.existingStyledIdentifier = false;
    return false;
  });
};

const setCssIdentifier = ({
  state,
  path,
  cssImport
}) => {
  const importFromStitches = state.isStitches && cssImport.from.includes(path.node.source.value);
  const isLibraryImport = path.node.source.value === cssImport.from;
  if (!isLibraryImport && !importFromStitches) return; // Look for an existing import that matches the config,
  // if found then reuse it for the rest of the function calls

  path.node.specifiers.some(specifier => {
    if (specifier.type === 'ImportDefaultSpecifier' && cssImport.import === 'default') {
      state.cssIdentifier = specifier.local;
      state.existingCssIdentifier = true;
      return true;
    }

    if (specifier.imported && specifier.imported.name === cssImport.import) {
      state.cssIdentifier = specifier.local;
      state.existingCssIdentifier = true;
      return true;
    }

    state.existingCssIdentifier = false;
    return false;
  });
};
/**
 * Parse tagged template arrays (``)
 */


function parseTte({
  path,
  types: t,
  styledIdentifier,
  state
}) {
  const cloneNode = t.cloneNode || t.cloneDeep;
  const tagType = path.node.tag.type;
  if (tagType !== 'Identifier' && tagType !== 'MemberExpression' && tagType !== 'CallExpression') return null; // Convert *very* basic interpolated variables

  const string = path.get('quasi').evaluate().value; // Grab the path location before changing it

  const stringLoc = path.get('quasi').node.loc;

  if (tagType === 'CallExpression') {
    replaceWithLocation(path.get('tag').get('callee'), cloneNode(styledIdentifier));
    state.isImportingStyled = true;
  } else if (tagType === 'MemberExpression') {
    replaceWithLocation(path.get('tag').get('object'), cloneNode(styledIdentifier));
    state.isImportingStyled = true;
  }

  if (tagType === 'CallExpression' || tagType === 'MemberExpression') {
    replaceWithLocation(path, t.callExpression(cloneNode(path.node.tag), [t.identifier('__twPlaceholder')]));
    path = path.get('arguments')[0];
  } // Restore the original path location


  path.node.loc = stringLoc;
  return {
    string,
    path
  };
}

function replaceWithLocation(path, replacement) {
  const {
    loc
  } = path.node;
  const newPaths = replacement ? path.replaceWith(replacement) : [];

  if (Array.isArray(newPaths) && newPaths.length > 0) {
    // FIXME: Remove comment and fix next line
    // eslint-disable-next-line unicorn/no-array-for-each
    newPaths.forEach(p => {
      p.node.loc = loc;
    });
  }

  return newPaths;
}

const validImports = new Set(['default', 'styled', 'css', 'theme', 'screen', 'TwStyle', 'TwComponent', 'ThemeStyle', 'GlobalStyles', 'globalStyles']);

const validateImports = imports => {
  const unsupportedImport = Object.keys(imports).find(reference => !validImports.has(reference));
  const importTwAsNamedNotDefault = Object.keys(imports).find(reference => reference === 'tw');
  throwIf(importTwAsNamedNotDefault, () => {
    logGeneralError(`Please use the default export for twin.macro, i.e:\nimport tw from 'twin.macro'\nNOT import { tw } from 'twin.macro'`);
  });
  throwIf(unsupportedImport, () => logGeneralError(`Twin doesn't recognize { ${unsupportedImport} }\n\nTry one of these imports:\nimport tw, { styled, css, theme, screen, GlobalStyles, globalStyles } from 'twin.macro'`));
};

const generateUid = (name, program) => program.scope.generateUidIdentifier(name);

const getParentJSX = path => path.findParent(p => p.isJSXOpeningElement());

const getAttributeNames = jsxPath => {
  const attributes = jsxPath.get('attributes');
  const attributeNames = attributes.map(p => p.node.name && p.node.name.name);
  return attributeNames;
};

const getCssAttributeData = attributes => {
  if (!String(attributes)) return {};
  const index = attributes.findIndex(attribute => attribute.isJSXAttribute() && attribute.get('name.name').node === 'css');
  return {
    index,
    hasCssAttribute: index >= 0,
    attribute: attributes[index]
  };
};

const getFunctionValue = path => {
  if (path.parent.type !== 'CallExpression') return;
  const parent = path.findParent(x => x.isCallExpression());
  if (!parent) return;
  const argument = parent.get('arguments')[0] || '';
  return {
    parent,
    input: argument.evaluate && argument.evaluate().value
  };
};

const getTaggedTemplateValue = path => {
  if (path.parent.type !== 'TaggedTemplateExpression') return;
  const parent = path.findParent(x => x.isTaggedTemplateExpression());
  if (!parent) return;
  if (parent.node.tag.type !== 'Identifier') return;
  return {
    parent,
    input: parent.get('quasi').evaluate().value
  };
};

const getMemberExpression = path => {
  if (path.parent.type !== 'MemberExpression') return;
  const parent = path.findParent(x => x.isMemberExpression());
  if (!parent) return;
  return {
    parent,
    input: parent.get('property').node.name
  };
};

const generateTaggedTemplateExpression = ({
  identifier,
  t,
  styles
}) => {
  const backtickStyles = t.templateElement({
    raw: `${styles}`,
    cooked: `${styles}`
  });
  const ttExpression = t.taggedTemplateExpression(identifier, t.templateLiteral([backtickStyles], []));
  return ttExpression;
};

const isComponent = name => name.slice(0, 1).toUpperCase() === name.slice(0, 1);

const jsxElementNameError = () => logGeneralError(`The css prop + tw props can only be added to jsx elements with a single dot in their name (or no dot at all).`);

const getFirstStyledArgument = (jsxPath, t) => {
  const path = get__default["default"](jsxPath, 'node.name.name');
  if (path) return isComponent(path) ? t.identifier(path) : t.stringLiteral(path);
  const dotComponent = get__default["default"](jsxPath, 'node.name');
  throwIf(!dotComponent, jsxElementNameError); // Element name has dots in it

  const objectName = get__default["default"](dotComponent, 'object.name');
  throwIf(!objectName, jsxElementNameError);
  const propertyName = get__default["default"](dotComponent, 'property.name');
  throwIf(!propertyName, jsxElementNameError);
  return t.memberExpression(t.identifier(objectName), t.identifier(propertyName));
};

const makeStyledComponent = ({
  secondArg,
  jsxPath,
  t,
  program,
  state
}) => {
  const constName = program.scope.generateUidIdentifier('TwComponent');

  if (!state.styledIdentifier) {
    state.styledIdentifier = generateUid('styled', program);
    state.isImportingStyled = true;
  }

  const firstArg = getFirstStyledArgument(jsxPath, t);
  const args = [firstArg, secondArg].filter(Boolean);
  const identifier = t.callExpression(state.styledIdentifier, args);
  const styledProps = [t.variableDeclarator(constName, identifier)];
  const styledDefinition = t.variableDeclaration('const', styledProps);
  const rootParentPath = jsxPath.findParent(p => p.parentPath.isProgram());
  rootParentPath.insertBefore(styledDefinition);

  if (t.isMemberExpression(firstArg)) {
    // Replace components with a dot, eg: Dialog.blah
    const id = t.jsxIdentifier(constName.name);
    jsxPath.get('name').replaceWith(id);
    if (jsxPath.node.selfClosing) return;
    jsxPath.parentPath.get('closingElement.name').replaceWith(id);
  } else {
    jsxPath.node.name.name = constName.name;
    if (jsxPath.node.selfClosing) return;
    jsxPath.parentPath.node.closingElement.name.name = constName.name;
  }
};

// Defaults for different css-in-js libraries
const configDefaultsGoober = {
  sassyPseudo: true
}; // Sets selectors like hover to &:hover

const configDefaultsStitches = {
  sassyPseudo: true,
  // Sets selectors like hover to &:hover
  convertStyledDot: true,
  // Convert styled.[element] to a default syntax
  moveTwPropToStyled: true,
  // Move the tw prop to a styled definition
  convertHtmlElementToStyled: true,
  // For packages like stitches, add a styled definition on css prop elements
  stitchesConfig: undefined // Set the path to the stitches config

};

const configDefaultsTwin = ({
  isGoober,
  isStitches,
  isDev
}) => _extends({
  allowUnsupportedPlugins: false,
  // Allow plugins to use an unsupported API function, eg: addVariant()
  allowStyleProp: false,
  // Allows styles within style="blah" without throwing an error
  autoCssProp: false,
  // Deprecated since v2.8.2
  dataTwProp: isDev,
  // During development, add a data-tw="" prop containing your tailwind classes for backtracing
  hasSuggestions: true,
  // Switch suggestions on/off when you use a tailwind class that's not found
  sassyPseudo: false,
  // Sets selectors like hover to &:hover
  debug: false,
  // Show the output of the classes twin converts
  debugPlugins: false,
  // Display generated class information from your plugins
  includeClassNames: false,
  // Look in the className props for tailwind classes to convert
  dataCsProp: isDev,
  // During development, add a data-cs="" prop containing your short css classes for backtracing
  disableCsProp: false,
  // Disable converting css styles in the cs prop
  disableShortCss: false,
  // Disable converting css written using short css
  config: undefined
}, isGoober && configDefaultsGoober, isStitches && configDefaultsStitches);

const isBoolean = value => typeof value === 'boolean';

const allowedPresets = ['styled-components', 'emotion', 'goober', 'stitches'];
const configTwinValidators = {
  preset: [value => value === undefined || allowedPresets.includes(value), `The config “preset” can only be:\n${allowedPresets.map(p => `'${p}'`).join(', ')}`],
  allowStyleProp: [isBoolean, 'The config “allowStyleProp” can only be true or false'],
  autoCssProp: [value => value !== true, 'The “autoCssProp” feature has been removed from twin.macro@2.8.2+\nThis means the css prop must be added by styled-components instead.\nSetup info at https://twinredirect.page.link/auto-css-prop\n\nRemove the “autoCssProp” item from your config to avoid this message.'],
  disableColorVariables: [value => value !== true, 'The disableColorVariables feature has been removed from twin.macro@3+\n\nRemove the disableColorVariables item from your config to avoid this message.'],
  hasSuggestions: [isBoolean, 'The config “hasSuggestions” can only be true or false'],
  sassyPseudo: [isBoolean, 'The config “sassyPseudo” can only be true or false'],
  dataTwProp: [value => isBoolean(value) || value === 'all', 'The config “dataTwProp” can only be true, false or "all"'],
  dataCsProp: [value => isBoolean(value) || value === 'all', 'The config “dataCsProp” can only be true, false or "all"'],
  debugProp: [value => value === undefined, `The “debugProp” option was renamed to “dataTwProp”, please rename it in your twin config`],
  includeClassNames: [isBoolean, 'The config “includeClassNames” can only be true or false'],
  disableCsProp: [isBoolean, 'The config “disableCsProp” can only be true or false'],
  convertStyledDot: [isBoolean, 'The config “convertStyledDot” can only be true or false'],
  moveTwPropToStyled: [isBoolean, 'The config “moveTwPropToStyled” can only be true or false'],
  convertHtmlElementToStyled: [isBoolean, 'The config “convertHtmlElementToStyled” can only be true or false']
};

const getAllConfigs = config => {
  const configs = flatMap__default["default"]([...get__default["default"](config, 'presets', [defaultTailwindConfig__default["default"]])].reverse(), preset => {
    const config = typeof preset === 'function' ? preset() : preset;
    return getAllConfigs(config);
  });
  return [config, ...configs];
}; // Fix: Warning Tailwind throws when the content key is empty


const silenceContentWarning = config => _extends({}, !config.content && {
  content: ['']
}, config);

const getConfigTailwindProperties = (state, config) => {
  const sourceRoot = state.file.opts.sourceRoot || '.';
  const configFile = config && config.config;
  const configPath = path.resolve(sourceRoot, configFile || './tailwind.config.js');
  const configExists = fs.existsSync(configPath); // Look for a commonjs file as a fallback

  if (!configExists && !configFile) return getConfigTailwindProperties(state, _extends({}, config, {
    config: './tailwind.config.cjs'
  }));
  const configSelected = configExists ? require(configPath) : defaultTailwindConfig__default["default"];
  const configUser = silenceContentWarning(configSelected);
  const configTailwind = resolveTailwindConfig__default["default"]([...getAllConfigs(configUser)]);
  throwIf(!configTailwind, () => logGeneralError(`Couldn’t find the Tailwind config.\nLooked in ${config}`));
  return {
    configExists,
    configTailwind,
    configPath
  };
};

const checkExists = (fileName, sourceRoot) => {
  const [, value] = getFirstValue(toArray(fileName), fileName => fs.existsSync(path.resolve(sourceRoot, `./${fileName}`)));
  return value;
};

const getRelativePath = ({
  comparePath,
  state
}) => {
  const {
    filename
  } = state.file.opts;
  const pathName = path.parse(filename).dir;
  return path.relative(pathName, comparePath);
};

const getStitchesPath = (state, config) => {
  const sourceRoot = state.file.opts.sourceRoot || '.';
  const configPathCheck = config.stitchesConfig || ['stitches.config.ts', 'stitches.config.js'];
  const configPath = checkExists(configPathCheck, sourceRoot);
  throwIf(!configPath, () => logGeneralError(`Couldn’t find the Stitches config at ${config.stitchesConfig ? `“${config.stitchesConfig}”` : 'the project root'}.\nUse the twin config: stitchesConfig="PATH_FROM_PROJECT_ROOT" to set the location.`));
  return getRelativePath({
    comparePath: configPath,
    state
  });
};

const runConfigValidator = ([item, value]) => {
  const validatorConfig = configTwinValidators[item];
  if (!validatorConfig) return true;
  const [validator, errorMessage] = validatorConfig;
  throwIf(validator(value) !== true, () => logGeneralError(errorMessage));
  return true;
};

const getConfigTwin = (config, state) => _extends({}, configDefaultsTwin(state), config);

const getConfigTwinValidated = (config, state) => Object.entries(getConfigTwin(config, state)).reduce((result, item) => _extends({}, result, runConfigValidator(item) && {
  [item[0]]: item[1]
}), {});

const getFlatCoercedConfigByProperty = property => {
  const coreConfig = getCorePluginsByProperty(property);
  const config = coreConfig.map(i => i.coerced).filter(Boolean);
  if (config.length === 0) return;
  return Object.assign({}, ...config);
};

const getCorePluginsByProperty = propertyName => {
  const match = Object.entries(corePlugins).find(([k]) => propertyName === k);
  if (!match) return [];
  const found = match[1];
  return toArray(found);
};

const supportsArbitraryValues = coreConfigValue => toArray(coreConfigValue).some(config => config.output && typeof config.output === 'function' || !config.output && config.coerced || config.config);

/**
 * Config presets
 *
 * To use, add the preset in package.json/babel macro config:
 *
 * styled-components
 * { "babelMacros": { "twin": { "preset": "styled-components" } } }
 * module.exports = { twin: { preset: "styled-components" } }
 *
 * emotion
 * { "babelMacros": { "twin": { "preset": "emotion" } } }
 * module.exports = { twin: { preset: "emotion" } }
 *
 * goober
 * { "babelMacros": { "twin": { "preset": "goober" } } }
 * module.exports = { twin: { preset: "goober" } }
 */
var userPresets = {
  'styled-components': {
    styled: {
      import: 'default',
      from: 'styled-components'
    },
    css: {
      import: 'css',
      from: 'styled-components'
    },
    global: {
      import: 'createGlobalStyle',
      from: 'styled-components'
    }
  },
  emotion: {
    styled: {
      import: 'default',
      from: '@emotion/styled'
    },
    css: {
      import: 'css',
      from: '@emotion/react'
    },
    global: {
      import: 'Global',
      from: '@emotion/react'
    }
  },
  goober: {
    styled: {
      import: 'styled',
      from: 'goober'
    },
    css: {
      import: 'css',
      from: 'goober'
    },
    global: {
      import: 'createGlobalStyles',
      from: 'goober/global'
    }
  },
  stitches: {
    styled: {
      import: 'styled',
      from: 'stitches.config'
    },
    css: {
      import: 'css',
      from: 'stitches.config'
    },
    global: {
      import: 'global',
      from: 'stitches.config'
    }
  }
};

const getCssConfig = ({
  state,
  config
}) => {
  const usedConfig = config.css && config || userPresets[config.preset] || userPresets.emotion;

  if (typeof usedConfig.css === 'string') {
    return {
      import: 'css',
      from: usedConfig.css
    };
  }

  if (config.preset === 'stitches') {
    const stitchesPath = getStitchesPath(state, config);

    if (stitchesPath) {
      // Overwrite the stitches import data with the path from the current file
      usedConfig.css.from = stitchesPath;
    }
  }

  return usedConfig.css;
};

const updateCssReferences = ({
  references,
  state
}) => {
  if (state.existingCssIdentifier) return;
  const cssReferences = references.css;
  if (isEmpty$1(cssReferences)) return; // FIXME: Remove comment and fix next line
  // eslint-disable-next-line unicorn/no-array-for-each

  cssReferences.forEach(path => {
    path.node.name = state.cssIdentifier.name;
  });
};

const addCssImport = ({
  references,
  program,
  t,
  cssImport,
  state
}) => {
  if (!state.isImportingCss) {
    const shouldImport = !isEmpty$1(references.css) && !state.existingCssIdentifier;
    if (!shouldImport) return;
  }

  if (state.existingCssIdentifier) return;
  addImport({
    types: t,
    program,
    name: cssImport.import,
    mod: cssImport.from,
    identifier: state.cssIdentifier
  });
};

const convertHtmlElementToStyled = props => {
  const {
    path,
    t,
    state
  } = props;
  if (!state.configTwin.convertHtmlElementToStyled) return;
  const jsxPath = path.parentPath;
  makeStyledComponent(_extends({}, props, {
    jsxPath,
    secondArg: t.objectExpression([])
  }));
};

const getStyledConfig = ({
  state,
  config
}) => {
  const usedConfig = config.styled && config || userPresets[config.preset] || userPresets.emotion;

  if (typeof usedConfig.styled === 'string') {
    return {
      import: 'default',
      from: usedConfig.styled
    };
  }

  if (config.preset === 'stitches') {
    const stitchesPath = getStitchesPath(state, config);

    if (stitchesPath) {
      // Overwrite the stitches import data with the path from the current file
      usedConfig.styled.from = stitchesPath;
    }
  }

  return usedConfig.styled;
};

const updateStyledReferences = ({
  references,
  state
}) => {
  if (state.existingStyledIdentifier) return;
  const styledReferences = references.styled;
  if (isEmpty$1(styledReferences)) return; // FIXME: Remove comment and fix next line
  // eslint-disable-next-line unicorn/no-array-for-each

  styledReferences.forEach(path => {
    path.node.name = state.styledIdentifier.name;
  });
};

const addStyledImport = ({
  references,
  program,
  t,
  styledImport,
  state
}) => {
  if (!state.isImportingStyled) {
    const shouldImport = !isEmpty$1(references.styled) && !state.existingStyledIdentifier;
    if (!shouldImport) return;
  }

  if (state.existingStyledIdentifier) return;
  addImport({
    types: t,
    program,
    name: styledImport.import,
    mod: styledImport.from,
    identifier: state.styledIdentifier
  });
};

const moveDotElementToParam = ({
  path,
  t
}) => {
  if (path.parent.type !== 'MemberExpression') return;
  const parentCallExpression = path.findParent(x => x.isCallExpression());
  if (!parentCallExpression) return;
  const styledName = get__default["default"](path, 'parentPath.node.property.name');
  const styledArgs = get__default["default"](parentCallExpression, 'node.arguments.0');
  const args = [t.stringLiteral(styledName), styledArgs].filter(Boolean);
  const replacement = t.callExpression(path.node, args);
  replaceWithLocation(parentCallExpression, replacement);
};

const handleStyledFunction = ({
  references,
  t,
  state
}) => {
  if (!state.configTwin.convertStyledDot) return;
  if (isEmpty$1(references)) return;
  [...(references.default || []), ...(references.styled || [])].filter(Boolean) // FIXME: Remove comment and fix next line
  // eslint-disable-next-line unicorn/no-array-for-each
  .forEach(path => {
    // convert tw.div`` & styled.div`` to styled('div', {})
    moveDotElementToParam({
      path,
      t
    });
  });
};

const trimInput = themeValue => {
  const arrayValues = themeValue // Split at dots outside of square brackets
  .split(/\.(?=(((?!]).)*\[)|[^[\]]*$)/).filter(Boolean);

  if (arrayValues.length === 1) {
    return arrayValues[0];
  }

  return arrayValues.slice(0, -1).join('.');
};

const getThemeValue = (input, {
  state,
  skipDefault = false
}) => {
  const theme = getTheme(state.config.theme);
  let themeValue = theme(input); // Return the whole object when input ends with a dot

  if (!themeValue && input.endsWith('.')) return getThemeValue(input.slice(0, -1), {
    state,
    skipDefault: true
  }); // Return the default key when an object is found

  if (!skipDefault && themeValue && themeValue.DEFAULT) themeValue = themeValue.DEFAULT;
  themeValue = typeof themeValue === 'function' ? themeValue({}) : themeValue;
  return [themeValue, theme];
};

const handleThemeFunction = ({
  references,
  t,
  state
}) => {
  if (!references.theme) return; // FIXME: Remove comment and fix next line
  // eslint-disable-next-line unicorn/no-array-for-each

  references.theme.forEach(path => {
    const {
      input,
      parent
    } = getTaggedTemplateValue(path) || getFunctionValue(path) || {
      input: null,
      parent: null
    };
    throwIf(!parent, () => logGeneralError("The theme value doesn’t look right\n\nTry using it like this: theme`colors.black` or theme('colors.black')"));
    const [themeValue, theme] = getThemeValue(input, {
      state
    });
    throwIf(!themeValue, () => themeErrorNotFound({
      theme: input.includes('.') ? get__default["default"](theme(), trimInput(input)) : theme(),
      input,
      trimInput: trimInput(input)
    }));
    return replaceWithLocation(parent, astify(themeValue, t));
  });
};

const getDirectReplacement = ({
  mediaQuery,
  parent,
  t
}) => ({
  newPath: parent,
  replacement: astify(mediaQuery, t)
});

const handleDefinition = ({
  mediaQuery,
  parent,
  type,
  t
}) => ({
  TaggedTemplateExpression() {
    const newPath = parent.findParent(x => x.isTaggedTemplateExpression());
    const query = [`${mediaQuery} { `, ` }`];
    const quasis = [t.templateElement({
      raw: query[0],
      cooked: query[0]
    }, false), t.templateElement({
      raw: query[1],
      cooked: query[1]
    }, true)];
    const expressions = [newPath.get('quasi').node];
    const replacement = t.templateLiteral(quasis, expressions);
    return {
      newPath,
      replacement
    };
  },

  CallExpression() {
    const newPath = parent.findParent(x => x.isCallExpression());
    const value = newPath.get('arguments')[0].node;
    const replacement = t.objectExpression([t.objectProperty(t.stringLiteral(mediaQuery), value)]);
    return {
      newPath,
      replacement
    };
  },

  ObjectProperty() {
    // Remove brackets around keys so merges work with tailwind screens
    // styled.div({ [screen`2xl`]: tw`block`, ...tw`2xl:inline` })
    // https://github.com/ben-rogerson/twin.macro/issues/379
    parent.parent.computed = false;
    return getDirectReplacement({
      mediaQuery,
      parent,
      t
    });
  },

  ExpressionStatement: () => getDirectReplacement({
    mediaQuery,
    parent,
    t
  }),
  ArrowFunctionExpression: () => getDirectReplacement({
    mediaQuery,
    parent,
    t
  }),
  ArrayExpression: () => getDirectReplacement({
    mediaQuery,
    parent,
    t
  }),
  BinaryExpression: () => getDirectReplacement({
    mediaQuery,
    parent,
    t
  }),
  LogicalExpression: () => getDirectReplacement({
    mediaQuery,
    parent,
    t
  }),
  ConditionalExpression: () => getDirectReplacement({
    mediaQuery,
    parent,
    t
  }),
  VariableDeclarator: () => getDirectReplacement({
    mediaQuery,
    parent,
    t
  }),
  TemplateLiteral: () => getDirectReplacement({
    mediaQuery,
    parent,
    t
  }),
  TSAsExpression: () => getDirectReplacement({
    mediaQuery,
    parent,
    t
  })
})[type];

const validateScreenValue = ({
  screen,
  screens,
  value
}) => throwIf(!screen, () => logBadGood(`${value ? `“${value}” wasn’t found in your` : 'Specify a screen value from your'} tailwind config`, `Try one of these:\n\n${Object.entries(screens).map(([k, v]) => `screen.${k}\`...\` (${v})`).join('\n')}`));

const getMediaQuery = ({
  input,
  screens
}) => {
  validateScreenValue({
    screen: screens[input],
    screens,
    value: input
  });
  const mediaQuery = `@media (min-width: ${screens[input]})`;
  return mediaQuery;
};

const handleScreenFunction = ({
  references,
  t,
  state
}) => {
  if (!references.screen) return;
  const theme = getTheme(state.config.theme);
  const screens = theme('screens'); // FIXME: Remove comment and fix next line
  // eslint-disable-next-line unicorn/no-array-for-each

  references.screen.forEach(path => {
    const {
      input,
      parent
    } = getTaggedTemplateValue(path) || // screen.lg``
    getFunctionValue(path) || // screen.lg({ })
    getMemberExpression(path) || {
      // screen`lg`
      input: null,
      parent: null
    };
    const definition = handleDefinition({
      type: parent.parent.type,
      mediaQuery: getMediaQuery({
        input,
        screens
      }),
      parent,
      t
    });
    throwIf(!definition, () => logBadGood(`The screen import doesn’t support that syntax`, `Try something like this:\n\n${[...Object.keys(screens)].map(f => `screen.${f}`).join(', ')}`));
    const {
      newPath,
      replacement
    } = definition();
    replaceWithLocation(newPath, replacement);
  });
};

// Reference: https://github.com/tailwindlabs/tailwindcss/blob/master/src/css/preflight.css
const globalPreflightStyles = ({
  theme
}) => ({
  '*, ::before, ::after': {
    boxSizing: 'border-box',
    borderWidth: '0',
    borderStyle: 'solid',
    borderColor: theme`borderColor.DEFAULT` || 'currentColor'
  },
  '::before, ::after': {
    '--tw-content': "''"
  },
  html: {
    lineHeight: '1.5',
    WebkitTextSizeAdjust: '100%',
    MozTabSize: '4',
    tabSize: '4',
    fontFamily: theme`fontFamily.sans` || `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"`
  },
  body: {
    margin: '0',
    lineHeight: 'inherit'
  },
  hr: {
    height: '0',
    color: 'inherit',
    borderTopWidth: '1px'
  },
  'abbr:where([title])': {
    textDecoration: 'underline dotted'
  },
  'h1, h2, h3, h4, h5, h6': {
    fontSize: 'inherit',
    fontWeight: 'inherit'
  },
  a: {
    color: 'inherit',
    textDecoration: 'inherit'
  },
  'b, strong': {
    fontWeight: 'bolder'
  },
  'code, kbd, samp, pre': {
    fontFamily: theme`fontFamily.mono` || `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`,
    fontSize: '1em'
  },
  small: {
    fontSize: '80%'
  },
  'sub, sup': {
    fontSize: '75%',
    lineHeight: '0',
    position: 'relative',
    verticalAlign: 'baseline'
  },
  sub: {
    bottom: '-0.25em'
  },
  sup: {
    top: '-0.5em'
  },
  table: {
    textIndent: '0',
    borderColor: 'inherit',
    borderCollapse: 'collapse'
  },
  'button, input, optgroup, select, textarea': {
    fontFamily: 'inherit',
    fontSize: '100%',
    lineHeight: 'inherit',
    color: 'inherit',
    margin: '0',
    padding: '0'
  },
  'button, select': {
    textTransform: 'none'
  },
  'button, [type="button"], [type="reset"], [type="submit"]': {
    WebkitAppearance: 'button',
    backgroundColor: 'transparent',
    backgroundImage: 'none'
  },
  ':-moz-focusring': {
    outline: 'auto'
  },
  ':-moz-ui-invalid': {
    boxShadow: 'none'
  },
  progress: {
    verticalAlign: 'baseline'
  },
  '::-webkit-inner-spin-button, ::-webkit-outer-spin-button': {
    height: 'auto'
  },
  '[type="search"]': {
    WebkitAppearance: 'textfield',
    outlineOffset: '-2px'
  },
  '::-webkit-search-decoration': {
    WebkitAppearance: 'none'
  },
  '::-webkit-file-upload-button': {
    WebkitAppearance: 'button',
    font: 'inherit'
  },
  summary: {
    display: 'list-item'
  },
  'blockquote, dl, dd, h1, h2, h3, h4, h5, h6, hr, figure, p, pre': {
    margin: '0'
  },
  fieldset: {
    margin: '0',
    padding: '0'
  },
  legend: {
    padding: '0'
  },
  'ol, ul, menu': {
    listStyle: 'none',
    margin: '0',
    padding: '0'
  },
  textarea: {
    resize: 'vertical'
  },
  'input::-moz-placeholder, textarea::-moz-placeholder': {
    opacity: '1',
    color: theme`colors.gray.400` || '#9ca3af'
  },
  'input:-ms-input-placeholder, textarea:-ms-input-placeholder': {
    opacity: '1',
    color: theme`colors.gray.400` || '#9ca3af'
  },
  'input::placeholder, textarea::placeholder': {
    opacity: '1',
    color: theme`colors.gray.400` || '#9ca3af'
  },
  'button, [role="button"]': {
    cursor: 'pointer'
  },
  ':disabled, [disabled]': {
    cursor: 'default'
  },
  // Gotcha: :disabled doesn't seem to work with css-in-js so added [disabled] as a backup
  'img, svg, video, canvas, audio, iframe, embed, object': {
    display: 'block',
    verticalAlign: 'middle'
  },
  'img, video': {
    maxWidth: '100%',
    height: 'auto'
  },
  '[hidden]': {
    display: 'none'
  }
});
const globalRingStyles = ({
  theme,
  withAlpha
}) => {
  const ringOpacityDefault = theme`ringOpacity.DEFAULT` || '0.5';
  const ringColorDefault = withAlpha({
    color: theme`ringColor.DEFAULT` || `rgb(147 197 253 / ${ringOpacityDefault})`,
    pieces: {
      important: '',
      hasAlpha: true,
      alpha: ringOpacityDefault
    }
  });
  return {
    '*, ::before, ::after': {
      '--tw-ring-inset': 'var(--tw-empty,/*!*/ /*!*/)',
      '--tw-ring-offset-width': theme`ringOffsetWidth.DEFAULT` || '0px',
      '--tw-ring-offset-color': theme`ringOffsetColor.DEFAULT` || '#fff',
      '--tw-ring-color': ringColorDefault,
      '--tw-ring-offset-shadow': '0 0 #0000',
      '--tw-ring-shadow': '0 0 #0000'
    }
  };
};
const globalTransformStyles = {
  '*, ::before, ::after': {
    '--tw-translate-x': '0',
    '--tw-translate-y': '0',
    '--tw-rotate': '0',
    '--tw-skew-x': '0',
    '--tw-skew-y': '0',
    '--tw-scale-x': '1',
    '--tw-scale-y': '1'
  }
};
const globalTouchActionStyles = {
  '*, ::before, ::after': {
    '--tw-pan-x': 'var(--tw-empty,/*!*/ /*!*/)',
    '--tw-pan-y': 'var(--tw-empty,/*!*/ /*!*/)',
    '--tw-pinch-zoom': 'var(--tw-empty,/*!*/ /*!*/)'
  }
};
const globalScrollSnapTypeStyles = {
  '*, ::before, ::after': {
    '--tw-scroll-snap-strictness': 'proximity'
  }
};
const globalFontVariantNumericStyles = {
  '*, ::before, ::after': {
    '--tw-ordinal': 'var(--tw-empty,/*!*/ /*!*/)',
    '--tw-slashed-zero': 'var(--tw-empty,/*!*/ /*!*/)',
    '--tw-numeric-figure': 'var(--tw-empty,/*!*/ /*!*/)',
    '--tw-numeric-spacing': 'var(--tw-empty,/*!*/ /*!*/)',
    '--tw-numeric-fraction': 'var(--tw-empty,/*!*/ /*!*/)'
  }
};
const globalBoxShadowStyles = {
  '*, ::before, ::after': {
    '--tw-shadow': '0 0 #0000',
    '--tw-shadow-colored': '0 0 #0000'
  }
};
const globalFilterStyles = {
  '*, ::before, ::after': {
    '--tw-blur': 'var(--tw-empty,/*!*/ /*!*/)',
    '--tw-brightness': 'var(--tw-empty,/*!*/ /*!*/)',
    '--tw-contrast': 'var(--tw-empty,/*!*/ /*!*/)',
    '--tw-grayscale': 'var(--tw-empty,/*!*/ /*!*/)',
    '--tw-hue-rotate': 'var(--tw-empty,/*!*/ /*!*/)',
    '--tw-invert': 'var(--tw-empty,/*!*/ /*!*/)',
    '--tw-saturate': 'var(--tw-empty,/*!*/ /*!*/)',
    '--tw-sepia': 'var(--tw-empty,/*!*/ /*!*/)',
    '--tw-drop-shadow': 'var(--tw-empty,/*!*/ /*!*/)'
  }
};
const globalBackdropStyles = {
  '*, ::before, ::after': {
    '--tw-backdrop-blur': 'var(--tw-empty,/*!*/ /*!*/)',
    '--tw-backdrop-brightness': 'var(--tw-empty,/*!*/ /*!*/)',
    '--tw-backdrop-contrast': 'var(--tw-empty,/*!*/ /*!*/)',
    '--tw-backdrop-grayscale': 'var(--tw-empty,/*!*/ /*!*/)',
    '--tw-backdrop-hue-rotate': 'var(--tw-empty,/*!*/ /*!*/)',
    '--tw-backdrop-invert': 'var(--tw-empty,/*!*/ /*!*/)',
    '--tw-backdrop-opacity': 'var(--tw-empty,/*!*/ /*!*/)',
    '--tw-backdrop-saturate': 'var(--tw-empty,/*!*/ /*!*/)',
    '--tw-backdrop-sepia': 'var(--tw-empty,/*!*/ /*!*/)'
  }
};
const globalKeyframeStyles = ({
  theme
}) => {
  const keyframes = theme('keyframes');
  if (!keyframes) return; // FIXME: Remove comment and fix next line
  // eslint-disable-next-line unicorn/prefer-object-from-entries

  const output = Object.entries(keyframes).reduce((result, [name, frames]) => _extends({}, result, {
    [`@keyframes ${name}`]: frames
  }), {});
  return output;
};
const globalStyles = [globalPreflightStyles, globalKeyframeStyles, globalTransformStyles, globalTouchActionStyles, globalScrollSnapTypeStyles, globalFontVariantNumericStyles, globalRingStyles, globalBoxShadowStyles, globalFilterStyles, globalBackdropStyles];

const getGlobalConfig = config => {
  const usedConfig = config.global && config || userPresets[config.preset] || userPresets.emotion;
  return usedConfig.global;
};

const addGlobalStylesImport = ({
  program,
  t,
  identifier,
  config
}) => {
  const globalConfig = getGlobalConfig(config);
  return addImport({
    types: t,
    program,
    identifier,
    name: globalConfig.import,
    mod: globalConfig.from
  });
};

const getGlobalDeclarationTte = ({
  t,
  stylesUid,
  globalUid,
  styles
}) => t.variableDeclaration('const', [t.variableDeclarator(globalUid, generateTaggedTemplateExpression({
  t,
  identifier: stylesUid,
  styles
}))]);

const getGlobalDeclarationProperty = props => {
  const {
    t,
    stylesUid,
    globalUid,
    state,
    styles
  } = props;
  const ttExpression = generateTaggedTemplateExpression({
    t,
    identifier: state.cssIdentifier,
    styles
  });
  const openingElement = t.jsxOpeningElement(t.jsxIdentifier(stylesUid.name), [t.jsxAttribute(t.jsxIdentifier('styles'), t.jsxExpressionContainer(ttExpression))], true);
  const closingElement = t.jsxClosingElement(t.jsxIdentifier('close'));
  const arrowFunctionExpression = t.arrowFunctionExpression([], t.jsxElement(openingElement, closingElement, [], true));
  const code = t.variableDeclaration('const', [t.variableDeclarator(globalUid, arrowFunctionExpression)]);
  return code;
};

const kebabize = string => string.replace(/([\da-z]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();

const convertCssObjectToString = cssObject => {
  if (!cssObject) return;
  return Object.entries(cssObject).map(([k, v]) => typeof v === 'string' ? `${kebabize(k)}: ${v};` : `${k} {
${convertCssObjectToString(v)}
        }`).join('\n');
}; // Trim out classes defined within the selector


const filterClassSelectors = ruleset => {
  if (isEmpty$1(ruleset)) return;
  return Object.entries(ruleset).reduce((result, [selector, value]) => {
    // Trim out the classes defined within the selector
    // Classes added using addBase have already been grabbed so they get filtered to avoid duplication
    const filteredSelectorSet = selector.split(',').filter(s => {
      if (isClass(s)) return false; // Remove sub selectors with a class as one of their keys

      const subSelectors = Object.keys(value);
      const hasSubClasses = subSelectors.some(selector => isClass(selector));
      if (hasSubClasses) return false;
      return true;
    }).join(',');
    if (!filteredSelectorSet) return result;
    return _extends({}, result, {
      [filteredSelectorSet]: value
    });
  }, {});
};

const handleGlobalStylesFunction = props => {
  const {
    references
  } = props;
  references.GlobalStyles && handleGlobalStylesJsx(props);
  references.globalStyles && handleGlobalStylesVariable(props);
};

const getGlobalStyles = ({
  state
}) => {
  // Create the magic theme function
  const theme = getTheme(state.config.theme); // Filter out classes as they're extracted as usable classes

  const strippedPlugins = filterClassSelectors(state.userPluginData && state.userPluginData.base);
  const resolvedStyles = globalStyles.map(gs => typeof gs === 'function' ? gs({
    theme,
    withAlpha
  }) : gs);
  if (strippedPlugins) resolvedStyles.push(strippedPlugins);
  const styles = resolvedStyles.reduce((result, item) => deepMerge__default["default"](result, item), {});
  return styles;
};

const handleGlobalStylesVariable = ({
  references,
  state
}) => {
  if (references.globalStyles.length === 0) return;
  const styles = getGlobalStyles({
    state
  }); // FIXME: Remove comment and fix next line
  // eslint-disable-next-line unicorn/no-array-for-each

  references.globalStyles.forEach(path => {
    const templateStyles = `(${JSON.stringify(styles)})`; // `template` requires () wrapping

    const convertedStyles = template__default["default"](templateStyles, {
      placeholderPattern: false
    })();
    path.replaceWith(convertedStyles);
  });
};

const handleGlobalStylesJsx = props => {
  const {
    references,
    program,
    t,
    state,
    config
  } = props;
  if (references.GlobalStyles.length === 0) return;
  throwIf(references.GlobalStyles.length > 1, () => logGeneralError('Only one GlobalStyles import can be used'));
  const path = references.GlobalStyles[0];
  const parentPath = path.findParent(x => x.isJSXElement());
  throwIf(!parentPath, () => logGeneralError('GlobalStyles must be added as a JSX element, eg: <GlobalStyles />'));
  const styles = convertCssObjectToString(getGlobalStyles({
    state
  }));
  const globalUid = generateUid('GlobalStyles', program);
  const stylesUid = generateUid('globalImport', program);
  const declarationData = {
    t,
    globalUid,
    stylesUid,
    styles,
    state
  };

  if (state.isStyledComponents) {
    const declaration = getGlobalDeclarationTte(declarationData);
    program.unshiftContainer('body', declaration);
    path.replaceWith(t.jSXIdentifier(globalUid.name));
  }

  if (state.isEmotion) {
    const declaration = getGlobalDeclarationProperty(declarationData);
    program.unshiftContainer('body', declaration);
    path.replaceWith(t.jSXIdentifier(globalUid.name)); // Check if the css import has already been imported
    // https://github.com/ben-rogerson/twin.macro/issues/313

    state.isImportingCss = !state.existingCssIdentifier;
  }

  if (state.isGoober) {
    const declaration = getGlobalDeclarationTte(declarationData);
    program.unshiftContainer('body', declaration);
    path.replaceWith(t.jSXIdentifier(globalUid.name));
  }

  throwIf(state.isStitches, () => logGeneralError('Use the “globalStyles” import with stitches'));
  addGlobalStylesImport({
    identifier: stylesUid,
    t,
    program,
    config
  });
};

const getCorePluginProperties = className => {
  const matches = Object.entries(corePlugins).map(item => {
    const [pluginName, config] = item;
    if (className === pluginName) return item;
    const startsWithPluginName = className.startsWith(String(pluginName) + '-');
    if (!startsWithPluginName) return;
    const supportsFurtherMatching = toArray(config).some(i => Boolean(i.config));
    if (!supportsFurtherMatching) return;
    return item;
  }).filter(Boolean);
  if (matches.length === 0) return {
    isCorePluginClass: false
  };
  const longestMatch = matches.sort((a, b) => a[0].length > b[0].length ? -1 : 1)[0];
  const [corePluginName, coreConfig] = longestMatch;
  return {
    isCorePluginClass: true,
    coreConfig: toArray(coreConfig),
    corePluginName
  };
};

const isEmpty = value => value === undefined || value === null || typeof value === 'object' && Object.keys(value).length === 0 || typeof value === 'string' && value.trim().length === 0;

const getProperties = (className, state, {
  isCsOnly = false
}) => {
  if (!className) return;
  const isShortCss$1 = isShortCss(className);
  if (isCsOnly || isShortCss$1) return {
    hasMatches: isShortCss$1,
    type: 'shortCss'
  };
  if (isArbitraryCss(className)) return {
    hasMatches: true,
    type: 'arbitraryCss'
  };
  const {
    isCorePluginClass,
    coreConfig,
    corePluginName
  } = getCorePluginProperties(className);
  return {
    type: isCorePluginClass && 'dynamic',
    hasMatches: Boolean(isCorePluginClass),
    hasUserPlugins: !isEmpty(state.config.plugins),
    coreConfig,
    corePluginName
  };
};

const precheckGroup = ({
  classNameRaw
}) => throwIf(classNameRaw === 'group', () => `\n\n"group" must be added as className:${logBadGood('tw`group`', '<div className="group">')}\nRead more at https://twinredirect.page.link/group\n`);

const precheckPeer = ({
  classNameRaw
}) => throwIf(classNameRaw === 'peer', () => `\n\n"peer" must be added as className:${logBadGood('tw`peer`', '<div className="peer">')}\nRead more at https://twinredirect.page.link/peer\n`);

const joinWithNoDoubleHyphens = arr => arr.join('-').replace(/-+/g, '-');

const preCheckPrefix = ({
  pieces: {
    className,
    hasPrefix
  },
  state
}) => {
  if (isShortCss(className)) return;
  const {
    prefix
  } = state.config;
  if (hasPrefix === Boolean(prefix)) return;
  const classSuggestion = joinWithNoDoubleHyphens([prefix, className]);
  throwIf(!className.startsWith(prefix), () => `\n\n“${className}” should have a prefix:${logBadGood(className, classSuggestion)}`);
};

const preCheckNoHyphenSuffix = ({
  pieces: {
    className,
    classNameRaw
  }
}) => {
  if (isShortCss(className)) return;
  throwIf(classNameRaw.endsWith('-'), () => logBadGood(`“${className}” should not have a '-' suffix`, `Change it to “${className.replace(/-*$/, '')}”`));
};

const doPrechecks = (prechecks, context) => {
  for (const precheck of prechecks) {
    precheck(context);
  }
};

var precheckExports = {
  __proto__: null,
  'default': doPrechecks,
  precheckGroup: precheckGroup,
  precheckPeer: precheckPeer,
  preCheckPrefix: preCheckPrefix,
  preCheckNoHyphenSuffix: preCheckNoHyphenSuffix
};

// Tim Sort provides accurate sorting in node < 11

const compareBackdropProperty = (a, b) => {
  // The order of grid properties matter when combined into a single object
  // So here we move backdrop-filter to the beginning to avoid being trumped
  // https://github.com/ben-rogerson/twin.macro/issues/363
  const A = /(^|:)backdrop-filter/.test(a) ? -1 : 0;
  const B = /(^|:)backdrop-filter/.test(b) ? -1 : 0;
  return A - B;
};

const orderBackdropProperty = className => {
  const classNames = className.match(/\S+/g) || [];
  timSort__default["default"].sort(classNames, compareBackdropProperty);
  return classNames.join(' ');
};

const compareBgOpacityProperty = (a, b) => {
  // The order of bg-opacity matters when combined into a single object
  // So we move bg-opacity-xxx to the end to avoid being trumped by the bg color
  const A = /(^|:)bg-opacity-/.test(a) ? 0 : -1;
  const B = /(^|:)bg-opacity-/.test(b) ? 0 : -1;
  return A - B;
};

const orderBgOpacityProperty = className => {
  const classNames = className.match(/\S+/g) || [];
  timSort__default["default"].sort(classNames, compareBgOpacityProperty);
  return classNames.join(' ');
};

const compareFilterProperty = (a, b) => {
  // The order of grid properties matter when combined into a single object
  // So here we move filter to the beginning to avoid being trumped
  // https://github.com/ben-rogerson/twin.macro/issues/363
  const A = /(^|:)filter/.test(a) ? -1 : 0;
  const B = /(^|:)filter/.test(b) ? -1 : 0;
  return A - B;
};

const orderFilterProperty = className => {
  const classNames = className.match(/\S+/g) || [];
  timSort__default["default"].sort(classNames, compareFilterProperty);
  return classNames.join(' ');
};

const compareGridProperty = (a, b) => {
  // The order of grid properties matter when combined into a single object
  // So here we move col-span-x to the beginning to avoid being trumped
  // https://github.com/ben-rogerson/twin.macro/issues/363
  const A = /(^|:)col-span-/.test(a) ? -1 : 0;
  const B = /(^|:)col-span-/.test(b) ? -1 : 0;
  return A - B;
};

const orderGridProperty = className => {
  const classNames = className.match(/\S+/g) || [];
  timSort__default["default"].sort(classNames, compareGridProperty);
  return classNames.join(' ');
};

const compareOrderRingProperty = (a, b) => {
  // The order of ring properties matter when combined into a single object
  // So here we move ring-opacity-xxx to the end to avoid being trumped
  // https://github.com/ben-rogerson/twin.macro/issues/374
  const A = /(^|:)ring-opacity-/.test(a) ? 0 : -1;
  const B = /(^|:)ring-opacity-/.test(b) ? 0 : -1;
  return A - B;
};

const orderRingProperty = className => {
  const classNames = className.match(/\S+/g) || [];
  timSort__default["default"].sort(classNames, compareOrderRingProperty);
  return classNames.join(' ');
};

const compareTransformProperty = (a, b) => {
  // The order of transform properties matter when combined into a single object
  // So here we move transform to the beginning to avoid being trumped
  // https://github.com/ben-rogerson/twin.macro/issues/363
  const A = /(^|:)transform(!|$)/.test(a) ? -1 : 0;
  const B = /(^|:)transform(!|$)/.test(b) ? -1 : 0;
  return A - B;
};

const orderTransformProperty = className => {
  const classNames = className.match(/\S+/g) || [];
  timSort__default["default"].sort(classNames, compareTransformProperty);
  return classNames.join(' ');
};

const compareTransition = (a, b) => {
  // The order of transition properties matter when combined into a single object
  // So here we move transition-x to the beginning to avoid being trumped
  // https://github.com/ben-rogerson/twin.macro/issues/363
  const A = /(^|:)transition(!|$)/.test(a) ? -1 : 0;
  const B = /(^|:)transition(!|$)/.test(b) ? -1 : 0;
  return A - B;
};

const orderTransitionProperty = className => {
  const classNames = className.match(/\S+/g) || [];
  timSort__default["default"].sort(classNames, compareTransition);
  return classNames.join(' ');
};

const orderByScreens = (className, state) => {
  const classNames = className.match(/\S+/g) || [];
  const screens = Object.keys(state.config.theme.screens);

  const screenCompare = (a, b) => {
    const A = a.includes(':') ? a.split(':')[0] : a;
    const B = b.includes(':') ? b.split(':')[0] : b;
    return screens.indexOf(A) < screens.indexOf(B) ? -1 : 1;
  };

  timSort__default["default"].sort(classNames, screenCompare);
  return classNames;
};

var ordering = {
  __proto__: null,
  orderBackdropProperty: orderBackdropProperty,
  orderBgOpacityProperty: orderBgOpacityProperty,
  orderFilterProperty: orderFilterProperty,
  orderGridProperty: orderGridProperty,
  orderRingProperty: orderRingProperty,
  orderTransformProperty: orderTransformProperty,
  orderTransitionProperty: orderTransitionProperty,
  orderByScreens: orderByScreens
};

const stringifyScreen = (config, screenName) => {
  const screen = get__default["default"](config, ['theme', 'screens', screenName]);

  if (typeof screen === 'undefined') {
    throw new Error(`Couldn’t find Tailwind the screen "${screenName}" in the Tailwind config`);
  }

  if (typeof screen === 'string') return `@media (min-width: ${screen})`;

  if (typeof screen.raw === 'string') {
    return `@media ${screen.raw}`;
  }

  const string = toArray(screen).map(range => [typeof range.min === 'string' ? `(min-width: ${range.min})` : null, typeof range.max === 'string' ? `(max-width: ${range.max})` : null].filter(Boolean).join(' and ')).join(', ');
  return string ? `@media ${string}` : '';
};

const variantDarkMode = ({
  hasGroupVariant,
  config,
  errorCustom
}) => {
  const styles = {
    // Media strategy: The default when you prepend with dark, tw`dark:block`
    media: '@media (prefers-color-scheme: dark)',
    // Class strategy: In your tailwind.config.js, add `{ dark: 'class' }
    // then add a `className="dark"` on a parent element.
    class: !hasGroupVariant && '.dark &'
  }[config('darkMode') || 'media'] || null;

  if (!styles && !hasGroupVariant) {
    errorCustom("The `darkMode` config option must be either `{ darkMode: 'media' }` (default) or `{ darkMode: 'class' }`");
  }

  return styles;
};

const variantLightMode = ({
  hasGroupVariant,
  config,
  errorCustom
}) => {
  const styles = {
    // Media strategy: The default when you prepend with light, tw`light:block`
    media: '@media (prefers-color-scheme: light)',
    // Class strategy: In your tailwind.config.js, add `{ light: 'class' }
    // then add a `className="light"` on a parent element.
    class: !hasGroupVariant && '.light &'
  }[config('lightMode') || config('darkMode') || 'media'] || null;

  if (!styles && !hasGroupVariant) {
    if (config('lightMode')) {
      errorCustom("The `lightMode` config option must be either `{ lightMode: 'media' }` (default) or `{ lightMode: 'class' }`");
    }

    errorCustom("The `darkMode` config option must be either `{ darkMode: 'media' }` (default) or `{ darkMode: 'class' }`");
  }

  return styles;
};

const prefixDarkLightModeClass = (className, {
  hasDarkVariant,
  hasLightVariant,
  config
}) => {
  const themeVariant = hasDarkVariant && config('darkMode') === 'class' && ['dark ', 'dark'] || hasLightVariant && (config('lightMode') === 'class' || config('darkMode') === 'class') && ['light ', 'light'];
  if (!themeVariant) return className;
  return themeVariant.map(v => className.split(', ').map(cn => `.${v}${cn}`).join(', ')).join(', ');
};

const _excluded$1 = ["variants", "state"];

const createPeer = selector => {
  const selectors = toArray(selector);
  return selectors.map(s => `.peer:${s} ~ &`).join(', ');
};

const fullVariantConfig = variantConfig({
  variantDarkMode,
  variantLightMode,
  prefixDarkLightModeClass,
  createPeer
});

const getVariants = _ref => {
  let {
    variants,
    state
  } = _ref,
      rest = _objectWithoutPropertiesLoose(_ref, _excluded$1);

  if (!variants) return [];
  const screens = get__default["default"](state.config, ['theme', 'screens']);
  const screenNames = Object.keys(screens);
  return variants.map(variant => {
    const isResponsive = screenNames && screenNames.includes(variant);
    if (isResponsive) return stringifyScreen(state.config, variant);
    let foundVariant = fullVariantConfig[variant];

    if (!foundVariant) {
      const arbitraryVariant = variant.match(/^\[(.+)]/);
      if (arbitraryVariant) foundVariant = arbitraryVariant[1];
    }

    if (!foundVariant) {
      if (variant === 'only-child') {
        throw new babelPluginMacros.MacroError(logGeneralError('The "only-child:" variant was deprecated in favor of "only:"'));
      }

      if (variant === 'not-only-child') {
        throw new babelPluginMacros.MacroError(logGeneralError('The "not-only-child:" variant was deprecated in favor of "not-only:"'));
      }

      const validVariants = _extends({}, screenNames.length > 0 && {
        'Screen breakpoints': screenNames
      }, {
        'Built-in variants': Object.keys(fullVariantConfig)
      });

      throw new babelPluginMacros.MacroError(logNoVariant(variant, validVariants));
    }

    if (typeof foundVariant === 'function') {
      const context = _extends({}, rest, {
        config: item => state.config[item] || null,

        errorCustom(message) {
          throw new babelPluginMacros.MacroError(logGeneralError(message));
        }

      });

      foundVariant = foundVariant(context);
    }

    return foundVariant;
  }).filter(Boolean);
};
/**
 * Split the variant(s) from the className
 */


const splitVariants = ({
  classNameRaw,
  state
}) => {
  const variantsList = [];
  let variant;
  let className = classNameRaw;

  while (variant !== null) {
    // Match arbitrary variants
    variant = className.match(/^([\d<>_a-z-]+):|^\[.*?]:/);

    if (variant) {
      className = className.slice(variant[0].length);
      variantsList.push(replaceSpaceId(variant[0].slice(0, -1)));
    }
  } // dark: and light: variants
  // FIXME: Remove comment and fix next line
  // eslint-disable-next-line unicorn/prefer-includes


  const hasDarkVariant = variantsList.some(v => v === 'dark'); // FIXME: Remove comment and fix next line
  // eslint-disable-next-line unicorn/prefer-includes

  const hasLightVariant = variantsList.some(v => v === 'light');

  if (hasDarkVariant && hasLightVariant) {
    throw new babelPluginMacros.MacroError(logGeneralError('The light: and dark: variants can’t be used on the same element'));
  }

  const hasGroupVariant = variantsList.some(v => v.startsWith('group-')); // Match the filtered variants

  const variants = getVariants({
    variants: variantsList,
    state,
    hasDarkVariant,
    hasLightVariant,
    hasGroupVariant
  });
  const hasVariants = variants.length > 0;
  className = replaceSpaceId(className);
  return {
    classNameRawNoVariants: className,
    className,
    variants,
    hasVariants,
    hasVariantVisited: variants.includes(':visited')
  };
};

const splitPrefix = props => {
  const {
    className,
    state
  } = props;
  const {
    prefix
  } = state.config;
  if (!prefix) return {
    className,
    hasPrefix: false
  };
  if (!className.startsWith(prefix)) return {
    className,
    hasPrefix: false
  };
  const newClassName = className.slice(prefix.length);
  return {
    className: newClassName,
    hasPrefix: true
  };
};
/**
 * Split the negative from the className
 */


const splitNegative = ({
  className
}) => {
  const hasNegative = !isShortCss(className) && className.slice(0, 1) === '-';
  if (hasNegative) className = className.slice(1, className.length);
  const negative = hasNegative ? '-' : '';
  return {
    className,
    hasNegative,
    negative
  };
};
/**
 * Split the important from the className
 */


const splitImportant = ({
  className
}) => {
  const hasPrefix = className.slice(0, 1) === '!';
  const hasSuffix = className.slice(-1) === '!';
  const hasImportant = hasSuffix || hasPrefix;
  if (hasImportant) className = hasSuffix ? className.slice(0, -1) : className.slice(1);
  const important = hasImportant ? ' !important' : '';
  return {
    className,
    hasImportant,
    important
  };
};

const getAlphaValue = alpha => Number.isInteger(Number(alpha)) ? Number(alpha) / 100 : alpha;

const getLastSlashIndex = className => {
  const match = className.match(/\/(?![^[]*])/g);
  if (!match) return -1;
  const lastSlashIndex = className.lastIndexOf(match[match.length - 1]);
  return lastSlashIndex;
}; // Keep after splitImportant


const splitAlpha = props => {
  const {
    className
  } = props;
  const slashIdx = getLastSlashIndex(className);
  throwIf(slashIdx === className.length - 1, () => logGeneralError(`The class “${className}” can’t end with a slash`));
  if (slashIdx === -1) return {
    className,
    classNameNoSlashAlpha: className
  };
  const rawAlpha = className.slice(Number(slashIdx) + 1);
  const hasAlphaArbitrary = Boolean(rawAlpha[0] === '[' && rawAlpha[rawAlpha.length - 1] === ']');
  const hasMatchedAlpha = Boolean(!hasAlphaArbitrary && get__default["default"](props, 'state.config.theme.opacity')[rawAlpha]);
  const hasAlpha = hasAlphaArbitrary || hasMatchedAlpha || false;
  const context = {
    hasAlpha,
    hasAlphaArbitrary
  };
  if (!hasAlpha) return _extends({}, context, {
    classNameNoSlashAlpha: className
  });
  if (hasAlphaArbitrary) return _extends({}, context, {
    alpha: formatProp(rawAlpha.slice(1, -1)),
    classNameNoSlashAlpha: className.slice(0, slashIdx)
  }); // Opacity value has been matched in the config

  return _extends({}, context, {
    alpha: String(getAlphaValue(rawAlpha)),
    classNameNoSlashAlpha: className.slice(0, slashIdx)
  });
};

var pieces = {
  __proto__: null,
  splitVariants: splitVariants,
  splitPrefix: splitPrefix,
  splitImportant: splitImportant,
  splitNegative: splitNegative,
  splitAlpha: splitAlpha
};

const addContentClass = (classes, state) => {
  const newClasses = []; // FIXME: Remove comment and fix next line
  // eslint-disable-next-line unicorn/no-array-for-each

  classes.forEach(classSet => {
    const shouldAddContent = /(?!.*:content($|\[))(before:|after:)/.test(classSet);
    if (!shouldAddContent) return newClasses.push(classSet);
    const variants = classSet.split(':').slice(0, -1).join(':'); // Avoid adding content if it's already in the new class list

    if (!newClasses.some(c => c.startsWith(`${variants}:content`))) // Temp fix until emotion supports css variables with the content property
      newClasses.push(`${variants}:content[${state.isEmotion ? '""' : 'var(--tw-content)'}]`);
    newClasses.push(classSet);
  });
  return newClasses;
};

/**
 * Add important to a value
 * Only used for static and dynamic styles - not core plugins
 */

const mergeImportant = (style, hasImportant) => {
  if (!hasImportant) return style; // Bail if the ruleset already has an important

  if (JSON.stringify(style).includes(' !important')) return style;
  return Object.entries(style).reduce((result, item) => {
    const [key, value] = item;
    if (typeof value === 'object') return mergeImportant(value, hasImportant); // Don't add important to css variables

    const newValue = key.startsWith('--') ? value : `${value} !important`;
    return deepMerge__default["default"](result, {
      [key]: newValue
    });
  }, {});
};

const transformImportant = ({
  style,
  pieces: {
    hasImportant
  }
}) => mergeImportant(style, hasImportant);

const applyTransforms = context => {
  if (!context.style) return;
  return transformImportant(context);
};

const getPeerValueFromVariant = variant => get__default["default"](/\.peer:(.+) ~ &/.exec(variant), '1');
/**
 * Combine peers when they are used in succession
 */


const combinePeers = ({
  variants
}) => variants.map((_, i) => {
  let isPeer = false;
  let index = i;
  let returnVariant;
  const peerList = [];

  do {
    const peer = getPeerValueFromVariant(variants[index]);
    isPeer = Boolean(peer);

    if (isPeer) {
      peerList.push(peer);
      variants[index] = null;
      index = index + 1;
    } else {
      returnVariant = peerList.length === 0 ? variants[index] : `.peer:${peerList.join(':')} ~ &`;
    }
  } while (isPeer);

  return returnVariant;
}).filter(Boolean);

const addSassyPseudo = ({
  variants,
  state
}) => {
  if (!state.configTwin.sassyPseudo) return variants;
  return variants.map(v => v.replace(/(?<= ):|^:/g, '&:'));
};

const formatTasks$2 = [combinePeers, addSassyPseudo];

const addVariants = ({
  results,
  style,
  pieces,
  state
}) => {
  let {
    variants,
    hasVariants
  } = pieces;
  if (!hasVariants) return style;

  for (const task of formatTasks$2) {
    variants = task({
      variants,
      state
    });
  }

  let styleWithVariants; // eslint-disable-next-line prefer-const

  styleWithVariants = cleanSet__default["default"](results, variants, _extends({}, get__default["default"](styleWithVariants, variants, {}), style));
  return styleWithVariants;
};

function findRightBracket(classes, start = 0, end = classes.length, brackets = ['(', ')']) {
  let stack = 0;

  for (let index = start; index < end; index++) {
    if (classes[index] === brackets[0]) {
      stack += 1;
    } else if (classes[index] === brackets[1]) {
      if (stack === 0) return;
      if (stack === 1) return index;
      stack -= 1;
    }
  }
}

const sliceToSpace = str => {
  const spaceIndex = str.indexOf(' ');
  if (spaceIndex === -1) return str;
  return str.slice(0, spaceIndex);
}; // eslint-disable-next-line max-params


function spreadVariantGroups(classes, context = '', importantContext = false, start = 0, end) {
  if (classes === '') return [];
  const results = [];
  classes = classes.slice(start, end).trim(); // variant / class / group

  const reg = /(\[.*?]:|[\w-<>]+:)|([\w-./[\]]+!?)|\(|(\S+)/g;
  let match;
  const baseContext = context;

  while (match = reg.exec(classes)) {
    const [, variant, className, weird] = match;

    if (variant) {
      // Replace arbitrary variant spaces with a placeholder to avoid incorrect splitting
      const spaceReplacedVariant = variant.replace(/\s+/g, SPACE_ID);
      context += spaceReplacedVariant; // Skip empty classes

      if (/\s/.test(classes[reg.lastIndex])) {
        context = baseContext;
        continue;
      }

      if (classes[reg.lastIndex] === '(') {
        const closeBracket = findRightBracket(classes, reg.lastIndex);
        throwIf(typeof closeBracket !== 'number', () => logGeneralError(`An ending bracket ')' wasn’t found for these classes:\n\n${classes}`));
        const importantGroup = classes[closeBracket + 1] === '!';
        results.push(...spreadVariantGroups(classes, context, importantContext || importantGroup, reg.lastIndex + 1, closeBracket));
        reg.lastIndex = closeBracket + (importantGroup ? 2 : 1);
        context = baseContext;
      }
    } else if (className && className.includes('[')) {
      const closeBracket = findRightBracket(classes, match.index, classes.length, ['[', ']']);
      throwIf(typeof closeBracket !== 'number', () => logGeneralError(`An ending bracket ']' wasn’t found for these classes:\n\n${classes}`));
      const importantGroup = classes[closeBracket + 1] === '!';
      const cssClass = classes.slice(match.index, closeBracket + 1);
      const hasSlashOpacity = classes.slice(closeBracket + 1, closeBracket + 2) === '/';
      const opacityValue = hasSlashOpacity ? sliceToSpace(classes.slice(closeBracket + 1)) : ''; // Convert spaces in classes to a temporary string so the css won't be
      // split into multiple classes

      const spaceReplacedClass = cssClass // Normalise the spacing - single spaces only
      // Replace spaces with the space id stand-in
      // Remove newlines within the brackets to allow multiline values
      .replace(/\s+/g, SPACE_ID);
      results.push(context + spaceReplacedClass + opacityValue + (importantGroup || importantContext ? '!' : ''));
      reg.lastIndex = closeBracket + (importantGroup ? 2 : 1) + opacityValue.length;
      context = baseContext;
    } else if (className) {
      const tail = !className.endsWith('!') && importantContext ? '!' : '';
      results.push(context + className + tail);
      context = baseContext;
    } else if (weird) {
      results.push(context + weird);
    } else {
      const closeBracket = findRightBracket(classes, match.index);
      throwIf(typeof closeBracket !== 'number', () => logGeneralError(`An ending bracket ')' wasn’t found for these classes:\n\n${classes}`));
      const importantGroup = classes[closeBracket + 1] === '!';
      results.push(...spreadVariantGroups(classes, context, importantContext || importantGroup, match.index + 1, closeBracket));
      reg.lastIndex = closeBracket + (importantGroup ? 2 : 1);
    }
  }

  return results;
}

const handleVariantGroups = classes => spreadVariantGroups(classes).join(' ');

const defaultBoxShadow = [`var(--tw-ring-offset-shadow, 0 0 #0000)`, `var(--tw-ring-shadow, 0 0 #0000)`, `var(--tw-shadow)`].join(', ');

const makeBoxShadow = (value, important) => {
  const ast = parseBoxShadowValue.parseBoxShadowValue(value);

  for (const shadow of ast) {
    // Don't override color if the whole shadow is a variable
    if (!shadow.valid) {
      continue;
    }

    shadow.color = 'var(--tw-shadow-color)';
  }

  return {
    '--tw-shadow': value === 'none' ? '0 0 #0000' : value,
    '--tw-shadow-colored': value === 'none' ? '0 0 #0000' : parseBoxShadowValue.formatBoxShadowValue(ast),
    boxShadow: `${defaultBoxShadow}${important}`
  };
};

const coercedTypeMap = {
  any: ({
    output,
    value
  }) => output(value),

  color({
    config,
    value,
    pieces,
    forceReturn
  }) {
    const {
      property,
      variable
    } = config;
    if (typeof config.output === 'function') return config.output(value, {
      withAlpha: toAlpha({
        pieces,
        property,
        variable
      })
    });
    if (!forceReturn && typeof value === 'string' && !dataTypes.color(value) && !isSpaceSeparatedColor(value)) return;
    const properties = toArray(property);
    let result = properties.map(p => typeof value === 'string' && value.startsWith('var(') ? null : toAlpha({
      pieces,
      variable,
      property: p
    })(value, pieces.alpha)).filter(Boolean);
    if (result.length === 0) result = properties.map(p => ({
      [p]: `${value}${pieces.important}`
    })); // @ts-expect-error TODO: Investigate TS error

    return deepMerge__default["default"](...result);
  },

  'line-width'({
    config,
    value,
    theme,
    output,
    forceReturn
  }) {
    if (!forceReturn && typeof value === 'string' && !dataTypes.lineWidth(value) && !value.startsWith('var(')) return;
    if (typeof config === 'function') return config(value, theme);
    return output(value);
  },

  length({
    config,
    value,
    theme,
    forceReturn,
    output
  }) {
    if (!forceReturn && typeof value === 'string' && !dataTypes.length(value) && !value.startsWith('var(')) return;
    if (typeof config === 'function') return config(value, theme);
    const {
      variable
    } = config;
    return _extends({}, variable && {
      [variable]: '0'
    }, output(variable ? `calc(${value} * var(${variable}))` : value));
  },

  number({
    output,
    value,
    forceReturn
  }) {
    if (!forceReturn && !dataTypes.number(value)) return;
    return output(value);
  },

  'absolute-size'({
    output,
    value,
    forceReturn
  }) {
    if (!forceReturn && !dataTypes.absoluteSize(value)) return;
    return output(value);
  },

  'relative-size'({
    output,
    value,
    forceReturn
  }) {
    if (!forceReturn && !dataTypes.relativeSize(value)) return;
    return output(value);
  },

  percentage({
    output,
    value,
    forceReturn
  }) {
    if (!forceReturn && !dataTypes.percentage(value)) return;
    return output(value);
  },

  image({
    output,
    value,
    forceReturn
  }) {
    if (typeof value !== 'string') return;
    if (!forceReturn && !dataTypes.image(value)) return;
    return output(value);
  },

  url({
    output,
    value,
    forceReturn
  }) {
    if (typeof value !== 'string') return;
    if (!forceReturn && !dataTypes.url(value) && !value.startsWith('var(')) return;
    return output(value);
  },

  position({
    output,
    value,
    forceReturn
  }) {
    if (!forceReturn && !dataTypes.position(value)) return;
    return output(value);
  },

  shadow({
    value,
    pieces,
    forceReturn
  }) {
    if (!forceReturn && !dataTypes.shadow(value)) return;
    return makeBoxShadow(value, pieces.important);
  },

  lookup: ({
    config,
    value,
    theme
  }) => typeof config === 'function' && config(value, theme),

  'generic-name'({
    output,
    value,
    forceReturn
  }) {
    if (typeof value !== 'string') return;
    if (!forceReturn && !dataTypes.genericName(value)) return;
    return output(value);
  },

  'family-name'({
    output,
    value,
    forceReturn
  }) {
    if (typeof value !== 'string') return;
    if (!forceReturn && !dataTypes.familyName(value)) return;
    return output(value);
  }

};

const getTypeCoerced = (customValue, context) => {
  const [explicitType, value] = splitOnFirst(customValue, ':');
  if (value.length === 0) return;
  const coercedConfig = getFlatCoercedConfigByProperty(context.property);
  throwIf(!coercedConfig, () => logNotAllowed(context.pieces.className, `has no type support`, color => `Remove the type: ${color.success(`${context.property}-[${value}]`)}`));
  const coercedTypes = Object.keys(coercedConfig);
  throwIf(!coercedTypes.includes(explicitType), () => logNotAllowed(context.pieces.className, `can’t use “${explicitType}” as a type`, color => {
    const suggestions = Object.entries(coercedConfig).map(([type, config]) => {
      const dash = color.subdued('-');
      return `${dash} ${context.property}-[${color.highlight(type)}:${value}] to use ${color.highlight(config.property)}`;
    });
    if (suggestions.length === 0) return;
    return `Try ${suggestions.length > 1 ? 'one of these' : 'this'}:\n\n${suggestions.join('\n')}`;
  }));
  const config = coercedConfig[explicitType];
  const result = getCoercedValueFromTypeMap(explicitType, {
    config,
    value,
    pieces: context.pieces,
    theme: context.theme,
    forceReturn: true
  }); // Force return defined coerced value as fallback
  // eg: tw`indent-[lookup:10px]`

  if (!result) return {
    [config.property]: value
  };
  return result;
};

const applyStyleToProperty = (property, pieces) => style => {
  const properties = Array.isArray(property) ? property : [property];
  const styleValue = [pieces.negative, style].join('');
  const result = Object.fromEntries(properties.map(p => [p, styleValue]));
  return result;
};

const getCoercedValueFromTypeMap = (type, context) => {
  context.output = applyStyleToProperty(context.config.property, context.pieces);
  let extraStyles;

  if (Array.isArray(context.value)) {
    const [value, ...rest] = context.value;

    if (rest.length === 1 && isObject(rest[0])) {
      extraStyles = rest[0];
      context.value = value;
    } else {
      context.value = context.value.join(', ');
    }
  }

  let result = coercedTypeMap[type](context);
  if (!result) return;
  result = _extends({}, result, extraStyles);
  throwIf(!['color', 'any'].includes(type) && context.pieces.hasAlpha, () => opacityErrorNotFound({
    className: context.pieces.classNameRaw
  }));
  const {
    wrapWith
  } = context.config;
  if (wrapWith) return {
    [wrapWith]: result
  };
  return result;
};

const replaceThemeValue = (value, {
  theme
}) => {
  const match = value.match(/theme\(["']?([^"']+)["']?\)/);
  if (!match) return value;
  const themeFunction = match[0];
  const themeValue = theme(match[1]);
  throwIf(!themeValue, () => logGeneralError(`No theme value found for “${match[1]}”`));
  return value.replace(themeFunction, themeValue);
};

const maybeAddNegative = (value, negative) => {
  if (!negative) return value;

  if (typeof value === 'string') {
    if (value.startsWith('-')) return value.slice(1);
    if (value.startsWith('var(')) return `calc(${value} * -1)`;
  }

  if (isNumeric(value)) return `${negative}${value}`;
  return value;
};

const hasSupport = item => getCorePluginsByProperty(item).some(i => supportsArbitraryValues(i));

const sortRatingHighestFirst = (a, b) => b.rating - a.rating;

const getSuggestions = (results, {
  color,
  value
}) => results.filter(r => r.rating > 0.25).sort(sortRatingHighestFirst).slice(0, 5).sort((a, b) => Number(hasSupport(b.target)) - Number(hasSupport(a.target))).map(s => {
  const dash = color.subdued('-');
  return `${dash} ${hasSupport(s.target) ? `${s.target}-[${value}] ${dash} ${color.success('✓ Arbitrary value support')}` : `${s.target} ${dash} ${color.highlight('Static class')}`}`;
});

const getErrorFeedback = (property, value) => {
  const coercedConfig = getFlatCoercedConfigByProperty(property) || {};
  const config = Object.entries(coercedConfig);
  if (config.length > 0) return ['needs a type hint before the value', color => `Specify the type:\n\n${config.map(([pluginName, pluginConfig]) => {
    const dash = color.subdued('-');
    return `${dash} ${property}-[${color.highlight(pluginName)}:${value}] ${dash} ${pluginConfig.property}`;
  }).join('\n')}`];
  return ['was not found', color => {
    const pluginKeys = Object.keys(corePlugins);
    const results = stringSimilarity__default["default"].findBestMatch(property, pluginKeys).ratings;
    const suggestions = getSuggestions(results, {
      color,
      value
    });
    return `Did you mean ${suggestions.length > 1 ? 'one of these' : 'this'}?\n\n${suggestions.join('\n')}`;
  }];
};

const getClassData = className => {
  const [property, value] = splitOnFirst(className, '[');
  return [property.slice(0, -1), // Remove the dash just before the brackets
  value.slice(0, -1).replace(/_/g, ' ').trim() // Remove underscores, the last ']' and whitespace
  ];
};

const getArbitraryStyle = (config, {
  classValue,
  theme,
  pieces,
  property,
  state
}) => {
  if (!supportsArbitraryValues(config)) return; // Type-coerced arbitrary values, eg: text-[length:3px] / text-[color:red]

  const typeCoerced = getTypeCoerced(classValue, {
    theme,
    pieces,
    property
  });
  if (typeCoerced) return typeCoerced;
  if (typeof config.output === 'function') return config.output({
    value: maybeAddNegative(classValue, pieces.negative),
    color: props => withAlpha(props),
    negative: pieces.negative,
    isEmotion: state.isEmotion,
    theme
  }); // Non-coerced class

  if (config.coerced === undefined) {
    const value = maybeAddNegative(classValue, pieces.negative);
    return Array.isArray(config.property) ? // eslint-disable-next-line unicorn/prefer-object-from-entries
    config.property.reduce((result, p) => _extends({}, result, {
      [p]: value
    }), {}) : {
      [config.property]: value
    };
  }

  if (!isObject(config.coerced)) return; // Arbitrary value matched with array of coerced types

  const [coercedConfigResult] = getFirstValue(Object.entries(config.coerced), ([type, coercedConfig]) => getCoercedValueFromTypeMap(type, {
    config: coercedConfig,
    value: classValue,
    pieces,
    theme
  }));
  return coercedConfigResult;
};

var handleArbitraryCss = (props => {
  const [property, value] = getClassData(props.pieces.classNameNoSlashAlpha); // Replace theme values, eg: `bg-[theme(color.red.500)]`

  const classValue = replaceThemeValue(value, {
    theme: props.theme
  });
  const config = getCorePluginsByProperty(property);
  const [result, configUsed] = getFirstValue(config, p => getArbitraryStyle(p, _extends({}, props, {
    property,
    classValue
  })));
  throwIf(!result, () => logNotAllowed(props.pieces.classNameRawNoVariants, ...getErrorFeedback(property, classValue)));
  throwIf(props.pieces.hasNegative && !configUsed.supportsNegativeValues, () => logBadGood(`“${props.pieces.classNameRaw}” doesn’t support a negative prefix`, `Apply the negative to the arbitrary value, eg: “${property}-[-5]”`));
  return result;
});

var handleShortCss = (({
  className,
  theme
}) => {
  let [property, value] = splitOnFirst(className, '[');
  property = property.startsWith('--') && property || // Retain css variables
  camelize(property); // Remove the last ']' and whitespace

  value = value.slice(0, -1).trim();
  throwIf(!property, () => logBadGood(`“[${value}]” is missing the css property before the square brackets`, `Write it like this: marginTop[${value || '5rem'}]`));
  const themeReplacedValue = replaceThemeValue(value, {
    theme
  });
  return {
    [property]: themeReplacedValue
  };
});

const normalizeValue = value => {
  if (['string', 'function'].includes(typeof value) || Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  logGeneralError(`The config value "${JSON.stringify(value)}" is unsupported - try a string, function, array, or number`);
};

const splitAtDash = (twClass, fromEnd = 1) => {
  const splitClass = twClass.split('-');
  return {
    firstPart: splitClass.slice(0, fromEnd * -1).join('-'),
    lastPart: splitClass.slice(fromEnd * -1).join('-')
  };
};
/**
 * Searches the tailwindConfig
 */


const getConfigValue = (from, matcher) => {
  const matchArray = toArray(matcher);
  const [result] = getFirstValue(matchArray, match => getValueFromConfig(from, match));
  return result;
};

const getValueFromConfig = (from, matcher) => {
  if (!from) return; // Match default value from current object

  if (isEmpty$1(matcher)) {
    if (isEmpty$1(from.DEFAULT)) return;
    return normalizeValue(from.DEFAULT);
  } // Match exact


  const match = from[matcher];
  if (Array.isArray(match)) return normalizeValue(match);
  if (['string', 'number', 'function'].includes(typeof match) || Array.isArray(match)) return normalizeValue(match); // Match a default value from child object

  const defaultMatch = typeof match === 'object' && match.DEFAULT;
  if (defaultMatch) return normalizeValue(defaultMatch);
  const [result] = getFirstValue(matcher.split('-'), (_, {
    index
  }) => {
    const {
      firstPart,
      lastPart
    } = splitAtDash(matcher, Number(index) + 1);
    const objectMatch = from[firstPart];
    if (objectMatch && typeof objectMatch === 'object') return getConfigValue(objectMatch, lastPart);
  });
  return result;
};

const getDynamicStyle = (config, {
  classValue,
  theme,
  pieces
}) => {
  // Array values loop over cooerced object - { coerced: { color: () => {}, length () => {} } }
  if (config.coerced) {
    const coerced = ([type, config], forceReturn) => getCoercedValueFromTypeMap(type, {
      value: classValue,
      config,
      pieces,
      theme,
      forceReturn
    });

    const [result] = getFirstValue(Object.entries(config.coerced), (type, {
      isLast
    }) => coerced(type, isLast));
    return result;
  }

  const value = Array.isArray(classValue) ? classValue.join(', ') : maybeAddNegative(maybeAddAlpha(classValue, {
    pieces
  }), pieces.negative);
  return Array.isArray(config.property) ? // FIXME: Remove comment and fix next line
  // eslint-disable-next-line unicorn/prefer-object-from-entries
  config.property.reduce((result, p) => _extends({}, result, {
    [p]: value
  }), {}) : {
    [config.property]: value
  };
};

var handleDynamic = (props => {
  const {
    theme,
    pieces,
    state,
    corePluginName,
    coreConfig
  } = props;
  const {
    classNameRaw,
    className,
    classNameNoSlashAlpha
  } = pieces;
  const configSearch = [className.slice(Number(corePluginName.length) + 1)]; // eg: names including a slash, eg: h-1/5

  if (className !== classNameNoSlashAlpha) configSearch.push(classNameNoSlashAlpha.slice(Number(corePluginName.length) + 1));
  const [result, configUsed] = getFirstValue(coreConfig, c => {
    const isStaticOutput = corePluginName === pieces.className && isObject(c.output);
    if (isStaticOutput) return c.output;
    const config = c.config && theme(c.config);
    const classValue = config && getConfigValue(config, configSearch);
    if (config && !classValue) return; // { property: value } determined via a function (eg: 'container')

    if (typeof c.output === 'function') return c.output({
      value: maybeAddNegative(classValue, pieces.negative),
      isEmotion: state.isEmotion,
      theme,
      pieces
    });
    if (c.output) return;
    return getDynamicStyle(c, _extends({}, props, {
      classValue
    }));
  });
  throwIf(!result || className.endsWith('-'), () => errorSuggestions({
    pieces,
    state,
    config: coreConfig.map(item => item.config).filter(Boolean),
    corePluginName
  }));
  throwIf(pieces.hasNegative && !configUsed.supportsNegativeValues, () => logBadGood(`“${classNameRaw}” doesn’t support a negative prefix`, [`Remove the negative prefix`, supportsArbitraryValues(corePluginName) && `apply an arbitrary value, eg: “${corePluginName}-[-5]” or “-${corePluginName}-[5]”`].filter(Boolean).join(' or ')));
  throwIf(pieces.hasImportant && configUsed.supportsImportant === false, () => logBadGood(`“${classNameRaw}” doesn’t support the important modifier`, 'Remove the bang (!) from the class'));
  return result;
});

const mergeChecks = [// Match exact selector
({
  key,
  className
}) => key === `${className}`, // Match class selector (inc dot)
({
  key,
  className
}) => !key.includes('{{') && key.match(new RegExp(`(?:^|>|~|\\+|\\*| )\\.${className}(?: |>|~|\\+|\\*|:|$)`, 'g')), // Match parent selector placeholder
({
  key,
  className
}) => key.includes(`{{${className}}}`), // Match possible symbols after the selector (ex dot)
({
  key,
  className
}) => [' ', ':', '>', '~', '+', '*'].some(suffix => key.startsWith(`${className}${suffix}`))];

const getMatches = ({
  className,
  data,
  sassyPseudo,
  state
}) => Object.entries(data).reduce((result, item) => {
  const [rawKey, value] = item; // Remove the prefix before attempting match

  let {
    className: key
  } = splitPrefix({
    className: rawKey,
    state
  });
  key = key.replace(/\\/g, '');
  const childValue = Object.values(value)[0];
  const hasChildNesting = !Array.isArray(childValue) && typeof childValue === 'object';

  if (hasChildNesting) {
    const matches = getMatches({
      className,
      data: value,
      sassyPseudo,
      state
    });
    if (!isEmpty$1(matches)) return _extends({}, result, {
      [key]: matches
    });
  }

  const shouldMergeValue = mergeChecks.some(item => item({
    key,
    className
  }));

  if (shouldMergeValue) {
    const newKey = formatKey(key, {
      className,
      sassyPseudo
    });
    return newKey ? _extends({}, result, {
      [newKey]: value
    }) : _extends({}, result, value);
  }

  return result;
}, {}); // The key gets formatted with these checks


const formatTasks$1 = [({
  key
}) => key.replace(/\\/g, '').trim(), // Match exact selector
({
  key,
  className
}) => key === `.${className}` ? '' : key, // Replace the parent selector placeholder
({
  key,
  className
}) => {
  const parentSelectorIndex = key.indexOf(`{{${className}}}`);
  const replacement = parentSelectorIndex > 0 ? '&' : '';
  return key.replace(`{{${className}}}`, replacement);
}, // Replace the classname at start of selector (eg: &:hover) (postCSS supplies
// flattened selectors so it looks like .blah:hover at this point)
({
  key,
  className
}) => key.startsWith(`.${className}`) ? key.slice(`.${className}`.length) : key, ({
  key
}) => key.trim(), // Add the parent selector at the start when it has the sassy pseudo enabled
({
  key,
  sassyPseudo
}) => sassyPseudo && key.startsWith(':') ? `&${key}` : key, // Remove the unmatched class wrapping
({
  key
}) => key.replace(/{{/g, '.').replace(/}}/g, '')];

const formatKey = (selector, {
  className,
  sassyPseudo
}) => {
  if (selector === className) return;
  let key = selector;

  for (const task of formatTasks$1) {
    key = task({
      key,
      className,
      sassyPseudo
    });
  }

  return key;
};
/**
 * Split grouped selectors (`.class1, class2 {}`) and filter non-selectors
 * @param {object} data Input object from userPluginData
 * @returns {object} An object containing unpacked selectors
 */


const normalizeUserPluginSelectors = data => Object.entries(data).reduce((result, [selector, value]) => {
  const keys = selector.split(',').filter(s => isMediaQuery(s) ? Object.keys(value).some(selector => isClass(selector)) : isClass(s)) // FIXME: Remove comment and fix next line
  // eslint-disable-next-line unicorn/prefer-object-from-entries
  .reduce((result, property) => _extends({}, result, {
    [property]: value
  }), {});
  return _extends({}, result, keys);
}, {});

var handleUserPlugins = (({
  state: {
    configTwin: {
      sassyPseudo
    },
    userPluginData: {
      base,
      components,
      utilities
    }
  },
  state,
  className
}) => {
  const [result] = getFirstValue([base, components, utilities], rawData => {
    const data = normalizeUserPluginSelectors(rawData);
    const matches = getMatches({
      className,
      data,
      sassyPseudo,
      state
    });
    if (isEmpty$1(matches)) return;
    return matches;
  });
  return result;
});

const _excluded = ["default"];

const getPieces = context => {
  const results = Object.values(pieces).reduce((results, splitter) => _extends({}, results, splitter(results)), context);
  delete results.state;
  return results;
}; // When removing a multiline comment, determine if a space is left or not
// eg: You'd want a space left in this situation: tw`class1/* comment */class2`


const multilineReplaceWith = (match, index, input) => {
  const charBefore = input[index - 1];
  const directPrefixMatch = charBefore && charBefore.match(/\w/);
  const charAfter = input[Number(index) + Number(match.length)];
  const directSuffixMatch = charAfter && charAfter.match(/\w/);
  return directPrefixMatch && directPrefixMatch[0] && directSuffixMatch && directSuffixMatch[0] ? ' ' : '';
};

const formatTasks = [// Strip pipe dividers " | "
classes => classes.replace(/ \| /g, ' '), // Strip multiline comments
classes => classes.replace(/(?<!\/)\/(?!\/)\*[\S\s]*?\*\//g, multilineReplaceWith), // Strip singleline comments
classes => classes.replace(/\/\/.*/g, ''), // Unwrap grouped variants
handleVariantGroups, // Move some properties to the front of the list so they work as expected
...Object.values(ordering), // Add a missing content class for after:/before: variants
addContentClass];
var getStyleData = ((classes, args) => {
  const {
    isCsOnly = false,
    silentMismatches = false,
    t,
    state
  } = args;
  const hasEmptyClasses = [null, 'null', undefined].includes(classes);
  if (silentMismatches && hasEmptyClasses) return;
  throwIf(hasEmptyClasses, () => logGeneralError('Only plain strings can be used with "tw".\nRead more at https://twinredirect.page.link/template-literals'));

  for (const task of formatTasks) {
    classes = task(classes, state);
  }

  const theme = getTheme(state.config.theme);
  const classesMatched = [];
  const classesMismatched = []; // Merge styles into a single css object

  const styles = classes.reduce((results, classNameRaw) => {
    const pieces = getPieces({
      classNameRaw,
      state
    });
    const {
      hasPrefix,
      className,
      hasVariants
    } = pieces; // Avoid prechecks on silent mode as they'll error loudly

    if (!silentMismatches) {
      const {
        default: doPrechecks
      } = precheckExports,
            prechecks = _objectWithoutPropertiesLoose(precheckExports, _excluded);

      const precheckContext = {
        pieces,
        classNameRaw,
        state
      };
      doPrechecks(Object.values(prechecks), precheckContext);
    } // Make sure non-prefixed classNames are ignored


    const {
      prefix
    } = state.config;
    const hasPrefixMismatch = prefix && !hasPrefix && className;

    if (silentMismatches && (!className || hasPrefixMismatch)) {
      classesMismatched.push(classNameRaw);
      return results;
    }

    throwIf(!className, () => hasVariants ? logNotFoundVariant({
      classNameRaw
    }) : logNotFoundClass);
    const {
      hasMatches,
      hasUserPlugins,
      corePluginName,
      coreConfig,
      type
    } = getProperties(className, state, {
      isCsOnly
    });

    if (silentMismatches && !hasMatches && !hasUserPlugins) {
      classesMismatched.push(classNameRaw);
      return results;
    } // Error if short css is used and disabled


    const isShortCssDisabled = state.configTwin.disableShortCss && type === 'shortCss' && !isCsOnly;
    throwIf(isShortCssDisabled, () => logBadGood(`Short css has been disabled in the config so “${classNameRaw}” won’t work${!state.configTwin.disableCsProp ? ' outside the cs prop' : ''}.`, !state.configTwin.disableCsProp ? `Add short css with the cs prop: &lt;div cs="${classNameRaw}" /&gt;` : '')); // Kick off suggestions when no class matches

    throwIf(!hasMatches && !hasUserPlugins, () => errorSuggestions({
      pieces,
      state,
      isCsOnly
    }));
    const styleContext = {
      theme,
      pieces,
      state,
      className,
      classNameRaw,
      corePluginName,
      coreConfig,
      configTwin: state.configTwin
    };
    const styleHandler = {
      shortCss: handleShortCss,
      dynamic: handleDynamic,
      arbitraryCss: handleArbitraryCss,
      userPlugin: handleUserPlugins
    };
    let style;

    if (hasUserPlugins) {
      style = applyTransforms({
        type,
        pieces,
        style: styleHandler.userPlugin(styleContext)
      });
    } // Check again there are no userPlugin matches


    if (silentMismatches && !hasMatches && !style) {
      classesMismatched.push(classNameRaw);
      return results;
    }

    throwIf(!hasMatches && !style, () => errorSuggestions({
      pieces,
      state,
      isCsOnly
    }));
    style = style || applyTransforms({
      pieces,
      style: styleHandler[type](styleContext)
    });
    const result = deepMerge__default["default"](results, addVariants({
      results,
      style,
      pieces,
      state
    }));
    state.debug(debugSuccess(classNameRaw, style));
    classesMatched.push(classNameRaw);
    return result;
  }, {});
  return {
    astStyles: astify(isEmpty$1(styles) ? {} : styles, t),
    mismatched: classesMismatched.join(' '),
    matched: classesMatched.join(' ')
  };
});

const moveTwPropToStyled = props => {
  const {
    jsxPath,
    astStyles
  } = props;
  makeStyledComponent(_extends({}, props, {
    secondArg: astStyles
  })); // Remove the tw attribute

  const tagAttributes = jsxPath.node.attributes;
  const twAttributeIndex = tagAttributes.findIndex(n => n.name && n.name.name === 'tw');
  if (twAttributeIndex < 0) return;
  jsxPath.node.attributes.splice(twAttributeIndex, 1);
};

const mergeIntoCssAttribute = ({
  path,
  astStyles,
  cssAttribute,
  t
}) => {
  if (!cssAttribute) return; // The expression is the value as a NodePath

  const attributeValuePath = cssAttribute.get('value'); // If it's not {} or "", get out of here

  if (!attributeValuePath.isJSXExpressionContainer() && !attributeValuePath.isStringLiteral()) return;
  const existingCssAttribute = attributeValuePath.isStringLiteral() ? attributeValuePath : attributeValuePath.get('expression');
  const attributeNames = getAttributeNames(path);
  const isBeforeCssAttribute = attributeNames.indexOf('tw') - attributeNames.indexOf('css') < 0;

  if (existingCssAttribute.isArrayExpression()) {
    //  The existing css prop is an array, eg: css={[...]}
    isBeforeCssAttribute ? existingCssAttribute.unshiftContainer('elements', astStyles) : existingCssAttribute.pushContainer('elements', astStyles);
  } else {
    // css prop is either:
    // TemplateLiteral
    // <div css={`...`} tw="..." />
    // or an ObjectExpression
    // <div css={{ ... }} tw="..." />
    // or ArrowFunctionExpression/FunctionExpression
    // <div css={() => (...)} tw="..." />
    const existingCssAttributeNode = existingCssAttribute.node; // The existing css prop is an array, eg: css={[...]}

    const styleArray = isBeforeCssAttribute ? [astStyles, existingCssAttributeNode] : [existingCssAttributeNode, astStyles];
    const arrayExpression = t.arrayExpression(styleArray);
    const {
      parent
    } = existingCssAttribute;
    const replacement = parent.type === 'JSXAttribute' ? t.jsxExpressionContainer(arrayExpression) : arrayExpression;
    existingCssAttribute.replaceWith(replacement);
  }
};

const handleTwProperty = ({
  path,
  t,
  program,
  state
}) => {
  if (!path.node || path.node.name.name !== 'tw') return;
  state.hasTwAttribute = true;
  const nodeValue = path.node.value; // Allow tw={"class"}

  const expressionValue = nodeValue.expression && nodeValue.expression.type === 'StringLiteral' && nodeValue.expression.value; // Feedback for unsupported usage

  throwIf(nodeValue.expression && !expressionValue, () => logGeneralError(`Only plain strings can be used with the "tw" prop.\nEg: <div tw="text-black" /> or <div tw={"text-black"} />\nRead more at https://twinredirect.page.link/template-literals`));
  const rawClasses = expressionValue || nodeValue.value || '';
  const {
    astStyles
  } = getStyleData(rawClasses, {
    t,
    state
  });
  const jsxPath = getParentJSX(path);
  const attributes = jsxPath.get('attributes');
  const {
    attribute: cssAttribute
  } = getCssAttributeData(attributes);

  if (state.configTwin.moveTwPropToStyled) {
    moveTwPropToStyled({
      astStyles,
      jsxPath,
      t,
      program,
      state
    });
    addDataTwPropToPath({
      t,
      attributes,
      rawClasses,
      path,
      state
    });
    return;
  }

  if (!cssAttribute) {
    // Replace the tw prop with the css prop
    path.replaceWith(t.jsxAttribute(t.jsxIdentifier('css'), t.jsxExpressionContainer(astStyles)));
    addDataTwPropToPath({
      t,
      attributes,
      rawClasses,
      path,
      state
    });
    return;
  } // Merge tw styles into an existing css prop


  mergeIntoCssAttribute({
    cssAttribute,
    path: jsxPath,
    astStyles,
    t
  });
  path.remove(); // remove the tw prop

  addDataPropToExistingPath({
    t,
    attributes,
    rawClasses,
    path: jsxPath,
    state
  });
};

const handleTwFunction = ({
  references,
  state,
  t
}) => {
  const defaultImportReferences = references.default || references.tw || []; // FIXME: Remove comment and fix next line
  // eslint-disable-next-line unicorn/no-array-for-each

  defaultImportReferences.forEach(path => {
    /**
     * Gotcha: After twin changes a className/tw/cs prop path then the reference
     * becomes stale and needs to be refreshed with crawl()
     */
    const {
      parentPath
    } = path;
    if (!parentPath.isTaggedTemplateExpression()) path.scope.crawl();
    const parent = path.findParent(x => x.isTaggedTemplateExpression());
    if (!parent) return; // Check if the style attribute is being used

    if (!state.configTwin.allowStyleProp) {
      const jsxAttribute = parent.findParent(x => x.isJSXAttribute());
      const attributeName = jsxAttribute && jsxAttribute.get('name').get('name').node;
      throwIf(attributeName === 'style', () => logStylePropertyError);
    }

    const parsed = parseTte({
      path: parent,
      types: t,
      styledIdentifier: state.styledIdentifier,
      state
    });
    if (!parsed) return;
    const rawClasses = parsed.string; // Add tw-prop for css attributes

    const jsxPath = path.findParent(p => p.isJSXOpeningElement());

    if (jsxPath) {
      const attributes = jsxPath.get('attributes');
      const pathData = {
        t,
        attributes,
        rawClasses,
        path: jsxPath,
        state
      };
      addDataPropToExistingPath(pathData);
    }

    const {
      astStyles
    } = getStyleData(rawClasses, {
      t,
      state
    });
    replaceWithLocation(parsed.path, astStyles);
  });
};

/**
 * cs = Short css
 */

const handleCsProperty = ({
  path,
  t,
  state
}) => {
  if (state.configTwin.disableCsProp) return;
  if (!path.node || path.node.name.name !== 'cs') return;
  state.hasCsProp = true;
  const isCsOnly = true;
  const nodeValue = path.node.value; // Allow cs={"property[value]"}

  const expressionValue = nodeValue.expression && nodeValue.expression.type === 'StringLiteral' && nodeValue.expression.value; // Feedback for unsupported usage

  throwIf(nodeValue.expression && !expressionValue, () => logGeneralError(`Only plain strings can be used with the "cs" prop.\nEg: <div cs="maxWidth[30rem]" />\nRead more at https://twinredirect.page.link/cs-classes`));
  const rawClasses = expressionValue || nodeValue.value || '';
  const {
    astStyles
  } = getStyleData(rawClasses, {
    isCsOnly,
    t,
    state
  });
  const jsxPath = getParentJSX(path);
  const attributes = jsxPath.get('attributes');
  const {
    attribute: cssAttribute
  } = getCssAttributeData(attributes);

  if (!cssAttribute) {
    // Replace the tw prop with the css prop
    path.replaceWith(t.jsxAttribute(t.jsxIdentifier('css'), t.jsxExpressionContainer(astStyles))); // TODO: Update the naming of this function

    addDataTwPropToPath({
      t,
      attributes,
      rawClasses,
      path,
      state,
      propName: 'data-cs'
    });
    return;
  } // The expression is the value as a NodePath


  const attributeValuePath = cssAttribute.get('value'); // If it's not {} or "", get out of here

  if (!attributeValuePath.isJSXExpressionContainer() && !attributeValuePath.isStringLiteral()) return;
  const existingCssAttribute = attributeValuePath.isStringLiteral() ? attributeValuePath : attributeValuePath.get('expression');
  const attributeNames = getAttributeNames(jsxPath);
  const isBeforeCssAttribute = attributeNames.indexOf('cs') - attributeNames.indexOf('css') < 0;

  if (existingCssAttribute.isArrayExpression()) {
    //  The existing css prop is an array, eg: css={[...]}
    isBeforeCssAttribute ? existingCssAttribute.unshiftContainer('elements', astStyles) : existingCssAttribute.pushContainer('elements', astStyles);
  } else {
    // css prop is either:
    // TemplateLiteral
    // <div css={`...`} cs="..." />
    // or an ObjectExpression
    // <div css={{ ... }} cs="..." />
    // or ArrowFunctionExpression/FunctionExpression
    // <div css={() => (...)} cs="..." />
    const existingCssAttributeNode = existingCssAttribute.node; // The existing css prop is an array, eg: css={[...]}

    const styleArray = isBeforeCssAttribute ? [astStyles, existingCssAttributeNode] : [existingCssAttributeNode, astStyles];
    const arrayExpression = t.arrayExpression(styleArray);
    const {
      parent
    } = existingCssAttribute;
    const replacement = parent.type === 'JSXAttribute' ? t.jsxExpressionContainer(arrayExpression) : arrayExpression;
    existingCssAttribute.replaceWith(replacement);
  }

  path.remove(); // remove the cs prop

  addDataPropToExistingPath({
    t,
    attributes,
    rawClasses,
    path: jsxPath,
    state,
    propName: 'data-cs'
  });
};

const makeJsxAttribute = ([key, value], t) => t.jsxAttribute(t.jsxIdentifier(key), t.jsxExpressionContainer(value));

const handleClassNameProperty = ({
  path,
  t,
  state
}) => {
  if (!state.configTwin.includeClassNames) return;
  if (path.node.name.name !== 'className') return;
  const nodeValue = path.node.value; // Ignore className if it cannot be resolved

  if (nodeValue.expression) return;
  const rawClasses = nodeValue.value || '';
  if (!rawClasses) return;
  const {
    astStyles,
    mismatched,
    matched
  } = getStyleData(rawClasses, {
    silentMismatches: true,
    t,
    state
  });
  if (!matched) return; // When classes can't be matched we add them back into the className (it exists as a few properties)

  path.node.value.value = mismatched;
  path.node.value.extra.rawValue = mismatched;
  path.node.value.extra.raw = `"${mismatched}"`;
  const jsxPath = getParentJSX(path);
  const attributes = jsxPath.get('attributes');
  const {
    attribute: cssAttribute
  } = getCssAttributeData(attributes);

  if (!cssAttribute) {
    const attribute = makeJsxAttribute(['css', astStyles], t);
    mismatched ? path.insertAfter(attribute) : path.replaceWith(attribute);
    addDataTwPropToPath({
      t,
      attributes,
      rawClasses: matched,
      path,
      state
    });
    return;
  }

  const cssExpression = cssAttribute.get('value').get('expression');
  const attributeNames = getAttributeNames(jsxPath);
  const isBeforeCssAttribute = attributeNames.indexOf('className') - attributeNames.indexOf('css') < 0;

  if (cssExpression.isArrayExpression()) {
    //  The existing css prop is an array, eg: css={[...]}
    isBeforeCssAttribute ? cssExpression.unshiftContainer('elements', astStyles) : cssExpression.pushContainer('elements', astStyles);
  } else {
    // The existing css prop is not an array, eg: css={{ ... }} / css={`...`}
    const existingCssAttribute = cssExpression.node;
    throwIf(!existingCssAttribute, () => logGeneralError(`An empty css prop (css="") isn’t supported alongside the className prop`));
    const styleArray = isBeforeCssAttribute ? [astStyles, existingCssAttribute] : [existingCssAttribute, astStyles];
    cssExpression.replaceWith(t.arrayExpression(styleArray));
  }

  if (!mismatched) path.remove();
  addDataPropToExistingPath({
    t,
    attributes,
    rawClasses: matched,
    path: jsxPath,
    state
  });
};

function dlv(t,e,l,n,r){for(e=e.split?e.split("."):e,n=0;n<e.length;n++)t=t?t[e[n]]:r;return t===r?l:t}

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function createCommonjsModule(fn) {
  var module = { exports: {} };
	return fn(module, module.exports), module.exports;
}

var unesc_1 = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports["default"] = unesc;

// Many thanks for this post which made this migration much easier.
// https://mathiasbynens.be/notes/css-escapes

/**
 * 
 * @param {string} str 
 * @returns {[string, number]|undefined}
 */
function gobbleHex(str) {
  var lower = str.toLowerCase();
  var hex = '';
  var spaceTerminated = false;

  for (var i = 0; i < 6 && lower[i] !== undefined; i++) {
    var code = lower.charCodeAt(i); // check to see if we are dealing with a valid hex char [a-f|0-9]

    var valid = code >= 97 && code <= 102 || code >= 48 && code <= 57; // https://drafts.csswg.org/css-syntax/#consume-escaped-code-point

    spaceTerminated = code === 32;

    if (!valid) {
      break;
    }

    hex += lower[i];
  }

  if (hex.length === 0) {
    return undefined;
  }

  var codePoint = parseInt(hex, 16);
  var isSurrogate = codePoint >= 0xD800 && codePoint <= 0xDFFF; // Add special case for
  // "If this number is zero, or is for a surrogate, or is greater than the maximum allowed code point"
  // https://drafts.csswg.org/css-syntax/#maximum-allowed-code-point

  if (isSurrogate || codePoint === 0x0000 || codePoint > 0x10FFFF) {
    return ["\uFFFD", hex.length + (spaceTerminated ? 1 : 0)];
  }

  return [String.fromCodePoint(codePoint), hex.length + (spaceTerminated ? 1 : 0)];
}

var CONTAINS_ESCAPE = /\\/;

function unesc(str) {
  var needToProcess = CONTAINS_ESCAPE.test(str);

  if (!needToProcess) {
    return str;
  }

  var ret = "";

  for (var i = 0; i < str.length; i++) {
    if (str[i] === "\\") {
      var gobbled = gobbleHex(str.slice(i + 1, i + 7));

      if (gobbled !== undefined) {
        ret += gobbled[0];
        i += gobbled[1];
        continue;
      } // Retain a pair of \\ if double escaped `\\\\`
      // https://github.com/postcss/postcss-selector-parser/commit/268c9a7656fb53f543dc620aa5b73a30ec3ff20e


      if (str[i + 1] === "\\") {
        ret += "\\";
        i++;
        continue;
      } // if \\ is at the end of the string retain it
      // https://github.com/postcss/postcss-selector-parser/commit/01a6b346e3612ce1ab20219acc26abdc259ccefb


      if (str.length === i + 1) {
        ret += str[i];
      }

      continue;
    }

    ret += str[i];
  }

  return ret;
}

module.exports = exports.default;
});

var getProp_1 = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports["default"] = getProp;

function getProp(obj) {
  for (var _len = arguments.length, props = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    props[_key - 1] = arguments[_key];
  }

  while (props.length > 0) {
    var prop = props.shift();

    if (!obj[prop]) {
      return undefined;
    }

    obj = obj[prop];
  }

  return obj;
}

module.exports = exports.default;
});

var ensureObject_1 = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports["default"] = ensureObject;

function ensureObject(obj) {
  for (var _len = arguments.length, props = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    props[_key - 1] = arguments[_key];
  }

  while (props.length > 0) {
    var prop = props.shift();

    if (!obj[prop]) {
      obj[prop] = {};
    }

    obj = obj[prop];
  }
}

module.exports = exports.default;
});

var stripComments_1 = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports["default"] = stripComments;

function stripComments(str) {
  var s = "";
  var commentStart = str.indexOf("/*");
  var lastEnd = 0;

  while (commentStart >= 0) {
    s = s + str.slice(lastEnd, commentStart);
    var commentEnd = str.indexOf("*/", commentStart + 2);

    if (commentEnd < 0) {
      return s;
    }

    lastEnd = commentEnd + 2;
    commentStart = str.indexOf("/*", lastEnd);
  }

  s = s + str.slice(lastEnd);
  return s;
}

module.exports = exports.default;
});

var util = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports.stripComments = exports.ensureObject = exports.getProp = exports.unesc = void 0;

var _unesc = _interopRequireDefault(unesc_1);

exports.unesc = _unesc["default"];

var _getProp = _interopRequireDefault(getProp_1);

exports.getProp = _getProp["default"];

var _ensureObject = _interopRequireDefault(ensureObject_1);

exports.ensureObject = _ensureObject["default"];

var _stripComments = _interopRequireDefault(stripComments_1);

exports.stripComments = _stripComments["default"];

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
});

var node$1 = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports["default"] = void 0;



function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var cloneNode = function cloneNode(obj, parent) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  var cloned = new obj.constructor();

  for (var i in obj) {
    if (!obj.hasOwnProperty(i)) {
      continue;
    }

    var value = obj[i];
    var type = typeof value;

    if (i === 'parent' && type === 'object') {
      if (parent) {
        cloned[i] = parent;
      }
    } else if (value instanceof Array) {
      cloned[i] = value.map(function (j) {
        return cloneNode(j, cloned);
      });
    } else {
      cloned[i] = cloneNode(value, cloned);
    }
  }

  return cloned;
};

var Node = /*#__PURE__*/function () {
  function Node(opts) {
    if (opts === void 0) {
      opts = {};
    }

    Object.assign(this, opts);
    this.spaces = this.spaces || {};
    this.spaces.before = this.spaces.before || '';
    this.spaces.after = this.spaces.after || '';
  }

  var _proto = Node.prototype;

  _proto.remove = function remove() {
    if (this.parent) {
      this.parent.removeChild(this);
    }

    this.parent = undefined;
    return this;
  };

  _proto.replaceWith = function replaceWith() {
    if (this.parent) {
      for (var index in arguments) {
        this.parent.insertBefore(this, arguments[index]);
      }

      this.remove();
    }

    return this;
  };

  _proto.next = function next() {
    return this.parent.at(this.parent.index(this) + 1);
  };

  _proto.prev = function prev() {
    return this.parent.at(this.parent.index(this) - 1);
  };

  _proto.clone = function clone(overrides) {
    if (overrides === void 0) {
      overrides = {};
    }

    var cloned = cloneNode(this);

    for (var name in overrides) {
      cloned[name] = overrides[name];
    }

    return cloned;
  }
  /**
   * Some non-standard syntax doesn't follow normal escaping rules for css.
   * This allows non standard syntax to be appended to an existing property
   * by specifying the escaped value. By specifying the escaped value,
   * illegal characters are allowed to be directly inserted into css output.
   * @param {string} name the property to set
   * @param {any} value the unescaped value of the property
   * @param {string} valueEscaped optional. the escaped value of the property.
   */
  ;

  _proto.appendToPropertyAndEscape = function appendToPropertyAndEscape(name, value, valueEscaped) {
    if (!this.raws) {
      this.raws = {};
    }

    var originalValue = this[name];
    var originalEscaped = this.raws[name];
    this[name] = originalValue + value; // this may trigger a setter that updates raws, so it has to be set first.

    if (originalEscaped || valueEscaped !== value) {
      this.raws[name] = (originalEscaped || originalValue) + valueEscaped;
    } else {
      delete this.raws[name]; // delete any escaped value that was created by the setter.
    }
  }
  /**
   * Some non-standard syntax doesn't follow normal escaping rules for css.
   * This allows the escaped value to be specified directly, allowing illegal
   * characters to be directly inserted into css output.
   * @param {string} name the property to set
   * @param {any} value the unescaped value of the property
   * @param {string} valueEscaped the escaped value of the property.
   */
  ;

  _proto.setPropertyAndEscape = function setPropertyAndEscape(name, value, valueEscaped) {
    if (!this.raws) {
      this.raws = {};
    }

    this[name] = value; // this may trigger a setter that updates raws, so it has to be set first.

    this.raws[name] = valueEscaped;
  }
  /**
   * When you want a value to passed through to CSS directly. This method
   * deletes the corresponding raw value causing the stringifier to fallback
   * to the unescaped value.
   * @param {string} name the property to set.
   * @param {any} value The value that is both escaped and unescaped.
   */
  ;

  _proto.setPropertyWithoutEscape = function setPropertyWithoutEscape(name, value) {
    this[name] = value; // this may trigger a setter that updates raws, so it has to be set first.

    if (this.raws) {
      delete this.raws[name];
    }
  }
  /**
   *
   * @param {number} line The number (starting with 1)
   * @param {number} column The column number (starting with 1)
   */
  ;

  _proto.isAtPosition = function isAtPosition(line, column) {
    if (this.source && this.source.start && this.source.end) {
      if (this.source.start.line > line) {
        return false;
      }

      if (this.source.end.line < line) {
        return false;
      }

      if (this.source.start.line === line && this.source.start.column > column) {
        return false;
      }

      if (this.source.end.line === line && this.source.end.column < column) {
        return false;
      }

      return true;
    }

    return undefined;
  };

  _proto.stringifyProperty = function stringifyProperty(name) {
    return this.raws && this.raws[name] || this[name];
  };

  _proto.valueToString = function valueToString() {
    return String(this.stringifyProperty("value"));
  };

  _proto.toString = function toString() {
    return [this.rawSpaceBefore, this.valueToString(), this.rawSpaceAfter].join('');
  };

  _createClass(Node, [{
    key: "rawSpaceBefore",
    get: function get() {
      var rawSpace = this.raws && this.raws.spaces && this.raws.spaces.before;

      if (rawSpace === undefined) {
        rawSpace = this.spaces && this.spaces.before;
      }

      return rawSpace || "";
    },
    set: function set(raw) {
      (0, util.ensureObject)(this, "raws", "spaces");
      this.raws.spaces.before = raw;
    }
  }, {
    key: "rawSpaceAfter",
    get: function get() {
      var rawSpace = this.raws && this.raws.spaces && this.raws.spaces.after;

      if (rawSpace === undefined) {
        rawSpace = this.spaces.after;
      }

      return rawSpace || "";
    },
    set: function set(raw) {
      (0, util.ensureObject)(this, "raws", "spaces");
      this.raws.spaces.after = raw;
    }
  }]);

  return Node;
}();

exports["default"] = Node;
module.exports = exports.default;
});

var types = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports.UNIVERSAL = exports.ATTRIBUTE = exports.CLASS = exports.COMBINATOR = exports.COMMENT = exports.ID = exports.NESTING = exports.PSEUDO = exports.ROOT = exports.SELECTOR = exports.STRING = exports.TAG = void 0;
var TAG = 'tag';
exports.TAG = TAG;
var STRING = 'string';
exports.STRING = STRING;
var SELECTOR = 'selector';
exports.SELECTOR = SELECTOR;
var ROOT = 'root';
exports.ROOT = ROOT;
var PSEUDO = 'pseudo';
exports.PSEUDO = PSEUDO;
var NESTING = 'nesting';
exports.NESTING = NESTING;
var ID = 'id';
exports.ID = ID;
var COMMENT = 'comment';
exports.COMMENT = COMMENT;
var COMBINATOR = 'combinator';
exports.COMBINATOR = COMBINATOR;
var CLASS = 'class';
exports.CLASS = CLASS;
var ATTRIBUTE = 'attribute';
exports.ATTRIBUTE = ATTRIBUTE;
var UNIVERSAL = 'universal';
exports.UNIVERSAL = UNIVERSAL;
});

var container = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports["default"] = void 0;

var _node = _interopRequireDefault(node$1);

var types$1 = _interopRequireWildcard(types);

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function _getRequireWildcardCache() { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _createForOfIteratorHelperLoose(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } it = o[Symbol.iterator](); return it.next.bind(it); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var Container = /*#__PURE__*/function (_Node) {
  _inheritsLoose(Container, _Node);

  function Container(opts) {
    var _this;

    _this = _Node.call(this, opts) || this;

    if (!_this.nodes) {
      _this.nodes = [];
    }

    return _this;
  }

  var _proto = Container.prototype;

  _proto.append = function append(selector) {
    selector.parent = this;
    this.nodes.push(selector);
    return this;
  };

  _proto.prepend = function prepend(selector) {
    selector.parent = this;
    this.nodes.unshift(selector);
    return this;
  };

  _proto.at = function at(index) {
    return this.nodes[index];
  };

  _proto.index = function index(child) {
    if (typeof child === 'number') {
      return child;
    }

    return this.nodes.indexOf(child);
  };

  _proto.removeChild = function removeChild(child) {
    child = this.index(child);
    this.at(child).parent = undefined;
    this.nodes.splice(child, 1);
    var index;

    for (var id in this.indexes) {
      index = this.indexes[id];

      if (index >= child) {
        this.indexes[id] = index - 1;
      }
    }

    return this;
  };

  _proto.removeAll = function removeAll() {
    for (var _iterator = _createForOfIteratorHelperLoose(this.nodes), _step; !(_step = _iterator()).done;) {
      var node = _step.value;
      node.parent = undefined;
    }

    this.nodes = [];
    return this;
  };

  _proto.empty = function empty() {
    return this.removeAll();
  };

  _proto.insertAfter = function insertAfter(oldNode, newNode) {
    newNode.parent = this;
    var oldIndex = this.index(oldNode);
    this.nodes.splice(oldIndex + 1, 0, newNode);
    newNode.parent = this;
    var index;

    for (var id in this.indexes) {
      index = this.indexes[id];

      if (oldIndex <= index) {
        this.indexes[id] = index + 1;
      }
    }

    return this;
  };

  _proto.insertBefore = function insertBefore(oldNode, newNode) {
    newNode.parent = this;
    var oldIndex = this.index(oldNode);
    this.nodes.splice(oldIndex, 0, newNode);
    newNode.parent = this;
    var index;

    for (var id in this.indexes) {
      index = this.indexes[id];

      if (index <= oldIndex) {
        this.indexes[id] = index + 1;
      }
    }

    return this;
  };

  _proto._findChildAtPosition = function _findChildAtPosition(line, col) {
    var found = undefined;
    this.each(function (node) {
      if (node.atPosition) {
        var foundChild = node.atPosition(line, col);

        if (foundChild) {
          found = foundChild;
          return false;
        }
      } else if (node.isAtPosition(line, col)) {
        found = node;
        return false;
      }
    });
    return found;
  }
  /**
   * Return the most specific node at the line and column number given.
   * The source location is based on the original parsed location, locations aren't
   * updated as selector nodes are mutated.
   * 
   * Note that this location is relative to the location of the first character
   * of the selector, and not the location of the selector in the overall document
   * when used in conjunction with postcss.
   *
   * If not found, returns undefined.
   * @param {number} line The line number of the node to find. (1-based index)
   * @param {number} col  The column number of the node to find. (1-based index)
   */
  ;

  _proto.atPosition = function atPosition(line, col) {
    if (this.isAtPosition(line, col)) {
      return this._findChildAtPosition(line, col) || this;
    } else {
      return undefined;
    }
  };

  _proto._inferEndPosition = function _inferEndPosition() {
    if (this.last && this.last.source && this.last.source.end) {
      this.source = this.source || {};
      this.source.end = this.source.end || {};
      Object.assign(this.source.end, this.last.source.end);
    }
  };

  _proto.each = function each(callback) {
    if (!this.lastEach) {
      this.lastEach = 0;
    }

    if (!this.indexes) {
      this.indexes = {};
    }

    this.lastEach++;
    var id = this.lastEach;
    this.indexes[id] = 0;

    if (!this.length) {
      return undefined;
    }

    var index, result;

    while (this.indexes[id] < this.length) {
      index = this.indexes[id];
      result = callback(this.at(index), index);

      if (result === false) {
        break;
      }

      this.indexes[id] += 1;
    }

    delete this.indexes[id];

    if (result === false) {
      return false;
    }
  };

  _proto.walk = function walk(callback) {
    return this.each(function (node, i) {
      var result = callback(node, i);

      if (result !== false && node.length) {
        result = node.walk(callback);
      }

      if (result === false) {
        return false;
      }
    });
  };

  _proto.walkAttributes = function walkAttributes(callback) {
    var _this2 = this;

    return this.walk(function (selector) {
      if (selector.type === types$1.ATTRIBUTE) {
        return callback.call(_this2, selector);
      }
    });
  };

  _proto.walkClasses = function walkClasses(callback) {
    var _this3 = this;

    return this.walk(function (selector) {
      if (selector.type === types$1.CLASS) {
        return callback.call(_this3, selector);
      }
    });
  };

  _proto.walkCombinators = function walkCombinators(callback) {
    var _this4 = this;

    return this.walk(function (selector) {
      if (selector.type === types$1.COMBINATOR) {
        return callback.call(_this4, selector);
      }
    });
  };

  _proto.walkComments = function walkComments(callback) {
    var _this5 = this;

    return this.walk(function (selector) {
      if (selector.type === types$1.COMMENT) {
        return callback.call(_this5, selector);
      }
    });
  };

  _proto.walkIds = function walkIds(callback) {
    var _this6 = this;

    return this.walk(function (selector) {
      if (selector.type === types$1.ID) {
        return callback.call(_this6, selector);
      }
    });
  };

  _proto.walkNesting = function walkNesting(callback) {
    var _this7 = this;

    return this.walk(function (selector) {
      if (selector.type === types$1.NESTING) {
        return callback.call(_this7, selector);
      }
    });
  };

  _proto.walkPseudos = function walkPseudos(callback) {
    var _this8 = this;

    return this.walk(function (selector) {
      if (selector.type === types$1.PSEUDO) {
        return callback.call(_this8, selector);
      }
    });
  };

  _proto.walkTags = function walkTags(callback) {
    var _this9 = this;

    return this.walk(function (selector) {
      if (selector.type === types$1.TAG) {
        return callback.call(_this9, selector);
      }
    });
  };

  _proto.walkUniversals = function walkUniversals(callback) {
    var _this10 = this;

    return this.walk(function (selector) {
      if (selector.type === types$1.UNIVERSAL) {
        return callback.call(_this10, selector);
      }
    });
  };

  _proto.split = function split(callback) {
    var _this11 = this;

    var current = [];
    return this.reduce(function (memo, node, index) {
      var split = callback.call(_this11, node);
      current.push(node);

      if (split) {
        memo.push(current);
        current = [];
      } else if (index === _this11.length - 1) {
        memo.push(current);
      }

      return memo;
    }, []);
  };

  _proto.map = function map(callback) {
    return this.nodes.map(callback);
  };

  _proto.reduce = function reduce(callback, memo) {
    return this.nodes.reduce(callback, memo);
  };

  _proto.every = function every(callback) {
    return this.nodes.every(callback);
  };

  _proto.some = function some(callback) {
    return this.nodes.some(callback);
  };

  _proto.filter = function filter(callback) {
    return this.nodes.filter(callback);
  };

  _proto.sort = function sort(callback) {
    return this.nodes.sort(callback);
  };

  _proto.toString = function toString() {
    return this.map(String).join('');
  };

  _createClass(Container, [{
    key: "first",
    get: function get() {
      return this.at(0);
    }
  }, {
    key: "last",
    get: function get() {
      return this.at(this.length - 1);
    }
  }, {
    key: "length",
    get: function get() {
      return this.nodes.length;
    }
  }]);

  return Container;
}(_node["default"]);

exports["default"] = Container;
module.exports = exports.default;
});

var root = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports["default"] = void 0;

var _container = _interopRequireDefault(container);



function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var Root = /*#__PURE__*/function (_Container) {
  _inheritsLoose(Root, _Container);

  function Root(opts) {
    var _this;

    _this = _Container.call(this, opts) || this;
    _this.type = types.ROOT;
    return _this;
  }

  var _proto = Root.prototype;

  _proto.toString = function toString() {
    var str = this.reduce(function (memo, selector) {
      memo.push(String(selector));
      return memo;
    }, []).join(',');
    return this.trailingComma ? str + ',' : str;
  };

  _proto.error = function error(message, options) {
    if (this._error) {
      return this._error(message, options);
    } else {
      return new Error(message);
    }
  };

  _createClass(Root, [{
    key: "errorGenerator",
    set: function set(handler) {
      this._error = handler;
    }
  }]);

  return Root;
}(_container["default"]);

exports["default"] = Root;
module.exports = exports.default;
});

var selector = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports["default"] = void 0;

var _container = _interopRequireDefault(container);



function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var Selector = /*#__PURE__*/function (_Container) {
  _inheritsLoose(Selector, _Container);

  function Selector(opts) {
    var _this;

    _this = _Container.call(this, opts) || this;
    _this.type = types.SELECTOR;
    return _this;
  }

  return Selector;
}(_container["default"]);

exports["default"] = Selector;
module.exports = exports.default;
});

/*! https://mths.be/cssesc v3.0.0 by @mathias */

var object = {};
var hasOwnProperty = object.hasOwnProperty;
var merge = function merge(options, defaults) {
	if (!options) {
		return defaults;
	}
	var result = {};
	for (var key in defaults) {
		// `if (defaults.hasOwnProperty(key) { … }` is not needed here, since
		// only recognized option names are used.
		result[key] = hasOwnProperty.call(options, key) ? options[key] : defaults[key];
	}
	return result;
};

var regexAnySingleEscape = /[ -,\.\/:-@\[-\^`\{-~]/;
var regexSingleEscape = /[ -,\.\/:-@\[\]\^`\{-~]/;
var regexExcessiveSpaces = /(^|\\+)?(\\[A-F0-9]{1,6})\x20(?![a-fA-F0-9\x20])/g;

// https://mathiasbynens.be/notes/css-escapes#css
var cssesc = function cssesc(string, options) {
	options = merge(options, cssesc.options);
	if (options.quotes != 'single' && options.quotes != 'double') {
		options.quotes = 'single';
	}
	var quote = options.quotes == 'double' ? '"' : '\'';
	var isIdentifier = options.isIdentifier;

	var firstChar = string.charAt(0);
	var output = '';
	var counter = 0;
	var length = string.length;
	while (counter < length) {
		var character = string.charAt(counter++);
		var codePoint = character.charCodeAt();
		var value = void 0;
		// If it’s not a printable ASCII character…
		if (codePoint < 0x20 || codePoint > 0x7E) {
			if (codePoint >= 0xD800 && codePoint <= 0xDBFF && counter < length) {
				// It’s a high surrogate, and there is a next character.
				var extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) {
					// next character is low surrogate
					codePoint = ((codePoint & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000;
				} else {
					// It’s an unmatched surrogate; only append this code unit, in case
					// the next code unit is the high surrogate of a surrogate pair.
					counter--;
				}
			}
			value = '\\' + codePoint.toString(16).toUpperCase() + ' ';
		} else {
			if (options.escapeEverything) {
				if (regexAnySingleEscape.test(character)) {
					value = '\\' + character;
				} else {
					value = '\\' + codePoint.toString(16).toUpperCase() + ' ';
				}
			} else if (/[\t\n\f\r\x0B]/.test(character)) {
				value = '\\' + codePoint.toString(16).toUpperCase() + ' ';
			} else if (character == '\\' || !isIdentifier && (character == '"' && quote == character || character == '\'' && quote == character) || isIdentifier && regexSingleEscape.test(character)) {
				value = '\\' + character;
			} else {
				value = character;
			}
		}
		output += value;
	}

	if (isIdentifier) {
		if (/^-[-\d]/.test(output)) {
			output = '\\-' + output.slice(1);
		} else if (/\d/.test(firstChar)) {
			output = '\\3' + firstChar + ' ' + output.slice(1);
		}
	}

	// Remove spaces after `\HEX` escapes that are not followed by a hex digit,
	// since they’re redundant. Note that this is only possible if the escape
	// sequence isn’t preceded by an odd number of backslashes.
	output = output.replace(regexExcessiveSpaces, function ($0, $1, $2) {
		if ($1 && $1.length % 2) {
			// It’s not safe to remove the space, so don’t.
			return $0;
		}
		// Strip the space.
		return ($1 || '') + $2;
	});

	if (!isIdentifier && options.wrap) {
		return quote + output + quote;
	}
	return output;
};

// Expose default options (so they can be overridden globally).
cssesc.options = {
	'escapeEverything': false,
	'isIdentifier': false,
	'quotes': 'single',
	'wrap': false
};

cssesc.version = '3.0.0';

var cssesc_1 = cssesc;

var className = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports["default"] = void 0;

var _cssesc = _interopRequireDefault(cssesc_1);



var _node = _interopRequireDefault(node$1);



function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var ClassName = /*#__PURE__*/function (_Node) {
  _inheritsLoose(ClassName, _Node);

  function ClassName(opts) {
    var _this;

    _this = _Node.call(this, opts) || this;
    _this.type = types.CLASS;
    _this._constructed = true;
    return _this;
  }

  var _proto = ClassName.prototype;

  _proto.valueToString = function valueToString() {
    return '.' + _Node.prototype.valueToString.call(this);
  };

  _createClass(ClassName, [{
    key: "value",
    get: function get() {
      return this._value;
    },
    set: function set(v) {
      if (this._constructed) {
        var escaped = (0, _cssesc["default"])(v, {
          isIdentifier: true
        });

        if (escaped !== v) {
          (0, util.ensureObject)(this, "raws");
          this.raws.value = escaped;
        } else if (this.raws) {
          delete this.raws.value;
        }
      }

      this._value = v;
    }
  }]);

  return ClassName;
}(_node["default"]);

exports["default"] = ClassName;
module.exports = exports.default;
});

var comment = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports["default"] = void 0;

var _node = _interopRequireDefault(node$1);



function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var Comment = /*#__PURE__*/function (_Node) {
  _inheritsLoose(Comment, _Node);

  function Comment(opts) {
    var _this;

    _this = _Node.call(this, opts) || this;
    _this.type = types.COMMENT;
    return _this;
  }

  return Comment;
}(_node["default"]);

exports["default"] = Comment;
module.exports = exports.default;
});

var id = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports["default"] = void 0;

var _node = _interopRequireDefault(node$1);



function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var ID = /*#__PURE__*/function (_Node) {
  _inheritsLoose(ID, _Node);

  function ID(opts) {
    var _this;

    _this = _Node.call(this, opts) || this;
    _this.type = types.ID;
    return _this;
  }

  var _proto = ID.prototype;

  _proto.valueToString = function valueToString() {
    return '#' + _Node.prototype.valueToString.call(this);
  };

  return ID;
}(_node["default"]);

exports["default"] = ID;
module.exports = exports.default;
});

var namespace = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports["default"] = void 0;

var _cssesc = _interopRequireDefault(cssesc_1);



var _node = _interopRequireDefault(node$1);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var Namespace = /*#__PURE__*/function (_Node) {
  _inheritsLoose(Namespace, _Node);

  function Namespace() {
    return _Node.apply(this, arguments) || this;
  }

  var _proto = Namespace.prototype;

  _proto.qualifiedName = function qualifiedName(value) {
    if (this.namespace) {
      return this.namespaceString + "|" + value;
    } else {
      return value;
    }
  };

  _proto.valueToString = function valueToString() {
    return this.qualifiedName(_Node.prototype.valueToString.call(this));
  };

  _createClass(Namespace, [{
    key: "namespace",
    get: function get() {
      return this._namespace;
    },
    set: function set(namespace) {
      if (namespace === true || namespace === "*" || namespace === "&") {
        this._namespace = namespace;

        if (this.raws) {
          delete this.raws.namespace;
        }

        return;
      }

      var escaped = (0, _cssesc["default"])(namespace, {
        isIdentifier: true
      });
      this._namespace = namespace;

      if (escaped !== namespace) {
        (0, util.ensureObject)(this, "raws");
        this.raws.namespace = escaped;
      } else if (this.raws) {
        delete this.raws.namespace;
      }
    }
  }, {
    key: "ns",
    get: function get() {
      return this._namespace;
    },
    set: function set(namespace) {
      this.namespace = namespace;
    }
  }, {
    key: "namespaceString",
    get: function get() {
      if (this.namespace) {
        var ns = this.stringifyProperty("namespace");

        if (ns === true) {
          return '';
        } else {
          return ns;
        }
      } else {
        return '';
      }
    }
  }]);

  return Namespace;
}(_node["default"]);

exports["default"] = Namespace;
module.exports = exports.default;
});

var tag = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports["default"] = void 0;

var _namespace = _interopRequireDefault(namespace);



function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var Tag = /*#__PURE__*/function (_Namespace) {
  _inheritsLoose(Tag, _Namespace);

  function Tag(opts) {
    var _this;

    _this = _Namespace.call(this, opts) || this;
    _this.type = types.TAG;
    return _this;
  }

  return Tag;
}(_namespace["default"]);

exports["default"] = Tag;
module.exports = exports.default;
});

var string = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports["default"] = void 0;

var _node = _interopRequireDefault(node$1);



function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var String = /*#__PURE__*/function (_Node) {
  _inheritsLoose(String, _Node);

  function String(opts) {
    var _this;

    _this = _Node.call(this, opts) || this;
    _this.type = types.STRING;
    return _this;
  }

  return String;
}(_node["default"]);

exports["default"] = String;
module.exports = exports.default;
});

var pseudo = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports["default"] = void 0;

var _container = _interopRequireDefault(container);



function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var Pseudo = /*#__PURE__*/function (_Container) {
  _inheritsLoose(Pseudo, _Container);

  function Pseudo(opts) {
    var _this;

    _this = _Container.call(this, opts) || this;
    _this.type = types.PSEUDO;
    return _this;
  }

  var _proto = Pseudo.prototype;

  _proto.toString = function toString() {
    var params = this.length ? '(' + this.map(String).join(',') + ')' : '';
    return [this.rawSpaceBefore, this.stringifyProperty("value"), params, this.rawSpaceAfter].join('');
  };

  return Pseudo;
}(_container["default"]);

exports["default"] = Pseudo;
module.exports = exports.default;
});

/**
 * For Node.js, simply re-export the core `util.deprecate` function.
 */

var node = require$$0__default["default"].deprecate;

var attribute = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports.unescapeValue = unescapeValue;
exports["default"] = void 0;

var _cssesc = _interopRequireDefault(cssesc_1);

var _unesc = _interopRequireDefault(unesc_1);

var _namespace = _interopRequireDefault(namespace);



var _CSSESC_QUOTE_OPTIONS;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }



var WRAPPED_IN_QUOTES = /^('|")([^]*)\1$/;
var warnOfDeprecatedValueAssignment = node(function () {}, "Assigning an attribute a value containing characters that might need to be escaped is deprecated. " + "Call attribute.setValue() instead.");
var warnOfDeprecatedQuotedAssignment = node(function () {}, "Assigning attr.quoted is deprecated and has no effect. Assign to attr.quoteMark instead.");
var warnOfDeprecatedConstructor = node(function () {}, "Constructing an Attribute selector with a value without specifying quoteMark is deprecated. Note: The value should be unescaped now.");

function unescapeValue(value) {
  var deprecatedUsage = false;
  var quoteMark = null;
  var unescaped = value;
  var m = unescaped.match(WRAPPED_IN_QUOTES);

  if (m) {
    quoteMark = m[1];
    unescaped = m[2];
  }

  unescaped = (0, _unesc["default"])(unescaped);

  if (unescaped !== value) {
    deprecatedUsage = true;
  }

  return {
    deprecatedUsage: deprecatedUsage,
    unescaped: unescaped,
    quoteMark: quoteMark
  };
}

function handleDeprecatedContructorOpts(opts) {
  if (opts.quoteMark !== undefined) {
    return opts;
  }

  if (opts.value === undefined) {
    return opts;
  }

  warnOfDeprecatedConstructor();

  var _unescapeValue = unescapeValue(opts.value),
      quoteMark = _unescapeValue.quoteMark,
      unescaped = _unescapeValue.unescaped;

  if (!opts.raws) {
    opts.raws = {};
  }

  if (opts.raws.value === undefined) {
    opts.raws.value = opts.value;
  }

  opts.value = unescaped;
  opts.quoteMark = quoteMark;
  return opts;
}

var Attribute = /*#__PURE__*/function (_Namespace) {
  _inheritsLoose(Attribute, _Namespace);

  function Attribute(opts) {
    var _this;

    if (opts === void 0) {
      opts = {};
    }

    _this = _Namespace.call(this, handleDeprecatedContructorOpts(opts)) || this;
    _this.type = types.ATTRIBUTE;
    _this.raws = _this.raws || {};
    Object.defineProperty(_this.raws, 'unquoted', {
      get: node(function () {
        return _this.value;
      }, "attr.raws.unquoted is deprecated. Call attr.value instead."),
      set: node(function () {
        return _this.value;
      }, "Setting attr.raws.unquoted is deprecated and has no effect. attr.value is unescaped by default now.")
    });
    _this._constructed = true;
    return _this;
  }
  /**
   * Returns the Attribute's value quoted such that it would be legal to use
   * in the value of a css file. The original value's quotation setting
   * used for stringification is left unchanged. See `setValue(value, options)`
   * if you want to control the quote settings of a new value for the attribute.
   *
   * You can also change the quotation used for the current value by setting quoteMark.
   *
   * Options:
   *   * quoteMark {'"' | "'" | null} - Use this value to quote the value. If this
   *     option is not set, the original value for quoteMark will be used. If
   *     indeterminate, a double quote is used. The legal values are:
   *     * `null` - the value will be unquoted and characters will be escaped as necessary.
   *     * `'` - the value will be quoted with a single quote and single quotes are escaped.
   *     * `"` - the value will be quoted with a double quote and double quotes are escaped.
   *   * preferCurrentQuoteMark {boolean} - if true, prefer the source quote mark
   *     over the quoteMark option value.
   *   * smart {boolean} - if true, will select a quote mark based on the value
   *     and the other options specified here. See the `smartQuoteMark()`
   *     method.
   **/


  var _proto = Attribute.prototype;

  _proto.getQuotedValue = function getQuotedValue(options) {
    if (options === void 0) {
      options = {};
    }

    var quoteMark = this._determineQuoteMark(options);

    var cssescopts = CSSESC_QUOTE_OPTIONS[quoteMark];
    var escaped = (0, _cssesc["default"])(this._value, cssescopts);
    return escaped;
  };

  _proto._determineQuoteMark = function _determineQuoteMark(options) {
    return options.smart ? this.smartQuoteMark(options) : this.preferredQuoteMark(options);
  }
  /**
   * Set the unescaped value with the specified quotation options. The value
   * provided must not include any wrapping quote marks -- those quotes will
   * be interpreted as part of the value and escaped accordingly.
   */
  ;

  _proto.setValue = function setValue(value, options) {
    if (options === void 0) {
      options = {};
    }

    this._value = value;
    this._quoteMark = this._determineQuoteMark(options);

    this._syncRawValue();
  }
  /**
   * Intelligently select a quoteMark value based on the value's contents. If
   * the value is a legal CSS ident, it will not be quoted. Otherwise a quote
   * mark will be picked that minimizes the number of escapes.
   *
   * If there's no clear winner, the quote mark from these options is used,
   * then the source quote mark (this is inverted if `preferCurrentQuoteMark` is
   * true). If the quoteMark is unspecified, a double quote is used.
   *
   * @param options This takes the quoteMark and preferCurrentQuoteMark options
   * from the quoteValue method.
   */
  ;

  _proto.smartQuoteMark = function smartQuoteMark(options) {
    var v = this.value;
    var numSingleQuotes = v.replace(/[^']/g, '').length;
    var numDoubleQuotes = v.replace(/[^"]/g, '').length;

    if (numSingleQuotes + numDoubleQuotes === 0) {
      var escaped = (0, _cssesc["default"])(v, {
        isIdentifier: true
      });

      if (escaped === v) {
        return Attribute.NO_QUOTE;
      } else {
        var pref = this.preferredQuoteMark(options);

        if (pref === Attribute.NO_QUOTE) {
          // pick a quote mark that isn't none and see if it's smaller
          var quote = this.quoteMark || options.quoteMark || Attribute.DOUBLE_QUOTE;
          var opts = CSSESC_QUOTE_OPTIONS[quote];
          var quoteValue = (0, _cssesc["default"])(v, opts);

          if (quoteValue.length < escaped.length) {
            return quote;
          }
        }

        return pref;
      }
    } else if (numDoubleQuotes === numSingleQuotes) {
      return this.preferredQuoteMark(options);
    } else if (numDoubleQuotes < numSingleQuotes) {
      return Attribute.DOUBLE_QUOTE;
    } else {
      return Attribute.SINGLE_QUOTE;
    }
  }
  /**
   * Selects the preferred quote mark based on the options and the current quote mark value.
   * If you want the quote mark to depend on the attribute value, call `smartQuoteMark(opts)`
   * instead.
   */
  ;

  _proto.preferredQuoteMark = function preferredQuoteMark(options) {
    var quoteMark = options.preferCurrentQuoteMark ? this.quoteMark : options.quoteMark;

    if (quoteMark === undefined) {
      quoteMark = options.preferCurrentQuoteMark ? options.quoteMark : this.quoteMark;
    }

    if (quoteMark === undefined) {
      quoteMark = Attribute.DOUBLE_QUOTE;
    }

    return quoteMark;
  };

  _proto._syncRawValue = function _syncRawValue() {
    var rawValue = (0, _cssesc["default"])(this._value, CSSESC_QUOTE_OPTIONS[this.quoteMark]);

    if (rawValue === this._value) {
      if (this.raws) {
        delete this.raws.value;
      }
    } else {
      this.raws.value = rawValue;
    }
  };

  _proto._handleEscapes = function _handleEscapes(prop, value) {
    if (this._constructed) {
      var escaped = (0, _cssesc["default"])(value, {
        isIdentifier: true
      });

      if (escaped !== value) {
        this.raws[prop] = escaped;
      } else {
        delete this.raws[prop];
      }
    }
  };

  _proto._spacesFor = function _spacesFor(name) {
    var attrSpaces = {
      before: '',
      after: ''
    };
    var spaces = this.spaces[name] || {};
    var rawSpaces = this.raws.spaces && this.raws.spaces[name] || {};
    return Object.assign(attrSpaces, spaces, rawSpaces);
  };

  _proto._stringFor = function _stringFor(name, spaceName, concat) {
    if (spaceName === void 0) {
      spaceName = name;
    }

    if (concat === void 0) {
      concat = defaultAttrConcat;
    }

    var attrSpaces = this._spacesFor(spaceName);

    return concat(this.stringifyProperty(name), attrSpaces);
  }
  /**
   * returns the offset of the attribute part specified relative to the
   * start of the node of the output string.
   *
   * * "ns" - alias for "namespace"
   * * "namespace" - the namespace if it exists.
   * * "attribute" - the attribute name
   * * "attributeNS" - the start of the attribute or its namespace
   * * "operator" - the match operator of the attribute
   * * "value" - The value (string or identifier)
   * * "insensitive" - the case insensitivity flag;
   * @param part One of the possible values inside an attribute.
   * @returns -1 if the name is invalid or the value doesn't exist in this attribute.
   */
  ;

  _proto.offsetOf = function offsetOf(name) {
    var count = 1;

    var attributeSpaces = this._spacesFor("attribute");

    count += attributeSpaces.before.length;

    if (name === "namespace" || name === "ns") {
      return this.namespace ? count : -1;
    }

    if (name === "attributeNS") {
      return count;
    }

    count += this.namespaceString.length;

    if (this.namespace) {
      count += 1;
    }

    if (name === "attribute") {
      return count;
    }

    count += this.stringifyProperty("attribute").length;
    count += attributeSpaces.after.length;

    var operatorSpaces = this._spacesFor("operator");

    count += operatorSpaces.before.length;
    var operator = this.stringifyProperty("operator");

    if (name === "operator") {
      return operator ? count : -1;
    }

    count += operator.length;
    count += operatorSpaces.after.length;

    var valueSpaces = this._spacesFor("value");

    count += valueSpaces.before.length;
    var value = this.stringifyProperty("value");

    if (name === "value") {
      return value ? count : -1;
    }

    count += value.length;
    count += valueSpaces.after.length;

    var insensitiveSpaces = this._spacesFor("insensitive");

    count += insensitiveSpaces.before.length;

    if (name === "insensitive") {
      return this.insensitive ? count : -1;
    }

    return -1;
  };

  _proto.toString = function toString() {
    var _this2 = this;

    var selector = [this.rawSpaceBefore, '['];
    selector.push(this._stringFor('qualifiedAttribute', 'attribute'));

    if (this.operator && (this.value || this.value === '')) {
      selector.push(this._stringFor('operator'));
      selector.push(this._stringFor('value'));
      selector.push(this._stringFor('insensitiveFlag', 'insensitive', function (attrValue, attrSpaces) {
        if (attrValue.length > 0 && !_this2.quoted && attrSpaces.before.length === 0 && !(_this2.spaces.value && _this2.spaces.value.after)) {
          attrSpaces.before = " ";
        }

        return defaultAttrConcat(attrValue, attrSpaces);
      }));
    }

    selector.push(']');
    selector.push(this.rawSpaceAfter);
    return selector.join('');
  };

  _createClass(Attribute, [{
    key: "quoted",
    get: function get() {
      var qm = this.quoteMark;
      return qm === "'" || qm === '"';
    },
    set: function set(value) {
      warnOfDeprecatedQuotedAssignment();
    }
    /**
     * returns a single (`'`) or double (`"`) quote character if the value is quoted.
     * returns `null` if the value is not quoted.
     * returns `undefined` if the quotation state is unknown (this can happen when
     * the attribute is constructed without specifying a quote mark.)
     */

  }, {
    key: "quoteMark",
    get: function get() {
      return this._quoteMark;
    }
    /**
     * Set the quote mark to be used by this attribute's value.
     * If the quote mark changes, the raw (escaped) value at `attr.raws.value` of the attribute
     * value is updated accordingly.
     *
     * @param {"'" | '"' | null} quoteMark The quote mark or `null` if the value should be unquoted.
     */
    ,
    set: function set(quoteMark) {
      if (!this._constructed) {
        this._quoteMark = quoteMark;
        return;
      }

      if (this._quoteMark !== quoteMark) {
        this._quoteMark = quoteMark;

        this._syncRawValue();
      }
    }
  }, {
    key: "qualifiedAttribute",
    get: function get() {
      return this.qualifiedName(this.raws.attribute || this.attribute);
    }
  }, {
    key: "insensitiveFlag",
    get: function get() {
      return this.insensitive ? 'i' : '';
    }
  }, {
    key: "value",
    get: function get() {
      return this._value;
    }
    /**
     * Before 3.0, the value had to be set to an escaped value including any wrapped
     * quote marks. In 3.0, the semantics of `Attribute.value` changed so that the value
     * is unescaped during parsing and any quote marks are removed.
     *
     * Because the ambiguity of this semantic change, if you set `attr.value = newValue`,
     * a deprecation warning is raised when the new value contains any characters that would
     * require escaping (including if it contains wrapped quotes).
     *
     * Instead, you should call `attr.setValue(newValue, opts)` and pass options that describe
     * how the new value is quoted.
     */
    ,
    set: function set(v) {
      if (this._constructed) {
        var _unescapeValue2 = unescapeValue(v),
            deprecatedUsage = _unescapeValue2.deprecatedUsage,
            unescaped = _unescapeValue2.unescaped,
            quoteMark = _unescapeValue2.quoteMark;

        if (deprecatedUsage) {
          warnOfDeprecatedValueAssignment();
        }

        if (unescaped === this._value && quoteMark === this._quoteMark) {
          return;
        }

        this._value = unescaped;
        this._quoteMark = quoteMark;

        this._syncRawValue();
      } else {
        this._value = v;
      }
    }
  }, {
    key: "attribute",
    get: function get() {
      return this._attribute;
    },
    set: function set(name) {
      this._handleEscapes("attribute", name);

      this._attribute = name;
    }
  }]);

  return Attribute;
}(_namespace["default"]);

exports["default"] = Attribute;
Attribute.NO_QUOTE = null;
Attribute.SINGLE_QUOTE = "'";
Attribute.DOUBLE_QUOTE = '"';
var CSSESC_QUOTE_OPTIONS = (_CSSESC_QUOTE_OPTIONS = {
  "'": {
    quotes: 'single',
    wrap: true
  },
  '"': {
    quotes: 'double',
    wrap: true
  }
}, _CSSESC_QUOTE_OPTIONS[null] = {
  isIdentifier: true
}, _CSSESC_QUOTE_OPTIONS);

function defaultAttrConcat(attrValue, attrSpaces) {
  return "" + attrSpaces.before + attrValue + attrSpaces.after;
}
});

var universal = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports["default"] = void 0;

var _namespace = _interopRequireDefault(namespace);



function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var Universal = /*#__PURE__*/function (_Namespace) {
  _inheritsLoose(Universal, _Namespace);

  function Universal(opts) {
    var _this;

    _this = _Namespace.call(this, opts) || this;
    _this.type = types.UNIVERSAL;
    _this.value = '*';
    return _this;
  }

  return Universal;
}(_namespace["default"]);

exports["default"] = Universal;
module.exports = exports.default;
});

var combinator = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports["default"] = void 0;

var _node = _interopRequireDefault(node$1);



function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var Combinator = /*#__PURE__*/function (_Node) {
  _inheritsLoose(Combinator, _Node);

  function Combinator(opts) {
    var _this;

    _this = _Node.call(this, opts) || this;
    _this.type = types.COMBINATOR;
    return _this;
  }

  return Combinator;
}(_node["default"]);

exports["default"] = Combinator;
module.exports = exports.default;
});

var nesting = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports["default"] = void 0;

var _node = _interopRequireDefault(node$1);



function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var Nesting = /*#__PURE__*/function (_Node) {
  _inheritsLoose(Nesting, _Node);

  function Nesting(opts) {
    var _this;

    _this = _Node.call(this, opts) || this;
    _this.type = types.NESTING;
    _this.value = '&';
    return _this;
  }

  return Nesting;
}(_node["default"]);

exports["default"] = Nesting;
module.exports = exports.default;
});

var sortAscending_1 = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports["default"] = sortAscending;

function sortAscending(list) {
  return list.sort(function (a, b) {
    return a - b;
  });
}
module.exports = exports.default;
});

var tokenTypes = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports.combinator = exports.word = exports.comment = exports.str = exports.tab = exports.newline = exports.feed = exports.cr = exports.backslash = exports.bang = exports.slash = exports.doubleQuote = exports.singleQuote = exports.space = exports.greaterThan = exports.pipe = exports.equals = exports.plus = exports.caret = exports.tilde = exports.dollar = exports.closeSquare = exports.openSquare = exports.closeParenthesis = exports.openParenthesis = exports.semicolon = exports.colon = exports.comma = exports.at = exports.asterisk = exports.ampersand = void 0;
var ampersand = 38; // `&`.charCodeAt(0);

exports.ampersand = ampersand;
var asterisk = 42; // `*`.charCodeAt(0);

exports.asterisk = asterisk;
var at = 64; // `@`.charCodeAt(0);

exports.at = at;
var comma = 44; // `,`.charCodeAt(0);

exports.comma = comma;
var colon = 58; // `:`.charCodeAt(0);

exports.colon = colon;
var semicolon = 59; // `;`.charCodeAt(0);

exports.semicolon = semicolon;
var openParenthesis = 40; // `(`.charCodeAt(0);

exports.openParenthesis = openParenthesis;
var closeParenthesis = 41; // `)`.charCodeAt(0);

exports.closeParenthesis = closeParenthesis;
var openSquare = 91; // `[`.charCodeAt(0);

exports.openSquare = openSquare;
var closeSquare = 93; // `]`.charCodeAt(0);

exports.closeSquare = closeSquare;
var dollar = 36; // `$`.charCodeAt(0);

exports.dollar = dollar;
var tilde = 126; // `~`.charCodeAt(0);

exports.tilde = tilde;
var caret = 94; // `^`.charCodeAt(0);

exports.caret = caret;
var plus = 43; // `+`.charCodeAt(0);

exports.plus = plus;
var equals = 61; // `=`.charCodeAt(0);

exports.equals = equals;
var pipe = 124; // `|`.charCodeAt(0);

exports.pipe = pipe;
var greaterThan = 62; // `>`.charCodeAt(0);

exports.greaterThan = greaterThan;
var space = 32; // ` `.charCodeAt(0);

exports.space = space;
var singleQuote = 39; // `'`.charCodeAt(0);

exports.singleQuote = singleQuote;
var doubleQuote = 34; // `"`.charCodeAt(0);

exports.doubleQuote = doubleQuote;
var slash = 47; // `/`.charCodeAt(0);

exports.slash = slash;
var bang = 33; // `!`.charCodeAt(0);

exports.bang = bang;
var backslash = 92; // '\\'.charCodeAt(0);

exports.backslash = backslash;
var cr = 13; // '\r'.charCodeAt(0);

exports.cr = cr;
var feed = 12; // '\f'.charCodeAt(0);

exports.feed = feed;
var newline = 10; // '\n'.charCodeAt(0);

exports.newline = newline;
var tab = 9; // '\t'.charCodeAt(0);
// Expose aliases primarily for readability.

exports.tab = tab;
var str = singleQuote; // No good single character representation!

exports.str = str;
var comment = -1;
exports.comment = comment;
var word = -2;
exports.word = word;
var combinator = -3;
exports.combinator = combinator;
});

var tokenize_1 = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports["default"] = tokenize;
exports.FIELDS = void 0;

var t = _interopRequireWildcard(tokenTypes);

var _unescapable, _wordDelimiters;

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function _getRequireWildcardCache() { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

var unescapable = (_unescapable = {}, _unescapable[t.tab] = true, _unescapable[t.newline] = true, _unescapable[t.cr] = true, _unescapable[t.feed] = true, _unescapable);
var wordDelimiters = (_wordDelimiters = {}, _wordDelimiters[t.space] = true, _wordDelimiters[t.tab] = true, _wordDelimiters[t.newline] = true, _wordDelimiters[t.cr] = true, _wordDelimiters[t.feed] = true, _wordDelimiters[t.ampersand] = true, _wordDelimiters[t.asterisk] = true, _wordDelimiters[t.bang] = true, _wordDelimiters[t.comma] = true, _wordDelimiters[t.colon] = true, _wordDelimiters[t.semicolon] = true, _wordDelimiters[t.openParenthesis] = true, _wordDelimiters[t.closeParenthesis] = true, _wordDelimiters[t.openSquare] = true, _wordDelimiters[t.closeSquare] = true, _wordDelimiters[t.singleQuote] = true, _wordDelimiters[t.doubleQuote] = true, _wordDelimiters[t.plus] = true, _wordDelimiters[t.pipe] = true, _wordDelimiters[t.tilde] = true, _wordDelimiters[t.greaterThan] = true, _wordDelimiters[t.equals] = true, _wordDelimiters[t.dollar] = true, _wordDelimiters[t.caret] = true, _wordDelimiters[t.slash] = true, _wordDelimiters);
var hex = {};
var hexChars = "0123456789abcdefABCDEF";

for (var i = 0; i < hexChars.length; i++) {
  hex[hexChars.charCodeAt(i)] = true;
}
/**
 *  Returns the last index of the bar css word
 * @param {string} css The string in which the word begins
 * @param {number} start The index into the string where word's first letter occurs
 */


function consumeWord(css, start) {
  var next = start;
  var code;

  do {
    code = css.charCodeAt(next);

    if (wordDelimiters[code]) {
      return next - 1;
    } else if (code === t.backslash) {
      next = consumeEscape(css, next) + 1;
    } else {
      // All other characters are part of the word
      next++;
    }
  } while (next < css.length);

  return next - 1;
}
/**
 *  Returns the last index of the escape sequence
 * @param {string} css The string in which the sequence begins
 * @param {number} start The index into the string where escape character (`\`) occurs.
 */


function consumeEscape(css, start) {
  var next = start;
  var code = css.charCodeAt(next + 1);

  if (unescapable[code]) ; else if (hex[code]) {
    var hexDigits = 0; // consume up to 6 hex chars

    do {
      next++;
      hexDigits++;
      code = css.charCodeAt(next + 1);
    } while (hex[code] && hexDigits < 6); // if fewer than 6 hex chars, a trailing space ends the escape


    if (hexDigits < 6 && code === t.space) {
      next++;
    }
  } else {
    // the next char is part of the current word
    next++;
  }

  return next;
}

var FIELDS = {
  TYPE: 0,
  START_LINE: 1,
  START_COL: 2,
  END_LINE: 3,
  END_COL: 4,
  START_POS: 5,
  END_POS: 6
};
exports.FIELDS = FIELDS;

function tokenize(input) {
  var tokens = [];
  var css = input.css.valueOf();
  var _css = css,
      length = _css.length;
  var offset = -1;
  var line = 1;
  var start = 0;
  var end = 0;
  var code, content, endColumn, endLine, escaped, escapePos, last, lines, next, nextLine, nextOffset, quote, tokenType;

  function unclosed(what, fix) {
    if (input.safe) {
      // fyi: this is never set to true.
      css += fix;
      next = css.length - 1;
    } else {
      throw input.error('Unclosed ' + what, line, start - offset, start);
    }
  }

  while (start < length) {
    code = css.charCodeAt(start);

    if (code === t.newline) {
      offset = start;
      line += 1;
    }

    switch (code) {
      case t.space:
      case t.tab:
      case t.newline:
      case t.cr:
      case t.feed:
        next = start;

        do {
          next += 1;
          code = css.charCodeAt(next);

          if (code === t.newline) {
            offset = next;
            line += 1;
          }
        } while (code === t.space || code === t.newline || code === t.tab || code === t.cr || code === t.feed);

        tokenType = t.space;
        endLine = line;
        endColumn = next - offset - 1;
        end = next;
        break;

      case t.plus:
      case t.greaterThan:
      case t.tilde:
      case t.pipe:
        next = start;

        do {
          next += 1;
          code = css.charCodeAt(next);
        } while (code === t.plus || code === t.greaterThan || code === t.tilde || code === t.pipe);

        tokenType = t.combinator;
        endLine = line;
        endColumn = start - offset;
        end = next;
        break;
      // Consume these characters as single tokens.

      case t.asterisk:
      case t.ampersand:
      case t.bang:
      case t.comma:
      case t.equals:
      case t.dollar:
      case t.caret:
      case t.openSquare:
      case t.closeSquare:
      case t.colon:
      case t.semicolon:
      case t.openParenthesis:
      case t.closeParenthesis:
        next = start;
        tokenType = code;
        endLine = line;
        endColumn = start - offset;
        end = next + 1;
        break;

      case t.singleQuote:
      case t.doubleQuote:
        quote = code === t.singleQuote ? "'" : '"';
        next = start;

        do {
          escaped = false;
          next = css.indexOf(quote, next + 1);

          if (next === -1) {
            unclosed('quote', quote);
          }

          escapePos = next;

          while (css.charCodeAt(escapePos - 1) === t.backslash) {
            escapePos -= 1;
            escaped = !escaped;
          }
        } while (escaped);

        tokenType = t.str;
        endLine = line;
        endColumn = start - offset;
        end = next + 1;
        break;

      default:
        if (code === t.slash && css.charCodeAt(start + 1) === t.asterisk) {
          next = css.indexOf('*/', start + 2) + 1;

          if (next === 0) {
            unclosed('comment', '*/');
          }

          content = css.slice(start, next + 1);
          lines = content.split('\n');
          last = lines.length - 1;

          if (last > 0) {
            nextLine = line + last;
            nextOffset = next - lines[last].length;
          } else {
            nextLine = line;
            nextOffset = offset;
          }

          tokenType = t.comment;
          line = nextLine;
          endLine = nextLine;
          endColumn = next - nextOffset;
        } else if (code === t.slash) {
          next = start;
          tokenType = code;
          endLine = line;
          endColumn = start - offset;
          end = next + 1;
        } else {
          next = consumeWord(css, start);
          tokenType = t.word;
          endLine = line;
          endColumn = next - offset;
        }

        end = next + 1;
        break;
    } // Ensure that the token structure remains consistent


    tokens.push([tokenType, // [0] Token type
    line, // [1] Starting line
    start - offset, // [2] Starting column
    endLine, // [3] Ending line
    endColumn, // [4] Ending column
    start, // [5] Start position / Source index
    end // [6] End position
    ]); // Reset offset for the next token

    if (nextOffset) {
      offset = nextOffset;
      nextOffset = null;
    }

    start = end;
  }

  return tokens;
}
});

var parser = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports["default"] = void 0;

var _root = _interopRequireDefault(root);

var _selector = _interopRequireDefault(selector);

var _className = _interopRequireDefault(className);

var _comment = _interopRequireDefault(comment);

var _id = _interopRequireDefault(id);

var _tag = _interopRequireDefault(tag);

var _string = _interopRequireDefault(string);

var _pseudo = _interopRequireDefault(pseudo);

var _attribute = _interopRequireWildcard(attribute);

var _universal = _interopRequireDefault(universal);

var _combinator = _interopRequireDefault(combinator);

var _nesting = _interopRequireDefault(nesting);

var _sortAscending = _interopRequireDefault(sortAscending_1);

var _tokenize = _interopRequireWildcard(tokenize_1);

var tokens = _interopRequireWildcard(tokenTypes);

var types$1 = _interopRequireWildcard(types);



var _WHITESPACE_TOKENS, _Object$assign;

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function _getRequireWildcardCache() { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var WHITESPACE_TOKENS = (_WHITESPACE_TOKENS = {}, _WHITESPACE_TOKENS[tokens.space] = true, _WHITESPACE_TOKENS[tokens.cr] = true, _WHITESPACE_TOKENS[tokens.feed] = true, _WHITESPACE_TOKENS[tokens.newline] = true, _WHITESPACE_TOKENS[tokens.tab] = true, _WHITESPACE_TOKENS);
var WHITESPACE_EQUIV_TOKENS = Object.assign({}, WHITESPACE_TOKENS, (_Object$assign = {}, _Object$assign[tokens.comment] = true, _Object$assign));

function tokenStart(token) {
  return {
    line: token[_tokenize.FIELDS.START_LINE],
    column: token[_tokenize.FIELDS.START_COL]
  };
}

function tokenEnd(token) {
  return {
    line: token[_tokenize.FIELDS.END_LINE],
    column: token[_tokenize.FIELDS.END_COL]
  };
}

function getSource(startLine, startColumn, endLine, endColumn) {
  return {
    start: {
      line: startLine,
      column: startColumn
    },
    end: {
      line: endLine,
      column: endColumn
    }
  };
}

function getTokenSource(token) {
  return getSource(token[_tokenize.FIELDS.START_LINE], token[_tokenize.FIELDS.START_COL], token[_tokenize.FIELDS.END_LINE], token[_tokenize.FIELDS.END_COL]);
}

function getTokenSourceSpan(startToken, endToken) {
  if (!startToken) {
    return undefined;
  }

  return getSource(startToken[_tokenize.FIELDS.START_LINE], startToken[_tokenize.FIELDS.START_COL], endToken[_tokenize.FIELDS.END_LINE], endToken[_tokenize.FIELDS.END_COL]);
}

function unescapeProp(node, prop) {
  var value = node[prop];

  if (typeof value !== "string") {
    return;
  }

  if (value.indexOf("\\") !== -1) {
    (0, util.ensureObject)(node, 'raws');
    node[prop] = (0, util.unesc)(value);

    if (node.raws[prop] === undefined) {
      node.raws[prop] = value;
    }
  }

  return node;
}

function indexesOf(array, item) {
  var i = -1;
  var indexes = [];

  while ((i = array.indexOf(item, i + 1)) !== -1) {
    indexes.push(i);
  }

  return indexes;
}

function uniqs() {
  var list = Array.prototype.concat.apply([], arguments);
  return list.filter(function (item, i) {
    return i === list.indexOf(item);
  });
}

var Parser = /*#__PURE__*/function () {
  function Parser(rule, options) {
    if (options === void 0) {
      options = {};
    }

    this.rule = rule;
    this.options = Object.assign({
      lossy: false,
      safe: false
    }, options);
    this.position = 0;
    this.css = typeof this.rule === 'string' ? this.rule : this.rule.selector;
    this.tokens = (0, _tokenize["default"])({
      css: this.css,
      error: this._errorGenerator(),
      safe: this.options.safe
    });
    var rootSource = getTokenSourceSpan(this.tokens[0], this.tokens[this.tokens.length - 1]);
    this.root = new _root["default"]({
      source: rootSource
    });
    this.root.errorGenerator = this._errorGenerator();
    var selector = new _selector["default"]({
      source: {
        start: {
          line: 1,
          column: 1
        }
      }
    });
    this.root.append(selector);
    this.current = selector;
    this.loop();
  }

  var _proto = Parser.prototype;

  _proto._errorGenerator = function _errorGenerator() {
    var _this = this;

    return function (message, errorOptions) {
      if (typeof _this.rule === 'string') {
        return new Error(message);
      }

      return _this.rule.error(message, errorOptions);
    };
  };

  _proto.attribute = function attribute() {
    var attr = [];
    var startingToken = this.currToken;
    this.position++;

    while (this.position < this.tokens.length && this.currToken[_tokenize.FIELDS.TYPE] !== tokens.closeSquare) {
      attr.push(this.currToken);
      this.position++;
    }

    if (this.currToken[_tokenize.FIELDS.TYPE] !== tokens.closeSquare) {
      return this.expected('closing square bracket', this.currToken[_tokenize.FIELDS.START_POS]);
    }

    var len = attr.length;
    var node = {
      source: getSource(startingToken[1], startingToken[2], this.currToken[3], this.currToken[4]),
      sourceIndex: startingToken[_tokenize.FIELDS.START_POS]
    };

    if (len === 1 && !~[tokens.word].indexOf(attr[0][_tokenize.FIELDS.TYPE])) {
      return this.expected('attribute', attr[0][_tokenize.FIELDS.START_POS]);
    }

    var pos = 0;
    var spaceBefore = '';
    var commentBefore = '';
    var lastAdded = null;
    var spaceAfterMeaningfulToken = false;

    while (pos < len) {
      var token = attr[pos];
      var content = this.content(token);
      var next = attr[pos + 1];

      switch (token[_tokenize.FIELDS.TYPE]) {
        case tokens.space:
          // if (
          //     len === 1 ||
          //     pos === 0 && this.content(next) === '|'
          // ) {
          //     return this.expected('attribute', token[TOKEN.START_POS], content);
          // }
          spaceAfterMeaningfulToken = true;

          if (this.options.lossy) {
            break;
          }

          if (lastAdded) {
            (0, util.ensureObject)(node, 'spaces', lastAdded);
            var prevContent = node.spaces[lastAdded].after || '';
            node.spaces[lastAdded].after = prevContent + content;
            var existingComment = (0, util.getProp)(node, 'raws', 'spaces', lastAdded, 'after') || null;

            if (existingComment) {
              node.raws.spaces[lastAdded].after = existingComment + content;
            }
          } else {
            spaceBefore = spaceBefore + content;
            commentBefore = commentBefore + content;
          }

          break;

        case tokens.asterisk:
          if (next[_tokenize.FIELDS.TYPE] === tokens.equals) {
            node.operator = content;
            lastAdded = 'operator';
          } else if ((!node.namespace || lastAdded === "namespace" && !spaceAfterMeaningfulToken) && next) {
            if (spaceBefore) {
              (0, util.ensureObject)(node, 'spaces', 'attribute');
              node.spaces.attribute.before = spaceBefore;
              spaceBefore = '';
            }

            if (commentBefore) {
              (0, util.ensureObject)(node, 'raws', 'spaces', 'attribute');
              node.raws.spaces.attribute.before = spaceBefore;
              commentBefore = '';
            }

            node.namespace = (node.namespace || "") + content;
            var rawValue = (0, util.getProp)(node, 'raws', 'namespace') || null;

            if (rawValue) {
              node.raws.namespace += content;
            }

            lastAdded = 'namespace';
          }

          spaceAfterMeaningfulToken = false;
          break;

        case tokens.dollar:
          if (lastAdded === "value") {
            var oldRawValue = (0, util.getProp)(node, 'raws', 'value');
            node.value += "$";

            if (oldRawValue) {
              node.raws.value = oldRawValue + "$";
            }

            break;
          }

        // Falls through

        case tokens.caret:
          if (next[_tokenize.FIELDS.TYPE] === tokens.equals) {
            node.operator = content;
            lastAdded = 'operator';
          }

          spaceAfterMeaningfulToken = false;
          break;

        case tokens.combinator:
          if (content === '~' && next[_tokenize.FIELDS.TYPE] === tokens.equals) {
            node.operator = content;
            lastAdded = 'operator';
          }

          if (content !== '|') {
            spaceAfterMeaningfulToken = false;
            break;
          }

          if (next[_tokenize.FIELDS.TYPE] === tokens.equals) {
            node.operator = content;
            lastAdded = 'operator';
          } else if (!node.namespace && !node.attribute) {
            node.namespace = true;
          }

          spaceAfterMeaningfulToken = false;
          break;

        case tokens.word:
          if (next && this.content(next) === '|' && attr[pos + 2] && attr[pos + 2][_tokenize.FIELDS.TYPE] !== tokens.equals && // this look-ahead probably fails with comment nodes involved.
          !node.operator && !node.namespace) {
            node.namespace = content;
            lastAdded = 'namespace';
          } else if (!node.attribute || lastAdded === "attribute" && !spaceAfterMeaningfulToken) {
            if (spaceBefore) {
              (0, util.ensureObject)(node, 'spaces', 'attribute');
              node.spaces.attribute.before = spaceBefore;
              spaceBefore = '';
            }

            if (commentBefore) {
              (0, util.ensureObject)(node, 'raws', 'spaces', 'attribute');
              node.raws.spaces.attribute.before = commentBefore;
              commentBefore = '';
            }

            node.attribute = (node.attribute || "") + content;

            var _rawValue = (0, util.getProp)(node, 'raws', 'attribute') || null;

            if (_rawValue) {
              node.raws.attribute += content;
            }

            lastAdded = 'attribute';
          } else if (!node.value && node.value !== "" || lastAdded === "value" && !spaceAfterMeaningfulToken) {
            var _unescaped = (0, util.unesc)(content);

            var _oldRawValue = (0, util.getProp)(node, 'raws', 'value') || '';

            var oldValue = node.value || '';
            node.value = oldValue + _unescaped;
            node.quoteMark = null;

            if (_unescaped !== content || _oldRawValue) {
              (0, util.ensureObject)(node, 'raws');
              node.raws.value = (_oldRawValue || oldValue) + content;
            }

            lastAdded = 'value';
          } else {
            var insensitive = content === 'i' || content === "I";

            if ((node.value || node.value === '') && (node.quoteMark || spaceAfterMeaningfulToken)) {
              node.insensitive = insensitive;

              if (!insensitive || content === "I") {
                (0, util.ensureObject)(node, 'raws');
                node.raws.insensitiveFlag = content;
              }

              lastAdded = 'insensitive';

              if (spaceBefore) {
                (0, util.ensureObject)(node, 'spaces', 'insensitive');
                node.spaces.insensitive.before = spaceBefore;
                spaceBefore = '';
              }

              if (commentBefore) {
                (0, util.ensureObject)(node, 'raws', 'spaces', 'insensitive');
                node.raws.spaces.insensitive.before = commentBefore;
                commentBefore = '';
              }
            } else if (node.value || node.value === '') {
              lastAdded = 'value';
              node.value += content;

              if (node.raws.value) {
                node.raws.value += content;
              }
            }
          }

          spaceAfterMeaningfulToken = false;
          break;

        case tokens.str:
          if (!node.attribute || !node.operator) {
            return this.error("Expected an attribute followed by an operator preceding the string.", {
              index: token[_tokenize.FIELDS.START_POS]
            });
          }

          var _unescapeValue = (0, _attribute.unescapeValue)(content),
              unescaped = _unescapeValue.unescaped,
              quoteMark = _unescapeValue.quoteMark;

          node.value = unescaped;
          node.quoteMark = quoteMark;
          lastAdded = 'value';
          (0, util.ensureObject)(node, 'raws');
          node.raws.value = content;
          spaceAfterMeaningfulToken = false;
          break;

        case tokens.equals:
          if (!node.attribute) {
            return this.expected('attribute', token[_tokenize.FIELDS.START_POS], content);
          }

          if (node.value) {
            return this.error('Unexpected "=" found; an operator was already defined.', {
              index: token[_tokenize.FIELDS.START_POS]
            });
          }

          node.operator = node.operator ? node.operator + content : content;
          lastAdded = 'operator';
          spaceAfterMeaningfulToken = false;
          break;

        case tokens.comment:
          if (lastAdded) {
            if (spaceAfterMeaningfulToken || next && next[_tokenize.FIELDS.TYPE] === tokens.space || lastAdded === 'insensitive') {
              var lastComment = (0, util.getProp)(node, 'spaces', lastAdded, 'after') || '';
              var rawLastComment = (0, util.getProp)(node, 'raws', 'spaces', lastAdded, 'after') || lastComment;
              (0, util.ensureObject)(node, 'raws', 'spaces', lastAdded);
              node.raws.spaces[lastAdded].after = rawLastComment + content;
            } else {
              var lastValue = node[lastAdded] || '';
              var rawLastValue = (0, util.getProp)(node, 'raws', lastAdded) || lastValue;
              (0, util.ensureObject)(node, 'raws');
              node.raws[lastAdded] = rawLastValue + content;
            }
          } else {
            commentBefore = commentBefore + content;
          }

          break;

        default:
          return this.error("Unexpected \"" + content + "\" found.", {
            index: token[_tokenize.FIELDS.START_POS]
          });
      }

      pos++;
    }

    unescapeProp(node, "attribute");
    unescapeProp(node, "namespace");
    this.newNode(new _attribute["default"](node));
    this.position++;
  }
  /**
   * return a node containing meaningless garbage up to (but not including) the specified token position.
   * if the token position is negative, all remaining tokens are consumed.
   *
   * This returns an array containing a single string node if all whitespace,
   * otherwise an array of comment nodes with space before and after.
   *
   * These tokens are not added to the current selector, the caller can add them or use them to amend
   * a previous node's space metadata.
   *
   * In lossy mode, this returns only comments.
   */
  ;

  _proto.parseWhitespaceEquivalentTokens = function parseWhitespaceEquivalentTokens(stopPosition) {
    if (stopPosition < 0) {
      stopPosition = this.tokens.length;
    }

    var startPosition = this.position;
    var nodes = [];
    var space = "";
    var lastComment = undefined;

    do {
      if (WHITESPACE_TOKENS[this.currToken[_tokenize.FIELDS.TYPE]]) {
        if (!this.options.lossy) {
          space += this.content();
        }
      } else if (this.currToken[_tokenize.FIELDS.TYPE] === tokens.comment) {
        var spaces = {};

        if (space) {
          spaces.before = space;
          space = "";
        }

        lastComment = new _comment["default"]({
          value: this.content(),
          source: getTokenSource(this.currToken),
          sourceIndex: this.currToken[_tokenize.FIELDS.START_POS],
          spaces: spaces
        });
        nodes.push(lastComment);
      }
    } while (++this.position < stopPosition);

    if (space) {
      if (lastComment) {
        lastComment.spaces.after = space;
      } else if (!this.options.lossy) {
        var firstToken = this.tokens[startPosition];
        var lastToken = this.tokens[this.position - 1];
        nodes.push(new _string["default"]({
          value: '',
          source: getSource(firstToken[_tokenize.FIELDS.START_LINE], firstToken[_tokenize.FIELDS.START_COL], lastToken[_tokenize.FIELDS.END_LINE], lastToken[_tokenize.FIELDS.END_COL]),
          sourceIndex: firstToken[_tokenize.FIELDS.START_POS],
          spaces: {
            before: space,
            after: ''
          }
        }));
      }
    }

    return nodes;
  }
  /**
   * 
   * @param {*} nodes 
   */
  ;

  _proto.convertWhitespaceNodesToSpace = function convertWhitespaceNodesToSpace(nodes, requiredSpace) {
    var _this2 = this;

    if (requiredSpace === void 0) {
      requiredSpace = false;
    }

    var space = "";
    var rawSpace = "";
    nodes.forEach(function (n) {
      var spaceBefore = _this2.lossySpace(n.spaces.before, requiredSpace);

      var rawSpaceBefore = _this2.lossySpace(n.rawSpaceBefore, requiredSpace);

      space += spaceBefore + _this2.lossySpace(n.spaces.after, requiredSpace && spaceBefore.length === 0);
      rawSpace += spaceBefore + n.value + _this2.lossySpace(n.rawSpaceAfter, requiredSpace && rawSpaceBefore.length === 0);
    });

    if (rawSpace === space) {
      rawSpace = undefined;
    }

    var result = {
      space: space,
      rawSpace: rawSpace
    };
    return result;
  };

  _proto.isNamedCombinator = function isNamedCombinator(position) {
    if (position === void 0) {
      position = this.position;
    }

    return this.tokens[position + 0] && this.tokens[position + 0][_tokenize.FIELDS.TYPE] === tokens.slash && this.tokens[position + 1] && this.tokens[position + 1][_tokenize.FIELDS.TYPE] === tokens.word && this.tokens[position + 2] && this.tokens[position + 2][_tokenize.FIELDS.TYPE] === tokens.slash;
  };

  _proto.namedCombinator = function namedCombinator() {
    if (this.isNamedCombinator()) {
      var nameRaw = this.content(this.tokens[this.position + 1]);
      var name = (0, util.unesc)(nameRaw).toLowerCase();
      var raws = {};

      if (name !== nameRaw) {
        raws.value = "/" + nameRaw + "/";
      }

      var node = new _combinator["default"]({
        value: "/" + name + "/",
        source: getSource(this.currToken[_tokenize.FIELDS.START_LINE], this.currToken[_tokenize.FIELDS.START_COL], this.tokens[this.position + 2][_tokenize.FIELDS.END_LINE], this.tokens[this.position + 2][_tokenize.FIELDS.END_COL]),
        sourceIndex: this.currToken[_tokenize.FIELDS.START_POS],
        raws: raws
      });
      this.position = this.position + 3;
      return node;
    } else {
      this.unexpected();
    }
  };

  _proto.combinator = function combinator() {
    var _this3 = this;

    if (this.content() === '|') {
      return this.namespace();
    } // We need to decide between a space that's a descendant combinator and meaningless whitespace at the end of a selector.


    var nextSigTokenPos = this.locateNextMeaningfulToken(this.position);

    if (nextSigTokenPos < 0 || this.tokens[nextSigTokenPos][_tokenize.FIELDS.TYPE] === tokens.comma) {
      var nodes = this.parseWhitespaceEquivalentTokens(nextSigTokenPos);

      if (nodes.length > 0) {
        var last = this.current.last;

        if (last) {
          var _this$convertWhitespa = this.convertWhitespaceNodesToSpace(nodes),
              space = _this$convertWhitespa.space,
              rawSpace = _this$convertWhitespa.rawSpace;

          if (rawSpace !== undefined) {
            last.rawSpaceAfter += rawSpace;
          }

          last.spaces.after += space;
        } else {
          nodes.forEach(function (n) {
            return _this3.newNode(n);
          });
        }
      }

      return;
    }

    var firstToken = this.currToken;
    var spaceOrDescendantSelectorNodes = undefined;

    if (nextSigTokenPos > this.position) {
      spaceOrDescendantSelectorNodes = this.parseWhitespaceEquivalentTokens(nextSigTokenPos);
    }

    var node;

    if (this.isNamedCombinator()) {
      node = this.namedCombinator();
    } else if (this.currToken[_tokenize.FIELDS.TYPE] === tokens.combinator) {
      node = new _combinator["default"]({
        value: this.content(),
        source: getTokenSource(this.currToken),
        sourceIndex: this.currToken[_tokenize.FIELDS.START_POS]
      });
      this.position++;
    } else if (WHITESPACE_TOKENS[this.currToken[_tokenize.FIELDS.TYPE]]) ; else if (!spaceOrDescendantSelectorNodes) {
      this.unexpected();
    }

    if (node) {
      if (spaceOrDescendantSelectorNodes) {
        var _this$convertWhitespa2 = this.convertWhitespaceNodesToSpace(spaceOrDescendantSelectorNodes),
            _space = _this$convertWhitespa2.space,
            _rawSpace = _this$convertWhitespa2.rawSpace;

        node.spaces.before = _space;
        node.rawSpaceBefore = _rawSpace;
      }
    } else {
      // descendant combinator
      var _this$convertWhitespa3 = this.convertWhitespaceNodesToSpace(spaceOrDescendantSelectorNodes, true),
          _space2 = _this$convertWhitespa3.space,
          _rawSpace2 = _this$convertWhitespa3.rawSpace;

      if (!_rawSpace2) {
        _rawSpace2 = _space2;
      }

      var spaces = {};
      var raws = {
        spaces: {}
      };

      if (_space2.endsWith(' ') && _rawSpace2.endsWith(' ')) {
        spaces.before = _space2.slice(0, _space2.length - 1);
        raws.spaces.before = _rawSpace2.slice(0, _rawSpace2.length - 1);
      } else if (_space2.startsWith(' ') && _rawSpace2.startsWith(' ')) {
        spaces.after = _space2.slice(1);
        raws.spaces.after = _rawSpace2.slice(1);
      } else {
        raws.value = _rawSpace2;
      }

      node = new _combinator["default"]({
        value: ' ',
        source: getTokenSourceSpan(firstToken, this.tokens[this.position - 1]),
        sourceIndex: firstToken[_tokenize.FIELDS.START_POS],
        spaces: spaces,
        raws: raws
      });
    }

    if (this.currToken && this.currToken[_tokenize.FIELDS.TYPE] === tokens.space) {
      node.spaces.after = this.optionalSpace(this.content());
      this.position++;
    }

    return this.newNode(node);
  };

  _proto.comma = function comma() {
    if (this.position === this.tokens.length - 1) {
      this.root.trailingComma = true;
      this.position++;
      return;
    }

    this.current._inferEndPosition();

    var selector = new _selector["default"]({
      source: {
        start: tokenStart(this.tokens[this.position + 1])
      }
    });
    this.current.parent.append(selector);
    this.current = selector;
    this.position++;
  };

  _proto.comment = function comment() {
    var current = this.currToken;
    this.newNode(new _comment["default"]({
      value: this.content(),
      source: getTokenSource(current),
      sourceIndex: current[_tokenize.FIELDS.START_POS]
    }));
    this.position++;
  };

  _proto.error = function error(message, opts) {
    throw this.root.error(message, opts);
  };

  _proto.missingBackslash = function missingBackslash() {
    return this.error('Expected a backslash preceding the semicolon.', {
      index: this.currToken[_tokenize.FIELDS.START_POS]
    });
  };

  _proto.missingParenthesis = function missingParenthesis() {
    return this.expected('opening parenthesis', this.currToken[_tokenize.FIELDS.START_POS]);
  };

  _proto.missingSquareBracket = function missingSquareBracket() {
    return this.expected('opening square bracket', this.currToken[_tokenize.FIELDS.START_POS]);
  };

  _proto.unexpected = function unexpected() {
    return this.error("Unexpected '" + this.content() + "'. Escaping special characters with \\ may help.", this.currToken[_tokenize.FIELDS.START_POS]);
  };

  _proto.namespace = function namespace() {
    var before = this.prevToken && this.content(this.prevToken) || true;

    if (this.nextToken[_tokenize.FIELDS.TYPE] === tokens.word) {
      this.position++;
      return this.word(before);
    } else if (this.nextToken[_tokenize.FIELDS.TYPE] === tokens.asterisk) {
      this.position++;
      return this.universal(before);
    }
  };

  _proto.nesting = function nesting() {
    if (this.nextToken) {
      var nextContent = this.content(this.nextToken);

      if (nextContent === "|") {
        this.position++;
        return;
      }
    }

    var current = this.currToken;
    this.newNode(new _nesting["default"]({
      value: this.content(),
      source: getTokenSource(current),
      sourceIndex: current[_tokenize.FIELDS.START_POS]
    }));
    this.position++;
  };

  _proto.parentheses = function parentheses() {
    var last = this.current.last;
    var unbalanced = 1;
    this.position++;

    if (last && last.type === types$1.PSEUDO) {
      var selector = new _selector["default"]({
        source: {
          start: tokenStart(this.tokens[this.position - 1])
        }
      });
      var cache = this.current;
      last.append(selector);
      this.current = selector;

      while (this.position < this.tokens.length && unbalanced) {
        if (this.currToken[_tokenize.FIELDS.TYPE] === tokens.openParenthesis) {
          unbalanced++;
        }

        if (this.currToken[_tokenize.FIELDS.TYPE] === tokens.closeParenthesis) {
          unbalanced--;
        }

        if (unbalanced) {
          this.parse();
        } else {
          this.current.source.end = tokenEnd(this.currToken);
          this.current.parent.source.end = tokenEnd(this.currToken);
          this.position++;
        }
      }

      this.current = cache;
    } else {
      // I think this case should be an error. It's used to implement a basic parse of media queries
      // but I don't think it's a good idea.
      var parenStart = this.currToken;
      var parenValue = "(";
      var parenEnd;

      while (this.position < this.tokens.length && unbalanced) {
        if (this.currToken[_tokenize.FIELDS.TYPE] === tokens.openParenthesis) {
          unbalanced++;
        }

        if (this.currToken[_tokenize.FIELDS.TYPE] === tokens.closeParenthesis) {
          unbalanced--;
        }

        parenEnd = this.currToken;
        parenValue += this.parseParenthesisToken(this.currToken);
        this.position++;
      }

      if (last) {
        last.appendToPropertyAndEscape("value", parenValue, parenValue);
      } else {
        this.newNode(new _string["default"]({
          value: parenValue,
          source: getSource(parenStart[_tokenize.FIELDS.START_LINE], parenStart[_tokenize.FIELDS.START_COL], parenEnd[_tokenize.FIELDS.END_LINE], parenEnd[_tokenize.FIELDS.END_COL]),
          sourceIndex: parenStart[_tokenize.FIELDS.START_POS]
        }));
      }
    }

    if (unbalanced) {
      return this.expected('closing parenthesis', this.currToken[_tokenize.FIELDS.START_POS]);
    }
  };

  _proto.pseudo = function pseudo() {
    var _this4 = this;

    var pseudoStr = '';
    var startingToken = this.currToken;

    while (this.currToken && this.currToken[_tokenize.FIELDS.TYPE] === tokens.colon) {
      pseudoStr += this.content();
      this.position++;
    }

    if (!this.currToken) {
      return this.expected(['pseudo-class', 'pseudo-element'], this.position - 1);
    }

    if (this.currToken[_tokenize.FIELDS.TYPE] === tokens.word) {
      this.splitWord(false, function (first, length) {
        pseudoStr += first;

        _this4.newNode(new _pseudo["default"]({
          value: pseudoStr,
          source: getTokenSourceSpan(startingToken, _this4.currToken),
          sourceIndex: startingToken[_tokenize.FIELDS.START_POS]
        }));

        if (length > 1 && _this4.nextToken && _this4.nextToken[_tokenize.FIELDS.TYPE] === tokens.openParenthesis) {
          _this4.error('Misplaced parenthesis.', {
            index: _this4.nextToken[_tokenize.FIELDS.START_POS]
          });
        }
      });
    } else {
      return this.expected(['pseudo-class', 'pseudo-element'], this.currToken[_tokenize.FIELDS.START_POS]);
    }
  };

  _proto.space = function space() {
    var content = this.content(); // Handle space before and after the selector

    if (this.position === 0 || this.prevToken[_tokenize.FIELDS.TYPE] === tokens.comma || this.prevToken[_tokenize.FIELDS.TYPE] === tokens.openParenthesis || this.current.nodes.every(function (node) {
      return node.type === 'comment';
    })) {
      this.spaces = this.optionalSpace(content);
      this.position++;
    } else if (this.position === this.tokens.length - 1 || this.nextToken[_tokenize.FIELDS.TYPE] === tokens.comma || this.nextToken[_tokenize.FIELDS.TYPE] === tokens.closeParenthesis) {
      this.current.last.spaces.after = this.optionalSpace(content);
      this.position++;
    } else {
      this.combinator();
    }
  };

  _proto.string = function string() {
    var current = this.currToken;
    this.newNode(new _string["default"]({
      value: this.content(),
      source: getTokenSource(current),
      sourceIndex: current[_tokenize.FIELDS.START_POS]
    }));
    this.position++;
  };

  _proto.universal = function universal(namespace) {
    var nextToken = this.nextToken;

    if (nextToken && this.content(nextToken) === '|') {
      this.position++;
      return this.namespace();
    }

    var current = this.currToken;
    this.newNode(new _universal["default"]({
      value: this.content(),
      source: getTokenSource(current),
      sourceIndex: current[_tokenize.FIELDS.START_POS]
    }), namespace);
    this.position++;
  };

  _proto.splitWord = function splitWord(namespace, firstCallback) {
    var _this5 = this;

    var nextToken = this.nextToken;
    var word = this.content();

    while (nextToken && ~[tokens.dollar, tokens.caret, tokens.equals, tokens.word].indexOf(nextToken[_tokenize.FIELDS.TYPE])) {
      this.position++;
      var current = this.content();
      word += current;

      if (current.lastIndexOf('\\') === current.length - 1) {
        var next = this.nextToken;

        if (next && next[_tokenize.FIELDS.TYPE] === tokens.space) {
          word += this.requiredSpace(this.content(next));
          this.position++;
        }
      }

      nextToken = this.nextToken;
    }

    var hasClass = indexesOf(word, '.').filter(function (i) {
      // Allow escaped dot within class name
      var escapedDot = word[i - 1] === '\\'; // Allow decimal numbers percent in @keyframes

      var isKeyframesPercent = /^\d+\.\d+%$/.test(word);
      return !escapedDot && !isKeyframesPercent;
    });
    var hasId = indexesOf(word, '#').filter(function (i) {
      return word[i - 1] !== '\\';
    }); // Eliminate Sass interpolations from the list of id indexes

    var interpolations = indexesOf(word, '#{');

    if (interpolations.length) {
      hasId = hasId.filter(function (hashIndex) {
        return !~interpolations.indexOf(hashIndex);
      });
    }

    var indices = (0, _sortAscending["default"])(uniqs([0].concat(hasClass, hasId)));
    indices.forEach(function (ind, i) {
      var index = indices[i + 1] || word.length;
      var value = word.slice(ind, index);

      if (i === 0 && firstCallback) {
        return firstCallback.call(_this5, value, indices.length);
      }

      var node;
      var current = _this5.currToken;
      var sourceIndex = current[_tokenize.FIELDS.START_POS] + indices[i];
      var source = getSource(current[1], current[2] + ind, current[3], current[2] + (index - 1));

      if (~hasClass.indexOf(ind)) {
        var classNameOpts = {
          value: value.slice(1),
          source: source,
          sourceIndex: sourceIndex
        };
        node = new _className["default"](unescapeProp(classNameOpts, "value"));
      } else if (~hasId.indexOf(ind)) {
        var idOpts = {
          value: value.slice(1),
          source: source,
          sourceIndex: sourceIndex
        };
        node = new _id["default"](unescapeProp(idOpts, "value"));
      } else {
        var tagOpts = {
          value: value,
          source: source,
          sourceIndex: sourceIndex
        };
        unescapeProp(tagOpts, "value");
        node = new _tag["default"](tagOpts);
      }

      _this5.newNode(node, namespace); // Ensure that the namespace is used only once


      namespace = null;
    });
    this.position++;
  };

  _proto.word = function word(namespace) {
    var nextToken = this.nextToken;

    if (nextToken && this.content(nextToken) === '|') {
      this.position++;
      return this.namespace();
    }

    return this.splitWord(namespace);
  };

  _proto.loop = function loop() {
    while (this.position < this.tokens.length) {
      this.parse(true);
    }

    this.current._inferEndPosition();

    return this.root;
  };

  _proto.parse = function parse(throwOnParenthesis) {
    switch (this.currToken[_tokenize.FIELDS.TYPE]) {
      case tokens.space:
        this.space();
        break;

      case tokens.comment:
        this.comment();
        break;

      case tokens.openParenthesis:
        this.parentheses();
        break;

      case tokens.closeParenthesis:
        if (throwOnParenthesis) {
          this.missingParenthesis();
        }

        break;

      case tokens.openSquare:
        this.attribute();
        break;

      case tokens.dollar:
      case tokens.caret:
      case tokens.equals:
      case tokens.word:
        this.word();
        break;

      case tokens.colon:
        this.pseudo();
        break;

      case tokens.comma:
        this.comma();
        break;

      case tokens.asterisk:
        this.universal();
        break;

      case tokens.ampersand:
        this.nesting();
        break;

      case tokens.slash:
      case tokens.combinator:
        this.combinator();
        break;

      case tokens.str:
        this.string();
        break;
      // These cases throw; no break needed.

      case tokens.closeSquare:
        this.missingSquareBracket();

      case tokens.semicolon:
        this.missingBackslash();

      default:
        this.unexpected();
    }
  }
  /**
   * Helpers
   */
  ;

  _proto.expected = function expected(description, index, found) {
    if (Array.isArray(description)) {
      var last = description.pop();
      description = description.join(', ') + " or " + last;
    }

    var an = /^[aeiou]/.test(description[0]) ? 'an' : 'a';

    if (!found) {
      return this.error("Expected " + an + " " + description + ".", {
        index: index
      });
    }

    return this.error("Expected " + an + " " + description + ", found \"" + found + "\" instead.", {
      index: index
    });
  };

  _proto.requiredSpace = function requiredSpace(space) {
    return this.options.lossy ? ' ' : space;
  };

  _proto.optionalSpace = function optionalSpace(space) {
    return this.options.lossy ? '' : space;
  };

  _proto.lossySpace = function lossySpace(space, required) {
    if (this.options.lossy) {
      return required ? ' ' : '';
    } else {
      return space;
    }
  };

  _proto.parseParenthesisToken = function parseParenthesisToken(token) {
    var content = this.content(token);

    if (token[_tokenize.FIELDS.TYPE] === tokens.space) {
      return this.requiredSpace(content);
    } else {
      return content;
    }
  };

  _proto.newNode = function newNode(node, namespace) {
    if (namespace) {
      if (/^ +$/.test(namespace)) {
        if (!this.options.lossy) {
          this.spaces = (this.spaces || '') + namespace;
        }

        namespace = true;
      }

      node.namespace = namespace;
      unescapeProp(node, "namespace");
    }

    if (this.spaces) {
      node.spaces.before = this.spaces;
      this.spaces = '';
    }

    return this.current.append(node);
  };

  _proto.content = function content(token) {
    if (token === void 0) {
      token = this.currToken;
    }

    return this.css.slice(token[_tokenize.FIELDS.START_POS], token[_tokenize.FIELDS.END_POS]);
  };

  /**
   * returns the index of the next non-whitespace, non-comment token.
   * returns -1 if no meaningful token is found.
   */
  _proto.locateNextMeaningfulToken = function locateNextMeaningfulToken(startPosition) {
    if (startPosition === void 0) {
      startPosition = this.position + 1;
    }

    var searchPosition = startPosition;

    while (searchPosition < this.tokens.length) {
      if (WHITESPACE_EQUIV_TOKENS[this.tokens[searchPosition][_tokenize.FIELDS.TYPE]]) {
        searchPosition++;
        continue;
      } else {
        return searchPosition;
      }
    }

    return -1;
  };

  _createClass(Parser, [{
    key: "currToken",
    get: function get() {
      return this.tokens[this.position];
    }
  }, {
    key: "nextToken",
    get: function get() {
      return this.tokens[this.position + 1];
    }
  }, {
    key: "prevToken",
    get: function get() {
      return this.tokens[this.position - 1];
    }
  }]);

  return Parser;
}();

exports["default"] = Parser;
module.exports = exports.default;
});

var processor = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports["default"] = void 0;

var _parser = _interopRequireDefault(parser);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var Processor = /*#__PURE__*/function () {
  function Processor(func, options) {
    this.func = func || function noop() {};

    this.funcRes = null;
    this.options = options;
  }

  var _proto = Processor.prototype;

  _proto._shouldUpdateSelector = function _shouldUpdateSelector(rule, options) {
    if (options === void 0) {
      options = {};
    }

    var merged = Object.assign({}, this.options, options);

    if (merged.updateSelector === false) {
      return false;
    } else {
      return typeof rule !== "string";
    }
  };

  _proto._isLossy = function _isLossy(options) {
    if (options === void 0) {
      options = {};
    }

    var merged = Object.assign({}, this.options, options);

    if (merged.lossless === false) {
      return true;
    } else {
      return false;
    }
  };

  _proto._root = function _root(rule, options) {
    if (options === void 0) {
      options = {};
    }

    var parser = new _parser["default"](rule, this._parseOptions(options));
    return parser.root;
  };

  _proto._parseOptions = function _parseOptions(options) {
    return {
      lossy: this._isLossy(options)
    };
  };

  _proto._run = function _run(rule, options) {
    var _this = this;

    if (options === void 0) {
      options = {};
    }

    return new Promise(function (resolve, reject) {
      try {
        var root = _this._root(rule, options);

        Promise.resolve(_this.func(root)).then(function (transform) {
          var string = undefined;

          if (_this._shouldUpdateSelector(rule, options)) {
            string = root.toString();
            rule.selector = string;
          }

          return {
            transform: transform,
            root: root,
            string: string
          };
        }).then(resolve, reject);
      } catch (e) {
        reject(e);
        return;
      }
    });
  };

  _proto._runSync = function _runSync(rule, options) {
    if (options === void 0) {
      options = {};
    }

    var root = this._root(rule, options);

    var transform = this.func(root);

    if (transform && typeof transform.then === "function") {
      throw new Error("Selector processor returned a promise to a synchronous call.");
    }

    var string = undefined;

    if (options.updateSelector && typeof rule !== "string") {
      string = root.toString();
      rule.selector = string;
    }

    return {
      transform: transform,
      root: root,
      string: string
    };
  }
  /**
   * Process rule into a selector AST.
   *
   * @param rule {postcss.Rule | string} The css selector to be processed
   * @param options The options for processing
   * @returns {Promise<parser.Root>} The AST of the selector after processing it.
   */
  ;

  _proto.ast = function ast(rule, options) {
    return this._run(rule, options).then(function (result) {
      return result.root;
    });
  }
  /**
   * Process rule into a selector AST synchronously.
   *
   * @param rule {postcss.Rule | string} The css selector to be processed
   * @param options The options for processing
   * @returns {parser.Root} The AST of the selector after processing it.
   */
  ;

  _proto.astSync = function astSync(rule, options) {
    return this._runSync(rule, options).root;
  }
  /**
   * Process a selector into a transformed value asynchronously
   *
   * @param rule {postcss.Rule | string} The css selector to be processed
   * @param options The options for processing
   * @returns {Promise<any>} The value returned by the processor.
   */
  ;

  _proto.transform = function transform(rule, options) {
    return this._run(rule, options).then(function (result) {
      return result.transform;
    });
  }
  /**
   * Process a selector into a transformed value synchronously.
   *
   * @param rule {postcss.Rule | string} The css selector to be processed
   * @param options The options for processing
   * @returns {any} The value returned by the processor.
   */
  ;

  _proto.transformSync = function transformSync(rule, options) {
    return this._runSync(rule, options).transform;
  }
  /**
   * Process a selector into a new selector string asynchronously.
   *
   * @param rule {postcss.Rule | string} The css selector to be processed
   * @param options The options for processing
   * @returns {string} the selector after processing.
   */
  ;

  _proto.process = function process(rule, options) {
    return this._run(rule, options).then(function (result) {
      return result.string || result.root.toString();
    });
  }
  /**
   * Process a selector into a new selector string synchronously.
   *
   * @param rule {postcss.Rule | string} The css selector to be processed
   * @param options The options for processing
   * @returns {string} the selector after processing.
   */
  ;

  _proto.processSync = function processSync(rule, options) {
    var result = this._runSync(rule, options);

    return result.string || result.root.toString();
  };

  return Processor;
}();

exports["default"] = Processor;
module.exports = exports.default;
});

var constructors = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports.universal = exports.tag = exports.string = exports.selector = exports.root = exports.pseudo = exports.nesting = exports.id = exports.comment = exports.combinator = exports.className = exports.attribute = void 0;

var _attribute = _interopRequireDefault(attribute);

var _className = _interopRequireDefault(className);

var _combinator = _interopRequireDefault(combinator);

var _comment = _interopRequireDefault(comment);

var _id = _interopRequireDefault(id);

var _nesting = _interopRequireDefault(nesting);

var _pseudo = _interopRequireDefault(pseudo);

var _root = _interopRequireDefault(root);

var _selector = _interopRequireDefault(selector);

var _string = _interopRequireDefault(string);

var _tag = _interopRequireDefault(tag);

var _universal = _interopRequireDefault(universal);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var attribute$1 = function attribute(opts) {
  return new _attribute["default"](opts);
};

exports.attribute = attribute$1;

var className$1 = function className(opts) {
  return new _className["default"](opts);
};

exports.className = className$1;

var combinator$1 = function combinator(opts) {
  return new _combinator["default"](opts);
};

exports.combinator = combinator$1;

var comment$1 = function comment(opts) {
  return new _comment["default"](opts);
};

exports.comment = comment$1;

var id$1 = function id(opts) {
  return new _id["default"](opts);
};

exports.id = id$1;

var nesting$1 = function nesting(opts) {
  return new _nesting["default"](opts);
};

exports.nesting = nesting$1;

var pseudo$1 = function pseudo(opts) {
  return new _pseudo["default"](opts);
};

exports.pseudo = pseudo$1;

var root$1 = function root(opts) {
  return new _root["default"](opts);
};

exports.root = root$1;

var selector$1 = function selector(opts) {
  return new _selector["default"](opts);
};

exports.selector = selector$1;

var string$1 = function string(opts) {
  return new _string["default"](opts);
};

exports.string = string$1;

var tag$1 = function tag(opts) {
  return new _tag["default"](opts);
};

exports.tag = tag$1;

var universal$1 = function universal(opts) {
  return new _universal["default"](opts);
};

exports.universal = universal$1;
});

var guards = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports.isNode = isNode;
exports.isPseudoElement = isPseudoElement;
exports.isPseudoClass = isPseudoClass;
exports.isContainer = isContainer;
exports.isNamespace = isNamespace;
exports.isUniversal = exports.isTag = exports.isString = exports.isSelector = exports.isRoot = exports.isPseudo = exports.isNesting = exports.isIdentifier = exports.isComment = exports.isCombinator = exports.isClassName = exports.isAttribute = void 0;



var _IS_TYPE;

var IS_TYPE = (_IS_TYPE = {}, _IS_TYPE[types.ATTRIBUTE] = true, _IS_TYPE[types.CLASS] = true, _IS_TYPE[types.COMBINATOR] = true, _IS_TYPE[types.COMMENT] = true, _IS_TYPE[types.ID] = true, _IS_TYPE[types.NESTING] = true, _IS_TYPE[types.PSEUDO] = true, _IS_TYPE[types.ROOT] = true, _IS_TYPE[types.SELECTOR] = true, _IS_TYPE[types.STRING] = true, _IS_TYPE[types.TAG] = true, _IS_TYPE[types.UNIVERSAL] = true, _IS_TYPE);

function isNode(node) {
  return typeof node === "object" && IS_TYPE[node.type];
}

function isNodeType(type, node) {
  return isNode(node) && node.type === type;
}

var isAttribute = isNodeType.bind(null, types.ATTRIBUTE);
exports.isAttribute = isAttribute;
var isClassName = isNodeType.bind(null, types.CLASS);
exports.isClassName = isClassName;
var isCombinator = isNodeType.bind(null, types.COMBINATOR);
exports.isCombinator = isCombinator;
var isComment = isNodeType.bind(null, types.COMMENT);
exports.isComment = isComment;
var isIdentifier = isNodeType.bind(null, types.ID);
exports.isIdentifier = isIdentifier;
var isNesting = isNodeType.bind(null, types.NESTING);
exports.isNesting = isNesting;
var isPseudo = isNodeType.bind(null, types.PSEUDO);
exports.isPseudo = isPseudo;
var isRoot = isNodeType.bind(null, types.ROOT);
exports.isRoot = isRoot;
var isSelector = isNodeType.bind(null, types.SELECTOR);
exports.isSelector = isSelector;
var isString = isNodeType.bind(null, types.STRING);
exports.isString = isString;
var isTag = isNodeType.bind(null, types.TAG);
exports.isTag = isTag;
var isUniversal = isNodeType.bind(null, types.UNIVERSAL);
exports.isUniversal = isUniversal;

function isPseudoElement(node) {
  return isPseudo(node) && node.value && (node.value.startsWith("::") || node.value.toLowerCase() === ":before" || node.value.toLowerCase() === ":after" || node.value.toLowerCase() === ":first-letter" || node.value.toLowerCase() === ":first-line");
}

function isPseudoClass(node) {
  return isPseudo(node) && !isPseudoElement(node);
}

function isContainer(node) {
  return !!(isNode(node) && node.walk);
}

function isNamespace(node) {
  return isAttribute(node) || isTag(node);
}
});

var selectors = createCommonjsModule(function (module, exports) {

exports.__esModule = true;



Object.keys(types).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === types[key]) return;
  exports[key] = types[key];
});



Object.keys(constructors).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === constructors[key]) return;
  exports[key] = constructors[key];
});



Object.keys(guards).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === guards[key]) return;
  exports[key] = guards[key];
});
});

var dist = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports["default"] = void 0;

var _processor = _interopRequireDefault(processor);

var selectors$1 = _interopRequireWildcard(selectors);

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function _getRequireWildcardCache() { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var parser = function parser(processor) {
  return new _processor["default"](processor);
};

Object.assign(parser, selectors$1);
delete parser.__esModule;
var _default = parser;
exports["default"] = _default;
module.exports = exports.default;
});

var selectorParser = /*@__PURE__*/getDefaultExportFromCjs(dist);

const matchPlugin = (rules, options, {
  layer,
  context,
  prefixIdentifier
}) => {
  const defaultOptions = {
    respectPrefix: true,
    respectImportant: layer === 'utilities'
  };
  options = _extends({}, defaultOptions, options);

  for (const [identifier] of Object.entries(rules)) {
    const prefixedIdentifier = prefixIdentifier(identifier, options);
    const rule = rules[identifier]; // eslint-disable-next-line no-inner-declarations

    function wrapped() {
      const value = [];

      for (const configValue of Object.values(options.values)) {
        const result = toArray(rule(configValue)).map(val => ({
          [['.', prefixedIdentifier, '-', configValue].join('')]: // eslint-disable-next-line unicorn/prefer-object-from-entries
          Object.entries(val).reduce((result, [prop, value]) => _extends({}, result, {
            [typeof value === 'string' ? formatCssProperty(prop) : prop]: value
          }), {})
        }));
        value.push(deepMerge__default["default"]({}, ...result));
      }

      if (value === undefined) return {};
      return deepMerge__default["default"]({}, ...value);
    }

    const withOffsets = [{
      layer,
      options
    }, wrapped];

    if (!context.candidateRuleMap.has(prefixedIdentifier)) {
      context.candidateRuleMap.set(prefixedIdentifier, []);
    }

    context.candidateRuleMap.get(prefixedIdentifier).push(withOffsets);
  }
};

const asPlugin = (rules, options, {
  layer,
  context,
  prefixIdentifier
}) => {
  const defaultOptions = {
    respectPrefix: true,
    respectImportant: layer === 'utilities'
  };
  options = Object.assign({}, defaultOptions, Array.isArray(options) ? {} : options);

  for (const [identifier, rule] of withIdentifiers(rules)) {
    const prefixedIdentifier = prefixIdentifier(identifier, options);

    if (!context.candidateRuleMap.has(prefixedIdentifier)) {
      context.candidateRuleMap.set(prefixedIdentifier, []);
    }

    context.candidateRuleMap.get(prefixedIdentifier).push([{
      layer,
      options
    }, rule]);
  }
};

function buildPluginApi(tailwindConfig, context) {
  function getConfigValue(path, defaultValue) {
    return path ? dlv(tailwindConfig, path, defaultValue) : tailwindConfig;
  }

  function prefixIdentifier(identifier, options) {
    if (identifier === '*') {
      return '*';
    }

    if (!options.respectPrefix) {
      return identifier;
    }

    return context.tailwindConfig.prefix + identifier;
  }

  const {
    allowUnsupportedPlugins
  } = context.configTwin;
  return {
    addVariant() {
      throwIf(!allowUnsupportedPlugins, () => getUnsupportedError('addVariant()'));
      return null;
    },

    postcss: postcss__default["default"],
    prefix: prefix => prefix,
    // Customised
    e: className => className.replace(/\./g, '\\.'),
    config: getConfigValue,

    theme(path, defaultValue) {
      const [pathRoot, ...subPaths] = toPath.toPath(path);
      const value = getConfigValue(['theme', pathRoot, ...subPaths], defaultValue);
      return transformThemeValue__default["default"](pathRoot)(value);
    },

    corePlugins() {
      throwIf(!allowUnsupportedPlugins, () => getUnsupportedError('corePlugins()'));
      return null;
    },

    variants() {
      // Preserved for backwards compatibility but not used in v3.0+
      return [];
    },

    addUserCss() {
      throwIf(!allowUnsupportedPlugins, () => getUnsupportedError('addUserCss()'));
      return null;
    },

    addBase(base) {
      for (const [identifier, rule] of withIdentifiers(base)) {
        const prefixedIdentifier = prefixIdentifier(identifier, {});

        if (!context.candidateRuleMap.has(prefixedIdentifier)) {
          context.candidateRuleMap.set(prefixedIdentifier, []);
        }

        context.candidateRuleMap.get(prefixedIdentifier).push([{
          layer: 'base'
        }, rule]);
      }
    },

    addDefaults() {
      throwIf(!allowUnsupportedPlugins, () => getUnsupportedError('addDefaults()'));
      return null;
    },

    addComponents: (components, options) => asPlugin(components, options, {
      layer: 'components',
      prefixIdentifier,
      context
    }),
    matchComponents: (components, options) => matchPlugin(components, options, {
      layer: 'components',
      prefixIdentifier,
      context
    }),
    addUtilities: (utilities, options) => asPlugin(utilities, options, {
      layer: 'utilities',
      prefixIdentifier,
      context
    }),
    matchUtilities: (utilities, options) => matchPlugin(utilities, options, {
      layer: 'utilities',
      prefixIdentifier,
      context
    })
  };
}

function withIdentifiers(styles) {
  return parseStyles(styles).flatMap(node => {
    const nodeMap = new Map();
    const candidates = extractCandidates(node); // If this isn't "on-demandable", assign it a universal candidate.

    if (candidates.length === 0) {
      return [['*', node]];
    }

    return candidates.map(c => {
      if (!nodeMap.has(node)) {
        nodeMap.set(node, node);
      }

      return [c, nodeMap.get(node)];
    });
  });
}

function extractCandidates(node) {
  let classes = [];

  if (node.type === 'rule') {
    for (const selector of node.selectors) {
      const classCandidates = getClasses(selector); // At least one of the selectors contains non-"on-demandable" candidates.

      if (classCandidates.length === 0) return [];
      classes = [...classes, ...classCandidates];
    }

    return classes;
  }

  if (node.type === 'atrule') {
    node.walkRules(rule => {
      classes = [...classes, ...rule.selectors.flatMap(selector => getClasses(selector))];
    });
  }

  return classes;
}

function getClasses(selector) {
  const parser = selectorParser(selectors => {
    const allClasses = [];
    selectors.walkClasses(classNode => {
      allClasses.push(classNode.value);
    });
    return allClasses;
  });
  return parser.transformSync(selector);
}

function parseStyles(styles) {
  if (!Array.isArray(styles)) {
    return parseStyles([styles]);
  }

  return styles.flatMap(style => {
    const isNode = !Array.isArray(style) && !isPlainObject__default["default"](style);
    return isNode ? style : parseObjectStyles__default["default"](style);
  });
}

const stripLeadingDot = string => string.startsWith('.') ? string.slice(1) : string;

const replaceSelectorWithParent = (string, replacement) => string.replace(replacement, `{{${stripLeadingDot(replacement)}}}`);

const parseSelector = selector => {
  if (!selector) return;
  const matches = selector.trim().match(/^(\S+)(\s+.*?)?$/);
  if (matches === null) return;
  let match = matches[0]; // Fix spacing that goes missing when provided by tailwindcss
  // Unfortunately this removes the ability to have classes on the same element
  // eg: .something.something or &.something

  match = match.replace(/(?<=\w)\./g, ' .'); // If the selector is just a single selector then return

  if (!match.includes(' ')) return match; // Look for class matching candidates

  const match2 = match.match(/(?<=>|^|~|\+|\*| )\.[\w.\\-]+(?= |>|~|\+|\*|:|$)/gm);
  if (!match2) return match; // Wrap the matching classes in {{class}}

  for (const item of match2) {
    match = replaceSelectorWithParent(match, item);
  }

  return match;
};

const escapeSelector = selector => selector.replace(/\\\//g, '/').trim();

const buildAtSelector = (name, values, screens) => {
  // Support @screen selectors
  if (name === 'screen') {
    const screenValue = screens[values];
    if (screenValue) return `@media (min-width: ${screenValue})`;
  }

  return `@${name} ${values}`;
};

const getBuiltRules = (rule, {
  isBase
}) => {
  if (!rule.selector) return null; // Prep comma spaced selectors for parsing

  const selectorArray = rule.selector.split(','); // Validate each selector

  const selectorParsed = selectorArray.map(s => parseSelector(s)).filter(Boolean); // Join them back into a string

  const selector = selectorParsed.join(','); // Rule isn't formatted correctly

  if (!selector) return null;

  if (isBase) {
    // Base values stay as-is because they aren't interactive
    return {
      [escapeSelector(selector)]: buildDeclaration(rule.nodes)
    };
  } // Separate comma-separated selectors to allow twin's features
  // FIXME: Remove comment and fix next line
  // eslint-disable-next-line unicorn/prefer-object-from-entries


  return selector.split(',').reduce((result, selector) => _extends({}, result, {
    [escapeSelector(selector)]: buildDeclaration(rule.nodes)
  }), {});
};

const buildDeclaration = items => {
  if (typeof items !== 'object') return items; // FIXME: Remove comment and fix next line
  // eslint-disable-next-line unicorn/prefer-object-from-entries

  return Object.entries(items).reduce((result, [, declaration]) => _extends({}, result, {
    [formatCssProperty(declaration.prop)]: declaration.value
  }), {});
};

const sortLength = (a, b) => {
  const selectorA = a.selector ? a.selector.length : 0;
  const selectorB = b.selector ? b.selector.length : 0;
  return selectorA - selectorB;
};

const sortScreenOrder = (a, b, screenOrder) => {
  const screenIndexA = a.name === 'screen' ? screenOrder.indexOf(a.params) : 0;
  const screenIndexB = b.name === 'screen' ? screenOrder.indexOf(b.params) : 0;
  return screenIndexA - screenIndexB;
};

const sortMediaRulesFirst = (a, b) => {
  const atRuleA = a.type === 'atrule' ? 1 : 0;
  const atRuleB = b.type === 'atrule' ? 1 : 0;
  return atRuleA - atRuleB;
};

const ruleSorter = (arr, screens) => {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  const screenOrder = screens ? Object.keys(screens) : [];
  arr // Tailwind also messes up the ordering so classes need to be resorted
  // Order selectors by length (don't know of a better way)
  .sort(sortLength) // Place at rules at the end '@media' etc
  .sort(sortMediaRulesFirst) // Sort @media by screens index
  .sort((a, b) => sortScreenOrder(a, b, screenOrder)) // Traverse children and reorder aswell
  // FIXME: Remove comment and fix next line
  // eslint-disable-next-line unicorn/no-array-for-each
  .forEach(item => {
    if (!item.nodes || item.nodes.length === 0) return; // FIXME: Remove comment and fix next line
    // eslint-disable-next-line unicorn/no-array-for-each

    item.nodes.forEach(i => {
      if (typeof i !== 'object') return;
      return ruleSorter(i, screens);
    });
  });
  return arr;
};

const getUserPluginRules = (rules, screens, isBase) => ruleSorter(rules, screens).reduce((result, rule) => {
  if (typeof rule === 'function') {
    return deepMerge__default["default"](result, rule());
  }

  if (rule.type === 'decl') {
    const builtRules = {
      [rule.prop]: rule.value
    };
    return deepMerge__default["default"](result, builtRules);
  } // Build the media queries


  if (rule.type !== 'atrule') {
    const builtRules = getBuiltRules(rule, {
      isBase
    });
    return deepMerge__default["default"](result, builtRules);
  } // Remove a bunch of nodes that tailwind uses for limiting rule generation
  // https://github.com/tailwindlabs/tailwindcss/commit/b69e46cc1b32608d779dad35121077b48089485d#diff-808341f38c6f7093a7979961a53f5922R20


  if (['layer', 'variants', 'responsive'].includes(rule.name)) {
    return deepMerge__default["default"](result, ...getUserPluginRules(rule.nodes, screens, isBase));
  }

  const atSelector = buildAtSelector(rule.name, rule.params, screens);
  return deepMerge__default["default"](result, {
    [atSelector]: getUserPluginRules(rule.nodes, screens, isBase)
  });
}, {});

const getUserPluginData = ({
  config,
  configTwin
}) => {
  if (!config.plugins || config.plugins.length === 0) {
    return;
  }

  const context = {
    candidateRuleMap: new Map(),
    tailwindConfig: config,
    configTwin
  };
  const pluginApi = buildPluginApi(config, context);
  const userPlugins = config.plugins.map(plugin => {
    if (plugin.__isOptionsFunction) {
      plugin = plugin();
    }

    return typeof plugin === 'function' ? plugin : plugin.handler;
  }); // Call each of the plugins with the pluginApi

  for (const plugin of userPlugins) {
    if (Array.isArray(plugin)) {
      for (const pluginItem of plugin) {
        pluginItem(pluginApi);
      }
    } else {
      plugin(pluginApi);
    }
  }

  const rulesets = context.candidateRuleMap.values();
  const baseRaw = [];
  const componentsRaw = [];
  const utilitiesRaw = []; // eslint-disable-next-line unicorn/prefer-spread

  for (const rules of Array.from(rulesets)) {
    for (const [data, rule] of rules) {
      if (data.layer === 'base') {
        baseRaw.push(rule);
      }

      if (data.layer === 'components') {
        componentsRaw.push(rule);
      }

      if (data.layer === 'utilities') {
        utilitiesRaw.push(rule);
      }
    }
  }
  /**
   * Variants
   */
  // No support for Tailwind's addVariant() function

  /**
   * Base
   */


  const base = getUserPluginRules(baseRaw, config.theme.screens, true);
  /**
   * Components
   */

  const components = getUserPluginRules(componentsRaw, config.theme.screens);
  /**
   * Utilities
   */

  const utilities = getUserPluginRules(utilitiesRaw, config.theme.screens);
  return {
    base,
    components,
    utilities
  };
};

const getPackageUsed = ({
  config: {
    preset
  },
  cssImport,
  styledImport
}) => ({
  isEmotion: preset === 'emotion' || styledImport.from.includes('emotion') || cssImport.from.includes('emotion'),
  isStyledComponents: preset === 'styled-components' || styledImport.from.includes('styled-components') || cssImport.from.includes('styled-components'),
  isGoober: preset === 'goober' || styledImport.from.includes('goober') || cssImport.from.includes('goober'),
  isStitches: preset === 'stitches' || styledImport.from.includes('stitches') || cssImport.from.includes('stitches')
});

const macroTasks = [handleTwFunction, handleGlobalStylesFunction, // GlobalStyles import
updateStyledReferences, // Styled import
handleStyledFunction, // Convert tw.div`` & styled.div`` to styled('div', {}) (stitches)
updateCssReferences, // Update any usage of existing css imports
handleThemeFunction, // Theme import
handleScreenFunction, // Screen import
addStyledImport, addCssImport // Gotcha: Must be after addStyledImport or issues with theme`` style transpile
];

const twinMacro = args => {
  const {
    babel: {
      types: t
    },
    references,
    state,
    config
  } = args;
  validateImports(references);
  const program = state.file.path;
  const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev' || false;
  state.isDev = isDev;
  state.isProd = !isDev;
  const {
    configExists,
    configTailwind
  } = getConfigTailwindProperties(state, config); // Get import presets

  const styledImport = getStyledConfig({
    state,
    config
  });
  const cssImport = getCssConfig({
    state,
    config
  }); // Identify the css-in-js library being used

  const packageUsed = getPackageUsed({
    config,
    cssImport,
    styledImport
  });

  for (const [key, value] of Object.entries(packageUsed)) state[key] = value;

  const configTwin = getConfigTwinValidated(config, state);
  state.configExists = configExists;
  state.config = configTailwind;
  state.configTwin = configTwin;
  state.debug = debug(state);
  state.globalStyles = new Map();
  state.tailwindConfigIdentifier = generateUid('tailwindConfig', program);
  state.tailwindUtilsIdentifier = generateUid('tailwindUtils', program);
  state.userPluginData = getUserPluginData({
    config: state.config,
    configTwin
  });
  isDev && Boolean(config.debugPlugins) && state.userPluginData && debugPlugins(state.userPluginData);
  state.styledImport = styledImport;
  state.cssImport = cssImport; // Init identifiers

  state.styledIdentifier = null;
  state.cssIdentifier = null; // Group traversals together for better performance

  program.traverse({
    ImportDeclaration(path) {
      setStyledIdentifier({
        state,
        path,
        styledImport
      });
      setCssIdentifier({
        state,
        path,
        cssImport
      });
    },

    JSXElement(path) {
      const allAttributes = path.get('openingElement.attributes');
      const jsxAttributes = allAttributes.filter(a => a.isJSXAttribute());
      const {
        index,
        hasCssAttribute
      } = getCssAttributeData(jsxAttributes); // Make sure hasCssAttribute remains true once css prop has been found
      // so twin can add the css prop

      state.hasCssAttribute = state.hasCssAttribute || hasCssAttribute; // Reverse the attributes so the items keep their order when replaced

      const orderedAttributes = index > 1 ? jsxAttributes.reverse() : jsxAttributes;

      for (path of orderedAttributes) {
        handleClassNameProperty({
          path,
          t,
          state
        });
        handleTwProperty({
          path,
          t,
          state,
          program
        });
        handleCsProperty({
          path,
          t,
          state
        });
      }

      hasCssAttribute && convertHtmlElementToStyled({
        path,
        t,
        program,
        state
      });
    }

  });
  if (state.styledIdentifier === null) state.styledIdentifier = generateUid('styled', program);
  if (state.cssIdentifier === null) state.cssIdentifier = generateUid('css', program);

  for (const task of macroTasks) {
    task({
      styledImport,
      cssImport,
      references,
      program,
      config,
      state,
      t
    });
  }

  program.scope.crawl();
};

var macro = babelPluginMacros.createMacro(twinMacro, {
  configName: 'twin'
});

module.exports = macro;
//# sourceMappingURL=macro.js.map
