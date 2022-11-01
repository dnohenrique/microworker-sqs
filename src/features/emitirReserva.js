const reservaServiceHotel = require('../services/hotel/reservaService')
const reservaServiceAereo = require('../services/aereo/reservaService')
const colaboradorService = require('../services/colaborador/colaboradorService')
const appHelper = require('../helpers/appHelper')

exports.add = async (orderId, productId, listLogs) => {
    let emissao = false
    let booking = null
    let colaborador = null

    switch (productId) {
        case appHelper.enumProduct.hotel:
            booking = await reservaServiceHotel.consultar(orderId)
            if (!booking) {
                listLogs.push('Reserva não encontrada')
                return
            }

            colaborador = await colaboradorService.consultaColaborador(
                booking.bookingFilter.userId
            )
            if (!colaborador || !colaborador.carteira) {
                listLogs.push('Não existe carteira ou colaborador')
                return
            }

            //TO DO CONSULTAR PAGAMENTOS PRE AUTORIZAÇÃO POR TRANSACTION ID
            //pagamentosService.getPreautorize(booking.bookingFilter.transanctionId)
            const resultPayment = {}
            emissao = await reservaServiceHotel.emitir(
                booking,
                colaborador,
                resultPayment,
                listLogs
            )
            break

        case appHelper.enumProduct.aereo:
            booking = await reservaServiceAereo.consultar(orderId)

            if (!booking) {
                listLogs.push('Reserva não encontrada')
                return
            }

            colaborador = await colaboradorService.consultaColaborador(
                booking.bookingFilter.userId
            )

            if (!colaborador || !colaborador.carteira) {
                listLogs.push('Não existe carteira ou colaborador')
                return
            }

            emissao = await reservaServiceAereo.emitir(booking)
            break
    }

    listLogs.push('Emissão efetuada com sucesso? ' + emissao)
}
