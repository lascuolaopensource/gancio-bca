/* eslint-disable indent */
const crypto = require('crypto')
const path = require('path')
const config = require('../../config')
const fs = require('fs/promises')
const { Op } = require('sequelize')
const linkifyHtml = require('linkify-html')
const Sequelize = require('sequelize')
const { DateTime } = require('luxon')
const helpers = require('../../helpers')
const Col = helpers.col
const notifier = require('../../notifier')
const { htmlToText } = require('html-to-text')

const {
  Event,
  Resource,
  Tag,
  Place,
  Notification,
  APUser,
  EventNotification,
  Message,
  User
} = require('../models/models')

const exportController = require('./export')
const tagController = require('./tag')

const log = require('../../log')
const collectionController = require('./collection')

const eventController = {
  async _findOrCreatePlace(body) {
    if (body?.place_id) {
      const place = await Place.findByPk(body.place_id)
      if (!place) {
        throw new Error('Place not found')
      }
      return place
    }

    if (body?.place_ap_id) {
      const place = await Place.findOne({ where: { ap_id: body.place_ap_id } })
      if (place) {
        return place
      }
    }

    const place_name = body.place_name && body.place_name.trim()
    const place_address = body.place_address && body.place_address.trim()
    if (
      !place_name ||
      (!place_address && place_name?.toLocaleLowerCase() !== 'online')
    ) {
      throw new Error('place_id or place_name and place_address are required')
    }
    let place = await Place.findOne({
      where: Sequelize.where(
        Sequelize.fn('LOWER', Sequelize.col('name')),
        Sequelize.Op.eq,
        place_name.toLocaleLowerCase()
      )
    })
    if (!place) {
      place = await Place.create({
        name: place_name,
        address: place_address || '',
        ...(body.place_ap_id && { ap_id: body.place_ap_id }),
        ...(body.place_latitude &&
          body.place_longitude && {
            latitude: Number(body.place_latitude),
            longitude: Number(body.place_longitude)
          })
      }).catch((e) => {
        console.error(e)
        console.error(e?.errors)
      })
    }
    return place
  },

  async searchMeta(req, res) {
    const search = req.query.search.toLocaleLowerCase()
    const places = await Place.findAll({
      order: [[Sequelize.col('w'), 'DESC']],
      where: {
        [Op.or]: [
          Sequelize.where(
            Sequelize.fn('LOWER', Sequelize.col('name')),
            'LIKE',
            '%' + search + '%'
          ),
          Sequelize.where(
            Sequelize.fn('LOWER', Sequelize.col('address')),
            'LIKE',
            '%' + search + '%'
          )
        ]
      },
      attributes: [
        ['name', 'label'],
        'address',
        'latitude',
        'longitude',
        'id',
        [
          Sequelize.cast(
            Sequelize.fn('COUNT', Sequelize.col('events.placeId')),
            'INTEGER'
          ),
          'w'
        ]
      ],
      include: [
        {
          model: Event,
          where: { is_visible: true },
          required: true,
          attributes: []
        }
      ],
      group: ['place.id'],
      raw: true
    })

    const tags = await Tag.findAll({
      order: [[Sequelize.col('w'), 'DESC']],
      where: {
        tag: Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('tag')),
          'LIKE',
          '%' + search + '%'
        )
      },
      attributes: [
        ['tag', 'label'],
        [
          Sequelize.cast(
            Sequelize.fn('COUNT', Sequelize.col('tag.tag')),
            'INTEGER'
          ),
          'w'
        ]
      ],
      include: [
        {
          model: Event,
          where: { is_visible: true },
          attributes: [],
          through: { attributes: [] },
          required: true
        }
      ],
      group: ['tag.tag'],
      raw: true
    })

    const ret = places
      .map((p) => {
        p.type = 'place'
        return p
      })
      .concat(
        tags.map((t) => {
          t.type = 'tag'
          return t
        })
      )
      .sort((a, b) => b.w - a.w)
      .slice(0, 10)

    return res.json(ret)
  },

  _get(slug) {
    // retrocompatibility, old events URL does not use slug, use id as fallback
    const id = Number(slug) || -1
    return Event.findOne({
      where: {
        [Op.or]: {
          slug,
          id
        }
      }
    })
  },

  /**
   * /event/detail/:event_slug.:format?
   * get event details
   * this is also used to get next/prev event
   */
  async get(req, res) {
    const format = req.params.format || 'json'
    const isAdminOrEditor = req.user?.is_editor || req.user?.is_admin
    const slug = req.params.event_slug

    // retrocompatibility, old events URL does not use slug, use id as fallback
    const id = Number(slug) || -1
    let event

    try {
      event = await Event.findOne({
        where: {
          [Op.or]: {
            slug,
            id
          }
        },
        attributes: {
          exclude: ['createdAt', 'updatedAt', 'placeId', 'ap_id', 'apUserApId']
        },
        include: [
          {
            model: Tag,
            required: false,
            attributes: ['tag'],
            through: { attributes: [] }
          },
          {
            model: Place,
            attributes: ['name', 'address', 'latitude', 'longitude', 'id']
          },
          { model: User, required: false, attributes: ['is_active'] },
          {
            model: Resource,
            where: !isAdminOrEditor && { hidden: false },
            include: [
              {
                model: APUser,
                required: false,
                attributes: ['object', 'ap_id']
              }
            ],
            required: false,
            attributes: ['id', 'activitypub_id', 'data', 'hidden']
          },
          {
            model: Event,
            required: false,
            as: 'parent',
            attributes: ['id', 'recurrent', 'is_visible', 'start_datetime']
          }
        ],
        order: [[Resource, 'id', 'ASC']]
      })
    } catch (e) {
      log.error('[EVENT]', e)
      return res.sendStatus(400)
    }

    if (!event) {
      return res.sendStatus(404)
    }

    // admin, editors and event's owner gets the number of messages (could open moderation)
    let n_messages = 0
    if (isAdminOrEditor || event.userId !== req.user?.id) {
      n_messages = await Message.count({
        where: {
          eventId: event.id,
          ...(!isAdminOrEditor && { is_author_visible: true })
        }
      }).catch(() => 0)
    }

    // TODO: does next and prev make any sense in case of collection in home or home with federated events? should we remove this?
    // get prev and next event
    const next = await Event.findOne({
      attributes: ['id', 'slug'],
      where: {
        id: { [Op.not]: event.id },
        ...(!isAdminOrEditor && { is_visible: true }),
        ...(!res.locals.settings.collection_in_home && { ap_id: null }),
        recurrent: null,
        [Op.or]: [
          { start_datetime: { [Op.gt]: event.start_datetime } },
          {
            start_datetime: event.start_datetime,
            id: { [Op.gt]: event.id }
          }
        ]
      },
      order: [
        ['start_datetime', 'ASC'],
        ['id', 'ASC']
      ]
    })

    const prev = await Event.findOne({
      attributes: ['id', 'slug'],
      where: {
        ...(!isAdminOrEditor && { is_visible: true }),
        ...(!res.locals.settings.collection_in_home && { ap_id: null }),
        id: { [Op.not]: event.id },
        recurrent: null,
        [Op.or]: [
          { start_datetime: { [Op.lt]: event.start_datetime } },
          {
            start_datetime: event.start_datetime,
            id: { [Op.lt]: event.id }
          }
        ]
      },
      order: [
        ['start_datetime', 'DESC'],
        ['id', 'DESC']
      ]
    })

    if (event && (event.is_visible || isAdminOrEditor)) {
      event = event.get()
      event.isMine = event.userId === req.user?.id
      event.isAnon = event.userId === null || !event?.user?.is_active
      event.n_messages = n_messages
      event.original_url = event?.ap_object?.url || event?.ap_object?.id
      delete event.ap_object
      delete event.user
      // delete event.userId
      event.next = next && (next.slug || next.id)
      event.prev = prev && (prev.slug || prev.id)
      event.tags = event.tags.map((t) => t.tag)
      event.end_datetime = Number(event.end_datetime) || null
      event.plain_description = htmlToText(
        event.description,
        event.description.replace('\n', '').slice(0, 1000)
      )

      if (format === 'json') {
        res.json(event)
      } else if (format === 'ics') {
        // last arg is alarms/reminder, ref: https://github.com/adamgibbons/ics#attributes (alarms)
        exportController.ics(
          req,
          res,
          [event],
          [
            {
              action: 'display',
              description: event.title,
              trigger: { hours: 1, before: true }
            }
          ]
        )
      }
    } else {
      res.sendStatus(404)
    }
  },

  async disableAuthor(req, res) {
    const eventId = Number(req.params.event_id)
    log.warn('[EVENT] Disable author of the event %d', eventId)

    if (!res.locals.settings.enable_moderation) {
      log.warn(
        '[EVENT] Cannot disable author, moderation is not enabled (eventId: %d)',
        eventId
      )
      return res.sendStatus(403)
    }

    const event = await Event.findByPk(eventId, {
      include: [{ model: User, required: true }]
    })
    if (!event) {
      log.warn(
        '[EVENT] Disable author of not found event (eventId: %d)',
        eventId
      )
      return res.sendStatus(404)
    }

    if (event.user) {
      try {
        await event.user.update({ is_active: false })
      } catch (e) {
        log.warn('[EVENT] Error on disable author for eventId: %d', eventId)
      }
      res.sendStatus(200)
    } else {
      log.warn('[EVENT] Author not found for eventId: %d', eventId)
      res.sendStatus(404)
    }
  },

  // get all event moderation messages if we are admin || editor
  // get mine and to_author moderation messages if I'm the event author
  async getMessages(req, res) {
    if (!res.locals.settings.enable_moderation) {
      return res.sendStatus(403)
    }

    const eventId = Number(req.params.event_id)

    // in case we are admin or editor return all moderation messages related to this event
    if (req.user.is_admin || req.user.is_editor) {
      const messages = await Message.findAll({
        where: { eventId },
        order: [['createdAt', 'DESC']]
      })
      return res.json(messages)
    }

    const event = await Event.findByPk(eventId)
    if (!event) {
      return res.sendStatus(404)
    }

    if (event.userId === req.user.id) {
      const messages = await Message.findAll({
        where: { eventId, is_author_visible: true },
        order: [['createdAt', 'DESC']]
      })
      return res.json(messages)
    }

    return res.sendStatus(400)
  },

  async aiFeedback(req, res) {
    if (!res.locals.settings.enable_moderation) {
      return res.sendStatus(403)
    }

    const eventId = Number(req.params.event_id)

    const event = await Event.findByPk(eventId, {
      include: [{ model: User, required: false }],
      raw: true
    })
    if (!event) {
      log.warn(`[REPORT] Event does not exists: ${eventId}`)
      return res.sendStatus(404)
    }
    const body = req.body
    const author = 'AI'
    try {
      const message = await Message.create({
        eventId,
        message: body.message,
        is_author_visible: false,
        author
      })

      // notify admins
      notifier.notifyAdmins('report', { event, message: body.message, author })
      log.info('[EVENT] Report event to admins')

      // notify author
      if (event['user.email']) {
        const mail = require('../mail')
        mail.send(event['user.email'], 'report', {
          event,
          message: body.message,
          author
        })
      }
      return res.json(message)
    } catch (e) {
      log.warn(`[EVENT] ${e}`)
      return res.sendStatus(403)
    }
  },

  async report(req, res) {
    const mail = require('../mail')
    if (!res.locals.settings.enable_moderation) {
      return res.sendStatus(403)
    }

    const eventId = Number(req.params.event_id)
    const event = await Event.findByPk(eventId, {
      include: [{ model: User, required: false }],
      raw: true
    })
    if (!event) {
      log.warn(`[REPORT] Event does not exists: ${eventId}`)
      return res.sendStatus(404)
    }

    const body = req.body
    const isMine = req.user?.id === event.userId
    const isAdminOrEditor = req.user?.is_editor || req.user?.is_admin

    if (!isAdminOrEditor && !isMine && !res.locals.settings.enable_report) {
      log.warn(
        `[REPORT] Someone not allowed is trying to report an event -> "${event.title}" isMine: ${isMine} `
      )
      return res.sendStatus(403)
    }

    const author = isAdminOrEditor ? 'ADMIN' : isMine ? 'AUTHOR' : 'ANON'
    try {
      const message = await Message.create({
        eventId,
        message: body.message,
        is_author_visible: body.is_author_visible || isMine,
        author
      })

      // notify admins
      notifier.notifyAdmins('report', { event, message: body.message, author })
      log.info('[EVENT] Report event to admins')

      // notify author
      if (event['user.email'] && body.is_author_visible && !isMine) {
        mail.send(event['user.email'], 'report', {
          event,
          message: body.message,
          author
        })
      }

      return res.json(message)
    } catch (e) {
      log.warn(`[EVENT] ${e}`)
      return res.sendStatus(403)
    }
  },

  /** confirm an anonymous event
   * and send related notifications
   */
  async confirm(req, res) {
    const id = Number(req.params.event_id)
    const event = await Event.findByPk(id, { include: [Place, Tag] })
    if (!event) {
      log.warn(`Trying to confirm a unknown event, id: ${id}`)
      return res.sendStatus(404)
    }
    if (
      !req.user.is_editor &&
      !req.user.is_admin &&
      req.user.id !== event.userId
    ) {
      log.warn(`Someone not allowed is trying to confirm -> "${event.title} `)
      return res.sendStatus(403)
    }

    log.info(`Event "${event.title}" confirmed`)
    try {
      event.is_visible = true

      await event.save()

      res.sendStatus(200)

      if (event.recurrent) {
        eventController._createRecurrent()
      } else {
        // send notification
        notifier.notifyEvent('Create', event.id)
      }
    } catch (e) {
      log.error('[EVENT]', e)
      res.sendStatus(404)
    }
  },

  async unconfirm(req, res) {
    const id = Number(req.params.event_id)
    const event = await Event.findByPk(id)
    if (!event) {
      return req.sendStatus(404)
    }
    if (
      !req.user.is_editor &&
      !req.user.is_admin &&
      req.user.id !== event.userId
    ) {
      log.warn(`Someone not allowed is trying to unconfirm -> "${event.title} `)
      return res.sendStatus(403)
    }

    try {
      await event.update({ is_visible: false })
      res.sendStatus(200)
    } catch (e) {
      log.info(e)
      res.sendStatus(404)
    }
  },

  /** get all unconfirmed events */
  async getUnconfirmed(_req, res) {
    try {
      const events = await Event.findAll({
        where: {
          parentId: null,
          is_visible: false
        },
        attributes: {
          include: [
            [
              Sequelize.cast(
                Sequelize.fn('COUNT', Sequelize.col('messages.id')),
                'INTEGER'
              ),
              'n_messages'
            ]
          ]
        },
        order: [['start_datetime', 'ASC']],
        include: [Place, { model: Message, required: false, attributes: [] }],
        group: ['event.id', 'place.id']
      })
      const now = DateTime.local().toUnixInteger()
      res.json({
        events: events.filter((e) => e.start_datetime >= now),
        oldEvents: events.filter((e) => e.start_datetime < now)
      })
    } catch (e) {
      log.info(String(e))
      res.sendStatus(400)
    }
  },

  async addNotification(req, res) {
    try {
      const notification = {
        filters: { is_visible: true },
        email: req.body.email,
        type: 'mail',
        remove_code: crypto.randomBytes(16).toString('hex')
      }
      await Notification.create(notification)
      res.sendStatus(200)
    } catch (e) {
      res.sendStatus(404)
    }
  },

  async delNotification(req, res) {
    const remove_code = req.params.code
    try {
      const notification = await Notification.findOne({
        where: { remove_code }
      })
      await notification.destroy()
    } catch (e) {
      return res.sendStatus(404)
    }
    res.sendStatus(200)
  },

  isAnonEventAllowed(req, res, next) {
    if (!res.locals.settings.allow_anon_event && !req.user) {
      return res.sendStatus(403)
    }
    next()
  },

  async assignToAuthor(req, res) {
    const body = req.body
    const event = await Event.findByPk(body.id)
    if (!event) {
      log.debug('[UPDATE] Event not found: %s', body?.id)
      return res.sendStatus(404)
    }

    try {
      await event.update({ userId: body.user_id })
      return res.sendStatus(200)
    } catch (e) {
      log.warn(e)
      return res.status(400).send(e)
    }
  },

  async add(req, res) {
    // req.err comes from multer streaming error
    if (req.err) {
      log.warn(req.err)
      return res.status(400).json(req.err.toString())
    }

    try {
      const body = req.body
      const recurrent = body.recurrent ? JSON.parse(body.recurrent) : null

      const required_fields = ['title', 'start_datetime']
      const missing_field = required_fields.find(
        (required_field) => !body[required_field]
      )
      if (missing_field) {
        log.warn(`${missing_field} required`)
        return res.status(400).send(`${missing_field} required`)
      }

      const is_anonymous = !req.user
      const now = DateTime.local().toUnixInteger()
      const start_datetime = Number(body.start_datetime)

      // validate start_datetime and end_datetime
      if (body.end_datetime) {
        if (body.start_datetime > body.end_datetime) {
          log.debug('[EVENT] start_datetime is greated than end_datetime')
          return res
            .status(400)
            .send('start datetime is greater than end datetime')
        }

        if (Number(body.end_datetime) > 1000 * 24 * 60 * 60 * 365) {
          log.debug('[EVENT] end_datetime is too much in the future')
          return res.status(400).send('are you sure?')
        }
      }

      if (!start_datetime) {
        log.debug('[EVENT] start_datetime has to be a number')
        return res.status(400).send('Wrong format for start datetime')
      }

      if (body.end_datetime && !Number(body.end_datetime)) {
        log.debug('[EVENT] start_datetime has to be a number')
        return res.status(400).send('Wrong format for end datetime')
      }

      if (start_datetime > 1000 * 24 * 60 * 60 * 365) {
        log.debug('[EVENT] start_datetime is too much in the future')
        return res.status(400).send('are you sure?')
      }

      if (is_anonymous && start_datetime < now) {
        log.debug('[EVENT] Anonymous users cannot create past events')
        return res.status(400).send('Anonymous user cannot create past events')
      }

      // find or create the place
      let place
      try {
        place = await eventController._findOrCreatePlace(body)
        if (!place) {
          return res.status(400).send('Place not found')
        }
      } catch (e) {
        log.error(e.message)
        return res.status(400).send(e.message)
      }

      const eventDetails = {
        title: body.title.trim(),
        // sanitize and linkify html
        description: helpers.sanitizeHTML(
          linkifyHtml(body.description || '', {
            target: '_blank',
            render: { email: (ctx) => ctx.content }
          })
        ),
        multidate: body.multidate,
        start_datetime,
        end_datetime: Number(body.end_datetime) || null,
        online_locations: body.online_locations,
        recurrent,
        // publish this event only if authenticated
        is_visible: !is_anonymous,
        metadata: body.metadata || {}
      }

      if (req.file || body.image_url) {
        if (!req.file && body.image_url) {
          req.file = await helpers.getImageFromURL(body.image_url)
        }

        let focalpoint = body.image_focalpoint
          ? body.image_focalpoint.split(',')
          : ['0', '0']
        focalpoint = [
          parseFloat(parseFloat(focalpoint[0]).toFixed(2)),
          parseFloat(parseFloat(focalpoint[1]).toFixed(2))
        ]
        eventDetails.media = [
          {
            url: req.file.filename,
            height: req.file.height,
            width: req.file.width,
            name: body.image_name || body.title || '',
            size: req.file.size || 0,
            focalpoint
          }
        ]
      } else {
        eventDetails.media = []
      }

      let event = await Event.create(eventDetails)

      await event.setPlace(place)

      // create/assign tags
      let tags = []
      if (body.tags) {
        if (!Array.isArray(body.tags)) {
          return res.status(400).send('tags field must be an array')
        }
        tags = await tagController._findOrCreate(body.tags)
        await event.setTags(tags)
      }

      // associate user to event and reverse
      if (req.user) {
        await req.user.addEvent(event)
        await event.setUser(req.user)
      }

      event = event.get()
      event.tags = tags.map((t) => t.tag)
      event.place = place
      // return created event to the client
      res.json(event)

      if (process.env.N8N_WEBHOOK_URL) {
        await fetch(process.env.N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ event })
        })
      }

      // create recurrent instances of event if needed
      // without waiting for the task manager
      if (event.recurrent && event.is_visible) {
        eventController._createRecurrent()
      } else {
        // send notifications
        notifier.notifyEvent('Create', event.id)
      }
    } catch (e) {
      log.error('[EVENT ADD]', e)
      res.status(400).send('Error: ' + (e?.message ?? e))
    }
  },

  async update(req, res) {
    if (res.err) {
      log.warn(req.err)
      return res.status(400).json(req.err.toString())
    }

    try {
      const body = req.body
      const event = await Event.findByPk(body.id)
      if (!event) {
        log.debug('[UPDATE] Event not found: %s', body?.id)
        return res.sendStatus(404)
      }

      if (
        !req.user.is_editor &&
        !req.user.is_admin &&
        event.userId !== req.user.id
      ) {
        log.debug(
          '[UPDATE] the user is neither an admin nor the owner of the event'
        )
        return res.sendStatus(403)
      }

      const start_datetime = Number(body.start_datetime || event.start_datetime)
      const end_datetime =
        body.end_datetime === ''
          ? null
          : Number(body.end_datetime || event.end_datetime) || null

      // validate start_datetime and end_datetime
      if (end_datetime) {
        if (start_datetime > end_datetime) {
          log.debug('[UPDATE] start_datetime is greated than end_datetime')
          return res
            .status(400)
            .send('start datetime is greater than end datetime')
        }

        if (end_datetime > 1000 * 24 * 60 * 60 * 365) {
          log.debug('[UPDATE] end_datetime is too much in the future')
          return res.status(400).send('end_datetime is too much in the future')
        }
      }

      if (!start_datetime) {
        log.debug('[UPDATE] start_datetime has to be a number')
        return res.status(400).send('Wrong format for start datetime')
      }

      if (start_datetime > 1000 * 24 * 60 * 60 * 365) {
        log.debug('[UPDATE] start_datetime is too much in the future')
        return res.status(400).send('start_datetime is too much in the future')
      }

      const recurrent = body.recurrent ? JSON.parse(body.recurrent) : null
      const eventDetails = {
        title: body.title || event.title,
        // sanitize and linkify html
        description:
          helpers.sanitizeHTML(
            linkifyHtml(body.description || '', {
              target: '_blank',
              render: { email: (ctx) => ctx.content }
            })
          ) || event.description,
        multidate: body.multidate,
        start_datetime,
        end_datetime,
        online_locations: body.online_locations,
        recurrent,
        metadata: body.metadata
      }

      // remove old media in case a new one is uploaded
      if (
        !event.recurrent &&
        !event.parentId &&
        (req.file || /^https?:\/\//.test(body.image_url)) &&
        event.media &&
        event.media.length
      ) {
        try {
          const old_path = path.resolve(config.upload_path, event.media[0].url)
          const old_thumb_path = path.resolve(
            config.upload_path,
            'thumb',
            event.media[0].url
          )
          await fs.unlink(old_path)
          await fs.unlink(old_thumb_path)
        } catch (e) {
          log.info(e.toString())
        }
      }

      // modify associated media only if a new file is uploaded or remote image_url is used
      if (req.file || (body.image_url && /^https?:\/\//.test(body.image_url))) {
        if (!req.file && body.image_url) {
          req.file = await helpers.getImageFromURL(body.image_url)
        }

        let focalpoint = body.image_focalpoint
          ? body.image_focalpoint.split(',')
          : ['0', '0']
        focalpoint = [
          parseFloat(parseFloat(focalpoint[0]).toFixed(2)),
          parseFloat(parseFloat(focalpoint[1]).toFixed(2))
        ]
        eventDetails.media = [
          {
            url: req.file.filename,
            height: req.file.height,
            width: req.file.width,
            name: body.image_name || body.title || '',
            size: req.file.size || 0,
            focalpoint
          }
        ]
      } else if (!body.image) {
        eventDetails.media = []
      } else if (body.image_focalpoint && event.media.length) {
        let focalpoint = body.image_focalpoint
          ? body.image_focalpoint.split(',')
          : ['0', '0']
        focalpoint = [
          parseFloat(parseFloat(focalpoint[0]).toFixed(2)),
          parseFloat(parseFloat(focalpoint[1]).toFixed(2))
        ]
        eventDetails.media = [{ ...event.media[0], focalpoint }] // [0].focalpoint = focalpoint
      }

      if (
        body.image_name &&
        event.media.length &&
        event.media[0].name !== body.image_name
      ) {
        eventDetails.media[0].name = body.image_name || body.title || ''
      }

      await event.update(eventDetails)

      // find or create the place
      let place
      try {
        place = await eventController._findOrCreatePlace(body)
        if (!place) {
          log.info('[UPDATE] Place not found')
          return res.status(400).send('Place not found')
        }
      } catch (e) {
        log.info('[UPDATE] %s', e?.message ?? String(e))
        return res.status(400).send(e.message)
      }
      await event.setPlace(place)

      // create/assign tags
      let tags = []
      if (body.tags) {
        if (!Array.isArray(body.tags)) {
          return res.status(400).send('tags field must be an array')
        }
        tags = await tagController._findOrCreate(body.tags)
      }
      await event.setTags(tags)

      let newEvent = await Event.findByPk(event.id, { include: [Tag, Place] })
      newEvent = newEvent.get()
      newEvent.tags = tags.map((t) => t.tag)
      newEvent.place = place
      res.json(newEvent)

      // create recurrent instances of event if needed
      // without waiting for the task manager
      if (event.recurrent && event.is_visible) {
        eventController._createRecurrent()
      } else if (!event.ap_id) {
        notifier.notifyEvent('Update', event.id)
      }
    } catch (e) {
      log.error('[EVENT UPDATE]', e)
      res.sendStatus(400)
    }
  },

  async remove(req, res) {
    const event = await Event.findByPk(req.params.id)
    // check if event is mine (or user is admin)
    if (
      event &&
      (req.user.is_editor || req.user.is_admin || req.user.id === event.userId)
    ) {
      if (
        event.media &&
        event.media.length &&
        !event.recurrent &&
        !event.parentId
      ) {
        try {
          const old_path = path.join(config.upload_path, event.media[0].url)
          const old_thumb_path = path.join(
            config.upload_path,
            'thumb',
            event.media[0].url
          )
          await fs.unlink(old_thumb_path)
          await fs.unlink(old_path)
        } catch (e) {
          log.info(e.toString())
        }
      }

      // unassociate child events
      if (event.recurrent) {
        await Event.update(
          { parentId: null },
          { where: { parentId: event.id } }
        )
      }
      log.debug('[EVENT REMOVED] ' + event.title)
      try {
        // remove related resources
        await Resource.destroy({ where: { eventId: event.id } })
        await EventNotification.destroy({ where: { eventId: event.id } })
      } catch (e) {
        console.error(e)
      }

      res.sendStatus(200)

      // notify local events only
      if (!event.ap_id) {
        notifier.notifyEvent('Delete', event.id).finally(() => event.destroy())
      } else {
        event.destroy()
      }
    } else {
      res.sendStatus(403)
    }
  },

  /**
   * Method to search for events with pagination and filtering
   * @returns
   */
  async _select({
    start = DateTime.local().toUnixInteger(),
    end,
    query,
    tags,
    places,
    show_recurrent,
    show_multidate,
    limit,
    page,
    older,
    reverse,
    user_id,
    show_federated = false,
    include_unconfirmed = false,
    include_parent = false,
    include_description = false
  }) {
    const where = {
      [Op.or]: {
        start_datetime: { [older ? Op.lte : Op.gte]: start },
        end_datetime: { [older ? Op.lte : Op.gte]: start }
      }
    }

    // do not include federated events in homepage
    if (!query && !show_federated) {
      where.apUserApId = null
    }

    if (user_id) {
      where.userId = user_id
    }

    if (include_parent !== true) {
      // do not include _parent_ recurrent event
      where.recurrent = null
    }

    if (include_unconfirmed !== true) {
      // confirmed event only
      where.is_visible = true
    }

    // include recurrent events?
    if (!show_recurrent) {
      where.parentId = null
    }

    if (!show_multidate) {
      where.multidate = { [Op.not]: true }
    }

    if (end) {
      where.start_datetime = { [older ? Op.gte : Op.lte]: end }
    }

    // normalize tags
    if (tags) {
      tags = tags.split(',').map((t) => t.trim())
    }

    const replacements = []
    if (tags && places) {
      where[Op.and] = [
        { placeId: places ? places.split(',') : [] },
        Sequelize.fn(
          'EXISTS',
          Sequelize.literal(
            `SELECT 1 FROM event_tags WHERE ${Col('event_tags.eventId')}=${Col(
              'event.id'
            )} AND ${Col('tagTag')} in (?)`
          )
        )
      ]
      replacements.push(tags)
    } else if (tags) {
      where[Op.and] = Sequelize.fn(
        'EXISTS',
        Sequelize.literal(
          `SELECT 1 FROM event_tags WHERE ${Col('event_tags.eventId')}=${Col(
            'event.id'
          )} AND ${Col('tagTag')} in (?)`
        )
      )
      replacements.push(tags)
    } else if (places) {
      where.placeId = places.split(',')
    }

    if (query) {
      replacements.push(query)
      where[Op.or] = [
        {
          title: Sequelize.where(
            Sequelize.fn('LOWER', Sequelize.col('title')),
            'LIKE',
            '%' + query + '%'
          )
        },
        Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('name')),
          'LIKE',
          '%' + query + '%'
        ),
        Sequelize.fn(
          'EXISTS',
          Sequelize.literal(
            `SELECT 1 FROM event_tags WHERE ${Col('event_tags.eventId')}=${Col(
              'event.id'
            )} AND LOWER(${Col('tagTag')}) = LOWER(?)`
          )
        )
      ]
    }

    let pagination = {}
    if (limit) {
      pagination = {
        limit,
        offset: limit * page
      }
    }

    const events = await Event.findAll({
      where,
      attributes: {
        exclude: [
          'likes',
          'boost',
          'createdAt',
          'updatedAt',
          'resources',
          'placeId',
          'image_path',
          'ap_object',
          'ap_id',
          ...(!include_parent ? ['recurrent'] : []),
          ...(!include_unconfirmed ? ['is_visible'] : []),
          ...(!include_description ? ['description'] : [])
        ]
      },
      order: [['start_datetime', reverse ? 'DESC' : 'ASC']],
      include: [
        {
          model: Tag,
          // order: [Sequelize.literal('(SELECT COUNT(tagTag) FROM event_tags WHERE tagTag = tag) DESC')],
          attributes: ['tag'],
          through: { attributes: [] }
        },
        {
          model: Place,
          required: true,
          attributes: ['id', 'name', 'address', 'latitude', 'longitude']
        },
        { model: APUser, required: false, attributes: ['object'] }
      ],
      ...pagination,
      replacements
    }).catch((e) => {
      log.error('[EVENT]' + String(e))
      return []
    })

    return events.map((e) => {
      e = e.get()
      e.tags = e.tags ? e.tags.map((t) => t && t.tag) : []
      e.end_datetime = Number(e.end_datetime) || null
      if (!e.multidate) {
        delete e.multidate
      }
      if (!e.image_path) {
        delete e.image_path
      }
      if (!e.recurrent) {
        delete e.recurrent
      }
      if (!e.parentId) {
        delete e.parentId
      }
      if (e.ap_user) {
        e.ap_user = {
          image: e.ap_user?.object?.icon?.url ?? `${e.ap_user?.url}/favicon.ico`
        }
      } else {
        delete e.ap_user
        delete e.apUserApId
      }
      return e
    })
  },

  async mine(req, res) {
    const start = DateTime.local().toUnixInteger()

    const where = {
      userId: req.user.id,
      apUserApId: null,
      [Op.or]: {
        [Op.or]: {
          start_datetime: { [Op.gte]: start },
          end_datetime: { [Op.gte]: start }
        },
        recurrent: { [Op.not]: null }
      }
    }

    const events = await Event.findAll({
      where,
      attributes: {
        exclude: [
          'likes',
          'boost',

          'createdAt',
          'resources',
          'placeId',
          'image_path',
          'description'
        ]
      },
      order: [['start_datetime', 'DESC']],
      include: [
        {
          model: Tag,
          attributes: ['tag'],
          through: { attributes: [] }
        },
        {
          model: Place,
          required: true,
          attributes: ['id', 'name', 'address', 'latitude', 'longitude']
        }
      ]
    }).catch((e) => {
      log.error('[EVENT]' + String(e))
      return []
    })

    return res.json(
      events.map((e) => {
        e = e.get()
        e.tags = e.tags ? e.tags.map((t) => t && t.tag) : []
        e.end_datetime = Number(e.end_datetime) || null
        return e
      })
    )
  },

  /**
   * Select events based on params
   */
  async select(req, res) {
    const settings = res.locals.settings
    const start = req.query.start || DateTime.local().toUnixInteger()
    const end = req.query.end
    const query = req.query.query
    const tags = req.query.tags
    const places = req.query.places
    const limit = Number(req.query.max) || 0
    const page = Number(req.query.page) || 0
    const older = req.query.older || false

    const show_federated = helpers.queryParamToBool(
      req.query.show_federated,
      settings.federated_events_in_home
    )
    const show_multidate =
      settings.allow_multidate_event &&
      helpers.queryParamToBool(req.query.show_multidate, true)
    const show_recurrent =
      settings.allow_recurrent_event &&
      helpers.queryParamToBool(
        req.query.show_recurrent,
        settings.recurrent_event_visible
      )

    let events = []

    if (settings.collection_in_home && !(tags || places || query)) {
      events = await collectionController._getEvents({
        name: settings.collection_in_home,
        start,
        end,
        show_recurrent,
        limit,
        page,
        older
      })
    } else {
      events = await eventController._select({
        start,
        end,
        query,
        places,
        tags,
        show_recurrent,
        show_multidate,
        limit,
        page,
        older,
        show_federated
      })
    }

    return res.json(events)
  },

  /**
   * Ensure we have the next occurrence of a recurrent event
   */
  async _createRecurrentOccurrence(
    e,
    startAt = DateTime.local(),
    firstOccurrence = true
  ) {
    log.debug(`Create recurrent event [${e.id}] ${e.title}"`)

    // prepare the new event occurrence copying the parent's properties
    const event = {
      parentId: e.id,
      title: e.title,
      description: e.description,
      media: e.media,
      is_visible: true,
      userId: e.userId,
      placeId: e.placeId,
      ...(e.online_locations && { online_locations: e.online_locations })
    }

    const recurrentDetails = e.recurrent
    const parentStartDatetime = DateTime.fromSeconds(e.start_datetime)

    // cursor is when start to count
    // in case parent is in past, start to calculate from now
    let cursor = parentStartDatetime > startAt ? parentStartDatetime : startAt
    startAt = cursor

    const duration = e.end_datetime ? e.end_datetime - e.start_datetime : 0
    const frequency = recurrentDetails.frequency
    const type = recurrentDetails.type
    if (!frequency) {
      log.warn(
        `Recurrent event ${e.id} - ${e.title} does not have a frequency specified`
      )
      return
    }

    cursor = cursor.set({
      hour: parentStartDatetime.hour,
      minute: parentStartDatetime.minute,
      second: 0
    })

    // each week or 2
    if (frequency[1] === 'w') {
      cursor = cursor.set({ weekday: parentStartDatetime.weekday }) // day(parentStartDatetime.day())
      if (cursor < startAt) {
        cursor = cursor.plus({ days: 7 * Number(frequency[0]) })
      }
    } else if (frequency === '1m' || frequency === '1y') {
      const interval = frequency === '1y' ? { years: 1 } : { months: 1 }
      // day n.X each interval
      if (type === 'ordinal') {
        cursor = cursor.set({ day: parentStartDatetime.day })

        if (cursor < startAt) {
          cursor = cursor.plus(interval)
        }
      } else {
        // weekday
        // get recurrent freq details
        cursor = helpers.getWeekdayN(cursor, type, parentStartDatetime.weekday)
        if (cursor < startAt) {
          cursor = cursor.plus(interval)
          cursor = helpers.getWeekdayN(
            cursor,
            type,
            parentStartDatetime.weekday
          )
        }
      }
    }
    log.debug(cursor)
    event.start_datetime = cursor.toUnixInteger()
    event.end_datetime = e.end_datetime ? event.start_datetime + duration : null
    try {
      const newEvent = await Event.create(event)
      if (e.tags) {
        newEvent.addTags(e.tags)
      }

      // send notifications
      await notifier.notifyEvent('Create', newEvent.id)

      return newEvent
    } catch (e) {
      console.error(event)
      log.error('[RECURRENT EVENT]', e)
    }
  },

  /**
   * Create instances of recurrent events
   */
  async _createRecurrent(start_datetime = DateTime.local().toUnixInteger()) {
    // select recurrent events and its childs
    const events = await Event.findAll({
      where: { is_visible: true, recurrent: { [Op.ne]: null } },
      include: [
        { model: Tag, required: false },
        {
          model: Event,
          as: 'child',
          required: false,
          where: { start_datetime: { [Op.gte]: start_datetime } }
        }
      ],
      order: [['child', 'start_datetime', 'DESC']]
    })

    // create a new occurrence for each recurring events but the one's that has an already visible occurrence coming
    const creations = events.map((e) => {
      if (e.child.length) {
        if (e.child.find((c) => c.is_visible)) {
          return undefined
        }
        return eventController._createRecurrentOccurrence(
          e,
          DateTime.fromSeconds(e.child[0].start_datetime + 1),
          false
        )
      }
      return eventController._createRecurrentOccurrence(
        e,
        DateTime.local(),
        true
      )
    })

    return Promise.all(creations)
  }
}

module.exports = eventController
