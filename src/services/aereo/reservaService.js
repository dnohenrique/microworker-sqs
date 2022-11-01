const config = require('../../settings/config')
const serviceBookingAirUrl = config.variables.serviceBookingAirUrl
const appHelper = require('../../helpers/appHelper')
const axios = require('axios')
const moment = require('moment')
const LINQ = require('node-linq').LINQ
const updateStatusAirService = require('./reservaStatusService')
const airNotificationService = require('./notificacaoService')
const casoCRMService = require('./casoCRMService')
const carteiraService = require('../colaborador/carteiraService')
const pagamentoService = require('../pagamentos/pagamentoService')
const tresMinuto = 180000
const emitir = async (
    parameters,
    collaboratorModel,
    orderId,
    resultDebit,
    nameProduct,
    resultOrder,
    resultPayment,
    listEmissionLogs
) => {
    const userId = parameters.bookingFilter.userId
    listEmissionLogs.push(
        `==================Inicio de Emissão de Rerserva e Bilhete - Aéreo - Usuário ${userId}======================`
    )
    try {
        await emitReservation(
            orderId,
            resultOrder,
            parameters,
            listEmissionLogs,
            collaboratorModel
        )
        await emitEmission(
            orderId,
            listEmissionLogs,
            nameProduct,
            parameters,
            resultPayment,
            userId,
            collaboratorModel
        )
        listEmissionLogs.push(
            `===================Fim de Emissão de Rerserva e Bilhete - Aéreo - Usuário : ${userId}==============================`
        )
    } catch (error) {
        listEmissionLogs.push(
            `===================Fim de Emissão de Rerserva e Bilhete - Aéreo - Usuário : ${userId}==============================`
        )
        throw new Error(error.message)
    }
    return listEmissionLogs
}

const emitReservation = async (
    orderId,
    resultOrder,
    parameters,
    listEmissionLogs,
    collaboratorModel
) => {
    let resultReservation = {
        error: {},
        isDivergenceError: false,
    }
    const request = { orderId }
    listEmissionLogs.push(`Inicia Emissão da Reserva - Pedido: ${orderId}`)
    await axios
        .post(`${serviceBookingAirUrl}Booking/reservation`, request, {
            timeout: tresMinuto,
        })
        .then((response) => {
            resultReservation = response.data
        })
        .catch((error) => {
            resultReservation.error =
                error && error.response ? error.response.data : error
            listEmissionLogs.push(
                `(Erro Grave 99)Inicia Emissão da Reserva - Message:`
            )
            listEmissionLogs.push(resultReservation.error)
        })

    if (resultReservation.error) {
        await errorEmission(
            parameters,
            resultOrder,
            collaboratorModel,
            listEmissionLogs
        )
        listEmissionLogs.push(
            `===================Fim de Emissão de Rerserva e Bilhete - Aéreo - Usuário : ${parameters.bookingFilter.userId}==============================`
        )
        throw new Error(JSON.stringify(listEmissionLogs))
    }

    if (resultReservation.isDivergenceError) {
        await errorDivervence(
            parameters,
            resultOrder,
            collaboratorModel,
            listEmissionLogs
        )
        listEmissionLogs.push(
            `===================Fim de Emissão de Rerserva e Bilhete - Aéreo - Usuário : ${parameters.bookingFilter.userId}==============================`
        )
        throw new Error(JSON.stringify(listEmissionLogs))
    }

    return resultReservation
}

