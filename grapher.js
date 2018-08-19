onmessage = function(e) {
	var calcArray = [];
	var eq = e.data;
	for(var i = 0; i < eq.length; i++) {
		calcArray = calcEquation(eq[i]);
		postMessage(.9+.1*((i+1)/eq.length));
		postMessage(calcArray);
	}
}

function calcEquation(cycleArray) {
	var step = 1000;
	/* x(t) and y(t) are in form
		reCk * cos(kt) - imCk * sin(kt)
		reCk * sin(kt) + imCk * cos(kt)
		respectively. 
	*/
	var keys = Object.keys(cycleArray[0]);
	var calcArray = [];
	calcArray.push(new Array(step).fill([cycleArray[0][0], cycleArray[1][0]]));
	for(var i = 0; i < keys.length-1; i++) {
		var num = ((i+1)%2===1) ? Math.ceil((i+1)/2) : -Math.floor((i+1)/2);
		var cycloidPoints = [];
		for(var j = 0; j < step; j++) {
			var cycNum = num*2*Math.PI*j/step;
			cycloidPoints.push([
				cycleArray[0][num]*Math.cos(cycNum) - cycleArray[1][num]*Math.sin(cycNum),
				cycleArray[0][num]*Math.sin(cycNum) + cycleArray[1][num]*Math.cos(cycNum)
			]);
		}
		calcArray.push(calcArray[i].map((a,j)=>[a[0]+cycloidPoints[j][0], a[1]+cycloidPoints[j][1]]));
	}
	return calcArray;
}