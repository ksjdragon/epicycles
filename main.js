var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");
var graphColors = [
	"#E57373","#F06292","#BA68C8","#9575CD","#7986CB",
	"#64B5F6","#4FC3F7","#4DD0E1","#4DB6AC","#81C784",
	"#AED581","#CDDC39","#FFEB3B","#FFD54F","#FFB74D",
	"#FF8A65"
];

var allSets = [];
var calcIndex;
var loadStart = null;
var loadFrame;
var percent = 0;

var f = new FontFace('Poppins', 'url(https://fonts.gstatic.com/s/poppins/v5/pxiEyp8kv8JHgFVrJJbecmNE.woff2)');
var fourier = new Worker("fourier.js");
var grapher = new Worker("grapher.js");

$(document).ready(function() {
	var dim = document.getElementById("graph").getBoundingClientRect();
	canvas.width = dim.width;
	canvas.height = dim.height;
	f.load().then(function() {
		drawGraphBase();
	});
});

document.onclick = function() {
	var close = document.getElementsByClassName("colSel");
	for(var i = 0; i < close.length; i++) {
		var div = close[i];
		div.style.opacity = "0";
		setTimeout(function() {
			div.style.display = "none";
		}, 300);
	}
}

fourier.onmessage = function(e) {
	var result = e.data;
	if(result.length === undefined) {
		percent = result;
	} else {
		var thisSet = allSets[calcIndex];
		thisSet.eq = result;
		thisSet.calcArray = [];
		grapher.postMessage(result);
		var termDiv = document.getElementsByClassName("terms")[0];
		var eqDiv = document.getElementsByClassName("eqs")[0];
		var termNum = Object.keys(thisSet.eq[0][0]).length-1;
		termDiv.textContent = termNum + " term" + ((termNum === 1) ? "" : "s");
		var eqNum = thisSet.eq.length;
		eqDiv.textContent = eqNum + " equation" + ((eqNum === 1) ? "" : "s");
		var disable = ["graphOp", "viewEqOp", "viewFormOp", "exportData"];
		for(var i = 0; i < disable.length; i++) {
			var d = document.getElementById(disable[i]);
			if(d === null) continue;
			d.className = d.className.replace(" disabled", "");
		}
		if(eqNum > 1) {
			var div = document.getElementById("viewFormOp");
			div.children[0].textContent = "View equations";
			div.onclick = function() {
				viewAllEq(calcIndex);
			}
		}
	}
}

grapher.onmessage = function(e) {
	var result = e.data;
	if(result.length === undefined) {
		percent = result;
	} else {
		var thisSet = allSets[calcIndex];
		thisSet.calcArray.push(result);
		if(thisSet.calcArray.length === thisSet.eq.length) {
			var range = thisSet.range;
			var ratio = (canvas.height > canvas.width) ? canvas.height/canvas.width : canvas.width/canvas.height;
			var r = [1.1*ratio*range[0]/2, 1.1*ratio*range[1]/2];
			var [scale, axes] = drawGraphBase([[-r[0], r[0]],[-r[1], r[1]]]);
			window.cancelAnimationFrame(loadFrame);
			for(var i = 0; i < thisSet.eq.length; i++) {
				drawEquation(thisSet.calcArray[i], thisSet.calcArray[i].length-2, scale, axes);
			}
			percent = 0;
		}
	}
}

document.querySelectorAll("#clickFile input")[0].onchange = function() {
	var that = this;
	loadSVGStatus(true);
	setTimeout(function() {
		var file = that.files[0];
		if(file.name.search(".svg") === -1) {
			alert("This file is not an svg! Please select another file.");
			loadSVGStatus(false);
			return;
		}
		var reader = new FileReader();
		reader.onload = function() {	
			var [paths, range] = processSVG(reader.result);
			var oneSet = {
				"name": file.name.replace(".svg","").substring(0,15),
				"color": graphColors[Math.floor(Math.random()*graphColors.length)],
				"paths": paths,
				"range": range,
				"eq": [],
				"calcArray": [],
			};
			allSets.push(oneSet);
			updateSidebar();
		}
		reader.readAsText(file);
	}, 10);
}

function fileDrop(e) {
	e.preventDefault();
	document.getElementById("setCont").className = "";
	if(e.dataTransfer.items) {
		type = e.dataTransfer.items; 
	} else {
		type = e.dataTransfer.files;
	}
	if(!e.dataTransfer.items) return;
	loadSVGStatus(true);
	for (var i = 0; i < type.length; i++) {
		var thisItem = type[i];
      	if (thisItem.kind === 'file') {
      		var file = thisItem.getAsFile();
     		if(file.name.search(".svg") === -1) {
     			alert("This file is not an svg! Please select another file.");
     			loadSVGStatus(false);
     			return;
     		}
     		var reader = new FileReader();
     		reader.onload = function() {
				var [paths, range] = processSVG(reader.result);
     			var oneSet = {
     				"name": file.name.replace(".svg",""),
     				"color": graphColors[Math.floor(Math.random()*graphColors.length)],
     				"paths": paths,
     				"range": range,
     				"eq": [],
     				"calcArray": []
     			};
     			allSets.push(oneSet);
     		}
     		reader.readAsText(file);
     		if(e.dataTransfer.items) {
     			e.dataTransfer.items.clear();
     		} else {
     			e.dataTransfer.clearData();
     		}	
      	}
    }
    updateSidebar();
}

