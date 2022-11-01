const config = require('../../settings/config')
const axios = require('axios')
const apiUrlBooking = config.variables.apiUrlBooking

module.exports.atualiza = async (parameters, collaboratorModel, listLogs) => {
    const msgLog = 'alteração de status de pagamento na reserva -'

    listLogs.push('Booking - updateStatusReservation: ' + msgLog)
    listLogs.push(parameters)

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