const emitEmission = async (
    orderId,
    listEmissionLogs,
    nameProduct,
    parameters,
    resultPayment,
    userId,
    collaboratorModel
) => {
    let resultEmission = {
        error: {},
    }
    const request = { orderId }
    listEmissionLogs.push(`Inicia Emissão do Bilhete - Pedido: ${orderId}`)
    await axios
        .post(`${serviceBookingAirUrl}Booking/emission`, request, {
            timeout: tresMinuto,
        })
        .then((response) => {
            resultEmission = response.data || {}
        })
        .catch((error) => {
            result.isReservation = false
            resultEmission.error =
                error && error.response ? error.response.data : error
            listEmissionLogs.push(
                `(Erro Grave 99)Inicia Emissão da Bilhete - Message:`
            )
            listEmissionLogs.push(resultEmission.error)
        })

    const result = resultEmission
    result.isReservation =
        resultEmission.actualStatus.statusId === appHelper.enumStatus.confirmado
    if (result.isReservation) {
        const payment = {
            card: resultEmission.bookingRequest.card,
            installments: resultEmission.bookingRequest.installmentDescription,
        }
        result.nameProduct = nameProduct
        result.orderId = resultEmission.orderID
        result.installments = resultEmission.bookingRequest.installments
        result.installmentAmount =
            resultEmission.bookingRequest.installmentAmount
        result.created = resultEmission.createdAt
        result.dataPrevisaoEfetivacao = moment(
            new LINQ(result.air.stretches).Last().destination.horaryEmbarkation
        ).toDate()
        result.passengers = resultEmission.bookingRequest.passengers
        result.quantitySeat = resultEmission.bookingRequest.quantitySeat
        result.travels = resultEmission.travels
        result.handbagLong = resultEmission.bookingRequest.handbagLong
        await confirmarPagamento(
            resultPayment,
            result,
            userId,
            listEmissionLogs
        )
        await adicionaPontosAcumulados(
            userId,
            result.price,
            result,
            collaboratorModel,
            listEmissionLogs
        )
        await airNotificationService.sendVoucher(
            result,
            result.price,
            result.cancelationPolicies,
            collaboratorModel.data,
            payment,
            listEmissionLogs
        )
    } else {
        await errorEmission(
            parameters,
            result,
            collaboratorModel,
            listEmissionLogs
        )
        listEmissionLogs.push(
            `===================Fim de Emissão de Rerserva e Bilhete - Aéreo - Usuário : ${parameters.bookingFilter.userId}==============================`
        )
        throw new Error(JSON.stringify(listEmissionLogs))
    }
    return resultEmission
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
        listLogs.push('confirmarPagamento: ' + JSON.stringify(resultPayment))
        resultCaptureConfirm = await pagamentoService.confirmarPagamento(
            userId,
            resultPayment.transactionId,
            resultCreateReservation.orderId,
            listLogs,
            appHelper.enumProduct.aereo,
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

const errorEmission = async (
    parameters,
    result,
    collaboratorModel,
    listLogs
) => {
    if (parameters.transactionId) {
        await updateStatusAirService.updateStatusReservation(
            parameters,
            listLogs,
            collaboratorModel,
            false
        )
    }

    await casoCRMService.abrir(
        result,
        collaboratorModel,
        appHelper.enumTypeCase.motivoConfirmacaoReserva,
        listLogs
    )
}

const errorDivervence = async (
    parameters,
    result,
    collaboratorModel,
    listLogs
) => {
    if (parameters.transactionId) {
        await updateStatusAirService.updateStatusReservation(
            parameters,
            listLogs,
            collaboratorModel,
            false
        )
    }

    await casoCRMService.abrir(
        result,
        collaboratorModel,
        appHelper.enumTypeCase.motivoDivergenciaReserva,
        listLogs
    )
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
        const dtPrevEfetiv = appHelper.getDateAvaible(
            resultCreateReservation.dataPrevisaoEfetivacao
        )
        const request = {
            userId,
            dataPrevisaoEfetivacao: dtPrevEfetiv.format('YYYY-MM-DD'),
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

const consultar = async (orderId) => {
    let response = {
        bookingFilter: {},
    }

    let url = `${serviceBookingAirUrl}/v1/Aereo/Booking/${orderId}`
    await axios
        .get(url)
        .then((retorno) => {
            const data = retorno.data

            response.bookingFilter.userId = data.bookingRequest.userId
            response.bookingFilter.planId = data.bookingRequest.planId
            response.bookingFilter.price = data.price

            if (!response.bookingFilter.price.planoPeriodos) {
                response.bookingFilter.price.planoPeriodos = []
            }

            if (
                response.bookingFilter.price.totalPriceExtra &&
                response.bookingFilter.price.totalPriceExtra > 0
            ) {
                response.bookingFilter.price.totalPriceExtra =
                    data.price.totalPriceExtra
            }

            response.cancelationPolicies = data.cancelationPolicies
            response.pricePolicies = data.pricePolicies
            response.cancelationPolicies.providerName = 'Skyteam'

            response.totalPrice = data.air.totalPriceGeneral
            response.created = data.createdAt
            response.orderID = data.orderID
            response.actualStatus = data.actualStatus
            response.bookingRequest = data.bookingRequest
            response.air = data.air
            response.passengers = data.bookingRequest.passengers
        })
        .catch((error) => {
            response = error.response ? error.response : error

            throw new Error(
                `Erro consulta de reserva (aereo): ${JSON.stringify(
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
