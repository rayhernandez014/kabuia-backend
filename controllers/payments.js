require('dotenv').config()
const paymentsRouter = require('express').Router()
const crypto = require('crypto');
const Contract = require('../models/contract');
const Product = require('../models/product');
const mongoose = require('mongoose');

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

    const contract = await Contract.findOne({invoice: invoiceId}).session(session).exec()

    if(!contract){
      throw new Error('invalid invoice id', { cause: { title: 'UserError', code: 404} })
    }

    let newStatus;
    switch (type) {
      case 'InvoiceCreated':
        newStatus = 'created';
        await Contract.findByIdAndUpdate(contract._id, {
          invoiceStatus: newStatus
        } , {
          new: true,
          runValidators: true,
          context: 'query'
        }).session(session).exec()
        break;
      case 'InvoiceReceivedPayment':
      case 'InvoiceProcessing':
        newStatus = 'pending';
        await Contract.findByIdAndUpdate(contract._id, {
          invoiceStatus: newStatus
        } , {
          new: true,
          runValidators: true,
          context: 'query'
        }).session(session).exec()
        break;
      case 'InvoiceSettled':
      case 'InvoicePaymentSettled':
        newStatus = 'settled';
        for( const [idx, item] of contract.order.items.entries()){
          await Product.findByIdAndUpdate(item, { $inc: { reservedStock: contract.order.quantities[idx] * -1 } }, {
            new: true,
            runValidators: true,
            context: 'query'
          }).session(session).exec()
        }

        await Contract.findByIdAndUpdate(contract._id, {
          $push: { history: {
              status: 'paid',
              timestamp: new Date()
            } 
          },
          invoiceStatus: newStatus
        } , {
          new: true,
          runValidators: true,
          context: 'query'
        }).session(session).exec()

        break;
      case 'InvoiceExpired':
        newStatus = 'expired';
        for( const [idx, item] of contract.order.items.entries()){
          await Product.findByIdAndUpdate(item, { $inc: { stock: contract.order.quantities[idx], reservedStock: contract.order.quantities[idx] * -1 } }, {
            new: true,
            runValidators: true,
            context: 'query'
          }).session(session).exec()
        }
        await Contract.findByIdAndUpdate(contract._id, {
          invoiceStatus: newStatus
        } , {
          new: true,
          runValidators: true,
          context: 'query'
        }).session(session).exec()
        break;
      case 'InvoiceInvalid':
        newStatus = 'invalid';
        for( const [idx, item] of contract.order.items.entries()){
          await Product.findByIdAndUpdate(item, { $inc: { stock: contract.order.quantities[idx], reservedStock: contract.order.quantities[idx] * -1 } }, {
            new: true,
            runValidators: true,
            context: 'query'
          }).session(session).exec()
        }
        await Contract.findByIdAndUpdate(contract._id, {
          invoiceStatus: newStatus
        } , {
          new: true,
          runValidators: true,
          context: 'query'
        }).session(session).exec()
        break;
      default:
        console.warn(`Unhandled webhook event type: ${type}`);
        return; // Ignore unhandled events to avoid transaction failure
    }

    await session.commitTransaction()
    session.endSession()
    request.mongoSession = null

    // Your own processing code goes here. E.g. update your internal order id depending on the invoice payment status.

    response.status(200).send('Success: request body was signed')
  }

})

module.exports = paymentsRouter