function fileDrag(e) {
	e.preventDefault();
	document.getElementById("setCont").className = "ondrag";
}

function fileDragLeave(e) {
	e.preventDefault();
	document.getElementById("setCont").className = "";
}

function loadSVGStatus(processing) {
	var p = document.querySelectorAll("#clickFile p")[0];
	var i = document.querySelectorAll("#clickFile i")[0];
	if(processing) {
		p.textContent = "Processing...";
		i.className = "fas fa-circle-notch spin";
	} else {
		p.textContent = "Drag or browse for a file!";
		i.className = "fas fa-file-upload";
	}
}

function updateSidebar() {
	loadSVGStatus(false);
	var setCont = document.getElementById("setCont");
	setCont.style.opacity = "0";
	setTimeout(function() {
		while(setCont.children[0]) setCont.removeChild(setCont.children[0]);
		allSets.forEach(function(a,i) {
			var div = document.createElement("div");
			div.className = "set transition";
			div.onclick = function() {
				let counter = i;
				setInfo(counter);
			}
			var sel = document.createElement("div");
			sel.className = "selected";
			var col = document.createElement("div");
			col.className = "color";
			var h2 = document.createElement("h2");
			h2.appendChild(document.createTextNode(i+1));
			var circ = document.createElement("div");
			circ.className = "transition";
			circ.style.backgroundColor = a.color;
			var colSel = document.createElement("div");
			colSel.className = "colSel transition";
			for(var j = 0; j < graphColors.length; j++) {
				var col1 = document.createElement("div");
				col1.className = "transition";
				col1.style.backgroundColor = graphColors[j];
				col1.onclick = function(e) {
					e.stopPropagation();
					let counter = i;
					var parent = this.parentNode;
					var thisSet = allSets[counter];
					parent.parentNode.style.backgroundColor = this.style.backgroundColor;
					thisSet.color = this.style.backgroundColor;
					parent.style.opacity = "0";
					if(thisSet.calcArray.length > 0 && calcIndex === counter) {
						var range = thisSet.range;
						var ratio = (canvas.height > canvas.width) ? canvas.height/canvas.width : canvas.width/canvas.height;
						var r = [1.1*ratio*range[0]/2, 1.1*ratio*range[1]/2];
						var [scale, axes] = drawGraphBase([[-r[0], r[0]],[-r[1], r[1]]]);
						window.cancelAnimationFrame(loadFrame);
						for(var k = 0; k < thisSet.eq.length; k++) {
							drawEquation(thisSet.calcArray[k], thisSet.calcArray[k].length-2, scale, axes);
						}
					}
					setTimeout(function() {
						parent.style.display = "none";
					},300);
				}
				colSel.appendChild(col1);
			}
			circ.onclick = function(e) {
				e.stopPropagation();
				var innerDiv = this.children[0];
				innerDiv.style.display = "grid";
				setTimeout(function() {
					innerDiv.style.opacity = "1";
				}, 10);
			}
			circ.appendChild(colSel);
			col.appendChild(h2);
			col.appendChild(circ);
			var name = document.createElement("h2");
			name.className = "name";
			name.appendChild(document.createTextNode(a.name));
			div.appendChild(sel);
			div.appendChild(col);
			div.appendChild(name);
			var terms = document.createElement("p");
			terms.className = "terms";
			var eqs = document.createElement("p");
			eqs.className = "eqs";
			if(a.eq.length !== 0) {
				var termNum = Object.keys(a.eq[0][0]).length-1;
				terms.appendChild(document.createTextNode(termNum + " term" + ((termNum === 1) ? "" : "s")));
				var eqNum = a.eq.length;
				eqs.appendChild(document.createTextNode(eqNum + " equation" + ((eqNum === 1) ? "" : "s")));
			} 
			div.appendChild(terms);
			div.appendChild(eqs);
			setCont.appendChild(div);
		});
		setCont.style.opacity = "1";
	}, 400);
}

