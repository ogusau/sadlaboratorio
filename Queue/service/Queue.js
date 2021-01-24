//Load package.json
const pjs = require('./package.json');

//Get some meta info from the package.json
const {name} = pjs;

const ip = require('ip');
const SERVICE_NAME = name;
const SERVICE_NAME_WQR = name + '-worker';
const HOST = ip.address();
const PORT1 = 9008;
const PORT3 = 9007;
const PORT2 = 9999;
const consul = require('consul')({host: '10.0.2.15', port:8500});
const SERVICE_ID1 = require('uuid').v4();
const SERVICE_ID3 = require('uuid').v4();
const SERVICE_ID2 = require('uuid').v4();

const zmq = require('zeromq');
const ansInterval = 2000;
let sc = zmq.socket('router'); // frontend
let wqr = zmq.socket('router'); // worker-queue-report
let sw = zmq.socket('router'); // backed
let qq = zmq.socket('rep'); // backed
let cli = [], req = [], workers = [], tout={}, failed={}, who=[], queues=[];


/***************************************/
//En esta sección se añaden las direcciones del resto del colas
//excluyendose a sí mismas.
/***************************************/
setTimeout(() => {
consul.agent.service.list(function(err, result){
	if (err) throw err;
	for(let i in result)
	{
  		if(result[i].Service.startsWith('queue') && !result[i].Service.endsWith('-worker') && (result[i].Address != HOST))
  		{
  			queues.push(result[i].Address);
  			console.log('Cola anyadida: ' + result[i].Address);
  		}
  		else{
  			console.log('Cola servicio no anayadido: ' + result[i].Address + ' y con servicename: ' + result[i].Service);
  		}
	}
});
}, 15000);


/***************************************/
//En esta función queremos preguntar periodicamente
//si se da el caso de que tengamos workers apilados
//pero aún no tengamos trabajos pendientes.
//Se trata de no secuestrar workers que podrían estar
//trabajando.
/***************************************/

setInterval(() => {
	if((workers.length > 0) && (who.length == 0))
		askForFreeQueue(queues, workers.shift());	
}, 5000);

sc.bind('tcp://*:9008', (err)=> {
	console.log(err?"sc binding error":"accepting client requests");
	});
	
wqr.bind('tcp://*:9007', (err)=> {
	console.log(err?"wqr binding error":"accepting client requests");
	});

sw.bind('tcp://*:9999', (err)=> {
	console.log(err?"sc binding error":"accepting worker requests");
	});
	
qq.bind('tcp://*:9005', (err)=> {
	console.log(err?"sc binding error":"accepting client requests");
});


console.log('Im listening on IP: ' + HOST + ' now...');

var check1 = {
	id: SERVICE_ID1,
	name: SERVICE_NAME,
	address: HOST,
	port: PORT1,
	check: {
		tcp: HOST+':'+PORT1,
		ttl: '5s',
		interval: '5s',
		timeout: '5s',
		deregistercriticalserviceafter: '15s'
	}
};

var checkwqr = {
	id: SERVICE_ID3,
	name: SERVICE_NAME_WQR,
	address: HOST,
	port: PORT3,
	check: {
		tcp: HOST+':'+PORT3,
		ttl: '5s',
		interval: '5s',
		timeout: '5s',
		deregistercriticalserviceafter: '15s'
	}
};

consul.agent.service.register(check1, function(err) {
	if (err) throw err;
});
consul.agent.service.register(checkwqr, function(err) {

	if (err) throw err;
});


function dispatch(c,m){
	console.log("Mensaje recibido:"+ m);
	if (workers.length)
		sendToW(workers.shift(),c,m);
	else {
		who.push(c); req.push(m);
	}
};

function resend(w,c,m){
	return function(){
		failed[w]=true;
		dispatch(c,m);
	}
};

function sendToW(w,c,m){
	sw.send([w,'',c,'',m]);
	tout[w]=setTimeout(resend(w,c,m), ansInterval);
};

sc.on('message', (c,sep,m) => dispatch(c,m));

sw.on('message', (w,sep,c,sep2,r)=> {
	if (failed[w]) return;
	if (tout[w]) {
		clearTimeout(tout[w]);
		delete tout[w];
	}
	if (c)  console.log("Respuesta enviada: "+ r.toString()); sc.send([c,'',r]);
	if (who.length){
		sendToW(w,who.shift(),req.shift());
	} else workers.push(w)	;
});
	
wqr.on('message', (w,sep,m)=> {
	if(who.length > 0)	
		sendToW(w, who.shift(), req.shift());
	else
		askForFreeQueue(queues, w);	
});


function askForFreeQueue(freeQueues, w){
	if(freeQueues.length == 0){
		workers.push(w);		//En caso de haber llegado al final y no encontrar queues que tengan trabajo, entonces lo apila la propia queue 
		return;
	}
	else
	{
		let qqReq = zmq.socket('req'); // socket de comunicacion entre colas
		qqReq.connect(freeQueues.shift()+':9005');
		qqReq.send('tienes trabajo');		//Le preguntamos a la primera cola si tiene trabajo pendiente
		qqReq.on('message', (msg) =>{
			if(msg == 'SI')	//Si nos responde que SI, le enviarmos la identidad del worker
				qqReq.send(w);
			else{
				askForFreeQueue(freeQueues.shift(), w);	//Si no tiene trabajo, entonces preguntamos a otra cola de forma recursiva
			}
		});
	}
};

qq.on('message', (msg) => {	
	if(msg == 'tienes trabajo'){
		if(who.length != 0)
			qq.send('SI');
		else
			qq.send('NO');
	}
	else
	{
		if(who.length)
			sendToW(msg, who.shift(), req.shift());
	}
});

	
	

