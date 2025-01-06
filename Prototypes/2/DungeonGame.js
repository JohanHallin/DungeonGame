var level = 1; // Current level
var hole; // Hole position
var chests = []; // All chests that should be drawn
var money = 0; // How much money the player has
var score = 0; // Score = total mony earned
var merchant; // Merchant position
var trading = false; // If player is trading
var time = Date.now(); // Time of last input
var inputCooldown = 200; // Cooldown between player inputs (ms)
var enemies = []; // Stores all spawned enemies

// Debug settings
// False by default 
var seeAllRooms = false;
var seeAllPaths = false;

// Represents a vector with two values
class Vector2{
    constructor(x, y){
        this.x = x;
        this.y = y;
    }
}

// Chest
class Chest{
    constructor(pos){
        this.pos = pos;
        this.loot = rnd(50, (100 * (2 ** (level / 5)))); // Loot max starts at 100, doubles every 5th level. Loot min value is always half of max
        this.looted = false;
    }
}

// Defines the player
class Player{
    constructor(pos, rot, sprite){
        this.pos = pos;
        this.rot = rot;
        this.sprite = sprite;
        this.stamina = 10;
        this.health = 10;
        this.armour = 0;
        this.attackPower = 1;
        this.attackRange = 1;
    }
}

// Defines enemies
class Enemy{
    constructor(room, sprite){
        this.room = room;
        while(true){
            var pos = new Vector2(Math.floor(rnd(room.pos.x, room.pos.x + room.size.x - 1)), Math.floor(rnd(room.pos.y, room.pos.y + room.size.y - 1)))
            if(walkable[pos.x + ": " + pos.y]){
                walkable[pos.x + ": " + pos.y] = false;
                this.pos = pos;
                break;
            }
        }
        this.rot = rnd(3);
        this.sprite = sprite;
        this.health = 4 + level;
        this.attackPower = 1 + Math.floor(level / 3);
        this.stunned = false;
    }
}

// Defines what a rooms is
class Room{
    constructor(pos, size){
        this.pos = pos;
        this.size = size;
        this.seen = false;
        this.neighbours = [];
        this.objects = [];
    }
}

// Defines what a path is
class Path{
    constructor(start, end){
        this.start = start;
        this.end = end;
        this.seen = false;
    }
}

// Generate random whole number between
function rnd(in1, in2){
    if(in1 < in2){
        return Math.round(in1 + (in2 - in1) * Math.random()); // in2 and in1 value
    } else if(in1 != undefined){
        return Math.round(in1 * Math.random()); // 0 and in1
    } else{
        return undefined;
    }
}

// Interactable tiles
let interactable = new class Interactable{};
function clearInteractable(){interactable = new class Interactable{}}

// Tiles that are walkable
let walkable = new class Walkable{}
function clearWalkable(){walkable = new class Walkable{}}

// Startup function
// Calls alls functions that need to run at start
function startUp(){
    generateRooms();
    calculateNeighbours();
    selectStartingRoom();
    createPlayer();
    generatePaths();
    generateGameObjects();
    canvas.style.background = "#888";
    onresize();
    requestAnimationFrame(playerInput);
}

// Map settings
var layout = new Vector2(5,3);
var roomMargin = 2;
var roomMinSize = new Vector2(6, 6);
var roomMaxSize = new Vector2(10, 10);
var wallThickness = 0.5; // Should NOT be less or equal to roomMargin or scuff
var pathWidth = 2;
var startingRoom;
function selectStartingRoom(){
    startingRoom = new Vector2(rnd(layout.x - 1), rnd(layout.y - 1));
    rooms[startingRoom.x][startingRoom.y].seen = true;
}

// Merchant settings
// x = Item name | y = Item price
var stock = [new Vector2("Health Refill", 1000), new Vector2("+Damage", 100), new Vector2("Armour", 50)];

// Game does thingies
function gameTick(){
    if(staminaRegen && player.stamina < 10){
        if(getStamina == 3){ // Regain one stamina every 3 turns
            player.stamina++
            getStamina = 0;
        }
        getStamina++;
    }
    staminaRegen = true;

    if(enemies.length > 0){
        enemies.forEach((i) => moveEnemy(i));
    }
}

var shift = false;
var staminaRegen = true;
var getStamina = false;

var keys = {};

// Keydown (key press starts)
document.addEventListener('keydown', function(event){
    keys[event.key.toLowerCase()] = true;
})

// Keyup (key press ends) 
document.addEventListener('keyup', function(event) {
    keys[event.key.toLowerCase()] = false;
})