function setInfo(index) {
	calcIndex = index;
	var options = [
		{
			name: "Calculate",
			id: "calcOp",
			input: true,
			inputRange: [1, 1500],
			inputDefValue: 70,
			onclick: function() {
				var terms = parseInt(this.children[1].value);
				loadFrame = window.requestAnimationFrame(loading);
				fourier.postMessage([allSets[index].paths, terms]);
				var gInp = document.getElementById("graphOp").children[1];
				gInp.setAttribute("min", "1");
				gInp.setAttribute("max", terms);
				gInp.value = terms;
				this.setAttribute("min", terms);
			}
		},
		{
			name: "Graph",
			id: "graphOp",
			input: true,
			inputRange: [1,1500],
			inputDefValue: 1,
			disableDef: true,
			onclick: function() {
				var thisSet = allSets[index];
				var range = thisSet.range;
				var ratio = (canvas.height > canvas.width) ? canvas.height/canvas.width : canvas.width/canvas.height;
				var r = [1.1*ratio*range[0]/2, 1.1*ratio*range[1]/2];
				var [scale, axes] = drawGraphBase([[-r[0], r[0]],[-r[1], r[1]]]);
				for(var i = 0; i < thisSet.eq.length; i++) {
					drawEquation(thisSet.calcArray[i], this.children[1].value, scale, axes);
				}
			}
		}
	];
	var viewForm = {
		name: "View formula",
		id: "viewFormOp",
		input: false,
		disableDef: true,
		onclick: function() {
			viewMath(index, 0);
		}
	};
	var viewEq = {
		name: "View equations",
		id: "viewEqOp",
		input: false,
		disableDef: true,
		onclick: function() {
			viewAllEq(index);
		}
	};
	var exportDiv = {
		name: "Export data",
		id: "exportData",
		input: false,
		disableDef: true,
		onclick: function() {
			var thisSet = allSets[index];
			var data = {
				name: thisSet.name,
				paths: thisSet.paths,
				constants: thisSet.eq
			};
			try {
				var blob = new Blob([JSON.stringify(data)], {type: "text/plain;charset=utf-8"});
			} catch(err) {
				var BlobBuilder = window.WebKitBlobBuilder || window.MozBlobBuilder || window.MSBlobBuilder;
				var bb = new BlobBuilder();
				bb.append((new XMLSerializer).serializeToString(data));
				var blob = bb.getBlob("text/plain;charset=utf-8");	
			}
			saveAs(blob, allSets[index].name+"_data.txt");
		}
	};
	var back = {
		name: "Back",
		id: "backOp",
		input: false,
		onclick: function() {
			updateSidebar();
		}
	};
	if(allSets[index].eq.length > 1) {
		options.push(viewEq);
	} else {
		options.push(viewForm);
	}
	options.push(exportDiv);
	options.push(back);
	var setCont = document.getElementById("setCont");
	var selectedSet = setCont.children[index];
	setCont.style.opacity = "0";
	setTimeout(function() {
		while(setCont.children[0]) setCont.removeChild(setCont.children[0]);
		setCont.appendChild(selectedSet);
		for(var i = 0; i < options.length; i++) {
			var op = document.createElement("div");
			op.className = "option transition" + ((options[i].disableDef && allSets[index].eq.length === 0) ? " disabled" : "");
			op.id = options[i].id;
			var p = document.createElement("p");
			p.appendChild(document.createTextNode(options[i].name));
			op.appendChild(p);
			if(options[i].input) {
				var inp = document.createElement("input");
				inp.setAttribute("type", "number");
				inp.setAttribute("min", options[i].inputRange[0]);
				inp.setAttribute("max", options[i].inputRange[1]);
				inp.onkeyup = function(e) {
					if(e.keyCode === 13) this.parentNode.click();
				}
				inp.className = "transition";
				inp.oninput = function() {
					var val = parseInt(this.value);
					this.value = Math.floor(val);
					if(val < parseInt(this.getAttribute("min"))) this.value = this.getAttribute("min");
					if(val > parseInt(this.getAttribute("max"))) this.value = this.getAttribute("max");
				}
				inp.onclick = function(e) {
					e.stopPropagation();
				}
				var thisSet = allSets[index];
				if(thisSet.eq.length !== 0) {
					inp.value = Object.keys(thisSet.eq[0][0]).length-1;
				} else {
					inp.value = options[i].inputDefValue;
				}
				op.appendChild(inp);
				var p2 = document.createElement("p");
				p2.appendChild(document.createTextNode("terms!"));
				op.appendChild(p2);
			}
			op.onclick = options[i].onclick;
			setCont.appendChild(op);
		}
		setTimeout(function() {
			setCont.style.opacity = "1";
		}, 300);
	}, 300);
}

