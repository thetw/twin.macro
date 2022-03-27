function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var babylon = _interopDefault(require('@babel/parser'));
var get = _interopDefault(require('lodash.get'));
var color = require('tailwindcss/lib/util/color');
var chalk = _interopDefault(require('chalk'));
var path = require('path');
var fs = require('fs');
var resolveTailwindConfig = _interopDefault(require('tailwindcss/lib/util/resolveConfig'));
var defaultTailwindConfig = _interopDefault(require('tailwindcss/stubs/defaultConfig.stub'));
var flatMap = _interopDefault(require('lodash.flatmap'));
var template = _interopDefault(require('@babel/template'));
var parseBoxShadowValue = require('tailwindcss/lib/util/parseBoxShadowValue');
var cleanSet = _interopDefault(require('clean-set'));
var timSort = _interopDefault(require('timsort'));
var babelPluginMacros = require('babel-plugin-macros');
var dataTypes = require('tailwindcss/lib/util/dataTypes');
var stringSimilarity = _interopDefault(require('string-similarity'));
var postcss = _interopDefault(require('postcss'));
var util = _interopDefault(require('util'));
var transformThemeValue = _interopDefault(require('tailwindcss/lib/util/transformThemeValue'));
var parseObjectStyles = _interopDefault(require('tailwindcss/lib/util/parseObjectStyles'));
var isPlainObject = _interopDefault(require('tailwindcss/lib/util/isPlainObject'));
var toPath = require('tailwindcss/lib/util/toPath');
var deepMerge = _interopDefault(require('lodash.merge'));

var SPACE_ID = '__SPACE_ID__';

var throwIf = function (expression, callBack) {
  if (!expression) { return; }
  throw new babelPluginMacros.MacroError(callBack());
};

var isEmpty = function (value) { return value === undefined || value === null || typeof value === 'object' && Object.keys(value).length === 0 || typeof value === 'string' && value.trim().length === 0; };

var addPxTo0 = function (string) { return Number(string) === 0 ? (string + "px") : string; };

function transformThemeValue$1(themeSection) {
  if (['fontSize', 'outline'].includes(themeSection)) {
    return function (value) { return Array.isArray(value) ? value[0] : value; };
  }

  if (['fontFamily', 'boxShadow', 'transitionProperty', 'transitionDuration', 'transitionDelay', 'transitionTimingFunction', 'backgroundImage', 'backgroundSize', 'backgroundColor', 'cursor', 'animation'].includes(themeSection)) {
    return function (value) { return Array.isArray(value) ? value.join(', ') : value; };
  }

  if (themeSection === 'colors') {
    return function (value) { return typeof value === 'function' ? value({}) : value; };
  }

  return function (value) { return value; };
}

var objectToStringValues = function (obj) {
  if (typeof obj === 'object' && !Array.isArray(obj)) { return Object.entries(obj).reduce(function (result, ref) {
    var obj;

    var key = ref[0];
    var value = ref[1];
    return deepMerge(result, ( obj = {}, obj[key] = objectToStringValues(value), obj ));
    }, {}); }
  if (Array.isArray(obj)) { return obj.map(function (i) { return objectToStringValues(i); }); }
  if (typeof obj === 'number') { return String(obj); } // typeof obj = string / function

  return obj;
};

var getTheme = function (configTheme) { return function (grab) {
  if (!grab) { return configTheme; } // Allow theme`` which gets supplied as an array

  var value = Array.isArray(grab) ? grab[0] : grab; // Get the theme key so we can apply certain rules in transformThemeValue

  var themeKey = value.split('.')[0]; // Get the resulting value from the config

  var themeValue = get(configTheme, value);
  return objectToStringValues(transformThemeValue$1(themeKey)(themeValue));
}; };

var stripNegative = function (string) { return string && string.length > 1 && string.slice(0, 1) === '-' ? string.slice(1, string.length) : string; };

var camelize = function (string) { return string && string.replace(/\W+(.)/g, function (_, chr) { return chr.toUpperCase(); }); };

var isNumeric = function (str) {
  /* eslint-disable-next-line eqeqeq */
  if (typeof str != 'string') { return false; }
  return !Number.isNaN(str) && !Number.isNaN(Number.parseFloat(str));
};

