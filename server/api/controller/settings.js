const path = require('path')
const URL = require('url')
const crypto = require('crypto')
const { promisify } = require('util')
const sharp = require('sharp')
const config = require('../../config')
const generateKeyPair = promisify(crypto.generateKeyPair)
const log = require('../../log')
const escape = require('lodash/escape')
const clone = require('lodash/cloneDeep')
const DB = require('../models/models')

let defaultHostname
try {
  defaultHostname = new URL.URL(config.baseurl).hostname
} catch (e) {}

const defaultSettings = {
  title: config.title || 'Gancio',
  description: config.description || 'A shared agenda for local communities',
  baseurl: config.baseurl || '',
  hostname: defaultHostname,
  instance_timezone: 'Europe/Rome',
  instance_locale: 'en',
  instance_name: 'relay',
  allow_registration: true,
  allow_anon_event: true,
  allow_multidate_event: true,
  allow_recurrent_event: false,
  allow_event_without_end_time: true,
  allow_online_event: true,
  show_download_media: true,
  enable_moderation: false,
  enable_report: false,
  recurrent_event_visible: false,
  allow_geolocation: false,
  geocoding_provider_type: 'Nominatim',
  geocoding_provider: 'https://nominatim.openstreetmap.org/search',
  geocoding_countrycodes: [],
  tilelayer_provider: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  tilelayer_provider_attribution:
    '<a target="_blank" href="http://osm.org/copyright">OpenStreetMap</a> contributors',
  enable_federation: true,
  federated_events_in_home: true,
  enable_resources: false,
  hide_boosts: true,
  'theme.is_dark': true,
  dark_colors: {
    primary: '#ff3e63',
    error: '#FF5252',
    info: '#2196F3',
    success: '#4CAF50',
    warning: '#FB8C00'
  },
  light_colors: {
    primary: '#0911eb',
    error: '#FF5252',
    info: '#2196F3',
    success: '#4CAF50',
    warning: '#FB8C00'
  },
  hide_thumbs: false,
  hide_calendar: false,
  footerLinks: [
    { href: '/', label: 'common.home' },
    { href: '/about', label: 'common.about' }
  ],
  plugins: [],
  admin_email: config.admin_email || '',
  smtp: config.smtp || {},
  collection_in_home: null,
  calendar_first_day_of_week: null,
  default_fedi_hashtags: [],
  custom_js: '',
  custom_css: ''
}

/**
 * Settings controller: store instance settings
 */

const settingsController = {
  settings: { initialized: false },
  user_locale: {},
  secretSettings: {},

  async load() {
    if (config.status !== 'CONFIGURED') {
      settingsController.settings = defaultSettings
      return
    }
    if (settingsController.settings.initialized) {
      return
    }
    settingsController.settings.initialized = true
    // initialize instance settings from db
    // note that this is done only once when the server starts
    // and not for each request
    const settings = await DB.Setting.findAll()
    settingsController.settings = defaultSettings
    settings.forEach((s) => {
      if (s.is_secret) {
        settingsController.secretSettings[s.key] = s.value
      } else {
        settingsController.settings[s.key] = s.value
      }
    })

    // add pub/priv instance key if needed
    if (!settingsController.settings.publicKey) {
      log.info('Instance priv/pub key not found, generating....')
      const { publicKey, privateKey } = await generateKeyPair('rsa', {
        modulusLength: 4096,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      })

      await settingsController.set('publicKey', publicKey)
      await settingsController.set('privateKey', privateKey, true)
    }

    const pluginController = require('./plugins')
    await pluginController._load()
  },

  async set(key, value, is_secret = false) {
    // If the key is 'smtp', handle it specially
    if (key === 'smtp') {
      if (!value.auth.pass) {
        value.auth.pass = settingsController.settings.smtp.auth.pass
      }
      log.info(
        `SET SMTP: ${JSON.stringify({
          host: value.host,
          port: value.port,
          user: value.auth.user
        })}`
      )
    } else {
      log.info(`SET ${key} ${is_secret ? '*****' : JSON.stringify(value)}`)
    }

    try {
      const [setting, created] = await DB.Setting.findOrCreate({
        where: { key },
        defaults: { value, is_secret }
      })
      if (!created) {
        await setting.update({ value, is_secret })
      }
      settingsController[is_secret ? 'secretSettings' : 'settings'][key] = value
      return true
    } catch (e) {
      log.error('[SETTING SET]', e)
      return false
    }
  },

  async setRequest(req, res) {
    const { key, value, is_secret } = req.body
    const ret = await settingsController.set(key, value, is_secret)

    // reload plugin when its settings change
    if (key.startsWith('plugin_')) {
      const pluginName = key.slice(7)
      try {
        const pluginController = require('./plugins')
        pluginController.unloadPlugin(pluginName)
        // Do not reload the plugin if plugin is disabled
        if (value.enable) {
          pluginController.loadPlugin(pluginName)
        }
      } catch (e) {
        log.error(e)
      }
    }

    if (ret) {
      res.sendStatus(200)
    } else {
      res.sendStatus(400)
    }
  },

  async testSMTP(req, res) {
    const smtp = req.body
    await settingsController.set('smtp', smtp.smtp)
    const mail = require('../mail')
    try {
      await mail._send(settingsController.settings.admin_email, 'test')

      return res.sendStatus(200)
    } catch (e) {
      console.error(e)
      return res.status(400).send(escape(String(e)))
    }
  },

  getSMTPSettings(_req, res) {
    const smtpSettings = clone(settingsController.settings.smtp)
    delete smtpSettings.auth.pass
    return res.json(smtpSettings)
  },

  getAll(_req, res) {
    return res.json(settingsController.settings)
  },

  setLogo(req, res) {
    if (!req.file) {
      settingsController.set('logo', false)
      return res.status(200)
    }

    const uploadedPath = path.join(req.file.destination, req.file.filename)
    const baseImgPath = path.resolve(config.upload_path, 'logo')

    // convert and resize to png
    return sharp(uploadedPath)
      .rotate()
      .resize(400)
      .png({ quality: 90 })
      .toFile(baseImgPath + '.png', (err) => {
        if (err) {
          log.error('[LOGO] ' + err)
        }
        settingsController.set('logo', baseImgPath)
        res.sendStatus(200)
      })
  },

  setFallbackImage(req, res) {
    if (!req.file) {
      settingsController.set('fallback_image', false)
      return res.status(200)
    }

    const uploadedPath = path.join(req.file.destination, req.file.filename)
    const baseImgPath = path.resolve(config.upload_path, 'fallbackImage.png')

    // convert and resize to png
    return sharp(uploadedPath)
      .rotate()
      .resize(600)
      .png({ quality: 99 })
      .toFile(baseImgPath, (err) => {
        if (err) {
          log.error('[FALLBACK IMAGE] ' + err)
        }
        settingsController.set('fallback_image', baseImgPath)
        res.sendStatus(200)
      })
  },

  setHeaderImage(req, res) {
    if (!req.file) {
      settingsController.set('header_image', false)
      return res.status(200)
    }

    const uploadedPath = path.join(req.file.destination, req.file.filename)
    const baseImgPath = path.resolve(config.upload_path, 'headerImage.png')

    // convert and resize to png
    return sharp(uploadedPath)
      .rotate()
      .resize(600)
      .png({ quality: 99 })
      .toFile(baseImgPath, (err) => {
        if (err) {
          log.error('[HEADER IMAGE] ' + err)
        }
        settingsController.set('header_image', baseImgPath)
        res.sendStatus(200)
      })
  }
}

module.exports = settingsController
