class room{
    constructor(height, width, x, y){
        this.height = height;
        this.width = width;
        this.x = x;
        this.y = y;
        this.neighbours = [];
        this.seen = false;
    }
}

class path{
    constructor(startX, startY, endX, endY){
        this.startX = startX;
        this.startY = startY;
        this.endX = endX;
        this.endY = endY;
        this.seen = false;
    }
}

class player{
    constructor(){
        this.x = 0; // player x position
        this.y = 0; // player y position
        this.facing = 3; // 0-up   1-left   2-down   3-right 
    }
}


Player = new player();
var pixelSize = window.innerHeight / 42;
var rooms = [];
var startingRoom;
var connected = [];
var paths = [];
var x = 0;
var y = 0;
var drawAll = false;
for(i = 0; i < 9; i++){
    newRoom = new room(rnd(6, 10), rnd(6, 10), x, y);
    rooms.push(newRoom);
    x++;
    if(x == 3){
        x = 0;
        y++;
    }
}
for(var i = 0; i < 9; i++){
    for(var a = 0; a < 9; a++){
        if((rooms[a].x == rooms[i].x + 1 && rooms[a].y == rooms[i].y) || (rooms[a].x == rooms[i].x - 1 && rooms[a].y == rooms[i].y) || (rooms[a].y == rooms[i].y + 1 && rooms[a].x == rooms[i].x) || (rooms[a].y == rooms[i].y - 1 && rooms[a].x == rooms[i].x)){
            rooms[i].neighbours += a;
        }
    }
    console.log(rooms);
}
selectStartingRoom();
function regenerateRoom(){
    x = 0;
    y = 0;
    for(i=0; i < 9; i++){
        rooms[i].height = rnd(3, 10);
        rooms[i].width = rnd(3, 10);
        rooms[i].x = x;
        rooms[i].y = y;
        x++;
        if(x == 3){
            x = 1;
            y++;
        }
    }
    console.log(rooms);
    selectStartingRoom();
}

function rnd(min, max){
    return Math.round(min + (max - min) * Math.random()); 
}

function selectStartingRoom(){
    startingRoom = rnd(0, 8);
    console.log(startingRoom);
    rooms[startingRoom].seen = true;
    console.log("Seen start");
}

let canvas = document.getElementById("canvas");
let context = canvas.getContext("2d");

canvas.height = window.innerHeight;
canvas.width = canvas.height;
canvas.style.top = 0;
canvas.style.left = 0;

canvas.style.background = "#888";
drawRooms();

