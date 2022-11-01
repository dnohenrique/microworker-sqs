const config = require('../../settings/config')
const apiNotificationUrl = config.variables.apiNotificationUrl
const axios = require('axios')
const appHelper = require('../../helpers/appHelper')
const moment = require('moment')
const fs = require('fs')
const util = require('util')
const readFile = util.promisify(fs.readFile)

async function sendVoucher(
    resultBooking,
    price,
    cancelationPolicies,
    collaboratorModel,
    payment = null,
    listLogs
) {
    let emailSent = false
    if (appHelper.validateEmail(collaboratorModel.emailPessoal)) {
        const paxs = await getPaxsHtml(
            resultBooking.passengers,
            resultBooking.quantitySeat
        )
        const priceHtml = await getPriceHtml(
            price,
            payment,
            resultBooking.dataPrevisaoEfetivacao
        )
        const strecthes = await getStrecthesHtml(resultBooking.air.stretches)
        const policeDescription = cancelationPolicies.policeDescription
        const viewHangbagLong = resultBooking.handbagLong
            ? `<img data-file-id="1538167" height="33" 
            src="https://mcusercontent.com/739cb2ac5543946b75adde289/images/6ddd7827-f263-461a-89d6-e0fee43310ed.png" 
            style="border: 0pxwidth:22pxheight:33pxmargin:0px" width="22" />`
            : ''
        const createdDt = moment(resultBooking.created, 'YYYY-MM-DD')
        const vars = {
            orderID: resultBooking.orderId,
            createReservation: createdDt.format('DD/MM/YYYY'),
            price: priceHtml,
            paxs,
            strecthes,
            policeDescription,
            viewHandbag: viewHangbagLong,
        }
        const request = {
            campanhaId: config.variables.campanhaAereoIdVoucher,
            to: [
                {
                    nome: collaboratorModel.nome,
                    email: collaboratorModel.emailPessoal,
                    vars,
                },
            ],
        }

        listLogs.push('Portal - sendNotification: ' + JSON.stringify(request))

        // Enviar voucher para o email do colaborador
        await axios
            .post(`${apiNotificationUrl}`, request)
            .then(() => {
                emailSent = true
            })
            .catch((error) => {
                listLogs.push(`(Error: Grave) Enviar Post de Notificacao:`)
                listLogs.push(error.response.data)
            })
    }
    return emailSent
}

const getStrecthesHtml = async (stretches) => {
    const fileStretchesBody = await readFile(
        `${__dirname}/templateNotification/stretch.html`
    )
    const stretchesHtml = fileStretchesBody.toString('utf8')
    const listHtml = []
    const fileFlightsBody = await readFile(
        `${__dirname}/templateNotification/flight.html`
    )

    const flightHtml = fileFlightsBody.toString('utf8')

    const fileFlightsAwaitBody = await readFile(
        `${__dirname}/templateNotification/flightAwait.html`
    )

    const flightsAwaitHtml = fileFlightsAwaitBody.toString('utf8')

    stretches.map(async (stretch) => {
        let htmlResult = stretchesHtml
        htmlResult = htmlResult.replace('@description@', stretch.description)
        htmlResult = htmlResult.replace(
            '@iataEmbarkation@',
            stretch.iataEmbarkation
        )
        htmlResult = htmlResult.replace(
            '@iataDesbarkation@',
            stretch.iataDesbarkation
        )
        htmlResult = htmlResult.replace(
            '@cityEmbarkation@',
            appHelper.titlecase(stretch.cityEmbarkation)
        )
        htmlResult = htmlResult.replace(
            '@cityDesbarkation@',
            appHelper.titlecase(stretch.cityDesbarkation)
        )
        htmlResult = htmlResult.replace('@locator@', stretch.locator)
        const flightsHtml = getFlightsHtml(
            stretch.destination.detail.flights,
            flightHtml,
            flightsAwaitHtml
        )
        htmlResult = htmlResult.replace('@flights@', flightsHtml)

        listHtml.push(htmlResult)
    })

    return listHtml.join(' ')
}

