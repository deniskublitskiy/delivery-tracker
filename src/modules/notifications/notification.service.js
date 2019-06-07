const { IncomingWebhook } = require('@slack/webhook')
const format = require('date-fns/format')
const countBy = require('lodash/fp/countBy')
const map = require('lodash/fp/map')
const compose = require('lodash/fp/compose')
const toPairs = require('lodash/fp/toPairs')

class NotificationService {
    /**
     *
     * @param {String} slackWebhookUrl
     * @param logger
     * @param {String} trackingUrl
     */
    constructor({ slackWebhookUrl, logger, trackingUrl }) {
        this._trackingUrl = trackingUrl
        this._webhook = new IncomingWebhook(slackWebhookUrl)
        this._logger = logger
    }

    /**
     *
     * @param {Array} deliveries
     * @param {Map} statuses
     * @param {Array} completed
     * @returns {Promise<{response: *, message: string}>}
     */
    async notify({ deliveries, statuses, completed }) {
        const countsByStatuses = compose(
            map(([status, count]) => `${status} - ${count} packages`),
            toPairs,
            countBy('1'),
        )(Array.from(statuses))

        const formatCompleted = completed.map(({ cuid, item, trackingCode }) => `Cuid: ${cuid} - ${item.name} - ${this._trackingUrl.replace('{trackingCode}', trackingCode)}`)

        const message = [
            `:calendar: ${format(new Date(), 'DD MMMM YYYY')}\n`,
            `We have ${deliveries.length} :package: in shipping\n`,
            'I found out in https://www.17track.net that: ',
            ...countsByStatuses,
            '\n',
            `And also hve auto completed ${completed.length} :package: deliveries:\n`,
            ...formatCompleted,
        ].join('\n')

        const response = await this._webhook.send(message)

        return {
            message,
            response,
        }
    }
}

/**
 *
 * @type {{NotificationService: NotificationService}}
 */
module.exports = {
    NotificationService,
}
