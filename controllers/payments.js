require('dotenv').config()
const paymentsRouter = require('express').Router()
const crypto = require('crypto')
const Contract = require('../models/contract')
const Product = require('../models/product')
const mongoose = require('mongoose')
const DeliveryRequest = require('../models/deliveryRequest')

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

    const { invoiceId, type: eventType, metadata } = request.body

    console.log(request.body)

    const invoiceType = metadata?.type

    if (!invoiceType || !['order', 'delivery'].includes(invoiceType)) {
      console.warn(`Unknown invoice type: ${invoiceType}`)
      return response.status(400).send('Invalid invoice type in metadata')
    }

    const session = await mongoose.startSession()
    request.mongoSession = session
    session.startTransaction()  

    //filter by invoice type and remove when canceled

    let newStatus
    let newContractStatus

    if (invoiceType === 'order') {

      const contract = await Contract.findOne({currentInvoice: invoiceId}).session(session).exec()

      if(!contract){
        throw new Error('invalid invoice id', { cause: { title: 'UserError', code: 404} })
      }

      const ignoreStatus = (newStatus) => {
        const ignoreStatus = Boolean(contract.invoiceHistory.find((event)=>{ return (([newStatus, 'settled'].includes(event.status)) && (event.invoice === invoiceId)) }))
        return ignoreStatus
      }    

      switch (eventType) {
        case 'InvoiceProcessing':
          newStatus = 'pending'
          if(ignoreStatus(newStatus)){
            console.warn(`duplicated event: ${eventType}`)
            return response.status(200).send(`Warning: duplicated event: ${eventType}`)
          }
          break
        case 'InvoiceSettled':
          newStatus = 'settled'
          if(ignoreStatus(newStatus)){
            console.warn(`duplicated event: ${eventType}`)
            return response.status(200).send(`Warning: duplicated event: ${eventType}`)
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
          if(ignoreStatus(newStatus)){
            console.warn(`duplicated event: ${eventType}`)
            return response.status(200).send(`Warning: duplicated event: ${eventType}`)
          }
          for( const [idx, item] of contract.order.items.entries()){
            await Product.findByIdAndUpdate(item, { $inc: { stock: contract.order.quantities[idx], reservedStock: contract.order.quantities[idx] * -1 } }, {
              new: true,
              runValidators: true,
              context: 'query'
            }).session(session).exec()
          }
          newContractStatus = 'payment_failed'
          break
        case 'InvoiceInvalid':        
          newStatus = 'invalid'
          if(ignoreStatus(newStatus)){
            console.warn(`duplicated event: ${eventType}`)
            return response.status(200).send(`Warning: duplicated event: ${eventType}`)
          }
          for( const [idx, item] of contract.order.items.entries()){
            await Product.findByIdAndUpdate(item, { $inc: { stock: contract.order.quantities[idx], reservedStock: contract.order.quantities[idx] * -1 } }, {
              new: true,
              runValidators: true,
              context: 'query'
            }).session(session).exec()
          }
          newContractStatus = 'payment_failed'
          break
        default:
          console.warn(`Unhandled webhook event type: ${eventType}`)
          return response.status(200).send(`Warning: Unhandled webhook event type: ${eventType}`)
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

    }

    else if(invoiceType === 'delivery'){   

      const deliveryRequest = await DeliveryRequest.findOne({currentInvoice: invoiceId}).session(session).exec()

      if(!deliveryRequest){
        throw new Error('invalid invoice id', { cause: { title: 'UserError', code: 404} })
      }

      let newDeliveryRequestStatus

      const ignoreStatus = (newStatus) => {
        const ignoreStatus = Boolean(deliveryRequest.invoiceHistory.find((event)=>{ return (([newStatus, 'settled'].includes(event.status)) && (event.invoice === invoiceId)) }))
        return ignoreStatus
      } 

      switch (eventType) {
        case 'InvoiceProcessing':
          newStatus = 'pending'
          if(ignoreStatus(newStatus)){
            console.warn(`duplicated event: ${eventType}`)
            return response.status(200).send(`Warning: duplicated event: ${eventType}`)
          }
          break
        case 'InvoiceSettled':
          newStatus = 'settled'
          if(ignoreStatus(newStatus)){
            console.warn(`duplicated event: ${eventType}`)
            return response.status(200).send(`Warning: duplicated event: ${eventType}`)
          }
          newDeliveryRequestStatus = 'paid'
          newContractStatus = 'awaiting_deliverer'
          break
        case 'InvoiceExpired':        
          newStatus = 'expired'
          if(ignoreStatus(newStatus)){
            console.warn(`duplicated event: ${eventType}`)
            return response.status(200).send(`Warning: duplicated event: ${eventType}`)
          }
          newDeliveryRequestStatus = 'payment_failed'
          break
        case 'InvoiceInvalid':        
          newStatus = 'invalid'
          if(ignoreStatus(newStatus)){
            console.warn(`duplicated event: ${eventType}`)
            return response.status(200).send(`Warning: duplicated event: ${eventType}`)
          }
          newDeliveryRequestStatus = 'payment_failed'
          break
        default:
          console.warn(`Unhandled webhook event type: ${eventType}`)
          return response.status(200).send(`Warning: Unhandled webhook event type: ${eventType}`)
      }

      if(newDeliveryRequestStatus){
        deliveryRequest.status = newDeliveryRequestStatus
      }

      deliveryRequest.invoiceHistory = [...deliveryRequest.invoiceHistory, {
        invoice: invoiceId,
        status: newStatus,
        timestamp: new Date()
      }]

      await deliveryRequest.save({ session })

      if(newContractStatus){
        await Contract.findByIdAndUpdate(deliveryRequest.contract, {
          $push: { history: {
              status: newContractStatus,
              timestamp: new Date()
            } 
          }
        }, {
          new: true,
          runValidators: true,
          context: 'query'
        }).session(session).exec()
      }
    }

    await session.commitTransaction()
    session.endSession()
    request.mongoSession = null

    response.status(200).send('Success: request body was signed')
  }

})

module.exports = paymentsRouter
