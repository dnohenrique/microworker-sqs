const env = process.env.NODE_ENV || 'development'

const params = {
    development: {
        serviceBookingUrl: 'http://microservice-reserva-hospedagens',
        serviceBookingAirUrl: 'http://microservice-reserva-aereo',
        serviceColaboradorUrl: 'http://microservice-colaboradores',
        apiPaymentOption: 'http://microservice-opcao-de-pagamento/v1/',
        linkCrmLokiql: 'http://api-salesforce/lokiql/schema',
        apiNotificationUrl: 'http://microservice-notificacao/api/notificacao',
        campanhaIdVoucher: '12319963',
        campanhaIdNaoProcessada: '12024703',
        campanhaAereoIdVoucher: '12377899',
    },
    staging: {
        serviceBookingUrl:
            'http://microservice-reserva-hospedagens-staging.platform.ferias.in',
        serviceBookingAirUrl:
            'http://microservice-reserva-aereo-staging.platform.ferias.in',
        serviceColaboradorUrl:
            'http://microservice-colaboradores-staging.platform.ferias.in',
        serviceFornecedorUrl:
            'http://microservice-fornecedor-staging.platform.ferias.in',
        apiPaymentOption:
            'http://microservice-opcao-de-pagamento-staging.platform.ferias.in/v1/',
        linkCrmLokiql:
            'http://api-salesforce-staging.platform.ferias.in/lokiql/schema',
        apiNotificationUrl:
            'http://microservice-notificacao-staging.platform.ferias.in/api/notificacao',
        campanhaIdVoucher: '12319963',
        campanhaIdNaoProcessada: '12024703',
        campanhaAereoIdVoucher: '12377899',
    },
    production: {
        serviceBookingUrl:
            'http://microservice-reserva-hospedagens-production.platform.ferias.in',
        serviceBookingAirUrl:
            'http://microservice-reserva-aereo-production.platform.ferias.in',
        serviceColaboradorUrl:
            'http://microservice-colaboradores-production.platform.ferias.in',
        serviceFornecedorUrl:
            'http://microservice-fornecedor-production.platform.ferias.in',
        apiPaymentOption:
            'http://microservice-opcao-de-pagamento-production.platform.ferias.in/v1/',
        linkCrmLokiql:
            'http://api-salesforce-production.platform.ferias.in/lokiql/schema',
        apiNotificationUrl:
            'http://microservice-notificacao-production.platform.ferias.in/api/notificacao',
        campanhaIdVoucher: '12319963',
        campanhaIdNaoProcessada: '12024703',
        campanhaAereoIdVoucher: '12377899',
    },
}

module.exports = params[env]
