const config = require('../../settings/config')
const axios = require('axios')
const apiUrl = config.variables.apiUrlPayment
const reservaStatusServiceHotel = require('../hotel/reservaStatusService')
const reservaStatusServiceAereo = require('../aereo/reservaStatusService')
const appHelper = require('../../helpers/appHelper')
const enumStatusPayment = {
    pendente: 1,
    aprovado: 2,
    reembolsoManual: 3,
    reembolso: 4,
    processandoReembolso: 5,
}

const cancelPreAutorize = async (cpf, transactionId, listLogs) => {
    let resultPreAutorize = {}

    const request = {
        preAutorizeCancelFilter: {
            cpf,
            transactionId,
        },
    }
    listLogs.push('Payment - cancelPreAutorize: ' + JSON.stringify(request))
    await axios
        .post(`${apiUrl}/payment/CancelPreAutorize`, request)
        .then((result) => {
            resultPreAutorize = result.data.result
        })
        .catch((result) => {
            listLogs.push(`(Error: Grave) Cancelar o pré autorizar`)
            listLogs.push(result.response)
            resultPreAutorize = {
                errorRefund: true,
            }
        })
    return resultPreAutorize
}

const capture = async (orderId, cpf, transactionId, listLogs) => {
    let resultPreAutorize = {}

    const request = {
        captureFilter: {
            orderId,
            cpf,
            transactionId,
        },
    }
    listLogs.push('Payment - capture: ')
    listLogs.push(request)

    await axios
        .post(`${apiUrl}/payment/Capture`, request)
        .then((result) => {
            resultPreAutorize = result.data.result.charges
        })
        .catch((result) => {
            const messageError = result.response.data.errors.join(', ')

            if (listLogs) {
                listLogs.push(
                    `(Error: Grave) Efetivar pagamento(Capture) ${messageError}`
                )
                throw new Error(JSON.stringify(listLogs))
            }
            throw new Error(messageError)
        })
    return resultPreAutorize
}

const refund = async (
    cpf,
    transactionId,
    amount,
    listLogs,
    attendantID = null
) => {
    let resultPreAutorize = {}

    const request = {
        refundFilter: {
            cpf,
            transactionId,
            amount: amount.toFixed(2),
            attendantID,
        },
    }
    listLogs.push('Payment - refund: ')
    listLogs.push(request)

    await axios
        .post(`${apiUrl}/payment/refund`, request)
        .then((result) => {
            resultPreAutorize = result.data.result.refund
        })
        .catch((result) => {
            listLogs.push(`(Error: Grave) Estornar  o pagamento(refund)`)
            listLogs.push(result.response)
        })
    return resultPreAutorize
}

const refundConfirm = async (
    userId,
    transactionId,
    priceExtraRefund,
    listLogsPayment
) => {
    let result = {
        errorRefund: false,
    }
    if (priceExtraRefund > 0) {
        const resultRefund = await refund(
            userId,
            transactionId,
            priceExtraRefund,
            listLogsPayment
        )

        result = resultRefund
        result.errorRefund = !resultRefund.refunded
    }

    return result
}

const confirmarPagamento = async (
    userId,
    transactionId,
    orderID,
    listPaymentLogs,
    productId,
    card = ''
) => {
    let resultBookingStatus = null
    if (transactionId) {
        const result = await capture(
            orderID,
            userId,
            transactionId,
            listPaymentLogs
        )
        const request = {
            orderID,
            userId,
            card,
            statusPaymentID:
                result.status === 'paid'
                    ? enumStatusPayment.aprovado
                    : enumStatusPayment.pendente,
        }

        const requestUpdateStatus = {
            bookingFilter: request,
        }

        switch (productId) {
            case appHelper.enumProduct.hotel:
                resultBookingStatus = await reservaStatusServiceHotel.atualiza(
                    requestUpdateStatus,
                    listPaymentLogs
                )
                break
            case appHelper.enumProduct.aereo:
                resultBookingStatus = await reservaStatusServiceAereo.atualiza(
                    request,
                    listPaymentLogs
                )
                break
        }
    }
    return resultBookingStatus
}

module.exports = {
    cancelPreAutorize,
    enumStatusPayment,
    refundConfirm,
    confirmarPagamento,
    capture,
}
