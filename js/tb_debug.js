var debug_tics = 0;

function clog(s) {
  try {
    console.log(s);
  } catch(e) { }
}

function debugBeat() {
	debug_tics++;
	if(debug_tics%200 == 0) {
		printDebugStats();
	}
}


function printDebugStats() {
	var secs = (new Date() - start_time)/1000;
	clog(debug_tics / secs);
	start_time = new Date();
	debug_tics = 0
}

function debugHit(tileData) {
	if(tileData.tile != ' ') {
		//clog("hit "+tileData.tile);
	}
}




function encodeMap2(m) { // TODO
  var output = "";
  var hex = "";
  var bits = ""
  for(i=0;i<m.length;i++) {
    new_bits = TILE_TYPES.indexOf(m[i]).toString(2);
    while(new_bits.length < 4) { new_bits = '0'+new_bits; }
    bits += new_bits;
    if((i%3==0 && i>0) || i == m.length-1) {
      console.log(parseInt(bits,2).toString(16));;
      console.log("slice1:"+bits.slice(0,6));
      console.log("slice2:"+bits.slice(6));
      output += C[parseInt(bits.slice(0,6),2)];
      output += C[parseInt(bits.slice(6),2)];
      bits = "";
    }
  }
  return output;
}

function decodeMap2(s) { // TODO
  //var C = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")
  var output = "";
  for(i=0;i<s.length;i++) {
    
  }
  var rows = s.split("-");
  for(i=0;i<rows.length;i++) {
    if(rows[i]=="")
      continue;
    tiles = parseInt(rows[i],32).toString(TILE_TYPES.length+1);
    for(j=0;j<tiles.length;j++) {
      output+=TILE_TYPES[tiles[j]];
    }
    output+="\n"
  }
  return output;
}
