const zmq = require('zeromq');
let rep = zmq.socket('rep');
rep.connect('tcp://localhost:9999');

console.log('Im listening now...');
rep.on('message', (msg)=> {
	console.log('A new message has arrived: ' + msg.toString());
	setTimeout(()=> {
		rep.send(msg);
	}, 1000);
})