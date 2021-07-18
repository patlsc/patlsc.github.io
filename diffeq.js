/*
TODO:
-fix weird border coloring
-improve coloring algorithm
-make the settings a floating toolbar
-remove the need for "Math." prefix
-make a number of inputs into sliders
-add color brightness slider
*/
var range_xcord = [-10, 10];
var range_ycord = [-10, 10];

var range_spawn_xcord = [-5,5];
var range_spawn_ycord = [-5,5];

//canvas width, height
var cv = document.getElementById("display");
var ctx = cv.getContext("2d");
cv.width = window.innerWidth - 250;
cv.height = window.innerHeight;
var cv_w = cv.width;
var cv_h = cv.height;

//millitimeout after each iteration
var draw_line_timeout = 10;
var num_cycles = 500;
var delta = 0.05;

var line_width = 3;

ctx.lineWidth = line_width;
ctx.strokeStyle = "#FFFFFF";

var num_background_lines_x = 20;
var num_background_lines_y = 20;

var stochastic_lines = true;

var crop_lines = false;

var show_coords = false;
var coords_alpha = 0.1;

var no_line_breaks = false;

var taper_off = true;
var taper_segments = 50;

var color_array = [[0,0,255], [0,255,255], [255,255,0], [255,0,0]];
var mag_quantiles = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
var num_quantiles = 100;

var color_array_presets = {
	"rgb":"[[0,0,255], [0,255,255], [255,255,0], [255,0,0]]",
	"rgb-toned": "[[227, 101, 48], [185, 227, 48], [48, 227, 63], [48, 227, 194], [48, 66, 227]]",
	"white-black":"[[255,255,255], [200,200,200], [0,0,0]]",
	"greyscale":"[[255,255,255], [200,200,200], [100,100,100]]",
	"white":"[[255,255,255]]",
	"blue-purple":"[[50,100,255], [100,100,255], [200,100,255]]",
	"blue-purple-fade":"[[0,32,74], [50,31,97], [100,30,120], [150,21,110], [199,12,100]]",
	"red-dark-blue":"[[0,32,74], [20,80,120], [100,40,120], [199,12,100]]",
	"green-orange":"[[65, 179, 20], [143,211,19], [220,242,17], [242,176,7], [252,135,0],[219,56,7]]",
	"cobalt":"[[191, 196, 224],[184, 184, 204],[84, 89, 117],[55, 64, 82],]",

};
var background_color = [0,0,0];
var invert_colors = false;

var xprime = function(x,y){return y;};
var yprime = function(x,y){return -x+0.3*y;};

var draw_background_setting = true;

var line_alpha = 1;

var lp_l = 2;

//for animation
var parameter = 0;
var parameter_range = [0,1];
var parameter_frames = 20;

//changes a coordinate into pixel values
function xcord_to_pixel(xcord) {
	return (xcord-range_xcord[0])*cv_w/(range_xcord[1]-range_xcord[0]);
}
function ycord_to_pixel(ycord) {
	return (ycord-range_ycord[0])*cv_h/(range_ycord[1]-range_ycord[0]);
}
function xpix_to_cord(xpix) {
	return range_xcord[0] + (xpix*(range_xcord[1]-range_xcord[0])/cv_w);
}
function ypix_to_cord(ypix) {
	return range_ycord[0] + (ypix*(range_ycord[1]-range_ycord[0])/cv_h);
}
function coords_on_screen(xpos, ypos) {
	return (xpos >= range_xcord[0] && xpos <= range_xcord[1]) && (ypos >= range_ypos[0] && ypos <= range_ypos[1])
}

function draw_line(xpix1, ypix1, xpix2, ypix2) {
	ctx.moveTo(xpix1, ypix1);
	ctx.lineTo(xpix2, ypix2);
	ctx.stroke();
}

//TODO different norms
function get_magnitude(changex, changey) {
	var l = lp_l;
	return Math.pow(Math.pow(Math.abs(changex),l)+Math.pow(Math.abs(changey),l),1/l);
	//return Math.sqrt(Math.pow(changex,2)+Math.pow(changey,2));
}

