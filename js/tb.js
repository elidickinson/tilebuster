
var ball={x:50,y:50,y_dir:1,speed:1.6,r:6,color:"#909",state:"",state_tics:0,freeze:0};
var ball_back = $.extend(true, {}, ball);
var paused;
var controls={x_dir:0,speed:1.6};
var current_level=0;
var ctx, intervalId;
var BOARD_W = 400; // 10 tiles
var BOARD_H = 225; // 15 tiles
var score=0;
var custom_map;
var edit_mode;

var COLORS = {'r':"rgba(255,0,0,0.5)", 'g':"rgba(0,255,0,0.5)", 'b':"rgba(0,0,255,0.5)"};

var TILE_W = 40;
var TILE_H = 15;

var MAP_ROW_LEN = BOARD_W/TILE_W+1;

var MAX_TRIES = 10; //prevent bugs from crashing browser

var TILE_TYPES = " =oX@RGBrgb\n";

;;;var start_time;

var C = "ABCDEFGHIGKLMNOPQRSTUVWXYZ"; C=(C+C.toLowerCase() + "0123456789-_");

var MAP = [
// "AAAAAACwAAAAAAsAAAAAALAAAAAACwAAAAAAsAAIAAALAAAAAACwAAIAAAsAAFAAALAABAAACwAAAAAAsAAAAAALAAAAAACwAAAAAAsAAAAAAA", // test map
"gBABF3ewAQIBd3sAAAAXd7AAAAEACwAAABAAsRFVEQEbVQAAAAC1UAAAAAtVAAAAALERERGnewAAAAAAt3AAAAALRwAAAACxcAAAAAsRETEREQ", // 1
"AAAAAACyAAAAAAsAAAAAALYFVQUAaxBVUGAFsQU1BgYLEFBQZlCxBQUFgAsQUFBmULEFRQYGCxBVUGAFuQVVBQBrAAAAAACwAAAAAAsAAAAAAA", // 2 ("10k")
"EREREVWwAAAAAFsAAAAAALAAAAAAC1EREAAAtRCHFRALUQd3MQCwEAAHFQsBAAAHVbAQAAAHWwEAAAAFsBB3cAALAREVcAKwAAAVcAsAAAQReg", // 3
"B3BwcACwdwcHAAsBcHBwALCBERERCwNVUABgsBVVAAYLAVAAAGCyNAARFgsBcAAAYLAXdwAGCwN3cABgsKEREREbAVBQUBOwVQUFCTsFUFBQE7", // 4 kinda hard

"CFVQCmSwVVUAFmslVVAAALF1ERERGxcTURERsAVVAAALAAAAAACwAAAXd3thAAFXV7ABERAACwAAExEQt2AHd3cLdgAAAAC3YAAAAAuWAHd3dw", // 5 pretty hard
// "EAAACgCwAAVVIAsBEREHALAAAAFwCwAQAAgAsxEREAAbAAABcXGwAFVVVVsAEREREbAQAAAACwBVBVAAsAB3AHcLABEREACwAAQAAAsAAAAAAL", //FIXME, ugly
"MRExEQiwAFBQUAsCAAAAALAAAAAACwVQBQBQtRMRFRE7AHVBMQCwAFVREAsAAAAAALAAAAAAC6qnd3AAsXd3dwALkAAAAGO5AAAANgsXcAADgw", // 6 kinda hard
"gAAAAACwAAAAAAsAAAAAALMQBwAACwAHCgAAsRFwcREbVRMldXe1VDBXV3txERERF7d3c3d3e3AAAAAAtwAIAAALdxERF3e3cRERd3sAAAAAAL" // 7 way hard (bottom trick)
];

var map;

var IMG = {};

String.prototype.replCh = function(i,ch) {
	return this.substr(0,i) + ch + this.substr(i+1);
};

function encodeMap(m) {
	var out = "";
	var bits = "";
	for(i=0;i<m.length;i++) {
		bits+= zeroPad(TILE_TYPES.indexOf(m[i]).toString(2),4);
	}
	for(i=0;i<bits.length;i+=6) {
		// 6 bits = base 64 character
    out+=C[parseInt(bits.slice(i,i+6),2)];
	}
	return out;
}

function zeroPad(s,n) {
  while(s.length<n) {
    s = "0"+s;
  }
  return s;
}

function decodeMap(s) {
	var out = "";
	var bits = "";
	for(i=0;i<s.length;i++) {
    bits += zeroPad(C.indexOf(s[i]).toString(2),6);
	}
	for(i=0;i<bits.length;i+=4) {
		// 4 bits = base 16 character
    out+=TILE_TYPES[parseInt(bits.slice(i,i+4),2)];
	}
	return out;
}

