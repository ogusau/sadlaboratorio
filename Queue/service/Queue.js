const zmq = require('zeromq');
let sc = zmq.socket('router'); // frontend
let sw = zmq.socket('router'); // backed
let cli = [], req = [], workers = [];

sc.bind('tcp://*:9998');
sw.bind('tcp://*:9999');
console.log('Im listening now...');
sc.on('message', (c,sep,m)=> {
	if (workers.length==0) {
		cli.push(c); req.push(m);
	} else {
	sw.send([workers.shift(),'',c,'',m]); 
	console.log('A new message has arrived: ' + m); }});

sw.on('message', (w,sep,c,sep2,r)=> {
	console.log('A new message has arrived: ' + r);
	if (c=='') { workers.push(w); return}
	if (cli.lenght>0) {
		 sw.send([w, '',
		  cli.shift(),'',req.shift()]); 
	} else {workers.push(w);}
	//sc.send([c,'',r]); 
});
	
	
	