function color_associate(mag, mag_quantiles, color_array) {
	if (mag == Infinity || mag == Number.MAX_VALUE) {
		return color_array[color_array.length - 1];
	}
	if (mag == null || mag == undefined) {
		return [0,0,0];
	}
	if (mag == 0) {
		return color_array[0];
	}
	//the quantile it's in
	var p = 0;
	for (var i = 0; i < mag_quantiles.length-1; i++) {
		if (mag_quantiles[i] <= mag && mag <= mag_quantiles[i+1]) {
			amount_between = (mag-mag_quantiles[i])/(mag_quantiles[i+1]-mag_quantiles[i])
			p = i + amount_between;
		}
	}
	var k = mag_quantiles.length/color_array.length;

	var c1 = color_array[Math.floor(p/k)];
	var c2 = color_array[Math.ceil(p/k)];
	if (!c2 || p == mag_quantiles.length-1) {
		return color_array[color_array.length-1];
	}
	//TODO fix
	var a = 1-(p % k)/k;
	//var a = (mag_quantiles[i+1]-mag)/(mag_quantiles[i+1]-mag_quantiles[i]);

	var final_color = [a*c1[0]+(1-a)*c2[0], a*c1[1]+(1-a)*c2[1], a*c1[2]+(1-a)*c2[2]];

	return final_color != null ? final_color : [255,255,255];
}

