var axios = require('axios');
var qs = require('qs');

var expected_values = [];
var values = [];

function sleep(ms){
  	return new Promise(resolve => setTimeout(resolve, ms));
  }

async function main(){

	caseExpectedValue();
	await sleep(5000);
	caseAmountOfParams();
	await sleep(5000);
	caseNumbersType();
}
main();

function caseExpectedValue(){
	console.log("Testing expected values");
	var responses = {};
	createValues();
	
	
	for(let i in values){
		var data = qs.stringify({
			'inf': values[i].inf,
			'sup': values[i].sup,
			'ite': values[i].n
		});
		var config = {
		  method: 'post',
		  url: 'http://localhost:8085/frontEnd/integraPI',
		  headers: { 
		    'Content-Type': 'application/x-www-form-urlencoded'
		  },
		  data : data
		};
		
	axios(config)
	.then(function (response) {
	  let resp = response.data.message;
	  if(expected_values[i] == resp){
				console.log('Values are equal => Expected value: ' + expected_values[i] + ' and current value: ' + resp + ' soy la prueba número: ' + i);
			}
			else{
				console.log('Values are NOT equal => Expected value: ' + expected_values[i] + ' and current value: ' + resp + ' soy la prueba número: ' + i);
			}
	})
	.catch(function (error) {
	  console.log(error);

	});
	}
}


function caseAmountOfParams(){
	console.log("Testing amount of params");
	const expected_response = 'The parameters inf, sup and ite are mandatories';	
	var data = qs.stringify({
		'inf': values[0].inf,
		'sup': values[0].sup,
	});
	var config = {
	  method: 'post',
	  url: 'http://localhost:8085/frontEnd/integraPI',
	  headers: { 
	    'Content-Type': 'application/x-www-form-urlencoded'
	  },
	  data : data
	};
		
	axios(config)
	.then(function (response) {
	  let resp = response.data.message;
	  		if(expected_response == resp){
				console.log('Values are equal => Expected response: ' + expected_response + ' and current value: ' + resp + ' prueba número 1');
			}
			else{
				console.log('Values are NOT equal => Expected response: ' + expected_response + ' and current value: ' + resp + + ' prueba número 1');
			}
	})
	.catch(function (error) {
	  console.log(error);
	});
	
	var data1 = qs.stringify({
		'inf': values[0].inf,
		});
		
	config.data = data1;
		
	axios(config)
	.then(function (response) {
	  let resp = response.data.message;
	  		if(expected_response == resp){
				console.log('Values are equal => Expected response: ' + expected_response + ' and current value: ' + resp + ' prueba número 2' );
			}
			else{
				console.log('Values are NOT equal => Expected response: ' + expected_response + ' and current value: ' + resp + ' prueba número 2');
			}
	})
	.catch(function (error) {
	  console.log(error);
	});
	
	var data2 = qs.stringify({
		'ite': values[0].n,
		});
		
	config.data = data2;	
		
	axios(config)
	.then(function (response) {
	  let resp = response.data.message;
	  		if(expected_response == resp){
				console.log('Values are equal => Expected response: ' + expected_response + ' and current value: ' + resp +  ' prueba número 3');
			}
			else{
				console.log('Values are NOT equal => Expected response: ' + expected_response + ' and current value: ' + resp + ' prueba número 3');
			}
	})
	.catch(function (error) {
	  console.log(error);
	});
	
}

function caseNumbersType(){
	console.log("Numbers Type");
	const expected_response = 'The 3 parameters must be a number';
	var data = qs.stringify({
		'inf': 'asd213',
		'sup': '0.1324',
		'ite': '0.4285'
	});
	var config = {
	  method: 'post',
	  url: 'http://localhost:8085/frontEnd/integraPI',
	  headers: { 
	    'Content-Type': 'application/x-www-form-urlencoded'
	  },
	  data : data
	};
		
	axios(config)
	.then(function (response) {
	  let resp = response.data.message;
	  if(expected_response == resp){
				console.log('Values are equal => Expected response: ' + expected_response + ' and current value: ' + resp + ' soy la prueba número: 1');
			}
			else{
				console.log('Values are NOT equal => Expected response: ' + expected_response + ' and current value: ' + resp + ' soy la prueba número: 1');
			}
	})
	.catch(function (error) {
	  console.log(error);
	});
	
	var data1 = qs.stringify({
		'inf': '0.1237',
		'sup': '0.13sdaw',
		'ite': '0.4285'
	});
	
	config.data = data1;
	axios(config)
	.then(function (response) {
	  let resp = response.data.message;
	  if(expected_response == resp){
				console.log('Values are equal => Expected response: ' + expected_response + ' and current value: ' + resp + ' soy la prueba número: 2');
			}
			else{
				console.log('Values are NOT equal => Expected response: ' + expected_response + ' and current value: ' + resp + ' soy la prueba número: 2');
			}
	})
	.catch(function (error) {
	  console.log(error);
	});
	
	var data2 = qs.stringify({
		'inf': '0.1437',
		'sup': '0.1331',
		'ite': 'nosoynumero'
	});
	
	config.data = data2;
	axios(config)
	.then(function (response) {
	  let resp = response.data.message;
	  if(expected_response == resp){
				console.log('Values are equal => Expected response: ' + expected_response + ' and current value: ' + resp + ' soy la prueba número: 3');
			}
			else{
				console.log('Values are NOT equal => Expected response: ' + expected_response + ' and current value: ' + resp + ' soy la prueba número: 3');
			}
	})
	.catch(function (error) {
	  console.log(error);
	});
	
}






function createValues(){
	
	
	var val = {};
	val.inf = (Math.PI/4.0).toString();
	val.sup = (Math.PI/2.0).toString();
	val.n = '35';
	values.push(val);
	expected_values[0] = '0.7037908546654612';
	
	var val1 = {};
	val1.inf = (Math.PI/4.0).toString();
	val1.sup = ((2.0*Math.PI)/3.0).toString();
	val1.n = '40';
	values.push(val1);
	expected_values[1] = '1.2043987530872498';
	
	var val2 = {};
	val2.inf = (Math.PI/6.0).toString();
	val2.sup = ((3.0*Math.PI)/4.0).toString();
	val2.n = '45';
	values.push(val2);
	expected_values[2] = '1.5686976181324828';
	

	
}
