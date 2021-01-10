const zmq = require('zeromq');
let req = zmq.socket('req');
let id = req.identity='Worker1' +process.pid
req.connect('tcp://172.17.0.4:9999');

console.log('Im listening now...');
console.log('Im number: ' + id);
req.on('message', (c,sep,msg)=> {
	console.log('A new message has arrived: ' + msg.toString());
	setTimeout(()=> {
		req.send([c,'', 'resp'])
	}, 1000);
})
req.send(['','',''])
