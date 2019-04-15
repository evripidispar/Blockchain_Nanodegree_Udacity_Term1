const bitcoinMessage = require('bitcoinjs-message')
const TimeoutRequestsWindowTime = 5*60*1000

class Mempool{
	constructor(mempool, timeoutRequests, mempoolValid) {
		this.mempool = mempool;
		this.timeoutRequests = timeoutRequests;
		this.mempoolValid = mempoolValid;
	}

	AddRequestValidation(address){
		let timestamp = Date.now()
		let message = `${address}:${timestamp}:starRegistry`
		let validationWindow = TimeoutRequestsWindowTime/1000

		const requestObject = {
			walletAddress: address,
			requestTimeStamp: timestamp,
			validationWindow: validationWindow,
			message: message
		}

		//Add request validation (new or update existing that have not timeout)
		if((!this.mempool.hasOwnProperty(address)) || ((this.mempool.hasOwnProperty(address)) && (this.isExpired(address)))){
			console.log('Add new request')
			this.mempool[address] = {message, timestamp, validationWindow}
			console.log(this.mempool[address])
			//this.timeoutRequests[address] = setTimeout(function(){delete this.mempool[address]}, TimeoutRequestsWindowTime)
			return requestObject
		}
		else {
			let timeElapse = Date.now() - this.mempool[address].timestamp
			let timeLeft = Math.floor((TimeoutRequestsWindowTime-timeElapse)/1000)

			this.mempool[address].message = message
			this.mempool[address].validationWindow = timeLeft

			requestObject.validationWindow = timeLeft
			console.log('existing request')
			return requestObject
		}
	}

	validateRequestByWallet(address, signature){
		let isValid = false
		if(!this.mempool.hasOwnProperty(address)){
			throw new Error ('Address has not requested validation')
		}
		
		if (this.mempoolValid.hasOwnProperty(address)){
			let validRequest = this.mempoolValid[address]
			console.log('Existing Validated Request')
			return validRequest
		}

		if(!this.isExpired(address)){
			let status = {
				address: address,
				requestTimeStamp: this.mempool[address].timestamp,
				message: this.mempool[address].message,
				validationWindow: this.mempool[address].validationWindow,
				messageSignature: false
			}

			let validRequest = {
				registerStar: false,
				status: status
			}

			try{
				isValid = bitcoinMessage.verify(this.mempool[address].message, address, signature)
				console.log(isValid)
			} catch (error){
				isValid = false
				validRequest.registerStar = false
				throw new Error ('Verification not performed')
			}

			validRequest.status.messageSignature = isValid
			if (isValid){
				validRequest.registerStar = true
				this.mempoolValid[address] = validRequest
				console.log(validRequest)
				return validRequest	
			}
			else{
				throw new Error ('Signature verification failed')
			}
		}
		else{
			throw new Error ('Expired Request, please submit again')
		}
	}

	removeValidationRequest(address){
		delete this.mempool[address]
		delete this.mempoolValid[address]
	}

	isExpired(address){
		let validationStartTimer = Date.now() - TimeoutRequestsWindowTime
		if (this.mempool[address].timestamp < validationStartTimer){
			return true
		}
		else { 
			return false
		}
	}
}

module.exports = Mempool