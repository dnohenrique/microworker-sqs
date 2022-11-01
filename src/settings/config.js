'use strict'
const variables = require('./environment')
const environment = process.env.NODE_ENV || 'development'

console.warn('Enviroment running:', environment)

module.exports = {
    environment,
    variables,
}
