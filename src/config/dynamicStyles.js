export default {
  /**
   * ===========================================
   * Layout
   */

  // https://tailwindcss.com/docs/animation
  animate: { plugin: 'animation' },

  // https://tailwindcss.com/docs/container
  container: { plugin: 'container' },

  // https://tailwindcss.com/docs/box-sizing
  // https://tailwindcss.com/docs/display
  // https://tailwindcss.com/docs/float
  // https://tailwindcss.com/docs/clear
  // https://tailwindcss.com/docs/object-fit
  // See staticStyles.js

  // https://tailwindcss.com/docs/object-position
  object: { prop: 'objectPosition', config: 'objectPosition' },

  // https://tailwindcss.com/docs/overflow
  // https://tailwindcss.com/docs/position
  // See staticStyles.js

  // https://tailwindcss.com/docs/top-right-bottom-left
  top: { prop: 'top', config: 'inset' },
  bottom: { prop: 'bottom', config: 'inset' },
  right: { prop: 'right', config: 'inset' },
  left: { prop: 'left', config: 'inset' },
  'inset-y': { prop: ['top', 'bottom'], config: 'inset' },
  'inset-x': { prop: ['left', 'right'], config: 'inset' },
  inset: { prop: ['top', 'right', 'bottom', 'left'], config: 'inset' },

  // https://tailwindcss.com/docs/visibility
  // See staticStyles.js

  // https://tailwindcss.com/docs/z-index
  z: { prop: 'zIndex', config: 'zIndex' },

  // https://tailwindcss.com/docs/space
  // space-x-reverse + space-y-reverse are in staticStyles
  'space-y': { plugin: 'space' },
  'space-x': { plugin: 'space' },

  // https://tailwindcss.com/docs/divide-width/
  'divide-opacity': { plugin: 'divide' },
  'divide-y': { plugin: 'divide' },
  'divide-x': { plugin: 'divide' },
  divide: { plugin: 'divide' },

  /**
   * ===========================================
   * Flexbox
   */

  // https://tailwindcss.com/docs/flex-direction
  // https://tailwindcss.com/docs/flex-wrap
  // https://tailwindcss.com/docs/align-items
  // https://tailwindcss.com/docs/align-content
  // https://tailwindcss.com/docs/align-self
  // https://tailwindcss.com/docs/justify-content
  // See staticStyles.js

  // https://tailwindcss.com/docs/flex-grow
  'flex-grow': { prop: 'flexGrow', config: 'flexGrow' },

  // https://tailwindcss.com/docs/flex-shrink
  'flex-shrink': { prop: 'flexShrink', config: 'flexShrink' },

  // https://tailwindcss.com/docs/flex
  flex: { prop: 'flex', config: 'flex' },

  // https://tailwindcss.com/docs/order
  order: { prop: 'order', config: 'order' },

  /**
   * ===========================================
   * Grid
   */

  // https://tailwindcss.com/docs/grid-template-columns
  'grid-cols': { prop: 'gridTemplateColumns', config: 'gridTemplateColumns' },

  // https://tailwindcss.com/docs/grid-column
  col: { prop: 'gridColumn', config: 'gridColumn' },
  'col-start': { prop: 'gridColumnStart', config: 'gridColumnStart' },
  'col-end': { prop: 'gridColumnEnd', config: 'gridColumnEnd' },

  // https://tailwindcss.com/docs/grid-template-rows
  'grid-rows': { prop: 'gridTemplateRows', config: 'gridTemplateRows' },

  // https://tailwindcss.com/docs/grid-row
  row: { prop: 'gridRow', config: 'gridRow' },
  'row-start': { prop: 'gridRowStart', config: 'gridRowStart' },
  'row-end': { prop: 'gridRowEnd', config: 'gridRowEnd' },

  // https://tailwindcss.com/docs/grid-auto-columns
  'auto-cols': { prop: 'gridAutoColumns', config: 'gridAutoColumns' },

  // https://tailwindcss.com/docs/grid-auto-rows
  'auto-rows': { prop: 'gridAutoRows', config: 'gridAutoRows' },

  // https://tailwindcss.com/docs/gap
  gap: { prop: 'gap', config: 'gap' },
  'gap-x': {
    prop: 'columnGap',
    config: 'gap',
    configFallback: 'spacing',
  },
  'gap-y': {
    prop: 'rowGap',
    config: 'gap',
    configFallback: 'spacing',
  },

  // Deprecated since tailwindcss v1.7.0
  'col-gap': { prop: 'columnGap', config: 'gap' },
  'row-gap': { prop: 'rowGap', config: 'gap' },

  /**
   * ===========================================
   * Spacing
   */

  // https://tailwindcss.com/docs/padding
  pt: { prop: 'paddingTop', config: 'padding' },
  pr: { prop: 'paddingRight', config: 'padding' },
  pb: { prop: 'paddingBottom', config: 'padding' },
  pl: { prop: 'paddingLeft', config: 'padding' },
  px: { prop: ['paddingLeft', 'paddingRight'], config: 'padding' },
  py: { prop: ['paddingTop', 'paddingBottom'], config: 'padding' },
  p: { prop: 'padding', config: 'padding' },

  // https://tailwindcss.com/docs/margin
  mt: { prop: 'marginTop', config: 'margin' },
  mr: { prop: 'marginRight', config: 'margin' },
  mb: { prop: 'marginBottom', config: 'margin' },
  ml: { prop: 'marginLeft', config: 'margin' },
  mx: { prop: ['marginLeft', 'marginRight'], config: 'margin' },
  my: { prop: ['marginTop', 'marginBottom'], config: 'margin' },
  m: { prop: 'margin', config: 'margin' },

  /**
   * ===========================================
   * Sizing
   */

  // https://tailwindcss.com/docs/width
  w: { prop: 'width', config: 'width' },

  // https://tailwindcss.com/docs/min-width
  'min-w': { prop: 'minWidth', config: 'minWidth' },

  // https://tailwindcss.com/docs/max-width
  'max-w': { prop: 'maxWidth', config: 'maxWidth' },

  // https://tailwindcss.com/docs/height
  h: { prop: 'height', config: 'height' },

  // https://tailwindcss.com/docs/min-height
  'min-h': { prop: 'minHeight', config: 'minHeight' },

  // https://tailwindcss.com/docs/max-height
  'max-h': { prop: 'maxHeight', config: 'maxHeight' },

  /**
   * ===========================================
   * Typography
   */

  font: [
    // https://tailwindcss.com/docs/font-family
    { prop: 'fontFamily', config: 'fontFamily' },
    // https://tailwindcss.com/docs/font-weight
    { prop: 'fontWeight', config: 'fontWeight' },
  ],

  // https://tailwindcss.com/docs/font-smoothing
  // https://tailwindcss.com/docs/font-style
  // See staticStyles.js

  // https://tailwindcss.com/docs/letter-spacing
  tracking: { prop: 'letterSpacing', config: 'letterSpacing' },

  // https://tailwindcss.com/docs/line-height
  leading: { prop: 'lineHeight', config: 'lineHeight' },

  // https://tailwindcss.com/docs/list-style-type
  list: { prop: 'listStyleType', config: 'listStyleType' },

  // https://tailwindcss.com/docs/list-style-position
  // See staticStyles.js

  // https://tailwindcss.com/docs/placeholder-color
  // https://tailwindcss.com/docs/placeholder-opacity
  placeholder: { plugin: 'placeholder' },

  // https://tailwindcss.com/docs/text-align
  // See staticStyles.js

  // https://tailwindcss.com/docs/text-color
  // https://tailwindcss.com/docs/font-size
  'text-opacity': {
    prop: '--tw-text-opacity',
    config: 'textOpacity',
    configFallback: 'opacity',
  },
  text: { plugin: 'text' },
  // https://tailwindcss.com/docs/text-decoration
  // https://tailwindcss.com/docs/text-transform
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
    configFallback: 'opacity',
  },
  // https://tailwindcss.com/docs/gradient-color-stops
  bg: { plugin: 'bg' },

  // https://tailwindcss.com/docs/gradient-color-stops
  from: { plugin: 'gradient' },
  via: { plugin: 'gradient' },
  to: { plugin: 'gradient' },

  /**
   * ===========================================
   * Borders
   */

  // https://tailwindcss.com/docs/border-style
  // See staticStyles.js

  // https://tailwindcss.com/docs/border-width
  'border-t': { prop: 'borderTopWidth', config: 'borderWidth' },
  'border-b': { prop: 'borderBottomWidth', config: 'borderWidth' },
  'border-l': { prop: 'borderLeftWidth', config: 'borderWidth' },
  'border-r': { prop: 'borderRightWidth', config: 'borderWidth' },

  'border-opacity': {
    prop: '--tw-border-opacity',
    config: 'borderOpacity',
    configFallback: 'opacity',
  },
  border: { plugin: 'border' },

  // https://tailwindcss.com/docs/border-radius
  'rounded-tl': { prop: 'borderTopLeftRadius', config: 'borderRadius' },
  'rounded-tr': { prop: 'borderTopRightRadius', config: 'borderRadius' },
  'rounded-br': { prop: 'borderBottomRightRadius', config: 'borderRadius' },
  'rounded-bl': { prop: 'borderBottomLeftRadius', config: 'borderRadius' },
  'rounded-t': {
    prop: ['borderTopLeftRadius', 'borderTopRightRadius'],
    config: 'borderRadius',
  },
  'rounded-r': {
    prop: ['borderTopRightRadius', 'borderBottomRightRadius'],
    config: 'borderRadius',
  },
  'rounded-b': {
    prop: ['borderBottomLeftRadius', 'borderBottomRightRadius'],
    config: 'borderRadius',
  },
  'rounded-l': {
    prop: ['borderTopLeftRadius', 'borderBottomLeftRadius'],
    config: 'borderRadius',
  },
  rounded: { prop: 'borderRadius', config: 'borderRadius' },

  // https://tailwindcss.com/docs/ring-opacity
  'ring-opacity': {
    prop: '--tw-ring-opacity',
    config: 'ringOpacity',
    configFallback: 'opacity',
  },

  // https://tailwindcss.com/docs/ring-offset-width
  // https://tailwindcss.com/docs/ring-offset-color
  'ring-offset': { plugin: 'ringOffset' },

  // https://tailwindcss.com/docs/ring-width
  // https://tailwindcss.com/docs/ring-color
  ring: { plugin: 'ring' },

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
  shadow: { plugin: 'boxShadow' },

  // https://tailwindcss.com/docs/opacity
  opacity: { prop: 'opacity', config: 'opacity' },

  /**
   * ===========================================
   * Filters
   */

  // https://tailwindcss.com/docs/filter
  // See staticStyles.js

  // https://tailwindcss.com/docs/blur
  blur: { plugin: 'blur' },

  // https://tailwindcss.com/docs/brightness
  brightness: { plugin: 'brightness' },

  // https://tailwindcss.com/docs/contrast
  contrast: { plugin: 'contrast' },

  // https://tailwindcss.com/docs/drop-shadow
  'drop-shadow': { plugin: 'dropShadow' },

  // https://tailwindcss.com/docs/grayscale
  grayscale: { plugin: 'grayscale' },

  // https://tailwindcss.com/docs/hue-rotate
  'hue-rotate': { plugin: 'hueRotate' },

  // https://tailwindcss.com/docs/invert
  invert: { plugin: 'invert' },

  // https://tailwindcss.com/docs/saturate
  saturate: { plugin: 'saturate' },

  // https://tailwindcss.com/docs/sepia
  sepia: { plugin: 'sepia' },

  // https://tailwindcss.com/docs/backdrop-filter

  // https://tailwindcss.com/docs/backdrop-blur
  'backdrop-blur': { plugin: 'backdropBlur' },

  // https://tailwindcss.com/docs/backdrop-brightness
  'backdrop-brightness': { plugin: 'backdropBrightness' },

  // https://tailwindcss.com/docs/backdrop-contrast
  'backdrop-contrast': { plugin: 'backdropContrast' },

  // https://tailwindcss.com/docs/backdrop-grayscale
  'backdrop-grayscale': { plugin: 'backdropGrayscale' },

  // https://tailwindcss.com/docs/backdrop-hue-rotate
  'backdrop-hue-rotate': { plugin: 'backdropHueRotate' },

  // https://tailwindcss.com/docs/backdrop-invert
  'backdrop-invert': { plugin: 'backdropInvert' },

  // https://tailwindcss.com/docs/backdrop-opacity
  'backdrop-opacity': { plugin: 'backdropOpacity' },

  // https://tailwindcss.com/docs/backdrop-saturate
  'backdrop-saturate': { plugin: 'backdropSaturate' },

  // https://tailwindcss.com/docs/backdrop-sepia
  'backdrop-sepia': { plugin: 'backdropSepia' },

  /**
   * ===========================================
   * Transitions
   */

  // https://tailwindcss.com/docs/transtiion-property
  transition: { plugin: 'transition' },

  // https://tailwindcss.com/docs/transition-duration
  duration: { prop: 'transitionDuration', config: 'transitionDuration' },

  // https://tailwindcss.com/docs/transition-timing-function
  ease: {
    prop: 'transitionTimingFunction',
    config: 'transitionTimingFunction',
  },

  // https://tailwindcss.com/docs/transition-delay
  delay: { prop: 'transitionDelay', config: 'transitionDelay' },

  /**
   * ===========================================
   * Transforms
   */

  // https://tailwindcss.com/docs/scale
  'scale-x': { prop: '--tw-scale-x', config: 'scale' },
  'scale-y': { prop: '--tw-scale-y', config: 'scale' },
  scale: {
    prop: ['--tw-scale-x', '--tw-scale-y'],
    config: 'scale',
  },

  // https://tailwindcss.com/docs/rotate
  rotate: { prop: '--tw-rotate', config: 'rotate' },

  // https://tailwindcss.com/docs/translate
  'translate-x': { prop: '--tw-translate-x', config: 'translate' },
  'translate-y': { prop: '--tw-translate-y', config: 'translate' },

  // https://tailwindcss.com/docs/skew
  'skew-x': { prop: '--tw-skew-x', config: 'skew' },
  'skew-y': { prop: '--tw-skew-y', config: 'skew' },

  // https://tailwindcss.com/docs/transform-origin
  origin: { prop: 'transformOrigin', config: 'transformOrigin' },

  /**
   * ===========================================
   * Interactivity
   */

  // https://tailwindcss.com/docs/appearance
  // See staticStyles.js

  // https://tailwindcss.com/docs/cursor
  cursor: { prop: 'cursor', config: 'cursor' },

  // https://tailwindcss.com/docs/outline
  outline: { plugin: 'outline' },

  // https://tailwindcss.com/docs/pointer-events
  // https://tailwindcss.com/docs/resize
  // https://tailwindcss.com/docs/user-select
  // See staticStyles.js

  /**
   * ===========================================
   * Svg
   */

  // https://tailwindcss.com/docs/fill
  fill: { prop: 'fill', config: 'fill' },

  // https://tailwindcss.com/docs/stroke
  // https://tailwindcss.com/docs/stroke
  stroke: { plugin: 'stroke' },

  /**
   * ===========================================
   * Accessibility
   */

  // https://tailwindcss.com/docs/screen-readers
  // See staticStyles.js
}
