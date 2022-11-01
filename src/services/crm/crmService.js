const config = require('../../settings/config')
const linkCrmLokiql = config.variables.linkCrmLokiql
const gql = require('graphql-tag')
const ApolloClient = require('apollo-boost').ApolloClient
const fetch = require('cross-fetch/polyfill').fetch
const createHttpLink = require('apollo-link-http').createHttpLink
const InMemoryCache = require('apollo-cache-inmemory').InMemoryCache

const defaultOptions = {
    watchQuery: {
        fetchPolicy: 'no-cache',
        errorPolicy: 'ignore',
    },
    query: {
        fetchPolicy: 'no-cache',
        errorPolicy: 'all',
    },
}

exports.addCase = async (parameters) => {
    const client = new ApolloClient({
        link: createHttpLink({
            uri: linkCrmLokiql,
            fetch,
        }),
        cache: new InMemoryCache({
            addTypename: false,
        }),
        defaultOptions,
    })

    return client.mutate({
        mutation: gql`
            mutation($issue: caseInputBooking!) {
                addCase(input: $issue) {
                    NumeroCaso
                    idSalesforce
                    status
                }
            }
        `,
        variables: {
            issue: parameters,
        },
    })
}

exports.addCaseAir = async (parameters) => {
    const client = new ApolloClient({
        link: createHttpLink({
            uri: linkCrmLokiql,
            fetch,
        }),
        cache: new InMemoryCache({
            addTypename: false,
        }),
        defaultOptions,
    })

    return client.mutate({
        mutation: gql`
            mutation($issue: caseInputBookingAir!) {
                addCaseAir(input: $issue) {
                    NumeroCaso
                    idSalesforce
                    status
                }
            }
        `,
        variables: {
            issue: parameters,
        },
    })
}
