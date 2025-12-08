const ContractWithDelivery = require('../models/contractWithDelivery')

const cancelDeliveryRequest = async (session, deliveryRequest) => {
  
    deliveryRequest.status = 'canceled'

    const updatedDeliveryRequest = await deliveryRequest.save({ session })

    const updatedContract = await ContractWithDelivery.findByIdAndUpdate(updatedDeliveryRequest.contract, {
        $set: {deliveryRequest: null, deliveryOffer: null},
        $push: { 
            deliveryRequestHistory: updatedDeliveryRequest._id
        }
    } , {
        new: true,
        runValidators: true,
        context: 'query'
    }).session(session).exec()

    //notify all candidates
    
    return updatedDeliveryRequest

}

module.exports = {
  cancelDeliveryRequest
}