function mapIdxToXY(idx) {
	return [(idx%MAP_ROW_LEN)*TILE_W, Math.floor(idx/MAP_ROW_LEN)*TILE_H];
}

function setBalls(b) {
	balls=b;
	$("#b").html(new Array(b+1).join("&bull;") );
}

function init() {
	clear();
	$.extend(ball,ball_back);
	var idx = setupBall();
	map[idx] = ' ';
  if(custom_map) {
    $("#l").html('<em>custom</em>');
  } else {
    $("#l").html(current_level+1);
  }
}

function setupBall() {
	var idx = map.indexOf("o");
	var ball_at = mapIdxToXY(idx);
	ball.x = ball_at[0] + (TILE_W/2);
	ball.y = ball_at[1] + (TILE_H/2);
	return idx;
}

function startGame() {
	current_level=0;
	map=MAP[0];
	setBalls(5);
	$("#s").html(score=0);
	init();
;;;	start_time = new Date();
  if(intervalId) halt();
	intervalId = setInterval(beat,19);
}

function beat() {
	moveBall();
	clear();
	drawMap();
	drawBoard();
	drawBall(ctx);
	handleState();
	;;;if(typeof debugBeat == "function") debugBeat();
}

function halt() {
	clearInterval(intervalId);
	intervalId=false;
}

function getTileAt(x,y,raw) {
	var col = Math.floor(x/TILE_W), row = Math.floor(y/TILE_H), tile = " ";
	try {
	 tile = map[row*MAP_ROW_LEN+col];
	} catch(e) { }
	if(!raw &&(tile == ""||tile=="o")) tile  = " "; // FIXME
	return {"c":col, "r":row, "tile":tile};
}


function checkCollision(x,y) {
	var rad,tileData,ex,ey;
	for(var i=0;i<360;i+=45) {
		rad = i*Math.PI/180;
		ex = Math.cos(rad)*ball.r;
		ey = Math.sin(rad)*ball.r;
		tileData = getTileAt(x+ex,y+ey,0);
		if(tileData.tile != " ") {
			return tileData;
		}
	}
	return false;
}

function handleState() {
	if(paused) return;
	ball.state_tics++;
	if(ball.state == "winning") {
		x=1+ball.state_tics/10;
		w=TILE_W*x;
		h=TILE_H*x;
		ctx.drawImage(IMG.win,BOARD_W/2-w/2,BOARD_H/2-h/2,w,h);
		if(ball.state_tics == 50) {
			nextLevel();
		}
	}
	if(ball.state == "dying") {
		ball.color = "black";
		if(ball.state_tics%10 == 0) {
			ball.r--;
			ball.speed /= 2;
		}
		if(ball.r < 0) {
			setBalls(balls-1);
			if(balls==0) {
				halt();
				alrt("Game Over!");
			}
			else {
				init();
			}
			
		}
	}
}

function nextLevel(lvl) {
;;;	if(lvl) {
;;;		current_level=lvl-2;
;;;	}
	if(!map.match(/[RGB]/)) {
		// bonus for clearing all colored tiles
		score+=25;
		setBalls(balls+1);
		msg("+25 points and +1 life for smashing all tiles!");
	}
	else {
    msg("+10 points for clearing level");
	}
	$("#s").html(score += 10);
	if(current_level >= MAP.length-1) {
		halt();
		alrt("Congrats! You win!");
	}
	else {
		current_level++;
		map = MAP[current_level];
		init();
	}
	
}

function drawTile(ctx,tile,x,y) {
	if(tile.match(/[RGB]/)) {
		ctx.drawImage(IMG.crk,x,y);
		paintTile(ctx,x,y,COLORS[tile.toLowerCase()]);
	}
	else if(tile.match(/[rgb]/)) {
    ctx.fillStyle = "#BBB";
    circle(ctx,x+TILE_W/2,y+TILE_H/2,3);
		paintTile(ctx,x,y,COLORS[tile]);
	}
	switch(tile) {
		case "X":
			ctx.drawImage(IMG.die,x,y);
			break;
		case "=":
			ctx.beginPath();
			ctx.rect(x+1,y+1,TILE_W-2,TILE_H-2);
			ctx.closePath();
			ctx.fillStyle = "#999";
			ctx.strokeStyle = "#333";
			ctx.fill();
			ctx.stroke();
			break;
		case "@":
			ctx.drawImage(IMG.win,x,y);
			break;
	}	
}

// function ss(s) {
// 	$("#s").html(score += s);	
// }

