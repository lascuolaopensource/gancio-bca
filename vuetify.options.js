import { be, ca, cs, da, de, en, es, eu, fi, fr, gl, ja, hr, it, lv, nb, nl, pl, pt, tr, sl, sk, sv, srLatn, srCyrl, ro, ru, zhHans } from 'vuetify/es5/locale'
const minifyTheme = require('minify-css-string').default

export default ({ res, nuxtState }) => {
  const settings = process.server ? (res.locals.settings || {}) : nuxtState.state.settings || {}
  const is_dark = nuxtState?.state?.localSettings['theme.is_dark'] ?? settings['theme.is_dark']

  return {
    lang: { locales: { be, ca, cs, de, da, en, es, eu, fi, ja, fr, gl, hr, it, lv, nb, nl, pl, pt, sl, sk, srLatn, srCyrl, sv, tr, ro, ru, zhHans } },
    theme: {
      options: {
        customProperties: false,
        variations: false,
        minifyTheme
      },
      dark: is_dark,
      themes: {
        dark: settings.dark_colors,
        light: settings.light_colors
      }
    },
  }
}