const getFlightsHtml = (flights, flightHtml, htmlFlightAwait) => {
    const listHtml = []
    flights.map(async (flight) => {
        let htmlResult = flightHtml
        htmlResult = htmlResult.replace('@logo@', flight.logo)
        htmlResult = htmlResult.replace(/@company@/gi, flight.company)
        htmlResult = htmlResult.replace(
            '@companyDescription@',
            flight.companyDescription
        )
        htmlResult = htmlResult.replace(
            '@iataEmbarkation@',
            flight.iataEmbarkation
        )
        htmlResult = htmlResult.replace(
            '@cityEmbarkation@',
            flight.cityEmbarkation
        )
        htmlResult = htmlResult.replace(
            '@horaryEmbarkation@',
            appHelper.formatHorary(flight.horaryEmbarkation)
        )
        htmlResult = htmlResult.replace(
            '@horaryEmbarkationCustom@',
            `(${appHelper.formatHoraryCustom(flight.horaryEmbarkation)})`
        )

        htmlResult = htmlResult.replace(
            '@iataDesbarkation@',
            flight.iataDesbarkation
        )
        htmlResult = htmlResult.replace(
            '@horaryDesbarkation@',
            appHelper.formatHorary(flight.horaryDesbarkation)
        )
        htmlResult = htmlResult.replace(
            '@horaryDesbarkationCustom@',
            `(${appHelper.formatHoraryCustom(flight.horaryDesbarkation)})`
        )
        htmlResult = htmlResult.replace(
            '@cityDesbarkation@',
            flight.cityDesbarkation
        )
        htmlResult = htmlResult.replace('@numberFlight@', flight.numberFlight)
        htmlResult = htmlResult.replace(
            '@airplane@',
            flight.airplane || 'Pendente'
        )
        htmlResult = htmlResult.replace('@class@', flight.class)
        htmlResult = htmlResult.replace(
            '@duration@',
            appHelper.translateDuration(flight.duration)
        )

        let flightsAwaitHtml = ''
        if (flight.awaitTime && flight.awaitTime !== '0000') {
            flightsAwaitHtml = getAwaitFlightsHtml(htmlFlightAwait, flight)
        }
        htmlResult = htmlResult.replace('@flightAwait@', flightsAwaitHtml)
        listHtml.push(htmlResult)
    })

    return listHtml.join(' ')
}

const getAwaitFlightsHtml = (html, flight) => {
    let htmlResult = html
    htmlResult = htmlResult.replace(
        '@awaitTime@',
        appHelper.translateDuration(flight.awaitTime)
    )
    htmlResult = htmlResult.replace(
        '@cityEmbarkation@',
        appHelper.getCityAwait(flight.cityEmbarkation)
    )
    let exchangePlane = ''
    if (flight.exchangePlane) {
        exchangePlane = flight.exchangePlane
    }
    htmlResult = htmlResult.replace(
        '@exchangePlane@',
        exchangePlane ? '(Troca de avião)' : ''
    )

    return htmlResult
}

const getPaxsHtml = async (paxes, quantitySeat) => {
    const filePaxsBody = await readFile(
        __dirname + '/templateNotification/paxs.html'
    )
    const paxsHtml = filePaxsBody.toString('utf8')
    let htmlResult = paxsHtml
    const listHtml = []
    const filePaxBody = await readFile(
        __dirname + '/templateNotification/pax.html'
    )
    const paxHtmlCopy = filePaxBody.toString('utf8')

    paxes.map(async (pax, index) => {
        let paxHtml = paxHtmlCopy

        paxHtml = paxHtml.replace('@nome@', `${pax.name} ${pax.lastName}`)
        paxHtml = paxHtml.replace('@tipoDocumento@', pax.documentType)
        paxHtml = paxHtml.replace('@numeroDocumento@', pax.documentNumber)
        paxHtml = paxHtml.replace('@tipoPassageiro@', pax.type)
        paxHtml = paxHtml.replace('@ticket@', pax.ticket)

        if (index + 1 === paxes.length) {
            paxHtml = paxHtml.replace(/@borderNone@/gi, 'border-bottom: none')
        } else {
            paxHtml = paxHtml.replace(/@borderNone@/gi, '')
        }

        listHtml.push(paxHtml)
    })

    htmlResult = htmlResult.replace('@assentos@', quantitySeat)
    htmlResult = htmlResult.replace('@paxs@', listHtml.join(' '))
    return htmlResult
}

const getPriceHtml = (price, payment, dataPrevisaoEfetivacao) => {
    let html = ''
    if (price.planDailyUsed > 0) {
        html += `<div style="margin-left: 20px"><strong>Diárias: </strong> ${price.planDailyUsed} </div>`
    }
    if (price.planPointUsed > 0) {
        const planPointUsedFormat = appHelper.formatPoints(price.planPointUsed)
        html += `<div style="margin-left: 20px"><strong>Pontos: </strong> ${planPointUsedFormat} </div>`
    }
    if (price.planExtraPrice > 0) {
        const planExtra = appHelper.formatMoney(price.planExtraPrice)
        html += `<div style="margin-left: 20px"><strong>Extra pago: </strong> ${planExtra} </div>`
        html += `<div style="margin-left: 20px"><strong>Cartão de crédito: </strong> ${payment.card} </div>`
        html += `<div style="margin-left: 20px"><strong>Parcelas: </strong> ${payment.installments} </div>`
    }

    if (price.accumulatedPoint > 0) {
        const accumulatedPointFormat = appHelper.formatPoints(
            price.accumulatedPoint
        )
        const dateAvailablePoint = appHelper.getDateStringAvaible(
            dataPrevisaoEfetivacao
        )
        html += `<div style="margin-left: 20px"><strong>Ganho de pontos </strong></div> <div style="margin-left: 20px">${accumulatedPointFormat}
        <span class="font-size: 14px"> (a partir de ${dateAvailablePoint})</span></div>`
    }

    return html
}

module.exports = {
    sendVoucher,
}
