require('dotenv').config()
const paymentsRouter = require('express').Router()
const crypto = require('crypto')
const Contract = require('../models/contract')
const Product = require('../models/product')
const mongoose = require('mongoose')

//for successful validation, I need to use this body.parser just for this endpoint

paymentsRouter.post('/', async (request, response) => {
  const sigHashAlg = 'sha256'
  const sigHeaderName = 'BTCPAY-SIG'
  const webhookSecret = process.env.BTCPS_WH_SECRET // see previous step

  if (!request.rawBody) {
    return response.status(500).send('Request body empty')
  }
  const checksum = Buffer.from(request.get(sigHeaderName) || '', 'utf8')
  const hmac = crypto.createHmac(sigHashAlg, webhookSecret)
  const digest = Buffer.from(
    sigHashAlg + '=' + hmac.update(request.rawBody).digest('hex'),
    'utf8'
  )

  if (
    checksum.length !== digest.length ||
    !crypto.timingSafeEqual(digest, checksum)
  ) {
    console.log(`Request body digest (${digest}) did not match ${sigHeaderName} (${checksum})`)
    return response.status(500).send(`Request body digest (${digest}) did not match ${sigHeaderName} (${checksum})`)
  } else {

    const session = await mongoose.startSession()
    request.mongoSession = session
    session.startTransaction()

    const { invoiceId, type } = request.body

    console.log(request.body)

    const contract = await Contract.findOne({
      $expr: {
        $eq: [
          { $arrayElemAt: ['$invoiceHistory.invoice', -1] }, 
          invoiceId
        ]
      }
    }).session(session).exec()

    if(!contract){
      throw new Error('invalid invoice id', { cause: { title: 'UserError', code: 404} })
    }

    const isDuplicatedStatus = (newStatus) => {
      return Boolean(contract.invoiceHistory.find((event)=>{ return ((event.status === newStatus) && (event.invoice === invoiceId)) }))
    }      

    let newStatus
    let newContractStatus

    switch (type) {
      case 'InvoiceReceivedPayment':
      case 'InvoiceProcessing':
        newStatus = 'pending'
        if(isDuplicatedStatus(newStatus)){
          console.warn(`duplicated event: ${type}`)
          return response.status(200).send(`Warning: duplicated event: ${type}`)
        }
        break
      case 'InvoiceSettled':
      case 'InvoicePaymentSettled':        
        newStatus = 'settled'
        if(isDuplicatedStatus(newStatus)){
          console.warn(`duplicated event: ${type}`)
          return response.status(200).send(`Warning: duplicated event: ${type}`)
        }
        for( const [idx, item] of contract.order.items.entries()){
          await Product.findByIdAndUpdate(item, { $inc: { reservedStock: contract.order.quantities[idx] * -1 } }, {
            new: true,
            runValidators: true,
            context: 'query'
          }).session(session).exec()
        }
        newContractStatus = 'paid'
        break
      case 'InvoiceExpired':        
        newStatus = 'expired'
        if(isDuplicatedStatus(newStatus)){
          console.warn(`duplicated event: ${type}`)
          return response.status(200).send(`Warning: duplicated event: ${type}`)
        }
        for( const [idx, item] of contract.order.items.entries()){
          await Product.findByIdAndUpdate(item, { $inc: { stock: contract.order.quantities[idx], reservedStock: contract.order.quantities[idx] * -1 } }, {
            new: true,
            runValidators: true,
            context: 'query'
          }).session(session).exec()
        }
        newContractStatus = 'expired'
        break
      case 'InvoiceInvalid':        
        newStatus = 'invalid'
        if(isDuplicatedStatus(newStatus)){
          console.warn(`duplicated event: ${type}`)
          return response.status(200).send(`Warning: duplicated event: ${type}`)
        }
        for( const [idx, item] of contract.order.items.entries()){
          await Product.findByIdAndUpdate(item, { $inc: { stock: contract.order.quantities[idx], reservedStock: contract.order.quantities[idx] * -1 } }, {
            new: true,
            runValidators: true,
            context: 'query'
          }).session(session).exec()
        }
        break
      default:
        console.warn(`Unhandled webhook event type: ${type}`)
        return response.status(200).send(`Warning: Unhandled webhook event type: ${type}`)
      }

    if(newContractStatus){
      contract.history = [...contract.history, {
        status: newContractStatus,
          timestamp: new Date()
      }]
    }

    contract.invoiceHistory = [...contract.invoiceHistory, {
      invoice: invoiceId,
      status: newStatus,
      timestamp: new Date()
    }]

    await contract.save({ session })

    await session.commitTransaction()
    session.endSession()
    request.mongoSession = null

    response.status(200).send('Success: request body was signed')
  }

})

module.exports = paymentsRouter