function viewMath(index, index2) {
	var mathContIm = document.createElement("div");
	mathContIm.id = "mathContIm";
	var mathContRe = document.createElement("div");
	mathContRe.id = "mathContRe";
	var thisEq = allSets[index].eq[index2];
	var options = [
		{
			name: "Form: Imaginary",
			id: "mathType",
			input: false,
			onclick: function() {
				var mc = [document.getElementById("mathContIm"), document.getElementById("mathContRe")];
				if(this.textContent.search("Imag") !== -1) {
					this.children[0].textContent = "Form: Parametric";
					mc[0].style.opacity = "0";
					setTimeout(function() {
						mc[0].style.display = "none";
						mc[1].style.display = "block";
						setTimeout(function() {
							mc[1].style.opacity = "1";
						}, 10);
					}, 300);
				} else {
					this.children[0].textContent = "Form: Imaginary";
					mc[1].style.opacity = "0";
					setTimeout(function() {
						mc[1].style.display = "none";
						mc[0].style.display = "block";
						setTimeout(function() {
							mc[0].style.opacity = "1";
						}, 10);
					}, 300);
				}
			}
		},
		{
			name: "Copy",
			id: "copyButton",
			input: true,
			inputRange: [1, Object.keys(thisEq[0]).length],
			inputDefValue: 1,
			disableDef: true,
			onclick: function() {
				var inp = document.getElementById("copyBox");
				var type = (document.getElementById("mathType").textContent.search("Imag") !== -1) ? "im" : "re";
				inp.value = toLatex(thisEq, type, this.children[1].value);
				inp.select();
				document.execCommand("copy");
			}
		},
		{
			insert: true,
			insertDiv: mathContIm
		},
		{
			insert: true,
			insertDiv: mathContRe
		},
		{
			name: "Back",
			id: "backOp",
			input: false,
			onclick: function() {
				if(index2 === 0) {
					setInfo(0);
				} else {
					setInfoEq(index, index2);
				}
			}
		}
	];
	var setCont = document.getElementById("setCont");
	var selectedSet = setCont.children[0];
	setCont.style.opacity = "0";
	setTimeout(function() {
		while(setCont.children[0]) setCont.removeChild(setCont.children[0]);
		setCont.appendChild(selectedSet);
		var eqKeys = Object.keys(thisEq[0]);
		for(var i = 0; i < eqKeys.length-1; i++) {
			var j = ((i+1)%2===1) ? Math.ceil((i+1)/2) : -Math.floor((i+1)/2);
			var num = (j === 1) ? "" :j;
			var end = (i === eqKeys.length-2) ? "" : "+";
			var add = (thisEq[1][eqKeys[i]] < 1) ? "-" : "+";
			var sub = (thisEq[1][eqKeys[i]] < 1) ? "+" : "-";
			var oneTermIm = document.createElement("div");
			var oneTermRe = document.createElement("div");
			oneTermIm.textContent = "$$\\left(" + thisEq[0][j] + add + Math.abs(thisEq[1][j]) + "i\\right)e^{" + num + "it}" + end + "$$" ;
			if(i === 0) {
				oneTermRe.textContent = "$$\\left\\{\\begin{matrix}x=" + thisEq[0][j] + "\\cos\\left(" + num + "t\\right)" + sub + Math.abs(thisEq[1][j]) + "\\sin\\left(" + num + "t\\right)"
				+ "+\\\\y=" + thisEq[0][j] + "\\sin\\left(" + num + "t\\right)" + add + Math.abs(thisEq[1][j]) + "\\cos\\left(" + num + "t\\right)+\\end{matrix}\\right.$$";
			} else {
				oneTermRe.textContent = "$$"+ thisEq[0][j] + "\\cos\\left(" + num + "t\\right)" + sub + Math.abs(thisEq[1][j]) + "\\sin\\left(" + num + "t\\right)"
				+ "+\\\\" + thisEq[0][j] + "\\sin\\left(" + num + "t\\right)" + add + Math.abs(thisEq[1][j]) + "\\cos\\left(" + num + "t\\right)+$$"
			}
			mathContIm.appendChild(oneTermIm);
			mathContRe.appendChild(oneTermRe);
		}

		for(var i = 0; i < options.length; i++) {
			if(options[i].insert) {
				setCont.appendChild(options[i].insertDiv);
			} else {
				var op = document.createElement("div");
				op.className = "option transition";
				op.id = options[i].id;
				var p = document.createElement("p");
				p.appendChild(document.createTextNode(options[i].name));
				op.appendChild(p);
				if(options[i].input) {
					var inp = document.createElement("input");
					inp.setAttribute("type", "number");
					inp.setAttribute("min", options[i].inputRange[0]);
					inp.setAttribute("max", options[i].inputRange[1]);
					inp.onkeyup = function(e) {
						if(e.keyCode === 13) this.parentNode.click();
					}
					inp.className = "transition";
					inp.oninput = function() {
						var val = parseInt(this.value);
						this.value = Math.floor(val);
						if(val < parseInt(this.getAttribute("min"))) this.value = this.getAttribute("min");
						if(val > parseInt(this.getAttribute("max"))) this.value = this.getAttribute("max");
					}
					inp.onclick = function(e) {
						e.stopPropagation();
					}
					var thisSet = allSets[index];
					if(thisSet.eq.length !== 0) {
						inp.value = Object.keys(thisSet.eq[0][0]).length-1;
					} else {
						inp.value = options[i].inputDefValue;
					}
					op.appendChild(inp);
					var p2 = document.createElement("p");
					p2.appendChild(document.createTextNode("terms!"));
					op.appendChild(p2);
				}
				op.onclick = options[i].onclick;
				setCont.appendChild(op);
			}
		}
		MathJax.Hub.Queue(["Typeset",MathJax.Hub,"mathCont"]);
		setTimeout(function() {
			setCont.style.opacity = "1";
		}, 300);
	}, 300);
}

