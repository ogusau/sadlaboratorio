//Load package.json
const pjs = require('../package.json');
//Get some meta info from the package.json
const {name} = pjs;
const SERVICE_NAME = name;
const config = require('../config')[process.env.NODE_ENV || 'development'];
const log = config.log();
const SERVICE_ID= config.serviceID;

const Perf = require('perf_hooks');

const ip = require('ip');
const HOST = ip.address();
const PORT2 = 9005;
const consul = require('consul')({host: '172.16.238.2', port:8500});

const queues = new Set();

const registryInterval = 10000;
const askForJobInterval = 3000;
const expireInterval = 20000;
const askStatusJobInterval = 2000;

const zmq = require('zeromq');

let who = [], req = [], workers = [], responded = [], blacklist = [];
let qb = zmq.socket('router');
let qq = zmq.socket('rep');			//Socket para comunicacion entre queues


qb.bind('tcp://*:9999', (err)=> {
	log.debug(err?"qb binding error":"accepting client requests");
});

qq.bind('tcp://*:'+PORT2, (err)=> {
	log.debug(err?"qq binding error":"accepting queues requests");
});


var check = {
	id: SERVICE_ID,
	name: SERVICE_NAME,
	address: HOST,
	port: PORT2,
	check: {
		tcp: HOST+':'+PORT2,
		ttl: '5s',
		interval: '5s',
		timeout: '5s',
		deregistercriticalserviceafter: '15s'
	}
};
consul.agent.service.register(check, function(err) {
	if (err) throw err;
});

/***************************************/
//En esta sección se añaden las direcciones del resto del queues
//excluyendose a sí misma. Se comprueba de forma periodica ya que en
//cualquier momento podria añadirse una nueva queue 
/***************************************/
setInterval(() => {
consul.agent.service.list(function(err, result){
	if (err) throw err;
	for(let i in result)
	{
  		if(result[i].Service.startsWith(SERVICE_NAME) && (result[i].Address != HOST))
  			queues.add(result[i].Address);
	}
});
}, registryInterval);


/***************************************/
//En esta función queremos preguntar periodicamente
//si se da el caso de que tengamos workers apilados
//pero aún no tengamos trabajos pendientes.
//Se trata de no secuestrar workers que podrían estar
//trabajando.
/***************************************/

setInterval(() => {
	if((workers.length > 0) && (who.length == 0)){
		let queues_copy = [...queues];
		askForJob(queues_copy, workers.shift());
	}	
}, askForJobInterval);


/******************************************************/
/*Este funcion es la encarga de borrar periodicamente (cada 20s) 
/*aquellos mensajes muy antiguos y que ya no tiene ninguna 
/*utilidad almacenarlos. Por tanto, nos quedamos unicamente
/*con los ultimos de hace 5s
/*****************************************************/
setInterval(deleteExpiredMessages, expireInterval);

function deleteExpiredMessages(){
	var five_sec_ago = Date.now() - 5000;
	var aux1 = filterExpired(five_sec_ago, responded);		//En ambos casos nos quedamos con los mensajes de los ultimos 5s
	var aux2 = filterExpired(five_sec_ago, blacklist);
	responded = aux1;
	blacklist = aux2;
}

function filterExpired(date_to_filter, date_list){
	return date_list.filter((element) => {
		return Number(element.split(" ")[0]) >= date_to_filter;
	});
}

qb.on('message', (id, sep, idusu, sep2, msg, cod) => {
	if(cod == 'peticion'){
		log.debug('A new request has arrived: ' + msg);
		sendToWorker(id, msg);
	}
	if(cod == 'respuesta'){
		qb.send([id, '', '', '', 'OK']);
		var json = JSON.parse(msg);
		if(!blacklist.includes(json.header.toString())){		//Garantizamos que no hayan reenvios del mismo mensaje
			log.debug('Responding the request: ' + json.resp);
			responded.push(json.header.toString());
			qb.send([idusu, '', '', '', json.resp]);
		}
	}
	if(cod == 'disponible'){
		sendToWorkerAvalible(id);	
	}
});

function sendToWorker(idusu, msg){
	if(workers.length > 0){
		sendJob(workers.shift(), idusu, msg);
	}
	else{
		who.push(idusu);
		req.push(msg);
	}
}

