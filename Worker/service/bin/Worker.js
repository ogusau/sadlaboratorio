// Load package.json
const pjs = require('../package.json');
// Get some meta info from the package.json
const { name, version } = pjs;
const config = require('../config')[process.env.NODE_ENV || 'development'];
const log = config.log();

const consul = require('consul')({host: '172.17.0.2', port:8500});
const maths = require('Utilities');

const zmq = require('zeromq');
let req = zmq.socket('req');
let PORT_Q = 9999;
const queues = new Set();
let primera = true;

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
					req.connect('tcp://' + ip + ':' + PORT_Q);
					hasElements++;
	  			}
			}
		}
		if(hasElements > 0 && primera){
			log.debug('Reporting for new Job');
			req.send(['','','estoy_disponible','disponible']);
			primera = false;
		}
	});
};

setInterval(heartBeats, 8000);
heartBeats();

req.on('message', (idusu, sep, msg) => {
	if(msg != 'OK'){
		log.debug('A new message has arrived: ' + msg);
		let jsonMsg = JSON.parse(msg);
		let integral_value = maths.integral(jsonMsg.inf, jsonMsg.sup,jsonMsg.ite);
		let respuesta = '' + integral_value;
		req.send([idusu, '', respuesta, 'respuesta']);
		log.debug('The message has been responded: ' + respuesta);
	}
	else{
		log.debug('Reporting for new Job');
		req.send(['', '', '', 'disponible']);
	}	
});




