var cycles;

onmessage = function(e) {
	var eq = [];
	var paths = e.data[0];
	cycles = e.data[1];
	for(var i = 0; i < paths.length; i++) {
		eq.push(calculate(paths[i], i, paths.length))
	}
	postMessage(eq);
}

function calculate(ft, pathNum, pathTotal) {
	var bottom = -Math.floor(cycles/2);
	var top = Math.ceil(cycles/2);
	// These two objects store Ck values for the epicycloids.
	var reC = {};
	var imC = {};
	var piMult = 2*Math.PI/(ft.length);
	var eachInterval = [];
	var tInterval = [];
	var zeroConstants = [];

	for(var i = 0; i < ft.length; i++) { // Precalculate equations
		var t = [piMult*i, piMult*(i+1)];
		var pt = ft[i];
		var ts = 1/(piMult);
		var shift = poly(new Array(pt.length-1).fill([]));
		var vec = poly(new Array(pt.length).fill([]));

		for(var j = 0; j < pt.length; j++) vec[0] = vec[0].concat(poly([pt[j]]));
		for(var j = 0; j < pt.length-1; j++) {
			for(var k = 0; k < pt.length-1-j; k++) {
				shift[j] = shift[j].concat(polyOp(-ts*t[0], "*", polyOp(vec[j][k+1], "-", vec[j][k])));
				vec[j+1] = vec[j+1].concat(polyOp(polyOp(vec[j][k], "+", shift[j][k]), "+", polyOp(ts, "*", polyOp(vec[j][k+1], "-", vec[j][k]), 1)));	
			}	
		}
		var finalVec = Object.values(vec[pt.length-1][0]);
		eachInterval.push(integralConstants(finalVec, t)); // Precalculate constants for integral.
		zeroConstants.push(integralZero(finalVec, t));
		tInterval.push(t);
	}
	for(var k = bottom; k <= top; k++) { // For every epicycloid
		var reCk = 0; 
		var imCk = 0;

		for(var i = 0; i < ft.length; i++) { // Carry out integral for finding Ck
			var integralPart = (k === 0) ? zeroConstants[i] : integrate(eachInterval[i][0], eachInterval[i][1], tInterval[i], k);
			reCk += integralPart[0];
			imCk += integralPart[1];
		}

		reC[k] = Rnd(reCk/(2*Math.PI),5);
		imC[k] = Rnd(imCk/(2*Math.PI),5); 
		postMessage(.9*((pathNum + (k + (cycles)/2+1)/(cycles+1))/pathTotal)); 
	}
	return [reC, imC];
}

function integralZero(shearConsts, t) {
	var val = Object.values(shearConsts);
	var f = polyOp(poly(val.map((a,i)=>arrOp(a, "/" ,i+1))), "+", poly([0]), 1);
	return arrOp(polySub(f, t[1]), "-",polySub(f, t[0]));
}

function integralConstants(shearConsts, t) { 
	var n = shearConsts.length; // One more than actual order
	/*	Since there are different constants for the real and imaginary polynomials,
		the integrals are now separated. The integral is calculated separately, with the real
		and imaginary portions calculated at the same time, but using the different respective
		constants. The real and imaginary portions that resolve after the integration
		is taken into consideration later.
	*/
	var integralRe = new Array(n).fill([]); 
	var integralIm = new Array(n).fill([]);
	for(var i = 0; i < n; i++) {
		for(var j = 0; j < n-i; j++) {
			if(i === 0) {
				integralRe[i] = integralRe[i].concat([shearConsts[j][0]]);
				integralIm[i] = integralIm[i].concat([shearConsts[j][1]]);
			} else {
				integralRe[i] = integralRe[i].concat([integralRe[i-1][j+1]*(j+1)]);
				integralIm[i] = integralIm[i].concat([integralIm[i-1][j+1]*(j+1)]);
			}
		}
		integralRe[i] = poly(integralRe[i]);
		integralIm[i] = poly(integralIm[i]);
	}

	var fullPolyRe = [{}, {}]; // Real expanded constants
	var fullPolyIm = [{}, {}]; // Imaginary expanded constants
	for(var i = 0; i < n; i++) {
		var neg = (i%4===2 || i%4===3) ? -1 : 1;
		integralRe[i] = [polySub(integralRe[i], t[0]), polySub(integralRe[i], t[1])];
		integralIm[i] = [polySub(integralIm[i], t[0]), polySub(integralIm[i], t[1])];
		//console.log([integralRe, integralIm])
		integralRe[i] = polyOp(poly([integralRe[i]]), "*", neg, -i-1);
		integralIm[i] = polyOp(poly([integralIm[i]]), "*", neg, -i-1);
		if(i%2===0) {
			fullPolyIm[0] = Object.assign(fullPolyIm[0], integralRe[i]);
			fullPolyRe[1] = Object.assign(fullPolyRe[1], integralIm[i]);
		} else {
			fullPolyRe[0] = Object.assign(fullPolyRe[0], integralRe[i]);
			fullPolyIm[1] = Object.assign(fullPolyIm[1], integralIm[i]);
		}
	}
	return [fullPolyRe, fullPolyIm];
}

