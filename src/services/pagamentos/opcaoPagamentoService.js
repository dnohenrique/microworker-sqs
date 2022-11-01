const config = require('../../settings/config')
const appHelper = require('../../helpers/appHelper')
const axios = require('axios')
const apiUrl = config.variables.apiPaymentOption
const LINQ = require('node-linq').LINQ

module.exports.getCancellationCalculation = async (
    totalPrice,
    planDailyUsed,
    planPointUsed,
    totalPriceExtraUsed,
    numberOfNights,
    planMaxDailyPrice,
    totalPricePenalty
) => {
    let resultCalculation = {}

    const request = {
        calculationPoliciesParameter: {
            planDailyUsed,
            planPointUsed,
            planMaxDailyPrice,
            totalPriceExtraUsed,
            numberOfNights,
            isTotalPenalty: totalPricePenalty >= totalPrice,
            productPenalty: {
                type: appHelper.enumProduct.hotel,
                totalPrice,
            },
        },
    }

    const url = `${apiUrl}paymentOption/calculationPolicies/calculation`
    await axios
        .post(url, request)
        .then((result) => {
            resultCalculation = result.data.result.calculationPolicies
        })
        .catch((result) => {
            console.error(`(Error: Grave) Calcular Penalidade`)
            console.error(result)

            const messageError = new LINQ(result.response.data.errors)
                .Select((error) => {
                    return error
                })
                .ToArray()
            throw new Error(messageError.join(', '))
        })
    return resultCalculation
}