function drawMap() {
	var tile_x, tile_y;
	for(i=0;i<map.length;i++) {
		tile_x = TILE_W * (i%MAP_ROW_LEN);
		tile_y = TILE_H * Math.floor(i/MAP_ROW_LEN);
		drawTile(ctx,map[i],tile_x,tile_y);
	}
}

function drawIntro() {
	clear();
	var x = 25+TILE_W+5;
	var y = 50;
	
	ctx.textAlign = "left";	
	ctx.font = "bold 11px sans-serif";
	ctx.fillStyle = "black";
	ctx.fillText("Changes your color",x,50+12);
	ctx.fillText("Smash these if your ball color matches",x,75+12);
	ctx.fillText("Avoid!",x,100+12);
	ctx.fillText("Advance to next level",x,125+12);
	ctx.fillText("Tip: bonus points for smashing all tiles on a level",25,160+12);
	ctx.font = "bold 14px sans-serif";
	ctx.fillText("Press <space> when ready",105,200+12);	
	
	x = 25;
	ctx.fillStyle = "#BBB";
  circle(ctx,x+TILE_W/2,y+TILE_H/2,3);
	paintTile(ctx,x,y,COLORS.r);
	
	try {
	ctx.drawImage(IMG.crk,25,75);
	paintTile(ctx,x,75,COLORS.r);
	ctx.drawImage(IMG.die,x,100);
	ctx.drawImage(IMG.win,x,125);
	} catch(e) { 
	//handle images not yet loaded
	}
	alrt("Welcome to Tile Buster");
}

function paintTile(ctx,x,y,c) {
  ctx.fillStyle = c;
	ctx.beginPath();
	ctx.rect(x,y,TILE_W,TILE_H);
	ctx.closePath();
	ctx.fill();
}

function setTile(col,row,tileCh) {
	map = map.replCh((row*MAP_ROW_LEN)+col,tileCh);
}

function moveBall() {
	if(ball.freeze || paused) return;
	// first do ball inertia
	ball.y += ball.speed * ball.y_dir;
	
	// see if we hit a tile
	var hit_tile = checkCollision(ball.x,ball.y);
	var tries = 0;
	if(hit_tile) {
		handleHit(hit_tile);
		do {
			ball.y -= ball.y_dir ; // back away from tile
			tries++;
		} while(tries < MAX_TRIES && (checkCollision(ball.x,ball.y) !== false));
		ball.y_dir *= -1; // reverse direction of ball
	}
	
	
	// then user movement
	ball.x += controls.speed * controls.x_dir;
	hit_tile = checkCollision(ball.x,ball.y);
	if(hit_tile) {
		handleHit(hit_tile);
		tries = 0;
		do {
			ball.x -= controls.x_dir;
			tries++;
		} while((tries < MAX_TRIES) && (controls.x_dir != 0) && (checkCollision(ball.x,ball.y) != false));
		//controls.x_dir = 0;
	}
	
	// check edges of board
	if(ball.x < ball.r) {
		ball.x += ball.r - ball.x;
	}
	if(ball.x > BOARD_W - ball.r) {
		ball.x = BOARD_W - ball.r;
	}
	
	if(ball.y < ball.r) {
		ball.y += (ball.r - ball.y);
		ball.y_dir *= -1;
	}
	if(ball.y > BOARD_H - ball.r) {
		ball.y -=  ball.y - (BOARD_H - ball.r);
		ball.y_dir *= -1;
	}
	
	
}

function handleHit(td) { // td = tile data
	;;;if(typeof debugHit == "function") { debugHit(td); }
	if((td.tile == "R" && ball.color == COLORS.r) ||
		 (td.tile == "G" && ball.color == COLORS.g) ||
		 (td.tile == "B" && ball.color == COLORS.b)){
		setTile(td.c,td.r," "); //Dissolve tile
		$("#s").html(score += 1);
	}
	switch(td.tile){
		case "X":
			if(ball.state!='dying') {
        msg("Careful! Avoid the black tiles!");
				ball.state = "dying";
				ball.state_tics = 0;
			}
			break;
		case "@":
			ball.state = "winning";
			ball.state_tics = 0;
			ball.freeze=1;
			break;
		case "r": case "b": case "g":
			ball.color = COLORS[td.tile];
			break;
	}
}

function drawBall(ctx) {
	ctx.strokeStyle = "#AAA";
	ctx.fillStyle = ball.color;
	circle(ctx,ball.x, ball.y, ball.r);
}

function drawBoard() {
	ctx.strokeStyle = "black";
	ctx.beginPath();
	ctx.rect(0,0,BOARD_W,BOARD_H);
	ctx.closePath();
	ctx.stroke();
}

function clear() {
	ctx.clearRect(0,0,BOARD_W,BOARD_H);
}

