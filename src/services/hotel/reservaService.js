const config = require('../../settings/config')
const serviceBookingUrl = config.variables.serviceBookingUrl
const appHelper = require('../../helpers/appHelper')
const notificationHotelService = require('./notificacaoService')
const casoCRMService = require('./casoCRMService')
const paymentService = require('../pagamentos/pagamentoService')
const carteiraService = require('../colaborador/carteiraService')
const opcaoPagamentoService = require('../pagamentos/opcaoPagamentoService')
const axios = require('axios')
const tresMinuto = 180000

const emitir = async (
    booking,
    collaboratorModel,
    resultPayment,
    listEmissionLogs
) => {
    const userId = booking.bookingFilter.userId
    try {
        const price = booking.bookingFilter.price
        const confirmado = appHelper.enumStatus.confirmado
        const resultCreateReservation = {}
        listEmissionLogs.push(
            `==================Inicio de Emissão de Rerserva - Hotel - Usuário ${userId}======================`
        )
        const resultBooking = await emitirReservaBroker(
            booking.orderId,
            listEmissionLogs
        )

        resultCreateReservation.error = resultBooking.error
        if (resultCreateReservation.error) {
            await casoCRMService.abrir(
                resultCreateReservation,
                collaboratorModel,
                appHelper.enumTypeCase.motivoConfirmacaoReserva,
                listEmissionLogs
            )
            return
        }
        const hotel = resultBooking.availability.hotelInfo[0]
        resultCreateReservation.descriptionProduct = hotel.description
        resultCreateReservation.isNumberDayError =
            resultBooking.isNumberDayError
        resultCreateReservation.nameProduct = hotel.name
        resultCreateReservation.category = hotel.category
        resultCreateReservation.address = hotel.address
        resultCreateReservation.orderId = resultBooking.orderID
        resultCreateReservation.installments =
            resultBooking.bookingFilter.installments
        resultCreateReservation.installmentAmount =
            resultBooking.bookingFilter.installmentAmount
        resultCreateReservation.actualStatus = resultBooking.actualStatus
        resultCreateReservation.isReservation =
            resultBooking &&
            resultBooking.orderID &&
            resultBooking.isActive &&
            resultBooking.actualStatus.statusId === confirmado
        resultCreateReservation.checkinDate =
            resultBooking.cancelationPolicies.cancelationPoliciesFilter.checkinDate
        resultCreateReservation.checkoutDate =
            resultBooking.cancelationPolicies.cancelationPoliciesFilter.checkoutDate
        resultCreateReservation.checkinHour =
            resultBooking.bookingResult.rooms[0].checkinHour
        resultCreateReservation.checkoutHour =
            resultBooking.bookingResult.rooms[0].checkoutHour
        resultCreateReservation.numberOfNights =
            resultBooking.cancelationPolicies.cancelationPoliciesFilter.numberOfNights
        resultCreateReservation.providerName =
            resultBooking.cancelationPolicies.cancelationPoliciesFilter.providerName
        resultCreateReservation.dataPrevisaoEfetivacao =
            resultCreateReservation.checkoutDate
        resultCreateReservation.rooms = resultBooking.bookingResult.rooms
        resultCreateReservation.dtBeginPenalty =
            resultBooking.cancelationPolicies.dtBegin
        resultCreateReservation.isRefundable =
            resultBooking.cancelationPolicies.isRefundable
        resultCreateReservation.created = resultBooking.created

        if (resultCreateReservation.isReservation) {
            const paymentResult = await confirmarPagamento(
                resultPayment,
                resultCreateReservation,
                userId,
                listEmissionLogs
            )

            await adicionaPontosAcumulados(
                userId,
                price,
                resultCreateReservation,
                collaboratorModel,
                listEmissionLogs
            )

            const priceCancellationPolicies = await opcaoPagamentoService.getCancellationCalculation(
                booking.cancelationPolicies.cancellationRoomPrices.totalPrice,
                price.planDailyUsed,
                price.planPointUsed,
                price.totalPriceExtraUsed,
                booking.roomPrices.numberOfNights,
                collaboratorModel.planos[0].valorDiariaMaxima,
                booking.cancelationPolicies.cancellationRoomPrices.totalPrice
            )
            await notificationHotelService.sendVoucher(
                resultCreateReservation,
                collaboratorModel,
                paymentResult.payment,
                listEmissionLogs,
                priceCancellationPolicies
            )
        } else {
            const motivo = resultCreateReservation.isNumberDayError
                ? appHelper.enumTypeCase.motivoDivergenciaReserva
                : appHelper.enumTypeCase.motivoConfirmacaoReserva

            await casoCRMService.abrir(
                resultCreateReservation,
                collaboratorModel,
                motivo,
                listEmissionLogs
            )
        }

        listEmissionLogs.push(
            `===================Fim de Emissão de Rerserva - Hotel - Usuário : ${userId}==============================`
        )
    } catch (error) {
        listEmissionLogs.push(
            `===================Fim de Emissão de Rerserva - Hotel - Usuário : ${userId}==============================`
        )
        throw new Error(JSON.stringify(listEmissionLogs))
    }
    return listEmissionLogs
}