function sendToWorkerAvalible(w){
	if(who.length > 0){
		sendJob(w, who.shift(), req.shift());
	}
	else{
		let queues_copy = [...queues];
		askForJob(queues_copy, w);	
	}
}

function sendJob(w, idusu, msg){
	var jsonMsg = addHeader(msg);			//Se añade un timestamp preciso(del orden de nanosegundos) al mensaje original (sirve como identificador unico del mensaje)
	log.debug('Sending job with header: ' +jsonMsg.header);
	qb.send([w, '', idusu, '', JSON.stringify(jsonMsg)]);
	var id_cli = {};
	id_cli.idusu = idusu;
	const result =  Object.assign({}, id_cli, jsonMsg);	
	resend(result);				//Programamos un posible reenvio en 2s
}

function resend(result){
	let queues_copy = [...queues];
	setTimeout(() => {askForJobCompleted(queues_copy, result)}, askStatusJobInterval);
}


/**********************************************/
/*2 segundos despues del envio, es responsabilidad de la queue emisora
/*preguntar al resto si alguna ha recibido y por tanto reenviado ya la respuesta
/*del worker, si ninguna ha recibido la respuesta en 2s desde envio,
/*suponemos que ha fallo y por tanto hay que reenviar
/************************************************/
function askForJobCompleted(freeQueues, result){
	if(!responded.includes(result.header)){			//Comprobamos primero que no haya respondido ya la propia queue antes de preguntar al resto
		if(freeQueues.length == 0){
			var aux = {};
			aux.inf = result.inf;
			aux.sup = result.sup;
			aux.ite = result.ite;
			var msg = JSON.stringify(aux);
			sendToWorker(result.idusu, msg);		//En caso de que ninguna queue le haya llegado la respuesta del worker, entonces asumimos que ha fallado y lo reenviamos
			return;
		}
		else{
			let qqReq = zmq.socket('req'); // socket de comunicacion entre colas
			qqReq.connect('tcp://'+freeQueues[0]+':'+PORT2);
			var x = result.header.toString();
			qqReq.send(['job_responded', x]);		//Le preguntamos al resto de colas si ya han respondido a este mensaje
			qqReq.on('message', (msg, sep) =>{
				if(msg == 'NO'){
					freeQueues.shift();
					askForJobCompleted(freeQueues, result);	//Si no han enviado el trabajo, entonces preguntamos a otra cola de forma recursiva
				}
			});
		}
	}	
}

function addHeader(msg){
	var start = Date.now();
	var nano_seconds = Perf.performance.now();
	var id_header = start.toString() + " " + nano_seconds.toString();
	var jsonMsg = JSON.parse(msg);
	jsonMsg.header = id_header;
	
	return jsonMsg;
}


function askForJob(freeQueues, w){
	if(freeQueues.length == 0){
		workers.push(w);		//En caso de haber llegado al final y no encontrar queues que tengan trabajo, entonces lo apila la propia queue 
		return;
	}
	else
	{
		let qqReq = zmq.socket('req'); // socket de comunicacion entre colas
		qqReq.connect('tcp://'+freeQueues[0]+':'+PORT2);
		qqReq.send(['work_pending', '']);		//Le preguntamos a la primera cola si tiene trabajo pendiente
		qqReq.on('message', (idusu, msg) =>{
			if(idusu != '' && msg != '')
				sendJob(w, idusu, msg);
			else{
				freeQueues.shift();
				askForJob(freeQueues, w);	//Si no tiene trabajo, entonces preguntamos a otra cola de forma recursiva
			}
		});
	}
};

qq.on('message', (cod, msg) => {	
	if(cod == 'work_pending'){		//Si tenemos trabajo pendiente, se lo enviamos a la queue que nos lo solicita
		if(who.length > 0)
			qq.send([who.shift(), req.shift()]);
		else
			qq.send(['', '']);
	}
	if(cod == 'job_responded'){		//Nos preguntan si hemos respondido o no a un determinado mensaje
		var x = msg.toString();
		blacklist.push(x);		//Nos apuntamos el posible mensaje caducado para ignorarlo en caso de que nos llegue del worker  
		if(responded.includes(x))	{		//Miramos en nuestra lista de mensajes respondidos
			qq.send(['YES', '']);	
		}
		else{
			qq.send(['NO', '']);
		}
	}
});































