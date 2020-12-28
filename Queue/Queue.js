const zmq = require('zeromq');
let sc = zmq.socket('router'); // frontend
let sw = zmq.socket('dealer'); // backed
let msg = [];

sc.bind('tcp://*:9998');
sw.bind('tcp://*:9999');
sc.on('message', (c,sep,m)=> {sw.send({client: c, msg: m}); msg.push({client: c, msg: m});});
sw.on('message', (m)=> {console.log('A message has arrived: ' + m);});