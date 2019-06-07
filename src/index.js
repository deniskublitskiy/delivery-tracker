const map = require('lodash/fp/map')
const filter = require('lodash/fp/filter')
const compose = require('lodash/fp/compose')


const { NotificationService } = require('./modules/notifications/notification.service')
const { DeliveryService } = require('./modules/delivery')
const { PackageTrackerService, PackageStatuses } = require('./modules/package-tracker')

const bootstrap = async ({ logger }) => {
    const deliveryService = new DeliveryService({
        apiUrl: process.env.API_URL,
        apiUserEmail: process.env.API_USER_EMAIL,
        apiUserPassword: process.env.API_USER_PASSWORD,
        logger,
    })
    const packageTrackerService = new PackageTrackerService({
        trackingUrl: process.env.TRACKING_URL,
        trackingStatusSelector: process.env.TRACKING_STATUS_SELECTOR,
    })

    const notificationService = new NotificationService({
        slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
        trackingUrl: process.env.TRACKING_URL,
        logger,
    })

    const { data: deliveries } = await deliveryService.getDeliveriesInTransit()
    logger.info({ deliveries }, `Found ${deliveries.length} deliveries in transit`)
    const trackingCodes = map('trackingCode')(deliveries)

    packageTrackerService.on(PackageTrackerService.events.TRACKED, ({ trackingCode, status }) => {
        logger.info({ trackingCode, status }, 'Tracked!')
    })

    const statuses = await packageTrackerService.getPackageStatuses({ trackingCodes })
    logger.info({ statuses: Array.from(statuses) }, 'Deliveries statuses')

    const cuids = compose(
        map('cuid'),
        filter(({ trackingCode }) => statuses.get(trackingCode) === PackageStatuses.DELIVERED),
    )(deliveries)

    const completed = await deliveryService.completeDeliveries({ cuids })
    logger.info({ completed }, 'Deliveries completed')

    const message = await notificationService.notify({ deliveries, completed, statuses })
    logger.info({ message }, 'Message sent to slack!')
}

module.exports = { bootstrap }
