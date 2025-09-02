require('dotenv').config()
const axios = require('axios')

const createInvoice = async (amount) => {

  const apiEndpoint = `/api/v1/stores/${storeId}/invoices`
  
  const options = {
    method: 'POST',
    url: `${process.env.BTCPS_URL}${apiEndpoint }`,
    headers: {
      'Authorization': `token ${process.env.BTCPS_API_KEY}`
    },
    data: {
      amount: amount,
      checkout: {
        "redirectURL": "/",
        "redirectAutomatically": true,
      },
    }
  }

  const response = await axios.request(options)
  return response.data

}

module.exports = {
  createInvoice
}