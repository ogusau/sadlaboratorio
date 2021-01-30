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
	if(!req.body.inf || !req.body.sup || !req.body.ite) {
		respuesta = {
			error: true,
			codigo: 502,
			mensaje: 'Los campos inf, sup e ite son requeridos'
		};
		return res.json(respuesta);
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
    return res.json({code: 200, response: `${resp}`, responded: `Responded by: ${SERVICE_ID}`});
  });
  
  service.get('/frontEnd/prove', (req, res, next) => {
    return res.json({codigo: 200, mensaje: 'request sended', responded: `Responded by: ${SERVICE_ID}`});
  });
  
  service.get('/', (req, res, next) => {
    return res.json({codigo: 200, mensaje: 'request sended', responded: `Responded by: ${SERVICE_ID}`});
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