function viewAllEq(index) {
	var setCont = document.getElementById("setCont");
	var selectedSet = setCont.children[0];
	setCont.style.opacity = "0";
	setTimeout(function() {
		while(setCont.children[0]) setCont.removeChild(setCont.children[0]);
		setCont.appendChild(selectedSet);
		allSets[index].eq.forEach(function(a,i) {
			var div = document.createElement("div");
			div.className = "option";
			div.onclick = function() {
				setInfoEq(index, i);
			};
			var p = document.createElement("p");
			p.appendChild(document.createTextNode("Equation " + (i+1)));
			div.appendChild(p);
			setCont.appendChild(div);
		});
		var div = document.createElement("div");
		div.className = "option";
		div.onclick = function() {
			setInfo(calcIndex);
		}
		var p = document.createElement("p");
		p.appendChild(document.createTextNode("Back"));
		div.appendChild(p);
		setCont.appendChild(div);
		setTimeout(function() {
			setCont.style.opacity = "1";	
		}, 300);
	}, 400);
}

function setInfoEq(index1, index2) {
	var termNum = Object.keys(allSets[index1].eq[0][0]).length - 1;
	var options = [
		{
			name: "Graph",
			id: "graphOp",
			input: true,
			inputRange: [1, termNum],
			inputDefValue: termNum,
			onclick: function() {
				var thisSet = allSets[index1];
				var thisPath = allSets[index1].paths[index2];
				var flat = thisPath.reduce((a,b)=>a.concat(b));
				flat = flat[0].map((a,i)=>flat.map(b=>b[i]));
				var range = [Math.max.apply(null, flat[0]), Math.max.apply(null, flat[1])];
				thisPath = thisPath.map(b=>b.map(c=>[c[0]-range[0]/2, -1*(c[1]-range[1]/2)]));
				var thisCalcArray = new Array(thisSet.calcArray[index2].length);  
				var thisTerm = thisSet.calcArray[index2][this.children[1].value];
				flat = thisTerm[0].map((a,i)=>thisTerm.map(b=>b[i]));
				var min = [Math.min.apply(null, flat[0]), Math.min.apply(null, flat[1])]
				var range = [
					Math.abs(Math.max.apply(null, flat[0])-min[0]), 
					Math.abs(Math.max.apply(null, flat[1])-min[1])
				];
				thisTerm = thisTerm.map(c=>[c[0]-min[0]-range[0]/2, c[1]-min[1]-range[1]/2]);
				thisCalcArray[this.children[1].value] = thisTerm;
				var ratio = (canvas.height > canvas.width) ? canvas.height/canvas.width : canvas.width/canvas.height;
				var r = [1.1*ratio*range[0]/2, 1.1*ratio*range[1]/2];
				var [scale, axes] = drawGraphBase([[-r[0], r[0]],[-r[1], r[1]]]);
				drawEquation(thisCalcArray, this.children[1].value, scale, axes);
			}
		},
		{
			name: "View formula",
			id: "viewFormOp",
			input: false,
			onclick: function() {
				viewMath(index1, index2);
			}
		},
		{
			name: "Back",
			id: "backOp",
			input: false,
			onclick: function() {
				viewAllEq(index1);
			}
		}
	];
	var setCont = document.getElementById("setCont");
	var selectedSet1 = setCont.children[0];
	var selectedSet2 = setCont.children[index2+1];
	selectedSet2.onclick = function() {};
	setCont.style.opacity = "0";
	setTimeout(function() {
		while(setCont.children[0]) setCont.removeChild(setCont.children[0]);
		setCont.appendChild(selectedSet1);
		setCont.appendChild(selectedSet2);
		for(var i = 0; i < options.length; i++) {
			var op = document.createElement("div");
			op.className = "option transition";
			op.id = options[i].id;
			var p = document.createElement("p");
			p.appendChild(document.createTextNode(options[i].name));
			op.appendChild(p);
			if(options[i].input) {
				var inp = document.createElement("input");
				inp.setAttribute("type", "number");
				inp.setAttribute("min", options[i].inputRange[0]);
				inp.setAttribute("max", options[i].inputRange[1]);
				inp.onkeyup = function(e) {
					if(e.keyCode === 13) this.parentNode.click();
				}
				inp.className = "transition";
				inp.oninput = function() {
					var val = parseInt(this.value);
					this.value = Math.floor(val);
					if(val < parseInt(this.getAttribute("min"))) this.value = this.getAttribute("min");
					if(val > parseInt(this.getAttribute("max"))) this.value = this.getAttribute("max");
				}
				inp.onclick = function(e) {
					e.stopPropagation();
				}
				inp.value = options[i].inputDefValue;
				op.appendChild(inp);
				var p2 = document.createElement("p");
				p2.appendChild(document.createTextNode("terms!"));
				op.appendChild(p2);
			}
			op.onclick = options[i].onclick;
			setCont.appendChild(op);
		}
		setTimeout(function() {
			setCont.style.opacity = "1";
		}, 300);
	}, 300);
}