function integrate(kRe, kIm, t, k) {
	var c = [
		polySub(kRe[0], k),
		polySub(kIm[0], k),
		arrOp(-1,"*",polySub(kRe[1], k)),
		polySub(kIm[1], k),
		[Math.sin(k*t[0]), Math.sin(k*t[1])],
		[Math.cos(k*t[0]), Math.cos(k*t[1])]
	];
	c = c[0].map((a,i)=>c.map(b=>b[i]));

	function reCki(c) {
		return c[4]*(c[1]+c[3]) + c[5]*(c[0]+c[2]);
	}

	function imCki(c) {
		return c[5]*(c[1]+c[3]) - c[4]*(c[0]+c[2]);
	}

	return [(reCki(c[1]) - reCki(c[0])), (imCki(c[1]) - imCki(c[0]))];
}

function arrOp(arr1, op, arr2) { // Applies operator arr1n (op) arr2n thus not following normal vector rules.
	if(arr1.length === undefined) arr1 = new Array(arr2.length).fill(arr1);
	if(arr2.length === undefined) arr2 = new Array(arr1.length).fill(arr2);
	return arr1.map((a,i)=>eval(a+op+"("+arr2[i]+")"));		
}

function poly(list) {
	var obj = {};
	for(var i = 0; i < list.length; i++) obj[i] = list[i];
	return obj;
}

function polyOp(poly1, op, poly2, pow) {
	pow = pow || 0;
	var obj = {};
	var which = poly1;
	if(Object.keys(poly1).length === 0)  {
		poly1 = poly(new Array(Object.keys(poly2).length).fill(poly1));
		which = poly2;
	}
	if(Object.keys(poly2).length === 0) {
		poly2 = poly(new Array(Object.keys(poly1).length).fill(poly2));
		which = poly1;
	}
	var greater = poly1;
	if(Object.keys(poly2).length > Object.keys(poly1).length) greater = poly2;
	Object.keys(greater).map(function(a) {
		if((poly1[a] || []).length > 1 || (poly2[a] || []).length > 1) {
			obj[parseInt(a)+pow] = arrOp((poly1[a] || 0), op, (poly2[a] || 0));
			for(var i = 0; i < pow; i++) obj[i] = new Array(which[a].length).fill(0);
		} else {
			obj[parseInt(a)+pow] = eval((poly1[a] || 0) + op + "("+(poly2[a] || 0)+")");
			for(var i = 0; i < pow; i++) obj[i] = 0;
		}
	});
	return obj;
}

function polySub(poly, x) {
	var key = Object.keys(poly);
	var val = Object.values(poly).map((a,i)=>arrOp(a,"*",Math.pow(x,parseInt(key[i])))).reduce((a,b)=>arrOp(a,"+",b))
	return (val.length === 1) ? val[0] : val;
}

function varType(variable) {
  var type = typeof variable;
  if(type === "object") {
      return (variable.constructor === Array) ? "Array" : "Object";  
  } else {
    return type[0].toUpperCase() + type.slice(1);
  }
}

function Rnd(item,fig) {
	if(varType(item) === "Array") {
		var arr = [];
		for(var i = 0; i < item.length; i++) {
			arr[i] = Rnd(item[i],fig);
		}
		return arr;
	} else if(varType(item) === "Number") {
		return Math.round(item*Math.pow(10,fig))/Math.pow(10,fig);
	} else {
		throw new TypeError("Expected Integers, got " + varType(item) + ".");
	}
}