exports.integral = (inf, sup, n) => {
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
