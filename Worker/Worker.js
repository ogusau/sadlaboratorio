const zmq = require('zeromq');
let req = zmq.socket('req');
let id = req.identity='Worker1' +process.pid;
var area, resultado_integral, x, inf, sup, inc, i, n;
req.connect('tcp://localhost:9999');

console.log('Im listening now...');
console.log('Im number: ' + id);
req.on('message', (c,sep,msg)=> {
	console.log('A new message has arrived: ' + msg);
	let jsonMsg = JSON.parse(msg);
	resultado_integral = integra(jsonMsg.inf,jsonMsg.sup,jsonMsg.ite);
	setTimeout(()=> {
		req.send([c,'', resultado_integral])
		console.log('Respuesta enviada a la cola r: ' + resultado_integral);
	}, 1000);
})
req.send(['','',''])

function integra(inf,sup,n){
	let inf1 = Number.parseFloat(inf);
	let sup1 = Number.parseFloat(sup);
	let n1 = Number.parseInt(n);
	let integral= 0.0;
	let i = 0;
	let inc = 0.0;
	inc=(sup1-inf1)/n1;
	area= 0.0;
	x= inf1;
	while (i<n){
		area += Math.sin(x);
		x = x+inc;
		i++;
	}
	integral = area*inc;
	return integral;
}



