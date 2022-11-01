const lokiqlService = require('../crm/crmService')
const appHelper = require('../../helpers/appHelper')
const LINQ = require('node-linq').LINQ
const moment = require('moment')

async function emitCase(
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
    listLogsCrm.push('CRM - Abri caso no CRM: ')
    listLogsCrm.push(request)

    await lokiqlService
        .addCaseAir(request)
        .then((result) => {
            resultCase = result.data.addCaseAir.status
            listLogsCrm.push(`Response CRM:`)
            listLogsCrm.push(result.data.addCaseAir)
        })
        .catch((error) => {
            const errorText =
                error && error.response ? error.response.data : error
            listLogsCrm.push(`(Error: Grave) Inserir o Caso no CRM`)
            listLogsCrm.push(errorText)
        })
    return resultCase
}

function mountRequestCaseCRM(resultBooking, collaboratorModel, enumMotivo) {
    const air = resultBooking.air
    const dataIda = moment(
        new LINQ(air.stretches).First().destination.horaryEmbarkation
    ).format('DD/MM/YYYY')
    const dataVolta = moment(
        new LINQ(air.stretches).Last().destination.horaryEmbarkation
    ).format('DD/MM/YYYY')
    const diariasDisponiveis = new LINQ(collaboratorModel.planos).Sum((p) => {
        return p.diariasDisponiveis
    })
    const plano = collaboratorModel.planos[0]
    const request = {
        tipo: appHelper.enumTypeCase.problemaTecnico.toString(),
        motivo: enumMotivo.toString(),
        codigoPedido: resultBooking.orderId,
        dataIda,
        dataVolta,
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
    const paxes = new LINQ(resultBooking.passengers)
        .Select((pax) => {
            return {
                nome: `${pax.name} ${pax.lastName}`,
                tipoDocumento: pax.documentType,
                documento: pax.documentNumber,
            }
        })
        .ToArray()

    const localizador = new LINQ(resultBooking.travels)
        .Select((travel) => {
            return travel.locator
        })
        .ToArray()

    const trechos = new LINQ(resultBooking.air.stretches)
        .Select((trecho) => {
            const dataEmbarque = moment(
                trecho.destination.horaryEmbarkation
            ).format('DD/MM/YYYY')
            const horaEmbarque = moment(
                trecho.destination.horaryEmbarkation
            ).format('HH:mm')
            const dataDesembarque = moment(
                trecho.destination.horaryDesbarkation
            ).format('DD/MM/YYYY')
            const horaDesembarque = moment(
                trecho.destination.horaryDesbarkation
            ).format('HH:mm')
            const companhia = trecho.destination.companies[0].name
            const classe = trecho.destination.detail.flights[0].class
            return {
                origem: trecho.airportEmbarkation,
                destino: trecho.airportDesbarkation,
                dataEmbarque,
                horaEmbarque,
                dataDesembarque,
                horaDesembarque,
                companhia,
                numeroVoo: trecho.destination.numberFlight,
                classe,
            }
        })
        .ToArray()

    const result = [
        {
            localizador: localizador.join(', '),
            nomeFornecedor: 'Skyteam',
            trechos,
            pax: paxes,
        },
    ]

    return result
}

module.exports = {
    emitCase,
}