function drawRooms(){
    var y = -1;
    var x;
    for(var i = 0; i < 9; i++){
        if(rooms[i].seen || drawAll){
            context.fillStyle = "#333";
            context.fillRect((1 + rooms[i].x * 14 ) * pixelSize,(1 + rooms[i].y * 14 ) * pixelSize, (rooms[i].width + 2) * pixelSize, (rooms[i].height + 2) * pixelSize);
            context.fillStyle = "#999";
            context.fillRect((2 + rooms[i].x * 14 ) * pixelSize,(2 + rooms[i].y * 14 ) * pixelSize, rooms[i].width * pixelSize, rooms[i].height * pixelSize);
            if(i == startingRoom){
                context.fillStyle = "#f00";
                context.fillRect((2 + rooms[i].x * 14 ) * pixelSize,(2 + rooms[i].y * 14 ) * pixelSize, 2 * pixelSize, 2 * pixelSize);
                context.fillStyle = "#999";
            }
            x++;
        }
    }
}
generatePaths();
function generatePaths(){
    connected = [];
    connected += startingRoom;
    paths = [];
    while (connected.length < 9){
        console.log("Start of loop");
        for(var i = 0; i < 9; i++){
            if(!connected.includes(i)){
                for(var a = 0; a < rooms[i].neighbours.length; a++){
                    if(connected.includes(rooms[i].neighbours[a])){
                        console.log("Possible path found!");
                        newPath = new path(rooms[i].x, rooms[i].y, rooms[rooms[i].neighbours[a]].x, rooms[rooms[i].neighbours[a]].y);
                        paths.push(newPath);
                        connected += i;
                        break;
                    }
                }
            }
        }
        console.log(connected.length);
        console.log("End of loop");
    }
    console.log("Paths generated");
    console.log(paths);
}
drawPaths();
function drawPaths(){
    for(var i = 0; i < paths.length; i++){
        if(paths[i].seen || drawAll){
            if(paths[i].startX == paths[i].endX){
                if(paths[i].startY < paths[i].endY){
                    context.fillStyle = "#333";
                    context.fillRect((5 + 14 * paths[i].startX) * pixelSize, (rooms[paths[i].startX + 3 * paths[i].startY].height + 2 + 14 * paths[i].startY) * pixelSize, 4 * pixelSize, ((2 + 14 * paths[i].endY) - (rooms[paths[i].startX + 3 * paths[i].startY].height + 2 + 14 * paths[i].startY)) * pixelSize);
                    context.fillStyle = "#999";
                    context.fillRect((6 + 14 * paths[i].startX) * pixelSize, (rooms[paths[i].startX + 3 * paths[i].startY].height + 2 + 14 * paths[i].startY) * pixelSize, 2 * pixelSize, ((2 + 14 * paths[i].endY) - (rooms[paths[i].startX + 3 * paths[i].startY].height + 2 + 14 * paths[i].startY)) * pixelSize);
                } else{
                    context.fillStyle = "#333";
                    context.fillRect((5 + 14 * paths[i].startX) * pixelSize, (2 + 14 * paths[i].startY) * pixelSize, 4 * pixelSize, ((paths[i].startY * 14 + 2) - (rooms[paths[i].endX + 3 * paths[i].endY].height + 2 + 14 * paths[i].endY)) * -pixelSize);
                    context.fillStyle = "#999";
                    context.fillRect((6 + 14 * paths[i].startX) * pixelSize, (2 + 14 * paths[i].startY) * pixelSize, 2 * pixelSize, ((paths[i].startY * 14 + 2) - (rooms[paths[i].endX + 3 * paths[i].endY].height + 2 + 14 * paths[i].endY)) * -pixelSize);
                }
            } else{
                if(paths[i].startX < paths[i].endX){
                    context.fillStyle = "#333";
                    context.fillRect((2 + rooms[paths[i].startX + 3 * paths[i].startY].width + 14 * paths[i].startX) * pixelSize, (5 + 14 * paths[i].startY) * pixelSize, ((2 + 14 * paths[i].endX) - (2 + 14 * paths[i].startX + rooms[paths[i].startX + 3 * paths[i].startY].width)) * pixelSize, 4 * pixelSize);
                    context.fillStyle = "#999";
                    context.fillRect((2 + rooms[paths[i].startX + 3 * paths[i].startY].width + 14 * paths[i].startX) * pixelSize, (6 + 14 * paths[i].startY) * pixelSize, ((2 + 14 * paths[i].endX) - (2 + 14 * paths[i].startX + rooms[paths[i].startX + 3 * paths[i].startY].width)) * pixelSize, 2 * pixelSize);
                } else{
                    context.fillStyle = "#333";
                    context.fillRect((2 + 14 * paths[i].startX) * pixelSize, (5 + 14 * paths[i].startY) * pixelSize, ((2 + 14 * paths[i].startX) - (2 + 14 * paths[i].endX + rooms[paths[i].endX + 3 * paths[i].endY].width)) * -pixelSize, 4 * pixelSize);
                    context.fillStyle = "#999";
                    context.fillRect((2 + 14 * paths[i].startX) * pixelSize, (6 + 14 * paths[i].startY) * pixelSize, ((2 + 14 * paths[i].startX) - (2 + 14 * paths[i].endX + rooms[paths[i].endX + 3 * paths[i].endY].width)) * -pixelSize, 2 * pixelSize);
                }
            }
        }
    }
}
function debug(){
    drawAll = !drawAll;
    redrawAll();
}

function redrawAll(){
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawRooms();
    drawPaths();
}

function regenerateMap(){
    regenerateRoom();
    selectStartingRoom();
    generatePaths();
    redrawAll();
}

var moved = false;

var pressedKeys = {};
document.onkeydown = function(ev) { pressedKeys[ev.key] = true; console.log(pressedKeys); gameTick() };
document.onkeyup = function(ev) { pressedKeys[ev.key] = undefined; console.log(pressedKeys); moved = false;};

function gameTick(){
    if(pressedKeys.w || pressedKeys.a || pressedKeys.s || pressedKeys.d){
        if(!moved){
            if(pressedKeys.w){
                
            } else if(pressedKeys.s){
                
            } else if(pressedKeys.a){

            } else if(pressedKeys.d){

            }
            moved = true;
        }
    }
}

