const express = require('express');
const zmq = require('zeromq');

const service = express();
let dealer = zmq.socket('dealer');
const consul = require('consul')({host: '172.16.238.2', port:8500});
let PORT_Q = '9999';
const queues = new Set();
let primera = true;

let isDone = true;
let resp = '';

module.exports = (config) => {
  const log = config.log();
  const SERVICE_ID = config.serviceID;
  
  function sleep(ms){
  	return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  function heartBeats(){
	consul.agent.service.list(function(err, result){
		let hasElements = 0;
		if (err) throw err;
		for(let i in result)
		{
	  		if(result[i].Service.startsWith('Queue')){
	  			let lastSize = queues.size;
	  			queues.add(result[i].Address);
	  			if(queues.size > lastSize){
	  				let ip = result[i].Address;
					dealer.connect('tcp://' + ip + ':' + PORT_Q);
					hasElements++;
	  			}
			}
		}
		if(hasElements > 0 && primera){
			primera = false;
		}
	});
  };
  
  setInterval(heartBeats, 8000);
  heartBeats();
  
  dealer.on('message', (sep, idusu, sep2, msg) => {
	log.debug('Respuesta recibida: ' + msg);
	resp = msg;
  	isDone = false;
  });

  service.use(express.urlencoded({
		extended: true
	}));
  
  service.post('/frontEnd/integraPI', async (req, res, next) => {
	isDone = true;
	var infoerror = validateInput(req);
	if(infoerror != 'OK'){
		let reponse = {
			code: 502,
			message: infoerror,
			responded: `Responded by: ${SERVICE_ID}`
		};
		return res.json(reponse);	
	}
	
	let mensaje = {
		inf: req.body.inf,
		sup: req.body.sup,
		ite: req.body.ite
	};
	log.debug('Sending message: ' + JSON.stringify(mensaje));
	dealer.send(['','','', JSON.stringify(mensaje), 'peticion']);
	while(isDone){
		await sleep(300);
	}
    return res.json({code: 200, message: `${resp}`, responded: `Responded by: ${SERVICE_ID}`});
  });
  
  function validateInput(req){
  	if(!req.body.inf || !req.body.sup || !req.body.ite) {
		return 'The parameters inf, sup and ite are mandatories';	
	}	
	if(isNaN(req.body.inf) || isNaN(req.body.sup) || isNaN(req.body.ite)){
		return 'The 3 parameters must be a number'
	}
	return 'OK';
  }
  
  service.get('/frontEnd/prove', (req, res, next) => {
    return res.json({code: 200, message: 'request sended', responded: `Responded by: ${SERVICE_ID}`});
  });
  
  service.get('/', (req, res, next) => {
    return res.json({code: 200, message: 'request sended', responded: `Responded by: ${SERVICE_ID}`});
  });

  // eslint-disable-next-line no-unused-vars
  service.use((error, req, res, next) => {
    res.status(error.status || 500);
    // Log out the error to the console
    log.error(error);
    return res.json({
      error: {
        message: error.message,
      },
    });
  });
  return service;
};
