const config = require('../../settings/config')
const axios = require('axios')
const apiUrlBooking = config.variables.apiUrlBooking

module.exports.atualiza = async (parameters, listLogs) => {
    const msgLog = parameters.statusPaymentID
        ? 'alteração de status de pagamento na reserva -'
        : 'alteração status de reserva -'

    listLogs.push('Booking - updateStatusReservation: ' + msgLog)
    listLogs(parameters)

    let resultBooking = {
        cancelationPolicies: {
            cancellationTextList: '',
        },
        priceRefund: [],
    }
    await axios
        .post(`${apiUrlBooking}booking/updateStatusBooking`, parameters)
        .then((result) => {
            if (result.data.success) {
                resultBooking = result.data.result
            } else if (result.data.errors) {
                throw new Error(result.data.errors[0])
            }
        })
        .catch((error) => {
            listLogs.push(
                `(Error: Grave) Alterar o status da reserva - ${error.message}`
            )
            throw new Error(error.message)
        })
    resultBooking.orderId = resultBooking.orderID
    return resultBooking
}