function val_to_hex(c) {
  var hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

function color_to_hex(color) {
	return "#" + val_to_hex(Math.floor(color[0])) + val_to_hex(Math.floor(color[1])) + val_to_hex(Math.floor(color[2]));
}

function get_magnitude_quantiles(xprime_func, yprime_func) {
	var mags = [];
	for (var i = 0; i < Math.min(40,num_background_lines_x); i++) {
		for (var j = 0; j < Math.min(40,num_background_lines_y); j++) {
			xpos = random_xpos();
			ypos = random_ypos();

			var m = get_magnitude(xprime_func(xpos,ypos,parameter), yprime_func(xpos,ypos,parameter));
			mags.push(Math.max(0, isFinite(m) ? m : 1));
		}
	}
	mags.sort((a,b)=>a-b);
	
	quantiles = [];
	for (var i = 0; i <= num_quantiles; i+=1) {
		quantiles.push(mags[Math.floor(mags.length*i/num_quantiles)-1]);
	}
	quantiles = quantiles.filter((e) => e != undefined);

	//0 is added to the start always
	quantiles.unshift(0);

	return quantiles;

}

function draw_diffeq_line(start_xcord, start_ycord, xprime_func, yprime_func) {

	var current_xcord = start_xcord;
	var current_ycord = start_ycord;
	var new_xcord = 0;
	var new_ycord = 0;

	var count = 0;
	while (count < num_cycles) {
		derivx = xprime_func(current_xcord, current_ycord,parameter);
		derivy = yprime_func(current_xcord, current_ycord,parameter);
		changex = derivx*delta;
		changey = derivy*delta;
		if (changex == 0 && changey == 0) {
			count = num_cycles;
		}
		//TODO performance, accuracy
		new_xcord = current_xcord + changex;
		new_ycord = current_ycord + changey;

		ctx.beginPath();

		//tapering off the alpha
		if (taper_off && Math.abs(num_cycles - count) <= taper_segments) {
			ctx.globalAlpha = line_alpha - ((taper_segments-Math.abs(num_cycles - count))/taper_segments)*line_alpha;
		} else if (taper_off && count <= taper_segments) {
			ctx.globalAlpha = (count/taper_segments)*line_alpha;
		}
		else {
			ctx.globalAlpha = line_alpha;
		}

		//TODO lines with maximum color appearing on the edges
		ctx.strokeStyle = color_to_hex(color_associate(get_magnitude(derivx, derivy), mag_quantiles, color_array));
		draw_line(xcord_to_pixel(current_xcord), ycord_to_pixel(current_ycord), xcord_to_pixel(new_xcord), ycord_to_pixel(new_ycord));

		current_xcord = new_xcord;
		current_ycord = new_ycord;
		count += 1;
		//ending the cycle if its gone
		if (crop_lines) {
			var xcord = current_xcord;
			var ycord = current_ycord;
			if ((xcord >= range_xcord[1] && changex > 0) || (xcord <= range_xcord[0] && changex < 0)) {
				count = num_cycles-1;
			}
			if ((ycord >= range_ycord[1] && changey > 0) || (ycord <= range_ycord[0] && changey < 0)) {
				count = num_cycles-1;
			}
		}
	}
}

//delays execution to draw it live
function draw_realtime_line(start_xcord, start_ycord, xprime_func, yprime_func) {

	var current_xcord = start_xcord;
	var current_ycord = start_ycord;
	var new_xcord = 0;
	var new_ycord = 0;

	var count = 0;
	function iterate() {
		derivx = xprime_func(current_xcord,current_ycord,parameter);
		derivy = yprime_func(current_xcord,current_ycord,parameter);
		changex = derivx*delta;
		changey = derivy*delta;

		new_xcord = current_xcord + changex;
		new_ycord = current_ycord + changey;

		ctx.beginPath();

		ctx.strokeStyle = color_to_hex(color_associate(get_magnitude(derivx, derivy), mag_quantiles, color_array));
		draw_line(xcord_to_pixel(current_xcord), ycord_to_pixel(current_ycord), xcord_to_pixel(new_xcord), ycord_to_pixel(new_ycord));

		current_xcord = new_xcord;
		current_ycord = new_ycord;
		count += 1;

		if (crop_lines) {
			var xcord = current_xcord;
			var ycord = current_ycord;
			if ((xcord >= range_xcord[1] && changex > 0) || (xcord <= range_xcord[0] && changex < 0)) {
				count = num_cycles;
			}
			if ((ycord >= range_ycord[1] && changey > 0) || (ycord <= range_ycord[0] && changey < 0)) {
				count = num_cycles;
			}
		}
		if (count < num_cycles) {
			setTimeout(iterate, draw_line_timeout);
		}
	}
	iterate();
}

function draw_coordinates() {
	var step_x_pix = cv_w/(range_xcord[1]-range_xcord[0]);
	var step_y_pix = cv_h/(range_ycord[1]-range_ycord[0]);

	ctx.beginPath();
	ctx.strokeStyle = "#B3B3B3";
	ctx.lineWidth = 1;
	ctx.globalAlpha = coords_alpha;

	for (var i = 0; i < range_xcord[1]-range_xcord[0]; i++) {
		draw_line(i*step_x_pix, 0, i*step_x_pix, cv_h);
	}
	for (var j = 0; j < range_ycord[1]-range_ycord[0]; j++) {
		draw_line(0, j*step_y_pix, cv_w, j*step_y_pix);
	}
}

function draw_mouse_line(event) {
	var xoffset = document.getElementById("settings").getBoundingClientRect()["right"];
	var xpix = event.clientX - xoffset;
	var ypix = event.clientY;
	var xcord = xpix_to_cord(xpix);
	var ycord = ypix_to_cord(ypix);
	console.log("clicked on position: " + xcord + "," + ycord)
	draw_realtime_line(xcord, ycord, xprime, yprime);
}


function randint(min, max) {
	return Math.round(Math.random()*(max-min)) + min;
}

function randfloat(min, max) {
	return Math.random()*(max-min)+min;
}

function fade_canvas() {
	ctx.globalAlpha = 0.1;
	ctx.fillRect(0, 0, cv_w, cv_h);
	ctx.globalAlpha = 1.0;
}

function fill_background() {
	ctx.fillStyle = color_to_hex(background_color);
	ctx.fillRect(0, 0, cv_w, cv_h);
}

function save_image() {
	var link = document.createElement('a');
	link.download = 'download.png';
	link.href = cv.toDataURL();
	link.click();
	link.delete;
}

function change_color_preset() {
	var preset = document.getElementById("colorpreset").value;
	document.getElementById("colorarray").value = color_array_presets[preset];
}

function random_spawn_xpos() {
	//return randfloat(range_spawn_xcord[0] < 0 ? range_spawn_xcord[0]*1.25 : range_spawn_xcord[0]*0.75, range_spawn_xcord[1] < 0 ? range_spawn_xcord[1]*0.75 : range_spawn_xcord[1]*1.25);
	return randfloat(range_spawn_xcord[0], range_spawn_xcord[1]);
}
function random_spawn_ypos() {
	//return randfloat(range_spawn_ycord[0] < 0 ? range_spawn_ycord[0]*1.25 : range_spawn_ycord[0]*0.75, range_spawn_ycord[1] < 0 ? range_spawn_ycord[1]*0.75 : range_spawn_ycord[1]*1.25);
	return randfloat(range_spawn_ycord[0], range_spawn_ycord[1]);
}
function random_xpos() {
	return randfloat(range_xcord[0], range_xcord[1]);
}
function random_ypos() {
	return randfloat(range_ycord[0], range_ycord[1]);
}

function draw_random_line(xprime_func, yprime_func) {
	var xpos = random_spawn_xpos();
	var ypos = random_spawn_ypos();
	draw_diffeq_line(xpos, ypos, xprime_func, yprime_func);
}

function draw_random_line_outside_canvas(xprime_func, yprime_func) {
	//TODO
	xleft = [range_spawn_xcord[0], range_xcord[0]];
	isxleft = xleft[0] < xleft[1];

	xright = [range_xcord[1], range_spawn_xcord[1]];
	isxright = xright[0] < xright[1];

	xleft_weight = (xleft[1] - xleft[0])/(xleft[1]-xleft[0]+xright[1]-xright[0]);
	if (!isxright) {
		xleft_weight = 1;
	}
	if (!isxleft) {
		xleft_weight = 0;
	}

	xpos = Math.random() > xleft_weight ? randfloat(xleft[0],xleft[1]) : randfloat(xright[0], xright[1]);

	yleft = [range_spawn_ycord[0], range_ycord[0]];
	isyleft = yleft[0] < yleft[1];

	yright = [range_ycord[1], range_spawn_ycord[1]];
	isyright = yright[0] < yright[1];

	yleft_weight = (yleft[1] - yleft[0])/(yleft[1]-yleft[0]+yright[1]-yright[0]);
	if (!isyright) {
		yleft_weight = 1;
	}
	if (!isyleft) {
		yleft_weight = 0;
	}

	ypos = Math.random() > yleft_weight ? randfloat(yleft[0],yleft[1]) : randfloat(yright[0], yright[1]);
	var ypos = random_spawn_ypos();
	draw_diffeq_line(xpos, ypos, xprime_func, yprime_func);
}

function draw_background_lines(xprime_func, yprime_func) {
	ctx.globalAlpha = line_alpha;
	if (draw_background_setting) {
		if (!no_line_breaks) {
			if (!stochastic_lines) {
				for (var i = 0; i < num_background_lines_x; i++) {
					for (var j = 0; j < num_background_lines_y; j++) {
						xpos = range_spawn_xcord[0]+(range_spawn_xcord[1]-range_spawn_xcord[0])*i/num_background_lines_x;
						ypos = range_spawn_ycord[0]+(range_spawn_ycord[1]-range_spawn_ycord[0])*j/num_background_lines_y;

						draw_diffeq_line(xpos, ypos, xprime_func, yprime_func);
					}
				}
			}
			else {
				var num_lines = num_background_lines_x * num_background_lines_y;

				for (var i = 0; i < num_lines; i++) {
					draw_random_line(xprime_func, yprime_func);
				}
			}
		} else {
			//no line breaks
			if (stochastic_lines) {
				var num_lines = num_background_lines_x * num_background_lines_y;

				for (var i = 0; i < num_lines; i++) {
					draw_random_line_outside_canvas(xprime_func, yprime_func);
				}
			}
		}
	}
	ctx.globalAlpha = 1;
}

function animate(xprime_func, yprime_func) {
	var param_step = parameter_range[1]-parameter_range[0];
	var param_start = parameter_range[0];

	for (var i = 0; i < parameter_frames; i++) {
		parameter = param_step*i+param_start;
		start();
		var link = document.createElement('a');
		link.download = "diffeq_output" + i + ".png";
		link.href = cv.toDataURL();
		link.click();
		link.delete;
	}
}

function clear_canvas() {
	ctx.clearRect(0, 0, cv_w, cv_h);
}

function start() {
	clear_canvas();
	fill_background();
	draw_background_lines(xprime, yprime);
	if (show_coords) {
		draw_coordinates();
	}
}

function update_settings() {
	xprime_string = document.getElementById("xp").value;
	yprime_string = document.getElementById("yp").value;
	delta = parseFloat(document.getElementById("del").value);
	num_background_lines_x = parseInt(document.getElementById("backx").value);
	num_background_lines_y = parseInt(document.getElementById("backy").value);
	num_cycles = parseInt(document.getElementById("iter").value);
	xprime = (x,y,c) => eval(xprime_string);
	yprime = (x,y,c) => eval(yprime_string);
	cv.width = window.innerWidth - 250;
	cv.height = window.innerHeight;
	cv_w_field = document.getElementById("xres").value;
	cv_h_field = document.getElementById("yres").value;
	cv_w = cv_w_field == "" ? cv.width : parseInt(cv_w_field);
	cv_h = cv_h_field == "" ? cv.height : parseInt(cv_h_field);
	cv.width = cv_w;
	cv.height = cv_h;
	line_width = parseFloat(document.getElementById("lwidth").value);
	ctx.lineWidth = line_width;
	stochastic_lines = document.getElementById("stochastic").checked;
	range_xcord = eval(document.getElementById("xrange").value);
	range_ycord = eval(document.getElementById("yrange").value);
	crop_lines = document.getElementById("crop").checked;
	show_coords = document.getElementById("coords").checked;
	line_alpha = parseFloat(document.getElementById("lalpha").value);
	taper_off = document.getElementById("taperoff").checked;
	taper_segments = parseInt(document.getElementById("taperlength").value);
	coords_alpha = parseFloat(document.getElementById("coordsalpha").value);
	//TODO
	num_quantiles = parseInt(document.getElementById("quantiles").value);
	color_array = eval(document.getElementById("colorarray").value);
	invert_colors = document.getElementById("invert").checked;
	if (invert_colors) {
		color_array.reverse();
	}
	background_color = eval(document.getElementById("backgroundcol").value);
	lp_l = parseFloat(document.getElementById("lp").value);
	range_spawn_xcord = eval(document.getElementById("xspawn").value);
	range_spawn_ycord = eval(document.getElementById("yspawn").value);
	mag_quantiles = get_magnitude_quantiles(xprime, yprime);
	start();
}

start();