function drawEquation(calcArray, cycles, scale, axes) {
	var arr = calcArray[cycles];
	ctx.beginPath();
	ctx.lineJoin = "round";
	ctx.strokeStyle = allSets[calcIndex].color;
	ctx.lineWidth = 2;
	ctx.moveTo(axes[0]+arr[0][0]*scale, axes[1]-arr[0][1]*scale);
	for(var i = 1; i < arr.length; i++) {
		ctx.lineTo(axes[0]+arr[i][0]*scale, axes[1]-arr[i][1]*scale);
	}
	ctx.lineTo(axes[0]+arr[0][0]*scale, axes[1]-arr[0][1]*scale);
	ctx.stroke();
}

function drawGraphBase(win) {
	var win = win || [[-55,55], [-55,55]];
	var range = [Math.abs(win[0][0]-win[0][1]), Math.abs(win[1][0]-win[1][1])];
	var largeRange, which, winWhich;
	if(range[0] > range[1]) {
		largeRange = range[0];
		which = "width";
		winWhich = 0;
	} else {
		largeRange = range[1];
		which = "height";
		winWhich = 1;
	}
	var nonRound = largeRange/13;
	var log = Math.ceil(Math.log10(nonRound));
	var scale = (Math.abs(nonRound-Math.pow(10, log)) > Math.abs(nonRound-5*Math.pow(10, log-1))) ? 5*Math.pow(10, log-1) : Math.pow(10, log);
	var ppu = canvas[which]/largeRange;
	var unit = Math.floor(ppu*scale);
	var realAxes = [];
	var axes = [];
	var offset = [];
	if(win[0][0] >= 0 && win[0][1] >= 0) {
		axes[0] = .1 * canvas.width;
		offset[0] = Math.min.apply(null, win[0].map((a=>Math.floor(Math.abs(a)))));
		realAxes[0] = axes[0] + ppu*(scale-offset[0]);
	} else if(win[0][0] <= 0 && win[0][1] <= 0) {
		axes[0] = .9 *canvas.width;
		offset[0] = -Math.min.apply(null, win[0].map((a=>Math.floor(Math.abs(a)))));
		realAxes[0] = axes[0] + ppu*(scale-offset[0]);
	} else {
		axes[0] = Math.abs(win[winWhich][0]/largeRange) * canvas.width;
		offset[0] = 0;
		realAxes[0] = axes[0];
	}

	if(win[1][0] >= 0 && win[1][1] >= 0) {
		axes[1] = .9 * canvas.height;
		offset[1] = Math.min.apply(null, win[1].map((a=>Math.floor(Math.abs(a)))));
		realAxes[1] = axes[1] + ppu*(scale-offset[1]); 
	} else if(win[0][0] <= 0 && win[1][1] <= 0) {
		axes[1] = .1 *canvas.height;
		offset[1] = -Math.min.apply(null, win[1].map((a=>Math.floor(Math.abs(a)))));
		realAxes[1] = axes[1] + ppu*(scale-offset[1]);
	} else {
		axes[1] = Math.abs(win[winWhich][1]/largeRange) * canvas.height;
		offset[1] = 0;
		realAxes[1] = axes[1];
	}

	ctx.clearRect(0,0,canvas.width,canvas.height);
	// Sub-intervals
	ctx.lineWidth = 1;
	ctx.strokeStyle = "#E0E0E0";
	ctx.beginPath();
	for(var i = -unit*4; i <= unit*4; i++) {
		if(i === 0) continue;
		var x = axes[0] + ppu*i*scale/5;
		var y = axes[1] + ppu*i*scale/5;
		ctx.moveTo(x, 0);
		ctx.lineTo(x, canvas.height);
		ctx.moveTo(0, y);
		ctx.lineTo(canvas.width, y);
	}
	ctx.stroke();
	ctx.closePath();
	// Intervals
	ctx.lineWidth = 1;
	ctx.strokeStyle = "#BDBDBD";
	ctx.beginPath();
	for(var i = -unit; i <= unit; i++) {
		if(i === 0) continue;
		var x = axes[0] + ppu*i*scale;
		var y = axes[1] - ppu*i*scale;
		ctx.moveTo(x, 0);
		ctx.lineTo(x, canvas.height);
		ctx.moveTo(0, y);
		ctx.lineTo(canvas.width, y);
	}
	ctx.stroke();
	ctx.closePath();
	// Axes
	ctx.beginPath();
	ctx.lineWidth = 2;
	ctx.strokeStyle = "#424242";
	ctx.moveTo(axes[0], 0);
	ctx.lineTo(axes[0], canvas.height);
	ctx.moveTo(0, axes[1]);
	ctx.lineTo(canvas.width, axes[1]);
	ctx.stroke();
	ctx.closePath();
	// Texts
	var textOffset = canvas.width/75;
	ctx.fillStyle = "#000";
	for(var i = -unit; i <= unit; i++) {
		var x = axes[0] + ppu*i*scale;
		var y = axes[1] - ppu*i*scale;
		ctx.font = (canvas.width/75).toString() + "px Poppins";
		ctx.textBaseline = "middle";
		if(i === 0) {
			ctx.fillText((i*scale).toString(), axes[0]-textOffset/2, y+textOffset);
		} else {
			ctx.textAlign = "center";
			ctx.fillText((i*scale + Math.floor(offset[0])).toString(), x, axes[1]+textOffset);
			ctx.textAlign = "end";
			ctx.fillText((i*scale + Math.floor(offset[1])).toString(), axes[0]-textOffset/2, y);
		}
	}
	return [ppu, realAxes];
}

