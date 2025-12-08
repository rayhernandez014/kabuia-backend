require('dotenv').config()
const paymentsRouter = require('express').Router()
const crypto = require('crypto')
const Contract = require('../models/contract')
const Product = require('../models/product')
const mongoose = require('mongoose')
const DeliveryRequest = require('../models/deliveryRequest')
const { cancelDeliveryRequest } = require('../utils/deliveryRequests')
const ContractWithDelivery = require('../models/contractWithDelivery')

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

    let httpWarningText

    const session = await mongoose.startSession()
    await session.withTransaction(async () => {

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
            if(ignoreStatus('pending')){
              console.warn(`duplicated event: ${eventType}`)
              httpResponseText = `Warning: duplicated event: ${eventType}`
              return
            }
            newStatus = 'pending'
            break
          case 'InvoiceSettled':
            if(ignoreStatus('settled')){
              console.warn(`duplicated event: ${eventType}`)
              httpResponseText = `Warning: duplicated event: ${eventType}`
              return
            }
            for( const [idx, item] of contract.order.items.entries()){
              await Product.findByIdAndUpdate(item, { $inc: { reservedStock: contract.order.quantities[idx] * -1 } }, {
                new: true,
                runValidators: true,
                context: 'query'
              }).session(session).exec()
            }
            newContractStatus = 'paid'
            newStatus = 'settled'
            break
          case 'InvoiceExpired':        
            if(ignoreStatus('expired')){
              console.warn(`duplicated event: ${eventType}`)
              httpResponseText = `Warning: duplicated event: ${eventType}`
              return
            }
            for( const [idx, item] of contract.order.items.entries()){
              await Product.findByIdAndUpdate(item, { $inc: { stock: contract.order.quantities[idx], reservedStock: contract.order.quantities[idx] * -1 } }, {
                new: true,
                runValidators: true,
                context: 'query'
              }).session(session).exec()
            }
            newContractStatus = 'payment_failed'
            newStatus = 'expired'
            break
          case 'InvoiceInvalid':        
            if(ignoreStatus('invalid')){
              console.warn(`duplicated event: ${eventType}`)
              httpResponseText = `Warning: duplicated event: ${eventType}`
              return
            }
            for( const [idx, item] of contract.order.items.entries()){
              await Product.findByIdAndUpdate(item, { $inc: { stock: contract.order.quantities[idx], reservedStock: contract.order.quantities[idx] * -1 } }, {
                new: true,
                runValidators: true,
                context: 'query'
              }).session(session).exec()
            }
            newContractStatus = 'payment_failed'
            newStatus = 'invalid'
            break
          default:
            console.warn(`Unhandled webhook event type: ${eventType}`)
            httpResponseText = `Warning: Unhandled webhook event type: ${eventType}`
            return
        }

        if(newStatus){

          contract.invoiceHistory = [...contract.invoiceHistory, {
            invoice: invoiceId,
            status: newStatus,
            timestamp: new Date()
          }]

          if(newContractStatus){
            contract.history = [...contract.history, {
              status: newContractStatus,
                timestamp: new Date()
            }]
          }

          await contract.save({ session })

        }

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

        const failureLimitExceeded = () => {
          const failureCount = deliveryRequest.paymentFailureCount
          return failureCount === 2
        }

        switch (eventType) {
          case 'InvoiceProcessing':
            if(ignoreStatus('pending')){
              console.warn(`duplicated event: ${eventType}`)
              httpResponseText = `Warning: duplicated event: ${eventType}`
              return
            }
            newStatus = 'pending'
            break
          case 'InvoiceSettled':
            if(ignoreStatus('settled')){
              console.warn(`duplicated event: ${eventType}`)
              httpResponseText = `Warning: duplicated event: ${eventType}`
              return
            }
            newDeliveryRequestStatus = 'paid'
            newContractStatus = 'awaiting_deliverer'
            newStatus = 'settled'
            break
          case 'InvoiceExpired':        
            if(ignoreStatus('expired')){
              console.warn(`duplicated event: ${eventType}`)
              httpResponseText = `Warning: duplicated event: ${eventType}`
              return
            }
            if(failureLimitExceeded()){
              console.warn('payment failure limit exceeded by user')
              await cancelDeliveryRequest(session, deliveryRequest)
              httpResponseText = 'payment failure limit exceeded by user'
              return
            }
            deliveryRequest.paymentFailureCount++
            newDeliveryRequestStatus = 'payment_failed'
            newStatus = 'expired'
            break
          case 'InvoiceInvalid':        
            if(ignoreStatus('invalid')){
              console.warn(`duplicated event: ${eventType}`)
              httpResponseText = 'payment failure limit exceeded by user'
              return
            }
            if(failureLimitExceeded()){
              console.warn('payment failure limit exceeded by user')
              await cancelDeliveryRequest(session, deliveryRequest)
              httpResponseText = 'payment failure limit exceeded by user'
              return
            }
            deliveryRequest.paymentFailureCount++
            newDeliveryRequestStatus = 'payment_failed'
            newStatus = 'invalid'
            break
          default:
            console.warn(`Unhandled webhook event type: ${eventType}`)
            httpResponseText = `Warning: Unhandled webhook event type: ${eventType}`
            return
        }

        if(newStatus){

          deliveryRequest.invoiceHistory = [...deliveryRequest.invoiceHistory, {
            invoice: invoiceId,
            status: newStatus,
            timestamp: new Date()
          }]

          if(newDeliveryRequestStatus){
            deliveryRequest.status = newDeliveryRequestStatus
          }

          await deliveryRequest.save({ session })

          if(newContractStatus){
            await ContractWithDelivery.findByIdAndUpdate(deliveryRequest.contract, {
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
      }

    })

    response.status(200).send(httpWarningText ?? 'Success: request body was signed')

  }

})

module.exports = paymentsRouter
