const axios = require('axios')
const config = require('../../settings/config')
const serviceColaboradorUrl = config.variables.serviceColaboradorUrl

exports.consultaColaborador = async (cpf) => {
    const url = `${serviceColaboradorUrl}/api/colaborador/${cpf}/true`
    let response = {}

    await axios
        .get(url)
        .then((retorno) => {
            response = retorno.data.result[0]
        })
        .catch((error) => {
            throw new Error('Colaborador não encontrado' + error.statusText)
        })
    return response
}
