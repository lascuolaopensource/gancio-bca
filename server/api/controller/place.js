const { Place, Event } = require('../models/models')

const eventController = require('./event')
const exportController = require('./export')
const Sequelize = require('sequelize')

const log = require('../../log')
const { Op, where, col, fn, cast } = require('sequelize')

module.exports = {

    async add(req, res) {
        const body = req.body
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
        return res.json({ place })
    },

    async getEvents(req, res) {
        // this api returned the events of a selected location by name (now it is by id)
        // but we maintain backward compatibility
        const name = req.params.placeNameOrId
        const id = Number(req.params.placeNameOrId)
        const place = await Place.findOne({ where: { ...(isNaN(id) ? { name } : { id }) } })

        if (!place) {
            log.warn(`Place ${name} not found`)
            return res.sendStatus(404)
        }

        const format = req.params.format || 'json'
        log.debug(`Events for place: ${place.name}`)
        const events = await eventController._select({ places: String(place.id), show_recurrent: true, show_multidate: true, show_federated: true })
        switch (format) {
            case 'rss':
                return exportController.feed(req, res, events,
                    `${res.locals.settings.title} - Place @${place.name}`,
                    `${res.locals.settings.baseurl}/feed/rss/place/${place.id}`)
            case 'ics':
                return exportController.ics(req, res, events)
            default:
                const pastEvents = await eventController._select({ places: String(place.id), show_recurrent: true, show_multidate: true, older: true, reverse: true, show_federated: true })
                return res.json({ events, pastEvents, place })
        }
    },


    async updatePlace(req, res) {
        const place = await Place.findByPk(req.body.id)
        await place.update(req.body)
        res.json(place)
    },

    async getAll(_req, res) {
        const places = await Place.findAll({
            order: [[cast(fn('COUNT', col('events.placeId')), 'INTEGER'), 'DESC']],
            include: [{ model: Event, where: { is_visible: true }, required: true, attributes: [] }],
            group: ['place.id'],
            raw: true
        })
        return res.json(places)
    },

    async search(req, res) {
        const search = req.query?.search?.toLocaleLowerCase() ?? ''
        const places = await Place.findAll({
            order: [[cast(fn('COUNT', col('events.placeId')), 'INTEGER'), 'DESC']],
            where: {
                [Op.or]: [
                    { name: where(fn('LOWER', col('name')), 'LIKE', '%' + search + '%') },
                    { address: where(fn('LOWER', col('address')), 'LIKE', '%' + search + '%') },
                ]
            },
            attributes: ['name', 'address', 'latitude', 'longitude', 'id'],
            include: [{ model: Event, where: { is_visible: true, ap_id: null }, required: true, attributes: [] }],
            group: ['place.id'],
            raw: true,
            limit: 10,
            subQuery: false
        })

        // TOFIX: don't know why limit does not work
        return res.json(places.slice(0, 10))
    }

}
