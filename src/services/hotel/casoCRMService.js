const LINQ = require('node-linq').LINQ
const lokiqlService = require('../crm/crmService')
const appHelper = require('../../helpers/appHelper')

async function abrir(
    resultBooking,
    collaboratorModel,
    enumMotivo,
    listLogsCrm
) {
    let resultCase = {}
    const request = mountRequestCaseCRM(
        resultBooking,
        collaboratorModel,
        enumMotivo
    )

    listLogsCrm.push('CRM - Abri caso no CRM: ' + JSON.stringify(request))

    await lokiqlService
        .addCase(request)
        .then((result) => {
            resultCase = result.data.addCase.status
            listLogsCrm.push(`Response CRM:`)
            listLogsCrm.push(result.data.addCase)
        })
        .catch((error) => {
            listLogsCrm.push(
                `(Error: Grave) Inserir o Caso no CRM ${error.message}`
            )
        })
    return resultCase
}

function mountRequestCaseCRM(resultBooking, collaboratorModel, enumMotivo) {
    const diariasDisponiveis = new LINQ(collaboratorModel.planos).Sum((p) => {
        return p.diariasDisponiveis
    })
    const plano = collaboratorModel.planos[0]
    const request = {
        tipo: appHelper.enumTypeCase.problemaTecnico.toString(),
        motivo: enumMotivo.toString(),
        codigoPedido: resultBooking.orderId,
        dataCheckIn: resultBooking.checkinDate,
        dataCheckOut: resultBooking.checkoutDate,
        dataInicialMulta: resultBooking.dtBeginPenalty,
        nomeHotel: resultBooking.nameProduct,
        colaborador: {
            nome: collaboratorModel.data.nome,
            cpf: collaboratorModel.data.cpf,
        },
        plano: {
            titulo: plano.titulo,
            tipoPlano: plano.tipoPlano,
            diariasTotais: plano.diariasTotais,
            diariasDisponiveis,
        },
        reservas: mountReservation(resultBooking),
    }

    return request
}

function mountReservation(resultBooking) {
    const reservations = new LINQ(resultBooking.rooms)
        .Select((room) => {
            const paxes = new LINQ(room.paxes)
                .Select((pax) => {
                    const paxResult = {
                        nome: pax.name + ' ' + pax.surname,
                        tipoDocumento: pax.documentTypeDescription,
                        documento: pax.document,
                    }

                    return paxResult
                })
                .ToArray()

            const roomResult = {
                reservaId: room.voucherId,
                tarifaReembolsavelPorQuarto: resultBooking.isRefundable,
                nomeFornecedor: resultBooking.providerName,
                nomeQuarto: room.roomDescription,
                regime: room.boardDescription,
                pax: paxes,
            }

            return roomResult
        })
        .ToArray()

    return reservations
}

module.exports = {
    abrir,
}
