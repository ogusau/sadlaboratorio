//Load package.json
const pjs = require('./package.json');

//Get some meta info from the package.json
const {name} = pjs;

const ip = require('ip');
const SERVICE_NAME = name;
const SCHEME = 'http';
const HOST = ip.address();
const PORT1 = 9998;
const PORT2 = 9999;
const consul = require('consul')({host: '10.0.2.15', port:8500});
const SERVICE_ID = require('uuid').v4();

const zmq = require('zeromq');
const ansInterval = 2000;
let sc = zmq.socket('router'); // frontend
let sw = zmq.socket('router'); // backed
let cli = [], req = [], workers = [], tout={}, failed={}, who=[];


sc.bind('tcp://*:9998', (err)=> {
	console.log(err?"sc binding error":"accepting client requests");
	});

sw.bind('tcp://*:9999', (err)=> {
	console.log(err?"sc binding error":"accepting worker requests");
	});

console.log('Im listening now...');

var check1 = {
	id: SERVICE_ID,
	name: SERVICE_NAME,
	addres: HOST,
	port: PORT1,
	check: {
		tcp: HOST+':'+PORT1,
		ttl: '5s',
		interval: '5s',
		timeout: '5s',
		deregistercriticalserviceafter: '1m'
	}
};

var check2 = {
	id: SERVICE_ID,
	name: SERVICE_NAME,
	addres: HOST,
	port: PORT2,
	check: {
		tcp: HOST+':'+PORT2,
		ttl: '5s',
		interval: '5s',
		timeout: '5s',
		deregistercriticalserviceafter: '1m'
	}
};

consul.agent.service.register(check1, function(err) {
	if (err) throw err;
});

consul.agent.service.register(check2, function(err) {
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
	
	
	

