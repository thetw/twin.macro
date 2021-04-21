import timSort from 'timsort'

const compare = (a, b) => {
  // The order of grid properties matter when combined into a single object
  // So here we move filter to the beginning to avoid being trumped
  // https://github.com/ben-rogerson/twin.macro/issues/363
  const A = /(^|:)filter/.test(a) ? -1 : 0
  const B = /(^|:)filter/.test(b) ? -1 : 0
  return A - B
}

const orderFilterProperty = className => {
  const classNames = className.match(/\S+/g) || []
  // Tim Sort provides accurate sorting in node < 11
  // https://github.com/ben-rogerson/twin.macro/issues/20
  timSort.sort(classNames, compare)
  return classNames.join(' ')
}

export { orderFilterProperty }
