const express = require('express')
const multer = require('multer')
const cors = require('cors')()

const config = require('../config')
const log = require('../log')

// REMOVE ME
// const federationController = require('../federation')
// const federationControllerUsers = require('../federation/users')
// const federationHelpers = require('../federation/helpers')

const collectionController = require('./controller/collection')
const setupController = require('./controller/setup')
const settingsController = require('./controller/settings')
const eventController = require('./controller/event')
const placeController = require('./controller/place')
const tagController = require('./controller/tag')
const exportController = require('./controller/export')
const userController = require('./controller/user')
const instanceController = require('./controller/instance')
const apUserController = require('./controller/ap_user')
const resourceController = require('./controller/resource')
const oauthController = require('./controller/oauth')
const announceController = require('./controller/announce')
const pageController = require('./controller/page')
const pluginController = require('./controller/plugins')
const geocodingController = require('./controller/geocoding')
const localeController = require('./controller/locale')
const {
  DDOSProtectionApiRateLimiter,
  SPAMProtectionApiRateLimiter
} = require('./limiter')
const helpers = require('../helpers')
const storage = require('./storage')
const icsController = require('./controller/ics')

module.exports = () => {
  const api = express.Router()
  api.use(express.urlencoded({ extended: false }))
  api.use(express.json())

  if (process.env.NODE_ENV !== 'test') {
    api.use(DDOSProtectionApiRateLimiter)
  }

  if (config.status !== 'READY') {
    api.post('/settings', settingsController.setRequest)
    api.post('/setup/db', setupController.setupDb)
    api.post('/setup/restart', setupController.restart)
    api.post('/settings/smtp', settingsController.testSMTP)
    api.get('/locale/:locale', localeController.get)
  } else {
    const { isAuth, isAdmin, isAdminOrEditor, isN8n } = require('./auth')
    const upload = multer({ storage })

    /**
         * Get current authenticated user
         * @category User
         * @name /api/user
         * @type GET
         * @example **Response**
         * ```json
        {
          "description" : null,
          "recover_code" : "",
          "id" : 1,
          "createdAt" : "2020-01-29T18:10:16.630Z",
          "updatedAt" : "2020-01-30T22:42:14.789Z",
          "is_active" : true,
          "settings" : "{}",
          "email" : "eventi@cisti.org",
          "is_admin" : true
        }
        ```
        */
    api.get('/ping', (_req, res) => res.sendStatus(200))
    api.get('/reachable', helpers.reachable)
    api.get('/user', isAuth, (req, res) => res.json(req.user))

    api.post(
      '/user/recover',
      SPAMProtectionApiRateLimiter,
      userController.forgotPassword
    )
    api.post('/user/check_recover_code', userController.checkRecoverCode)
    api.post(
      '/user/recover_password',
      SPAMProtectionApiRateLimiter,
      userController.updatePasswordWithRecoverCode
    )

    // register and add users
    api.post(
      '/user/register',
      SPAMProtectionApiRateLimiter,
      userController.register
    )
    api.post('/user', isAdmin, userController.create)

    // update user
    api.put('/user', isAdmin, userController.update)

    // delete user
    api.delete('/user/:id', isAdmin, userController.remove)
    api.delete('/user', isAuth, userController.remove)

    // get all users
    api.get('/users', isAdmin, userController.getAll)

    /**
     * Get events
     * @category Event
     * @name /api/events
     * @type GET
     * @param {integer} [start] - start timestamp (default: now)
     * @param {integer} [end] - end timestamp (optional)
     * @param {string}  [query] - search for this string in title, place or tags
     * @param {array} [tags] - List of tags
     * @param {array} [places] - List of places id
     * @param {boolean} [show_multidate] - Show also multidate events (default: true)
     * @param {boolean} [show_recurrent] - Show also recurrent events (default: as choosen in admin settings)
     * @param {boolean} [show_federated] - Show federated events too
     * @param {integer} [max] - Limit events
     * @param {integer} [page] - Pagination
     * @param {boolean} [older] - select <= start instead of >=
     * @param {boolean} [reverse] - reverse order
     * @example ***Example***
     * [https://demo.gancio.org/api/events](https://demo.gancio.org/api/events)
     * [usage example](https://framagit.org/les/gancio/-/blob/master/webcomponents/src/GancioEvents.svelte#L18-42)
     */

    api.get('/events', cors, eventController.select)
    api.get('/events/mine', isAuth, eventController.mine)

    /**
     * Add a new event
     * @category Event
     * @name /api/event
     * @type POST
     * @info `Content-Type` has to be `multipart/form-data` to support image upload
     * @param {string} title - event's title
     * @param {string} description - event's description (html accepted and sanitized)
     * @param {string} place_name - the name of the place
     * @param {string} [place_address] - the address of the place
     * @param {float} [place_latitude] - the latitude of the place
     * @param {float} [place_longitude] - the longitude of the place
     * @param {array} online_locations - List of online locations
     * @param {integer} start_datetime - start timestamp
     * @param {integer} multidate - is a multidate event?
     * @param {array} tags - List of tags
     * @param {object} [recurrent] - Recurrent event details
     * @param {string} [recurrent.frequency] - could be `1w` or `2w`
     * @param {array} [recurrent.days] - array of days
     * @param {image} [image] - Image
     * @param {string} [image_url] - Image URL
     * @todo Multiple images upload
     */

    // allow anyone to add an event (anon event has to be confirmed, flood protection)
    api.post(
      '/event',
      eventController.isAnonEventAllowed,
    //   SPAMProtectionApiRateLimiter,
      upload.single('image'),
      eventController.add
    )

    api.post('/ics-import', icsController.importICSFile)
    api.post('/ics-import/url', icsController.importICSURL)

    // api.get('/event/search', eventController.search)

    /**
     * Update an event
     * @category Event
     * @name /api/event
     * @type PUT
     * @info `Content-Type` has to be `multipart/form-data` to support image upload
     * @info Events could be modified by admins or by the event's owner
     * @param {number} id - event's id
     * @param {string} title - event's title
     * @param {string} description - event's description (html accepted and sanitized)
     * @param {string} place_name - the name of the place
     * @param {string} [place_address] - the address of the place
     * @param {float} [place_latitude] - the latitude of the place
     * @param {float} [place_longitude] - the longitude of the place
     * @param {array} online_locations - List of online locations
     * @param {integer} start_datetime - start timestamp
     * @param {integer} multidate - is a multidate event?
     * @param {array} tags - List of tags
     * @param {object} [recurrent] - Recurrent event details
     * @param {string} [recurrent.frequency] - could be `1w`, `2w`, `1y`
     * @param {array} [recurrent.days] - array of days
     * @param {image} [image] - Image
     * @param {string} [image_url] - Image URL
     */
    api.put('/event', isAuth, upload.single('image'), eventController.update)
    api.put('/event/assign_to_author', isAdmin, eventController.assignToAuthor)
    api.get(
      '/event/import',
      eventController.isAnonEventAllowed,
      helpers.importURL
    )

    // remove event
    api.delete('/event/:id', isAuth, eventController.remove)

    // get tags/places/collection
    api.get('/event/meta', eventController.searchMeta)

    // add event notification TODO
    // api.post('/event/notification', eventController.addNotification)
    // api.delete('/event/notification/:code', eventController.delNotification)

    api.post('/settings', isAdmin, settingsController.setRequest)
    api.get('/settings', isAdmin, settingsController.getAll)
    api.post(
      '/settings/logo',
      isAdmin,
      multer({ dest: config.upload_path }).single('logo'),
      settingsController.setLogo
    )
    api.post(
      '/settings/fallbackImage',
      isAdmin,
      multer({ dest: config.upload_path }).single('fallbackImage'),
      settingsController.setFallbackImage
    )
    api.post(
      '/settings/headerImage',
      isAdmin,
      multer({ dest: config.upload_path }).single('headerImage'),
      settingsController.setHeaderImage
    )
    api.post('/settings/test_smtp', isAdmin, settingsController.testSMTP)
    api.get('/settings/smtp', isAdmin, settingsController.getSMTPSettings)

    // ai feedabak
    api.post(
      '/event/feedback/:event_id',
      SPAMProtectionApiRateLimiter,
      isN8n,
      eventController.aiFeedback
    )

    // moderation
    api.post(
      '/event/messages/:event_id',
      SPAMProtectionApiRateLimiter,
      eventController.report
    )
    api.get('/event/messages/:event_id', isAuth, eventController.getMessages)

    // get unconfirmed events
    api.get(
      '/event/unconfirmed',
      isAdminOrEditor,
      eventController.getUnconfirmed
    )

    // [un]confirm event
    api.put('/event/confirm/:event_id', isAuth, eventController.confirm)
    api.put('/event/unconfirm/:event_id', isAuth, eventController.unconfirm)
    api.put(
      '/event/disable_author/:event_id',
      isAdminOrEditor,
      eventController.disableAuthor
    )

    // get event
    api.get('/event/detail/:event_slug.:format?', cors, eventController.get)

    // export events (rss/ics)
    api.get('/export/:format', cors, exportController.export)

    // - PLACES
    api.post('/places', placeController.add)

    api.get('/places', isAdmin, placeController.getAll)
    api.get('/place/:placeNameOrId', cors, placeController.getEvents)
    api.get('/place', cors, placeController.search)
    api.put('/place', isAdmin, placeController.updatePlace)

    // - GEOCODING
    api.get(
      '/placeOSM/Nominatim/:place_details',
      helpers.isGeocodingEnabled,
      geocodingController.nominatimRateLimit,
      geocodingController._nominatim
    )
    api.get(
      '/placeOSM/Photon/:place_details',
      helpers.isGeocodingEnabled,
      geocodingController.photonRateLimit,
      geocodingController._photon
    )

    // - TAGS
    api.get('/tags', tagController.getAll)
    api.get('/tag', cors, tagController.search)
    api.get('/tag/:tag', cors, tagController.getEvents)
    api.delete('/tag/:tag', isAdmin, tagController.remove)
    api.put('/tag', isAdmin, tagController.updateTag)

    // - FEDIVERSE INSTANCES, MODERATION, RESOURCES
    api.post(
      '/ap_actors/toggle_block',
      isAdminOrEditor,
      apUserController.toggleBlock
    )
    api.get('/ap_actors/trusted', apUserController.getTrusted)
    api.post('/ap_actors/add_trust', isAdmin, apUserController.addTrust)
    api.delete('/ap_actors/trust', isAdmin, apUserController.removeTrust)
    api.put('/ap_actors/follow', isAdminOrEditor, apUserController.toggleFollow)
    api.get('/ap_actors/stats', apUserController.stats)

    api.get('/instances', isAdminOrEditor, instanceController.getAll)
    api.post(
      '/instances/toggle_block',
      isAdminOrEditor,
      instanceController.toggleBlock
    )
    api.get(
      '/instances/:instance_domain',
      isAdminOrEditor,
      instanceController.get
    )
    api.put('/resources/:resource_id', isAdminOrEditor, resourceController.hide)
    api.delete(
      '/resources/:resource_id',
      isAdminOrEditor,
      resourceController.remove
    )
    api.get('/resources', isAdminOrEditor, resourceController.getAll)

    // - ADMIN ANNOUNCEMENTS
    api.get('/announcements', isAdmin, announceController.getAll)
    api.post('/announcements', isAdmin, announceController.add)
    api.put('/announcements/:announce_id', isAdmin, announceController.update)
    api.delete(
      '/announcements/:announce_id',
      isAdmin,
      announceController.remove
    )
    api.get('/announcements/:announce_id', announceController.get)

    // - ADMIN PAGES
    api.get('/pages', isAdmin, pageController.getAll)
    api.post('/pages', isAdmin, pageController.add)
    api.put('/pages/:page_id', isAdmin, pageController.update)
    api.get('/pages/:page_slug', pageController.get)
    api.delete('/pages/:page_id', isAdmin, pageController.remove)

    // - COLLECTIONS
    api.get('/collections/:name', cors, collectionController.getEvents)
    api.get('/collections', collectionController.getAll)
    api.post('/collections', isAdmin, collectionController.add)
    api.delete('/collection/:id', isAdmin, collectionController.remove)
    api.put('/collection/toggle/:id', isAdmin, collectionController.togglePin)
    api.put(
      '/collection/moveup/:sort_index',
      isAdmin,
      collectionController.moveUp
    )
    api.get('/filter/:collection_id', isAdmin, collectionController.getFilters)
    api.post('/filter', isAdmin, collectionController.addFilter)
    api.put('/filter/:id', isAdmin, collectionController.updateFilter)
    api.delete('/filter/:id', isAdmin, collectionController.removeFilter)

    // - PLUGINS
    api.get('/plugins', isAdmin, pluginController.getAll)
    api.post('/plugin/test/:plugin', isAdmin, pluginController.testPlugin)
    api.put('/plugin/:plugin', isAdmin, pluginController.togglePlugin)
    api.use('/plugin/:plugin', pluginController.routeAPI)

    // OAUTH
    api.get('/clients', isAuth, oauthController.getClients)
    api.get('/client/:client_id', isAuth, oauthController.getClient)
    api.post(
      '/client',
      SPAMProtectionApiRateLimiter,
      oauthController.createClient
    )

    // CUSTOM LOCALE
    api.get('/locale/:locale', localeController.get)
  }

  api.use((_req, res) => res.sendStatus(404))

  // Handle 500
  api.use((error, _req, res, _next) => {
    log.error('[API ERROR]', error)
    res.status(500).send('500: Internal Server Error')
  })

  return api
}
