const express = require('express');
const zmq = require('zeromq');

const service = express();
let req_socket = zmq.socket('req');

module.exports = (config) => {
  const log = config.log();
  const SERVICE_ID = config.serviceID;
  
  req_socket.connect('tcp://172.17.0.4:9998');
  log.debug('Connected to zmq');
  /*req.on('message', (msg)=> {
	console.log('resp: '+msg)
	process.exit(0);
  });*/
  
  service.use(express.urlencoded({
		extended: true
	}));
  
  // Add a request logging middleware in development mode
  if (service.get('env') === 'development') {
    service.use((req, res, next) => {
      log.debug(`${req.method}: ${req.url}`);
      return next();
    });
  }

  service.post('/frontEnd/integraPI', (req, res, next) => {
	console.log("El body contiene: " + req.body.inf);
	
	if(!req.body.inf || !req.body.sup || !req.body.ite) {
		respuesta = {
			error: true,
			codigo: 502,
			mensaje: 'Los campos inf, sup e ite son requeridos'
		};
		return res.json(respuesta);
	}
	mensaje = {
		uri: '/integraPI',
		method: 'POST',
		inf: req.body.inf,
		sup: req.body.sup,
		ite: req.body.ite
	};
	log.debug('Sending message: ' + JSON.stringify(mensaje));
	req_socket.send(JSON.stringify(mensaje));
    return res.json({codigo: 200, mensaje: 'request sended', responded: `Responded by: ${SERVICE_ID}`});
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
