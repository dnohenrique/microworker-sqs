/* eslint-disable no-undefined */
const config = require('../settings/config')
const linkPortalBackOffice = config.variables.linkPortalBackOffice
const linkPortalRh = config.variables.linkPortalRh
const linkPortalColaborador = config.variables.linkPortalColaborador
const linkPortalHotsite = config.variables.linkPortalHotsite
const dayPointAvailable = config.variables.dayPointAvailable
const accents = require('remove-accents')
const moment = require('moment')
const { FormatMoney } = require('format-money-js')
moment.locale('pt-br')
exports.enumStatus = {
    aguardandoProcessamento: 1,
    confirmado: 2,
    cancelado: 3,
    rejeitada: 4,
    canceladoManual: 5,
    confirmadoManual: 6,
    emCancelamento: 7,
}
exports.enumStatusCancel = {
    processamento: 1,
    confirmado: 2,
}
exports.enumTransacao = {
    credito: 1,
    debito: 2,
}
exports.enumStatusTransacao = {
    Confirmado: 1,
    Pendente: 2,
    Expirado: 3,
    Cancelado: 4,
}
exports.origemTransacaoEnum = {
    Campanha: 1,
    Reserva: 2,
    Expiracao: 3,
}

exports.enumTypeCase = {
    problemaTecnico: 1,
    motivoConfirmacaoReserva: 1,
    motivoCancelamentoReserva: 2,
    motivoEstornoPendente: 3,
    motivoDivergenciaReserva: 4,
    motivoReembolso: 5,
}

exports.enumProduct = {
    hotel: 1,
    aereo: 2,
}

exports.enumWalletFilterPeriod = {
    movimento: 1,
    vencimento: 2,
    previsaoLiberacao: 3,
}

exports.getPortalUrl = (origem) => {
    switch (origem) {
        case 'portal-rh':
            return linkPortalRh
        case 'portal-colaborador':
            return linkPortalColaborador
        case 'backoffice':
            return linkPortalBackOffice
    }
    return linkPortalHotsite
}

exports.formatPoints = (points) => {
    if (points > 0) {
        return points.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    }
    return ''
}

exports.converteTotalPrice = function (totalPrice) {
    return Math.round(totalPrice / 0.08)
}

exports.desconverteTotalPrice = function (totalPrice) {
    return Math.round(totalPrice * 0.08)
}

exports.getDateString = (value) => {
    const list = value.split('/')
    return `${list[2]}-${list[1]}-${list[0]}`
}

exports.onlyUnique = (value, index, self) => {
    return self.indexOf(value) === index
}

exports.getNumberOfNigths = (checkin, checkout) => {
    const mChecin = moment(checkin)
    const mCheckout = moment(checkout)
    return mCheckout.diff(mChecin, 'days')
}

exports.getDateStringAvaible = (checkout) => {
    const mCheckout = this.getDateAvaible(checkout)
    return mCheckout.format('DD/MM/YYYY')
}

exports.getDateAvaible = (checkout) => {
    let mCheckout = moment(checkout)

    if (parseInt(mCheckout.format('YYYYMMDD')) <= 20210601) {
        mCheckout = moment('2021-06-01', 'YYYY-MM-DD')
    } else {
        mCheckout.add(parseInt(dayPointAvailable), 'day')
    }

    return mCheckout
}

exports.getCityAwait = (city) => {
    const citySplit = city.split(',')
    return this.titlecase(citySplit[citySplit.length - 1].trim())
}

exports.titlecase = (s) => {
    if (typeof s !== 'string') {
        return ''
    }
    return s.charAt(0).toUpperCase() + s.slice(1)
}

exports.formatHorary = (dateTime) => {
    return moment(dateTime).format('HH:mm')
}

exports.formatHoraryCustom = (dateTime) => {
    return this.titlecase(moment(dateTime).format('ddd DD MMM'))
}

exports.translateDuration = (value) => {
    if (value) {
        const valueCustom = value.replace(':', '')
        const timer =
            valueCustom.length <= 3 ? valueCustom.padStart(4, '0') : valueCustom
        const hours = timer.substring(0, 2)
        const minute = timer.substring(2).padStart(2, '0')

        return `${hours}h ${minute}m`
    }
}

exports.formatMoney = (value) => {
    const fm = new FormatMoney({
        decimals: 2,
        decimalPoint: ',',
        separator: '.',
    })
    return fm.from(value, { symbol: 'R$ ' })
}

exports.isNullOrWhiteSpace = (text) => {
    if (isNaN(text)) {
        return text === null || text.match(/^ *$/) !== null
    }

    return false
}

exports.validateEmail = (mail) => {
    return /^\w+([\\.-]?\w+)*@\w+([\\.-]?\w+)*(\.\w{2,3})+$/.test(mail)
}

exports.getPhone = (phoneHotel) => {
    let phone = '-'
    if (phoneHotel) {
        phone = phoneHotel
    }
    return phone
}

exports.contains = (value, contain) => {
    const item = accents.remove(value.toLowerCase())
    return item.indexOf(accents.remove(contain.toLowerCase())) > -1
}

exports.isJson = (str) => {
    try {
        JSON.parse(str)
    } catch (e) {
        return false
    }
    return true
}

exports.plural = (value) => {
    return value > 1 ? 's' : ''
}
