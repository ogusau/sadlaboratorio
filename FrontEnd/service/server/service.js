const express = require('express');
const zmq = require('zeromq');
const bodyParser = require("body-parser");

const service = express();
let req = zmq.socket('req');

module.exports = (config) => {
  const log = config.log();
  
  req.connect('tcp://localhost:9998');
  /*req.on('message', (msg)=> {
	console.log('resp: '+msg)
	process.exit(0);
  });*/
  
  service.use(bodyParser.urlencoded({ extended: false }));
  service.use(bodyParser.json());
  
  // Add a request logging middleware in development mode
  if (service.get('env') === 'development') {
    service.use((req, res, next) => {
      log.debug(`${req.method}: ${req.url}`);
      return next();
    });
  }

  service.post('/frontEnd/integraPI', (req, res, next) => {
	console.log("El body contiene: " + req.body);
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
	req.send(mensaje);
    return res.json({codigo: 200, mensaje: 'request sended'});
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
