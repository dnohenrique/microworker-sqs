const emitirReserva = require('../features/emitirReserva')

exports.sqsEmitirReserva = async (event) => {
    const listLogs = ['']
    const evento = event.Records[0]

    const snsMessageEvent = evento.Sns.Message.split(':')

    const orderId = snsMessageEvent[0]
    const productId = parseInt(snsMessageEvent[1])

    listLogs.push(
        `********************** PEDIDO: ${orderId} Início do fluxo de emissão **********************`
    )
    listLogs.push(`Payload do evento: ${evento.Sns.Message}`)
    try {
        await emitirReserva.add(orderId, productId, listLogs)
    } catch (error) {
        listLogs.push(error)
        listLogs.push(
            '**********************Fim do fluxo de emissão**********************'
        )
        console.log(JSON.stringify(listLogs.join(' \n ')))
        throw new Error(error)
    }

    listLogs.push(
        '**********************Fim do fluxo de emissão**********************'
    )

    console.warn(listLogs.join(' \n '))
}
