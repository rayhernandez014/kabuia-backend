require('dotenv').config()
const axios = require('axios')

const createInvoice = async (amount, contract) => {

  const apiEndpoint = `/api/v1/stores/${process.env.BTCPS_STORE_ID}/invoices`
  
  const axiosClient = axios.create({
    baseURL: process.env.BTCPS_URL,
    headers: {
      'Authorization': `token ${process.env.BTCPS_API_KEY}`,
      'Content-Type': 'application/json'
    },
    timeout: 5000
  })

  const invoiceData = {
    amount: amount,
    metadata: {
      contract: contract
    }
  }

  const response = await axiosClient.post(apiEndpoint, invoiceData)
  return response.data

}

module.exports = {
  createInvoice
}