var isClass = function (str) { return new RegExp(/(\s*\.|{{)\w/).test(str); };

var isMediaQuery = function (str) { return str.startsWith('@media'); };

var isShortCss = function (className) { return new RegExp(/[^/-]\[/).test(className); };

var isArbitraryCss = function (className) { return new RegExp(/-\[/).test(className); }; // Split a string at a value


function splitOnFirst(input, delim) {
  return (function (ref) {
    var first = ref[0];
    var rest = ref.slice(1);

    return [first, rest.join(delim)];
  })(input.split(delim));
}

var formatProp = function (classes) { return classes // Replace the "stand-in spaces" with real ones
.replace(new RegExp(SPACE_ID, 'g'), ' ') // Normalize spacing
.replace(/\s\s+/g, ' ') // Remove newline characters
.replace(/\n/g, ' ').trim(); };

var buildStyleSet = function (property, color$$1, pieces) {
  var obj;

  var value = "" + color$$1 + (pieces.important);
  if (!property) { return value; }
  return ( obj = {}, obj[property] = value, obj );
};

var withAlpha = function (ref) {
  var obj, obj$1;

  var color$$1 = ref.color;
  var property = ref.property;
  var variable = ref.variable;
  var pieces = ref.pieces; if ( pieces === void 0 ) pieces = {};
  var fallBackColor = ref.fallBackColor;
  if (!color$$1) { return; }
  if (Array.isArray(color$$1)) { color$$1 = color$$1.join(','); }

  if (typeof color$$1 === 'function') {
    if (variable && property) {
      if (pieces.hasAlpha) { return buildStyleSet(property, color$$1({
        opacityValue: pieces.alpha
      }), pieces); }
      return ( obj = {}, obj[variable] = '1', obj[property] = ("" + (color$$1({
          opacityVariable: variable,
          opacityValue: ("var(" + variable + ")")
        })) + (pieces.important)), obj );
    }

    color$$1 = color$$1({
      opacityVariable: variable
    });
  }

  var parsed = color.parseColor(color$$1);

  if (parsed === null) {
    // Check for space separated color values
    var spaceMatch = typeof color$$1 === 'string' ? color$$1.split(/\s+(?=[^)\]}]*(?:[([{]|$))/) : [];

    if (spaceMatch.length > 1) {
      var hasValidSpaceSeparatedColors = spaceMatch.every(function (color$$1) { return Boolean(/^var\(--\w*\)$/.exec(color$$1) ? color$$1 : color.parseColor(color$$1)); });
      if (!hasValidSpaceSeparatedColors) { return; }
      return buildStyleSet(property, color$$1, pieces);
    }

    if (dataTypes.gradient(color$$1)) { return buildStyleSet(property, color$$1, pieces); }
    if (fallBackColor) { return buildStyleSet(property, fallBackColor, pieces); }
    return;
  }

  if (parsed.alpha !== undefined) {
    // For gradients
    if (color$$1 === 'transparent' && fallBackColor) { return buildStyleSet(property, color.formatColor(Object.assign({}, parsed,
      {alpha: pieces.alpha})), pieces); } // Has an alpha value, return color as-is

    return buildStyleSet(property, color$$1, pieces);
  }

  if (pieces.alpha) { return buildStyleSet(property, color.formatColor(Object.assign({}, parsed,
    {alpha: pieces.alpha})), pieces); }
  if (variable) { return ( obj$1 = {}, obj$1[variable] = '1', obj$1[property] = ("" + (color.formatColor(Object.assign({}, parsed,
      {alpha: ("var(" + variable + ")")}))) + (pieces.important)), obj$1 ); }
  return buildStyleSet(property, color$$1, pieces);
};

var dynamicStyles = {
  /**
   * ===========================================
   * Layout
   */
  // https://tailwindcss.com/docs/animation
  animate: {
    prop: 'animation',
    plugin: 'animation'
  },
  // https://tailwindcss.com/docs/container
  container: {
    hasArbitrary: false,
    plugin: 'container'
  },
  // https://tailwindcss.com/docs/columns
  columns: {
    prop: 'columns',
    config: 'columns'
  },
  // https://tailwindcss.com/docs/just-in-time-mode#content-utilities
  content: {
    config: 'content',
    value: function (ref) {
      var value = ref.value;
      var isEmotion = ref.isEmotion;

      // Temp fix until emotion supports css variables with the content property
      if (isEmotion) { return {
        content: value
      }; }
      return {
        '--tw-content': value,
        content: 'var(--tw-content)'
      };
    }
  },
  // https://tailwindcss.com/docs/just-in-time-mode#caret-color-utilities
  caret: {
    plugin: 'caretColor',
    value: ['color', 'any'],
    coerced: {
      color: {
        property: 'caretColor'
      },
      any: {
        property: 'caretColor'
      }
    }
  },
  // https://tailwindcss.com/docs/box-sizing
  // https://tailwindcss.com/docs/display
  // https://tailwindcss.com/docs/float
  // https://tailwindcss.com/docs/clear
  // https://tailwindcss.com/docs/object-fit
  // See staticStyles.js
  // https://tailwindcss.com/docs/object-position
  object: {
    prop: 'objectPosition',
    config: 'objectPosition'
  },
  // https://tailwindcss.com/docs/overflow
  // https://tailwindcss.com/docs/position
  // See staticStyles.js
  // https://tailwindcss.com/docs/top-right-bottom-left
  top: {
    prop: 'top',
    config: 'inset'
  },
  bottom: {
    prop: 'bottom',
    config: 'inset'
  },
  right: {
    prop: 'right',
    config: 'inset'
  },
  left: {
    prop: 'left',
    config: 'inset'
  },
  'inset-y': {
    prop: ['top', 'bottom'],
    config: 'inset'
  },
  'inset-x': {
    prop: ['left', 'right'],
    config: 'inset'
  },
  inset: {
    prop: ['top', 'right', 'bottom', 'left'],
    config: 'inset'
  },
  // https://tailwindcss.com/docs/visibility
  // See staticStyles.js
  // https://tailwindcss.com/docs/z-index
  z: {
    prop: 'zIndex',
    config: 'zIndex'
  },
  // https://tailwindcss.com/docs/space
  // space-x-reverse + space-y-reverse are in staticStyles
  'space-y': {
    plugin: 'space',
    value: function (ref) {
      var value = ref.value;

      return ({
      '> :not([hidden]) ~ :not([hidden])': {
        '--tw-space-y-reverse': '0',
        marginTop: ("calc(" + value + " * calc(1 - var(--tw-space-y-reverse)))"),
        marginBottom: ("calc(" + value + " * var(--tw-space-y-reverse))")
      }
    });
}
  },
  'space-x': {
    plugin: 'space',
    value: function (ref) {
      var value = ref.value;

      return ({
      '> :not([hidden]) ~ :not([hidden])': {
        '--tw-space-x-reverse': '0',
        marginRight: ("calc(" + value + " * var(--tw-space-x-reverse))"),
        marginLeft: ("calc(" + value + " * calc(1 - var(--tw-space-x-reverse)))")
      }
    });
}
  },
  // https://tailwindcss.com/docs/divide-width/
  'divide-opacity': {
    prop: '--tw-divide-opacity',
    plugin: 'divide'
  },
  'divide-y': {
    plugin: 'divide',
    value: ['line-width', 'length'],
    coerced: {
      'line-width': function (value) { return ({
        '> :not([hidden]) ~ :not([hidden])': {
          '--tw-divide-y-reverse': '0',
          borderTopWidth: ("calc(" + value + " * calc(1 - var(--tw-divide-y-reverse)))"),
          borderBottomWidth: ("calc(" + value + " * var(--tw-divide-y-reverse))")
        }
      }); },
      length: function (value) { return ({
        '> :not([hidden]) ~ :not([hidden])': {
          '--tw-divide-y-reverse': '0',
          borderTopWidth: ("calc(" + value + " * calc(1 - var(--tw-divide-y-reverse)))"),
          borderBottomWidth: ("calc(" + value + " * var(--tw-divide-y-reverse))")
        }
      }); }
    }
  },
  'divide-x': {
    plugin: 'divide',
    value: ['line-width', 'length'],
    coerced: {
      'line-width': function (value) { return ({
        '> :not([hidden]) ~ :not([hidden])': {
          '--tw-divide-x-reverse': '0',
          borderRightWidth: ("calc(" + value + " * var(--tw-divide-x-reverse))"),
          borderLeftWidth: ("calc(" + value + " * calc(1 - var(--tw-divide-x-reverse)))")
        }
      }); },
      length: function (value) { return ({
        '> :not([hidden]) ~ :not([hidden])': {
          '--tw-divide-x-reverse': '0',
          borderRightWidth: ("calc(" + value + " * var(--tw-divide-x-reverse))"),
          borderLeftWidth: ("calc(" + value + " * calc(1 - var(--tw-divide-x-reverse)))")
        }
      }); }
    }
  },
  divide: {
    plugin: 'divide',
    value: ['color'],
    coerced: {
      color: {
        property: 'borderColor',
        variable: '--tw-divide-opacity',
        wrapWith: '> :not([hidden]) ~ :not([hidden])'
      }
    }
  },

  /**
   * ===========================================
   * Flexbox
   */
  // https://tailwindcss.com/docs/flex-basis
  basis: {
    prop: 'flexBasis',
    config: 'flexBasis'
  },
  // https://tailwindcss.com/docs/flex-direction
  // https://tailwindcss.com/docs/flex-wrap
  // https://tailwindcss.com/docs/flex
  flex: {
    prop: 'flex',
    config: 'flex'
  },
  // https://tailwindcss.com/docs/flex-grow
  'flex-grow': {
    prop: 'flexGrow',
    config: 'flexGrow'
  },
  grow: {
    prop: 'flexGrow',
    config: 'flexGrow'
  },
  // https://tailwindcss.com/docs/flex-shrink
  shrink: {
    prop: 'flexShrink',
    config: 'flexShrink'
  },
  'flex-shrink': {
    prop: 'flexShrink',
    config: 'flexShrink'
  },
  // https://tailwindcss.com/docs/order
  order: {
    prop: 'order',
    config: 'order'
  },

  /**
   * ===========================================
   * Grid
   */
  // https://tailwindcss.com/docs/grid-template-columns
  'grid-cols': {
    prop: 'gridTemplateColumns',
    config: 'gridTemplateColumns'
  },
  // https://tailwindcss.com/docs/grid-column
  col: {
    prop: 'gridColumn',
    config: 'gridColumn'
  },
  'col-start': {
    prop: 'gridColumnStart',
    config: 'gridColumnStart'
  },
  'col-end': {
    prop: 'gridColumnEnd',
    config: 'gridColumnEnd'
  },
  // https://tailwindcss.com/docs/grid-template-rows
  'grid-rows': {
    prop: 'gridTemplateRows',
    config: 'gridTemplateRows'
  },
  // https://tailwindcss.com/docs/grid-row
  // TODO
  // https://tailwindcss.com/docs/grid-row
  row: {
    prop: 'gridRow',
    config: 'gridRow'
  },
  'row-start': {
    prop: 'gridRowStart',
    config: 'gridRowStart'
  },
  'row-end': {
    prop: 'gridRowEnd',
    config: 'gridRowEnd'
  },
  // https://tailwindcss.com/docs/grid-auto-columns
  'auto-cols': {
    prop: 'gridAutoColumns',
    config: 'gridAutoColumns'
  },
  // https://tailwindcss.com/docs/grid-auto-rows
  'auto-rows': {
    prop: 'gridAutoRows',
    config: 'gridAutoRows'
  },
  // https://tailwindcss.com/docs/gap
  gap: {
    prop: 'gap',
    config: 'gap'
  },
  'gap-x': {
    prop: 'columnGap',
    config: 'gap',
    configFallback: 'spacing'
  },
  'gap-y': {
    prop: 'rowGap',
    config: 'gap',
    configFallback: 'spacing'
  },
  // https://tailwindcss.com/docs/align-items
  // https://tailwindcss.com/docs/align-content
  // https://tailwindcss.com/docs/align-self
  // https://tailwindcss.com/docs/justify-content
  // See staticStyles.js
  // Deprecated since tailwindcss v1.7.0
  'col-gap': {
    hasArbitrary: false,
    prop: 'columnGap',
    config: 'gap'
  },
  'row-gap': {
    hasArbitrary: false,
    prop: 'rowGap',
    config: 'gap'
  },

  /**
   * ===========================================
   * Spacing
   */
  // https://tailwindcss.com/docs/padding
  pt: {
    prop: 'paddingTop',
    config: 'padding'
  },
  pr: {
    prop: 'paddingRight',
    config: 'padding'
  },
  pb: {
    prop: 'paddingBottom',
    config: 'padding'
  },
  pl: {
    prop: 'paddingLeft',
    config: 'padding'
  },
  px: {
    prop: ['paddingLeft', 'paddingRight'],
    config: 'padding'
  },
  py: {
    prop: ['paddingTop', 'paddingBottom'],
    config: 'padding'
  },
  p: {
    prop: 'padding',
    config: 'padding'
  },
  // https://tailwindcss.com/docs/margin
  mt: {
    prop: 'marginTop',
    config: 'margin'
  },
  mr: {
    prop: 'marginRight',
    config: 'margin'
  },
  mb: {
    prop: 'marginBottom',
    config: 'margin'
  },
  ml: {
    prop: 'marginLeft',
    config: 'margin'
  },
  mx: {
    prop: ['marginLeft', 'marginRight'],
    config: 'margin'
  },
  my: {
    prop: ['marginTop', 'marginBottom'],
    config: 'margin'
  },
  m: {
    prop: 'margin',
    config: 'margin'
  },

  /**
   * ===========================================
   * Sizing
   */
  // https://tailwindcss.com/docs/width
  w: {
    prop: 'width',
    config: 'width'
  },
  // https://tailwindcss.com/docs/min-width
  'min-w': {
    prop: 'minWidth',
    config: 'minWidth'
  },
  // https://tailwindcss.com/docs/max-width
  'max-w': {
    prop: 'maxWidth',
    config: 'maxWidth'
  },
  // https://tailwindcss.com/docs/height
  h: {
    prop: 'height',
    config: 'height'
  },
  // https://tailwindcss.com/docs/min-height
  'min-h': {
    prop: 'minHeight',
    config: 'minHeight'
  },
  // https://tailwindcss.com/docs/max-height
  'max-h': {
    prop: 'maxHeight',
    config: 'maxHeight'
  },

  /**
   * ===========================================
   * Typography
   */
  font: [// https://tailwindcss.com/docs/font-family
  {
    config: 'fontFamily',
    value: ['generic-name', 'family-name'],
    prop: 'fontFamily',
    coerced: {
      'generic-name': {
        property: 'fontFamily'
      },
      'family-name': {
        property: 'fontFamily'
      }
    }
  }, // https://tailwindcss.com/docs/font-weight
  {
    config: 'fontWeight',
    value: ['number'],
    prop: 'fontWeight',
    coerced: {
      number: {
        property: 'fontWeight'
      }
    }
  }],
  // https://tailwindcss.com/docs/font-smoothing
  // https://tailwindcss.com/docs/font-style
  // See staticStyles.js
  // https://tailwindcss.com/docs/letter-spacing
  tracking: {
    prop: 'letterSpacing',
    config: 'letterSpacing'
  },
  // https://tailwindcss.com/docs/line-height
  leading: {
    prop: 'lineHeight',
    config: 'lineHeight'
  },
  // https://tailwindcss.com/docs/list-style-type
  list: {
    prop: 'listStyleType',
    config: 'listStyleType'
  },
  // https://tailwindcss.com/docs/list-style-position
  // See staticStyles.js
  // https://tailwindcss.com/docs/placeholder-opacity
  'placeholder-opacity': {
    plugin: 'placeholder',
    value: function (ref) {
      var value = ref.value;

      return ({
      '::placeholder': {
        '--tw-placeholder-opacity': value
      }
    });
}
  },
  // https://tailwindcss.com/docs/placeholder-color
  placeholder: {
    plugin: 'placeholder',
    value: ['color', 'any'],
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
  // https://tailwindcss.com/docs/text-align
  // See staticStyles.js
  // https://tailwindcss.com/docs/text-color
  // https://tailwindcss.com/docs/font-size
  'text-opacity': {
    prop: '--tw-text-opacity',
    config: 'textOpacity',
    configFallback: 'opacity'
  },
  text: {
    value: ['color', 'absolute-size', 'relative-size', 'length', 'percentage'],
    plugin: 'text',
    coerced: {
      color: {
        property: 'color',
        variable: '--tw-text-opacity'
      },
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
  },
  // https://tailwindcss.com/docs/text-decoration
  // https://tailwindcss.com/docs/text-transform
  // https://tailwindcss.com/docs/text-overflow
  // See staticStyles.js
  // https://tailwindcss.com/docs/text-indent
  indent: {
    prop: 'textIndent',
    config: 'textIndent',
    configFallback: 'spacing',
    value: ['length', 'position'],
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
    }
  },
  // https://tailwindcss.com/docs/vertical-align
  // https://tailwindcss.com/docs/whitespace
  // https://tailwindcss.com/docs/word-break
  // See staticStyles.js

  /**
   * ===========================================
   * Backgrounds
   */
  // https://tailwindcss.com/docs/background-attachment
  // See staticStyles.js
  // https://tailwindcss.com/docs/background-repeat
  // See staticStyles.js
  // https://tailwindcss.com/docs/background-opacity
  'bg-opacity': {
    prop: '--tw-bg-opacity',
    config: 'backgroundOpacity',
    configFallback: 'opacity'
  },
  // https://tailwindcss.com/docs/gradient-color-stops
  bg: {
    value: ['color', 'url', 'image', 'position', 'length', 'percentage'],
    plugin: 'bg',
    coerced: {
      color: {
        property: 'backgroundColor',
        variable: '--tw-bg-opacity'
      },
      url: {
        property: 'backgroundImage'
      },
      image: {
        property: 'backgroundImage'
      },
      position: {
        property: 'backgroundPosition'
      },
      length: {
        property: 'backgroundSize'
      },
      percentage: {
        property: 'backgroundPosition'
      }
    }
  },
  // https://tailwindcss.com/docs/gradient-color-stops
  from: {
    plugin: 'gradient',
    value: ['color'],
    coerced: {
      color: function (value, ref) {
        var withAlpha = ref.withAlpha;

        return ({
        '--tw-gradient-from': withAlpha(value) || value,
        '--tw-gradient-stops': ("var(--tw-gradient-from), var(--tw-gradient-to, " + (withAlpha(value, '0', 'rgb(255 255 255 / 0)') || value) + ")")
      });
}
    }
  },
  via: {
    plugin: 'gradient',
    value: ['color'],
    coerced: {
      color: function (value, ref) {
        var withAlpha = ref.withAlpha;

        return ({
        '--tw-gradient-stops': ("var(--tw-gradient-from), " + (withAlpha(value) || value) + ", var(--tw-gradient-to, " + (withAlpha(value, '0', 'rgb(255 255 255 / 0)')) + ")")
      });
}
    }
  },
  to: {
    value: ['color'],
    plugin: 'gradient',
    coerced: {
      color: function (value, ref) {
        var withAlpha = ref.withAlpha;

        return ({
        '--tw-gradient-to': ("" + (withAlpha(value) || value))
      });
}
    }
  },

  /**
   * ===========================================
   * Borders
   */
  // https://tailwindcss.com/docs/border-style
  // See staticStyles.js
  // https://tailwindcss.com/docs/border-width
  'border-t': {
    value: ['color', 'line-width', 'length'],
    plugin: 'border',
    coerced: {
      color: {
        property: 'borderTopColor',
        variable: '--tw-border-opacity',
        config: 'borderColor'
      },
      'line-width': {
        property: 'borderTopWidth',
        config: 'borderWidth'
      },
      length: {
        property: 'borderTopWidth',
        config: 'borderWidth'
      }
    }
  },
  'border-b': {
    value: ['color', 'line-width', 'length'],
    plugin: 'border',
    coerced: {
      color: {
        property: 'borderBottomColor',
        variable: '--tw-border-opacity',
        config: 'borderColor'
      },
      'line-width': {
        property: 'borderBottomWidth',
        config: 'borderWidth'
      },
      length: {
        property: 'borderBottomWidth',
        config: 'borderWidth'
      }
    }
  },
  'border-l': {
    value: ['color', 'line-width', 'length'],
    plugin: 'border',
    coerced: {
      color: {
        property: 'borderLeftColor',
        variable: '--tw-border-opacity',
        config: 'borderColor'
      },
      'line-width': {
        property: 'borderLeftWidth',
        config: 'borderWidth'
      },
      length: {
        property: 'borderLeftWidth',
        config: 'borderWidth'
      }
    }
  },
  'border-r': {
    value: ['color', 'line-width', 'length'],
    plugin: 'border',
    coerced: {
      color: {
        property: 'borderRightColor',
        variable: '--tw-border-opacity',
        config: 'borderColor'
      },
      'line-width': {
        property: 'borderRightWidth',
        config: 'borderWidth'
      },
      length: {
        property: 'borderRightWidth',
        config: 'borderWidth'
      }
    }
  },
  'border-x': {
    value: ['color', 'line-width', 'length'],
    plugin: 'border',
    prop: '--tw-border-opacity',
    coerced: {
      color: {
        property: ['borderLeftColor', 'borderRightColor'],
        variable: '--tw-border-opacity',
        config: 'borderColor'
      },
      'line-width': {
        property: ['borderLeftWidth', 'borderRightWidth'],
        config: 'borderWidth'
      },
      length: {
        property: ['borderLeftWidth', 'borderRightWidth'],
        config: 'borderWidth'
      }
    }
  },
  'border-y': {
    value: ['color', 'line-width', 'length'],
    plugin: 'border',
    coerced: {
      color: {
        property: ['borderTopColor', 'borderBottomColor'],
        variable: '--tw-border-opacity',
        config: 'borderColor'
      },
      'line-width': {
        property: ['borderTopColor', 'borderBottomColor'],
        config: 'borderWidth'
      },
      length: {
        property: ['borderTopColor', 'borderBottomColor'],
        config: 'borderWidth'
      }
    }
  },
  'border-opacity': {
    prop: '--tw-border-opacity',
    config: 'borderOpacity',
    configFallback: 'opacity'
  },
  border: {
    value: ['color', 'line-width', 'length'],
    plugin: 'border',
    coerced: {
      color: {
        property: 'borderColor',
        variable: '--tw-border-opacity'
      },
      'line-width': {
        property: 'borderWidth'
      },
      length: {
        property: 'borderWidth'
      }
    }
  },
  // https://tailwindcss.com/docs/border-radius
  'rounded-tl': {
    prop: 'borderTopLeftRadius',
    config: 'borderRadius'
  },
  'rounded-tr': {
    prop: 'borderTopRightRadius',
    config: 'borderRadius'
  },
  'rounded-br': {
    prop: 'borderBottomRightRadius',
    config: 'borderRadius'
  },
  'rounded-bl': {
    prop: 'borderBottomLeftRadius',
    config: 'borderRadius'
  },
  'rounded-t': {
    prop: ['borderTopLeftRadius', 'borderTopRightRadius'],
    config: 'borderRadius'
  },
  'rounded-r': {
    prop: ['borderTopRightRadius', 'borderBottomRightRadius'],
    config: 'borderRadius'
  },
  'rounded-b': {
    prop: ['borderBottomLeftRadius', 'borderBottomRightRadius'],
    config: 'borderRadius'
  },
  'rounded-l': {
    prop: ['borderTopLeftRadius', 'borderBottomLeftRadius'],
    config: 'borderRadius'
  },
  rounded: {
    prop: 'borderRadius',
    config: 'borderRadius'
  },
  // https://tailwindcss.com/docs/ring-opacity
  'ring-opacity': {
    prop: '--tw-ring-opacity',
    config: 'ringOpacity',
    configFallback: 'opacity'
  },
  // https://tailwindcss.com/docs/ring-offset-width
  // https://tailwindcss.com/docs/ring-offset-color
  'ring-offset': {
    prop: '--tw-ring-offset-width',
    value: ['length', 'color'],
    plugin: 'ringOffset',
    coerced: {
      color: {
        property: '--tw-ring-offset-color'
      },
      length: {
        property: '--tw-ring-offset-width'
      }
    }
  },
  // https://tailwindcss.com/docs/ring-width
  // https://tailwindcss.com/docs/ring-color
  ring: {
    plugin: 'ring',
    value: ['color', 'length'],
    coerced: {
      color: {
        property: '--tw-ring-color',
        variable: '--tw-ring-opacity'
      },
      length: function (value) { return ({
        '--tw-ring-offset-shadow': 'var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color)',
        '--tw-ring-shadow': ("var(--tw-ring-inset) 0 0 0 calc(" + value + " + var(--tw-ring-offset-width)) var(--tw-ring-color)"),
        boxShadow: ["var(--tw-ring-offset-shadow)", "var(--tw-ring-shadow)", "var(--tw-shadow, 0 0 #0000)"].join(', ')
      }); }
    }
  },

  /**
   * ===========================================
   * Tables
   */
  // https://tailwindcss.com/docs/border-collapse
  // https://tailwindcss.com/docs/table-layout
  // See staticStyles.js

  /**
   * ===========================================
   * Effects
   */
  // https://tailwindcss.com/docs/box-shadow
  shadow: {
    plugin: 'boxShadow',
    value: ['shadow'],
    coerced: {
      shadow: {
        property: 'boxShadow'
      }
    }
  },
  // https://tailwindcss.com/docs/opacity
  opacity: {
    prop: 'opacity',
    config: 'opacity'
  },

  /**
   * ===========================================
   * Filters
   */
  // https://tailwindcss.com/docs/filter
  // See staticStyles.js
  // https://tailwindcss.com/docs/blur
  blur: {
    value: function (ref) {
      var value = ref.value;

      return ({
      '--tw-blur': ("blur(" + value + ")"),
      filter: 'var(--tw-filter)'
    });
},
    plugin: 'blur'
  },
  // https://tailwindcss.com/docs/brightness
  brightness: {
    value: function (ref) {
      var value = ref.value;

      return ({
      '--tw-brightness': ("brightness(" + value + ")"),
      filter: 'var(--tw-filter)'
    });
},
    plugin: 'brightness'
  },
  // https://tailwindcss.com/docs/contrast
  contrast: {
    value: function (ref) {
      var value = ref.value;

      return ({
      '--tw-contrast': ("contrast(" + value + ")"),
      filter: 'var(--tw-filter)'
    });
},
    plugin: 'contrast'
  },
  // https://tailwindcss.com/docs/drop-shadow
  'drop-shadow': {
    value: function (ref) {
      var value = ref.value;

      return ({
      '--tw-drop-shadow': ("drop-shadow(" + value + ")"),
      filter: 'var(--tw-blur) var(--tw-brightness) var(--tw-contrast) var(--tw-grayscale) var(--tw-hue-rotate) var(--tw-invert) var(--tw-saturate) var(--tw-sepia) var(--tw-drop-shadow)'
    });
},
    plugin: 'dropShadow'
  },
  // https://tailwindcss.com/docs/grayscale
  grayscale: {
    value: function (ref) {
      var value = ref.value;

      return ({
      '--tw-grayscale': ("grayscale(" + value + ")"),
      filter: 'var(--tw-filter)'
    });
},
    plugin: 'grayscale'
  },
  // https://tailwindcss.com/docs/hue-rotate
  'hue-rotate': {
    value: function (ref) {
      var value = ref.value;

      return ({
      '--tw-hue-rotate': ("hue-rotate(" + value + ")"),
      filter: 'var(--tw-filter)'
    });
},
    plugin: 'hueRotate'
  },
  // https://tailwindcss.com/docs/invert
  invert: {
    value: function (ref) {
      var value = ref.value;

      return ({
      '--tw-invert': ("invert(" + value + ")"),
      filter: 'var(--tw-filter)'
    });
},
    plugin: 'invert'
  },
  // https://tailwindcss.com/docs/saturate
  saturate: {
    value: function (ref) {
      var value = ref.value;

      return ({
      '--tw-saturate': ("saturate(" + value + ")"),
      filter: 'var(--tw-filter)'
    });
},
    plugin: 'saturate'
  },
  // https://tailwindcss.com/docs/sepia
  sepia: {
    value: function (ref) {
      var value = ref.value;

      return ({
      '--tw-sepia': ("sepia(" + value + ")"),
      filter: 'var(--tw-filter)'
    });
},
    plugin: 'sepia'
  },
  // https://tailwindcss.com/docs/backdrop-filter
  // https://tailwindcss.com/docs/backdrop-blur
  'backdrop-blur': {
    value: function (ref) {
      var value = ref.value;

      return ({
      '--tw-backdrop-blur': ("blur(" + value + ")"),
      backdropFilter: 'var(--tw-backdrop-filter)'
    });
},
    plugin: 'backdropBlur'
  },
  // https://tailwindcss.com/docs/backdrop-brightness
  'backdrop-brightness': {
    value: function (ref) {
      var value = ref.value;

      return ({
      '--tw-backdrop-brightness': ("brightness(" + value + ")"),
      backdropFilter: 'var(--tw-backdrop-filter)'
    });
},
    plugin: 'backdropBrightness'
  },
  // https://tailwindcss.com/docs/backdrop-contrast
  'backdrop-contrast': {
    value: function (ref) {
      var value = ref.value;

      return ({
      '--tw-backdrop-contrast': ("contrast(" + value + ")"),
      backdropFilter: 'var(--tw-backdrop-filter)'
    });
},
    plugin: 'backdropContrast'
  },
  // https://tailwindcss.com/docs/backdrop-grayscale
  'backdrop-grayscale': {
    value: function (ref) {
      var value = ref.value;

      return ({
      '--tw-backdrop-grayscale': ("grayscale(" + value + ")"),
      backdropFilter: 'var(--tw-backdrop-filter)'
    });
},
    plugin: 'backdropGrayscale'
  },
  // https://tailwindcss.com/docs/backdrop-hue-rotate
  'backdrop-hue-rotate': {
    value: function (ref) {
      var value = ref.value;

      return ({
      '--tw-backdrop-hue-rotate': ("hue-rotate(" + value + ")"),
      backdropFilter: 'var(--tw-backdrop-filter)'
    });
},
    plugin: 'backdropHueRotate'
  },
  // https://tailwindcss.com/docs/backdrop-invert
  'backdrop-invert': {
    value: function (ref) {
      var value = ref.value;

      return ({
      '--tw-backdrop-invert': ("invert(" + value + ")"),
      backdropFilter: 'var(--tw-backdrop-filter)'
    });
},
    plugin: 'backdropInvert'
  },
  // https://tailwindcss.com/docs/backdrop-opacity
  'backdrop-opacity': {
    value: function (ref) {
      var value = ref.value;

      return ({
      '--tw-backdrop-opacity': ("opacity(" + value + ")"),
      backdropFilter: 'var(--tw-backdrop-filter)'
    });
},
    plugin: 'backdropOpacity'
  },
  // https://tailwindcss.com/docs/backdrop-saturate
  'backdrop-saturate': {
    value: function (ref) {
      var value = ref.value;

      return ({
      '--tw-backdrop-saturate': ("saturate(" + value + ")"),
      backdropFilter: 'var(--tw-backdrop-filter)'
    });
},
    plugin: 'backdropSaturate'
  },
  // https://tailwindcss.com/docs/backdrop-sepia
  'backdrop-sepia': {
    value: function (ref) {
      var value = ref.value;

      return ({
      '--tw-backdrop-sepia': ("sepia(" + value + ")"),
      backdropFilter: 'var(--tw-backdrop-filter)'
    });
},
    plugin: 'backdropSepia'
  },

  /**
   * ===========================================
   * Transitions
   */
  // https://tailwindcss.com/docs/transtiion-property
  // Note: Tailwind doesn't allow an arbitrary value but it's likely just an accident so it's been added here
  transition: {
    plugin: 'transition',
    value: ['lookup'],
    coerced: {
      lookup: function (value, theme) { return ({
        transitionProperty: value,
        transitionTimingFunction: theme('transitionTimingFunction.DEFAULT'),
        transitionDuration: theme('transitionDuration.DEFAULT')
      }); }
    }
  },
  // https://tailwindcss.com/docs/transition-duration
  duration: {
    prop: 'transitionDuration',
    config: 'transitionDuration'
  },
  // https://tailwindcss.com/docs/transition-timing-function
  ease: {
    prop: 'transitionTimingFunction',
    config: 'transitionTimingFunction'
  },
  // https://tailwindcss.com/docs/transition-delay
  delay: {
    prop: 'transitionDelay',
    config: 'transitionDelay'
  },

  /**
   * ===========================================
   * Transforms
   */
  // https://tailwindcss.com/docs/scale
  'scale-x': {
    value: function (ref) {
      var value = ref.value;
      var negative = ref.negative;

      return ({
      '--tw-scale-x': ("" + negative + value),
      transform: 'var(--tw-transform)'
    });
},
    config: 'scale'
  },
  'scale-y': {
    value: function (ref) {
      var value = ref.value;
      var negative = ref.negative;

      return ({
      '--tw-scale-y': ("" + negative + value),
      transform: 'var(--tw-transform)'
    });
},
    config: 'scale'
  },
  scale: {
    value: function (ref) {
      var value = ref.value;
      var negative = ref.negative;

      return ({
      '--tw-scale-x': ("" + negative + value),
      '--tw-scale-y': ("" + negative + value),
      transform: 'var(--tw-transform)'
    });
},
    config: 'scale'
  },
  // https://tailwindcss.com/docs/rotate
  rotate: {
    value: function (ref) {
      var value = ref.value;
      var negative = ref.negative;

      return ({
      '--tw-rotate': ("" + negative + value),
      transform: 'var(--tw-transform)'
    });
},
    config: 'rotate'
  },
  // https://tailwindcss.com/docs/translate
  'translate-x': {
    value: function (ref) {
      var value = ref.value;
      var negative = ref.negative;

      return ({
      '--tw-translate-x': ("" + negative + value),
      transform: 'var(--tw-transform)'
    });
},
    config: 'translate'
  },
  'translate-y': {
    value: function (ref) {
      var value = ref.value;
      var negative = ref.negative;

      return ({
      '--tw-translate-y': ("" + negative + value),
      transform: 'var(--tw-transform)'
    });
},
    config: 'translate'
  },
  // https://tailwindcss.com/docs/skew
  'skew-x': {
    value: function (ref) {
      var value = ref.value;
      var negative = ref.negative;

      return ({
      '--tw-skew-x': ("" + negative + value),
      transform: 'var(--tw-transform)'
    });
},
    config: 'skew'
  },
  'skew-y': {
    value: function (ref) {
      var value = ref.value;
      var negative = ref.negative;

      return ({
      '--tw-skew-y': ("" + negative + value),
      transform: 'var(--tw-transform)'
    });
},
    config: 'skew'
  },
  // https://tailwindcss.com/docs/transform-origin
  origin: {
    prop: 'transformOrigin',
    config: 'transformOrigin'
  },

  /**
   * ===========================================
   * Interactivity
   */
  // https://tailwindcss.com/docs/accent-color
  accent: {
    plugin: 'accentColor',
    prop: 'accentColor',
    value: ['color', 'any'],
    coerced: {
      color: {
        property: 'accentColor'
      },
      any: {
        property: 'accentColor'
      }
    }
  },
  // https://tailwindcss.com/docs/appearance
  // See staticStyles.js
  // https://tailwindcss.com/docs/cursor
  cursor: {
    prop: 'cursor',
    config: 'cursor'
  },
  // https://tailwindcss.com/docs/outline
  outline: {
    prop: 'outlineColor',
    values: ['length', 'number', 'color', 'percentage'],
    coerced: {
      length: {
        property: 'outlineWidth'
      },
      number: {
        property: 'outlineWidth'
      },
      color: {
        property: 'outlineColor'
      },
      percentage: {
        property: 'outlineWidth'
      }
    }
  },
  // https://tailwindcss.com/docs/pointer-events
  // https://tailwindcss.com/docs/resize
  // https://tailwindcss.com/docs/scroll-margin
  'scroll-m': {
    prop: 'scrollMargin',
    config: 'scrollMargin'
  },
  'scroll-mx': {
    prop: ['scrollMarginLeft', 'scrollMarginRight'],
    config: 'scrollMargin'
  },
  'scroll-my': {
    prop: ['scrollMarginTop', 'scrollMarginBottom'],
    config: 'scrollMargin'
  },
  'scroll-mt': {
    prop: 'scrollMarginTop',
    config: 'scrollMargin'
  },
  'scroll-mr': {
    prop: 'scrollMarginRight',
    config: 'scrollMargin'
  },
  'scroll-mb': {
    prop: 'scrollMarginBottom',
    config: 'scrollMargin'
  },
  'scroll-ml': {
    prop: 'scrollMarginLeft',
    config: 'scrollMargin'
  },
  // https://tailwindcss.com/docs/scroll-padding
  'scroll-p': {
    prop: 'scrollPadding',
    config: 'scrollPadding'
  },
  'scroll-px': {
    prop: ['scrollPaddingLeft', 'scrollPaddingRight'],
    config: 'scrollPadding'
  },
  'scroll-py': {
    prop: ['scrollPaddingTop', 'scrollPaddingBottom'],
    config: 'scrollPadding'
  },
  'scroll-pt': {
    prop: 'scrollPaddingTop',
    config: 'scrollPadding'
  },
  'scroll-pr': {
    prop: 'scrollPaddingRight',
    config: 'scrollPadding'
  },
  'scroll-pb': {
    prop: 'scrollPaddingBottom',
    config: 'scrollPadding'
  },
  'scroll-pl': {
    prop: 'scrollPaddingLeft',
    config: 'scrollPadding'
  },
  // https://tailwindcss.com/docs/user-select
  // See staticStyles.js
  // https://tailwindcss.com/docs/will-change
  'will-change': {
    prop: 'willChange',
    config: 'willChange'
  },

  /**
   * ===========================================
   * Svg
   */
  // https://tailwindcss.com/docs/fill
  fill: {
    value: ['color', 'any'],
    plugin: 'fill',
    coerced: {
      color: {
        property: 'fill'
      },
      any: {
        property: 'fill'
      }
    }
  },
  // https://tailwindcss.com/docs/stroke
  stroke: {
    value: ['color', 'length', 'number', 'percentage', 'url'],
    plugin: 'stroke',
    coerced: {
      color: {
        property: 'stroke'
      },
      length: {
        property: 'strokeWidth'
      },
      number: {
        property: 'strokeWidth'
      },
      percentage: {
        property: 'strokeWidth'
      },
      url: {
        property: 'stroke'
      }
    }
  },

  /**
   * ===========================================
   * Accessibility
   */
  // https://tailwindcss.com/docs/screen-readers
  // See staticStyles.js

  /**
   * ===========================================
   * Aspect Ratio
   */
  // https://tailwindcss.com/docs/aspect-ratio
  aspect: {
    prop: 'aspectRatio',
    config: 'aspectRatio'
  }
};

// https://tailwindcss.com/docs/font-variant-numeric
// This feature uses var+comment hacks to get around property stripping:
// https://github.com/tailwindlabs/tailwindcss.com/issues/522#issuecomment-687667238
var fontVariants = {
  '--tw-ordinal': 'var(--tw-empty,/*!*/ /*!*/)',
  '--tw-slashed-zero': 'var(--tw-empty,/*!*/ /*!*/)',
  '--tw-numeric-figure': 'var(--tw-empty,/*!*/ /*!*/)',
  '--tw-numeric-spacing': 'var(--tw-empty,/*!*/ /*!*/)',
  '--tw-numeric-fraction': 'var(--tw-empty,/*!*/ /*!*/)',
  fontVariantNumeric: 'var(--tw-ordinal) var(--tw-slashed-zero) var(--tw-numeric-figure) var(--tw-numeric-spacing) var(--tw-numeric-fraction)'
};
var staticStyles = {
  /**
   * ===========================================
   * Layout
   */
  // https://tailwindcss.com/docs/container
  // https://tailwindcss.com/docs/columns
  // See dynamicStyles.js
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
  // https://tailwindcss.com/docs/box-decoration-break
  'decoration-slice': {
    output: {
      boxDecorationBreak: 'slice'
    }
  },
  'decoration-clone': {
    output: {
      boxDecorationBreak: 'clone'
    }
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
  'outline-none': {
    output: {
      outline: 'none'
    }
  },
  // https://tailwindcss.com/docs/display
  hidden: {
    output: {
      display: 'none'
    }
  },
  block: {
    output: {
      display: 'block'
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
  'flow-root': {
    output: {
      display: 'flow-root'
    }
  },
  flex: {
    output: {
      display: 'flex'
    }
  },
  'inline-flex': {
    output: {
      display: 'inline-flex'
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
  // See dynamicStyles.js
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
  'overflow-clip': {
    output: {
      overflow: 'clip'
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
  // See dynamicStyles.js
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
  // https://tailwindcss.com/docs/z-index
  // See dynamicStyles.js
  // https://tailwindcss.com/docs/space
  // See dynamicStyles.js for the rest
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
  // https://tailwindcss.com/docs/divide-width
  // See dynamicStyles.js for the rest
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

  /**
   * ===========================================
   * Flexbox
   */
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
  'flex-nowrap': {
    output: {
      flexWrap: 'nowrap'
    }
  },
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
  // https://tailwindcss.com/docs/align-items
  'items-stretch': {
    output: {
      alignItems: 'stretch'
    }
  },
  'items-start': {
    output: {
      alignItems: 'flex-start'
    }
  },
  'items-center': {
    output: {
      alignItems: 'center'
    }
  },
  'items-end': {
    output: {
      alignItems: 'flex-end'
    }
  },
  'items-baseline': {
    output: {
      alignItems: 'baseline'
    }
  },
  // https://tailwindcss.com/docs/align-content
  'content-start': {
    output: {
      alignContent: 'flex-start'
    }
  },
  'content-center': {
    output: {
      alignContent: 'center'
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
  // https://tailwindcss.com/docs/align-self
  'self-auto': {
    output: {
      alignSelf: 'auto'
    }
  },
  'self-baseline': {
    output: {
      alignSelf: 'baseline'
    }
  },
  'self-start': {
    output: {
      alignSelf: 'flex-start'
    }
  },
  'self-center': {
    output: {
      alignSelf: 'center'
    }
  },
  'self-end': {
    output: {
      alignSelf: 'flex-end'
    }
  },
  'self-stretch': {
    output: {
      alignSelf: 'stretch'
    }
  },
  // https://tailwindcss.com/docs/justify-content
  'justify-start': {
    output: {
      justifyContent: 'flex-start'
    }
  },
  'justify-center': {
    output: {
      justifyContent: 'center'
    }
  },
  'justify-end': {
    output: {
      justifyContent: 'flex-end'
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
  // https://tailwindcss.com/docs/flex
  // https://tailwindcss.com/docs/flex-grow
  // https://tailwindcss.com/docs/flex-shrink
  // https://tailwindcss.com/docs/order
  // See dynamicStyles.js

  /**
   * ===========================================
   * Grid
   */
  // https://tailwindcss.com/docs/grid-template-columns
  // https://tailwindcss.com/docs/grid-column
  // https://tailwindcss.com/docs/grid-template-rows
  // https://tailwindcss.com/docs/grid-row
  // https://tailwindcss.com/docs/gap
  // See dynamicStyles.js
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
  // https://tailwindcss.com/docs/grid-auto-columns
  // https://tailwindcss.com/docs/grid-auto-rows#app
  // See dynamicStyles.js

  /**
   * ===========================================
   * Spacing
   */
  // https://tailwindcss.com/docs/padding
  // https://tailwindcss.com/docs/margin
  // See dynamicStyles.js

  /**
   * ===========================================
   * Sizing
   */
  // https://tailwindcss.com/docs/width
  // https://tailwindcss.com/docs/min-width
  // https://tailwindcss.com/docs/max-width
  // https://tailwindcss.com/docs/height
  // https://tailwindcss.com/docs/min-height
  // https://tailwindcss.com/docs/max-height
  // See dynamicStyles.js

  /**
   * ===========================================
   * Typography
   */
  // https://tailwindcss.com/docs/font-family
  // https://tailwindcss.com/docs/font-size
  // See dynamicStyles.js
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
  // https://tailwindcss.com/docs/font-weight
  // See dynamicStyles.js
  // https://tailwindcss.com/docs/font-variant-numeric
  ordinal: {
    output: Object.assign({}, fontVariants,
      {'--tw-ordinal': 'ordinal'})
  },
  'slashed-zero': {
    output: Object.assign({}, fontVariants,
      {'--tw-slashed-zero': 'slashed-zero'})
  },
  'lining-nums': {
    output: Object.assign({}, fontVariants,
      {'--tw-numeric-figure': 'lining-nums'})
  },
  'oldstyle-nums': {
    output: Object.assign({}, fontVariants,
      {'--tw-numeric-figure': 'oldstyle-nums'})
  },
  'proportional-nums': {
    output: Object.assign({}, fontVariants,
      {'--tw-numeric-spacing': 'proportional-nums'})
  },
  'tabular-nums': {
    output: Object.assign({}, fontVariants,
      {'--tw-numeric-spacing': 'tabular-nums'})
  },
  'diagonal-fractions': {
    output: Object.assign({}, fontVariants,
      {'--tw-numeric-fraction': 'diagonal-fractions'})
  },
  'stacked-fractions': {
    output: Object.assign({}, fontVariants,
      {'--tw-numeric-fraction': 'stacked-fractions'})
  },
  'normal-nums': {
    output: {
      fontVariantNumeric: 'normal'
    }
  },
  // https://tailwindcss.com/docs/letter-spacing
  // https://tailwindcss.com/docs/line-height
  // https://tailwindcss.com/docs/list-style-type
  // See dynamicStyles.js
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
  // https://tailwindcss.com/docs/placeholder-color
  // https://tailwindcss.com/docs/placeholder-opacity
  // See dynamicStyles.js
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
  // https://tailwindcss.com/docs/text-color
  // https://tailwindcss.com/docs/text-opacity
  // See dynamicStyles.js
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
  // https://tailwindcss.com/docs/text-indent
  // See dynamicStyles.js
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
  // https://tailwindcss.com/docs/text-overflow
  truncate: {
    output: {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  },
  'text-ellipsis': {
    output: {
      textOverflow: 'ellipsis'
    }
  },
  'text-clip': {
    output: {
      textOverflow: 'clip'
    }
  },

  /**
   * ===========================================
   * Backgrounds
   */
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
      WebkitBackgroundClip: 'border-box',
      backgroundClip: 'border-box'
    }
  },
  'bg-clip-padding': {
    output: {
      WebkitBackgroundClip: 'padding-box',
      backgroundClip: 'padding-box'
    }
  },
  'bg-clip-content': {
    output: {
      WebkitBackgroundClip: 'content-box',
      backgroundClip: 'content-box'
    }
  },
  'bg-clip-text': {
    output: {
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text'
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
  // https://tailwindcss.com/docs/background-color
  // https://tailwindcss.com/docs/background-size
  // https://tailwindcss.com/docs/background-position
  // See dynamicStyles.js
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
  // https://tailwindcss.com/docs/background-size
  // See dynamicStyles.js
  // https://tailwindcss.com/docs/gradient-color-stops
  // See dynamicStyles.js

  /**
   * ===========================================
   * Borders
   */
  // https://tailwindcss.com/docs/border-radius
  // https://tailwindcss.com/docs/border-width
  // https://tailwindcss.com/docs/border-color
  // https://tailwindcss.com/docs/border-opacity
  // See dynamicStyles.js
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
  'border-none': {
    output: {
      borderStyle: 'none'
    }
  },

  /**
   * ===========================================
   * Effects
   */
  // https://tailwindcss.com/docs/box-shadow/
  // https://tailwindcss.com/docs/opacity
  // See dynamicStyles.js

  /**
   * ===========================================
   * Filters
   */
  // https://tailwindcss.com/docs/filter
  'filter-none': {
    output: {
      filter: 'none'
    }
  },
  filter: {
    output: {
      filter: 'var(--tw-filter)'
    }
  },
  // https://tailwindcss.com/docs/blur
  // https://tailwindcss.com/docs/brightness
  // https://tailwindcss.com/docs/contrast
  // https://tailwindcss.com/docs/drop-shadow
  // https://tailwindcss.com/docs/grayscale
  // https://tailwindcss.com/docs/hue-rotate
  // https://tailwindcss.com/docs/invert
  // https://tailwindcss.com/docs/saturate
  // https://tailwindcss.com/docs/sepia
  // See dynamicStyles.js
  // https://tailwindcss.com/docs/backdrop-filter
  'backdrop-filter-none': {
    output: {
      backdropFilter: 'none'
    }
  },
  'backdrop-filter': {
    output: {
      backdropFilter: 'var(--tw-backdrop-filter)'
    }
  },
  // https://tailwindcss.com/docs/backdrop-blur
  // https://tailwindcss.com/docs/backdrop-brightness
  // https://tailwindcss.com/docs/backdrop-contrast
  // https://tailwindcss.com/docs/backdrop-grayscale
  // https://tailwindcss.com/docs/backdrop-hue-rotate
  // https://tailwindcss.com/docs/backdrop-invert
  // https://tailwindcss.com/docs/backdrop-opacity
  // https://tailwindcss.com/docs/backdrop-saturate
  // https://tailwindcss.com/docs/backdrop-sepia
  // See dynamicStyles.js

  /**
   * ===========================================
   * Tables
   */
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

  /**
   * ===========================================
   * Effects
   */
  // https://tailwindcss.com/docs/box-shadow/
  // https://tailwindcss.com/docs/opacity
  // See dynamicStyles.js
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

  /**
   * ===========================================
   * Transitions
   */
  // https://tailwindcss.com/docs/transition-property
  // https://tailwindcss.com/docs/transition-duration
  // https://tailwindcss.com/docs/transition-timing-function
  // See dynamicStyles.js

  /**
   * ===========================================
   * Transforms
   */
  // https://tailwindcss.com/docs/scale
  // https://tailwindcss.com/docs/rotate
  // https://tailwindcss.com/docs/translate
  // https://tailwindcss.com/docs/skew
  // https://tailwindcss.com/docs/transform-origin
  // See dynamicStyles.js

  /**
   * ===========================================
   * Interactivity
   */
  // https://tailwindcss.com/docs/appearance
  'appearance-none': {
    output: {
      appearance: 'none'
    }
  },
  // https://tailwindcss.com/docs/cursor
  // https://tailwindcss.com/docs/outline
  // See dynamicStyles.js
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
  // https://tailwindcss.com/docs/scroll-margin
  // See dynamicStyles.js
  // https://tailwindcss.com/docs/scroll-padding
  // See dynamicStyles.js
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

  /**
   * ===========================================
   * Svg
   */
  // https://tailwindcss.com/docs/fill
  // https://tailwindcss.com/docs/stroke
  // https://tailwindcss.com/docs/stroke
  // See dynamicStyles.js

  /**
   * ===========================================
   * Accessibility
   */
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
  // Overscroll
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
  // Grid alignment utilities
  // https://github.com/tailwindlabs/tailwindcss/pull/2306
  'justify-items-auto': {
    output: {
      justifyItems: 'auto'
    }
  },
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
  'place-items-auto': {
    output: {
      placeItems: 'auto'
    }
  },
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

  /**
   * ===========================================
   * Special classes
   */
  transform: {
    output: {
      transform: 'var(--tw-transform)'
    }
  },
  'transform-gpu': {
    output: {
      '--tw-transform': 'translate3d(var(--tw-translate-x), var(--tw-translate-y), 0) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))'
    }
  },
  'transform-cpu': {
    output: {
      '--tw-transform': 'translateX(var(--tw-translate-x)) translateY(var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))'
    }
  },
  'transform-none': {
    output: {
      transform: 'none'
    }
  }
};

/**
 * Pseudo-classes (Variants)
 * In Twin, these are always available on just about any class
 *
 * See MDN web docs for more information
 * https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-classes
 */
var variantConfig = function (ref) {
  var variantDarkMode = ref.variantDarkMode;
  var variantLightMode = ref.variantLightMode;
  var prefixDarkLightModeClass = ref.prefixDarkLightModeClass;
  var createPeer = ref.createPeer;

  return ({
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
  'group-hocus': function (variantData) { return prefixDarkLightModeClass('.group:hover &, .group:focus &', variantData); },
  'group-first': function (variantData) { return prefixDarkLightModeClass('.group:first-child &', variantData); },
  'group-last': function (variantData) { return prefixDarkLightModeClass('.group:last-child &', variantData); },
  'group-only': function (variantData) { return prefixDarkLightModeClass('.group:only-child &', variantData); },
  'group-even': function (variantData) { return prefixDarkLightModeClass('.group:nth-child(even) &', variantData); },
  'group-odd': function (variantData) { return prefixDarkLightModeClass('.group:nth-child(odd) &', variantData); },
  'group-first-of-type': function (variantData) { return prefixDarkLightModeClass('.group:first-of-type &', variantData); },
  'group-last-of-type': function (variantData) { return prefixDarkLightModeClass('.group:last-of-type &', variantData); },
  'group-only-of-type': function (variantData) { return prefixDarkLightModeClass('.group:not(:first-of-type) &', variantData); },
  'group-hover': function (variantData) { return prefixDarkLightModeClass('.group:hover &', variantData); },
  'group-focus': function (variantData) { return prefixDarkLightModeClass('.group:focus &', variantData); },
  'group-disabled': function (variantData) { return prefixDarkLightModeClass('.group:disabled &', variantData); },
  'group-active': function (variantData) { return prefixDarkLightModeClass('.group:active &', variantData); },
  'group-target': function (variantData) { return prefixDarkLightModeClass('.group:target &', variantData); },
  'group-visited': function (variantData) { return prefixDarkLightModeClass('.group:visited &', variantData); },
  'group-default': function (variantData) { return prefixDarkLightModeClass('.group:default &', variantData); },
  'group-checked': function (variantData) { return prefixDarkLightModeClass('.group:checked &', variantData); },
  'group-indeterminate': function (variantData) { return prefixDarkLightModeClass('.group:indeterminate &', variantData); },
  'group-placeholder-shown': function (variantData) { return prefixDarkLightModeClass('.group:placeholder-shown &', variantData); },
  'group-autofill': function (variantData) { return prefixDarkLightModeClass('.group:autofill &', variantData); },
  'group-focus-within': function (variantData) { return prefixDarkLightModeClass('.group:focus-within &', variantData); },
  'group-focus-visible': function (variantData) { return prefixDarkLightModeClass('.group:focus-visible &', variantData); },
  'group-required': function (variantData) { return prefixDarkLightModeClass('.group:required &', variantData); },
  'group-valid': function (variantData) { return prefixDarkLightModeClass('.group:valid &', variantData); },
  'group-invalid': function (variantData) { return prefixDarkLightModeClass('.group:invalid &', variantData); },
  'group-in-range': function (variantData) { return prefixDarkLightModeClass('.group:in-range &', variantData); },
  'group-out-of-range': function (variantData) { return prefixDarkLightModeClass('.group:out-of-range &', variantData); },
  'group-read-only': function (variantData) { return prefixDarkLightModeClass('.group:read-only &', variantData); },
  'group-empty': function (variantData) { return prefixDarkLightModeClass('.group:empty &', variantData); },
  'group-open': function (variantData) { return prefixDarkLightModeClass('.group:open &', variantData); },
  'group-not-open': function (variantData) { return prefixDarkLightModeClass('.group:not(:open) &', variantData); },
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
};

function objectWithoutProperties (obj, exclude) { var target = {}; for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k) && exclude.indexOf(k) === -1) target[k] = obj[k]; return target; }

var getCustomSuggestions = function (className) {
  var suggestions = {
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
  if (suggestions) { return suggestions; }
};

var flattenObject = function (object, prefix) {
  if ( prefix === void 0 ) prefix = '';

  if (!object) { return {}; }
  return Object.keys(object).reduce(function (result, k) {
    var pre = prefix.length > 0 ? prefix + '-' : '';
    var value = object[k];
    var fullKey = pre + k;

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

var targetTransforms = [function (ref) {
  var target = ref.target;

  return target === 'DEFAULT' ? '' : target;
}, function (ref) {
  var dynamicKey = ref.dynamicKey;
  var target = ref.target;

  var prefix = target !== stripNegative(target) ? '-' : '';
  return ("" + prefix + ([dynamicKey, stripNegative(target)].filter(Boolean).join('-')));
}];

var filterKeys = function (object, negativesOnly) { return Object.entries(object).reduce(function (result, ref) {
  var obj;

  var k = ref[0];
  var v = ref[1];
  return (Object.assign({}, result,
  ((negativesOnly ? k.startsWith('-') : !k.startsWith('-')) && ( obj = {}, obj[k.replace('-DEFAULT', '')] = v, obj ))));
  }, {}); };

var normalizeDynamicConfig = function (ref) {
  var config = ref.config;
  var input = ref.input;
  var dynamicKey = ref.dynamicKey;
  var hasNegative = ref.hasNegative;

  var results = Object.entries(filterKeys(flattenObject(config), hasNegative)).map(function (ref) {
    var target = ref[0];
    var value = ref[1];

    return (Object.assign({}, (input && {
      rating: stringSimilarity.compareTwoStrings(("-" + target), input)
    }),
    {target: targetTransforms.reduce(function (result, transformer) { return transformer({
      dynamicKey: dynamicKey,
      target: result
    }); }, target),
    value: JSON.stringify(value)}));
  });
  var filteredResults = results.filter(function (item) { return !item.target.includes('-array-') && (input.rating ? typeof item.rating !== 'undefined' : true); });
  return filteredResults;
};

var matchConfig = function (ref) {
  var config = ref.config;
  var theme = ref.theme;
  var className = ref.className;
  var rest$1 = objectWithoutProperties( ref, ["config", "theme", "className"] );
  var rest = rest$1;

  return [].concat( config ).reduce(function (results, item) { return results.concat(normalizeDynamicConfig(Object.assign({}, {config: theme(item),
  input: className},
  rest))); }, []).sort(function (a, b) { return b.rating - a.rating; });
};

var getConfig = function (properties) { return matchConfig(Object.assign({}, properties,
  {className: null})).slice(0, 20); };

var getSuggestions = function (ref) {
  var ref_pieces = ref.pieces;
  var className = ref_pieces.className;
  var hasNegative = ref_pieces.hasNegative;
  var state = ref.state;
  var config = ref.config;
  var dynamicKey = ref.dynamicKey;

  var customSuggestions = getCustomSuggestions(className);
  if (customSuggestions) { return customSuggestions; }

  if (config) {
    var theme = getTheme(state.config.theme);
    var properties = {
      config: config,
      theme: theme,
      dynamicKey: dynamicKey,
      className: className,
      hasNegative: hasNegative
    };
    var dynamicMatches = matchConfig(properties);
    if (dynamicMatches.length === 0) { return getConfig(properties); } // Check if the user means to select a default class

    var defaultFound = dynamicMatches.find(function (match) { return match.target.endsWith('-default') && match.target.replace('-default', '') === className; });
    if (defaultFound) { return defaultFound.target; } // If there's a high rated suggestion then return it

    var trumpMatches = dynamicMatches.filter(function (match) { return match.rating >= 0.5; });
    if (!isEmpty(trumpMatches)) { return trumpMatches; }
    return dynamicMatches;
  } // Static or unmatched className


  var staticClassNames = Object.keys(staticStyles);
  var dynamicClassMatches = Object.entries(dynamicStyles).map(function (ref) {
    var k = ref[0];
    var v = ref[1];

    return typeof v === 'object' ? v.default ? [k, v].join('-') : (k + "-...") : null;
  }).filter(Boolean);
  var matches = stringSimilarity.findBestMatch(className, staticClassNames.concat( dynamicClassMatches)).ratings.filter(function (item) { return item.rating > 0.25; });
  var hasNoMatches = matches.every(function (match) { return match.rating === 0; });
  if (hasNoMatches) { return []; }
  var sortedMatches = matches.sort(function (a, b) { return b.rating - a.rating; });
  var trumpMatch = sortedMatches.find(function (match) { return match.rating >= 0.6; });
  if (trumpMatch) { return trumpMatch.target; }
  return sortedMatches.slice(0, 6);
};

var addDataTwPropToPath = function (ref) {
  var t = ref.t;
  var attributes = ref.attributes;
  var rawClasses = ref.rawClasses;
  var path$$1 = ref.path;
  var state = ref.state;
  var propName = ref.propName; if ( propName === void 0 ) propName = 'data-tw';

  var dataTwPropAllEnvironments = propName === 'data-tw' && state.configTwin.dataTwProp === 'all';
  var dataCsPropAllEnvironments = propName === 'data-cs' && state.configTwin.dataCsProp === 'all';
  if (state.isProd && !dataTwPropAllEnvironments && !dataCsPropAllEnvironments) { return; }
  if (propName === 'data-tw' && !state.configTwin.dataTwProp) { return; }
  if (propName === 'data-cs' && !state.configTwin.dataCsProp) { return; } // Remove the existing debug attribute if you happen to have it

  var dataProperty = attributes.filter( // TODO: Use @babel/plugin-proposal-optional-chaining
  function (p) { return p.node && p.node.name && p.node.name.name === propName; });
  dataProperty.forEach(function (path$$1) { return path$$1.remove(); });
  var classes = formatProp(rawClasses); // Add the attribute

  path$$1.insertAfter(t.jsxAttribute(t.jsxIdentifier(propName), t.stringLiteral(classes)));
};

var addDataPropToExistingPath = function (ref) {
  var t = ref.t;
  var attributes = ref.attributes;
  var rawClasses = ref.rawClasses;
  var path$$1 = ref.path;
  var state = ref.state;
  var propName = ref.propName; if ( propName === void 0 ) propName = 'data-tw';

  var dataTwPropAllEnvironments = propName === 'data-tw' && state.configTwin.dataTwProp === 'all';
  var dataCsPropAllEnvironments = propName === 'data-cs' && state.configTwin.dataCsProp === 'all';
  if (state.isProd && !dataTwPropAllEnvironments && !dataCsPropAllEnvironments) { return; }
  if (propName === 'data-tw' && !state.configTwin.dataTwProp) { return; }
  if (propName === 'data-cs' && !state.configTwin.dataCsProp) { return; } // Append to the existing debug attribute

  var dataProperty = attributes.find( // TODO: Use @babel/plugin-proposal-optional-chaining
  function (p) { return p.node && p.node.name && p.node.name.name === propName; });

  if (dataProperty) {
    try {
      // Existing data prop
      if (dataProperty.node.value.value) {
        dataProperty.node.value.value = "" + ([dataProperty.node.value.value, rawClasses].filter(Boolean).join(' | '));
        return;
      } // New data prop


      dataProperty.node.value.expression.value = "" + ([dataProperty.node.value.expression.value, rawClasses].filter(Boolean).join(' | '));
    } catch (_) {}

    return;
  }

  var classes = formatProp(rawClasses); // Add a new attribute

  path$$1.pushContainer('attributes', t.jSXAttribute(t.jSXIdentifier(propName), t.jSXExpressionContainer(t.stringLiteral(classes))));
};

var color$1 = {
  error: chalk.hex('#ff8383'),
  errorLight: chalk.hex('#ffd3d3'),
  success: chalk.greenBright,
  highlight: chalk.yellowBright,
  highlight2: chalk.blue,
  subdued: chalk.hex('#999')
};

var spaced = function (string) { return ("\n\n" + string + "\n"); };

var warning = function (string) { return color$1.error(("✕ " + string)); };

var inOutPlugins = function (input, output) { return ((color$1.highlight2('→')) + " " + input + " " + (color$1.highlight2(JSON.stringify(output)))); };

var inOut = function (input, output) { return ((color$1.success('✓')) + " " + input + " " + (color$1.success(JSON.stringify(output)))); };

var logNoVariant = function (variant, validVariants) { return spaced(((warning(("The variant “" + variant + ":” was not found"))) + "\n\n" + (Object.entries(validVariants).map(function (ref) {
  var k = ref[0];
  var v = ref[1];

  return (k + "\n" + (v.map(function (item, index) { return ("" + (v.length > 6 && index % 6 === 0 && index > 0 ? '\n' : '') + (color$1.highlight(item)) + ":"); }).join(color$1.subdued(' / '))));
  }).join('\n\n')) + "\n\nRead more at https://twinredirect.page.link/variantList")); };

var logNotAllowed = function (ref) {
  var className = ref.className;
  var error = ref.error;

  return spaced(warning(((color$1.errorLight(("" + className))) + " " + error)));
};

var logBadGood = function (bad, good) { return good ? spaced(((color$1.error('✕ Bad:')) + " " + bad + "\n" + (color$1.success('✓ Good:')) + " " + good)) : logGeneralError(bad); };

var logErrorFix = function (error, good) { return ((color$1.error(error)) + "\n" + (color$1.success('Fix:')) + " " + good); };

var logGeneralError = function (error) { return spaced(warning(error)); };

var debugSuccess = function (className, log) { return inOut(formatProp(className), log); };

var formatPluginKey = function (key) { return key.replace(/(\\|(}}))/g, '').replace(/{{/g, '.'); };

var debugPlugins = function (processedPlugins) {
  console.log(Object.entries(processedPlugins).map(function (ref) {
    var group = ref[1];

    return Object.entries(group).map(function (ref) {
    var className = ref[0];
    var styles = ref[1];

    return inOutPlugins(formatPluginKey(className), styles);
    }).join('\n');
  }).join("\n"));
};

var formatSuggestions = function (suggestions, lineLength, maxLineLength) {
  if ( lineLength === void 0 ) lineLength = 0;
  if ( maxLineLength === void 0 ) maxLineLength = 60;

  return suggestions.map(function (s, index) {
  lineLength = lineLength + ("" + (s.target) + (s.value)).length;
  var divider = lineLength > maxLineLength ? '\n' : index !== suggestions.length - 1 ? color$1.subdued(' / ') : '';
  if (lineLength > maxLineLength) { lineLength = 0; }
  return ("" + (color$1.highlight(s.target)) + (s.value ? color$1.subdued((" [" + (s.value) + "]")) : '') + divider);
}).join('');
};

var logNoClass = function (properties) {
  var classNameRawNoVariants = properties.pieces.classNameRawNoVariants;
  var text = warning(((classNameRawNoVariants ? color$1.errorLight(classNameRawNoVariants.replace(new RegExp(SPACE_ID, 'g'), ' ')) : 'Class') + " was not found"));
  return text;
};

var logDeeplyNestedClass = function (properties) {
  var classNameRawNoVariants = properties.pieces.classNameRawNoVariants;
  var text = warning(((classNameRawNoVariants ? color$1.errorLight(classNameRawNoVariants) : 'Class') + " is too deeply nested in your tailwind.config.js"));
  return text;
};

var checkDarkLightClasses = function (className) { return throwIf(['dark', 'light'].includes(className), function () { return ("\n\n\"" + className + "\" must be added as className:" + (logBadGood(("tw`" + className + "`"), ("<div className=\"" + className + "\">"))) + "\nRead more at https://twinredirect.page.link/darkLightMode\n"); }); };

var errorSuggestions = function (properties) {
  var properties_state = properties.state;
  var hasSuggestions = properties_state.configTwin.hasSuggestions;
  var prefix = properties_state.config.prefix;
  var className = properties.pieces.className;
  var isCsOnly = properties.isCsOnly;
  if (isCsOnly) { return spaced(((color$1.highlight(className)) + " isn’t valid “short css”.\n\nThe syntax is like this: max-width[100vw]\nRead more at https://twinredirect.page.link/cs-classes")); }
  checkDarkLightClasses(className);
  var textNotFound = logNoClass(properties);
  if (!hasSuggestions) { return spaced(textNotFound); }
  var suggestions = getSuggestions(properties);
  if (suggestions.length === 0) { return spaced(textNotFound); }

  if (typeof suggestions === 'string') {
    if (suggestions === className) {
      return spaced(logDeeplyNestedClass(properties));
    } // Provide a suggestion for the default key update


    if (suggestions.endsWith('-default')) {
      return spaced((textNotFound + "\n\n" + (color$1.highlight(("To fix this, rename the 'default' key to 'DEFAULT' in your tailwind config or use the class '" + className + "-default'"))) + "\nRead more at https://twinredirect.page.link/default-to-DEFAULT"));
    }

    return spaced((textNotFound + "\n\nDid you mean " + (color$1.highlight([prefix, suggestions].filter(Boolean).join(''))) + "?"));
  }

  var suggestionText = suggestions.length === 1 ? ("Did you mean " + (color$1.highlight([prefix, suggestions.shift().target].filter(Boolean).join(''))) + "?") : ("Try one of these classes:\n" + (formatSuggestions(suggestions)));
  return spaced((textNotFound + "\n\n" + suggestionText));
};

var themeErrorNotFound = function (ref) {
  var theme = ref.theme;
  var input = ref.input;
  var trimInput = ref.trimInput;

  if (typeof theme === 'string') {
    return logBadGood(input, trimInput);
  }

  var textNotFound = warning(((color$1.errorLight(input)) + " was not found in your theme"));

  if (!theme) {
    return spaced(textNotFound);
  }

  var suggestionText = "Try one of these values:\n" + (formatSuggestions(Object.entries(theme).map(function (ref) {
    var k = ref[0];
    var v = ref[1];

    return ({
    target: k.includes && k.includes('.') ? ("[" + k + "]") : k,
    value: typeof v === 'string' ? v : '...'
  });
  })));
  return spaced((textNotFound + "\n\n" + suggestionText));
};

var opacityErrorNotFound = function (ref) {
  var className = ref.className;

  var textNotFound = warning(("The class " + (color$1.errorLight(className)) + " doesn’t support an opacity"));
  return spaced(textNotFound);
};

var logNotFoundVariant = function (ref) {
  var classNameRaw = ref.classNameRaw;

  return logBadGood(("" + classNameRaw), [(classNameRaw + "flex"), (classNameRaw + "(flex bg-black)")].join(color$1.subdued(' / ')));
};

var logNotFoundClass = logGeneralError('That class was not found');
var logStylePropertyError = spaced(logErrorFix('Styles shouldn’t be added within a `style={...}` prop', 'Use the tw or css prop instead: <div tw="" /> or <div css={tw``} />\n\nDisable this error by adding this in your twin config: `{ "allowStyleProp": true }`\nRead more at https://twinredirect.page.link/style-prop'));

var debug = function (state) { return function (message) {
  if (state.isDev !== true) { return; }
  if (state.configTwin.debug !== true) { return; }
  return console.log(message);
}; };

var SPREAD_ID = '__spread__';
var COMPUTED_ID = '__computed__';

function addImport(ref) {
  var t = ref.types;
  var program = ref.program;
  var mod = ref.mod;
  var name = ref.name;
  var identifier = ref.identifier;

  var importName = name === 'default' ? [t.importDefaultSpecifier(identifier)] : name ? [t.importSpecifier(identifier, t.identifier(name))] : [];
  program.unshiftContainer('body', t.importDeclaration(importName, t.stringLiteral(mod)));
}

function objectExpressionElements(literal, t, spreadType) {
  return Object.keys(literal).filter(function (k) {
    return typeof literal[k] !== 'undefined';
  }).map(function (k) {
    if (k.startsWith(SPREAD_ID)) {
      return t[spreadType](babylon.parseExpression(literal[k]));
    }

    var computed = k.startsWith(COMPUTED_ID);
    var key = computed ? babylon.parseExpression(k.slice(12)) : t.stringLiteral(k);
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
        return babylon.parseExpression(literal.slice(COMPUTED_ID.length));
      }

      return t.stringLiteral(literal);

    default:
      // Assuming literal is an object
      if (Array.isArray(literal)) {
        return t.arrayExpression(literal.map(function (x) { return astify(x, t); }));
      }

      try {
        return t.objectExpression(objectExpressionElements(literal, t, 'spreadElement'));
      } catch (_) {
        return t.objectExpression(objectExpressionElements(literal, t, 'spreadProperty'));
      }

  }
}

var setStyledIdentifier = function (ref) {
  var state = ref.state;
  var path$$1 = ref.path;
  var styledImport = ref.styledImport;

  var importFromStitches = state.isStitches && styledImport.from.includes(path$$1.node.source.value);
  var importFromLibrary = path$$1.node.source.value === styledImport.from;
  if (!importFromLibrary && !importFromStitches) { return; } // Look for an existing import that matches the config,
  // if found then reuse it for the rest of the function calls

  path$$1.node.specifiers.some(function (specifier) {
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

var setCssIdentifier = function (ref) {
  var state = ref.state;
  var path$$1 = ref.path;
  var cssImport = ref.cssImport;

  var importFromStitches = state.isStitches && cssImport.from.includes(path$$1.node.source.value);
  var isLibraryImport = path$$1.node.source.value === cssImport.from;
  if (!isLibraryImport && !importFromStitches) { return; } // Look for an existing import that matches the config,
  // if found then reuse it for the rest of the function calls

  path$$1.node.specifiers.some(function (specifier) {
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


function parseTte(ref) {
  var path$$1 = ref.path;
  var t = ref.types;
  var styledIdentifier = ref.styledIdentifier;
  var state = ref.state;

  var cloneNode = t.cloneNode || t.cloneDeep;
  var tagType = path$$1.node.tag.type;
  if (tagType !== 'Identifier' && tagType !== 'MemberExpression' && tagType !== 'CallExpression') { return null; } // Convert *very* basic interpolated variables

  var string = path$$1.get('quasi').evaluate().value; // Grab the path location before changing it

  var stringLoc = path$$1.get('quasi').node.loc;

  if (tagType === 'CallExpression') {
    replaceWithLocation(path$$1.get('tag').get('callee'), cloneNode(styledIdentifier));
    state.isImportingStyled = true;
  } else if (tagType === 'MemberExpression') {
    replaceWithLocation(path$$1.get('tag').get('object'), cloneNode(styledIdentifier));
    state.isImportingStyled = true;
  }

  if (tagType === 'CallExpression' || tagType === 'MemberExpression') {
    replaceWithLocation(path$$1, t.callExpression(cloneNode(path$$1.node.tag), [t.identifier('__twPlaceholder')]));
    path$$1 = path$$1.get('arguments')[0];
  } // Restore the original path location


  path$$1.node.loc = stringLoc;
  return {
    string: string,
    path: path$$1
  };
}

function replaceWithLocation(path$$1, replacement) {
  var ref = path$$1.node;
  var loc = ref.loc;
  var newPaths = replacement ? path$$1.replaceWith(replacement) : [];

  if (Array.isArray(newPaths) && newPaths.length > 0) {
    newPaths.forEach(function (p) {
      p.node.loc = loc;
    });
  }

  return newPaths;
}

var validImports = new Set(['default', 'styled', 'css', 'theme', 'screen', 'TwStyle', 'ThemeStyle', 'GlobalStyles', 'globalStyles']);

var validateImports = function (imports) {
  var unsupportedImport = Object.keys(imports).find(function (reference) { return !validImports.has(reference); });
  var importTwAsNamedNotDefault = Object.keys(imports).find(function (reference) { return reference === 'tw'; });
  throwIf(importTwAsNamedNotDefault, function () {
    logGeneralError("Please use the default export for twin.macro, i.e:\nimport tw from 'twin.macro'\nNOT import { tw } from 'twin.macro'");
  });
  throwIf(unsupportedImport, function () { return logGeneralError(("Twin doesn't recognize { " + unsupportedImport + " }\n\nTry one of these imports:\nimport tw, { styled, css, theme, screen, GlobalStyles, globalStyles } from 'twin.macro'")); });
};

var generateUid = function (name, program) { return program.scope.generateUidIdentifier(name); };

var getParentJSX = function (path$$1) { return path$$1.findParent(function (p) { return p.isJSXOpeningElement(); }); };

var getAttributeNames = function (jsxPath) {
  var attributes = jsxPath.get('attributes');
  var attributeNames = attributes.map(function (p) { return p.node.name && p.node.name.name; });
  return attributeNames;
};

var getCssAttributeData = function (attributes) {
  if (!String(attributes)) { return {}; }
  var index = attributes.findIndex(function (attribute) { return attribute.isJSXAttribute() && attribute.get('name.name').node === 'css'; });
  return {
    index: index,
    hasCssAttribute: index >= 0,
    attribute: attributes[index]
  };
};

var getFunctionValue = function (path$$1) {
  if (path$$1.parent.type !== 'CallExpression') { return; }
  var parent = path$$1.findParent(function (x) { return x.isCallExpression(); });
  if (!parent) { return; }
  var argument = parent.get('arguments')[0] || '';
  return {
    parent: parent,
    input: argument.evaluate && argument.evaluate().value
  };
};

var getTaggedTemplateValue = function (path$$1) {
  if (path$$1.parent.type !== 'TaggedTemplateExpression') { return; }
  var parent = path$$1.findParent(function (x) { return x.isTaggedTemplateExpression(); });
  if (!parent) { return; }
  if (parent.node.tag.type !== 'Identifier') { return; }
  return {
    parent: parent,
    input: parent.get('quasi').evaluate().value
  };
};

var getMemberExpression = function (path$$1) {
  if (path$$1.parent.type !== 'MemberExpression') { return; }
  var parent = path$$1.findParent(function (x) { return x.isMemberExpression(); });
  if (!parent) { return; }
  return {
    parent: parent,
    input: parent.get('property').node.name
  };
};

var generateTaggedTemplateExpression = function (ref) {
  var identifier = ref.identifier;
  var t = ref.t;
  var styles = ref.styles;

  var backtickStyles = t.templateElement({
    raw: ("" + styles),
    cooked: ("" + styles)
  });
  var ttExpression = t.taggedTemplateExpression(identifier, t.templateLiteral([backtickStyles], []));
  return ttExpression;
};

var isComponent = function (name) { return name.slice(0, 1).toUpperCase() === name.slice(0, 1); };

var jsxElementNameError = function () { return logGeneralError("The css prop + tw props can only be added to jsx elements with a single dot in their name (or no dot at all)."); };

var getFirstStyledArgument = function (jsxPath, t) {
  var path$$1 = get(jsxPath, 'node.name.name');
  if (path$$1) { return isComponent(path$$1) ? t.identifier(path$$1) : t.stringLiteral(path$$1); }
  var dotComponent = get(jsxPath, 'node.name');
  throwIf(!dotComponent, jsxElementNameError); // Element name has dots in it

  var objectName = get(dotComponent, 'object.name');
  throwIf(!objectName, jsxElementNameError);
  var propertyName = get(dotComponent, 'property.name');
  throwIf(!propertyName, jsxElementNameError);
  return t.memberExpression(t.identifier(objectName), t.identifier(propertyName));
};

var makeStyledComponent = function (ref) {
  var secondArg = ref.secondArg;
  var jsxPath = ref.jsxPath;
  var t = ref.t;
  var program = ref.program;
  var state = ref.state;

  var constName = program.scope.generateUidIdentifier('TwComponent');

  if (!state.styledIdentifier) {
    state.styledIdentifier = generateUid('styled', program);
    state.isImportingStyled = true;
  }

  var firstArg = getFirstStyledArgument(jsxPath, t);
  var args = [firstArg, secondArg].filter(Boolean);
  var identifier = t.callExpression(state.styledIdentifier, args);
  var styledProps = [t.variableDeclarator(constName, identifier)];
  var styledDefinition = t.variableDeclaration('const', styledProps);
  var rootParentPath = jsxPath.findParent(function (p) { return p.parentPath.isProgram(); });
  rootParentPath.insertBefore(styledDefinition);

  if (t.isMemberExpression(firstArg)) {
    // Replace components with a dot, eg: Dialog.blah
    var id = t.jsxIdentifier(constName.name);
    jsxPath.get('name').replaceWith(id);
    if (jsxPath.node.selfClosing) { return; }
    jsxPath.parentPath.get('closingElement.name').replaceWith(id);
  } else {
    jsxPath.node.name.name = constName.name;
    if (jsxPath.node.selfClosing) { return; }
    jsxPath.parentPath.node.closingElement.name.name = constName.name;
  }
};

// Defaults for different css-in-js libraries
var configDefaultsGoober = {
  sassyPseudo: true
}; // Sets selectors like hover to &:hover

var configDefaultsStitches = {
  sassyPseudo: true,
  // Sets selectors like hover to &:hover
  convertStyledDot: true,
  // Convert styled.[element] to a default syntax
  moveTwPropToStyled: true,
  // Move the tw prop to a styled definition
  convertHtmlElementToStyled: true // For packages like stitches, add a styled definition on css prop elements

};

var configDefaultsTwin = function (ref) {
  var isGoober = ref.isGoober;
  var isStitches = ref.isStitches;
  var isDev = ref.isDev;

  return (Object.assign({}, {allowStyleProp: false,
  // Allows styles within style="blah" without throwing an error
  autoCssProp: false,
  // Automates the import of styled-components when you use their css prop
  dataTwProp: isDev,
  // During development, add a data-tw="" prop containing your tailwind classes for backtracing
  hasSuggestions: true,
  // Switch suggestions on/off when you use a tailwind class that's not found
  sassyPseudo: false,
  // Sets selectors like hover to &:hover
  debug: false,
  // Show the output of the classes twin converts
  includeClassNames: false,
  // Look in the className props for tailwind classes to convert
  dataCsProp: isDev,
  // During development, add a data-cs="" prop containing your short css classes for backtracing
  disableCsProp: false,
  // Disable converting css styles in the cs prop
  disableShortCss: false,
  // Disable converting css written using short css
  stitchesConfig: undefined,
  // Set the path to the stitches config (stitches only)
  config: undefined,
  // Set the path to the tailwind config
  convertStyledDot: false,
  // Convert styled.[element] to a default syntax (only used for stitches so far)
  moveTwPropToStyled: false,
  // Move the tw prop to a styled definition (only used for stitches so far)
  convertHtmlElementToStyled: false},
  // For packages like stitches, add a styled definition on css prop elements
  (isGoober && configDefaultsGoober),
  (isStitches && configDefaultsStitches)));
};

var isBoolean = function (value) { return typeof value === 'boolean'; };

var allowedPresets = ['styled-components', 'emotion', 'goober', 'stitches'];
var configTwinValidators = {
  preset: [function (value) { return value === undefined || allowedPresets.includes(value); }, ("The config “preset” can only be:\n" + (allowedPresets.map(function (p) { return ("'" + p + "'"); }).join(', ')))],
  allowStyleProp: [isBoolean, 'The config “allowStyleProp” can only be true or false'],
  autoCssProp: [function (value) { return value !== true; }, 'The “autoCssProp” feature has been removed from twin.macro@2.8.2+\nThis means the css prop must be added by styled-components instead.\nSetup info at https://twinredirect.page.link/auto-css-prop\n\nRemove the “autoCssProp” item from your config to avoid this message.'],
  disableColorVariables: [function (value) { return value !== true; }, 'The disableColorVariables feature has been removed from twin.macro@3+\n\nRemove the disableColorVariables item from your config to avoid this message.'],
  hasSuggestions: [isBoolean, 'The config “hasSuggestions” can only be true or false'],
  sassyPseudo: [isBoolean, 'The config “sassyPseudo” can only be true or false'],
  dataTwProp: [function (value) { return isBoolean(value) || value === 'all'; }, 'The config “dataTwProp” can only be true, false or "all"'],
  dataCsProp: [function (value) { return isBoolean(value) || value === 'all'; }, 'The config “dataCsProp” can only be true, false or "all"'],
  debugProp: [function (value) { return value === undefined; }, "The “debugProp” option was renamed to “dataTwProp”, please rename it in your twin config"],
  includeClassNames: [isBoolean, 'The config “includeClassNames” can only be true or false'],
  disableCsProp: [isBoolean, 'The config “disableCsProp” can only be true or false'],
  convertStyledDot: [isBoolean, 'The config “convertStyledDot” can only be true or false'],
  moveTwPropToStyled: [isBoolean, 'The config “moveTwPropToStyled” can only be true or false'],
  convertHtmlElementToStyled: [isBoolean, 'The config “convertHtmlElementToStyled” can only be true or false']
};

var getAllConfigs = function (config) {
  var configs = flatMap([].concat( get(config, 'presets', [defaultTailwindConfig]) ).reverse(), function (preset) {
    var config = typeof preset === 'function' ? preset() : preset;
    return getAllConfigs(config);
  });
  return [config ].concat( configs);
};

var getConfigTailwindProperties = function (state, config) {
  var sourceRoot = state.file.opts.sourceRoot || '.';
  var configFile = config && config.config;
  var configPath = path.resolve(sourceRoot, configFile || "./tailwind.config.js");
  var configExists = fs.existsSync(configPath);
  var path$$1 = configExists ? require(configPath) : defaultTailwindConfig;
  var configTailwind = resolveTailwindConfig([].concat( getAllConfigs(path$$1) ));
  throwIf(!configTailwind, function () { return logGeneralError(("Couldn’t find the Tailwind config.\nLooked in " + config)); });
  return {
    configExists: configExists,
    configTailwind: configTailwind,
    configPath: configPath
  };
};

var checkExists = function (fileName, sourceRoot) {
  var fileNames = Array.isArray(fileName) ? fileName : [fileName];
  var configPath;
  fileNames.find(function (fileName) {
    var resolved = path.resolve(sourceRoot, ("./" + fileName));
    var exists = fs.existsSync(resolved);
    if (exists) { configPath = resolved; }
    return exists;
  });
  return configPath;
};

var getRelativePath = function (ref) {
  var comparePath = ref.comparePath;
  var state = ref.state;

  var ref$1 = state.file.opts;
  var filename = ref$1.filename;
  var pathName = path.parse(filename).dir;
  return path.relative(pathName, comparePath);
};

var getStitchesPath = function (state, config) {
  var sourceRoot = state.file.opts.sourceRoot || '.';
  var configPathCheck = config.stitchesConfig || ['stitches.config.ts', 'stitches.config.js'];
  var configPath = checkExists(configPathCheck, sourceRoot);
  throwIf(!configPath, function () { return logGeneralError(("Couldn’t find the Stitches config at " + (config.stitchesConfig ? ("“" + (config.stitchesConfig) + "”") : 'the project root') + ".\nUse the twin config: stitchesConfig=\"PATH_FROM_PROJECT_ROOT\" to set the location.")); });
  return getRelativePath({
    comparePath: configPath,
    state: state
  });
};

var runConfigValidator = function (ref) {
  var item = ref[0];
  var value = ref[1];

  var validatorConfig = configTwinValidators[item];
  if (!validatorConfig) { return true; }
  var validator = validatorConfig[0];
  var errorMessage = validatorConfig[1];
  throwIf(validator(value) !== true, function () { return logGeneralError(errorMessage); });
  return true;
};

var getConfigTwin = function (config, state) { return (Object.assign({}, configDefaultsTwin(state),
  config)); };

var getConfigTwinValidated = function (config, state) { return Object.entries(getConfigTwin(config, state)).reduce(function (result, item) {
  var obj;

  return (Object.assign({}, result,
  (runConfigValidator(item) && ( obj = {}, obj[item[0]] = item[1], obj ))));
  }, {}); };

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

var getCssConfig = function (ref) {
  var state = ref.state;
  var config = ref.config;

  var usedConfig = config.css && config || userPresets[config.preset] || userPresets.emotion;

  if (typeof usedConfig.css === 'string') {
    return {
      import: 'css',
      from: usedConfig.css
    };
  }

  if (config.preset === 'stitches') {
    var stitchesPath = getStitchesPath(state, config);

    if (stitchesPath) {
      // Overwrite the stitches import data with the path from the current file
      usedConfig.css.from = stitchesPath;
    }
  }

  return usedConfig.css;
};

var updateCssReferences = function (ref) {
  var references = ref.references;
  var state = ref.state;

  if (state.existingCssIdentifier) { return; }
  var cssReferences = references.css;
  if (isEmpty(cssReferences)) { return; }
  cssReferences.forEach(function (path$$1) {
    path$$1.node.name = state.cssIdentifier.name;
  });
};

var addCssImport = function (ref) {
  var references = ref.references;
  var program = ref.program;
  var t = ref.t;
  var cssImport = ref.cssImport;
  var state = ref.state;

  if (!state.isImportingCss) {
    var shouldImport = !isEmpty(references.css) && !state.existingCssIdentifier;
    if (!shouldImport) { return; }
  }

  if (state.existingCssIdentifier) { return; }
  addImport({
    types: t,
    program: program,
    name: cssImport.import,
    mod: cssImport.from,
    identifier: state.cssIdentifier
  });
};

var convertHtmlElementToStyled = function (props) {
  var path$$1 = props.path;
  var t = props.t;
  var state = props.state;
  if (!state.configTwin.convertHtmlElementToStyled) { return; }
  var jsxPath = path$$1.parentPath;
  makeStyledComponent(Object.assign({}, props,
    {jsxPath: jsxPath,
    secondArg: t.objectExpression([])}));
};

var getStyledConfig = function (ref) {
  var state = ref.state;
  var config = ref.config;

  var usedConfig = config.styled && config || userPresets[config.preset] || userPresets.emotion;

  if (typeof usedConfig.styled === 'string') {
    return {
      import: 'default',
      from: usedConfig.styled
    };
  }

  if (config.preset === 'stitches') {
    var stitchesPath = getStitchesPath(state, config);

    if (stitchesPath) {
      // Overwrite the stitches import data with the path from the current file
      usedConfig.styled.from = stitchesPath;
    }
  }

  return usedConfig.styled;
};

var updateStyledReferences = function (ref) {
  var references = ref.references;
  var state = ref.state;

  if (state.existingStyledIdentifier) { return; }
  var styledReferences = references.styled;
  if (isEmpty(styledReferences)) { return; }
  styledReferences.forEach(function (path$$1) {
    path$$1.node.name = state.styledIdentifier.name;
  });
};

var addStyledImport = function (ref) {
  var references = ref.references;
  var program = ref.program;
  var t = ref.t;
  var styledImport = ref.styledImport;
  var state = ref.state;

  if (!state.isImportingStyled) {
    var shouldImport = !isEmpty(references.styled) && !state.existingStyledIdentifier;
    if (!shouldImport) { return; }
  }

  if (state.existingStyledIdentifier) { return; }
  addImport({
    types: t,
    program: program,
    name: styledImport.import,
    mod: styledImport.from,
    identifier: state.styledIdentifier
  });
};

var moveDotElementToParam = function (ref) {
  var path$$1 = ref.path;
  var t = ref.t;

  if (path$$1.parent.type !== 'MemberExpression') { return; }
  var parentCallExpression = path$$1.findParent(function (x) { return x.isCallExpression(); });
  if (!parentCallExpression) { return; }
  var styledName = get(path$$1, 'parentPath.node.property.name');
  var styledArgs = get(parentCallExpression, 'node.arguments.0');
  var args = [t.stringLiteral(styledName), styledArgs].filter(Boolean);
  var replacement = t.callExpression(path$$1.node, args);
  replaceWithLocation(parentCallExpression, replacement);
};

var handleStyledFunction = function (ref) {
  var references = ref.references;
  var t = ref.t;
  var state = ref.state;

  if (!state.configTwin.convertStyledDot) { return; }
  if (isEmpty(references)) { return; }
  (references.default || []).concat( (references.styled || [])).filter(Boolean).forEach(function (path$$1) {
    // convert tw.div`` & styled.div`` to styled('div', {})
    moveDotElementToParam({
      path: path$$1,
      t: t
    });
  });
};

var trimInput = function (themeValue) {
  var arrayValues = themeValue // Split at dots outside of square brackets
  .split(/\.(?=(((?!]).)*\[)|[^[\]]*$)/).filter(Boolean);

  if (arrayValues.length === 1) {
    return arrayValues[0];
  }

  return arrayValues.slice(0, -1).join('.');
};

var handleThemeFunction = function (ref) {
  var references = ref.references;
  var t = ref.t;
  var state = ref.state;

  if (!references.theme) { return; }
  var theme = getTheme(state.config.theme);
  references.theme.forEach(function (path$$1) {
    var ref = getTaggedTemplateValue(path$$1) || getFunctionValue(path$$1) || '';
    var input = ref.input;
    var parent = ref.parent;
    throwIf(!parent, function () { return logGeneralError("The theme value doesn’t look right\n\nTry using it like this: theme`colors.black` or theme('colors.black')"); });
    var themeValue = theme(input);
    if (themeValue && themeValue.DEFAULT) { themeValue = themeValue.DEFAULT; }
    throwIf(!themeValue, function () { return themeErrorNotFound({
      theme: input.includes('.') ? get(theme(), trimInput(input)) : theme(),
      input: input,
      trimInput: trimInput(input)
    }); });
    return replaceWithLocation(parent, astify(themeValue, t));
  });
};

var getDirectReplacement = function (ref) {
  var mediaQuery = ref.mediaQuery;
  var parent = ref.parent;
  var t = ref.t;

  return ({
  newPath: parent,
  replacement: astify(mediaQuery, t)
});
};

var handleDefinition = function (ref) {
  var mediaQuery = ref.mediaQuery;
  var parent = ref.parent;
  var type = ref.type;
  var t = ref.t;

  return ({
  TaggedTemplateExpression: function () {
    var newPath = parent.findParent(function (x) { return x.isTaggedTemplateExpression(); });
    var query = [(mediaQuery + " { "), " }"];
    var quasis = [t.templateElement({
      raw: query[0],
      cooked: query[0]
    }, false), t.templateElement({
      raw: query[1],
      cooked: query[1]
    }, true)];
    var expressions = [newPath.get('quasi').node];
    var replacement = t.templateLiteral(quasis, expressions);
    return {
      newPath: newPath,
      replacement: replacement
    };
  },
  CallExpression: function () {
    var newPath = parent.findParent(function (x) { return x.isCallExpression(); });
    var value = newPath.get('arguments')[0].node;
    var replacement = t.objectExpression([t.objectProperty(t.stringLiteral(mediaQuery), value)]);
    return {
      newPath: newPath,
      replacement: replacement
    };
  },
  ObjectProperty: function () {
    // Remove brackets around keys so merges work with tailwind screens
    // styled.div({ [screen`2xl`]: tw`block`, ...tw`2xl:inline` })
    // https://github.com/ben-rogerson/twin.macro/issues/379
    parent.parent.computed = false;
    return getDirectReplacement({
      mediaQuery: mediaQuery,
      parent: parent,
      t: t
    });
  },
  ExpressionStatement: function () { return getDirectReplacement({
    mediaQuery: mediaQuery,
    parent: parent,
    t: t
  }); },
  ArrowFunctionExpression: function () { return getDirectReplacement({
    mediaQuery: mediaQuery,
    parent: parent,
    t: t
  }); },
  ArrayExpression: function () { return getDirectReplacement({
    mediaQuery: mediaQuery,
    parent: parent,
    t: t
  }); },
  BinaryExpression: function () { return getDirectReplacement({
    mediaQuery: mediaQuery,
    parent: parent,
    t: t
  }); },
  LogicalExpression: function () { return getDirectReplacement({
    mediaQuery: mediaQuery,
    parent: parent,
    t: t
  }); },
  ConditionalExpression: function () { return getDirectReplacement({
    mediaQuery: mediaQuery,
    parent: parent,
    t: t
  }); },
  VariableDeclarator: function () { return getDirectReplacement({
    mediaQuery: mediaQuery,
    parent: parent,
    t: t
  }); },
  TemplateLiteral: function () { return getDirectReplacement({
    mediaQuery: mediaQuery,
    parent: parent,
    t: t
  }); },
  TSAsExpression: function () { return getDirectReplacement({
    mediaQuery: mediaQuery,
    parent: parent,
    t: t
  }); }
})[type];
};

var validateScreenValue = function (ref) {
  var screen = ref.screen;
  var screens = ref.screens;
  var value = ref.value;

  return throwIf(!screen, function () { return logBadGood(((value ? ("“" + value + "” wasn’t found in your") : 'Specify a screen value from your') + " tailwind config"), ("Try one of these:\n\n" + (Object.entries(screens).map(function (ref) {
  var k = ref[0];
  var v = ref[1];

  return ("screen." + k + "`...` (" + v + ")");
  }).join('\n')))); });
};

var getMediaQuery = function (ref) {
  var input = ref.input;
  var screens = ref.screens;

  validateScreenValue({
    screen: screens[input],
    screens: screens,
    value: input
  });
  var mediaQuery = "@media (min-width: " + (screens[input]) + ")";
  return {
    mediaQuery: mediaQuery
  };
};

var handleScreenFunction = function (ref) {
  var references = ref.references;
  var t = ref.t;
  var state = ref.state;

  if (!references.screen) { return; }
  var theme = getTheme(state.config.theme);
  var screens = theme('screens');
  references.screen.forEach(function (path$$1) {
    var ref = getTaggedTemplateValue(path$$1) || // screen.lg``
    getFunctionValue(path$$1) || // screen.lg({ })
    getMemberExpression(path$$1) || // screen`lg`
    '';
    var input = ref.input;
    var parent = ref.parent;
    var ref$1 = getMediaQuery({
      input: input,
      screens: screens
    });
    var mediaQuery = ref$1.mediaQuery;
    var hasStyles = ref$1.hasStyles;
    var definition = handleDefinition({
      type: parent.parent.type,
      hasStyles: hasStyles,
      mediaQuery: mediaQuery,
      parent: parent,
      t: t
    });
    throwIf(!definition, function () { return logBadGood("The screen import doesn’t support that syntax", ("Try something like this:\n\n" + ([].concat( Object.keys(screens) ).map(function (f) { return ("screen." + f); }).join(', ')))); });
    var ref$2 = definition();
    var newPath = ref$2.newPath;
    var replacement = ref$2.replacement;
    replaceWithLocation(newPath, replacement);
  });
};

var templateObject$3 = Object.freeze(["colors.gray.400"]);
var templateObject$2 = Object.freeze(["fontFamily.mono"]);
var templateObject$1 = Object.freeze(["fontFamily.sans"]);
var templateObject = Object.freeze(["borderColor.DEFAULT"]);
var globalPreflightStyles = function (ref) {
  var theme = ref.theme;

  return ({
  '*, ::before, ::after': {
    boxSizing: 'border-box',
    borderWidth: '0',
    borderStyle: 'solid',
    borderColor: theme(templateObject) || 'currentColor'
  },
  '::before, ::after': {
    '--tw-content': "''"
  },
  html: {
    lineHeight: '1.5',
    WebkitTextSizeAdjust: '100%',
    MozTabSize: '4',
    OTabSize: '4',
    tabSize: '4',
    fontFamily: theme(templateObject$1) || "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, \"Noto Sans\", sans-serif, \"Apple Color Emoji\", \"Segoe UI Emoji\", \"Segoe UI Symbol\", \"Noto Color Emoji\""
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
    WebkitTextDecoration: 'underline dotted',
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
    fontFamily: theme(templateObject$2) || "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace",
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
    color: theme(templateObject$3) || '#9ca3af'
  },
  'input:-ms-input-placeholder, textarea:-ms-input-placeholder': {
    opacity: '1',
    color: theme(templateObject$3) || '#9ca3af'
  },
  'input::placeholder, textarea::placeholder': {
    opacity: '1',
    color: theme(templateObject$3) || '#9ca3af'
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
};

var templateObject$4 = Object.freeze(["keyframes"]);
var animation = (function (properties) {
  var theme = properties.theme;
  var match = properties.match;
  var getConfigValue = properties.getConfigValue;
  var errorSuggestions = properties.errors.errorSuggestions;
  var important = properties.pieces.important;
  var classValue = match(/(?<=(animate)-)([^]*)/);

  var configValue = function (config) { return getConfigValue(theme(config), classValue); };

  var animationConfig = configValue('animation');

  if (!animationConfig) {
    errorSuggestions({
      config: ['animation']
    });
  }

  return {
    animation: ("" + animationConfig + important)
  };
});
var globalKeyframeStyles = function (ref) {
  var theme = ref.theme;

  var keyframes = theme(templateObject$4);
  if (!keyframes) { return; }
  var output = Object.entries(keyframes).reduce(function (result, ref) {
    var obj;

    var name = ref[0];
    var frames = ref[1];
    return (Object.assign({}, result,
    ( obj = {}, obj[("@keyframes " + name)] = frames, obj )));
  }, {});
  return output;
};

var templateObject$3$1 = Object.freeze(["ringOffsetColor.DEFAULT"]);
var templateObject$2$1 = Object.freeze(["ringOffsetWidth.DEFAULT"]);
var templateObject$1$1 = Object.freeze(["ringColor.DEFAULT"]);
var templateObject$5 = Object.freeze(["ringOpacity.DEFAULT"]);
var globalRingStyles = function (ref) {
  var theme = ref.theme;
  var withAlpha = ref.withAlpha;

  var ringOpacityDefault = theme(templateObject$5) || '0.5';
  var ringColorDefault = withAlpha({
    color: theme(templateObject$1$1) || ("rgb(147 197 253 / " + ringOpacityDefault + ")"),
    pieces: {
      important: '',
      hasAlpha: true,
      alpha: ringOpacityDefault
    }
  });
  return {
    '*, ::before, ::after': {
      '--tw-ring-inset': 'var(--tw-empty,/*!*/ /*!*/)',
      '--tw-ring-offset-width': theme(templateObject$2$1) || '0px',
      '--tw-ring-offset-color': theme(templateObject$3$1) || '#fff',
      '--tw-ring-color': ringColorDefault,
      '--tw-ring-offset-shadow': '0 0 #0000',
      '--tw-ring-shadow': '0 0 #0000'
    }
  };
};

var handleWidth = function (ref) {
  var configValue = ref.configValue;
  var important = ref.important;

  var value = configValue('ringWidth');
  if (!value) { return; }
  return {
    '--tw-ring-offset-shadow': "var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color)",
    '--tw-ring-shadow': ("var(--tw-ring-inset) 0 0 0 calc(" + value + " + var(--tw-ring-offset-width)) var(--tw-ring-color)"),
    boxShadow: ("" + (["var(--tw-ring-offset-shadow)", "var(--tw-ring-shadow)", "var(--tw-shadow, 0 0 #0000)"].join(', ')) + important)
  };
};

var ring = (function (properties) {
  var theme = properties.theme;
  var match = properties.match;
  var getCoercedColor = properties.getCoercedColor;
  var getConfigValue = properties.getConfigValue;
  var errorSuggestions = properties.errors.errorSuggestions;
  var important = properties.pieces.important;
  var classValue = match(/(?<=(ring)-)([^]*)/);
  if (classValue === 'inset') { return {
    '--tw-ring-inset': 'inset'
  }; }
  var width = handleWidth({
    configValue: function (config) { return getConfigValue(theme(config), classValue); },
    important: important
  });
  if (width) { return width; }
  var coercedColor = getCoercedColor('ringColor');
  if (coercedColor) { return coercedColor; }
  errorSuggestions({
    config: ['ringWidth', 'ringColor']
  });
});

var defaultBoxShadow = ["var(--tw-ring-offset-shadow, 0 0 #0000)", "var(--tw-ring-shadow, 0 0 #0000)", "var(--tw-shadow)"].join(', ');

var makeBoxShadow = function (value, important) {
  var ast = parseBoxShadowValue.parseBoxShadowValue(value);

  for (var i = 0, list = ast; i < list.length; i += 1) {
    // Don't override color if the whole shadow is a variable
    var shadow = list[i];

    if (!shadow.valid) {
      continue;
    }

    shadow.color = 'var(--tw-shadow-color)';
  }

  return {
    '--tw-shadow': value === 'none' ? '0 0 #0000' : value,
    '--tw-shadow-colored': value === 'none' ? '0 0 #0000' : parseBoxShadowValue.formatBoxShadowValue(ast),
    boxShadow: ("" + defaultBoxShadow + important)
  };
};

var globalBoxShadowStyles = {
  '*, ::before, ::after': {
    '--tw-shadow': '0 0 #0000',
    '--tw-shadow-colored': '0 0 #0000'
  }
};
var boxShadow = (function (properties) {
  var theme = properties.theme;
  var match = properties.match;
  var getConfigValue = properties.getConfigValue;
  var errorSuggestions = properties.errors.errorSuggestions;
  var important = properties.pieces.important;
  var classValue = match(/(?<=(shadow)-)([^]*)/);

  var configValue = function (config) { return getConfigValue(theme(config), classValue); };

  var value = configValue('boxShadow');

  if (!value) {
    return errorSuggestions({
      config: 'boxShadow'
    });
  }

  return makeBoxShadow(value, important);
});

var globalTransformStyles = {
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
var globalTouchActionStyles = {
  '*, ::before, ::after': {
    '--tw-pan-x': 'var(--tw-empty,/*!*/ /*!*/)',
    '--tw-pan-y': 'var(--tw-empty,/*!*/ /*!*/)',
    '--tw-pinch-zoom': 'var(--tw-empty,/*!*/ /*!*/)'
  }
};
var globalScrollSnapTypeStyles = {
  '*, ::before, ::after': {
    '--tw-scroll-snap-strictness': 'proximity'
  }
};
var globalFontVariantNumericStyles = {
  '*, ::before, ::after': {
    '--tw-ordinal': 'var(--tw-empty,/*!*/ /*!*/)',
    '--tw-slashed-zero': 'var(--tw-empty,/*!*/ /*!*/)',
    '--tw-numeric-figure': 'var(--tw-empty,/*!*/ /*!*/)',
    '--tw-numeric-spacing': 'var(--tw-empty,/*!*/ /*!*/)',
    '--tw-numeric-fraction': 'var(--tw-empty,/*!*/ /*!*/)'
  }
};
var globalFilterStyles = {
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
var globalBackdropStyles = {
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
var globalStyles = [globalPreflightStyles, globalKeyframeStyles, globalTransformStyles, globalTouchActionStyles, globalScrollSnapTypeStyles, globalFontVariantNumericStyles, globalRingStyles, globalBoxShadowStyles, globalFilterStyles, globalBackdropStyles];

var getGlobalConfig = function (config) {
  var usedConfig = config.global && config || userPresets[config.preset] || userPresets.emotion;
  return usedConfig.global;
};

var addGlobalStylesImport = function (ref) {
  var program = ref.program;
  var t = ref.t;
  var identifier = ref.identifier;
  var config = ref.config;

  var globalConfig = getGlobalConfig(config);
  return addImport({
    types: t,
    program: program,
    identifier: identifier,
    name: globalConfig.import,
    mod: globalConfig.from
  });
};

var getGlobalDeclarationTte = function (ref) {
  var t = ref.t;
  var stylesUid = ref.stylesUid;
  var globalUid = ref.globalUid;
  var styles = ref.styles;

  return t.variableDeclaration('const', [t.variableDeclarator(globalUid, generateTaggedTemplateExpression({
  t: t,
  identifier: stylesUid,
  styles: styles
}))]);
};

var getGlobalDeclarationProperty = function (props) {
  var t = props.t;
  var stylesUid = props.stylesUid;
  var globalUid = props.globalUid;
  var state = props.state;
  var styles = props.styles;
  var ttExpression = generateTaggedTemplateExpression({
    t: t,
    identifier: state.cssIdentifier,
    styles: styles
  });
  var openingElement = t.jsxOpeningElement(t.jsxIdentifier(stylesUid.name), [t.jsxAttribute(t.jsxIdentifier('styles'), t.jsxExpressionContainer(ttExpression))], true);
  var closingElement = t.jsxClosingElement(t.jsxIdentifier('close'));
  var arrowFunctionExpression = t.arrowFunctionExpression([], t.jsxElement(openingElement, closingElement, [], true));
  var code = t.variableDeclaration('const', [t.variableDeclarator(globalUid, arrowFunctionExpression)]);
  return code;
};

var kebabize = function (string) { return string.replace(/([\da-z]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase(); };

var convertCssObjectToString = function (cssObject) {
  if (!cssObject) { return; }
  return Object.entries(cssObject).map(function (ref) {
    var k = ref[0];
    var v = ref[1];

    return typeof v === 'string' ? ((kebabize(k)) + ": " + v + ";") : (k + " {\n" + (convertCssObjectToString(v)) + "\n        }");
  }).join('\n');
};
/**
 * Trim out classes defined within the selector
 * @param {object} data Input object from userPluginData
 * @returns {object} An object containing unpacked selectors
 */


var filterClassSelectors = function (ruleset) {
  if (isEmpty(ruleset)) { return; }
  return Object.entries(ruleset).reduce(function (result, ref) {
    var obj;

    var selector = ref[0];
    var value = ref[1];
    // Trim out the classes defined within the selector
    // Classes added using addBase have already been grabbed so they get filtered to avoid duplication
    var filteredSelectorSet = selector.split(',').filter(function (s) {
      if (isClass(s)) { return false; } // Remove sub selectors with a class as one of their keys

      var subSelectors = Object.keys(value);
      var hasSubClasses = subSelectors.some(function (selector) { return isClass(selector); });
      if (hasSubClasses) { return false; }
      return true;
    }).join(',');
    if (!filteredSelectorSet) { return result; }
    return Object.assign({}, result,
      ( obj = {}, obj[filteredSelectorSet] = value, obj ));
  }, {});
};

var handleGlobalStylesFunction = function (props) {
  var references = props.references;
  references.GlobalStyles && handleGlobalStylesJsx(props);
  references.globalStyles && handleGlobalStylesVariable(props);
};

var getGlobalStyles = function (ref) {
  var state = ref.state;

  // Create the magic theme function
  var theme = getTheme(state.config.theme); // Filter out classes as they're extracted as usable classes

  var strippedPlugins = filterClassSelectors(state.userPluginData && state.userPluginData.base);
  var resolvedStyles = globalStyles.map(function (gs) { return typeof gs === 'function' ? gs({
    theme: theme,
    withAlpha: withAlpha
  }) : gs; });
  if (strippedPlugins) { resolvedStyles.push(strippedPlugins); }
  var styles = resolvedStyles.reduce(function (result, item) { return deepMerge(result, item); }, {});
  return styles;
};

var handleGlobalStylesVariable = function (ref) {
  var references = ref.references;
  var state = ref.state;

  if (references.globalStyles.length === 0) { return; }
  var styles = getGlobalStyles({
    state: state
  });
  references.globalStyles.forEach(function (path$$1) {
    var templateStyles = "(" + (JSON.stringify(styles)) + ")"; // `template` requires () wrapping

    var convertedStyles = template(templateStyles, {
      placeholderPattern: false
    })();
    path$$1.replaceWith(convertedStyles);
  });
}; // TODO: Deprecate GlobalStyles in v3
// Replaced with globalStyles import as it's more adaptable


var handleGlobalStylesJsx = function (props) {
  var references = props.references;
  var program = props.program;
  var t = props.t;
  var state = props.state;
  var config = props.config;
  if (references.GlobalStyles.length === 0) { return; }
  throwIf(references.GlobalStyles.length > 1, function () { return logGeneralError('Only one GlobalStyles import can be used'); });
  var path$$1 = references.GlobalStyles[0];
  var parentPath = path$$1.findParent(function (x) { return x.isJSXElement(); });
  throwIf(!parentPath, function () { return logGeneralError('GlobalStyles must be added as a JSX element, eg: <GlobalStyles />'); });
  var styles = convertCssObjectToString(getGlobalStyles({
    state: state,
    props: props
  }));
  var globalUid = generateUid('GlobalStyles', program);
  var stylesUid = generateUid('globalImport', program);
  var declarationData = {
    t: t,
    globalUid: globalUid,
    stylesUid: stylesUid,
    styles: styles,
    state: state
  };

  if (state.isStyledComponents) {
    var declaration = getGlobalDeclarationTte(declarationData);
    program.unshiftContainer('body', declaration);
    path$$1.replaceWith(t.jSXIdentifier(globalUid.name));
  }

  if (state.isEmotion) {
    var declaration$1 = getGlobalDeclarationProperty(declarationData);
    program.unshiftContainer('body', declaration$1);
    path$$1.replaceWith(t.jSXIdentifier(globalUid.name)); // Check if the css import has already been imported
    // https://github.com/ben-rogerson/twin.macro/issues/313

    state.isImportingCss = !state.existingCssIdentifier;
  }

  if (state.isGoober) {
    var declaration$2 = getGlobalDeclarationTte(declarationData);
    program.unshiftContainer('body', declaration$2);
    path$$1.replaceWith(t.jSXIdentifier(globalUid.name));
  }

  throwIf(state.isStitches, function () { return logGeneralError('Use the “globalStyles” import with stitches'); });
  addGlobalStylesImport({
    identifier: stylesUid,
    t: t,
    program: program,
    config: config
  });
};

var isStaticClass = function (className) {
  var staticConfig = get(staticStyles, [className, 'config']);
  var staticConfigOutput = get(staticStyles, [className, 'output']);
  var staticConfigKey = staticConfigOutput ? Object.keys(staticConfigOutput).shift() : null;
  return Boolean(staticConfig || staticConfigKey);
};

var getDynamicProperties = function (className) {
  // Get an array of matches (eg: ['col', 'col-span'])
  var dynamicKeyMatches = Object.keys(dynamicStyles).filter(function (k) { return className.startsWith(k + '-') || className === k; }) || []; // Get the best match from the match array

  var dynamicKey = dynamicKeyMatches.reduce(function (r, match) { return r.length < match.length ? match : r; }, []);
  var dynamicConfig = dynamicStyles[dynamicKey] || {}; // See if the config property is defined

  var isDynamicClass = Array.isArray(dynamicConfig) ? dynamicConfig.map(function (item) { return get(item, 'config') && !get(item, 'coerced'); }) : get(dynamicStyles, [dynamicKey, 'config']);
  return {
    isDynamicClass: isDynamicClass,
    dynamicConfig: dynamicConfig,
    dynamicKey: dynamicKey
  };
};

var isEmpty$1 = function (value) { return value === undefined || value === null || typeof value === 'object' && Object.keys(value).length === 0 || typeof value === 'string' && value.trim().length === 0; };

var getProperties = function (className, state, ref) {
  var isCsOnly = ref.isCsOnly; if ( isCsOnly === void 0 ) isCsOnly = false;

  if (!className) { return; }
  var isCss = isShortCss(className);
  if (isCsOnly || isCss) { return {
    hasMatches: isCss,
    type: 'css'
  }; }
  if (isArbitraryCss(className)) { return {
    hasMatches: true,
    type: 'arbitraryCss'
  }; }
  var isStatic = isStaticClass(className);
  var ref$1 = getDynamicProperties(className);
  var isDynamicClass = ref$1.isDynamicClass;
  var dynamicConfig = ref$1.dynamicConfig;
  var dynamicKey = ref$1.dynamicKey;
  var corePlugin = dynamicConfig.plugin;
  var hasUserPlugins = !isEmpty$1(state.config.plugins);
  var type = isStatic && 'static' || isDynamicClass && 'dynamic' || corePlugin && 'corePlugin';
  return {
    type: type,
    corePlugin: corePlugin,
    hasMatches: Boolean(type),
    dynamicKey: dynamicKey,
    dynamicConfig: dynamicConfig,
    hasUserPlugins: hasUserPlugins
  };
};

var stringifyScreen = function (config, screenName) {
  var screen = get(config, ['theme', 'screens', screenName]);

  if (typeof screen === 'undefined') {
    throw new Error(("Couldn’t find Tailwind the screen \"" + screenName + "\" in the Tailwind config"));
  }

  if (typeof screen === 'string') { return ("@media (min-width: " + screen + ")"); }

  if (typeof screen.raw === 'string') {
    return ("@media " + (screen.raw));
  }

  var string = (Array.isArray(screen) ? screen : [screen]).map(function (range) {
    return [typeof range.min === 'string' ? ("(min-width: " + (range.min) + ")") : null, typeof range.max === 'string' ? ("(max-width: " + (range.max) + ")") : null].filter(Boolean).join(' and ');
  }).join(', ');
  return string ? ("@media " + string) : '';
};

var orderByScreens = function (className, state) {
  var classNames = className.match(/\S+/g) || [];
  var screens = Object.keys(state.config.theme.screens);

  var screenCompare = function (a, b) {
    var A = a.includes(':') ? a.split(':')[0] : a;
    var B = b.includes(':') ? b.split(':')[0] : b;
    return screens.indexOf(A) < screens.indexOf(B) ? -1 : 1;
  }; // Tim Sort provides accurate sorting in node < 11
  // https://github.com/ben-rogerson/twin.macro/issues/20


  timSort.sort(classNames, screenCompare);
  return classNames;
};

var variantDarkMode = function (ref) {
  var hasGroupVariant = ref.hasGroupVariant;
  var config = ref.config;
  var errorCustom = ref.errorCustom;

  var styles = {
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

var variantLightMode = function (ref) {
  var hasGroupVariant = ref.hasGroupVariant;
  var config = ref.config;
  var errorCustom = ref.errorCustom;

  var styles = {
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

var prefixDarkLightModeClass = function (className, ref) {
  var hasDarkVariant = ref.hasDarkVariant;
  var hasLightVariant = ref.hasLightVariant;
  var config = ref.config;

  var themeVariant = hasDarkVariant && config('darkMode') === 'class' && ['dark ', 'dark'] || hasLightVariant && (config('lightMode') === 'class' || config('darkMode') === 'class') && ['light ', 'light'];
  if (!themeVariant) { return className; }
  return themeVariant.map(function (v) { return className.split(', ').map(function (cn) { return ("." + v + cn); }).join(', '); }).join(', ');
};

/* eslint-disable @typescript-eslint/restrict-plus-operands */
function objectWithoutProperties$1 (obj, exclude) { var target = {}; for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k) && exclude.indexOf(k) === -1) target[k] = obj[k]; return target; }

var createPeer = function (selector) {
  var selectors = Array.isArray(selector) ? selector : [selector];
  return selectors.map(function (s) { return (".peer:" + s + " ~ &"); }).join(', ');
};

var fullVariantConfig = variantConfig({
  variantDarkMode: variantDarkMode,
  variantLightMode: variantLightMode,
  prefixDarkLightModeClass: prefixDarkLightModeClass,
  createPeer: createPeer
});
/**
 * Validate variants against the variants config key
 */

var validateVariants = function (ref) {
  var variants = ref.variants;
  var state = ref.state;
  var rest$1 = objectWithoutProperties$1( ref, ["variants", "state"] );
  var rest = rest$1;

  if (!variants) { return []; }
  var screens = get(state.config, ['theme', 'screens']);
  var screenNames = Object.keys(screens);
  return variants.map(function (variant) {
    var isResponsive = screenNames && screenNames.includes(variant);
    if (isResponsive) { return stringifyScreen(state.config, variant); }
    var foundVariant = fullVariantConfig[variant];

    if (!foundVariant) {
      var arbitraryVariant = variant.match(/^\[(.+)]/);
      if (arbitraryVariant) { foundVariant = arbitraryVariant[1]; }
    }

    if (!foundVariant) {
      if (variant === 'only-child') {
        throw new babelPluginMacros.MacroError(logGeneralError('The "only-child:" variant was deprecated in favor of "only:"'));
      }

      if (variant === 'not-only-child') {
        throw new babelPluginMacros.MacroError(logGeneralError('The "not-only-child:" variant was deprecated in favor of "not-only:"'));
      }

      var validVariants = Object.assign({}, (screenNames.length > 0 && {
          'Screen breakpoints': screenNames
        }),
        {'Built-in variants': Object.keys(fullVariantConfig)});
      throw new babelPluginMacros.MacroError(logNoVariant(variant, validVariants));
    }

    if (typeof foundVariant === 'function') {
      var context = Object.assign({}, rest,
        {config: function (item) { return state.config[item] || null; },
        errorCustom: function (message) {
          throw new babelPluginMacros.MacroError(logGeneralError(message));
        }});
      foundVariant = foundVariant(context);
    }

    return foundVariant;
  }).filter(Boolean);
};
/**
 * Split the variant(s) from the className
 */


var splitVariants = function (ref) {
  var classNameRaw = ref.classNameRaw;
  var state = ref.state;

  var variantsList = [];
  var variant;
  var className = classNameRaw;

  while (variant !== null) {
    // Match arbitrary variants
    variant = className.match(/^([\d_a-z-]+):|^\[.*?]:/);

    if (variant) {
      className = className.slice(variant[0].length);
      variantsList.push(variant[0].slice(0, -1).replace(new RegExp(SPACE_ID, 'g'), ' '));
    }
  } // dark: and light: variants


  var hasDarkVariant = variantsList.some(function (v) { return v === 'dark'; });
  var hasLightVariant = variantsList.some(function (v) { return v === 'light'; });

  if (hasDarkVariant && hasLightVariant) {
    throw new babelPluginMacros.MacroError(logGeneralError('The light: and dark: variants can’t be used on the same element'));
  }

  var hasGroupVariant = variantsList.some(function (v) { return v.startsWith('group-'); }); // Match the filtered variants

  var variants = validateVariants({
    variants: variantsList,
    state: state,
    hasDarkVariant: hasDarkVariant,
    hasLightVariant: hasLightVariant,
    hasGroupVariant: hasGroupVariant
  });
  var hasVariants = variants.length > 0;
  return {
    classNameRawNoVariants: className,
    className: className,
    // TODO: Hoist the definition for className up, it's buried here
    variants: variants,
    hasVariants: hasVariants
  };
};

var getPeerValueFromVariant = function (variant) { return get(/\.peer:(.+) ~ &/.exec(variant), '1'); };
/**
 * Combine peers when they are used in succession
 */


var combinePeers = function (ref) {
  var variants = ref.variants;

  return variants.map(function (_, i) {
  var isPeer = false;
  var index = i;
  var returnVariant;
  var peerList = [];

  do {
    var peer = getPeerValueFromVariant(variants[index]);
    isPeer = Boolean(peer);

    if (isPeer) {
      peerList.push(peer);
      variants[index] = null;
      index = index + 1;
    } else {
      returnVariant = peerList.length === 0 ? variants[index] : (".peer:" + (peerList.join(':')) + " ~ &");
    }
  } while (isPeer);

  return returnVariant;
}).filter(Boolean);
};

var addSassyPseudo = function (ref) {
  var variants = ref.variants;
  var state = ref.state;

  if (!state.configTwin.sassyPseudo) { return variants; }
  return variants.map(function (v) { return v.replace(/(?<= ):|^:/g, '&:'); });
};

var formatTasks = [combinePeers, addSassyPseudo];

var addVariants = function (ref) {
  var results = ref.results;
  var style = ref.style;
  var pieces = ref.pieces;
  var state = ref.state;

  var variants = pieces.variants;
  var hasVariants = pieces.hasVariants;
  if (!hasVariants) { return style; }

  for (var i = 0, list = formatTasks; i < list.length; i += 1) {
    var task = list[i];

    variants = task({
      variants: variants,
      state: state
    });
  }

  var styleWithVariants = cleanSet(results, variants, Object.assign({}, get(styleWithVariants, variants, {}),
    style));
  return styleWithVariants;
};

function findRightBracket(classes, start, end, brackets) {
  if ( start === void 0 ) start = 0;
  if ( end === void 0 ) end = classes.length;
  if ( brackets === void 0 ) brackets = ['(', ')'];

  var stack = 0;

  for (var index = start; index < end; index++) {
    if (classes[index] === brackets[0]) {
      stack += 1;
    } else if (classes[index] === brackets[1]) {
      if (stack === 0) { return; }
      if (stack === 1) { return index; }
      stack -= 1;
    }
  }
}

var sliceToSpace = function (str) {
  var spaceIndex = str.indexOf(' ');
  if (spaceIndex === -1) { return str; }
  return str.slice(0, spaceIndex);
}; // eslint-disable-next-line max-params


function spreadVariantGroups(classes, context, importantContext, start, end) {
  if ( context === void 0 ) context = '';
  if ( importantContext === void 0 ) importantContext = false;
  if ( start === void 0 ) start = 0;

  if (classes === '') { return []; }
  var results = [];
  classes = classes.slice(start, end).trim(); // variant / class / group

  var reg = /(\[.*?]:|[\w-]+:)|([\w-./[\]]+!?)|\(|(\S+)/g;
  var match;
  var baseContext = context;

  while (match = reg.exec(classes)) {
    var variant = match[1];
    var className = match[2];
    var weird = match[3];

    if (variant) {
      // Replace arbitrary variant spaces with a placeholder to avoid incorrect splitting
      var spaceReplacedVariant = variant.replace(/\s+/g, SPACE_ID);
      context += spaceReplacedVariant; // Skip empty classes

      if (/\s/.test(classes[reg.lastIndex])) {
        context = baseContext;
        continue;
      }

      if (classes[reg.lastIndex] === '(') {
        var closeBracket = findRightBracket(classes, reg.lastIndex);
        throwIf(typeof closeBracket !== 'number', function () { return logGeneralError(("An ending bracket ')' wasn’t found for these classes:\n\n" + classes)); });
        var importantGroup = classes[closeBracket + 1] === '!';
        results.push.apply(results, spreadVariantGroups(classes, context, importantContext || importantGroup, reg.lastIndex + 1, closeBracket));
        reg.lastIndex = closeBracket + (importantGroup ? 2 : 1);
        context = baseContext;
      }
    } else if (className && className.includes('[')) {
      var closeBracket$1 = findRightBracket(classes, match.index, classes.length, ['[', ']']);
      throwIf(typeof closeBracket$1 !== 'number', function () { return logGeneralError(("An ending bracket ']' wasn’t found for these classes:\n\n" + classes)); });
      var importantGroup$1 = classes[closeBracket$1 + 1] === '!';
      var cssClass = classes.slice(match.index, closeBracket$1 + 1);
      var hasSlashOpacity = classes.slice(closeBracket$1 + 1, closeBracket$1 + 2) === '/';
      var opacityValue = hasSlashOpacity ? sliceToSpace(classes.slice(closeBracket$1 + 1)) : ''; // Convert spaces in classes to a temporary string so the css won't be
      // split into multiple classes

      var spaceReplacedClass = cssClass // Normalise the spacing - single spaces only
      // Replace spaces with the space id stand-in
      // Remove newlines within the brackets to allow multiline values
      .replace(/\s+/g, SPACE_ID);
      results.push(context + spaceReplacedClass + opacityValue + (importantGroup$1 || importantContext ? '!' : ''));
      reg.lastIndex = closeBracket$1 + (importantGroup$1 ? 2 : 1) + opacityValue.length;
      context = baseContext;
    } else if (className) {
      var tail = !className.endsWith('!') && importantContext ? '!' : '';
      results.push(context + className + tail);
      context = baseContext;
    } else if (weird) {
      results.push(context + weird);
    } else {
      var closeBracket$2 = findRightBracket(classes, match.index);
      throwIf(typeof closeBracket$2 !== 'number', function () { return logGeneralError(("An ending bracket ')' wasn’t found for these classes:\n\n" + classes)); });
      var importantGroup$2 = classes[closeBracket$2 + 1] === '!';
      results.push.apply(results, spreadVariantGroups(classes, context, importantContext || importantGroup$2, match.index + 1, closeBracket$2));
      reg.lastIndex = closeBracket$2 + (importantGroup$2 ? 2 : 1);
    }
  }

  return results;
}

var handleVariantGroups = function (classes) { return spreadVariantGroups(classes).join(' '); };

/**
 * Add important to a value
 * Only used for static and dynamic styles - not core plugins
 */

var mergeImportant = function (style, hasImportant) {
  if (!hasImportant) { return style; } // Bail if the ruleset already has an important

  if (JSON.stringify(style).includes(' !important')) { return style; }
  return Object.entries(style).reduce(function (result, item) {
    var obj;

    var key = item[0];
    var value = item[1];
    if (typeof value === 'object') { return mergeImportant(value, hasImportant); } // Don't add important to css variables

    var newValue = key.startsWith('--') ? value : (value + " !important");
    return deepMerge(result, ( obj = {}, obj[key] = newValue, obj ));
  }, {});
};
/**
 * Split the important from the className
 */


var splitImportant = function (ref) {
  var className = ref.className;

  var hasPrefix = className.slice(0, 1) === '!';
  var hasSuffix = className.slice(-1) === '!';
  var hasImportant = hasSuffix || hasPrefix;

  if (hasImportant) {
    className = hasSuffix ? className.slice(0, -1) : className.slice(1);
  }

  var important = hasImportant ? ' !important' : '';
  return {
    className: className,
    hasImportant: hasImportant,
    important: important
  };
};

/**
 * Split the negative from the className
 */

var splitNegative = function (ref) {
  var className = ref.className;

  var hasNegative = !isShortCss(className) && className.slice(0, 1) === '-';

  if (hasNegative) {
    className = className.slice(1, className.length);
  }

  var negative = hasNegative ? '-' : '';
  return {
    className: className,
    hasNegative: hasNegative,
    negative: negative
  };
};

var maybeAddNegative = function (value, negative) {
  if (!negative) { return value; }

  if (typeof value === 'string') {
    if (value.startsWith('-')) { return value.slice(1); }
    if (value.startsWith('var(')) { return ("calc(" + value + " * -1)"); }
  }

  if (isNumeric(value)) { return ("" + negative + value); }
  return value;
};

var splitPrefix = function (props) {
  var className = props.className;
  var state = props.state;
  var ref = state.config;
  var prefix = ref.prefix;
  if (!prefix) { return {
    className: className,
    hasPrefix: false
  }; }
  if (!className.startsWith(prefix)) { return {
    className: className,
    hasPrefix: false
  }; }
  var newClassName = className.slice(prefix.length);
  return {
    className: newClassName,
    hasPrefix: true
  };
};

var getAlphaValue = function (alpha) { return Number.isInteger(Number(alpha)) ? Number(alpha) / 100 : alpha; };

var getLastSlashIndex = function (className) {
  var match = className.match(/\/(?![^[]*])/g);
  if (!match) { return -1; }
  var lastSlashIndex = className.lastIndexOf(match[match.length - 1]);
  return lastSlashIndex;
};

var splitAlpha = function (props) {
  var className = props.className;
  var slashIdx = getLastSlashIndex(className);
  throwIf(slashIdx === className.length - 1, function () { return logGeneralError(("The class “" + className + "” can’t end with a slash")); });
  if (slashIdx === -1) { return {
    className: className,
    classNameNoSlashAlpha: className
  }; }
  var rawAlpha = className.slice(Number(slashIdx) + 1);
  var hasAlphaArbitrary = Boolean(rawAlpha[0] === '[' && rawAlpha[rawAlpha.length - 1] === ']');
  var hasMatchedAlpha = Boolean(!hasAlphaArbitrary && get(props, 'state.config.theme.opacity')[rawAlpha]);
  var hasAlpha = hasAlphaArbitrary || hasMatchedAlpha || false;
  var context = {
    hasAlpha: hasAlpha,
    hasAlphaArbitrary: hasAlphaArbitrary
  };
  if (!hasAlpha) { return Object.assign({}, context,
    {classNameNoSlashAlpha: className}); }
  if (hasAlphaArbitrary) { return Object.assign({}, context,
    {alpha: formatProp(rawAlpha.slice(1, -1)),
    classNameNoSlashAlpha: className.slice(0, slashIdx)}); } // Opacity value has been matched in the config

  return Object.assign({}, context,
    {alpha: String(getAlphaValue(rawAlpha)),
    classNameNoSlashAlpha: className.slice(0, slashIdx)});
};

var splitters = [splitVariants, splitPrefix, splitNegative, splitImportant, splitAlpha // Keep after splitImportant
];
var getPieces = (function (context) {
  var results = splitters.reduce(function (results, splitter) { return (Object.assign({}, results,
    splitter(results))); }, context);
  delete results.state;
  return results;
});

var precheckGroup = function (ref) {
  var classNameRaw = ref.classNameRaw;

  return throwIf(classNameRaw === 'group', function () { return ("\n\n\"group\" must be added as className:" + (logBadGood('tw`group`', '<div className="group">')) + "\nRead more at https://twinredirect.page.link/group\n"); });
};

var precheckPeer = function (ref) {
  var classNameRaw = ref.classNameRaw;

  return throwIf(classNameRaw === 'peer', function () { return ("\n\n\"peer\" must be added as className:" + (logBadGood('tw`peer`', '<div className="peer">')) + "\nRead more at https://twinredirect.page.link/peer\n"); });
};

var joinWithNoDoubleHyphens = function (arr) { return arr.join('-').replace(/-+/g, '-'); };

var preCheckPrefix = function (ref) {
  var ref_pieces = ref.pieces;
  var className = ref_pieces.className;
  var hasPrefix = ref_pieces.hasPrefix;
  var state = ref.state;

  if (isShortCss(className)) { return; }
  var ref$1 = state.config;
  var prefix = ref$1.prefix;
  if (hasPrefix === Boolean(prefix)) { return; }
  var classSuggestion = joinWithNoDoubleHyphens([prefix, className]);
  throwIf(!className.startsWith(prefix), function () { return ("\n\n“" + className + "” should have a prefix:" + (logBadGood(className, classSuggestion))); });
};

var preCheckNoHyphenSuffix = function (ref) {
  var ref_pieces = ref.pieces;
  var className = ref_pieces.className;
  var classNameRaw = ref_pieces.classNameRaw;

  if (isShortCss(className)) { return; }
  throwIf(classNameRaw.endsWith('-'), function () { return logBadGood(("“" + className + "” should not have a '-' suffix"), ("Change it to “" + (className.replace(/-*$/, '')) + "”")); });
};

var doPrechecks = function (prechecks, context) {
  for (var i = 0, list = prechecks; i < list.length; i += 1) {
    var precheck = list[i];

    precheck(context);
  }
};

var precheckExports = ({
  default: doPrechecks,
  precheckGroup: precheckGroup,
  precheckPeer: precheckPeer,
  preCheckPrefix: preCheckPrefix,
  preCheckNoHyphenSuffix: preCheckNoHyphenSuffix
});

var gridCompare = function (a, b) {
  // The order of grid properties matter when combined into a single object
  // So here we move col-span-x to the beginning to avoid being trumped
  // https://github.com/ben-rogerson/twin.macro/issues/363
  var A = /(^|:)col-span-/.test(a) ? -1 : 0;
  var B = /(^|:)col-span-/.test(b) ? -1 : 0;
  return A - B;
};

var orderGridProperty = function (className) {
  var classNames = className.match(/\S+/g) || []; // Tim Sort provides accurate sorting in node < 11
  // https://github.com/ben-rogerson/twin.macro/issues/20

  timSort.sort(classNames, gridCompare);
  return classNames.join(' ');
};

var transitionCompare = function (a, b) {
  // The order of transition properties matter when combined into a single object
  // So here we move transition-x to the beginning to avoid being trumped
  // https://github.com/ben-rogerson/twin.macro/issues/363
  var A = /(^|:)transition(!|$)/.test(a) ? -1 : 0;
  var B = /(^|:)transition(!|$)/.test(b) ? -1 : 0;
  return A - B;
};

var orderTransitionProperty = function (className) {
  var classNames = className.match(/\S+/g) || []; // Tim Sort provides accurate sorting in node < 11
  // https://github.com/ben-rogerson/twin.macro/issues/20

  timSort.sort(classNames, transitionCompare);
  return classNames.join(' ');
};

var transformCompare = function (a, b) {
  // The order of transform properties matter when combined into a single object
  // So here we move transform to the beginning to avoid being trumped
  // https://github.com/ben-rogerson/twin.macro/issues/363
  var A = /(^|:)transform(!|$)/.test(a) ? -1 : 0;
  var B = /(^|:)transform(!|$)/.test(b) ? -1 : 0;
  return A - B;
};

var orderTransformProperty = function (className) {
  var classNames = className.match(/\S+/g) || []; // Tim Sort provides accurate sorting in node < 11
  // https://github.com/ben-rogerson/twin.macro/issues/20

  timSort.sort(classNames, transformCompare);
  return classNames.join(' ');
};

var ringCompare = function (a, b) {
  // The order of ring properties matter when combined into a single object
  // So here we move ring-opacity-xxx to the end to avoid being trumped
  // https://github.com/ben-rogerson/twin.macro/issues/374
  var A = /(^|:)ring-opacity-/.test(a) ? 0 : -1;
  var B = /(^|:)ring-opacity-/.test(b) ? 0 : -1;
  return A - B;
};

var orderRingProperty = function (className) {
  var classNames = className.match(/\S+/g) || []; // Tim Sort provides accurate sorting in node < 11
  // https://github.com/ben-rogerson/twin.macro/issues/20

  timSort.sort(classNames, ringCompare);
  return classNames.join(' ');
};

var bgOpacityCompare = function (a, b) {
  // The order of bg-opacity matters when combined into a single object
  // So we move bg-opacity-xxx to the end to avoid being trumped by the bg color
  var A = /(^|:)bg-opacity-/.test(a) ? 0 : -1;
  var B = /(^|:)bg-opacity-/.test(b) ? 0 : -1;
  return A - B;
};

var orderBgOpacityProperty = function (className) {
  var classNames = className.match(/\S+/g) || []; // Tim Sort provides accurate sorting in node < 11
  // https://github.com/ben-rogerson/twin.macro/issues/20

  timSort.sort(classNames, bgOpacityCompare);
  return classNames.join(' ');
};

var compare = function (a, b) {
  // The order of grid properties matter when combined into a single object
  // So here we move backdrop-filter to the beginning to avoid being trumped
  // https://github.com/ben-rogerson/twin.macro/issues/363
  var A = /(^|:)backdrop-filter/.test(a) ? -1 : 0;
  var B = /(^|:)backdrop-filter/.test(b) ? -1 : 0;
  return A - B;
};

var orderBackdropProperty = function (className) {
  var classNames = className.match(/\S+/g) || []; // Tim Sort provides accurate sorting in node < 11
  // https://github.com/ben-rogerson/twin.macro/issues/20

  timSort.sort(classNames, compare);
  return classNames.join(' ');
};

var compare$1 = function (a, b) {
  // The order of grid properties matter when combined into a single object
  // So here we move filter to the beginning to avoid being trumped
  // https://github.com/ben-rogerson/twin.macro/issues/363
  var A = /(^|:)filter/.test(a) ? -1 : 0;
  var B = /(^|:)filter/.test(b) ? -1 : 0;
  return A - B;
};

var orderFilterProperty = function (className) {
  var classNames = className.match(/\S+/g) || []; // Tim Sort provides accurate sorting in node < 11
  // https://github.com/ben-rogerson/twin.macro/issues/20

  timSort.sort(classNames, compare$1);
  return classNames.join(' ');
};

var addContentClass = function (classes, state) {
  var newClasses = [];
  classes.forEach(function (classSet) {
    var shouldAddContent = /(?!.*:content($|\[))(before:|after:)/.test(classSet);
    if (!shouldAddContent) { return newClasses.push(classSet); }
    var variants = classSet.split(':').slice(0, -1).join(':'); // Avoid adding content if it's already in the new class list

    if (!newClasses.some(function (c) { return c.startsWith((variants + ":content")); })) // Temp fix until emotion supports css variables with the content property
      { newClasses.push((variants + ":content[" + (state.isEmotion ? '""' : 'var(--tw-content)') + "]")); }
    newClasses.push(classSet);
  });
  return newClasses;
};

var transformImportant = function (ref) {
  var style = ref.style;
  var hasImportant = ref.pieces.hasImportant;

  return mergeImportant(style, hasImportant);
};

var applyTransforms = function (context) {
  var style = context.style;
  var type = context.type;
  if (!style) { return; }
  var result = context.style;
  if (type !== 'corePlugin') { result = transformImportant(context); }
  return result;
};

var mergeChecks = [// Match exact selector
function (ref) {
  var key = ref.key;
  var className = ref.className;

  return key === ("" + className);
}, // Match class selector (inc dot)
function (ref) {
  var key = ref.key;
  var className = ref.className;

  return !key.includes('{{') && key.match(new RegExp(("(?:^|>|~|\\+|\\*| )\\." + className + "(?: |>|~|\\+|\\*|:|$)"), 'g'));
}, // Match parent selector placeholder
function (ref) {
  var key = ref.key;
  var className = ref.className;

  return key.includes(("{{" + className + "}}"));
}, // Match possible symbols after the selector (ex dot)
function (ref) {
  var key = ref.key;
  var className = ref.className;

  return [' ', ':', '>', '~', '+', '*'].some(function (suffix) { return key.startsWith(("" + className + suffix)); });
}];

var getMatches = function (ref) {
  var className = ref.className;
  var data = ref.data;
  var sassyPseudo = ref.sassyPseudo;
  var state = ref.state;

  return Object.entries(data).reduce(function (result, item) {
  var obj, obj$1;

  var rawKey = item[0];
  var value = item[1]; // Remove the prefix before attempting match

  var ref = splitPrefix({
    className: rawKey,
    state: state
  });
  var key = ref.className;
  key = key.replace(/\\/g, '');
  var childValue = Object.values(value)[0];
  var hasChildNesting = !Array.isArray(childValue) && typeof childValue === 'object';

  if (hasChildNesting) {
    var matches = getMatches({
      className: className,
      data: value,
      sassyPseudo: sassyPseudo,
      state: state
    });
    if (!isEmpty(matches)) { return Object.assign({}, result,
      ( obj = {}, obj[key] = matches, obj )); }
  }

  var shouldMergeValue = mergeChecks.some(function (item) { return item({
    key: key,
    value: value,
    className: className,
    data: data,
    prefix: ''
  }); });

  if (shouldMergeValue) {
    var newKey = formatKey(key, {
      className: className,
      sassyPseudo: sassyPseudo
    });
    return newKey ? Object.assign({}, result,
      ( obj$1 = {}, obj$1[newKey] = value, obj$1 )) : Object.assign({}, result,
      value);
  }

  return result;
}, {});
}; // The key gets formatted with these checks


var formatTasks$1 = [function (ref) {
  var key = ref.key;

  return key.replace(/\\/g, '').trim();
}, // Match exact selector
function (ref) {
  var key = ref.key;
  var className = ref.className;

  return key === ("." + className) ? '' : key;
}, // Replace the parent selector placeholder
function (ref) {
  var key = ref.key;
  var className = ref.className;

  var parentSelectorIndex = key.indexOf(("{{" + className + "}}"));
  var replacement = parentSelectorIndex > 0 ? '&' : '';
  return key.replace(("{{" + className + "}}"), replacement);
}, // Replace the classname at start of selector (eg: &:hover) (postCSS supplies
// flattened selectors so it looks like .blah:hover at this point)
function (ref) {
  var key = ref.key;
  var className = ref.className;

  return key.startsWith(("." + className)) ? key.slice(("." + className).length) : key;
}, function (ref) {
  var key = ref.key;

  return key.trim();
}, // Add the parent selector at the start when it has the sassy pseudo enabled
function (ref) {
  var key = ref.key;
  var sassyPseudo = ref.sassyPseudo;

  return sassyPseudo && key.startsWith(':') ? ("&" + key) : key;
}, // Remove the unmatched class wrapping
function (ref) {
  var key = ref.key;

  return key.replace(/{{/g, '.').replace(/}}/g, '');
}];

var formatKey = function (selector, ref) {
  var className = ref.className;
  var sassyPseudo = ref.sassyPseudo;
  var prefix = ref.prefix;

  if (selector === className) { return; }
  var key = selector;

  for (var i = 0, list = formatTasks$1; i < list.length; i += 1) {
    var task = list[i];

    key = task({
      key: key,
      className: className,
      sassyPseudo: sassyPseudo,
      prefix: prefix
    });
  }

  return key;
};
/**
 * Split grouped selectors (`.class1, class2 {}`) and filter non-selectors
 * @param {object} data Input object from userPluginData
 * @returns {object} An object containing unpacked selectors
 */


var normalizeUserPluginSelectors = function (data) { return Object.entries(data).reduce(function (result, ref) {
  var selector = ref[0];
  var value = ref[1];

  var keys = selector.split(',').filter(function (s) { return isMediaQuery(s) ? Object.keys(value).some(function (selector) { return isClass(selector); }) : isClass(s); }).reduce(function (result, property) {
    var obj;

    return (Object.assign({}, result,
    ( obj = {}, obj[property] = value, obj )));
  }, {});
  return Object.assign({}, result,
    keys);
}, {}); };

var handleUserPlugins = (function (ref) {
  var ref_state = ref.state;
  var sassyPseudo = ref_state.configTwin.sassyPseudo;
  var ref_state_userPluginData = ref_state.userPluginData;
  var base = ref_state_userPluginData.base;
  var components = ref_state_userPluginData.components;
  var utilities = ref_state_userPluginData.utilities;
  var state = ref.state;
  var className = ref.className;

  var result;
  [base, components, utilities].find(function (rawData) {
    var data = normalizeUserPluginSelectors(rawData);
    var matches = getMatches({
      className: className,
      data: data,
      sassyPseudo: sassyPseudo,
      state: state
    });
    var hasMatches = !isEmpty(matches);
    result = hasMatches ? matches : result;
    return hasMatches;
  });
  return result;
});

var handleStatic = (function (ref) {
  var pieces = ref.pieces;

  var className = pieces.className;
  return get(staticStyles, [className, 'output']);
});

var normalizeValue = function (value) {
  if (['string', 'function'].includes(typeof value) || Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  logGeneralError(("The config value \"" + (JSON.stringify(value)) + "\" is unsupported - try a string, function, array, or number"));
};

var splitAtDash = function (twClass, fromEnd) {
  if ( fromEnd === void 0 ) fromEnd = 1;

  var splitClass = twClass.split('-');
  return {
    firstPart: splitClass.slice(0, fromEnd * -1).join('-'),
    lastPart: splitClass.slice(fromEnd * -1).join('-')
  };
};
/**
 * Searches the tailwindConfig
 */


var getConfigValue = function (from, matcher) {
  if (!from) { return; } // Match default value from current object

  if (isEmpty(matcher)) {
    if (isEmpty(from.DEFAULT)) { return; }
    return normalizeValue(from.DEFAULT);
  } // Match exact


  var match = from[matcher];

  if (['string', 'number', 'function'].includes(typeof match) || Array.isArray(match)) {
    return normalizeValue(match);
  } // Match a default value from child object


  var defaultMatch = typeof match === 'object' && match.DEFAULT;

  if (defaultMatch) {
    return normalizeValue(defaultMatch);
  } // A weird loop is used below so the return busts out of the parent


  var index = 1;
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */

  for (var i$1 = 0, list = matcher.split('-'); i$1 < list.length; i$1 += 1) {

    var ref = splitAtDash(matcher, index);
    var firstPart = ref.firstPart;
    var lastPart = ref.lastPart;
    var objectMatch = from[firstPart];

    if (objectMatch && typeof objectMatch === 'object') {
      return getConfigValue(objectMatch, lastPart);
    }

    index = index + 1;
  }
};

var styleify = function (ref) {
  var obj;

  var property = ref.property;
  var value = ref.value;
  var negative = ref.negative;
  value = Array.isArray(value) ? value.join(', ') : maybeAddNegative(value, negative);
  return Array.isArray(property) ? property.reduce(function (results, item) {
    var obj;

    return (Object.assign({}, results,
    ( obj = {}, obj[item] = value, obj )));
  }, {}) : ( obj = {}, obj[property] = value, obj );
};

var handleDynamic = (function (ref) {
  var theme = ref.theme;
  var pieces = ref.pieces;
  var state = ref.state;
  var dynamicKey = ref.dynamicKey;
  var dynamicConfig = ref.dynamicConfig;

  var className = pieces.className;
  var negative = pieces.negative;

  var getConfig = function (ref) {
    var config = ref.config;
    var configFallback = ref.configFallback;

    return config && theme(config) || configFallback && theme(configFallback);
  };

  var styleSet = Array.isArray(dynamicConfig) ? dynamicConfig : [dynamicConfig];
  var piece = className.slice(Number(dynamicKey.length) + 1);
  var results;
  styleSet.find(function (item) {
    var value = getConfigValue(getConfig(item), piece);

    if (value) {
      results = typeof item.value === 'function' ? item.value({
        value: value,
        negative: negative,
        isEmotion: state.isEmotion
      }) : styleify({
        property: item.prop,
        value: value,
        negative: negative
      });
    }

    return value;
  });
  throwIf(!results || className.endsWith('-'), function () { return errorSuggestions({
    pieces: pieces,
    state: state,
    config: styleSet.map(function (item) { return item.config; }) || [],
    dynamicKey: dynamicKey
  }); });
  return results;
});

var getColor = function (ref) {
  var matchConfigValue = ref.matchConfigValue;
  var pieces = ref.pieces;

  return function (colors) {
  var result;
  colors.find(function (ref) {
    var matchStart = ref.matchStart;
    var property = ref.property;
    var configSearch = ref.configSearch;
    var opacityVariable = ref.opacityVariable;
    var useSlashAlpha = ref.useSlashAlpha;

    // Disable slash alpha matching when a variable is supplied.
    // For classes that use opacity classes 'bg-opacity-50'.
    if (useSlashAlpha === undefined) {
      useSlashAlpha = !opacityVariable;
    }

    var color$$1 = matchConfigValue(configSearch, ("(?<=(" + matchStart + "-))([^]*)" + (useSlashAlpha ? "(?=/)" : '')));
    if (!color$$1) { return false; }
    var values = Array.isArray(property) ? property : [property];
    var res = values.map(function (p) { return withAlpha({
      color: color$$1,
      property: p,
      pieces: pieces,
      useSlashAlpha: useSlashAlpha,
      variable: opacityVariable
    }); }).filter(Boolean);
    if (res.length === 0) { return false; }
    result = deepMerge.apply(void 0, res);
    return true;
  });
  return result;
};
};

var accentColor = (function (properties) {
  var coercedColor = properties.getCoercedColor('accentColor');
  if (coercedColor) { return coercedColor; }
  return properties.errors.errorSuggestions({
    config: 'accentColor'
  });
});

var backdropBlur = (function (properties) {
  var theme = properties.theme;
  var match = properties.match;
  var getConfigValue = properties.getConfigValue;
  var errorSuggestions = properties.errors.errorSuggestions;
  var important = properties.pieces.important;
  var classValue = match(/(?<=(backdrop-blur)-)([^]*)/);

  var configValue = function (config) { return getConfigValue(theme(config), classValue); };

  var value = configValue('backdropBlur');

  if (!value) {
    errorSuggestions({
      config: ['backdropBlur']
    });
  }

  var backdropBlurValue = Array.isArray(value) ? value.map(function (v) { return ("blur(" + v + ")"); }).join(' ') : ("blur(" + value + ")");
  return {
    '--tw-backdrop-blur': backdropBlurValue,
    backdropFilter: ("var(--tw-backdrop-filter)" + important)
  };
});

var backdropBrightness = (function (properties) {
  var theme = properties.theme;
  var match = properties.match;
  var getConfigValue = properties.getConfigValue;
  var errorSuggestions = properties.errors.errorSuggestions;
  var important = properties.pieces.important;
  var classValue = match(/(?<=(backdrop-brightness)-)([^]*)/);

  var configValue = function (config) { return getConfigValue(theme(config), classValue); };

  var value = configValue('backdropBrightness');

  if (!value) {
    errorSuggestions({
      config: ['backdropBrightness']
    });
  }

  var backdropBrightnessValue = Array.isArray(value) ? value.map(function (v) { return ("brightness(" + v + ")"); }).join(' ') : ("brightness(" + value + ")");
  return {
    '--tw-backdrop-brightness': backdropBrightnessValue,
    backdropFilter: ("var(--tw-backdrop-filter)" + important)
  };
});

var backdropContrast = (function (properties) {
  var theme = properties.theme;
  var match = properties.match;
  var getConfigValue = properties.getConfigValue;
  var errorSuggestions = properties.errors.errorSuggestions;
  var important = properties.pieces.important;
  var classValue = match(/(?<=(backdrop-contrast)-)([^]*)/);

  var configValue = function (config) { return getConfigValue(theme(config), classValue); };

  var value = configValue('backdropContrast');

  if (!value) {
    errorSuggestions({
      config: ['backdropContrast']
    });
  }

  var backdropContrastValue = Array.isArray(value) ? value.map(function (v) { return ("contrast(" + v + ")"); }).join(' ') : ("contrast(" + value + ")");
  return {
    '--tw-backdrop-contrast': backdropContrastValue,
    backdropFilter: ("var(--tw-backdrop-filter)" + important)
  };
});

var backdropGrayscale = (function (properties) {
  var theme = properties.theme;
  var match = properties.match;
  var getConfigValue = properties.getConfigValue;
  var errorSuggestions = properties.errors.errorSuggestions;
  var important = properties.pieces.important;
  var classValue = match(/(?<=(backdrop-grayscale)-)([^]*)/);

  var configValue = function (config) { return getConfigValue(theme(config), classValue); };

  var value = configValue('backdropGrayscale');

  if (!value) {
    errorSuggestions({
      config: ['backdropGrayscale']
    });
  }

  var backdropGrayscaleValue = Array.isArray(value) ? value.map(function (v) { return ("grayscale(" + v + ")"); }).join(' ') : ("grayscale(" + value + ")");
  return {
    '--tw-backdrop-grayscale': backdropGrayscaleValue,
    backdropFilter: ("var(--tw-backdrop-filter)" + important)
  };
});

var backdropHueRotate = (function (properties) {
  var theme = properties.theme;
  var match = properties.match;
  var getConfigValue = properties.getConfigValue;
  var properties_pieces = properties.pieces;
  var negative = properties_pieces.negative;
  var important = properties_pieces.important;
  var errorSuggestions = properties.errors.errorSuggestions;
  var classValue = match(/(?<=(backdrop-hue-rotate)-)([^]*)/);

  var configValue = function (config) { return getConfigValue(theme(config), classValue); };

  var value = configValue('backdropHueRotate');

  if (!value) {
    errorSuggestions({
      config: ['backdropHueRotate']
    });
  }

  var backdrophueRotateValue = Array.isArray(value) ? value.map(function (v) { return ("hue-rotate(" + negative + v + ")"); }).join(' ') : ("hue-rotate(" + negative + value + ")");
  return {
    '--tw-backdrop-hue-rotate': backdrophueRotateValue,
    backdropFilter: ("var(--tw-backdrop-filter)" + important)
  };
});

var backdropInvert = (function (properties) {
  var theme = properties.theme;
  var match = properties.match;
  var getConfigValue = properties.getConfigValue;
  var errorSuggestions = properties.errors.errorSuggestions;
  var important = properties.pieces.important;
  var classValue = match(/(?<=(backdrop-invert)-)([^]*)/);

  var configValue = function (config) { return getConfigValue(theme(config), classValue); };

  var value = configValue('backdropInvert');

  if (!value) {
    errorSuggestions({
      config: ['backdropInvert']
    });
  }

  var backdropInvertValue = Array.isArray(value) ? value.map(function (v) { return ("invert(" + v + ")"); }).join(' ') : ("invert(" + value + ")");
  return {
    '--tw-backdrop-invert': backdropInvertValue,
    backdropFilter: ("var(--tw-backdrop-filter)" + important)
  };
});

var backdropOpacity = (function (properties) {
  var theme = properties.theme;
  var match = properties.match;
  var getConfigValue = properties.getConfigValue;
  var errorSuggestions = properties.errors.errorSuggestions;
  var important = properties.pieces.important;
  var classValue = match(/(?<=(backdrop-opacity)-)([^]*)/);

  var configValue = function (config) { return getConfigValue(theme(config), classValue); };

  var value = configValue('backdropOpacity');

  if (!value) {
    errorSuggestions({
      config: ['backdropOpacity']
    });
  }

  var backdropOpacityValue = Array.isArray(value) ? value.map(function (v) { return ("opacity(" + v + ")"); }).join(' ') : ("opacity(" + value + ")");
  return {
    '--tw-backdrop-opacity': backdropOpacityValue,
    backdropFilter: ("var(--tw-backdrop-filter)" + important)
  };
});

var backdropSaturate = (function (properties) {
  var theme = properties.theme;
  var match = properties.match;
  var getConfigValue = properties.getConfigValue;
  var errorSuggestions = properties.errors.errorSuggestions;
  var important = properties.pieces.important;
  var classValue = match(/(?<=(backdrop-saturate)-)([^]*)/);

  var configValue = function (config) { return getConfigValue(theme(config), classValue); };

  var value = configValue('backdropSaturate');

  if (!value) {
    errorSuggestions({
      config: ['backdropSaturate']
    });
  }

  var backdropSaturateValue = Array.isArray(value) ? value.map(function (v) { return ("saturate(" + v + ")"); }).join(' ') : ("saturate(" + value + ")");
  return {
    '--tw-backdrop-saturate': backdropSaturateValue,
    backdropFilter: ("var(--tw-backdrop-filter)" + important)
  };
});

var backdropSepia = (function (properties) {
  var theme = properties.theme;
  var match = properties.match;
  var getConfigValue = properties.getConfigValue;
  var errorSuggestions = properties.errors.errorSuggestions;
  var important = properties.pieces.important;
  var classValue = match(/(?<=(backdrop-sepia)-)([^]*)/);

  var configValue = function (config) { return getConfigValue(theme(config), classValue); };

  var value = configValue('backdropSepia');

  if (!value) {
    errorSuggestions({
      config: ['backdropSepia']
    });
  }

  var backdropSepiaValue = Array.isArray(value) ? value.map(function (v) { return ("sepia(" + v + ")"); }).join(' ') : ("sepia(" + value + ")");
  return {
    '--tw-backdrop-sepia': backdropSepiaValue,
    backdropFilter: ("var(--tw-backdrop-filter)" + important)
  };
});

var handleSize = function (ref) {
  var configValue = ref.configValue;
  var important = ref.important;

  var value = configValue('backgroundSize');
  if (!value) { return; }
  return {
    backgroundSize: ("" + value + important)
  };
};

var handlePosition = function (ref) {
  var configValue = ref.configValue;
  var important = ref.important;

  var value = configValue('backgroundPosition');
  if (!value) { return; }
  return {
    backgroundPosition: ("" + value + important)
  };
};

var handleImage = function (ref) {
  var configValue = ref.configValue;
  var important = ref.important;

  var value = configValue('backgroundImage');
  if (!value) { return; }
  return {
    backgroundImage: ("" + value + important)
  };
};

var bg = (function (properties) {
  var theme = properties.theme;
  var match = properties.match;
  var getConfigValue = properties.getConfigValue;
  var getCoercedColor = properties.getCoercedColor;
  var errorSuggestions = properties.errors.errorSuggestions;
  var important = properties.pieces.important;
  var coercedColor = getCoercedColor('backgroundColor');
  if (coercedColor) { return coercedColor; }
  var classValue = match(/(?<=(bg)-)([^]*)/);

  var configValue = function (config) { return getConfigValue(theme(config), classValue); };

  var size = handleSize({
    configValue: configValue,
    important: important
  });
  if (size) { return size; }
  var position = handlePosition({
    configValue: configValue,
    important: important
  });
  if (position) { return position; }
  var image = handleImage({
    configValue: configValue,
    important: important
  });
  if (image) { return image; }
  errorSuggestions({
    config: ['backgroundColor', 'backgroundSize', 'backgroundPosition', 'backgroundImage']
  });
});

var blur = (function (properties) {
  var theme = properties.theme;
  var match = properties.match;
  var getConfigValue = properties.getConfigValue;
  var errorSuggestions = properties.errors.errorSuggestions;
  var important = properties.pieces.important;
  var classValue = match(/(?<=(blur)-)([^]*)/);

  var configValue = function (config) { return getConfigValue(theme(config), classValue); };

  var value = configValue('blur');

  if (!value) {
    errorSuggestions({
      config: ['blur']
    });
  }

  var blurValue = Array.isArray(value) ? value.map(function (v) { return ("blur(" + v + ")"); }).join(' ') : ("blur(" + value + ")");
  return {
    '--tw-blur': blurValue,
    filter: ("var(--tw-filter)" + important)
  };
});

var border = (function (properties) {
  var getCoercedLength = properties.getCoercedLength;
  var getCoercedColor = properties.getCoercedColor;
  var errorSuggestions = properties.errors.errorSuggestions;
  var coerced = properties.dynamicConfig.coerced;
  var coercedLength = getCoercedLength(coerced.length);
  if (coercedLength) { return coercedLength; }
  var coercedColor = getCoercedColor(coerced.color);
  if (coercedColor) { return coercedColor; }
  errorSuggestions({
    config: Object.values(coerced).map(function (v) { return v.property; })
  });
});

var brightness = (function (properties) {
  var theme = properties.theme;
  var match = properties.match;
  var getConfigValue = properties.getConfigValue;
  var errorSuggestions = properties.errors.errorSuggestions;
  var important = properties.pieces.important;
  var classValue = match(/(?<=(brightness)-)([^]*)/);

  var configValue = function (config) { return getConfigValue(theme(config), classValue); };

  var value = configValue('brightness');

  if (!value) {
    errorSuggestions({
      config: ['brightness']
    });
  }

  var brightnessValue = Array.isArray(value) ? value.map(function (v) { return ("brightness(" + v + ")"); }).join(' ') : ("brightness(" + value + ")");
  return {
    '--tw-brightness': brightnessValue,
    filter: ("var(--tw-filter)" + important)
  };
});

var caretColor = (function (properties) {
  var coercedColor = properties.getCoercedColor('caretColor');
  if (!coercedColor) { properties.errors.errorSuggestions({
    config: 'caretColor'
  }); }
  return coercedColor;
});

var contrast = (function (properties) {
  var theme = properties.theme;
  var match = properties.match;
  var getConfigValue = properties.getConfigValue;
  var errorSuggestions = properties.errors.errorSuggestions;
  var important = properties.pieces.important;
  var classValue = match(/(?<=(contrast)-)([^]*)/);

  var configValue = function (config) { return getConfigValue(theme(config), classValue); };

  var value = configValue('contrast');

  if (!value) {
    errorSuggestions({
      config: ['contrast']
    });
  }

  var contrastValue = Array.isArray(value) ? value.map(function (v) { return ("contrast(" + v + ")"); }).join(' ') : ("contrast(" + value + ")");
  return {
    '--tw-contrast': contrastValue,
    filter: ("var(--tw-filter)" + important)
  };
});

var properties = function (type) { return ({
  left: (type + "Left"),
  right: (type + "Right")
}); };

var getSpacingFromArray = function (ref) {
  var obj;

  var values = ref.values;
  var left = ref.left;
  var right = ref.right;
  if (!Array.isArray(values)) { return; }
  var valueLeft = values[0];
  var valueRight = values[1];
  return ( obj = {}, obj[left] = valueLeft, obj[right] = valueRight, obj );
};

var getSpacingStyle = function (type, values, key) {
  var obj;

  if (Array.isArray(values) || typeof values !== 'object') { return; }
  var propertyValue = values[key] || {};
  if (isEmpty(propertyValue)) { return; }
  var objectArraySpacing = getSpacingFromArray(Object.assign({}, {values: propertyValue},
    properties(type)));
  if (objectArraySpacing) { return objectArraySpacing; }
  return ( obj = {}, obj[properties(type).left] = propertyValue, obj[properties(type).right] = propertyValue, obj );
};

var container = (function (ref) {
  var ref_pieces = ref.pieces;
  var hasImportant = ref_pieces.hasImportant;
  var hasNegative = ref_pieces.hasNegative;
  var ref_errors = ref.errors;
  var errorNoImportant = ref_errors.errorNoImportant;
  var errorNoNegatives = ref_errors.errorNoNegatives;
  var theme = ref.theme;

  hasImportant && errorNoImportant();
  hasNegative && errorNoNegatives();
  var ref$1 = theme();
  var container = ref$1.container;
  var screensRaw = ref$1.screens;
  var padding = container.padding;
  var margin = container.margin;
  var center = container.center;
  var screens = container.screens || screensRaw;
  var mediaScreens = Object.entries(screens).reduce(function (accumulator, ref) {
    var obj;

    var key = ref[0];
    var rawValue = ref[1];
    var value = typeof rawValue === 'object' ? rawValue.min || rawValue['min-width'] : rawValue;
    return Object.assign({}, accumulator,
      ( obj = {}, obj[("@media (min-width: " + value + ")")] = Object.assign({}, {maxWidth: value},
        (padding && getSpacingStyle('padding', padding, key)),
        (!center && margin && getSpacingStyle('margin', margin, key))), obj ));
  }, {});
  var paddingStyles = Array.isArray(padding) ? getSpacingFromArray(Object.assign({}, {values: padding},
    properties('padding'))) : typeof padding === 'object' ? getSpacingStyle('padding', padding, 'DEFAULT') : {
    paddingLeft: padding,
    paddingRight: padding
  };
  var marginStyles = Array.isArray(margin) ? getSpacingFromArray(Object.assign({}, {values: margin},
    properties('margin'))) : typeof margin === 'object' ? getSpacingStyle('margin', margin, 'DEFAULT') : {
    marginLeft: margin,
    marginRight: margin
  }; // { center: true } overrides any margin styles

  if (center) { marginStyles = {
    marginLeft: 'auto',
    marginRight: 'auto'
  }; }
  return Object.assign({}, {width: '100%'},
    paddingStyles,
    marginStyles,
    mediaScreens);
});

var handleOpacity = function (ref) {
  var configValue = ref.configValue;

  var opacity = configValue('divideOpacity') || configValue('opacity');
  if (!opacity) { return; }
  return {
    '> :not([hidden]) ~ :not([hidden])': {
      '--tw-divide-opacity': ("" + opacity)
    }
  };
};

var handleWidth$1 = function (ref) {
  var obj;

  var configValue = ref.configValue;
  var ref_pieces = ref.pieces;
  var negative = ref_pieces.negative;
  var className = ref_pieces.className;
  var important = ref_pieces.important;
  var width = configValue('divideWidth');
  if (!width) { return; }
  var value = "" + negative + (addPxTo0(width));
  var isDivideX = className.startsWith('divide-x');
  var cssVariableKey = isDivideX ? '--tw-divide-x-reverse' : '--tw-divide-y-reverse';
  var borderFirst = "calc(" + value + " * var(" + cssVariableKey + "))" + important;
  var borderSecond = "calc(" + value + " * calc(1 - var(" + cssVariableKey + ")))" + important;
  var styleKey = isDivideX ? {
    borderRightWidth: borderFirst,
    borderLeftWidth: borderSecond
  } : {
    borderTopWidth: borderSecond,
    borderBottomWidth: borderFirst
  };
  var innerStyles = Object.assign(( obj = {}, obj[cssVariableKey] = '0', obj ),
    styleKey);
  return {
    '> :not([hidden]) ~ :not([hidden])': innerStyles
  };
};

var divide = (function (properties) {
  var errorSuggestions = properties.errors.errorSuggestions;
  var getConfigValue = properties.getConfigValue;
  var getCoercedColor = properties.getCoercedColor;
  var theme = properties.theme;
  var match = properties.match;
  var coercedColor = getCoercedColor(['divideColor', 'borderColor', 'colors']);
  if (coercedColor) { return coercedColor; }
  var opacityMatch = match(/(?<=(divide)-(opacity))([^]*)/) || match(/^divide-opacity$/) && 'default';

  if (opacityMatch) {
    var opacityValue = stripNegative(opacityMatch) || '';
    var opacityProperties = Object.assign({}, {configValue: function (config) { return getConfigValue(theme(config), opacityValue); }},
      properties);
    var opacity = handleOpacity(opacityProperties);
    if (opacity) { return opacity; }
    errorSuggestions({
      config: theme('divideOpacity') ? 'divideOpacity' : 'opacity'
    });
  }

  var widthMatch = match(/(?<=(divide)-(x|y))([^]*)/) || match(/^divide-(x|y)$/) && 'DEFAULT';

  if (widthMatch) {
    var widthValue = stripNegative(widthMatch) || '';
    var widthProperties = Object.assign({}, {configValue: function (config) { return getConfigValue(theme(config), widthValue); }},
      properties);
    var width = handleWidth$1(widthProperties);
    if (width) { return width; }
    errorSuggestions({
      config: 'divideWidth'
    });
  }

  errorSuggestions();
});

var dropShadow = (function (properties) {
  var theme = properties.theme;
  var match = properties.match;
  var getConfigValue = properties.getConfigValue;
  var errorSuggestions = properties.errors.errorSuggestions;
  var classValue = match(/(?<=(drop-shadow)-)([^]*)/);

  var configValue = function (config) { return getConfigValue(theme(config), classValue); };

  var value = configValue('dropShadow');

  if (!value) {
    errorSuggestions({
      config: ['dropShadow']
    });
  }

  var dropShadowValue = Array.isArray(value) ? value.map(function (v) { return ("drop-shadow(" + v + ")"); }).join(' ') : ("drop-shadow(" + value + ")");
  return {
    '--tw-drop-shadow': dropShadowValue,
    filter: 'var(--tw-blur) var(--tw-brightness) var(--tw-contrast) var(--tw-grayscale) var(--tw-hue-rotate) var(--tw-invert) var(--tw-saturate) var(--tw-sepia) var(--tw-drop-shadow)'
  };
});

var fill = (function (properties) {
  var coercedColor = properties.getCoercedColor('fill');
  if (!coercedColor) { properties.errors.errorSuggestions({
    config: 'fill'
  }); }
  return coercedColor;
});

var gradient = (function (properties) {
  var pieces = properties.pieces;
  var matchConfigValue = properties.matchConfigValue;
  var properties_pieces = properties.pieces;
  var hasNegative = properties_pieces.hasNegative;
  var hasImportant = properties_pieces.hasImportant;
  var className = properties_pieces.className;
  var properties_errors = properties.errors;
  var errorNoNegatives = properties_errors.errorNoNegatives;
  var errorNoImportant = properties_errors.errorNoImportant;
  var errorSuggestions = properties_errors.errorSuggestions;
  var value = matchConfigValue('gradientColorStops', /(?<=(from-|via-|to-))([^]*)/);
  var slashAlphaValue = matchConfigValue('gradientColorStops', /(?<=(from-|via-|to-))([^]*)([^]*)(?=\/)/);
  var styleDefinitions = value && {
    from: {
      '--tw-gradient-from': withAlpha({
        pieces: pieces,
        color: value
      }) || value,
      '--tw-gradient-stops': ['var(--tw-gradient-from)', ("var(--tw-gradient-to, " + (withAlpha({
        color: value,
        pieces: Object.assign({}, pieces,
          {hasAlpha: true,
          alpha: '0'}),
        fallBackColor: 'rgb(255 255 255 / 0)'
      })) + ")")].join(', ')
    },
    via: {
      '--tw-gradient-stops': ['var(--tw-gradient-from)', withAlpha({
        pieces: pieces,
        color: value
      }) || value, ("var(--tw-gradient-to, " + (withAlpha({
        color: value,
        pieces: Object.assign({}, pieces,
          {hasAlpha: true,
          alpha: '0'}),
        fallBackColor: 'rgb(255 255 255 / 0)'
      })) + ")")].join(', ')
    },
    to: {
      '--tw-gradient-to': withAlpha({
        pieces: pieces,
        color: value
      }) || value
    }
  } || slashAlphaValue && {
    from: Object.assign({}, withAlpha({
        pieces: pieces,
        color: slashAlphaValue,
        property: '--tw-gradient-from'
      }),
      {'--tw-gradient-stops': ['var(--tw-gradient-from)', 'var(--tw-gradient-to', withAlpha({
        color: slashAlphaValue,
        pieces: Object.assign({}, pieces,
          {hasAlpha: true,
          alpha: '0'})
      })].join(', ')}),
    via: {
      '--tw-gradient-stops': ['var(--tw-gradient-from)', withAlpha({
        color: slashAlphaValue,
        pieces: pieces
      }), ("var(--tw-gradient-to, " + (withAlpha({
        color: slashAlphaValue,
        pieces: Object.assign({}, pieces,
          {hasAlpha: true,
          alpha: '0'})
      })) + ")")].join(', ')
    },
    to: withAlpha({
      color: slashAlphaValue,
      property: '--tw-gradient-to',
      pieces: pieces
    })
  };
  !styleDefinitions && errorSuggestions({
    config: 'gradientColorStops'
  });
  var ref = Object.entries(styleDefinitions).find(function (ref) {
    var k = ref[0];

    return className.startsWith((k + "-"));
  }) || [];
  var styles = ref[1];
  !styles && errorSuggestions({
    config: 'gradientColorStops'
  });
  hasNegative && errorNoNegatives();
  hasImportant && errorNoImportant();
  return styles;
});

var grayscale = (function (properties) {
  var theme = properties.theme;
  var match = properties.match;
  var getConfigValue = properties.getConfigValue;
  var errorSuggestions = properties.errors.errorSuggestions;
  var important = properties.pieces.important;
  var classValue = match(/(?<=(grayscale)-)([^]*)/);

  var configValue = function (config) { return getConfigValue(theme(config), classValue); };

  var value = configValue('grayscale');

  if (!value) {
    errorSuggestions({
      config: ['grayscale']
    });
  }

  var grayscaleValue = Array.isArray(value) ? value.map(function (v) { return ("grayscale(" + v + ")"); }).join(' ') : ("grayscale(" + value + ")");
  return {
    '--tw-grayscale': grayscaleValue,
    filter: ("var(--tw-filter)" + important)
  };
});

var hueRotate = (function (properties) {
  var theme = properties.theme;
  var match = properties.match;
  var getConfigValue = properties.getConfigValue;
  var properties_pieces = properties.pieces;
  var negative = properties_pieces.negative;
  var important = properties_pieces.important;
  var errorSuggestions = properties.errors.errorSuggestions;
  var classValue = match(/(?<=(hue-rotate)-)([^]*)/);

  var configValue = function (config) { return getConfigValue(theme(config), classValue); };

  var value = configValue('hueRotate');

  if (!value) {
    errorSuggestions({
      config: ['hueRotate']
    });
  }

  var hueRotateValue = Array.isArray(value) ? value.map(function (v) { return ("hue-rotate(" + negative + v + ")"); }).join(' ') : ("hue-rotate(" + negative + value + ")");
  return {
    '--tw-hue-rotate': hueRotateValue,
    filter: ("var(--tw-filter)" + important)
  };
});

var invert = (function (properties) {
  var theme = properties.theme;
  var match = properties.match;
  var getConfigValue = properties.getConfigValue;
  var errorSuggestions = properties.errors.errorSuggestions;
  var important = properties.pieces.important;
  var classValue = match(/(?<=(invert)-)([^]*)/);

  var configValue = function (config) { return getConfigValue(theme(config), classValue); };

  var value = configValue('invert');

  if (!value) {
    errorSuggestions({
      config: ['invert']
    });
  }

  var invertValue = Array.isArray(value) ? value.map(function (v) { return ("invert(" + v + ")"); }).join(' ') : ("invert(" + value + ")");
  return {
    '--tw-invert': invertValue,
    filter: ("var(--tw-filter)" + important)
  };
});

var outline = (function (properties) {
  var theme = properties.theme;
  var match = properties.match;
  var getConfigValue = properties.getConfigValue;
  var errorSuggestions = properties.errors.errorSuggestions;
  var important = properties.pieces.important;
  var classValue = match(/(?<=(outline)-)([^]*)/);

  var configValue = function (config) { return getConfigValue(theme(config), classValue); };

  var value = configValue('outline');

  if (!value) {
    errorSuggestions({
      config: ['outline']
    });
  }

  var ref = Array.isArray(value) ? value : [value];
  var outline = ref[0];
  var outlineOffset = ref[1]; if ( outlineOffset === void 0 ) outlineOffset = 0;
  return Object.assign({}, {outline: ("" + outline + important)},
    (outlineOffset && {
      outlineOffset: ("" + outlineOffset + important)
    }));
});

var handleOpacity$1 = function (ref) {
  var configValue = ref.configValue;

  var value = configValue('placeholderOpacity') || configValue('opacity');
  if (!value) { return; }
  return {
    '::placeholder': {
      '--tw-placeholder-opacity': ("" + value)
    }
  };
};

var placeholder = (function (properties) {
  var match = properties.match;
  var theme = properties.theme;
  var getConfigValue = properties.getConfigValue;
  var getCoercedColor = properties.getCoercedColor;
  var errorSuggestions = properties.errors.errorSuggestions;
  var opacityMatch = match(/(?<=(placeholder-opacity-))([^]*)/) || match(/^placeholder-opacity$/);
  var opacity = handleOpacity$1({
    configValue: function (config) { return getConfigValue(theme(config), opacityMatch); }
  });
  if (opacity) { return opacity; }
  var coercedColor = getCoercedColor('placeholderColor');
  if (coercedColor) { return coercedColor; }
  errorSuggestions({
    config: ['placeholderColor', theme('placeholderOpacity') ? 'placeholderOpacity' : 'opacity']
  });
});

var ringOffset = (function (properties) {
  var getCoercedColor = properties.getCoercedColor;
  var matchConfigValue = properties.matchConfigValue;
  var errorSuggestions = properties.errors.errorSuggestions;
  var negative = properties.pieces.negative;
  var width = matchConfigValue('ringOffsetWidth', /(?<=(ring-offset)-)([^]*)/);
  if (width) { return {
    '--tw-ring-offset-width': ("" + negative + width)
  }; }
  var coercedColor = getCoercedColor('ringOffsetColor');
  if (coercedColor) { return coercedColor; }
  errorSuggestions({
    config: ['ringOffsetWidth', 'ringOffsetColor']
  });
});

var saturate = (function (properties) {
  var theme = properties.theme;
  var match = properties.match;
  var getConfigValue = properties.getConfigValue;
  var errorSuggestions = properties.errors.errorSuggestions;
  var important = properties.pieces.important;
  var classValue = match(/(?<=(saturate)-)([^]*)/);

  var configValue = function (config) { return getConfigValue(theme(config), classValue); };

  var value = configValue('saturate');

  if (!value) {
    errorSuggestions({
      config: ['saturate']
    });
  }

  var saturateValue = Array.isArray(value) ? value.map(function (v) { return ("saturate(" + v + ")"); }).join(' ') : ("saturate(" + value + ")");
  return {
    '--tw-saturate': saturateValue,
    filter: ("var(--tw-filter)" + important)
  };
});

var sepia = (function (properties) {
  var theme = properties.theme;
  var match = properties.match;
  var getConfigValue = properties.getConfigValue;
  var errorSuggestions = properties.errors.errorSuggestions;
  var important = properties.pieces.important;
  var classValue = match(/(?<=(sepia)-)([^]*)/);

  var configValue = function (config) { return getConfigValue(theme(config), classValue); };

  var value = configValue('sepia');

  if (!value) {
    errorSuggestions({
      config: ['sepia']
    });
  }

  var sepiaValue = Array.isArray(value) ? value.map(function (v) { return ("sepia(" + v + ")"); }).join(' ') : ("sepia(" + value + ")");
  return {
    '--tw-sepia': sepiaValue,
    filter: ("var(--tw-filter)" + important)
  };
});

var space = (function (ref) {
  var obj;

  var ref_pieces = ref.pieces;
  var negative = ref_pieces.negative;
  var important = ref_pieces.important;
  var className = ref_pieces.className;
  var errorSuggestions = ref.errors.errorSuggestions;
  var theme = ref.theme;
  var match = ref.match;
  var classNameValue = match(/(?<=(space)-(x|y)-)([^]*)/) || match(/^space-x$/) || match(/^space-y$/);
  var spaces = theme('space');
  var configValue = spaces[classNameValue || 'default'];
  !configValue && errorSuggestions({
    config: ['space']
  });
  var value = "" + negative + (addPxTo0(configValue));
  var isSpaceX = className.startsWith('space-x-'); // 🚀

  var cssVariableKey = isSpaceX ? '--tw-space-x-reverse' : '--tw-space-y-reverse';
  var marginFirst = "calc(" + value + " * var(" + cssVariableKey + "))" + important;
  var marginSecond = "calc(" + value + " * calc(1 - var(" + cssVariableKey + ")))" + important;
  var styleKey = isSpaceX ? {
    marginRight: marginFirst,
    marginLeft: marginSecond
  } : {
    marginTop: marginSecond,
    marginBottom: marginFirst
  };
  var innerStyles = Object.assign(( obj = {}, obj[cssVariableKey] = 0, obj ),
    styleKey);
  return {
    '> :not([hidden]) ~ :not([hidden])': innerStyles
  };
});

var handleWidth$2 = function (ref) {
  var configValue = ref.configValue;
  var important = ref.important;

  var value = configValue('strokeWidth');
  if (!value) { return; }
  return {
    strokeWidth: ("" + value + important)
  };
};

var handleCustom = function (ref) {
  var classValue = ref.classValue;
  var important = ref.important;

  if (classValue !== 'non-scaling') { return; }
  return {
    vectorEffect: ("non-scaling-stroke" + important)
  };
};

var stroke = (function (properties) {
  var theme = properties.theme;
  var match = properties.match;
  var getCoercedColor = properties.getCoercedColor;
  var getConfigValue = properties.getConfigValue;
  var errorSuggestions = properties.errors.errorSuggestions;
  var important = properties.pieces.important;
  var coercedColor = getCoercedColor('stroke');
  if (coercedColor) { return coercedColor; }
  var classValue = match(/(?<=(stroke)-)([^]*)/);

  var configValue = function (config) { return getConfigValue(theme(config), classValue); };

  var width = handleWidth$2({
    configValue: configValue,
    important: important
  });
  if (width) { return width; }
  var custom = handleCustom({
    classValue: classValue,
    important: important
  });
  if (custom) { return custom; }
  errorSuggestions({
    config: ['stroke', 'strokeWidth']
  });
});

var transition = (function (properties) {
  var theme = properties.theme;
  var match = properties.match;
  var getConfigValue = properties.getConfigValue;
  var errorSuggestions = properties.errors.errorSuggestions;
  var important = properties.pieces.important;
  var classValue = match(/(?<=(transition)-)([^]*)/);

  var configValue = function (config) { return getConfigValue(theme(config), classValue); };

  var transitionProperty = configValue('transitionProperty');
  !transitionProperty && errorSuggestions({
    config: 'transitionProperty'
  });

  if (transitionProperty === 'none') {
    return {
      transitionProperty: ("" + transitionProperty + important)
    };
  }

  var defaultTimingFunction = theme('transitionTimingFunction.DEFAULT');
  var defaultDuration = theme('transitionDuration.DEFAULT');
  return Object.assign({}, {transitionProperty: ("" + transitionProperty + important)},
    (defaultTimingFunction && {
      transitionTimingFunction: ("" + defaultTimingFunction + important)
    }),
    (defaultDuration && {
      transitionDuration: ("" + defaultDuration + important)
    }));
});

var handleSize$1 = function (ref) {
  var configValue = ref.configValue;
  var important = ref.important;

  var value = configValue('fontSize');
  if (!value) { return; }
  var ref$1 = Array.isArray(value) ? value : [value];
  var fontSize = ref$1[0];
  var options = ref$1[1];
  var lineHeight = options instanceof Object ? options.lineHeight : options;
  var letterSpacing = options && options.letterSpacing;
  return Object.assign({}, {fontSize: ("" + fontSize + important)},
    (lineHeight && {
      lineHeight: ("" + lineHeight + important)
    }),
    (letterSpacing && {
      letterSpacing: ("" + letterSpacing + important)
    }));
};

var text = (function (properties) {
  var match = properties.match;
  var theme = properties.theme;
  var getCoercedColor = properties.getCoercedColor;
  var getConfigValue = properties.getConfigValue;
  var properties_pieces = properties.pieces;
  var important = properties_pieces.important;
  var hasNegative = properties_pieces.hasNegative;
  var properties_errors = properties.errors;
  var errorSuggestions = properties_errors.errorSuggestions;
  var errorNoNegatives = properties_errors.errorNoNegatives;
  hasNegative && errorNoNegatives();
  var coercedColor = getCoercedColor('textColor');
  if (coercedColor) { return coercedColor; }
  var classValue = match(/(?<=(text-))([^]*)/);

  var configValue = function (config) { return getConfigValue(theme(config), classValue); };

  var size = handleSize$1({
    configValue: configValue,
    important: important
  });
  if (size) { return size; }
  errorSuggestions({
    config: ['textColor', 'fontSize']
  });
});



var plugins = ({
  accentColor: accentColor,
  animation: animation,
  backdropBlur: backdropBlur,
  backdropBrightness: backdropBrightness,
  backdropContrast: backdropContrast,
  backdropGrayscale: backdropGrayscale,
  backdropHueRotate: backdropHueRotate,
  backdropInvert: backdropInvert,
  backdropOpacity: backdropOpacity,
  backdropSaturate: backdropSaturate,
  backdropSepia: backdropSepia,
  bg: bg,
  blur: blur,
  border: border,
  boxShadow: boxShadow,
  brightness: brightness,
  caretColor: caretColor,
  contrast: contrast,
  container: container,
  divide: divide,
  dropShadow: dropShadow,
  fill: fill,
  gradient: gradient,
  grayscale: grayscale,
  hueRotate: hueRotate,
  invert: invert,
  outline: outline,
  placeholder: placeholder,
  ring: ring,
  ringOffset: ringOffset,
  saturate: saturate,
  sepia: sepia,
  space: space,
  stroke: stroke,
  transition: transition,
  text: text
});

var alpha = function (ref) {
  var pieces = ref.pieces;
  var property = ref.property;
  var variable = ref.variable;

  return function (color$$1, alpha, fallBackColor) {
  var newPieces = alpha ? Object.assign({}, pieces,
    {alpha: alpha,
    hasAlpha: true}) : pieces;
  return withAlpha({
    color: color$$1,
    property: property,
    variable: variable,
    pieces: newPieces,
    fallBackColor: fallBackColor
  });
};
};

var coercedTypeMap = {
  any: function (ref) {
    var obj;

    var config = ref.config;
    var value = ref.value;
    var property = config.property;
    var wrapWith = config.wrapWith;
    var result = {};
    result[property] = value;
    if (wrapWith) { return ( obj = {}, obj[wrapWith] = result, obj ); }
    return result;
  },
  color: function (ref) {
    var config = ref.config;
    var value = ref.value;
    var pieces = ref.pieces;
    var forceReturn = ref.forceReturn;

    var property = config.property;
    var variable = config.variable;
    var wrapWith = config.wrapWith;
    if (typeof config === 'function') { return config(value, {
      withAlpha: alpha({
        pieces: pieces,
        property: property,
        variable: variable
      })
    }); }
    if (!property) { return; }
    var properties = Array.isArray(property) ? property : [property];
    var result = properties.map(function (p) {
      var obj;

      var colorOutput;
      if (typeof value === 'string' && value.startsWith('var(')) { colorOutput = {};
        colorOutput[p] = ("" + value + (pieces.important)); }
      colorOutput = colorOutput || withAlpha(Object.assign({}, {color: value,
        property: p,
        pieces: pieces},
        (variable && {
          variable: variable
        })));
      return wrapWith && colorOutput ? ( obj = {}, obj[wrapWith] = colorOutput, obj ) : colorOutput;
    }).filter(Boolean);

    if (result.length === 0) {
      if (!forceReturn) { return; }
      result = properties.map(function (p) {
        var obj;

        var output = {};
        output[p] = ("" + value + (pieces.important));
        return wrapWith && output ? ( obj = {}, obj[wrapWith] = output, obj ) : output;
      });
    }

    return deepMerge.apply(void 0, result);
  },
  'line-width': function (ref) {
    var obj;

    var config = ref.config;
    var value = ref.value;
    var theme = ref.theme;
    if (typeof config === 'function') { return config(value, theme); }
    if (!dataTypes.lineWidth) { return; }
    return ( obj = {}, obj[config.property] = value, obj );
  },
  length: function (ref) {
    var obj, obj$1;

    var config = ref.config;
    var value = ref.value;
    var theme = ref.theme;
    if (typeof config === 'function') { return config(value, theme); }
    if (!dataTypes.length(value) && !value.startsWith('var(')) { return; }
    var property = config.property;
    var variable = config.variable;
    var wrapWith = config.wrapWith;
    if (!property) { return; }
    var properties = Array.isArray(property) ? property : [property];
    var result = Object.fromEntries(properties.map(function (p) { return [p, variable ? ("calc(" + value + " * var(" + variable + "))") : value]; }));
    var resultWithVariable = Object.assign({}, (variable && ( obj = {}, obj[variable] = '0', obj )),
      result);
    if (wrapWith) { return ( obj$1 = {}, obj$1[wrapWith] = resultWithVariable, obj$1 ); }
    return resultWithVariable;
  },
  number: function (ref) {
    var obj;

    var config = ref.config;
    var value = ref.value;
    if (!dataTypes.number(value)) { return; }
    return ( obj = {}, obj[config.property] = value, obj );
  },
  'absolute-size': function (ref) {
    var obj;

    var config = ref.config;
    var value = ref.value;
    if (!dataTypes.absoluteSize(value)) { return; }
    return ( obj = {}, obj[config.property] = value, obj );
  },
  'relative-size': function (ref) {
    var obj;

    var config = ref.config;
    var value = ref.value;
    if (!dataTypes.relativeSize(value)) { return; }
    return ( obj = {}, obj[config.property] = value, obj );
  },
  percentage: function (ref) {
    var obj;

    var config = ref.config;
    var value = ref.value;
    if (!dataTypes.percentage(value)) { return; }
    return ( obj = {}, obj[config.property] = value, obj );
  },
  image: function (ref) {
    var obj;

    var value = ref.value;
    var config = ref.config;
    if (!dataTypes.image(value)) { return; }
    return ( obj = {}, obj[config.property] = value, obj );
  },
  url: function (ref) {
    var obj;

    var value = ref.value;
    var config = ref.config;
    if (!dataTypes.url(value)) { return; }
    return ( obj = {}, obj[config.property] = value, obj );
  },
  position: function (ref) {
    var obj;

    var value = ref.value;
    var config = ref.config;
    if (!dataTypes.position(value)) { return; }
    return ( obj = {}, obj[config.property] = value, obj );
  },
  shadow: function (ref) {
    var value = ref.value;
    var pieces = ref.pieces;

    if (!dataTypes.shadow(value)) { return; }
    return makeBoxShadow(value, pieces.important);
  },
  lookup: function (ref) {
    var config = ref.config;
    var value = ref.value;
    var theme = ref.theme;

    return typeof config === 'function' && config(value, theme);
},
  'generic-name': function (ref) {
    var obj;

    var value = ref.value;
    var config = ref.config;
    if (!dataTypes.genericName(value)) { return; }
    return ( obj = {}, obj[config.property] = value, obj );
  },
  'family-name': function (ref) {
    var obj;

    var value = ref.value;
    var config = ref.config;
    if (!dataTypes.familyName(value)) { return; }
    return ( obj = {}, obj[config.property] = value, obj );
  }
};

var getCoercedValue = function (customValue, context) {
  var obj;

  var ref = splitOnFirst(customValue, ':');
  var explicitType = ref[0];
  var value = ref[1];
  if (value.length === 0) { return; }
  var coercedConfig = context.coercedConfig;
  var coercedOptions = Object.keys(coercedConfig || {});
  throwIf(!coercedOptions.includes(explicitType), function () { return logBadGood(("`" + (context.property) + "-[" + explicitType + ":" + value + "]` < The coerced value of “" + explicitType + "” isn’t available"), coercedOptions.length > 0 ? ("Try one of these coerced classes:\n\n" + (coercedOptions.map(function (o) {
    var config = coercedConfig[o];
    var propertyUsed = config ? config.property : '';
    return ("`" + (context.property) + "-[" + o + ":" + value + "]`" + (propertyUsed ? (" to use `" + propertyUsed + "`") : ''));
  }).join('\n'))) : ("`" + (context.property) + "-[" + value + "]` < Add " + (context.property) + " without a coerced value")); });
  var result = coercedTypeMap[explicitType]({
    config: coercedConfig[explicitType],
    value: value,
    pieces: context.pieces,
    theme: getTheme(context.state.config.theme)
  }); // Return coerced values even when they aren't validated

  if (!result) {
    var ref$1 = coercedConfig[explicitType];
    var property = ref$1.property;
    return ( obj = {}, obj[property] = value, obj );
  }

  return result;
};

var getCoercedColor = function (ref) {
  var pieces = ref.pieces;
  var theme = ref.theme;
  var config = ref.config;
  var matchConfig = ref.matchConfig;

  return function (configKey) {
  if (!config) { return; } // Match config including a custom slash alpha, eg: bg-black/[.5]

  var keys = Array.isArray(configKey) ? configKey : [configKey];
  var value;
  keys.find(function (k) {
    var match = matchConfig(k.config || k.property || k);
    if (match) { value = match; }
    return match;
  });
  if (!value) { return; }
  return coercedTypeMap.color({
    value: value,
    config: config,
    pieces: pieces,
    theme: theme,
    forceReturn: true
  });
};
};

var getCoercedLength = function (ref) {
  var pieces = ref.pieces;
  var theme = ref.theme;
  var config = ref.config;
  var matchConfig = ref.matchConfig;

  return function (configKey) {
  var value = matchConfig(configKey.config || configKey.property || configKey);
  if (!value) { return; }
  throwIf(pieces.hasAlpha, function () { return opacityErrorNotFound({
    className: pieces.classNameRaw
  }); });
  return coercedTypeMap.length({
    value: value,
    config: config,
    pieces: pieces,
    theme: theme
  });
};
};

function objectWithoutProperties$2 (obj, exclude) { var target = {}; for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k) && exclude.indexOf(k) === -1) target[k] = obj[k]; return target; }

var getErrors = function (ref) {
  var pieces = ref.pieces;
  var state = ref.state;
  var dynamicKey = ref.dynamicKey;

  var className = pieces.className;
  var variants = pieces.variants;
  return {
    errorSuggestions: function (options) {
      throw new babelPluginMacros.MacroError(errorSuggestions(Object.assign({}, {pieces: pieces,
        state: state,
        dynamicKey: dynamicKey},
        options)));
    },
    errorNoVariants: function () {
      throw new babelPluginMacros.MacroError(logNotAllowed({
        className: className,
        error: ("doesn’t support " + (variants.map(function (variant) { return (variant + ":"); }).join('')) + " or any other variants")
      }));
    },
    errorNoImportant: function () {
      throw new babelPluginMacros.MacroError(logNotAllowed({
        className: className,
        error: "doesn’t support !important"
      }));
    },
    errorNoNegatives: function () {
      throw new babelPluginMacros.MacroError(logNotAllowed({
        className: className,
        error: "doesn’t support negatives"
      }));
    }
  };
};

var callPlugin = function (corePlugin, context) {
  var handle = plugins[corePlugin] || null;

  if (!handle) {
    throw new babelPluginMacros.MacroError(("No handler specified, looked for \"" + corePlugin + "\""));
  }

  return handle(context);
}; // TODO: Deprecate


var getMatchConfigValue = function (ref) {
  var match = ref.match;
  var theme = ref.theme;
  var getConfigValue$$1 = ref.getConfigValue;

  return function (config, regexMatch) {
  var matcher = match(regexMatch);
  if (matcher === undefined) { return; }
  return getConfigValue$$1(theme(config), matcher);
};
}; // Direct match


var getMatchConfig = function (ref) {
  var match = ref.match;
  var theme = ref.theme;
  var getConfigValue$$1 = ref.getConfigValue;
  var dynamicKey = ref.dynamicKey;

  return function (config) {
  var directMatch = match(("(?<=" + dynamicKey + "(-|$))(.)*"));
  if (directMatch === undefined) { return; }
  return getConfigValue$$1(theme(config), directMatch);
};
};

var handleCorePlugins = (function (ref) {
  var corePlugin = ref.corePlugin;
  var pieces = ref.pieces;
  var state = ref.state;
  var dynamicKey = ref.dynamicKey;
  var theme = ref.theme;
  var configTwin = ref.configTwin;
  var dynamicConfig = ref.dynamicConfig;
  var rest$1 = objectWithoutProperties$2( ref, ["corePlugin", "classNameRaw", "pieces", "state", "dynamicKey", "theme", "configTwin", "dynamicConfig"] );
  var rest = rest$1;

  var errors = getErrors({
    state: state,
    pieces: pieces,
    dynamicKey: dynamicKey
  });

  var match = function (regex) {
    var result = get(pieces.classNameNoSlashAlpha.match(regex), [0]);
    if (result === undefined) { return; }
    return result;
  };

  var matchConfigValue = getMatchConfigValue({
    match: match,
    theme: theme,
    getConfigValue: getConfigValue
  });
  var matchConfig = getMatchConfig({
    match: match,
    theme: theme,
    getConfigValue: getConfigValue,
    dynamicKey: dynamicKey
  });
  var toColor = getColor({
    theme: theme,
    getConfigValue: getConfigValue,
    matchConfigValue: matchConfigValue,
    pieces: pieces
  });
  var coercedConfig = dynamicConfig.coerced || {};
  var context = Object.assign({}, {state: function () { return state; },
    errors: errors,
    pieces: pieces,
    match: match,
    theme: theme,
    toColor: toColor,
    configTwin: configTwin,
    getConfigValue: getConfigValue,
    matchConfigValue: matchConfigValue,
    // TODO: Deprecate
    matchConfig: matchConfig,
    dynamicKey: dynamicKey,
    dynamicConfig: dynamicConfig,
    getCoercedColor: getCoercedColor({
      config: coercedConfig.color,
      pieces: pieces,
      theme: theme,
      matchConfig: matchConfig
    }),
    getCoercedLength: getCoercedLength({
      config: coercedConfig.length,
      pieces: pieces,
      theme: theme,
      matchConfig: matchConfig
    })},
    rest);
  return callPlugin(corePlugin, context);
});

var handleCss = (function (ref) {
  var obj;

  var className = ref.className;
  var ref$1 = splitOnFirst(className // Replace the "stand-in spaces" with real ones
  .replace(new RegExp(SPACE_ID, 'g'), ' '), '[');
  var property = ref$1[0];
  var value = ref$1[1];
  property = property.startsWith('--') && property || // Retain css variables
  camelize(property); // Remove the last ']' and whitespace

  value = value.slice(0, -1).trim();
  throwIf(!property, function () { return logBadGood(("“[" + value + "]” is missing the css property before the square brackets"), ("Write it like this: marginTop[" + (value || '5rem') + "]")); });
  return ( obj = {}, obj[property] = value, obj );
});

var searchDynamicConfigByProperty = function (propertyName) {
  var found = Object.entries(dynamicStyles).find(function (ref) {
    var k = ref[0];

    return propertyName === k;
  });
  if (!found) { return; }
  var result = found[1];

  if (result.length > 1) {
    return {
      value: result.map(function (r) { return r.value; }).flat(),
      coerced: Object.assign.apply(Object, [ {} ].concat( result.map(function (r) { return r.coerced; }) ))
    };
  }

  return result;
};

var showSuggestions = function (property, value) {
  var suggestions = getSuggestions$1(property, value);
  throwIf(true, function () { return logBadGood(("The arbitrary class “" + property + "” in “" + property + "-[" + value + "]” wasn’t found"), suggestions.length > 0 && ("Try one of these:\n\n" + (suggestions.join(', ')))); });
};

var getSuggestions$1 = function (property, value) {
  var results = stringSimilarity.findBestMatch(property, Object.keys(dynamicStyles).filter(function (s) { return s.hasArbitrary !== 'false'; }));
  var suggestions = results.ratings.filter(function (item) { return item.rating > 0.25; });
  return suggestions.length > 0 ? suggestions.map(function (s) { return ((s.target) + "-[" + value + "]"); }) : [];
};

var getClassData = function (className) {
  var ref = splitOnFirst(className // Replace the "stand-in spaces" with real ones
  .replace(new RegExp(SPACE_ID, 'g'), ' '), '[');
  var property = ref[0];
  var value = ref[1];
  return {
    property: property.slice(0, -1),
    // Remove the dash just before the brackets
    value: value.slice(0, -1).replace(/_/g, ' ').trim() // Remove underscores, the last ']' and whitespace

  };
};

var handleArbitraryCss = (function (ref) {
  var obj;

  var state = ref.state;
  var pieces = ref.pieces;
  var ref$1 = getClassData(pieces.classNameNoSlashAlpha);
  var property = ref$1.property;
  var value = ref$1.value;
  var config = searchDynamicConfigByProperty(property) || {}; // Check for coerced value
  // Values that have their type specified: [length:3px]/[color:red]/etc

  var coercedConfig = Array.isArray(config) ? config.map(function (c) { return c.coerced; }) : config.coerced;
  var coercedValue = getCoercedValue(value, {
    property: property,
    pieces: pieces,
    state: state,
    coercedConfig: coercedConfig
  });
  if (coercedValue) { return coercedValue; } // Theme values, eg: tw`text-[theme(colors.red.500)]`

  var themeValue = value.match(/theme\('?([^']+)'?\)/);

  if (themeValue) {
    var val = getTheme(state.config.theme)(themeValue[1]);
    if (val) { value = val; }
  } // Deal with font array


  if (Array.isArray(config)) {
    var value$1 = config.find(function (c) { return c.value; });
    value$1 && (config = value$1);
  }
  (isEmpty(config) || Array.isArray(config)) && showSuggestions(property, value);
  throwIf(config.hasArbitrary === false, function () { return logBadGood(("There is no support for the arbitrary value “" + property + "” in “" + property + "-[" + value + "]”")); });

  if (Array.isArray(config.value)) {
    var arbitraryValue$1;
    config.value.find(function (type) {
      var result = coercedTypeMap[type]({
        config: config.coerced[type],
        value: value,
        pieces: pieces,
        theme: getTheme(state.config.theme)
      });
      if (result) { arbitraryValue$1 = result; }
      return Boolean(result);
    });
    throwIf(!arbitraryValue$1, function () { return logBadGood(("The arbitrary value in “" + property + "-[" + value + "]” isn’t valid"), ("Replace “" + value + "” with a valid " + (config.value.join(' or ')) + " based value")); });
    return arbitraryValue$1;
  }

  if (pieces.hasAlpha) {
    throwIf(!config.coerced || !config.coerced.color, function () { return logBadGood(("There is no support for a “" + property + "” alpha value in “" + property + "-[" + value + "]”")); });
    return coercedTypeMap.color({
      config: config.coerced.color,
      value: value,
      pieces: pieces,
      theme: getTheme(state.config.theme)
    });
  }

  var arbitraryProperty = config.prop;

  var color$$1 = function (props) { return withAlpha(Object.assign({}, {color: value,
    pieces: pieces},
    props)); };

  var arbitraryValue = typeof config.value === 'function' ? config.value({
    value: value,
    color: color$$1,
    negative: pieces.negative,
    isEmotion: state.isEmotion
  }) : maybeAddNegative(value, pieces.negative); // Raw values - no prop value found in config

  if (!arbitraryProperty) { return arbitraryValue || showSuggestions(property, value); }
  if (Array.isArray(arbitraryProperty)) { return arbitraryProperty.reduce(function (result, p) {
    var obj;

    return (Object.assign({}, result,
    ( obj = {}, obj[p] = arbitraryValue, obj )));
    }, {}); }
  return ( obj = {}, obj[arbitraryProperty] = arbitraryValue, obj );
});

function objectWithoutProperties$3 (obj, exclude) { var target = {}; for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k) && exclude.indexOf(k) === -1) target[k] = obj[k]; return target; }
// eg: You'd want a space left in this situation: tw`class1/* comment */class2`

var multilineReplaceWith = function (match, index, input) {
  var charBefore = input[index - 1];
  var directPrefixMatch = charBefore && charBefore.match(/\w/);
  var charAfter = input[Number(index) + Number(match.length)];
  var directSuffixMatch = charAfter && charAfter.match(/\w/);
  return directPrefixMatch && directPrefixMatch[0] && directSuffixMatch && directSuffixMatch[0] ? ' ' : '';
};

var formatTasks$2 = [// Strip pipe dividers " | "
function (ref) {
  var classes = ref.classes;

  return classes.replace(/ \| /g, ' ');
}, // Strip multiline comments
function (ref) {
  var classes = ref.classes;

  return classes.replace(/(?<!\/)\/(?!\/)\*[\S\s]*?\*\//g, multilineReplaceWith);
}, // Strip singleline comments
function (ref) {
  var classes = ref.classes;

  return classes.replace(/\/\/.*/g, '');
}, // Unwrap grouped variants
function (ref) {
  var classes = ref.classes;

  return handleVariantGroups(classes);
}, // Move some properties to the front of the list so they work as expected
function (ref) {
  var classes = ref.classes;

  return orderGridProperty(classes);
}, function (ref) {
  var classes = ref.classes;

  return orderTransitionProperty(classes);
}, function (ref) {
  var classes = ref.classes;

  return orderTransformProperty(classes);
}, function (ref) {
  var classes = ref.classes;

  return orderRingProperty(classes);
}, function (ref) {
  var classes = ref.classes;

  return orderBackdropProperty(classes);
}, function (ref) {
  var classes = ref.classes;

  return orderFilterProperty(classes);
}, function (ref) {
  var classes = ref.classes;

  return orderBgOpacityProperty(classes);
}, // Move and sort the responsive items to the end of the list
function (ref) {
  var classes = ref.classes;
  var state = ref.state;

  return orderByScreens(classes, state);
}, // Add a missing content class for after:/before: variants
function (ref) {
  var classes = ref.classes;
  var state = ref.state;

  return addContentClass(classes, state);
}];
var getStyleData = (function (classes, ref) {
  if ( ref === void 0 ) ref = {};
  var isCsOnly = ref.isCsOnly; if ( isCsOnly === void 0 ) isCsOnly = false;
  var silentMismatches = ref.silentMismatches; if ( silentMismatches === void 0 ) silentMismatches = false;
  var t = ref.t;
  var state = ref.state;

  var hasEmptyClasses = [null, 'null', undefined].includes(classes);
  if (silentMismatches && hasEmptyClasses) { return; }
  throwIf(hasEmptyClasses, function () { return logGeneralError('Only plain strings can be used with "tw".\nRead more at https://twinredirect.page.link/template-literals'); });

  for (var i = 0, list = formatTasks$2; i < list.length; i += 1) {
    var task = list[i];

    classes = task({
      classes: classes,
      state: state
    });
  }

  var theme = getTheme(state.config.theme);
  var classesMatched = [];
  var classesMismatched = []; // Merge styles into a single css object

  var styles = classes.reduce(function (results, classNameRaw) {
    var pieces = getPieces({
      classNameRaw: classNameRaw,
      state: state
    });
    var hasPrefix = pieces.hasPrefix;
    var className = pieces.className;
    var hasVariants = pieces.hasVariants; // Avoid prechecks on silent mode as they'll error loudly

    if (!silentMismatches) {
      var doPrechecks$$1 = doPrechecks;
      var rest = objectWithoutProperties$3( precheckExports, ["default"] );
      var prechecks = rest;
      var precheckContext = {
        pieces: pieces,
        classNameRaw: classNameRaw,
        state: state
      };
      doPrechecks$$1(Object.values(prechecks), precheckContext);
    } // Make sure non-prefixed classNames are ignored


    var ref = state.config;
    var prefix = ref.prefix;
    var hasPrefixMismatch = prefix && !hasPrefix && className;

    if (silentMismatches && (!className || hasPrefixMismatch)) {
      classesMismatched.push(classNameRaw);
      return results;
    }

    throwIf(!className, function () { return hasVariants ? logNotFoundVariant({
      classNameRaw: classNameRaw
    }) : logNotFoundClass; });
    var ref$1 = getProperties(className, state, {
      isCsOnly: isCsOnly
    });
    var hasMatches = ref$1.hasMatches;
    var hasUserPlugins = ref$1.hasUserPlugins;
    var dynamicKey = ref$1.dynamicKey;
    var dynamicConfig = ref$1.dynamicConfig;
    var corePlugin = ref$1.corePlugin;
    var type = ref$1.type;

    if (silentMismatches && !hasMatches && !hasUserPlugins) {
      classesMismatched.push(classNameRaw);
      return results;
    } // Error if short css is used and disabled


    var isShortCssDisabled = state.configTwin.disableShortCss && type === 'css' && !isCsOnly;
    throwIf(isShortCssDisabled, function () { return logBadGood(("Short css has been disabled in the config so “" + classNameRaw + "” won’t work" + (!state.configTwin.disableCsProp ? ' outside the cs prop' : '') + "."), !state.configTwin.disableCsProp ? ("Add short css with the cs prop: &lt;div cs=\"" + classNameRaw + "\" /&gt;") : ''); }); // Kick off suggestions when no class matches

    throwIf(!hasMatches && !hasUserPlugins, function () { return errorSuggestions({
      pieces: pieces,
      state: state,
      isCsOnly: isCsOnly
    }); });
    var styleContext = {
      theme: theme,
      pieces: pieces,
      state: state,
      corePlugin: corePlugin,
      className: className,
      classNameRaw: classNameRaw,
      dynamicKey: dynamicKey,
      dynamicConfig: dynamicConfig,
      configTwin: state.configTwin
    };
    var styleHandler = {
      static: function () { return handleStatic(styleContext); },
      dynamic: function () { return handleDynamic(styleContext); },
      css: function () { return handleCss(styleContext); },
      arbitraryCss: function () { return handleArbitraryCss(styleContext); },
      userPlugin: function () { return handleUserPlugins(styleContext); },
      corePlugin: function () { return handleCorePlugins(styleContext); }
    };
    var style;

    if (hasUserPlugins) {
      style = applyTransforms({
        type: type,
        pieces: pieces,
        style: styleHandler.userPlugin()
      });
    } // Check again there are no userPlugin matches


    if (silentMismatches && !hasMatches && !style) {
      classesMismatched.push(classNameRaw);
      return results;
    }

    throwIf(!hasMatches && !style, function () { return errorSuggestions({
      pieces: pieces,
      state: state,
      isCsOnly: isCsOnly
    }); });
    style = style || applyTransforms({
      type: type,
      pieces: pieces,
      style: styleHandler[type]()
    });
    var result = deepMerge(results, addVariants({
      results: results,
      style: style,
      pieces: pieces,
      state: state
    }));
    state.debug(debugSuccess(classNameRaw, style));
    classesMatched.push(classNameRaw);
    return result;
  }, {});
  return {
    // TODO: Avoid astifying here, move it outside function
    styles: astify(isEmpty(styles) ? {} : styles, t),
    mismatched: classesMismatched.join(' '),
    matched: classesMatched.join(' ')
  };
});

var moveTwPropToStyled = function (props) {
  var jsxPath = props.jsxPath;
  var styles = props.styles;
  makeStyledComponent(Object.assign({}, props,
    {secondArg: styles})); // Remove the tw attribute

  var tagAttributes = jsxPath.node.attributes;
  var twAttributeIndex = tagAttributes.findIndex(function (n) { return n.name && n.name.name === 'tw'; });
  if (twAttributeIndex < 0) { return; }
  jsxPath.node.attributes.splice(twAttributeIndex, 1);
};

var mergeIntoCssAttribute = function (ref) {
  var path$$1 = ref.path;
  var styles = ref.styles;
  var cssAttribute = ref.cssAttribute;
  var t = ref.t;

  if (!cssAttribute) { return; } // The expression is the value as a NodePath

  var attributeValuePath = cssAttribute.get('value'); // If it's not {} or "", get out of here

  if (!attributeValuePath.isJSXExpressionContainer() && !attributeValuePath.isStringLiteral()) { return; }
  var existingCssAttribute = attributeValuePath.isStringLiteral() ? attributeValuePath : attributeValuePath.get('expression');
  var attributeNames = getAttributeNames(path$$1);
  var isBeforeCssAttribute = attributeNames.indexOf('tw') - attributeNames.indexOf('css') < 0;

  if (existingCssAttribute.isArrayExpression()) {
    //  The existing css prop is an array, eg: css={[...]}
    isBeforeCssAttribute ? existingCssAttribute.unshiftContainer('elements', styles) : existingCssAttribute.pushContainer('elements', styles);
  } else {
    // css prop is either:
    // TemplateLiteral
    // <div css={`...`} tw="..." />
    // or an ObjectExpression
    // <div css={{ ... }} tw="..." />
    // or ArrowFunctionExpression/FunctionExpression
    // <div css={() => (...)} tw="..." />
    var existingCssAttributeNode = existingCssAttribute.node; // The existing css prop is an array, eg: css={[...]}

    var styleArray = isBeforeCssAttribute ? [styles, existingCssAttributeNode] : [existingCssAttributeNode, styles];
    var arrayExpression = t.arrayExpression(styleArray);
    var parent = existingCssAttribute.parent;
    var replacement = parent.type === 'JSXAttribute' ? t.jsxExpressionContainer(arrayExpression) : arrayExpression;
    existingCssAttribute.replaceWith(replacement);
  }
};

var handleTwProperty = function (ref) {
  var path$$1 = ref.path;
  var t = ref.t;
  var program = ref.program;
  var state = ref.state;

  if (!path$$1.node || path$$1.node.name.name !== 'tw') { return; }
  state.hasTwAttribute = true;
  var nodeValue = path$$1.node.value; // Allow tw={"class"}

  var expressionValue = nodeValue.expression && nodeValue.expression.type === 'StringLiteral' && nodeValue.expression.value; // Feedback for unsupported usage

  throwIf(nodeValue.expression && !expressionValue, function () { return logGeneralError("Only plain strings can be used with the \"tw\" prop.\nEg: <div tw=\"text-black\" /> or <div tw={\"text-black\"} />\nRead more at https://twinredirect.page.link/template-literals"); });
  var rawClasses = expressionValue || nodeValue.value || '';
  var ref$1 = getStyleData(rawClasses, {
    t: t,
    state: state
  });
  var styles = ref$1.styles;
  var jsxPath = getParentJSX(path$$1);
  var attributes = jsxPath.get('attributes');
  var ref$2 = getCssAttributeData(attributes);
  var cssAttribute = ref$2.attribute;

  if (state.configTwin.moveTwPropToStyled) {
    moveTwPropToStyled({
      styles: styles,
      jsxPath: jsxPath,
      t: t,
      program: program,
      state: state
    });
    addDataTwPropToPath({
      t: t,
      attributes: attributes,
      rawClasses: rawClasses,
      path: path$$1,
      state: state
    });
    return;
  }

  if (!cssAttribute) {
    // Replace the tw prop with the css prop
    path$$1.replaceWith(t.jsxAttribute(t.jsxIdentifier('css'), t.jsxExpressionContainer(styles)));
    addDataTwPropToPath({
      t: t,
      attributes: attributes,
      rawClasses: rawClasses,
      path: path$$1,
      state: state
    });
    return;
  } // Merge tw styles into an existing css prop


  mergeIntoCssAttribute({
    cssAttribute: cssAttribute,
    path: jsxPath,
    styles: styles,
    t: t
  });
  path$$1.remove(); // remove the tw prop

  addDataPropToExistingPath({
    t: t,
    attributes: attributes,
    rawClasses: rawClasses,
    path: jsxPath,
    state: state
  });
};

var handleTwFunction = function (ref) {
  var references = ref.references;
  var state = ref.state;
  var t = ref.t;

  var defaultImportReferences = references.default || references.tw || [];
  defaultImportReferences.forEach(function (path$$1) {
    /**
     * Gotcha: After twin changes a className/tw/cs prop path then the reference
     * becomes stale and needs to be refreshed with crawl()
     */
    var parentPath = path$$1.parentPath;
    if (!parentPath.isTaggedTemplateExpression()) { path$$1.scope.crawl(); }
    var parent = path$$1.findParent(function (x) { return x.isTaggedTemplateExpression(); });
    if (!parent) { return; } // Check if the style attribute is being used

    if (!state.configTwin.allowStyleProp) {
      var jsxAttribute = parent.findParent(function (x) { return x.isJSXAttribute(); });
      var attributeName = jsxAttribute && jsxAttribute.get('name').get('name').node;
      throwIf(attributeName === 'style', function () { return logStylePropertyError; });
    }

    var parsed = parseTte({
      path: parent,
      types: t,
      styledIdentifier: state.styledIdentifier,
      state: state
    });
    if (!parsed) { return; }
    var rawClasses = parsed.string; // Add tw-prop for css attributes

    var jsxPath = path$$1.findParent(function (p) { return p.isJSXOpeningElement(); });

    if (jsxPath) {
      var attributes = jsxPath.get('attributes');
      var pathData = {
        t: t,
        attributes: attributes,
        rawClasses: rawClasses,
        path: jsxPath,
        state: state
      };
      addDataPropToExistingPath(pathData);
    }

    var ref = getStyleData(rawClasses, {
      t: t,
      state: state
    });
    var styles = ref.styles;
    replaceWithLocation(parsed.path, styles);
  });
};

/**
 * cs - 'css shorts'
 */

var handleCsProperty = function (ref) {
  var path$$1 = ref.path;
  var t = ref.t;
  var state = ref.state;

  if (state.configTwin.disableCsProp) { return; }
  if (!path$$1.node || path$$1.node.name.name !== 'cs') { return; }
  state.hasCsProp = true;
  var isCsOnly = true;
  var nodeValue = path$$1.node.value; // Allow cs={"property[value]"}

  var expressionValue = nodeValue.expression && nodeValue.expression.type === 'StringLiteral' && nodeValue.expression.value; // Feedback for unsupported usage

  throwIf(nodeValue.expression && !expressionValue, function () { return logGeneralError("Only plain strings can be used with the \"cs\" prop.\nEg: <div cs=\"maxWidth[30rem]\" />\nRead more at https://twinredirect.page.link/cs-classes"); });
  var rawClasses = expressionValue || nodeValue.value || '';
  var ref$1 = getStyleData(rawClasses, {
    isCsOnly: isCsOnly,
    t: t,
    state: state
  });
  var styles = ref$1.styles;
  var jsxPath = getParentJSX(path$$1);
  var attributes = jsxPath.get('attributes');
  var ref$2 = getCssAttributeData(attributes);
  var cssAttribute = ref$2.attribute;

  if (!cssAttribute) {
    // Replace the tw prop with the css prop
    path$$1.replaceWith(t.jsxAttribute(t.jsxIdentifier('css'), t.jsxExpressionContainer(styles))); // TODO: Update the naming of this function

    addDataTwPropToPath({
      t: t,
      attributes: attributes,
      rawClasses: rawClasses,
      path: path$$1,
      state: state,
      propName: 'data-cs'
    });
    return;
  } // The expression is the value as a NodePath


  var attributeValuePath = cssAttribute.get('value'); // If it's not {} or "", get out of here

  if (!attributeValuePath.isJSXExpressionContainer() && !attributeValuePath.isStringLiteral()) { return; }
  var existingCssAttribute = attributeValuePath.isStringLiteral() ? attributeValuePath : attributeValuePath.get('expression');
  var attributeNames = getAttributeNames(jsxPath);
  var isBeforeCssAttribute = attributeNames.indexOf('cs') - attributeNames.indexOf('css') < 0;

  if (existingCssAttribute.isArrayExpression()) {
    //  The existing css prop is an array, eg: css={[...]}
    isBeforeCssAttribute ? existingCssAttribute.unshiftContainer('elements', styles) : existingCssAttribute.pushContainer('elements', styles);
  } else {
    // css prop is either:
    // TemplateLiteral
    // <div css={`...`} cs="..." />
    // or an ObjectExpression
    // <div css={{ ... }} cs="..." />
    // or ArrowFunctionExpression/FunctionExpression
    // <div css={() => (...)} cs="..." />
    var existingCssAttributeNode = existingCssAttribute.node; // The existing css prop is an array, eg: css={[...]}

    var styleArray = isBeforeCssAttribute ? [styles, existingCssAttributeNode] : [existingCssAttributeNode, styles];
    var arrayExpression = t.arrayExpression(styleArray);
    var parent = existingCssAttribute.parent;
    var replacement = parent.type === 'JSXAttribute' ? t.jsxExpressionContainer(arrayExpression) : arrayExpression;
    existingCssAttribute.replaceWith(replacement);
  }

  path$$1.remove(); // remove the cs prop

  addDataPropToExistingPath({
    t: t,
    attributes: attributes,
    rawClasses: rawClasses,
    path: jsxPath,
    state: state,
    propName: 'data-cs'
  });
};

var makeJsxAttribute = function (ref, t) {
  var key = ref[0];
  var value = ref[1];

  return t.jsxAttribute(t.jsxIdentifier(key), t.jsxExpressionContainer(value));
};

var handleClassNameProperty = function (ref) {
  var path$$1 = ref.path;
  var t = ref.t;
  var state = ref.state;

  if (!state.configTwin.includeClassNames) { return; }
  if (path$$1.node.name.name !== 'className') { return; }
  var nodeValue = path$$1.node.value; // Ignore className if it cannot be resolved

  if (nodeValue.expression) { return; }
  var rawClasses = nodeValue.value || '';
  if (!rawClasses) { return; }
  var ref$1 = getStyleData(rawClasses, {
    silentMismatches: true,
    t: t,
    state: state
  });
  var styles = ref$1.styles;
  var mismatched = ref$1.mismatched;
  var matched = ref$1.matched;
  if (!matched) { return; } // When classes can't be matched we add them back into the className (it exists as a few properties)

  path$$1.node.value.value = mismatched;
  path$$1.node.value.extra.rawValue = mismatched;
  path$$1.node.value.extra.raw = "\"" + mismatched + "\"";
  var jsxPath = getParentJSX(path$$1);
  var attributes = jsxPath.get('attributes');
  var ref$2 = getCssAttributeData(attributes);
  var cssAttribute = ref$2.attribute;

  if (!cssAttribute) {
    var attribute = makeJsxAttribute(['css', styles], t);
    mismatched ? path$$1.insertAfter(attribute) : path$$1.replaceWith(attribute);
    addDataTwPropToPath({
      t: t,
      attributes: attributes,
      rawClasses: matched,
      path: path$$1,
      state: state
    });
    return;
  }

  var cssExpression = cssAttribute.get('value').get('expression');
  var attributeNames = getAttributeNames(jsxPath);
  var isBeforeCssAttribute = attributeNames.indexOf('className') - attributeNames.indexOf('css') < 0;

  if (cssExpression.isArrayExpression()) {
    //  The existing css prop is an array, eg: css={[...]}
    isBeforeCssAttribute ? cssExpression.unshiftContainer('elements', styles) : cssExpression.pushContainer('elements', styles);
  } else {
    // The existing css prop is not an array, eg: css={{ ... }} / css={`...`}
    var existingCssAttribute = cssExpression.node;
    throwIf(!existingCssAttribute, function () { return logGeneralError("An empty css prop (css=\"\") isn’t supported alongside the className prop"); });
    var styleArray = isBeforeCssAttribute ? [styles, existingCssAttribute] : [existingCssAttribute, styles];
    cssExpression.replaceWith(t.arrayExpression(styleArray));
  }

  if (!mismatched) { path$$1.remove(); }
  addDataPropToExistingPath({
    t: t,
    attributes: attributes,
    rawClasses: matched,
    path: jsxPath,
    state: state
  });
};

function dlv(t,e,l,n,r){for(e=e.split?e.split("."):e,n=0;n<e.length;n++)t=t?t[e[n]]:r;return t===r?l:t}

function unwrapExports (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var indexesOf = function (ary, item) {
  var i = -1, indexes = [];
  while((i = ary.indexOf(item, i + 1)) !== -1)
    indexes.push(i);
  return indexes
};

function unique_pred(list, compare) {
  var ptr = 1
    , len = list.length
    , a=list[0], b=list[0];
  for(var i=1; i<len; ++i) {
    b = a;
    a = list[i];
    if(compare(a, b)) {
      if(i === ptr) {
        ptr++;
        continue
      }
      list[ptr++] = a;
    }
  }
  list.length = ptr;
  return list
}

function unique_eq(list) {
  var ptr = 1
    , len = list.length
    , a=list[0], b = list[0];
  for(var i=1; i<len; ++i, b=a) {
    b = a;
    a = list[i];
    if(a !== b) {
      if(i === ptr) {
        ptr++;
        continue
      }
      list[ptr++] = a;
    }
  }
  list.length = ptr;
  return list
}

function unique(list, compare, sorted) {
  if(list.length === 0) {
    return list
  }
  if(compare) {
    if(!sorted) {
      list.sort(compare);
    }
    return unique_pred(list, compare)
  }
  if(!sorted) {
    list.sort();
  }
  return unique_eq(list)
}

var uniq = unique;

var unesc_1 = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports.default = unesc;
var whitespace = '[\\x20\\t\\r\\n\\f]';
var unescapeRegExp = new RegExp('\\\\([\\da-f]{1,6}' + whitespace + '?|(' + whitespace + ')|.)', 'ig');

function unesc(str) {
  return str.replace(unescapeRegExp, function (_, escaped, escapedWhitespace) {
    var high = '0x' + escaped - 0x10000; // NaN means non-codepoint
    // Workaround erroneous numeric interpretation of +"0x"
    // eslint-disable-next-line no-self-compare

    return high !== high || escapedWhitespace ? escaped : high < 0 ? // BMP codepoint
    String.fromCharCode(high + 0x10000) : // Supplemental Plane codepoint (surrogate pair)
    String.fromCharCode(high >> 10 | 0xd800, high & 0x3ff | 0xdc00);
  });
}

module.exports = exports.default;
});

unwrapExports(unesc_1);

var getProp_1 = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports.default = getProp;

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

unwrapExports(getProp_1);

var ensureObject_1 = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports.default = ensureObject;

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

unwrapExports(ensureObject_1);

var stripComments_1 = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports.default = stripComments;

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

unwrapExports(stripComments_1);

var util$1 = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports.stripComments = exports.ensureObject = exports.getProp = exports.unesc = void 0;

var _unesc = _interopRequireDefault(unesc_1);

exports.unesc = _unesc.default;

var _getProp = _interopRequireDefault(getProp_1);

exports.getProp = _getProp.default;

var _ensureObject = _interopRequireDefault(ensureObject_1);

exports.ensureObject = _ensureObject.default;

var _stripComments = _interopRequireDefault(stripComments_1);

exports.stripComments = _stripComments.default;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
});

unwrapExports(util$1);

var node = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports.default = void 0;



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

var Node =
/*#__PURE__*/
function () {
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

  _proto.toString = function toString() {
    return [this.rawSpaceBefore, String(this.stringifyProperty("value")), this.rawSpaceAfter].join('');
  };

  _createClass(Node, [{
    key: "rawSpaceBefore",
    get: function get$$1() {
      var rawSpace = this.raws && this.raws.spaces && this.raws.spaces.before;

      if (rawSpace === undefined) {
        rawSpace = this.spaces && this.spaces.before;
      }

      return rawSpace || "";
    },
    set: function set(raw) {
      (0, util$1.ensureObject)(this, "raws", "spaces");
      this.raws.spaces.before = raw;
    }
  }, {
    key: "rawSpaceAfter",
    get: function get$$1() {
      var rawSpace = this.raws && this.raws.spaces && this.raws.spaces.after;

      if (rawSpace === undefined) {
        rawSpace = this.spaces.after;
      }

      return rawSpace || "";
    },
    set: function set(raw) {
      (0, util$1.ensureObject)(this, "raws", "spaces");
      this.raws.spaces.after = raw;
    }
  }]);

  return Node;
}();

exports.default = Node;
module.exports = exports.default;
});

unwrapExports(node);

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

unwrapExports(types);

var container$1 = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports.default = void 0;

var _node = _interopRequireDefault(node);

var types$$1 = _interopRequireWildcard(types);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; subClass.__proto__ = superClass; }

var Container =
/*#__PURE__*/
function (_Node) {
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
    for (var _iterator = this.nodes, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
      var _ref;

      if (_isArray) {
        if (_i >= _iterator.length) break;
        _ref = _iterator[_i++];
      } else {
        _i = _iterator.next();
        if (_i.done) break;
        _ref = _i.value;
      }

      var node$$1 = _ref;
      node$$1.parent = undefined;
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
    this.each(function (node$$1) {
      if (node$$1.atPosition) {
        var foundChild = node$$1.atPosition(line, col);

        if (foundChild) {
          found = foundChild;
          return false;
        }
      } else if (node$$1.isAtPosition(line, col)) {
        found = node$$1;
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
    return this.each(function (node$$1, i) {
      var result = callback(node$$1, i);

      if (result !== false && node$$1.length) {
        result = node$$1.walk(callback);
      }

      if (result === false) {
        return false;
      }
    });
  };

  _proto.walkAttributes = function walkAttributes(callback) {
    var _this2 = this;

    return this.walk(function (selector) {
      if (selector.type === types$$1.ATTRIBUTE) {
        return callback.call(_this2, selector);
      }
    });
  };

  _proto.walkClasses = function walkClasses(callback) {
    var _this3 = this;

    return this.walk(function (selector) {
      if (selector.type === types$$1.CLASS) {
        return callback.call(_this3, selector);
      }
    });
  };

  _proto.walkCombinators = function walkCombinators(callback) {
    var _this4 = this;

    return this.walk(function (selector) {
      if (selector.type === types$$1.COMBINATOR) {
        return callback.call(_this4, selector);
      }
    });
  };

  _proto.walkComments = function walkComments(callback) {
    var _this5 = this;

    return this.walk(function (selector) {
      if (selector.type === types$$1.COMMENT) {
        return callback.call(_this5, selector);
      }
    });
  };

  _proto.walkIds = function walkIds(callback) {
    var _this6 = this;

    return this.walk(function (selector) {
      if (selector.type === types$$1.ID) {
        return callback.call(_this6, selector);
      }
    });
  };

  _proto.walkNesting = function walkNesting(callback) {
    var _this7 = this;

    return this.walk(function (selector) {
      if (selector.type === types$$1.NESTING) {
        return callback.call(_this7, selector);
      }
    });
  };

  _proto.walkPseudos = function walkPseudos(callback) {
    var _this8 = this;

    return this.walk(function (selector) {
      if (selector.type === types$$1.PSEUDO) {
        return callback.call(_this8, selector);
      }
    });
  };

  _proto.walkTags = function walkTags(callback) {
    var _this9 = this;

    return this.walk(function (selector) {
      if (selector.type === types$$1.TAG) {
        return callback.call(_this9, selector);
      }
    });
  };

  _proto.walkUniversals = function walkUniversals(callback) {
    var _this10 = this;

    return this.walk(function (selector) {
      if (selector.type === types$$1.UNIVERSAL) {
        return callback.call(_this10, selector);
      }
    });
  };

  _proto.split = function split(callback) {
    var _this11 = this;

    var current = [];
    return this.reduce(function (memo, node$$1, index) {
      var split = callback.call(_this11, node$$1);
      current.push(node$$1);

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
    get: function get$$1() {
      return this.at(0);
    }
  }, {
    key: "last",
    get: function get$$1() {
      return this.at(this.length - 1);
    }
  }, {
    key: "length",
    get: function get$$1() {
      return this.nodes.length;
    }
  }]);

  return Container;
}(_node.default);

exports.default = Container;
module.exports = exports.default;
});

unwrapExports(container$1);

var root = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports.default = void 0;

var _container = _interopRequireDefault(container$1);



function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; subClass.__proto__ = superClass; }

var Root =
/*#__PURE__*/
function (_Container) {
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
}(_container.default);

exports.default = Root;
module.exports = exports.default;
});

unwrapExports(root);

var selector = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports.default = void 0;

var _container = _interopRequireDefault(container$1);



function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; subClass.__proto__ = superClass; }

var Selector =
/*#__PURE__*/
function (_Container) {
  _inheritsLoose(Selector, _Container);

  function Selector(opts) {
    var _this;

    _this = _Container.call(this, opts) || this;
    _this.type = types.SELECTOR;
    return _this;
  }

  return Selector;
}(_container.default);

exports.default = Selector;
module.exports = exports.default;
});

unwrapExports(selector);

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
exports.default = void 0;

var _cssesc = _interopRequireDefault(cssesc_1);



var _node = _interopRequireDefault(node);



function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; subClass.__proto__ = superClass; }

var ClassName =
/*#__PURE__*/
function (_Node) {
  _inheritsLoose(ClassName, _Node);

  function ClassName(opts) {
    var _this;

    _this = _Node.call(this, opts) || this;
    _this.type = types.CLASS;
    _this._constructed = true;
    return _this;
  }

  var _proto = ClassName.prototype;

  _proto.toString = function toString() {
    return [this.rawSpaceBefore, String('.' + this.stringifyProperty("value")), this.rawSpaceAfter].join('');
  };

  _createClass(ClassName, [{
    key: "value",
    set: function set(v) {
      if (this._constructed) {
        var escaped = (0, _cssesc.default)(v, {
          isIdentifier: true
        });

        if (escaped !== v) {
          (0, util$1.ensureObject)(this, "raws");
          this.raws.value = escaped;
        } else if (this.raws) {
          delete this.raws.value;
        }
      }

      this._value = v;
    },
    get: function get$$1() {
      return this._value;
    }
  }]);

  return ClassName;
}(_node.default);

exports.default = ClassName;
module.exports = exports.default;
});

unwrapExports(className);

var comment = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports.default = void 0;

var _node = _interopRequireDefault(node);



function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; subClass.__proto__ = superClass; }

var Comment =
/*#__PURE__*/
function (_Node) {
  _inheritsLoose(Comment, _Node);

  function Comment(opts) {
    var _this;

    _this = _Node.call(this, opts) || this;
    _this.type = types.COMMENT;
    return _this;
  }

  return Comment;
}(_node.default);

exports.default = Comment;
module.exports = exports.default;
});

unwrapExports(comment);

var id = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports.default = void 0;

var _node = _interopRequireDefault(node);



function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; subClass.__proto__ = superClass; }

var ID =
/*#__PURE__*/
function (_Node) {
  _inheritsLoose(ID, _Node);

  function ID(opts) {
    var _this;

    _this = _Node.call(this, opts) || this;
    _this.type = types.ID;
    return _this;
  }

  var _proto = ID.prototype;

  _proto.toString = function toString() {
    return [this.rawSpaceBefore, String('#' + this.stringifyProperty("value")), this.rawSpaceAfter].join('');
  };

  return ID;
}(_node.default);

exports.default = ID;
module.exports = exports.default;
});

unwrapExports(id);

var namespace = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports.default = void 0;

var _cssesc = _interopRequireDefault(cssesc_1);



var _node = _interopRequireDefault(node);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; subClass.__proto__ = superClass; }

var Namespace =
/*#__PURE__*/
function (_Node) {
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

  _proto.toString = function toString() {
    return [this.rawSpaceBefore, this.qualifiedName(this.stringifyProperty("value")), this.rawSpaceAfter].join('');
  };

  _createClass(Namespace, [{
    key: "namespace",
    get: function get$$1() {
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

      var escaped = (0, _cssesc.default)(namespace, {
        isIdentifier: true
      });
      this._namespace = namespace;

      if (escaped !== namespace) {
        (0, util$1.ensureObject)(this, "raws");
        this.raws.namespace = escaped;
      } else if (this.raws) {
        delete this.raws.namespace;
      }
    }
  }, {
    key: "ns",
    get: function get$$1() {
      return this._namespace;
    },
    set: function set(namespace) {
      this.namespace = namespace;
    }
  }, {
    key: "namespaceString",
    get: function get$$1() {
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
}(_node.default);

exports.default = Namespace;
module.exports = exports.default;
});

unwrapExports(namespace);

var tag = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports.default = void 0;

var _namespace = _interopRequireDefault(namespace);



function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; subClass.__proto__ = superClass; }

var Tag =
/*#__PURE__*/
function (_Namespace) {
  _inheritsLoose(Tag, _Namespace);

  function Tag(opts) {
    var _this;

    _this = _Namespace.call(this, opts) || this;
    _this.type = types.TAG;
    return _this;
  }

  return Tag;
}(_namespace.default);

exports.default = Tag;
module.exports = exports.default;
});

unwrapExports(tag);

var string = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports.default = void 0;

var _node = _interopRequireDefault(node);



function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; subClass.__proto__ = superClass; }

var String =
/*#__PURE__*/
function (_Node) {
  _inheritsLoose(String, _Node);

  function String(opts) {
    var _this;

    _this = _Node.call(this, opts) || this;
    _this.type = types.STRING;
    return _this;
  }

  return String;
}(_node.default);

exports.default = String;
module.exports = exports.default;
});

unwrapExports(string);

var pseudo = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports.default = void 0;

var _container = _interopRequireDefault(container$1);



function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; subClass.__proto__ = superClass; }

var Pseudo =
/*#__PURE__*/
function (_Container) {
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
}(_container.default);

exports.default = Pseudo;
module.exports = exports.default;
});

unwrapExports(pseudo);

var attribute = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports.unescapeValue = unescapeValue;
exports.default = void 0;

var _cssesc = _interopRequireDefault(cssesc_1);

var _unesc = _interopRequireDefault(unesc_1);

var _namespace = _interopRequireDefault(namespace);



var _CSSESC_QUOTE_OPTIONS;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; subClass.__proto__ = superClass; }

var deprecate = util.deprecate;

var WRAPPED_IN_QUOTES = /^('|")(.*)\1$/;
var warnOfDeprecatedValueAssignment = deprecate(function () {}, "Assigning an attribute a value containing characters that might need to be escaped is deprecated. " + "Call attribute.setValue() instead.");
var warnOfDeprecatedQuotedAssignment = deprecate(function () {}, "Assigning attr.quoted is deprecated and has no effect. Assign to attr.quoteMark instead.");
var warnOfDeprecatedConstructor = deprecate(function () {}, "Constructing an Attribute selector with a value without specifying quoteMark is deprecated. Note: The value should be unescaped now.");

function unescapeValue(value) {
  var deprecatedUsage = false;
  var quoteMark = null;
  var unescaped = value;
  var m = unescaped.match(WRAPPED_IN_QUOTES);

  if (m) {
    quoteMark = m[1];
    unescaped = m[2];
  }

  unescaped = (0, _unesc.default)(unescaped);

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

var Attribute =
/*#__PURE__*/
function (_Namespace) {
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
      get: deprecate(function () {
        return _this.value;
      }, "attr.raws.unquoted is deprecated. Call attr.value instead."),
      set: deprecate(function () {
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
    var escaped = (0, _cssesc.default)(this._value, cssescopts);
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
      var escaped = (0, _cssesc.default)(v, {
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
          var quoteValue = (0, _cssesc.default)(v, opts);

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
    var rawValue = (0, _cssesc.default)(this._value, CSSESC_QUOTE_OPTIONS[this.quoteMark]);

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
      var escaped = (0, _cssesc.default)(value, {
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
    get: function get$$1() {
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
    get: function get$$1() {
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
    get: function get$$1() {
      return this.qualifiedName(this.raws.attribute || this.attribute);
    }
  }, {
    key: "insensitiveFlag",
    get: function get$$1() {
      return this.insensitive ? 'i' : '';
    }
  }, {
    key: "value",
    get: function get$$1() {
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
    get: function get$$1() {
      return this._attribute;
    },
    set: function set(name) {
      this._handleEscapes("attribute", name);

      this._attribute = name;
    }
  }]);

  return Attribute;
}(_namespace.default);

exports.default = Attribute;
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

unwrapExports(attribute);

var universal = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports.default = void 0;

var _namespace = _interopRequireDefault(namespace);



function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; subClass.__proto__ = superClass; }

var Universal =
/*#__PURE__*/
function (_Namespace) {
  _inheritsLoose(Universal, _Namespace);

  function Universal(opts) {
    var _this;

    _this = _Namespace.call(this, opts) || this;
    _this.type = types.UNIVERSAL;
    _this.value = '*';
    return _this;
  }

  return Universal;
}(_namespace.default);

exports.default = Universal;
module.exports = exports.default;
});

unwrapExports(universal);

var combinator = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports.default = void 0;

var _node = _interopRequireDefault(node);



function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; subClass.__proto__ = superClass; }

var Combinator =
/*#__PURE__*/
function (_Node) {
  _inheritsLoose(Combinator, _Node);

  function Combinator(opts) {
    var _this;

    _this = _Node.call(this, opts) || this;
    _this.type = types.COMBINATOR;
    return _this;
  }

  return Combinator;
}(_node.default);

exports.default = Combinator;
module.exports = exports.default;
});

unwrapExports(combinator);

var nesting = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports.default = void 0;

var _node = _interopRequireDefault(node);



function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; subClass.__proto__ = superClass; }

var Nesting =
/*#__PURE__*/
function (_Node) {
  _inheritsLoose(Nesting, _Node);

  function Nesting(opts) {
    var _this;

    _this = _Node.call(this, opts) || this;
    _this.type = types.NESTING;
    _this.value = '&';
    return _this;
  }

  return Nesting;
}(_node.default);

exports.default = Nesting;
module.exports = exports.default;
});

unwrapExports(nesting);

var sortAscending_1 = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports.default = sortAscending;

function sortAscending(list) {
  return list.sort(function (a, b) {
    return a - b;
  });
}
module.exports = exports.default;
});

unwrapExports(sortAscending_1);

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

unwrapExports(tokenTypes);

var tokenize_1 = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports.default = tokenize;
exports.FIELDS = void 0;

var t = _interopRequireWildcard(tokenTypes);

var _unescapable, _wordDelimiters;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

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
    end]); // Reset offset for the next token

    if (nextOffset) {
      offset = nextOffset;
      nextOffset = null;
    }

    start = end;
  }

  return tokens;
}
});