function circle(ctx,x,y,r) {
  if(r<=0) return;
	ctx.beginPath();
	ctx.arc(x, y, r, 0, Math.PI*2, true);
	ctx.closePath();
	ctx.fill();
}

function drawSelTile(){
	var edctx = $("#edtile")[0].getContext("2d");
	edctx.clearRect(0,0,TILE_W,TILE_H);
	t = TILE_TYPES[sel_tile];
	drawTile(edctx,t,0,0);
	if(t == 'o') {
		ball.x = TILE_W/2;
		ball.y = TILE_H/2;
		drawBall(edctx);
	}
}

function tileAtClick(e) {
	var off = $("#canvas").offset();
	return getTileAt(e.pageX-off.left,e.pageY-off.top,1);
}

function levelEd() {
	$(".cust,.std").hide();
	$(".ed").show();
	halt();
	init();
	map=MAP[current_level];
	drawMap();
	drawBall(ctx);
	sel_tile = 0;
	$("#edtile").click(function() {
		if(sel_tile==TILE_TYPES.length-2) {
			sel_tile=0;
		} 
		else {
			sel_tile++;
		}
		drawSelTile();
	});
	$("#edtile").click();
	$("#canvas").mousedown(function(e){
	  var t = tileAtClick(e);
		if(e.button==0) { //left click to place tile
      t.tile = TILE_TYPES[sel_tile];
      var idx = map.indexOf("o");
      if((t.tile=='o') && (idx != -1)) {
        // only one ball starting location per map
        map = map.replCh(idx,' ');
      }
      setTile(t.c,t.r,t.tile);
      
      clear();
      
      // set up ball to render
      setupBall();
      drawBall(ctx);
      // render map
      drawMap();
    }
    else {
      // right click to select tile
      sel_tile=TILE_TYPES.indexOf(t.tile);
      drawSelTile();
    }
	}).bind('contextmenu',function(e){ e.preventDefault(); });
	
	$("#clearmap").click(function(){
		if(confirm("Are you sure?")){
			map=map.replace(/[^ \n]/g,' ');
			clear();			
		}
	});
}

function aOk() {
	return confirm("Are you sure you want to abandon this game?");
}

function msg(s) {
	$("#m").fadeIn(2000).html(s).fadeOut(2000);
}

function alrt(s) {
	ctx.fillStyle = "black";
	ctx.font = "bold 20px sans-serif";
	ctx.textAlign = "center";
	ctx.strokeStyle = "white";
	ctx.strokeText(s,BOARD_W/2,20);
	ctx.fillText(s,BOARD_W/2,20);
}

$(document).ready(function() {
	ctx = $("#canvas")[0].getContext("2d");

	$(".reload").click(function() { 
		window.location.hash = '';
		window.location.reload();
	});
	$("#bPause").click(function(e){paused = !paused;});
	$("#bRestart").click(function(){ 
		if(aOk()) { 
			halt();
			drawIntro();
			$("#bRestart").blur();
		}
	});
	$("#bEdit").click(function(){
		if(edit_mode) {
			window.location.hash = encodeMap(map);
			window.location.reload();
		}
		else {
			if(!intervalId || aOk()) {
				edit_mode=1;
				levelEd();
				$("#bEdit").html("Play this level!");
				// $("#edit_instr").show();
			}			
		}
	});

	$(document).keydown(function(event) {
		switch(event.keyCode) {
			case 37: //left
				event.preventDefault();
				controls.x_dir = -1;
				break;
			case 39: // right
				event.preventDefault();
				controls.x_dir = 1;
				break;
			case 32: //space
				event.preventDefault();
				if(!intervalId) {
					startGame();
				}
				else {
					;;; paused = !paused;
				}
				break;
		}
	});
	$(document).keyup(function(event) {
		if(event.keyCode == 37 && controls.x_dir < 0) {
			controls.x_dir = 0;
		}
		if(event.keyCode == 39 && controls.x_dir > 0) {
			controls.x_dir = 0;
		}	
	});
  
  // preload imgs
  ["die","win","crk"].forEach(function(x) {
    IMG[x] = new Image();	IMG[x].src = "/myfiles/tilebuster/img/tb_"+x+".png";
    IMG[x].onload = drawIntro;
  });

	// check for passed map data
	var h = window.location.hash.replace("#","");
	if(h.length == 110) {
		MAP = [decodeMap(h)];
		custom_map=1;
		$(".cust").show();
		//$("#u").html(window.location.href);
	}
	else {
		for(i in MAP) {
			MAP[i]=decodeMap(MAP[i]);
		}
	}
	map=MAP[0];
	
});