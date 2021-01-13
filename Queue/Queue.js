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
	
	
	

