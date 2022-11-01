const config = require('../../settings/config')
const apiNotificationUrl = config.variables.apiNotificationUrl
const axios = require('axios')
const LINQ = require('node-linq').LINQ
const appHelper = require('../../helpers/appHelper')
const moment = require('moment')
const fs = require('fs')
const util = require('util')
const readFile = util.promisify(fs.readFile)

async function sendVoucher(
    resultBooking,
    collaboratorModel,
    payment = null,
    listLogs,
    priceCancellationPolicies
) {
    let emailSent = false
    if (appHelper.validateEmail(collaboratorModel.emailPessoal)) {
        const address = new LINQ(resultBooking.address).FirstOrDefault()
        const rooomFirst = new LINQ(resultBooking.rooms).FirstOrDefault()
        const roomsBody = await getRoomBodyHtml(
            resultBooking.rooms,
            priceCancellationPolicies.cancellationPolicies.cancellationTextList,
            resultBooking.descriptionProduct
        )
        const price = getPrice(
            priceCancellationPolicies.price,
            payment,
            resultBooking.checkoutDate
        )
        const checkin = moment(resultBooking.checkinDate, 'YYYY-MM-DD')
        const checkout = moment(resultBooking.checkoutDate, 'YYYY-MM-DD')
        const createReservation = moment(resultBooking.created, 'YYYY-MM-DD')
        const vars = {
            orderID: resultBooking.orderId,
            name: resultBooking.nameProduct,
            phone: appHelper.getPhone(rooomFirst.phone),
            description: resultBooking.descriptionProduct,
            category: getCategory(resultBooking.category),
            street: address.street,
            cityName: address.cityName,
            numberNight: resultBooking.numberOfNights,
            checkin: checkin.format('DD/MM/YYYY'),
            checkout: checkout.format('DD/MM/YYYY'),
            checkinHour: resultBooking.checkinHour || '',
            checkoutHour: resultBooking.checkoutHour || '',
            createReservation: createReservation.format('DD/MM/YYYY'),
            price,
            roomsBody,
            countRooms: resultBooking.rooms.length,
        }

        const request = {
            campanhaId: config.variables.campanhaIdVoucher,
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
                const messageError =
                    error.response ||
                    new LINQ(error.response.data.result)
                        .Select((error) => error)
                        .ToArray()

                listLogs.push(
                    `(Error: Grave) Enviar Post de Notificacao: ${messageError}`
                )
            })
    }
    return emailSent
}

const getCategory = (category) => {
    if (category > 0) {
        const plural = category > 1 ? 's' : ''
        return `<div><strong>Categoria:</strong> Hotel ${category} estrela${plural}</div>`
    }

    return ''
}

const getPrice = (price, payment, checkoutDate) => {
    let html = ''
    if (price.planDailyUsed > 0) {
        html += `<div style="margin-left: 20px"><strong>Diárias: </strong> ${price.planDailyUsed} </div>`
    }
    if (price.planPointUsed > 0) {
        const planPointUsedFormat = appHelper.formatPoints(price.planPointUsed)
        html += `<div style="margin-left: 20px"><strong>Pontos: </strong> ${planPointUsedFormat} </div>`
    }
    if (price.planExtraPrice > 0) {
        const extraPago = appHelper.formatMoney(price.planExtraPrice)
        html += `<div style="margin-left: 20px"><strong>Extra pago: </strong> ${extraPago} </div>`
        html += `<div style="margin-left: 20px"><strong>Cartão de crédito: </strong> ${payment.card} </div>`
        html += `<div style="margin-left: 20px"><strong>Parcelas: </strong> ${payment.installments} </div>`
    }

    if (price.accumulatedPoint > 0) {
        const accumulatedPointFormat = appHelper.formatPoints(
            price.accumulatedPoint
        )
        const dateAvailablePoint = appHelper.getDateStringAvaible(checkoutDate)
        html += `<div style="margin-left: 20px"><strong>Ganho de pontos </strong></div> <div style="margin-left: 20px">${accumulatedPointFormat}
        <span class="font-size: 14px"> (a partir de ${dateAvailablePoint})</span></div>`
    }

    return html
}

const getRoomBodyHtml = async (rooms, cancellationTextList, detailHotel) => {
    const fileRoomsBody = await readFile(__dirname + '/templateHotel/room.html')
    const roomsBody = fileRoomsBody.toString('utf8')
    const htmlCancel = await getCancellationPoliciesHtml(cancellationTextList)
    let index = 0
    const html = new LINQ(rooms)
        .Select((room) => {
            let htmlResult = roomsBody
            const paxHtml = getPaxsHtml(room.paxes)
            let hmtlDetail = ''

            if (detailHotel) {
                hmtlDetail = `<div><strong>Mais detalhes:</strong></div><div style="margin-top: 20px">${detailHotel}</div>`
            }

            let roomBorder = ''
            if (index > 0) {
                roomBorder = 'border-top: 2px dashed #00B0B0'
            }
            index++
            const descricao = room.roomDescription
            htmlResult = htmlResult.replace('@roomBorder@', roomBorder)
            htmlResult = htmlResult.replace('@RoomDescription@', descricao)
            htmlResult = htmlResult.replace('@VoucherId@', room.voucherId)
            htmlResult = htmlResult.replace('@Regime@', room.boardDescription)
            htmlResult = htmlResult.replace('@Hospedes@', paxHtml)
            htmlResult = htmlResult.replace('@detailHotel@', hmtlDetail)
            htmlResult = htmlResult.replace('@CancellationText@', htmlCancel)
            return htmlResult
        })
        .ToArray()
        .join('')

    return html
}
const getPaxsHtml = (paxes) => {
    let countChild = 1
    let countAdult = 2
    const html = new LINQ(paxes)
        .OrderBy((pax) => !pax.isMain)
        .Select((pax) => {
            let htmlResult = ''

            if (pax.mainPax) {
                htmlResult = `<div><strong>Titular:</strong> ${pax.name} ${pax.surname} </div>`
                htmlResult += `<div><strong>${pax.documentTypeDescription}:</strong> ${pax.document} </div>`
            } else if (pax.isChild) {
                htmlResult += `<div><strong>Criança ${countChild}:</strong>${pax.name} ${pax.surname}</div>`
                countChild++
            } else {
                htmlResult = `<div><strong>Hóspede ${countAdult}:</strong> ${pax.name} ${pax.surname} </div>`
                countAdult++
            }

            return htmlResult
        })
        .ToArray()
        .join('')

    return html
}

const getCancellationPoliciesHtml = async (cancellationTextList) => {
    const fileCancellationPoliciesBody = await readFile(
        `${__dirname}/templateHotel/cancellation-policies.html`
    )
    const cancellationPoliciesHtml = fileCancellationPoliciesBody.toString(
        'utf8'
    )
    const html = new LINQ(cancellationTextList)
        .Select((text) => {
            let htmlResult = cancellationPoliciesHtml
            htmlResult = htmlResult.replace('@text@', text)
            return htmlResult
        })
        .ToArray()
        .join('')

    return `<ul style="padding-left: 0">${html}</ul>`
}

module.exports = {
    sendVoucher,
}