// Map data
var paths;
var rooms;
function generateRooms(){
    rooms = [];
    for(var x = 0; x < layout.x; x++){
        rooms.push(new Array());
        for(var y = 0; y < layout.y; y++){
            rooms[x].push(new Room(new Vector2(roomMargin + x * (2 * roomMargin + roomMaxSize.x), Math.ceil(wallThickness) + y * (2 * roomMargin + roomMaxSize.y)), new Vector2(rnd(roomMinSize.x, roomMaxSize.x), rnd(roomMinSize.y, roomMaxSize.y))));
            for(var x2 = rooms[x][y].pos.x; x2 < rooms[x][y].pos.x + rooms[x][y].size.x; x2++){
                for(var y2 = rooms[x][y].pos.y; y2 < rooms[x][y].pos.y + rooms[x][y].size.y; y2++){
                    walkable[x2 + ": " + y2] = true;
                }
            }
        }
    }
}

// Player
var player;
function createPlayer(){
    player = new Player(new Vector2(roomMargin + startingRoom.x * (2 * roomMargin + roomMaxSize.x), roomMargin + startingRoom.y * (2 * roomMargin + roomMaxSize.y)), 2, null);
}

// Canvas
let canvas = document.getElementById("canvas");
/**
 * @type {CanvasRenderingContext2D}
 */
let context = canvas.getContext("2d");

// pixelSize used to convert coordinates into pixels depending on screen size
var pixelSize;
function calculatePixelSize(){
    pixelSize = new Vector2(canvas.width / ((2 * roomMargin + roomMaxSize.x) * layout.x), canvas.height / ((2 * roomMargin + roomMaxSize.y) * layout.y));
}

// Resize canvas size when resizing window
window.onresize = function(ev) { 
    canvas.height = window.innerHeight;
    canvas.width = window.innerWidth;
    calculatePixelSize();
    draw();
}

// Calls all draw functions
function draw(){
    if(player.health > 0){
        clearCanvas();
        drawRoomWalls();
        drawRooms();
        drawPathWalls();
        drawPaths();
        drawDoors();
        drawPlayer();
        drawHole();
        drawChests();
        drawMerchant();
        drawEnemies();
        drawPlayerStats();
        drawTradingMenu();
    }else{gameOver()}
}

// Clears canvas
function clearCanvas(){
    context.clearRect(0, 0, canvas.width, canvas.height);
}

// Draws player
function drawPlayer(){

    // Player
    context.fillStyle = "#F00";
    context.fillRect(player.pos.x * pixelSize.x, player.pos.y * pixelSize.y, pixelSize.x, pixelSize.y);

    // Rotation
    context.fillStyle = "#00F";
    if(player.rot == 0){
        context.fillRect(player.pos.x * pixelSize.x, player.pos.y * pixelSize.y, pixelSize.x, pixelSize.y / 4);
    } else if(player.rot == 1){
        context.fillRect((player.pos.x + 3 / 4) * pixelSize.x, player.pos.y * pixelSize.y, pixelSize.x / 4, pixelSize.y);
    } else if(player.rot == 2){
        context.fillRect(player.pos.x * pixelSize.x, (player.pos.y + 3 / 4) * pixelSize.y, pixelSize.x, pixelSize.y / 4);
    } else{
        context.fillRect(player.pos.x * pixelSize.x, player.pos.y * pixelSize.y, pixelSize.x / 4, pixelSize.y);
    }
}

// Draw all room walls
function drawRoomWalls(){
    for(var x = 0; x < layout.x; x++){
        for(var y = 0; y < layout.y; y++){
            if(rooms[x][y].seen || seeAllRooms){
                context.fillStyle = "#333";
                context.fillRect((rooms[x][y].pos.x - wallThickness) * pixelSize.x, (rooms[x][y].pos.y - wallThickness) * pixelSize.y, (rooms[x][y].size.x + wallThickness * 2) * pixelSize.x, (rooms[x][y].size.y + wallThickness * 2) * pixelSize.y);
            }
        }
    }
}

// Draws all rooms
function drawRooms(){
    for(var x = 0; x < rooms.length; x++){
        for(var y = 0; y < rooms[x].length; y++){
            if(rooms[x][y].seen || seeAllRooms){
                context.fillStyle = "#999";
                context.fillRect(rooms[x][y].pos.x * pixelSize.x, rooms[x][y].pos.y * pixelSize.y, rooms[x][y].size.x * pixelSize.x, rooms[x][y].size.y * pixelSize.y);
            }
        }
    }
}

// Draws all path walls
function drawPathWalls(){
    for(var i = 0; i < paths.length; i++){
        if(paths[i].seen || seeAllPaths){
            context.beginPath();
            context.strokeStyle = "#333";
            if(paths[i].start.x == paths[i].end.x){
                context.lineWidth = (pathWidth + 2 * wallThickness) * pixelSize.x;
            }else{  
                context.lineWidth = (pathWidth + 2 * wallThickness) * pixelSize.y;
            }
            context.moveTo(paths[i].start.x * pixelSize.x, paths[i].start.y * pixelSize.y);
            context.lineTo(paths[i].end.x * pixelSize.x, paths[i].end.y * pixelSize.y);
            context.stroke();
        }
    }
}