unwrapExports(tokenize_1);

var parser = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports.default = void 0;

var _indexesOf = _interopRequireDefault(indexesOf);

var _uniq = _interopRequireDefault(uniq);

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

var types$$1 = _interopRequireWildcard(types);



var _WHITESPACE_TOKENS, _Object$assign;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
    (0, util$1.ensureObject)(node, 'raws');
    node[prop] = (0, util$1.unesc)(value);

    if (node.raws[prop] === undefined) {
      node.raws[prop] = value;
    }
  }

  return node;
}

var Parser =
/*#__PURE__*/
function () {
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
    this.tokens = (0, _tokenize.default)({
      css: this.css,
      error: this._errorGenerator(),
      safe: this.options.safe
    });
    var rootSource = getTokenSourceSpan(this.tokens[0], this.tokens[this.tokens.length - 1]);
    this.root = new _root.default({
      source: rootSource
    });
    this.root.errorGenerator = this._errorGenerator();
    var selector$$1 = new _selector.default({
      source: {
        start: {
          line: 1,
          column: 1
        }
      }
    });
    this.root.append(selector$$1);
    this.current = selector$$1;
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

  _proto.attribute = function attribute$$1() {
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
            (0, util$1.ensureObject)(node, 'spaces', lastAdded);
            var prevContent = node.spaces[lastAdded].after || '';
            node.spaces[lastAdded].after = prevContent + content;
            var existingComment = (0, util$1.getProp)(node, 'raws', 'spaces', lastAdded, 'after') || null;

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
              (0, util$1.ensureObject)(node, 'spaces', 'attribute');
              node.spaces.attribute.before = spaceBefore;
              spaceBefore = '';
            }

            if (commentBefore) {
              (0, util$1.ensureObject)(node, 'raws', 'spaces', 'attribute');
              node.raws.spaces.attribute.before = spaceBefore;
              commentBefore = '';
            }

            node.namespace = (node.namespace || "") + content;
            var rawValue = (0, util$1.getProp)(node, 'raws', 'namespace') || null;

            if (rawValue) {
              node.raws.namespace += content;
            }

            lastAdded = 'namespace';
          }

          spaceAfterMeaningfulToken = false;
          break;

        case tokens.dollar:
          if (lastAdded === "value") {
            var oldRawValue = (0, util$1.getProp)(node, 'raws', 'value');
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
              (0, util$1.ensureObject)(node, 'spaces', 'attribute');
              node.spaces.attribute.before = spaceBefore;
              spaceBefore = '';
            }

            if (commentBefore) {
              (0, util$1.ensureObject)(node, 'raws', 'spaces', 'attribute');
              node.raws.spaces.attribute.before = commentBefore;
              commentBefore = '';
            }

            node.attribute = (node.attribute || "") + content;

            var _rawValue = (0, util$1.getProp)(node, 'raws', 'attribute') || null;

            if (_rawValue) {
              node.raws.attribute += content;
            }

            lastAdded = 'attribute';
          } else if (!node.value && node.value !== "" || lastAdded === "value" && !spaceAfterMeaningfulToken) {
            var _unescaped = (0, util$1.unesc)(content);

            var _oldRawValue = (0, util$1.getProp)(node, 'raws', 'value') || '';

            var oldValue = node.value || '';
            node.value = oldValue + _unescaped;
            node.quoteMark = null;

            if (_unescaped !== content || _oldRawValue) {
              (0, util$1.ensureObject)(node, 'raws');
              node.raws.value = (_oldRawValue || oldValue) + content;
            }

            lastAdded = 'value';
          } else {
            var insensitive = content === 'i' || content === "I";

            if ((node.value || node.value === '') && (node.quoteMark || spaceAfterMeaningfulToken)) {
              node.insensitive = insensitive;

              if (!insensitive || content === "I") {
                (0, util$1.ensureObject)(node, 'raws');
                node.raws.insensitiveFlag = content;
              }

              lastAdded = 'insensitive';

              if (spaceBefore) {
                (0, util$1.ensureObject)(node, 'spaces', 'insensitive');
                node.spaces.insensitive.before = spaceBefore;
                spaceBefore = '';
              }

              if (commentBefore) {
                (0, util$1.ensureObject)(node, 'raws', 'spaces', 'insensitive');
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
          (0, util$1.ensureObject)(node, 'raws');
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
              var lastComment = (0, util$1.getProp)(node, 'spaces', lastAdded, 'after') || '';
              var rawLastComment = (0, util$1.getProp)(node, 'raws', 'spaces', lastAdded, 'after') || lastComment;
              (0, util$1.ensureObject)(node, 'raws', 'spaces', lastAdded);
              node.raws.spaces[lastAdded].after = rawLastComment + content;
            } else {
              var lastValue = node[lastAdded] || '';
              var rawLastValue = (0, util$1.getProp)(node, 'raws', lastAdded) || lastValue;
              (0, util$1.ensureObject)(node, 'raws');
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
    this.newNode(new _attribute.default(node));
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

        lastComment = new _comment.default({
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
        nodes.push(new _string.default({
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
      var name = (0, util$1.unesc)(nameRaw).toLowerCase();
      var raws = {};

      if (name !== nameRaw) {
        raws.value = "/" + nameRaw + "/";
      }

      var node = new _combinator.default({
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

  _proto.combinator = function combinator$$1() {
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
      node = new _combinator.default({
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

      node = new _combinator.default({
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

    var selector$$1 = new _selector.default({
      source: {
        start: tokenStart(this.tokens[this.position + 1])
      }
    });
    this.current.parent.append(selector$$1);
    this.current = selector$$1;
    this.position++;
  };

  _proto.comment = function comment$$1() {
    var current = this.currToken;
    this.newNode(new _comment.default({
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

  _proto.nesting = function nesting$$1() {
    if (this.nextToken) {
      var nextContent = this.content(this.nextToken);

      if (nextContent === "|") {
        this.position++;
        return;
      }
    }

    var current = this.currToken;
    this.newNode(new _nesting.default({
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

    if (last && last.type === types$$1.PSEUDO) {
      var selector$$1 = new _selector.default({
        source: {
          start: tokenStart(this.tokens[this.position - 1])
        }
      });
      var cache = this.current;
      last.append(selector$$1);
      this.current = selector$$1;

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
        this.newNode(new _string.default({
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

  _proto.pseudo = function pseudo$$1() {
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

        _this4.newNode(new _pseudo.default({
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

    if (this.position === 0 || this.prevToken[_tokenize.FIELDS.TYPE] === tokens.comma || this.prevToken[_tokenize.FIELDS.TYPE] === tokens.openParenthesis) {
      this.spaces = this.optionalSpace(content);
      this.position++;
    } else if (this.position === this.tokens.length - 1 || this.nextToken[_tokenize.FIELDS.TYPE] === tokens.comma || this.nextToken[_tokenize.FIELDS.TYPE] === tokens.closeParenthesis) {
      this.current.last.spaces.after = this.optionalSpace(content);
      this.position++;
    } else {
      this.combinator();
    }
  };

  _proto.string = function string$$1() {
    var current = this.currToken;
    this.newNode(new _string.default({
      value: this.content(),
      source: getTokenSource(current),
      sourceIndex: current[_tokenize.FIELDS.START_POS]
    }));
    this.position++;
  };

  _proto.universal = function universal$$1(namespace) {
    var nextToken = this.nextToken;

    if (nextToken && this.content(nextToken) === '|') {
      this.position++;
      return this.namespace();
    }

    var current = this.currToken;
    this.newNode(new _universal.default({
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

    var hasClass = (0, _indexesOf.default)(word, '.').filter(function (i) {
      return word[i - 1] !== '\\';
    });
    var hasId = (0, _indexesOf.default)(word, '#').filter(function (i) {
      return word[i - 1] !== '\\';
    }); // Eliminate Sass interpolations from the list of id indexes

    var interpolations = (0, _indexesOf.default)(word, '#{');

    if (interpolations.length) {
      hasId = hasId.filter(function (hashIndex) {
        return !~interpolations.indexOf(hashIndex);
      });
    }

    var indices = (0, _sortAscending.default)((0, _uniq.default)([0].concat(hasClass, hasId)));
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
        node = new _className.default(unescapeProp(classNameOpts, "value"));
      } else if (~hasId.indexOf(ind)) {
        var idOpts = {
          value: value.slice(1),
          source: source,
          sourceIndex: sourceIndex
        };
        node = new _id.default(unescapeProp(idOpts, "value"));
      } else {
        var tagOpts = {
          value: value,
          source: source,
          sourceIndex: sourceIndex
        };
        unescapeProp(tagOpts, "value");
        node = new _tag.default(tagOpts);
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
    get: function get$$1() {
      return this.tokens[this.position];
    }
  }, {
    key: "nextToken",
    get: function get$$1() {
      return this.tokens[this.position + 1];
    }
  }, {
    key: "prevToken",
    get: function get$$1() {
      return this.tokens[this.position - 1];
    }
  }]);

  return Parser;
}();

exports.default = Parser;
module.exports = exports.default;
});

unwrapExports(parser);

var processor = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports.default = void 0;

var _parser = _interopRequireDefault(parser);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Processor =
/*#__PURE__*/
function () {
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

    var parser$$1 = new _parser.default(rule, this._parseOptions(options));
    return parser$$1.root;
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

exports.default = Processor;
module.exports = exports.default;
});

unwrapExports(processor);

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

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var attribute$$1 = function attribute$$1(opts) {
  return new _attribute.default(opts);
};

exports.attribute = attribute$$1;

var className$$1 = function className$$1(opts) {
  return new _className.default(opts);
};

exports.className = className$$1;

var combinator$$1 = function combinator$$1(opts) {
  return new _combinator.default(opts);
};

exports.combinator = combinator$$1;

var comment$$1 = function comment$$1(opts) {
  return new _comment.default(opts);
};

exports.comment = comment$$1;

var id$$1 = function id$$1(opts) {
  return new _id.default(opts);
};

exports.id = id$$1;

var nesting$$1 = function nesting$$1(opts) {
  return new _nesting.default(opts);
};

exports.nesting = nesting$$1;

var pseudo$$1 = function pseudo$$1(opts) {
  return new _pseudo.default(opts);
};

exports.pseudo = pseudo$$1;

var root$$1 = function root$$1(opts) {
  return new _root.default(opts);
};

exports.root = root$$1;

var selector$$1 = function selector$$1(opts) {
  return new _selector.default(opts);
};

exports.selector = selector$$1;

var string$$1 = function string$$1(opts) {
  return new _string.default(opts);
};

exports.string = string$$1;

var tag$$1 = function tag$$1(opts) {
  return new _tag.default(opts);
};

exports.tag = tag$$1;

var universal$$1 = function universal$$1(opts) {
  return new _universal.default(opts);
};

exports.universal = universal$$1;
});

unwrapExports(constructors);

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
  return isPseudo(node) && node.value && (node.value.startsWith("::") || node.value === ":before" || node.value === ":after");
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

unwrapExports(guards);

var selectors = createCommonjsModule(function (module, exports) {

exports.__esModule = true;



Object.keys(types).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  exports[key] = types[key];
});



Object.keys(constructors).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  exports[key] = constructors[key];
});



Object.keys(guards).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  exports[key] = guards[key];
});
});

unwrapExports(selectors);

var dist = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports.default = void 0;

var _processor = _interopRequireDefault(processor);

var selectors$$1 = _interopRequireWildcard(selectors);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var parser = function parser(processor$$1) {
  return new _processor.default(processor$$1);
};

Object.assign(parser, selectors$$1);
delete parser.__esModule;
var _default = parser;
exports.default = _default;
module.exports = exports.default;
});

var selectorParser = unwrapExports(dist);

/* eslint-disable prefer-const, prefer-object-spread, @typescript-eslint/restrict-plus-operands */
function buildPluginApi(tailwindConfig, context) {
  function getConfigValue(path$$1, defaultValue) {
    return path$$1 ? dlv(tailwindConfig, path$$1, defaultValue) : tailwindConfig;
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

  return {
    addVariant: function addVariant() {
      // Unavailable in twin
      return null;
    },

    postcss: postcss,
    prefix: function (prefix) { return prefix; },
    // Customised
    e: function (className) { return className.replace(/\./g, '\\.'); },
    config: getConfigValue,

    theme: function theme(path$$1, defaultValue) {
      var ref = toPath.toPath(path$$1);
      var pathRoot = ref[0];
      var subPaths = ref.slice(1);
      var value = getConfigValue(['theme', pathRoot ].concat( subPaths), defaultValue);
      return transformThemeValue(pathRoot)(value);
    },

    corePlugins: function () { return null; },
    // Unavailable in twin
    variants: function () {
      // Preserved for backwards compatibility but not used in v3.0+
      return [];
    },

    addUserCss: function addUserCss() {
      // Unavailable in twin
      return null;
    },

    addBase: function addBase(base) {
      for (var i = 0, list = withIdentifiers(base); i < list.length; i += 1) {
        var ref = list[i];
        var identifier = ref[0];
        var rule = ref[1];

        var prefixedIdentifier = prefixIdentifier(identifier, {});

        if (!context.candidateRuleMap.has(prefixedIdentifier)) {
          context.candidateRuleMap.set(prefixedIdentifier, []);
        }

        context.candidateRuleMap.get(prefixedIdentifier).push([{
          layer: 'base'
        }, rule]);
      }
    },

    addDefaults: function addDefaults() {
      // Unavailable in twin
      return null;
    },

    addComponents: function addComponents(components, options) {
      var defaultOptions = {
        respectPrefix: true,
        respectImportant: false
      };
      options = Object.assign({}, defaultOptions, Array.isArray(options) ? {} : options);

      for (var i = 0, list = withIdentifiers(components); i < list.length; i += 1) {
        var ref = list[i];
        var identifier = ref[0];
        var rule = ref[1];

        var prefixedIdentifier = prefixIdentifier(identifier, options);

        if (!context.candidateRuleMap.has(prefixedIdentifier)) {
          context.candidateRuleMap.set(prefixedIdentifier, []);
        }

        context.candidateRuleMap.get(prefixedIdentifier).push([{
          layer: 'components',
          options: options
        }, rule]);
      }
    },

    addUtilities: function addUtilities(utilities, options) {
      var defaultOptions = {
        respectPrefix: true,
        respectImportant: true
      };
      options = Object.assign({}, defaultOptions, Array.isArray(options) ? {} : options);

      for (var i = 0, list = withIdentifiers(utilities); i < list.length; i += 1) {
        var ref = list[i];
        var identifier = ref[0];
        var rule = ref[1];

        var prefixedIdentifier = prefixIdentifier(identifier, options);

        if (!context.candidateRuleMap.has(prefixedIdentifier)) {
          context.candidateRuleMap.set(prefixedIdentifier, []);
        }

        context.candidateRuleMap.get(prefixedIdentifier).push([{
          layer: 'utilities',
          options: options
        }, rule]);
      }
    },

    matchUtilities: function () { return null; },
    // Unavailable in twin
    matchComponents: function () { return null; } // Unavailable in twin

  };
}

function withIdentifiers(styles) {
  return parseStyles(styles).flatMap(function (node) {
    var nodeMap = new Map();
    var candidates = extractCandidates(node); // If this isn't "on-demandable", assign it a universal candidate.

    if (candidates.length === 0) {
      return [['*', node]];
    }

    return candidates.map(function (c) {
      if (!nodeMap.has(node)) {
        nodeMap.set(node, node);
      }

      return [c, nodeMap.get(node)];
    });
  });
}

function extractCandidates(node) {
  var classes = [];

  if (node.type === 'rule') {
    for (var i = 0, list = node.selectors; i < list.length; i += 1) {
      var selector = list[i];

      var classCandidates = getClasses(selector); // At least one of the selectors contains non-"on-demandable" candidates.

      if (classCandidates.length === 0) { return []; }
      classes = classes.concat( classCandidates);
    }

    return classes;
  }

  if (node.type === 'atrule') {
    node.walkRules(function (rule) {
      classes = classes.concat( rule.selectors.flatMap(function (selector) { return getClasses(selector); }));
    });
  }

  return classes;
}

function getClasses(selector) {
  var parser = selectorParser(function (selectors) {
    var allClasses = [];
    selectors.walkClasses(function (classNode) {
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

  return styles.flatMap(function (style) {
    var isNode = !Array.isArray(style) && !isPlainObject(style);
    return isNode ? style : parseObjectStyles(style);
  });
}

var stripLeadingDot = function (string) { return string.startsWith('.') ? string.slice(1) : string; };

var replaceSelectorWithParent = function (string, replacement) { return string.replace(replacement, ("{{" + (stripLeadingDot(replacement)) + "}}")); };

var parseSelector = function (selector) {
  if (!selector) { return; }
  var matches = selector.trim().match(/^(\S+)(\s+.*?)?$/);
  if (matches === null) { return; }
  var match = matches[0]; // Fix spacing that goes missing when provided by tailwindcss
  // Unfortunately this removes the ability to have classes on the same element
  // eg: .something.something or &.something

  match = match.replace(/(?<=\w)\./g, ' .'); // If the selector is just a single selector then return

  if (!match.includes(' ')) { return match; } // Look for class matching candidates

  var match2 = match.match(/(?<=>|^|~|\+|\*| )\.[\w.\\-]+(?= |>|~|\+|\*|:|$)/gm);
  if (!match2) { return match; } // Wrap the matching classes in {{class}}

  for (var i = 0, list = match2; i < list.length; i += 1) {
    var item = list[i];

    match = replaceSelectorWithParent(match, item);
  }

  return match;
};

var parseRuleProperty = function (string) {
  // https://stackoverflow.com/questions/448981/which-characters-are-valid-in-css-class-names-selectors
  if (string && string.match(/^-{2,3}[_a-z]+[\w-]*/i)) {
    return string;
  }

  return camelize(string);
};

var escapeSelector = function (selector) { return selector.replace(/\\\//g, '/').trim(); };

var buildAtSelector = function (name, values, screens) {
  // Support @screen selectors
  if (name === 'screen') {
    var screenValue = screens[values];
    if (screenValue) { return ("@media (min-width: " + screenValue + ")"); }
  }

  return ("@" + name + " " + values);
};

var getBuiltRules = function (rule, ref) {
  var obj;

  var isBase = ref.isBase;
  if (!rule.selector) { return null; } // Prep comma spaced selectors for parsing

  var selectorArray = rule.selector.split(','); // Validate each selector

  var selectorParsed = selectorArray.map(function (s) { return parseSelector(s); }).filter(Boolean); // Join them back into a string

  var selector = selectorParsed.join(','); // Rule isn't formatted correctly

  if (!selector) { return null; }

  if (isBase) {
    // Base values stay as-is because they aren't interactive
    return ( obj = {}, obj[escapeSelector(selector)] = buildDeclaration(rule.nodes), obj );
  } // Separate comma-separated selectors to allow twin's features


  return selector.split(',').reduce(function (result, selector) {
    var obj;

    return (Object.assign({}, result,
    ( obj = {}, obj[escapeSelector(selector)] = buildDeclaration(rule.nodes), obj )));
  }, {});
};

var buildDeclaration = function (items) {
  if (typeof items !== 'object') { return items; }
  return Object.entries(items).reduce(function (result, ref) {
    var obj;

    var declaration = ref[1];
    return (Object.assign({}, result,
    ( obj = {}, obj[parseRuleProperty(declaration.prop)] = declaration.value, obj )));
  }, {});
};

var ruleSorter = function (arr, screens) {
  if (!Array.isArray(arr) || arr.length === 0) { return []; }
  var screenOrder = screens ? Object.keys(screens) : [];
  arr // Tailwind supplies the classes reversed since 2.0.x
  .reverse() // Tailwind also messes up the ordering so classes need to be resorted
  // Order selectors by length (don't know of a better way)
  .sort(function (a, b) {
    var selectorA = a.selector ? a.selector.length : 0;
    var selectorB = b.selector ? b.selector.length : 0;
    return selectorA - selectorB;
  }) // Place at rules at the end '@media' etc
  .sort(function (a, b) {
    var atRuleA = a.type === 'atrule';
    var atRuleB = b.type === 'atrule';
    return atRuleA - atRuleB;
  }) // Sort @media by screens index
  .sort(function (a, b) {
    var screenIndexA = a.name === 'screen' ? screenOrder.indexOf(a.params) : 0;
    var screenIndexB = b.name === 'screen' ? screenOrder.indexOf(b.params) : 0;
    return screenIndexA - screenIndexB;
  }) // Traverse children and reorder aswell
  .forEach(function (item) {
    if (!item.nodes || item.nodes.length === 0) { return; }
    item.nodes.forEach(function (i) {
      if (typeof i !== 'object') { return; }
      return ruleSorter(i, screens);
    });
  });
  return arr;
};

var getUserPluginRules = function (rules, screens, isBase) { return ruleSorter(rules, screens).reduce(function (result, rule) {
  var obj;

  if (rule.type === 'decl') {
    var builtRules = {};
    builtRules[rule.prop] = rule.value;
    return deepMerge(result, builtRules);
  } // Build the media queries


  if (rule.type !== 'atrule') {
    var builtRules$1 = getBuiltRules(rule, {
      isBase: isBase
    });
    return deepMerge(result, builtRules$1);
  } // Remove a bunch of nodes that tailwind uses for limiting rule generation
  // https://github.com/tailwindlabs/tailwindcss/commit/b69e46cc1b32608d779dad35121077b48089485d#diff-808341f38c6f7093a7979961a53f5922R20


  if (['layer', 'variants', 'responsive'].includes(rule.name)) {
    return deepMerge.apply(void 0, [ result ].concat( getUserPluginRules(rule.nodes, screens, isBase) ));
  }

  var atSelector = buildAtSelector(rule.name, rule.params, screens);
  return deepMerge(result, ( obj = {}, obj[atSelector] = getUserPluginRules(rule.nodes, screens, isBase), obj ));
}, {}); };

var getUserPluginData = function (ref) {
  var config = ref.config;

  if (!config.plugins || config.plugins.length === 0) {
    return;
  }

  var context = {
    candidateRuleMap: new Map(),
    tailwindConfig: config
  };
  var pluginApi = buildPluginApi(config, context);
  var userPlugins = config.plugins.map(function (plugin) {
    if (plugin.__isOptionsFunction) {
      plugin = plugin();
    }

    return typeof plugin === 'function' ? plugin : plugin.handler;
  }); // Call each of the plugins with the pluginApi

  for (var i$1 = 0, list$1 = userPlugins; i$1 < list$1.length; i$1 += 1) {
    var plugin = list$1[i$1];

    if (Array.isArray(plugin)) {
      for (var i = 0, list = plugin; i < list.length; i += 1) {
        var pluginItem = list[i];

        pluginItem(pluginApi);
      }
    } else {
      plugin(pluginApi);
    }
  }

  var rulesets = context.candidateRuleMap.values();
  var baseRaw = [];
  var componentsRaw = [];
  var utilitiesRaw = []; // eslint-disable-next-line unicorn/prefer-spread

  for (var i$3 = 0, list$3 = Array.from(rulesets); i$3 < list$3.length; i$3 += 1) {
    var rules = list$3[i$3];

    for (var i$2 = 0, list$2 = rules; i$2 < list$2.length; i$2 += 1) {
      var ref$1 = list$2[i$2];
      var data = ref$1[0];
      var rule = ref$1[1];

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


  var base = getUserPluginRules(baseRaw, config.theme.screens, true);
  /**
   * Components
   */

  var components = getUserPluginRules(componentsRaw, config.theme.screens);
  /**
   * Utilities
   */

  var utilities = getUserPluginRules(utilitiesRaw, config.theme.screens);
  return {
    base: base,
    components: components,
    utilities: utilities
  };
};

var getPackageUsed = function (ref) {
  var preset = ref.config.preset;
  var cssImport = ref.cssImport;
  var styledImport = ref.styledImport;

  return ({
  isEmotion: preset === 'emotion' || styledImport.from.includes('emotion') || cssImport.from.includes('emotion'),
  isStyledComponents: preset === 'styled-components' || styledImport.from.includes('styled-components') || cssImport.from.includes('styled-components'),
  isGoober: preset === 'goober' || styledImport.from.includes('goober') || cssImport.from.includes('goober'),
  isStitches: preset === 'stitches' || styledImport.from.includes('stitches') || cssImport.from.includes('stitches')
});
};

var macroTasks = [handleTwFunction, handleGlobalStylesFunction, // GlobalStyles import
updateStyledReferences, // Styled import
handleStyledFunction, // Convert tw.div`` & styled.div`` to styled('div', {}) (stitches)
updateCssReferences, // Update any usage of existing css imports
handleThemeFunction, // Theme import
handleScreenFunction, // Screen import
addStyledImport, addCssImport // Gotcha: Must be after addStyledImport or issues with theme`` style transpile
];

var twinMacro = function (ref) {
  var t = ref.babel.types;
  var references = ref.references;
  var state = ref.state;
  var config = ref.config;

  validateImports(references);
  var program = state.file.path;
  var isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev' || false;
  state.isDev = isDev;
  state.isProd = !isDev;
  var ref$1 = getConfigTailwindProperties(state, config);
  var configExists = ref$1.configExists;
  var configTailwind = ref$1.configTailwind; // Get import presets

  var styledImport = getStyledConfig({
    state: state,
    config: config
  });
  var cssImport = getCssConfig({
    state: state,
    config: config
  }); // Identify the css-in-js library being used

  var packageUsed = getPackageUsed({
    config: config,
    cssImport: cssImport,
    styledImport: styledImport
  });

  for (var i = 0, list = Object.entries(packageUsed); i < list.length; i += 1) {
    var ref$2 = list[i];
    var key = ref$2[0];
    var value = ref$2[1];

    state[key] = value;
  }

  var configTwin = getConfigTwinValidated(config, state);
  state.configExists = configExists;
  state.config = configTailwind;
  state.configTwin = configTwin;
  state.debug = debug(state);
  state.globalStyles = new Map();
  state.tailwindConfigIdentifier = generateUid('tailwindConfig', program);
  state.tailwindUtilsIdentifier = generateUid('tailwindUtils', program);
  state.userPluginData = getUserPluginData({
    config: state.config
  });
  isDev && Boolean(config.debugPlugins) && state.userPluginData && debugPlugins(state.userPluginData);
  state.styledImport = styledImport;
  state.cssImport = cssImport; // Init identifiers

  state.styledIdentifier = null;
  state.cssIdentifier = null; // Group traversals together for better performance

  program.traverse({
    ImportDeclaration: function ImportDeclaration(path$$1) {
      setStyledIdentifier({
        state: state,
        path: path$$1,
        styledImport: styledImport
      });
      setCssIdentifier({
        state: state,
        path: path$$1,
        cssImport: cssImport
      });
    },

    JSXElement: function JSXElement(path$$1) {
      var allAttributes = path$$1.get('openingElement.attributes');
      var jsxAttributes = allAttributes.filter(function (a) { return a.isJSXAttribute(); });
      var ref = getCssAttributeData(jsxAttributes);
      var index = ref.index;
      var hasCssAttribute = ref.hasCssAttribute; // Make sure hasCssAttribute remains true once css prop has been found
      // so twin can add the css prop

      state.hasCssAttribute = state.hasCssAttribute || hasCssAttribute; // Reverse the attributes so the items keep their order when replaced

      var orderedAttributes = index > 1 ? jsxAttributes.reverse() : jsxAttributes;

      for (var i = 0, list = orderedAttributes; i < list.length; i += 1) {
        path$$1 = list[i];

        handleClassNameProperty({
          path: path$$1,
          t: t,
          state: state
        });
        handleTwProperty({
          path: path$$1,
          t: t,
          state: state,
          program: program
        });
        handleCsProperty({
          path: path$$1,
          t: t,
          state: state
        });
      }

      hasCssAttribute && convertHtmlElementToStyled({
        path: path$$1,
        t: t,
        program: program,
        state: state
      });
    }

  });
  if (state.styledIdentifier === null) { state.styledIdentifier = generateUid('styled', program); }
  if (state.cssIdentifier === null) { state.cssIdentifier = generateUid('css', program); }

  for (var i$1 = 0, list$1 = macroTasks; i$1 < list$1.length; i$1 += 1) {
    var task = list$1[i$1];

    task({
      styledImport: styledImport,
      cssImport: cssImport,
      configTwin: configTwin,
      references: references,
      program: program,
      config: config,
      state: state,
      t: t
    });
  }

  program.scope.crawl();
};

var macro = babelPluginMacros.createMacro(twinMacro, {
  configName: 'twin'
});

module.exports = macro;
//# sourceMappingURL=macro.js.map