function loading(t) {
	if(!loadStart) loadStart = t;
	var circTime = 700;
	var progress = t - loadStart;
	progress = progress - Math.floor(progress/(3.5*circTime))*3.5*circTime;
	ctx.clearRect(0,0,canvas.width,canvas.height)
	var r = 0.05*canvas.width;
	var beg = 1.5*Math.PI;
	var circProg = progress/circTime - Math.floor(progress/circTime);
	var cent = [canvas.width/2, canvas.height*.35];
	var animProg = beg - (3*Math.pow(circProg,2)-2*Math.pow(circProg,3))*2*Math.PI;
	animProg = (animProg < 0) ? 2*Math.PI+animProg : animProg;
	ctx.lineWidth = 4;
	ctx.strokeStyle = "#000";
	ctx.fillStyle = "#000";
	if(progress < circTime) {
		ctx.beginPath();
		ctx.arc(cent[0]-3.5*r, cent[1], r, beg, animProg, true);
		ctx.stroke();
	} else if(progress < 2*circTime) {
		ctx.beginPath();
		ctx.arc(cent[0]-3.5*r, cent[1], r, 0, 2*Math.PI, true);
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(cent[0], cent[1], r, beg, animProg, true);
		ctx.stroke();
	} else if(progress < 3*circTime) {
		ctx.beginPath();
		ctx.arc(cent[0]-3.5*r, cent[1], r, 0, 2*Math.PI, true);
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(cent[0], cent[1], r, 0, 2*Math.PI, true);
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(cent[0]+3.5*r, cent[1], r, beg, animProg, true);
		ctx.stroke();
	} else if(progress <= 4*circTime)  {
		var newR = r-3*r*Math.pow(2*circProg,2)+2*r*Math.pow(2*circProg,3);
		ctx.beginPath();
		ctx.arc(cent[0]-3.5*r, cent[1], newR, 0, 2*Math.PI, true);
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(cent[0], cent[1], newR, 0, 2*Math.PI, true);
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(cent[0]+3.5*r, cent[1], newR, 0, 2*Math.PI, true);
		ctx.stroke();
	}
	ctx.textAlign = "center";
	ctx.baseLine = "middle";
	ctx.font = (canvas.width/50).toString() + "px Poppins";
	ctx.fillText("Generating equations, this may take a while.", canvas.width/2, canvas.height/2);
	var rectWidth = canvas.width*0.7;
	var edge = (canvas.width-rectWidth)/2;
	ctx.rect(edge, canvas.height*.65, rectWidth, rectWidth*.05);
	ctx.lineWidth = 2;
	ctx.stroke();
	ctx.fillStyle="#4CAF50";
	ctx.fillRect(edge+2, canvas.height*.65+2, percent*(rectWidth-4), rectWidth*.05-4);
	loadFrame = window.requestAnimationFrame(loading);
}

function toLatex(eq, type, amount) {
	var eqKeys = Object.keys(eq[0]);
	amount = amount || eqKeys.length-1;
	var final = "";
	for(var i = 0; i < amount; i++) {
		var j = ((i+1)%2===1) ? Math.ceil((i+1)/2) : -Math.floor((i+1)/2);
		var num = (j === 1) ? "" : j;
		var end = (i === eqKeys.length-2) ? "" : "+";
		var add = (eq[1][eqKeys[i]] < 1) ? "-" : "+";
		var sub = (eq[1][eqKeys[i]] < 1) ? "+" : "-";

		if(type === "im") {
			final += "\\left(" + eq[0][j] + add + Math.abs(eq[1][j]) + "i\\right)e^{" + num + "it}" + end;
		} else {
			if(i === 0) {
				final += "\\left\\{\\begin{matrix}x=" + eq[0][j] + "\\cos\\left(" + num + "t\\right)" + sub + Math.abs(eq[1][j]) + "\\sin\\left(" + num + "t\\right)"
				+ "+\\\\y=" + eq[0][j] + "\\sin\\left(" + num + "t\\right)" + add + Math.abs(eq[1][j]) + "\\cos\\left(" + num + "t\\right)+\\end{matrix}\\right.";
			} else {
				final += eq[0][j] + "\\cos\\left(" + num + "t\\right)" + sub + Math.abs(eq[1][j]) + "\\sin\\left(" + num + "t\\right)"
				+ "+\\\\" + eq[0][j] + "\\sin\\left(" + num + "t\\right)" + add + Math.abs(eq[1][j]) + "\\cos\\left(" + num + "t\\right)+"
			}
		}
	}
	return final;
}