// Draws all paths
function drawPaths(){
    for(var i = 0; i < paths.length; i++){
        if(paths[i].seen || seeAllPaths){
            context.beginPath();
            context.strokeStyle = "#999";
            if(paths[i].start.x == paths[i].end.x){
                context.lineWidth = pathWidth * pixelSize.x;
            }else{
                context.lineWidth = pathWidth * pixelSize.y;
            }
            context.moveTo(paths[i].start.x * pixelSize.x, paths[i].start.y * pixelSize.y);
            context.lineTo(paths[i].end.x * pixelSize.x, paths[i].end.y * pixelSize.y);
            context.stroke();
        }
    }
}

// Draws doors
function drawDoors(){
    var startRoom;
    var endRoom;
    for(var i = 0; i < paths.length; i++){
        endRoom = rooms[Math.floor(paths[i].start.x / (roomMaxSize.x + roomMargin * 2))][Math.floor(paths[i].start.y / (roomMaxSize.y + roomMargin * 2))];
        startRoom = rooms[Math.floor(paths[i].end.x / (roomMaxSize.x + roomMargin * 2))][Math.floor(paths[i].end.y / (roomMaxSize.y + roomMargin * 2))];
        context.fillStyle = "#964B00";
        if(paths[i].seen && !endRoom.seen){ // Door at end of path
            if(paths[i].start.x == paths[i].end.x){ // Vertical
                if(paths[i].start.y < paths[i].end.y){ // Down
                    context.fillRect((paths[i].start.x - pathWidth / 2) * pixelSize.x, paths[i].start.y * pixelSize.y, pathWidth * pixelSize.x, wallThickness * pixelSize.y);
                }else{ // Up
                    context.fillRect((paths[i].start.x - pathWidth / 2) * pixelSize.x, (paths[i].start.y - wallThickness) * pixelSize.y, pathWidth * pixelSize.x, wallThickness * pixelSize.y);
                }
            }else{ // Horizontal
                if(paths[i].start.x < paths[i].end.x){ // Right
                    context.fillRect(paths[i].start.x * pixelSize.x, (paths[i].start.y - pathWidth / 2) * pixelSize.y, wallThickness * pixelSize.x, pathWidth * pixelSize.y);
                }else{ // Left
                    context.fillRect((paths[i].start.x - wallThickness) * pixelSize.x, (paths[i].start.y - pathWidth / 2) * pixelSize.y, wallThickness * pixelSize.x, pathWidth * pixelSize.y);
                }
            }
        } else if(!paths[i].seen && startRoom.seen){ // Door at start of path
            if(paths[i].start.x == paths[i].end.x){ // Vertical
                if(paths[i].start.y < paths[i].end.y){ // Down
                    context.fillRect((paths[i].end.x - pathWidth / 2) * pixelSize.x, (paths[i].end.y - wallThickness) * pixelSize.y, pathWidth * pixelSize.x, wallThickness * pixelSize.y);
                } else{ // Up
                    context.fillRect((paths[i].end.x - pathWidth / 2) * pixelSize.x, (paths[i].end.y) * pixelSize.y, pathWidth * pixelSize.x, wallThickness * pixelSize.y);
                }
            }else{ // Horizontal
                if(paths[i].start.x < paths[i].end.x){ // Right
                    context.fillRect((paths[i].end.x - wallThickness) * pixelSize.x, (paths[i].end.y - pathWidth / 2) * pixelSize.y, wallThickness * pixelSize.x, pathWidth * pixelSize.y);
                }else{ // Left
                    context.fillRect(paths[i].end.x * pixelSize.x, (paths[i].end.y - pathWidth / 2) * pixelSize.y, wallThickness * pixelSize.x, pathWidth * pixelSize.y);
                }
            }
        }
    }
}

