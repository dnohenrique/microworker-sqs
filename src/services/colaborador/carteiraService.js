const config = require('../../settings/config')
const axios = require('axios')
const apiUrlCollaborator = config.variables.apiCollaboratorUrl

const origemTransacaoEnum = {
    Campanha: 1,
    Reserva: 2,
    Expiracao: 3,
}

const adicionaPontosAcumulados = async (parameters, listLogs) => {
    let result = {}
    await axios
        .put(
            `${apiUrlCollaborator}/colaborador/${parameters.userId}/carteira/pontos/pontosacumulados`,
            parameters
        )
        .then(() => {
            result = 'Pontos Acumulados inserido com sucesso.'
        })
        .catch((error) => {
            result = error.response.data
                ? JSON.stringify(error.response.data)
                : error
            if (listLogs) {
                listLogs.push('(Error: Grave)Acumulo de Pontos - response : ')
                listLogs.push(error)
                throw new Error(JSON.stringify(listLogs))
            }
            throw new Error(result)
        })
    return result
}

module.exports = {
    origemTransacaoEnum,
    adicionaPontosAcumulados,
}