function processSVG(svg) {
	var commLength = {
		"M": 1, "L": 1, "H": 1, "V": 1,
		"Q": 2, "C": 3, "T": 1, "S": 2,
		"A": 3
	};
	var el = document.createElement("div");
	el.innerHTML = svg;
	var allPaths = Array.from(el.getElementsByTagName("path")).map(a=>a.getAttribute("d").replace(/(\n|\t)/g,"")).map(a=>a[0].toUpperCase() + a.substring(1)).reduce((a,b)=>a.concat(b));
	allPaths = allPaths.replace(/z/gi,"").split(/(?=M)/gi);
	var lastPoint = [0,0];
	for(var k = 0; k < allPaths.length; k++) {
		var processed = [];
		var arr = allPaths[k].split(/(?=[a-z])/gi);
		if(arr.length === 0) continue;
		var commList = [];
		for(var i = 0; i < arr.length; i++) {
			var command = arr[i].match(/[a-z]/gi)[0];
			var values = arr[i].match(/(-)?([0-9]+)(\.([0-9])+)?/gi);
			if(command.toUpperCase() !== "A") {
				values = [values.filter((a,i)=>i%2===0),values.filter((a,i)=>i%2===1)].map(a=>a.map(b=>parseFloat(b)));	
				values = values[0].map((a,i)=>[a, (values[1][i]||0)]);
				if(command.toUpperCase() === "V") values.reverse();
			} else {
				alert("The A path command in the SVG is not supported! Please modify or change the SVG file to not contain the A command.");
				return [];
			}
			var len = commLength[command.toUpperCase()];
			if(values.length !== len) {
				for(var j = 0; j < values.length/len; j++) {
					commList.push([command].concat(values.slice(len*j, len*(j+1))));
				}
			} else {
				commList.push([command].concat(values));
			}
		}
		
		for(var i = 0; i < commList.length; i++) {
			var command = commList[i][0];
			var rel = false;
			if(command === command.toLowerCase()) {
				rel = true;
				command = command.toUpperCase();
			}
			var points = commList[i].slice(1);
			var offset = relOff(arrOp(lastPoint, "*", rel), points);
			if(command === "M") {
				lastPoint = offset[0];
			} else if(command === "T" || command === "S") {
				var lastSet = processed[processed.length-1] || [lastPoint];
				var len = lastSet.length;
				if(len < 3) {
					var newBez = lastPoint;
				} else {
					var newBez = arrOp(arrOp(2, "*", arrOp(lastSet[len-1], "-", lastSet[len-2])), "+", lastPoint);
				}
				processed.push([lastPoint].concat([newBez]).concat(offset));
				lastPoint = processed[processed.length-1].slice().reverse()[0];
			} else if(command === "A") {
				alert("The A path command in the SVG is not supported! Please modify or change the SVG file to not contain the A command.")
				return [];
			} else {
				processed.push([lastPoint].concat(offset));
				lastPoint = processed[processed.length-1].slice().reverse()[0];
			}

		}
		allPaths[k] = processed;
	}

	var polyPaths = Array.from(el.getElementsByTagName("polygon")).map(a=>a.getAttribute("points").replace(/(\n|\t)/g,"")).concat(
		Array.from(el.getElementsByTagName("polyline")).map(a=>a.getAttribute("points").replace(/(\n|\t)/g,"")));
	for(var k = 0; k < polyPaths.length; k++) {
		var processed = [];
		var values = polyPaths[k].match(/(-)?([0-9]+)(\.([0-9])+)?/gi);
		values = [values.filter((a,i)=>i%2===0),values.filter((a,i)=>i%2===1)].map(a=>a.map(b=>parseFloat(b)));	
		values = values[0].map((a,i)=>[a, (values[1][i]||0)]);
		for(var i = 0; i < values.length-1; i++) processed.push([values[i], values[i+1]]);
		allPaths.push(processed);
	}

	var linePaths = Array.from(el.getElementsByTagName("line"));
	for(var k = 0; k < linePaths.length; k++) {
		var path = linePaths[k];
		var line = [[parseFloat(path.getAttribute("x1")), parseFloat(path.getAttribute("y1"))],
				[parseFloat(path.getAttribute("x2")), parseFloat(path.getAttribute("y2"))]];
		allPaths.push([line].concat([line.slice().reverse()]));
	}

	var flat = allPaths.reduce((a,b)=>a.concat(b)).reduce((a,b)=>a.concat(b));
	flat = flat[0].map((a,i)=>flat.map(b=>b[i]));
	var range = [Math.max.apply(null, flat[0]), Math.max.apply(null, flat[1])];
	allPaths = allPaths.map(a=>a.map(b=>b.map(c=>[c[0]-range[0]/2, -1*(c[1]-range[1]/2)])));
	return [allPaths, range];
}

function relOff(offset, pointSet) {
	return pointSet.map(a=>arrOp(a,"+", offset));
}

function arrOp(arr1, op, arr2) { // Applies operator arr1n (op) arr2n thus not following normal vector rules.
	if(arr1.length === undefined) arr1 = new Array(arr2.length).fill(arr1);
	if(arr2.length === undefined) arr2 = new Array(arr1.length).fill(arr2);
	return arr1.map((a,i)=>eval(a+op+"("+arr2[i]+")"));		
}