// Generate paths
function generatePaths(){
    paths = [];
    var connected = {};
    connected[startingRoom.x + ", " + startingRoom.y] = true;
    while(paths.length < layout.x * layout.y - 1){
        for(x = 0; x < layout.x; x++){
            for(y = 0; y < layout.y; y++){

                // Checks if neighbours are connected to start
                var connectedNeighbours = [];
                for(var i = 0; i < rooms[x][y].neighbours.length; i++){
                    var neighbour = rooms[x][y].neighbours[i];
                    if(connected[neighbour.x + ", " + neighbour.y]) {
                        connectedNeighbours.push(neighbour);
                    }
                }
                // Creates new path if room has any connected neighbours and if the room itself isn't connected 
                if((connectedNeighbours.length != 0) && !connected[x + ", " + y]){
                    var i = rnd(connectedNeighbours.length);
                    if(i < connectedNeighbours.length){
                        connected[x + ", " + y] = true;
                        var start = rooms[x][y];
                        var end = rooms[connectedNeighbours[i].x][connectedNeighbours[i].y];
                        if(start.pos.x < end.pos.x){          // Neighbour to right
                            paths.push(new Path(new Vector2(start.pos.x + start.size.x, start.pos.y + roomMinSize.y / 2), new Vector2(end.pos.x, start.pos.y + roomMinSize.y / 2)));
                            for(pathX = Math.floor(start.pos.x + start.size.x); pathX < end.pos.x; pathX++){
                                for(var pathY = Math.floor(start.pos.y + roomMinSize.y / 2 - 1); pathY <= end.pos.y + roomMinSize.y / 2; pathY++){
                                    walkable[pathX + ": " + pathY] = true;
                                }
                            }
                        }else if(start.pos.x > end.pos.x){    // Neighbour to left
                            paths.push(new Path(new Vector2(start.pos.x, start.pos.y + roomMinSize.y / 2), new Vector2(end.pos.x + end.size.x, start.pos.y + roomMinSize.y / 2)));
                            for(var pathX = Math.floor(end.pos.x); pathX < start.pos.x + start.size.x; pathX++){
                                for(var pathY = Math.floor(end.pos.y + roomMinSize.y / 2 - 1); pathY <= start.pos.y + roomMinSize.y / 2; pathY++){
                                    walkable[pathX + ": " + pathY] = true;
                                }
                            }
                        }else if(start.pos.y > end.pos.y){    // Neighbour above
                            paths.push(new Path(new Vector2(start.pos.x + roomMinSize.x / 2, start.pos.y), new Vector2(start.pos.x + roomMinSize.x / 2, end.pos.y + end.size.y)));
                            for(var pathX = Math.floor(end.pos.x + roomMinSize.x / 2 - 1); pathX <= start.pos.x + roomMinSize.x / 2; pathX++){
                                for(var pathY = Math.floor(end.pos.y); pathY < start.pos.y + start.size.y; pathY++){
                                    walkable[pathX + ": " + pathY] = true;
                                }
                            }
                        } else{                               // Neighbour below
                            paths.push(new Path(new Vector2(start.pos.x + roomMinSize.x / 2, start.pos.y + start.size.y), new Vector2(start.pos.x + roomMinSize.x / 2, end.pos.y)));
                            for(var pathX = Math.floor(start.pos.x + roomMinSize.x / 2 - 1); pathX <= end.pos.x + roomMinSize.x / 2; pathX++){
                                for(var pathY = Math.floor(start.pos.y); pathY < end.pos.y + end.size.y; pathY++){
                                    walkable[pathX + ": " + pathY] = true;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// Calculates which rooms any room is neighbouring
function calculateNeighbours(){
 for(var x = 0; x < layout.x; x++){
    for(var y = 0; y < layout.y; y++){
        
        for(var xComp = 0; xComp < layout.x; xComp++){
            for(var yComp = 0; yComp < layout.y; yComp++){
                if((x == xComp && (y == yComp - 1 || y == yComp + 1)) || (y == yComp && (x == xComp - 1 || x == xComp + 1))){
                    rooms[x][y].neighbours.push(new Vector2(xComp, yComp));
                }
            }
        }
    }
 }
}

// Generate game objects (ex. enemies, chests, merchants, way down)
function generateGameObjects(){

    // Clears all objects
    for(var x = 0; x < layout.x; x++){
        for(var y = 0; y < layout.y; y++){
            rooms[x][y].objects = [];
        }
    }

    // Hole to next level
    while(true){
        var a = new Vector2(rnd(layout.x - 1), rnd(layout.y - 1));
        if(a.x != startingRoom.x && a.y != startingRoom.y){
            rooms[a.x][a.y].objects.push("hole");
            console.log("Hole in " + a.x + ":" + a.y);
            break;
        }
    }

    // Enemies
    for(var i = 0; i < 5 + 2 * level; i++){
        while(true){
            var a = new Vector2(rnd(layout.x - 1), rnd(layout.y - 1));
            if(a.x != startingRoom.x && a.y != startingRoom.y){
                rooms[a.x][a.y].objects.push("enemy");
                console.log("Enemy in " + a.x + ":" + a.y);
                break;
            }
        }
    }

    // Merchant
    while(true){
        var a = new Vector2(rnd(layout.x - 1), rnd(layout.y - 1));
        if(a.x != startingRoom.x && a.y != startingRoom.y){
            rooms[a.x][a.y].objects.push("merchant");
            console.log("Merchant in " + a.x + ":" + a.y);
            break;
        }
    }

    // Chests
    for(var i = 0; i < rnd(6, 10); i++){
        while(true){
            var a = new Vector2(rnd(layout.x - 1), rnd(layout.y - 1));
            if(a.x != startingRoom.x && a.y != startingRoom.y){
                rooms[a.x][a.y].objects.push("chest");
                console.log("Chest in " + a.x + ":" + a.y);
                break;
            }
        }
    }
}

// Draw hole
function drawHole(){
    if(hole != undefined){
        context.fillStyle = "#000";
        context.fillRect(hole.x * pixelSize.x, hole.y * pixelSize.y, pixelSize.x, pixelSize.y);
    }
}

// Proceeds to next level if player interacts with hole
function nextLevel(pos){
    if(hole != undefined){
        if(pos.x == hole.x && pos.y == hole.y){
            level++;
            startingRoom = new Vector2(Math.floor(hole.x / (2 * roomMargin + roomMaxSize.x)), Math.floor(hole.y / (2 * roomMargin + roomMaxSize.y)));
            hole = undefined;
            merchant = undefined;
            chests = [];
            walkable = {};
            enemies = [];
            generateRooms();
            calculateNeighbours();
            player.pos = new Vector2(roomMargin + startingRoom.x * (2 * roomMargin + roomMaxSize.x), roomMargin + startingRoom.y * (2 * roomMargin + roomMaxSize.y));
            player.rot = 2;
            generatePaths();
            generateGameObjects();
            onresize();
        }
    }
}

// Draw chests
function drawChests(){
    for(var i = 0; i < chests.length; i++){
        if(chests[i].looted){ // Looted chest
            context.fillStyle = "#8b6c5c";
        }else{ // Unlooted chest
            context.fillStyle = "#6a4a3a";
        }
        context.fillRect(chests[i].pos.x * pixelSize.x, chests[i].pos.y * pixelSize.y, pixelSize.x, pixelSize.y);
    }
}

// Loot chest
function lootChest(pos){
    for(var i = 0; i < chests.length; i++){
        if(chests[i].pos.x == pos.x && chests[i].pos.y == pos.y && !chests[i].looted){
            money += chests[i].loot;
            score += chests[i].loot;
            chests[i].looted = true;
            draw();
        }
    }
}

// Draw player stats
function drawPlayerStats(){
    context.fillStyle = "#000";
    context.fillRect(0, 0, (roomMargin - wallThickness) * pixelSize.x, canvas.height);
    context.fillRect(canvas.width - (roomMargin - wallThickness) * pixelSize.x, 0, (roomMargin - wallThickness) * pixelSize.x, canvas.height);
    var statPixelSize = new Vector2((roomMargin - wallThickness) * pixelSize.x - 2, (canvas.height / 10) - 2);

    // Health
    context.fillStyle = "#f00";
    for(var i = 1; i <= player.health; i++){
        var pos = (canvas.height / 10) * (10 - i);
        context.fillRect(1, 1 + pos, statPixelSize.x, statPixelSize.y);
    }

    // Armour
    context.fillStyle = "#ffff00";
    for(var i = 1; i <= player.armour; i++){
        var pos = (canvas.height / 10) * (10 - i);
        context.fillRect(1, 1 + pos, statPixelSize.x / 2, statPixelSize.y);
    }
    
    // Stamina
    context.fillStyle = "#3cdfff";
    for(var i = 1; i <= player.stamina; i++){
        var pos = (canvas.height / 10) * (10 - i);
        context.fillRect(canvas.width - statPixelSize.x, 1 + pos, statPixelSize.x, statPixelSize.y);
    }

    // GUI bar at bottom of screen (money, score, damage, etc)
    context.fillStyle = "#333";
    context.fillRect(2 + statPixelSize.x, canvas.height - (roomMargin + wallThickness) * pixelSize.y, canvas.width - 4 - 2 * statPixelSize.x, pixelSize.y * (roomMargin + wallThickness));

    // Write score and money
    context.fillStyle = "#fff";
    context.font = pixelSize.y * 2 + "px Arial";
    context.fillText("Score: " + score + "  Money: " + money + "  Attack Power: " + player.attackPower + "  Level: " + level, roomMargin * pixelSize.x, canvas.height - (roomMargin + wallThickness - roomMargin) * pixelSize.y);   
}

// Trade with Merchant
function trade(pos){
    if(pos.x == merchant.x && pos.y == merchant.y){
        trading = true;
    }
}

// Draw Merchant
function drawMerchant(){
    if(merchant != undefined){
        context.fillStyle = "#8b0000";
        context.fillRect(merchant.x * pixelSize.x, merchant.y * pixelSize.y, pixelSize.x, pixelSize.y);
    }
}

// Draw trading menu
function drawTradingMenu(){
    if(trading){
        context.fillStyle = "#000";
        var image = new Image();
        image.src = "Textures\\Trading Menu.png";
        context.drawImage(image, canvas.width / 10, canvas.height / 10,canvas.width / 10 * 8,canvas.height / 10 * 8);
    }
}

// Player input
function playerInput(){
    
    if(player.health > 0){
        requestAnimationFrame(playerInput);
    }

    // Player moves
    if((keys["a"] || keys["arrowleft"]) && Date.now() - time > inputCooldown && (walkable[(player.pos.x - 1) + ": " + (player.pos.y)] || player.rot != 3)) {
        time = Date.now();
        trading = false;
        walkable[player.pos.x + ": " + player.pos.y] = true;
        if(keys["shift"]){staminaRegen = false; getStamina = 0;}
        if(keys["shift"] && player.stamina > 0){
            for(var i = 0; i < 2; i++){
                if(walkable[(player.pos.x - 1) + ": " + (player.pos.y)]){
                    player.pos.x -= 1;
                }
            }
            player.stamina--;
        }else if(walkable[(player.pos.x - 1) + ": " + (player.pos.y)]){
            player.pos.x -= 1;
        }
        walkable[player.pos.x + ": " + player.pos.y] = false;
        player.rot = 3;
        gameTick();
    } else if((keys["d"] || keys["arrowright"]) && Date.now() - time > inputCooldown && (walkable[(player.pos.x + 1) + ": " + (player.pos.y)] || player.rot != 1)){
        time = Date.now();
        trading = false;
        walkable[player.pos.x + ": " + player.pos.y] = true;
        if(keys["shift"]){staminaRegen = false; getStamina = 0;}
        if(keys["shift"] && player.stamina > 0){
            for(var i = 0; i < 2; i++){
                if(walkable[(player.pos.x + 1) + ": " + (player.pos.y)]){
                    player.pos.x += 1;
                }
            }
            player.stamina--;
        }else if(walkable[(player.pos.x + 1) + ": " + (player.pos.y)]){
            player.pos.x += 1;
        }
        walkable[player.pos.x + ": " + player.pos.y] = false;
        player.rot = 1;
        gameTick();
    } else if((keys["w"] || keys["arrowup"]) && Date.now() - time > inputCooldown && (walkable[(player.pos.x) + ": " + (player.pos.y - 1)] || player.rot != 0)){
        time = Date.now();
        trading = false;
        walkable[player.pos.x + ": " + player.pos.y] = true;
        if(keys["shift"]){staminaRegen = false; getStamina = 0;}
        if(keys["shift"] && player.stamina > 0){
            for(var i = 0; i < 2; i++){
                if(walkable[(player.pos.x) + ": " + (player.pos.y - 1)]){
                    player.pos.y -= 1;
                }
            }
            player.stamina--;
        }else if(walkable[(player.pos.x) + ": " + (player.pos.y - 1)]){
            player.pos.y -= 1;
        }
        walkable[player.pos.x + ": " + player.pos.y] = false;
        player.rot = 0;
        gameTick();
    } else if((keys["s"] || keys["arrowdown"]) && Date.now() - time > inputCooldown && (walkable[(player.pos.x) + ": " + (player.pos.y + 1)] || player.rot != 2)){
        time = Date.now();
        trading = false;
        walkable[player.pos.x + ": " + player.pos.y] = true;
        if(keys["shift"]){staminaRegen = false; getStamina = 0;}
        if(keys["shift"] && player.stamina > 0){
            for(var i = 0; i < 2; i++){
                if(walkable[(player.pos.x) + ": " + (player.pos.y + 1)]){
                    player.pos.y += 1;
                }
            }
            player.stamina--;
        }else if(walkable[(player.pos.x) + ": " + (player.pos.y + 1)]){
            player.pos.y += 1;
        }
        walkable[player.pos.x + ": " + player.pos.y] = false;
        player.rot = 2;
        gameTick();
    } else if(keys[" "] && Date.now() - time > inputCooldown){ // space
        time = Date.now();
        enemies.forEach((i, index) => {
            if(player.rot == 0 && player.pos.x == i.pos.x && i.pos.y < player.pos.y && i.pos.y >= player.pos.y - player.attackRange){ // Attack up
                i.health -= player.attackPower;
            }else if(player.rot == 2 && player.pos.x == i.pos.x && i.pos.y > player.pos.y && i.pos.y <= player.pos.y + player.attackRange){ // Attack down
                i.health -= player.attackPower;
            } else if(player.rot == 1 && player.pos.y == i.pos.y && i.pos.x > player.pos.x && i.pos.x <= player.pos.x + player.attackRange){ // Attack right
                i.health -= player.attackPower;
            } else if(player.ro == 3 && player.pos.y == i.pos.y && i.pos.x < player.pos.x && i.pos.x >= player.pos.x - player.attackRange){ // Attck Left
                i.health -= player.attackPower;
            }
            if(i.health < 1){
                walkable[i.pos.x + ": " + i.pos.y] = true;
                enemies.splice(index, 1);
            }
        })
        gameTick();
    } else if(keys["e"] && Date.now() - time > inputCooldown){ // e
        time = Date.now();
        if(player.rot == 0){ // Up
            var pos = new Vector2(player.pos.x, player.pos.y - 1);
        }else if(player.rot == 1){ // Right
            var pos = new Vector2(player.pos.x + 1, player.pos.y);
        }else if(player.rot == 2){ // Down
            var pos = new Vector2(player.pos.x, player.pos.y + 1);
        }else{ // Left
            var pos = new Vector2(player.pos.x - 1, player.pos.y);
        }
        nextLevel(pos);
        lootChest(pos); 
        trade(pos);
        if(!trading){
            gameTick();
        }
    } else if(trading){
        if(keys["1"] && Date.now() - time > 250 && player.health < 10){
            if(money >= stock[0].y){
                time = Date.now();
                money -= stock[0].y;
                player.health = 10;
            }
        }else if(keys["2"] && Date.now() - time > 250){
            if(money >= stock[1].y){
                time = Date.now();
                money -= stock[1].y;
                player.attackPower++;
            }
        }else if (keys["3"] && Date.now() - time > 250 && player.armour < 10){
            if(money >= stock[2].y){
                time = Date.now();
                money -= stock[2].y;
                player.armour++;
            }
        }
    }

    // Check if room should be seen
    var currentRoom = rooms[Math.floor(player.pos.x / (2 * roomMargin + roomMaxSize.x))][Math.floor(player.pos.y / (2 * roomMargin + roomMaxSize.y))];
    if(!currentRoom.seen){
        if(player.pos.x >= currentRoom.pos.x - 1 && player.pos.x <= (currentRoom.pos.x + currentRoom.size.x) && player.pos.y >= currentRoom.pos.y - 1 && player.pos.y <= (currentRoom.pos.y + currentRoom.size.y)){
            currentRoom.seen = true;

            // Spawns objects
            for(var i = 0; i < currentRoom.objects.length; i++){
                if(currentRoom.objects[i] == "hole"){
                    hole = new Vector2(rnd(currentRoom.pos.x + 1, currentRoom.pos.x + currentRoom.size.x - 2), rnd(currentRoom.pos.y, currentRoom.pos.y + currentRoom.size.y - 1));
                    walkable[hole.x + ": " + hole.y] = false;
                }else if(currentRoom.objects[i] == "enemy"){
                    enemies.push(new Enemy(currentRoom, undefined));
                }else if(currentRoom.objects[i] == "merchant"){
                    while(true){
                        var a = rnd(4);
                        if(a == 1){
                            pos = currentRoom.pos;
                        }else if(a == 2){
                            pos = new Vector2(currentRoom.pos.x + currentRoom.size.x - 1);
                        }else if(a == 3){
                            pos = new Vector2(currentRoom.pos.x, currentRoom.pos.y + currentRoom.size.y - 1);
                        }else{
                            pos = new Vector2(currentRoom.pos.x + currentRoom.size.x - 1, currentRoom.pos.y + currentRoom.size.y - 1);
                        }
                        if(walkable[pos.x + ": " + pos.y]){
                            walkable[pos.x + ": " + pos.y] = false;
                            merchant = pos;
                            break;
                        }
                    }
                }else if(currentRoom.objects[i] == "chest"){
                    while(true){
                        var pos = new Vector2(rnd(currentRoom.pos.x + 1, currentRoom.pos.x + currentRoom.size.x - 2), rnd(currentRoom.pos.y + 1, currentRoom.pos.y + currentRoom.size.y - 2));
                        if(walkable[pos.x + ": " + pos.y]){
                            walkable[pos.x + ": " + pos.y] = false;
                            chests.push(new Chest(pos));
                            break;
                        }
                    }
                }
            }
        }
    }

    // Check if path should be seen
    for(var i = 0; i < paths.length; i++){
        var xStart;
        var xEnd;
        var yStart;
        var yEnd;
        if(!paths[i].seen){
            if(paths[i].start.x == paths[i].end.x){ // Vertical
                xStart = paths[i].start.x - pathWidth / 2;
                xEnd = paths[i].start.x + pathWidth / 2;
                if(paths[i].start.y < paths[i].end.y){ // Down
                   yStart = paths[i].start.y; 
                   yEnd = paths[i].end.y - 1;
                } else{ // Up
                    yStart = paths[i].end.y;
                    yEnd = paths[i].start.y - 1;
                }
            } else{ // Horizontal
                yStart = paths[i].start.y - pathWidth / 2;
                yEnd = paths[i].end.y + pathWidth / 2;
                if(paths[i].start.x < paths[i].end.x){ // Right
                    xStart = paths[i].start.x;
                    xEnd = paths[i].end.x - 1;
                } else{ // Left
                    xStart = paths[i].end.x;
                    xEnd = paths[i].start.x - 1;
                }
            }
            if(player.pos.x >= xStart && player.pos.x <= xEnd && player.pos.y >= yStart && player.pos.y <= yEnd){
                paths[i].seen = true;
                break;
            }
        }
    }

    // Redraw all
    onresize();
}

// Moves Enemy

function moveEnemy(i){
    if(player.pos.x >= i.room.pos.x && player.pos.x < i.room.pos.x + i.room.size.x && player.pos.y >= i.room.pos.y && player.pos.y < i.room.pos.y + i.room.size.y){
        var dir = [];
        var moved = false;
        if(player.pos.x > i.pos.x){
            dir.push("Right");
        } else if(player.pos.x < i.pos.x){
            dir.push("Left");
        }

        if(player.pos.y > i.pos.y){
            dir.push("Down");
        } else if(player.pos.y < i.pos.y){
            dir.push("Up");
        }

        for(var a = 0; a < dir.length; a++){
            if(dir[a] == "Right" && walkable[i.pos.x + 1 + ": " + i.pos.y]){
                walkable[i.pos.x + 1 + ": " + i.pos.y] = false;
                walkable[i.pos.x + ": " + i.pos.y] = true;
                i.pos.x += 1;
                moved = true;
                break;
            }else if(dir[a] == "Left" && walkable[i.pos.x - 1 + ": " + i.pos.y]){
                walkable[i.pos.x - 1 + ": " + i.pos.y] = false;
                walkable[i.pos.x + ": " + i.pos.y] = true;
                i.pos.x -= 1;
                moved = true;
                break;
            }else if(dir[a] == "Down" && walkable[i.pos.x + ": " + (i.pos.y + 1)]){
                walkable[i.pos.x + ": " + (i.pos.y + 1)] = false;
                walkable[i.pos.x + ": " + i.pos.y] = true;
                i.pos.y += 1;
                moved = true;
                break;
            }else if(dir[a] == "Up" && walkable[i.pos.x + ": " + (i.pos.y - 1)]){
                walkable[i.pos.x + ": " + (i.pos.y - 1)] = false;
                walkable[i.pos.x + ": " + i.pos.y] = true;
                i.pos.y -= 1;
                moved = true;
                break;
            } 
        }

        if(!moved){
            if(((player.pos.x == i.pos.x + 1 || player.pos.x == i.pos.x - 1) && player.pos.y == i.pos.y) || ((player.pos.y == i.pos.y + 1 || player.pos.y == i.pos.y - 1) && player.pos.x == i.pos.x)){
                player.armour -= i.attackPower;
                if(player.armour < 0){
                    player.health += player.armour;
                    player.armour = 0;
                }
            }
        }
    }else{
        var dir = rnd(4);
        var newPos;
        if(dir == 1 && walkable[i.pos.x + 1 + ": " + i.pos.y]){
            newPos = new Vector2(i.pos.x + 1, i.pos.y);
            if(newPos.x >= i.room.pos.x && newPos.y >= i.room.pos.y && newPos.x < i.room.pos.x + i.room.size.x && newPos.y < i.room.pos.y + i.room.size.y){
                walkable[i.pos.x + 1 + ": " + i.pos.y] = false;
                walkable[i.pos.x + ": " + i.pos.y] = true;
                i.pos.x += 1;
            }
        }else if(dir == 3 && walkable[i.pos.x - 1 + ": " + i.pos.y]){
            newPos = new Vector2(i.pos.x - 1, i.pos.y);
            if(newPos.x >= i.room.pos.x && newPos.y >= i.room.pos.y && newPos.x < i.room.pos.x + i.room.size.x && newPos.y < i.room.pos.y + i.room.size.y){
                walkable[i.pos.x - 1 + ": " + i.pos.y] = false;
                walkable[i.pos.x + ": " + i.pos.y] = true;
                i.pos.x -= 1;
            }
        }else if(dir == 2 && walkable[i.pos.x + ": " + (i.pos.y + 1)]){
            newPos = new Vector2(i.pos.x, i.pos.y + 1);
            if(newPos.x >= i.room.pos.x && newPos.y >= i.room.pos.y && newPos.x < i.room.pos.x + i.room.size.x && newPos.y < i.room.pos.y + i.room.size.y){
                walkable[i.pos.x + ": " + (i.pos.y + 1)] = false;
                walkable[i.pos.x + ": " + i.pos.y] = true;
                i.pos.y += 1;
            }
        }else if((dir == 0 || dir == 4) && walkable[i.pos.x + ": " + (i.pos.y - 1)]){
            newPos = new Vector2(i.pos.x, i.pos.y - 1);
            if(newPos.x >= i.room.pos.x && newPos.y >= i.room.pos.y && newPos.x < i.room.pos.x + i.room.size.x && newPos.y < i.room.pos.y + i.room.size.y){
                walkable[i.pos.x + ": " + (i.pos.y - 1)] = false;
                walkable[i.pos.x + ": " + i.pos.y] = true;
                i.pos.y -= 1;
            }
        } 
    }
}

// Draws enemies
function drawEnemies(){
    enemies.forEach((i) => {
        context.fillStyle = "#0F0";
        context.fillRect(i.pos.x * pixelSize.x, i.pos.y * pixelSize.y, pixelSize.x, pixelSize.y);
    });
}

// Displayes game-over screen
var roastPos = new Vector2(10,10);
var roastVelocity = new Vector2(2, 2);
function gameOver(){

    requestAnimationFrame(gameOver);
    
    clearCanvas();
    context.font = 30 + "px Arial";
    var roastText = "You died (skill issue + ratio +  git gud)";

    if(roastPos.x <= 0 || roastPos.x + context.measureText(roastText).width >= canvas.width){
        roastVelocity.x = -roastVelocity.x;
    }
    if(roastPos.y <= 0 || roastPos.y + 60 >= canvas.height){
        roastVelocity.y = -roastVelocity.y;
    }

    roastPos.x += roastVelocity.x;
    roastPos.y += roastVelocity.y;

    clearCanvas();
    context.fillStyle = "#000";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#fff";
    context.textBaseline = "top";
    context.fillText(roastText, roastPos.x, roastPos.y);
    context.fillText("Your score was: " + score, roastPos.x, roastPos.y + 30);
    context.textBaseline = "alphabetic";
}