const emitirReservaBroker = async (orderId, listEmissionLogs) => {
    let resultBooking = {
        error: {},
    }
    listEmissionLogs.push(`Emissão do Pedido: ${orderId}`)
    await axios
        .post(`${serviceBookingUrl}Booking/CreateBooking/${orderId}`, {
            timeout: tresMinuto,
        })
        .then((result) => {
            if (result && result.data && result.data.result) {
                resultBooking = result.data.result.booking
            }
        })
        .catch((error) => {
            resultBooking.error = error
            listEmissionLogs.push('(Error: Grave) Booking - createReservation:')
            listEmissionLogs.push(error)
        })
    return resultBooking
}

const adicionaPontosAcumulados = async (
    userId,
    price,
    resultCreateReservation,
    collaboratorModel,
    listLogs
) => {
    let result = null
    if (price.accumulatedPoint) {
        const request = {
            userId,
            dataPrevisaoEfetivacao: appHelper
                .getDateAvaible(resultCreateReservation.dataPrevisaoEfetivacao)
                .format('YYYY-MM-DD'),
            origem: carteiraService.origemTransacaoEnum.Reserva,
            descricao: `Reserva: ${resultCreateReservation.nameProduct}`,
            codigoReferenciaOrigem: resultCreateReservation.orderId,
            idPlano: collaboratorModel.plan.id,
            valorDinheiro: price.pointPrice,
            quantidadeInicial: price.accumulatedPoint,
        }

        listLogs.push('Acumulo de Pontos - request : ')
        listLogs.push(request)
        const resultDaily = await carteiraService.adicionaPontosAcumulados(
            request,
            listLogs
        )

        result = resultDaily.id
    }

    return result
}

const confirmarPagamento = async (
    resultPayment,
    resultCreateReservation,
    userId,
    listLogs
) => {
    let resultCaptureConfirm = null
    let statusPayment = null
    if (resultPayment.transactionId) {
        listLogs.push('confirmarPagamento : ' + JSON.stringify(resultPayment))
        resultCaptureConfirm = await paymentService.confirmarPagamento(
            userId,
            resultPayment.transactionId,
            resultCreateReservation.orderId,
            listLogs,
            appHelper.enumProduct.hotel,
            resultPayment.payment.card
        )

        statusPayment = resultCaptureConfirm.statusPayment.statusPaymentId
    }

    return {
        resultCaptureConfirm,
        payment: resultPayment.payment,
        statusPayment,
    }
}

const consultar = async (orderId) => {
    let response = {}

    const request = {
        bookingDetailFilter: {
            orderId,
        },
    }

    let url = `${serviceBookingUrl}/v1/hotel/Booking/searchAll`
    await axios
        .post(url, request)
        .then((retorno) => {
            response = retorno.data.result.booking[0]
            if (!response.bookingFilter.price.planoPeriodos) {
                response.bookingFilter.price.planoPeriodos = []
            }
        })
        .catch((error) => {
            response = error.response ? error.response : error

            throw new Error(
                `Erro consulta de reserva (hotel): ${JSON.stringify(
                    response.data
                )}`
            )
        })

    return response
}

module.exports = {
    emitir,
    consultar,
}
