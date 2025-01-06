// Startup function
function startUp(){
    canvas.height = window.innerHeight;
    canvas.width = window.innerWidth;
    canvas.style.background = "#777";
    loadTextures();
    player = new Player(undefined, "up", undefined, maxHealth, maxStamina, 1, 25, 0, 0, 0, 1, 1);
    calculatePixelSize();
    inputTime = Date.now();
    context.textBaseline = "top";
    context.textAlign = "start";
    Update();
}
// Runs on canvas click
function clickDetected(event){
    for(var i = 0; i < buttons.length; i++){
        if(event.clientX >= buttons[i].corner1.x && event.clientY >= buttons[i].corner1.y && event.clientX <= buttons[i].corner2.x && event.clientY <= buttons[i].corner2.y){
            console.log(buttons[i].type);
            if(buttons[i].type == "screenSwitch"){
                screen = buttons[i].target;
                console.log(buttons[i].target);
            }else if(buttons[i].type == "saveGame"){
                saveGame();
            }else if(buttons[i].type == "loadGame" && localStorage["savedGame"]){
                loadGame();
            }else if(buttons[i].type == "newGame"){
                player = new Player(undefined, "up", undefined, maxHealth, maxStamina, 1, 25, 0, 0, 0, 1, 1);
                generateMap();
                screen = "game";
            }else if(buttons[i].type == "saveSettings"){
                saveControls();
                screen = "mainMenu";
            }else if(buttons[i].type == "cancelSettings"){
                loadControls();
                screen = "mainMenu";
            }else if(buttons[i].type == "resetSettings"){
                loadControls();
            }else if(buttons[i].type == "trade"){
                trade(buttons[i].target);
            }
            break;
        }
    }
}
// Debug settings
var seeAll = false;

// Game settings
var inputCooldown = 200;
var renderDistance = 10;
var minimapEnabled = true;
var seePlayerOnMap = true;
var seeEnemiesOnMap = true;
var seeNPCOnMap = true

// Represents a vector with two values
class Vector2{
    constructor(x, y){
        this.x = x;
        this.y = y;
    }

    toString(){
        return "Vector2:" + this.x + ":" + this.y + "#";
    }
}

// Game stats
var level = 1;
var maxHealth = 100;
var maxStamina = 10.0;
var dead = false;

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

// Checks if string is only number (returns true or false)
function numOnly(a){
    if (a == undefined){return false};
    return /^(\d|\.)+$/.test(a);
}

// Class representing player character
class Player{
    constructor(position, rotation, sprite, health, stamina, range, damage, knockback, gold, score, luck, armour){
        this.position = position;
        this.rotation = rotation;
        this.sprite = sprite;
        this.health = health;
        this.stamina = stamina;
        this.range = range;
        this.damage = damage;
        this.knockback = knockback;
        this.gold = gold;
        this.score = score;
        this.luck = luck;
        this.armour = armour;
        this.hurtTime = 0;
    }

    toString(){
        return this.position.toString() + this.rotation + "#" + this.sprite + "#" + this.health + "#" + this.stamina + "#" + this.range + "#" + this.damage + "#" + this.knockback + "#" + this.gold + "#" + this.score + "#" + this.luck + "#" + this.armour + "#";
    }
}

// Class representing game tiles
class tile{
    constructor(walkable, seen, type, transparent){
        this.walkable = walkable;
        this.seen = seen;
        this.type = type;
        this.transparent = transparent;
    } 

    toString(){
        var a = "_";
        var b = "_";
        var c = "_";
        if(this.walkable){a = "-"};
        if(this.seen){b = "-"}
        if(this.transparent){c = "-"}
        return a + ":" + b + ":" + this.type + ":" + c + "#";
    }
}

// Track all tiles on map
let tiles = new class tiles{};

// Map Generation Settings
var roomMaxSize = new Vector2(10, 10);
var roomMinSize = new Vector2(6, 6);
var roomMargin = 2;
var chestCount = 15;
var layout = new Vector2(5, 5);
var startingRoom;

// size of tile and offset on x-axis
var tileSize;
var xOffset;
var barWidth = 60;
var barMargin = 20;
var pixelSize;
function calculatePixelSize(){
    pixelSize = canvas.width / 1366;
    tileSize = Math.round(canvas.height / (renderDistance * 2 + 1));
    barWidth = 60 * pixelSize;
    barMargin = 20 * pixelSize;
    xOffset = new Vector2(3 * barMargin + 2 * barWidth, 3 * barMargin + 2 * barWidth + tileSize * (renderDistance * 2 + 1));
}


// NPCs
var NPCs = [];
class NPC{
    constructor(type, position, rotation, name, dialogID){
        this.type = type;
        this.position = position;
        this.rotation = rotation;
        this.name = name;
        this.dialogID = dialogID;
    }

    toString(){
        return this.type + "#" + this.position.toString() + this.sprite + "#" + this.name + "#" + this.dialogID + "#";
    }
}

// Enemies
var enemies = [];
class Enemy{
    constructor(position, rotation, type, health, damage, range){
        this.position = position;
        this.rotation = rotation;
        this.type = type;
        this.health = health;
        this.damage = damage;
        this.range = range;
        this.sees = [];
        this.target;
        this.path = [];
        this.stunned = false;
        this.hurtTime = 0;
    }
}

// Gets and stores player input
var interactKey = ["e"];
var attackKey = [" "];
var upKey = ["w", "arrowup"];
var leftKey = ["a", "arrowleft"];
var downKey = ["s", "arrowdown"];
var rightKey = ["d", "arrowright"];
var sprintKey = ["shift"];

if(localStorage.length == 0){
    saveControls();
}else{
    loadControls();
}

var input = {};
var saveInput = false;
var setKey;
document.addEventListener('keydown', function(event){
    input[event.key.toLowerCase()] = true; 
    if(saveInput){bindKey(event.key.toLowerCase())}
})
document.addEventListener('keyup', function(event) {
    input[event.key.toLowerCase()] = false;
})
var inputTime;
let player;
var stunnedTile = tiles["0:0"];

// Canvas
let canvas = document.getElementById("canvas");
/** 
 * @type {CanvasRenderingContext2D}
 */
let context = canvas.getContext("2d");
context.imageSmoothingEnabled = false;

// Resize canvas size when resizing window
window.onresize = function(ev) { 
    canvas.height = window.innerHeight;
    canvas.width = window.innerWidth;
    calculatePixelSize();
}

// Calls all rendering functions
var screen = "mainMenu";
function render(){
    if(screen == "game"){
        if(dead){gameOver()}else{
            clearCanvas();
            renderTiles();
            renderPlayer();
            renderNPC();
            renderEnemies();
            renderUI();
            renderMinimap();
        }
    }else if(screen == "mainMenu"){
        clearCanvas();
        renderMainMenu();
    }else if(screen == "settings"){
        clearCanvas();
        renderSettings();
    }else if(screen == "trade"){
        renderTradeMenu();
    }
}

// Room generation
class Room{
    constructor(position, size){
        this.size = size;
        this.position = position;
        this.neighbours = [];
    }
}

function generateMap(){
    tiles = new class tiles{};
    // Select starting room
    startingRoom = new Vector2(rnd(layout.x - 1), rnd(layout.y - 1));

    // Rooms
    var rooms = [];
    for(var x = 0; x < layout.x; x++){
        rooms.push(new Array);
        for(var y = 0; y < layout.y; y++){
            rooms[x].push(new Room(new Vector2(( x * (2 * roomMargin + roomMaxSize.x) + roomMargin), ( y * (2 * roomMargin + roomMaxSize.y) + roomMargin)), new Vector2(rnd(roomMinSize.x, roomMaxSize.x), rnd(roomMinSize.y, roomMaxSize.y))));
        }
    }
    console.log(rooms)
    rooms.forEach(row =>{
        row.forEach(room =>{
            for(var x = room.position.x; x < room.position.x + room.size.x; x++){
                for(var y = room.position.y; y < room.position.y + room.size.y; y++){
                    if(room == rooms[startingRoom.x][startingRoom.y]){
                        tiles[x + ":" + y] = new tile(true, true, "floor", true)
                    }else{
                        tiles[x + ":" + y] = new tile(true, false, "floor", true)
                    }
                }
            }
        })
    })

    // Sets player position in starting room
    player.position = new Vector2(rooms[startingRoom.x][startingRoom.y].position.x, rooms[startingRoom.x][startingRoom.y].position.y);

    // Walls
    rooms.forEach(row =>{
        row.forEach(room =>{
            for(var x = room.position.x - 1; x <= room.position.x + room.size.x; x++){
                wall(room, x, room.position.y - 1);
                wall(room, x, room.position.y + room.size.y);
            }
            for(var y = room.position.y; y <= room.position.y + room.size.y; y++){
                wall(room, room.position.x - 1, y);
                wall(room, room.position.x + room.size.x, y);
            }
        })
    })

    function wall(room, x, y){
        if(room == rooms[startingRoom.x][startingRoom.y]){
            tiles[x+":"+y] = new tile(false, true, "wall", false)
        }else{
            tiles[x+":"+y] = new tile(false, false, "wall", false)
        }
    }

    // Calculates neighbours for rooms
    for(var x = 0; x < layout.x; x++){
        for(var y = 0; y < layout.y; y++){
            for(var xComp = 0; xComp < layout.x; xComp++){
                for(var yComp = 0; yComp < layout.y; yComp++){
                    if((x == xComp && (y == yComp - 1 || y == yComp + 1)) || (y == yComp && (x == xComp - 1 || x == xComp + 1))){
                        rooms[x][y].neighbours.push(rooms[xComp][yComp]);
                    }
                }
            }
        }
    }

    // Generate Paths
    class path{
        constructor(start, end){
            this.start = start;
            this.end = end;
        }
    }
    var paths = [];
    var connected = [];
    connected.push(rooms[startingRoom.x][startingRoom.y]);
    while(true){
        if(paths.length >= layout.x * layout.y - 1){
            break;
        }
        for(var x = 0; x < rooms.length; x++){
            if(paths.length >= layout.x * layout.y - 1){
                break;
            }
            for(var y = 0; y < rooms[x].length; y++){
                var room = rooms[x][y];
                if(!connected.includes(room)){
                    var connectedNeighbours = [];
                    for(var i = 0; i < room.neighbours.length; i++){
                        if(connected.includes(room.neighbours[i])){
                            connectedNeighbours.push(room.neighbours[i]);
                        }
                    }
                    if(connectedNeighbours.length > 0){
                        var i = rnd(connectedNeighbours.length);
                        if(i != connectedNeighbours.length){
                            paths.push(new path(room, connectedNeighbours[i]));
                            connected.push(room);
                        }
                    }
                    if(paths.length >= layout.x * layout.y - 1){
                        break;
                    }
                }
            }
        } 
    }
    // Translate paths into tiles
    paths.forEach(i => {
        if(i.start.position.x < i.end.position.x){ // Going right
            var y = i.start.position.y + roomMinSize.y / 2;
            for(var x = i.start.position.x + i.start.size.x; x < i.end.position.x; x++){
                if(tiles[x+":"+y] != undefined){
                    if(tiles[x+":"+y].type == "wall"){
                        tiles[x+":"+y].type = "door";
                        tiles[x+":"+(y - 1)].type = "door";
                    }
                }else{
                    tiles[x+":"+y] = new tile(true, false, "floor", true);
                    tiles[x+":"+(y - 1)] = new tile(true, false, "floor", true);
                    tiles[x+":"+(y - 2)] = new tile(false, false, "wall", false);
                    tiles[x+":"+(y + 1)] = new tile(false, false, "wall", false);
                }
            }
        }else if(i.start.position.x > i.end.position.x){ // Going left
            var y = i.start.position.y + roomMinSize.y / 2;
            for(var x = i.start.position.x; x >= i.end.position.x + i.end.size.x; x--){
                if(tiles[x+":"+y] != undefined){
                    if(tiles[x+":"+y].type == "wall"){
                        tiles[x+":"+y].type = "door";
                        tiles[x+":"+(y - 1)].type = "door";
                    }
                }else{
                    tiles[x+":"+y] = new tile(true, false, "floor", true);
                    tiles[x+":"+(y - 1)] = new tile(true, false, "floor", true);
                    tiles[x+":"+(y - 2)] = new tile(false, false, "wall", false);
                    tiles[x+":"+(y + 1)] = new tile(false, false, "wall", false);
                }
            }
        }else if(i.start.position.y < i.end.position.y){ // Going down
            var x = i.start.position.x + roomMinSize.x / 2;
            for(var y = i.start.position.y + i.start.size.y; y < i.end.position.y; y++){
                if(tiles[x+":"+y] != undefined){
                    if(tiles[x+":"+y].type == "wall"){
                        tiles[x+":"+y].type = "door";
                        tiles[(x - 1)+":"+y].type = "door";
                    }
                }else{
                    tiles[x+":"+y] = new tile(true, false, "floor", true);
                    tiles[(x - 1)+":"+y] = new tile(true, false, "floor", true);
                    tiles[(x - 2)+":"+y] = new tile(false, false, "wall", false);
                    tiles[(x + 1)+":"+y] = new tile(false, false, "wall", false);
                }
            }
        }else{ // Going up
            var x = i.start.position.x + roomMinSize.x / 2;
            for(var y = i.start.position.y; y >= i.end.position.y + i.end.size.y; y--){
                if(tiles[x+":"+y] != undefined){
                    if(tiles[x+":"+y].type == "wall"){
                        tiles[x+":"+y].type = "door";
                        tiles[(x - 1)+":"+y].type = "door";
                    }
                }else{
                    tiles[x+":"+y] = new tile(true, false, "floor", true);
                    tiles[(x - 1)+":"+y] = new tile(true, false, "floor", true);
                    tiles[(x - 2)+":"+y] = new tile(false, false, "wall", false);
                    tiles[(x + 1)+":"+y] = new tile(false, false, "wall", false);
                }
            }
        }
    })
    generateMerchant();
    generateHole();
    generateChests();
    tiles[player.position.x+":"+player.position.y].walkable = !tiles[player.position.x+":"+player.position.y].walkable;
    spawnEnemies(Math.floor(10 + level / 2));
}

// Clears canvas
function clearCanvas(){
    context.clearRect(0, 0, canvas.width, canvas.height);
}

// Renders tiles
function renderTiles(){
    for(var x = 0; x <= renderDistance * 2; x++){
        for(var y = 0; y <= renderDistance * 2; y++){
            var i = tiles[(x + player.position.x - renderDistance)+":"+(y + player.position.y - renderDistance)];
            if(i == undefined){
            }else if(i.seen || seeAll){
                context.drawImage(textures[i.type], x * tileSize + xOffset.x, y * tileSize, tileSize, tileSize);
            }
        }
    }
}

// Update
function Update(){
    if(player.health <= 0){
        dead = true;
    }else{dead=false}
    requestAnimationFrame(Update);
    playerInput();
    render();
}

// Calls new game tick
function gameTick(){
    runAI();
}

// Renders player
function renderPlayer(){
    if(Date.now() - player.hurtTime < 150){
        context.drawImage(textures["playerHurt-" + player.rotation], renderDistance * tileSize + xOffset.x, renderDistance * tileSize, tileSize, tileSize);
    }else{
        context.drawImage(textures["player-" + player.rotation], renderDistance * tileSize + xOffset.x, renderDistance * tileSize, tileSize, tileSize);
    }
}

// Player actions
function playerInput(){
    if(Date.now() - inputTime > inputCooldown){
        if(buttonDown("upKey") && (player.rotation != "up" || tiles[player.position.x+":"+(player.position.y - 1)].walkable || tiles[player.position.x+":"+(player.position.y - 1)].type == "door")){
            player.rotation = "up";
            var i = 1;
            if(player.stamina >= 1 && buttonDown("sprintKey")){
                i = 2;
                player.stamina--;
            }else if(!buttonDown("sprintKey")){
                player.stamina += maxStamina * 0.05;
                if(player.stamina > maxStamina){player.stamina = maxStamina}
            }
            for(var a = 0; a < i; a++){
                if(tiles[player.position.x+":"+(player.position.y - 1)].type == "door"){
                    openDoor();
                }
                if(tiles[player.position.x+":"+(player.position.y - 1)].walkable){
                    tiles[player.position.x+":"+player.position.y].walkable = !tiles[player.position.x+":"+player.position.y].walkable;
                    player.position.y--;
                    tiles[player.position.x+":"+player.position.y].walkable = !tiles[player.position.x+":"+player.position.y].walkable;
                }
            }
            inputTime = Date.now();
            gameTick();
        }else if(buttonDown("downKey") && (player.rotation != "down" || tiles[player.position.x+":"+(player.position.y + 1)].walkable || tiles[player.position.x+":"+(player.position.y + 1)].type == "door")){
            player.rotation = "down";
            var i = 1;
            if(player.stamina >= 1 && buttonDown("sprintKey")){
                i = 2;
                player.stamina--;
            }else if(!buttonDown("sprintKey")){
                player.stamina += maxStamina * 0.05;
                if(player.stamina > maxStamina){player.stamina = maxStamina}
            }
            for(var a = 0; a < i; a++){
                if(tiles[player.position.x+":"+(player.position.y + 1)].type == "door"){
                    openDoor();
                }
                if(tiles[player.position.x+":"+(player.position.y + 1)].walkable){
                    tiles[player.position.x+":"+player.position.y].walkable = !tiles[player.position.x+":"+player.position.y].walkable;
                    player.position.y++;
                    tiles[player.position.x+":"+player.position.y].walkable = !tiles[player.position.x+":"+player.position.y].walkable;
                }
            }
            inputTime = Date.now();
            gameTick();
        }else if(buttonDown("leftKey") && (player.rotation != "left" || tiles[(player.position.x - 1)+":"+player.position.y].walkable || tiles[(player.position.x - 1)+":"+player.position.y].type == "door")){
            player.rotation = "left";
            var i = 1;
            if(player.stamina >= 1 && buttonDown("sprintKey")){
                i = 2;
                player.stamina--;
            }else if(!buttonDown("sprintKey")){
                player.stamina += maxStamina * 0.05;
                if(player.stamina > maxStamina){player.stamina = maxStamina}
            }
            for(var a = 0; a < i; a++){
                if(tiles[(player.position.x - 1)+":"+player.position.y].type == "door"){
                    openDoor();
                }
                if(tiles[(player.position.x - 1)+":"+player.position.y].walkable){
                    tiles[player.position.x+":"+player.position.y].walkable = !tiles[player.position.x+":"+player.position.y].walkable;
                    player.position.x--;
                    tiles[player.position.x+":"+player.position.y].walkable = !tiles[player.position.x+":"+player.position.y].walkable;
                }
            }
            inputTime = Date.now();
            gameTick();
        }else if(buttonDown("rightKey") && (player.rotation != "right" || tiles[(player.position.x + 1)+":"+player.position.y].walkable || tiles[(player.position.x + 1)+":"+player.position.y].type == "door")){
            player.rotation = "right";
            var i = 1;
            if(player.stamina >= 1 && buttonDown("sprintKey")){
                i = 2;
                player.stamina--;
            }else if(!buttonDown("sprintKey")){
                player.stamina += maxStamina * 0.05;
                if(player.stamina > maxStamina){player.stamina = maxStamina}
            }
            for(var a = 0; a < i; a++){
                if(tiles[(player.position.x + 1)+":"+player.position.y].type == "door"){
                    openDoor();
                }
                if(tiles[(player.position.x + 1)+":"+player.position.y].walkable){
                    tiles[player.position.x+":"+player.position.y].walkable = !tiles[player.position.x+":"+player.position.y].walkable;
                    player.position.x++;
                    tiles[player.position.x+":"+player.position.y].walkable = !tiles[player.position.x+":"+player.position.y].walkable;
                }
            }
            inputTime = Date.now();
            gameTick();
        }else if(buttonDown("interactKey") && tileInFront().type == "door"){
            openDoor();
            inputTime = Date.now();
        }else if(buttonDown("attackKey")){
            stunnedTile = tileInFront();
            enemies.forEach(enemy =>{
                if(player.rotation == "up"){
                    if(player.position.y - enemy.position.y <= player.range && player.position.y - enemy.position.y > 0 && player.position.x - enemy.position.x == 0){
                        enemy.health -= player.damage;
                        enemy.stunned = true;
                        enemy.hurtTime = Date.now();
                        for(var i = 0; i < player.knockback; i++){
                            if(tiles[enemy.position.x+":"+(enemy.position.y-1)].walkable){
                                tiles[enemy.position.x+":"+enemy.position.y].walkable = true;
                                enemy.position.y--;
                                tiles[enemy.position.x+":"+enemy.position.y].walkable = false;
                            }
                        }
                    }
                }else if(player.rotation == "down"){
                    if(enemy.position.y - player.position.y <= player.range && enemy.position.y - player.position.y > 0  && player.position.x - enemy.position.x == 0){
                        enemy.health -= player.damage;
                        enemy.stunned = true;
                        enemy.hurtTime = Date.now();
                        for(var i = 0; i < player.knockback; i++){
                            if(tiles[enemy.position.x+":"+(enemy.position.y+1)].walkable){
                                tiles[enemy.position.x+":"+enemy.position.y].walkable = true;
                                enemy.position.y++;
                                tiles[enemy.position.x+":"+enemy.position.y].walkable = false;
                            }
                        }
                    }
                }else if(player.rotation == "left"){
                    if(player.position.x - enemy.position.x <= player.range && player.position.x - enemy.position.x > 0 && player.position.y - enemy.position.y == 0){
                        enemy.health -= player.damage;
                        enemy.stunned = true;
                        enemy.hurtTime = Date.now();
                        for(var i = 0; i < player.knockback; i++){
                            if(tiles[(enemy.position.x-1)+":"+enemy.position.y].walkable){
                                tiles[enemy.position.x+":"+enemy.position.y].walkable = true;
                                enemy.position.x--;
                                tiles[enemy.position.x+":"+enemy.position.y].walkable = false;
                            }
                        }
                    }
                }else if(player.rotation == "right"){
                    if(enemy.position.x - player.position.x <= player.range && enemy.position.x - player.position.x > 0 && player.position.y - enemy.position.y == 0){
                        enemy.health -= player.damage;
                        enemy.stunned = true;
                        enemy.hurtTime = Date.now();
                        for(var i = 0; i < player.knockback; i++){
                            if(tiles[(enemy.position.x+1)+":"+enemy.position.y].walkable){
                                tiles[enemy.position.x+":"+enemy.position.y].walkable = true;
                                enemy.position.x++;
                                tiles[enemy.position.x+":"+enemy.position.y].walkable = false;
                            }
                        }
                    }
                }
                if(enemy.health <= 0){
                    tiles[enemy.position.x+":"+enemy.position.y].walkable = true;
                    player.score += 100;
                    enemies = enemies.filter(function(item){
                        return item !== enemy
                    })
                }
            })
            if(tileInFront().type == "openChest"){
                tileInFront().type = "floor";
                tileInFront().walkable = true;
            }
            gameTick();
            inputTime = Date.now();
        }else if(buttonDown("interactKey") && tileInFront().type == "chest"){
            openChest();
            inputTime = Date.now();
        }else if(buttonDown("interactKey") && tileInFront().type == "hole"){
            nextLevel();
            inputTime = Date.now();
        }else if(buttonDown("interactKey") && tileInFront().type.includes("merchant")){
            console.log("Merchant interacted with!");
            if(player.rotation == "up"){
                tileInFront().type = "merchant-down";
            }else if(player.rotation == "down"){
                tileInFront().type = "merchant-up";
            }else if(player.rotation == "left"){
                tileInFront().type = "merchant-right";
            }else if(player.rotation == "right"){
                tileInFront().type = "merchant-left";
            }
            screen = "trade";
        }
    }
}

// Finds tile in front of player
function tileInFront(){
    if(player.rotation == "up"){
        return tiles[player.position.x + ":" + (player.position.y - 1 )];
    }else if(player.rotation == "down"){
        return tiles[player.position.x + ":" + (player.position.y + 1 )];
    }else if(player.rotation == "left"){
        return tiles[(player.position.x - 1) + ":" + player.position.y];
    }else if(player.rotation == "right"){
        return tiles[(player.position.x + 1) + ":" + player.position.y];
    }
}

// See new room/path (open door)
function openDoor(){
    var start;
    var end;
    if(player.rotation == "up"){
        start = new Vector2(player.position.x, player.position.y - 1);
        end = new Vector2(player.position.x, player.position.y - 1);
        while(true){
            if(tiles[end.x+":"+end.y].seen && tiles[end.x+":"+end.y].type == "door"){
                tiles[end.x+":"+end.y] = new tile(true, true, "floor", true);
            }else if(tiles[end.x+":"+end.y].type == "door" || tiles[end.x+":"+end.y].type == "wall"){
                tiles[end.x+":"+end.y].seen = true;
                break;
            }else{
                tiles[end.x+":"+end.y].seen = true;
            }
            end.y--;
        }
        var i = false;
        for(var x = start.x - 1; true; x--){
            if(i){break}
            for(var y = start.y; y >= end.y; y--){
                if(tiles[x+":"+y] != undefined){
                    if(tiles[x+":"+y].type == "door" && tiles[x+":"+y].seen){
                        tiles[x+":"+y] = new tile(true, true, "floor", true);
                    }else{
                        tiles[x+":"+y].seen = true;
                    }
                }else{i=true;break}
            }
        }
        i = false;
        for(var x = start.x + 1; true; x++){
            if(i){break}
            for(var y = start.y; y >= end.y; y--){
                if(tiles[x+":"+y] != undefined){
                    if(tiles[x+":"+y].type == "door" && tiles[x+":"+y].seen){
                        tiles[x+":"+y] = new tile(true, true, "floor", true);
                    }else{
                        tiles[x+":"+y].seen = true;
                    }
                }else{i=true;break}
            }
        }
    }else if(player.rotation == "down"){
        start = new Vector2(player.position.x, player.position.y + 1);
        end = new Vector2(player.position.x, player.position.y + 1);
        while(true){
            if(tiles[end.x+":"+end.y].seen && tiles[end.x+":"+end.y].type == "door"){
                tiles[end.x+":"+end.y] = new tile(true, true, "floor", true);
            }else if(tiles[end.x+":"+end.y].type == "door" || tiles[end.x+":"+end.y].type == "wall"){
                tiles[end.x+":"+end.y].seen = true;
                break;
            }else{
                tiles[end.x+":"+end.y].seen = true;
            }
            end.y++;
        }
        var i = false;
        for(var x = start.x - 1; true; x--){
            if(i){break}
            for(var y = start.y; y <= end.y; y++){
                if(tiles[x+":"+y] != undefined){
                    if(tiles[x+":"+y].type == "door" && tiles[x+":"+y].seen){
                        tiles[x+":"+y] = new tile(true, true, "floor", true);
                    }else{
                        tiles[x+":"+y].seen = true;
                    }
                }else{i=true;break}
            }
        }
        i = false;
        for(var x = start.x + 1; true; x++){
            if(i){break}
            for(var y = start.y; y <= end.y; y++){
                if(tiles[x+":"+y] != undefined){
                    if(tiles[x+":"+y].type == "door" && tiles[x+":"+y].seen){
                        tiles[x+":"+y] = new tile(true, true, "floor", true);
                    }else{
                        tiles[x+":"+y].seen = true;
                    }
                }else{i=true;break}
            }
        }
    }else if(player.rotation == "left"){
        var start = new Vector2(player.position.x - 1, player.position.y);
        var end = new Vector2(player.position.x - 1, player.position.y);
        while(true){
            if(tiles[end.x+":"+end.y].seen && tiles[end.x+":"+end.y].type == "door"){
                tiles[end.x+":"+end.y] = new tile(true, true, "floor", true);
            }else if(tiles[end.x+":"+end.y].type == "door" || tiles[end.x+":"+end.y].type == "wall"){
                tiles[end.x+":"+end.y].seen = true;
                break;
            }else{
                tiles[end.x+":"+end.y].seen = true;
            }
            end.x--;
        }
        var i = false;
        for(var y = start.y - 1; true; y--){
            if(i){break}
            for(var x = start.x; x >= end.x; x--){
                if(tiles[x+":"+y] != undefined){
                    if(tiles[x+":"+y].type == "door" && tiles[x+":"+y].seen){
                        tiles[x+":"+y] = new tile(true, true, "floor", true);
                    }else{
                        tiles[x+":"+y].seen = true;
                    }
                }else{i=true;break}
            }
        }
        i = false;
        for(var y = start.y + 1; true; y++){
            if(i){break}
            for(var x = start.x; x >= end.x; x--){
                if(tiles[x+":"+y] != undefined){
                    if(tiles[x+":"+y].type == "door" && tiles[x+":"+y].seen){
                        tiles[x+":"+y] = new tile(true, true, "floor", true);
                    }else{
                        tiles[x+":"+y].seen = true;
                    }
                }else{i=true;break}
            }
        }
    }else if(player.rotation == "right"){
        var start = new Vector2(player.position.x + 1, player.position.y);
        var end = new Vector2(player.position.x + 1, player.position.y);
        while(true){
            if(tiles[end.x+":"+end.y].seen && tiles[end.x+":"+end.y].type == "door"){
                tiles[end.x+":"+end.y] = new tile(true, true, "floor", true);
            }else if(tiles[end.x+":"+end.y].type == "door" || tiles[end.x+":"+end.y].type == "wall"){
                tiles[end.x+":"+end.y].seen = true;
                break;
            }else{
                tiles[end.x+":"+end.y].seen = true;
            }
            end.x++;
        }
        var i = false;
        for(var y = start.y - 1; true; y--){
            if(i){break}
            for(var x = start.x; x <= end.x; x++){
                if(tiles[x+":"+y] != undefined){
                    if(tiles[x+":"+y].type == "door" && tiles[x+":"+y].seen){
                        tiles[x+":"+y] = new tile(true, true, "floor", true);
                    }else{
                        tiles[x+":"+y].seen = true;
                    }
                }else{i=true;break}
            }
        }
        i = false;
        for(var y = start.y + 1; true; y++){
            if(i){break}
            for(var x = start.x; x <= end.x; x++){
                if(tiles[x+":"+y] != undefined){
                    if(tiles[x+":"+y].type == "door" && tiles[x+":"+y].seen){
                        tiles[x+":"+y] = new tile(true, true, "floor", true);
                    }else{
                        tiles[x+":"+y].seen = true;
                    }
                }else{i=true;break}
            }
        }
    }
    
}

// Renders minimap
function renderMinimap(){
    if(minimapEnabled){
        var mapSize = canvas.width - xOffset.y;
        var pixelSize = Math.floor(mapSize / (layout.x * (2 * roomMargin + roomMaxSize.x)));
        var minimapOffset = Math.floor((mapSize - pixelSize * (layout.x * (2 * roomMargin + roomMaxSize.x))) / 2);
        context.fillStyle = "#000";
        context.fillRect(canvas.width - mapSize, canvas.height - mapSize, mapSize, mapSize);
        for(var x = 0; x < layout.x * (roomMaxSize.x + 2 * roomMargin); x++){
            for(var y = 0; y < layout.y * (roomMaxSize.y + 2 * roomMargin); y++){
                if(tiles[x+":"+y] != undefined){
                    if(tiles[x+":"+y].seen || seeAll){
                        if(tiles[x+":"+y].type == "door"){
                            context.fillStyle = "#7a5025";
                        }else if(tiles[x+":"+y].type =="wall"){
                            context.fillStyle = "#6b6b6b";
                        }else if(tiles[x+":"+y].type == "floor"){
                            context.fillStyle = "#ababab";
                        }else if(tiles[x+":"+y].type == "chest" || tiles[x+":"+y].type == "openChest"){
                            context.fillStyle = "#7a5025";
                        }else if(tiles[x+":"+y].type == "hole"){
                            context.fillStyle = "#000000";
                        }else if(tiles[x+":"+y].type.includes = "merchant"){
                            context.fillStyle = "#4756d4";
                        }
                        context.fillRect(canvas.width - mapSize + x * pixelSize + minimapOffset, canvas.height - mapSize + y * pixelSize + minimapOffset, pixelSize, pixelSize);
                    }
                }
            }
        }
        if(seePlayerOnMap){
            context.fillStyle = "#f00";
            context.fillRect(canvas.width - mapSize + player.position.x * pixelSize + minimapOffset , canvas.height - mapSize + player.position.y * pixelSize + minimapOffset, pixelSize, pixelSize);
        }
        if(seeEnemiesOnMap){
            enemies.forEach(enemy =>{
                if(tiles[enemy.position.x+":"+enemy.position.y] != undefined){
                    if(tiles[enemy.position.x+":"+enemy.position.y].seen || seeAll){
                        if(enemy.type == "zombie"){
                            context.fillStyle = "#87ab69";
                            context.fillRect(canvas.width - mapSize + enemy.position.x * pixelSize + minimapOffset , canvas.height - mapSize + enemy.position.y * pixelSize + minimapOffset, pixelSize, pixelSize);
                        }
                    }
                }
            })
        }
        if(seeNPCOnMap){
            NPCs.forEach(NPC =>{
                if(tiles[NPC.position.x+":"+NPC.position.y] != undefined){
                    if(tiles[NPC.position.x+":"+NPC.position.y].seen || seeAll){
                        if(NPC.type == "merchant"){
                            context.fillStyle = "#4756d4";
                            context.fillRect(canvas.width - mapSize + NPC.position.x * pixelSize + minimapOffset , canvas.height - mapSize + NPC.position.y * pixelSize + minimapOffset, pixelSize, pixelSize);
                        }
                    }
                }
            })
        }
    }
}

// Render UI
// これは日本語です！
function renderUI(){
    buttons = [];
    var sideBarWidth = canvas.width - xOffset.y - 30 * pixelSize;
    
    context.fillStyle = "#555";
    context.fillRect(0,0,xOffset.x,canvas.height);
    context.fillRect(xOffset.y, 0, canvas.width - xOffset.y, canvas.height);
    renderPlayerStats();
    
    buttons.push(new Button(new Vector2(canvas.width - sideBarWidth * 0.5 - 10 * pixelSize, 10 * pixelSize), new Vector2(canvas.width - 10 * pixelSize, 110 * pixelSize), "saveGame"));
    context.drawImage(textures["game-save"], canvas.width - sideBarWidth * 0.5 - 10 * pixelSize, 10 * pixelSize, sideBarWidth * 0.5, 100 * pixelSize);

    buttons.push(new Button(new Vector2(canvas.width - (sideBarWidth + 20 * pixelSize), 10 * pixelSize), new Vector2(canvas.width - (sideBarWidth * 0.5 + 20 * pixelSize), 110 * pixelSize), "screenSwitch", "mainMenu"));
    context.drawImage(textures["game-mainMenu"], canvas.width - (sideBarWidth + 20 * pixelSize), 10 * pixelSize, sideBarWidth * 0.5, 100 * pixelSize);

    context.drawImage(textures["trade-button"], canvas.width- sideBarWidth - 20 * pixelSize, 120 * pixelSize, sideBarWidth, sideBarWidth * 0.55);
    context.fillStyle = "#000";
    context.font = 30 * pixelSize + "px Arial";
    context.fillText("Level: " + level, canvas.width - sideBarWidth, 150 * pixelSize);
    context.fillText("Gold: " + player.gold, canvas.width - sideBarWidth, 180 * pixelSize);
    context.fillText("Score: " + player.score, canvas.width - sideBarWidth, 210 * pixelSize);
    context.fillText("Damage: " + player.damage, canvas.width - sideBarWidth, 240 * pixelSize);
    context.fillText("Armour: " + player.armour, canvas.width - sideBarWidth, 270 * pixelSize);
    context.fillText("Luck: " + player.luck, canvas.width - sideBarWidth, 300 * pixelSize);
    
}

// Spawn enemies
function spawnEnemies(amount){
    var mapSize = new Vector2(layout.x * (2 * roomMargin + roomMaxSize.x), layout.y * (2 * roomMargin + roomMaxSize.y));
    enemies = [];
    for(var i = 0; i < amount; i++){
        while(true){
            var position = new Vector2(rnd(mapSize.x), rnd(mapSize.y));
            if(tiles[position.x+":"+position.y] != undefined){
                if(tiles[position.x+":"+position.y].walkable){
                    enemies.push(new Enemy(position, "up", "zombie", 75 + 25 * level, 5 + 5 * level, 1));
                    tiles[position.x+":"+position.y].walkable = false;
                    break;
                }
            }
        }
    }
}

// Render enemies
function renderEnemies(){
    if(enemies.length > 0){
        enemies.forEach(enemy =>{
            if(tiles[enemy.position.x+":"+enemy.position.y] != undefined){
                if(tiles[enemy.position.x+":"+enemy.position.y].seen || seeAll){
                    if(enemy.position.x > player.position.x - renderDistance && enemy.position.x < player.position.x + renderDistance && enemy.position.y > player.position.y - renderDistance && enemy.position.y < player.position.y + renderDistance){
                        var enemySprite = enemy.type + "-" + enemy.rotation;
                        if(Date.now() - enemy.hurtTime < 150){enemySprite+="Hurt"}
                        context.drawImage(textures[enemySprite], xOffset.x + tileSize * (renderDistance - player.position.x + enemy.position.x), tileSize * (renderDistance - player.position.y + enemy.position.y), tileSize, tileSize);
                    }
                }
            }
        })
    }
}

// Check tiles to be seen
function seeTiles(position){
    var mapSize = new Vector2(layout.x * (roomMaxSize.x + 2 * roomMargin), layout.y * (roomMaxSize.y + 2 * roomMargin));
    var seeable = [];
    // All up & down
    for(var a = 0; a < mapSize.x; a++){
        var target = new Vector2(a, 0);
        var tile = new Vector2(position.x, position.y);
        var x = position.x - target.x;
        var y = position.y - target.y;
        var ray = Math.sqrt(x * x + y * y);
        for(var i = 0; i < ray; i++){
            tile.x -= x / ray;
            tile.y -= y / ray;
            if(tiles[Math.ceil(tile.x)+":"+Math.ceil(tile.y)].transparent){
                if(!containsVector2(seeable, new Vector2(tile.x, tile.y))){
                    seeable.push(new Vector2(Math.ceil(tile.x), Math.ceil(tile.y)));
                }
            }else{break}
        }
    }
    for(var a = 0; a < mapSize.x; a++){
        var target = new Vector2(a, mapSize.y - 1);
        var tile = new Vector2(position.x, position.y);
        var x = position.x - target.x;
        var y = position.y - target.y;
        var ray = Math.sqrt(x * x + y * y);
        for(var i = 0; i < ray; i++){
            tile.x -= x / ray;
            tile.y -= y / ray;
            if(tiles[Math.ceil(tile.x)+":"+Math.ceil(tile.y)].transparent){
                if(!containsVector2(seeable, new Vector2(tile.x, tile.y))){
                    seeable.push(new Vector2(Math.ceil(tile.x), Math.ceil(tile.y)));
                }
            }else{break}
        }
    }
    
    // Left and right
    for(var a = 0; a < mapSize.y; a++){
        var target = new Vector2(0, a);
        var tile = new Vector2(position.x, position.y);
        var x = position.x - target.x;
        var y = position.y - target.y;
        var ray = Math.sqrt(x * x + y * y);
        for(var i = 0; i < ray; i++){
            tile.x -= x / ray;
            tile.y -= y / ray;
            if(tiles[Math.ceil(tile.x)+":"+Math.ceil(tile.y)].transparent){
                if(!containsVector2(seeable, new Vector2(tile.x, tile.y))){
                    seeable.push(new Vector2(Math.ceil(tile.x), Math.ceil(tile.y)));
                }
            }else{break}
        }
    }
    for(var a = 0; a < mapSize.y; a++){
        var target = new Vector2(mapSize.x - 1, a);
        var tile = new Vector2(position.x, position.y);
        var x = position.x - target.x;
        var y = position.y - target.y;
        var ray = Math.sqrt(x * x + y * y);
        for(var i = 0; i < ray; i++){
            tile.x -= x / ray;
            tile.y -= y / ray;
            if(tiles[Math.ceil(tile.x)+":"+Math.ceil(tile.y)].transparent){
                if(!containsVector2(seeable, new Vector2(tile.x, tile.y))){
                    seeable.push(new Vector2(Math.ceil(tile.x), Math.ceil(tile.y)));
                }
            }else{break}
        }
    }
    return seeable;
}

// Checks if list a contains Vector2 identical to b
function containsVector2(a, b){
    var c = false;
    b.x = Math.ceil(b.x);
    b.y = Math.ceil(b.y);
    a.forEach(d =>{
        if(b.x == d.x && b.y == d.y){
            c = true;
        }
    })
    return c;
}

// Enemy AI
function runAI(){
    enemies.forEach(enemy =>{
        if(enemy.type == "zombie"){zombieAI(enemy)}
    })
    stunnedTile = tiles["0:0"];
}

function zombieAI(enemy){
    if(!enemy.stunned){

        enemy.sees = seeTiles(enemy.position);
        if(containsVector2(enemy.sees, player.position)){
            enemy.target = new Vector2(player.position.x, player.position.y);
            findPath(enemy);
        }else if(enemy.target != undefined){
            if(enemy.target.x == enemy.position.x && enemy.target.y == enemy.position.y){
                var i = rnd(enemy.sees.length - 1);
                enemy.target = new Vector2(enemy.sees[i].x, enemy.sees[i].y);
                findPath(enemy);
            }
        }else{
            var i = rnd(enemy.sees.length - 1);
            enemy.target = new Vector2(enemy.sees[i].x, enemy.sees[i].y);
            findPath(enemy);
        } 
        if(enemy.path.length > 0){
            if(enemy.position.x > enemy.path[0].x){
                enemy.rotation = "left";
            }else if(enemy.position.x < enemy.path[0].x){
                enemy.rotation = "right";
            }else if(enemy.position.y > enemy.path[0].y){
                enemy.rotation = "up";
            }else{
                enemy.rotation = "down";
            }
            if(tiles[enemy.path[0].x+":"+enemy.path[0].y].walkable){
                tiles[enemy.position.x+":"+enemy.position.y].walkable = true;
                enemy.position.x = enemy.path[0].x;
                enemy.position.y = enemy.path[0].y;
                tiles[enemy.position.x+":"+enemy.position.y].walkable = false;
                enemy.path.shift();
            }
        }
        if(Math.abs(player.position.x - enemy.position.x) == enemy.range && Math.abs(player.position.y - enemy.position.y) == 0 || Math.abs(player.position.x - enemy.position.x) == 0 && Math.abs(player.position.y - enemy.position.y) == enemy.range){
            if(tiles[enemy.position.x+":"+enemy.position.y] != stunnedTile){
                player.health -= enemy.damage * (3 / (2 + player.armour));
                player.hurtTime = Date.now();
                if(player.position.x < enemy.position.x){
                    enemy.rotation = "left";
                }else if(player.position.x > enemy.position.x){
                    enemy.rotation = "right"
                }else if(player.position.y < enemy.position.y){
                    enemy.rotation = "up";
                }else{
                    enemy.rotation = "down";
                }
            }else{enemy.health -= player.damage; enemy.hurtTime = Date.now()}
        }
    }else(enemy.stunned = false);
}

// Finds path from object(enemies) to target
function findPath(object){
    object.path = [];
    if(object.target.x < object.position.x && tiles[(object.position.x-1)+":"+object.position.y].walkable){
        object.path.push(new Vector2(object.position.x - 1, object.position.y));
    }else if(object.target.x > object.position.x && tiles[(object.position.x+1)+":"+object.position.y].walkable){
        object.path.push(new Vector2(object.position.x + 1, object.position.y));
    }else if(object.target.y < object.position.y && tiles[object.position.x+":"+(object.position.y-1)].walkable){
        object.path.push(new Vector2(object.position.x, object.position.y - 1));
    }else if(object.target.y > object.position.y){
        object.path.push(new Vector2(object.position.x, object.position.y + 1));
    }
    if(object.path.length != 0){
        while(object.path[object.path.length-1].x != object.target.x || object.path[object.path.length-1].y != object.target.y){
            var lastPath = object.path[object.path.length-1];
            if(object.target.x < lastPath.x && tiles[(lastPath.x-1)+":"+lastPath.y].walkable){
                object.path.push(new Vector2(lastPath.x - 1, lastPath.y));
            }else if(object.target.x > lastPath.x && tiles[(lastPath.x+1)+":"+lastPath.y].walkable){
                object.path.push(new Vector2(lastPath.x + 1, lastPath.y));
            }else if(object.target.y < lastPath.y && tiles[lastPath.x+":"+(lastPath.y-1)].walkable){
                object.path.push(new Vector2(lastPath.x, lastPath.y - 1));
            }else if(object.target.y > lastPath.y){
                object.path.push(new Vector2(lastPath.x, lastPath.y + 1));
            }else{
                object.target.x = object.path[object.path.length-1].x;
                object.target.y = object.path[object.path.length-1].y;
            }
        }
    }else{
        object.target = undefined;
    }
}

// Renders player stats
function renderPlayerStats(){
    context.imageSmoothingEnabled = false;
    var barTopY = (barMargin + (canvas.height - 2 * barMargin - barWidth * 2) * ((maxHealth - player.health) / maxHealth));
    var barBottomY = canvas.height - (barMargin + barWidth);

    // Health bar backdrop
    context.drawImage(textures["empty-top"], barMargin, barMargin, barWidth, barWidth);
    context.drawImage(textures["empty-middle"], barMargin, barMargin + barWidth, barWidth, barBottomY - barMargin - barWidth);
    context.drawImage(textures["empty-bottom"], barMargin, barBottomY, barWidth, barWidth);
    
    // Health bar
    if(player.health > 0){
        context.drawImage(textures["health-top"], barMargin, barTopY, barWidth, barWidth);
        context.drawImage(textures["health-middle"], barMargin, barTopY + barWidth, barWidth, barBottomY - barTopY - barWidth);
        context.drawImage(textures["health-bottom"], barMargin, barBottomY, barWidth, barWidth);
    }
    
    var barTopY = (barMargin + (canvas.height - 2 * barMargin - barWidth * 2) * ((maxStamina - player.stamina) / maxStamina));

    // Stamina bar backdrop
    context.drawImage(textures["empty-top"], (2 * barMargin + barWidth), barMargin, barWidth, barWidth);
    context.drawImage(textures["empty-middle"], (2 * barMargin + barWidth), barMargin + barWidth, barWidth, barBottomY - barMargin - barWidth);
    context.drawImage(textures["empty-bottom"], (2 * barMargin + barWidth), barBottomY, barWidth, barWidth);

    // Stamina bar
    if(player.stamina > 0){
        context.drawImage(textures["stamina-top"], (2 * barMargin + barWidth), barTopY, barWidth, barWidth);
        context.drawImage(textures["stamina-middle"], (2 * barMargin + barWidth), barTopY + barWidth, barWidth, barBottomY - barTopY - barWidth);
        context.drawImage(textures["stamina-bottom"], (2 * barMargin + barWidth), barBottomY, barWidth, barWidth);
    }

    context.textBaseline = "middle";
    context.textAlign = "center";
    context.fillStyle = "#000";
    context.font = 60 * pixelSize + "px Arial";
    if(mouse.x > barMargin && mouse.x < barMargin + barWidth && mouse.y > 3 * barMargin && mouse.y < canvas.height - 3 * barMargin){
        context.drawImage(textures["trade-button"], mouse.x, mouse.y, 270 * pixelSize, 120 * pixelSize);
        context.fillText(Math.round(player.health) + "/" + maxHealth, mouse.x + 135 * pixelSize, mouse.y + 60 * pixelSize);
        //context.fillRect(mouse.x, mouse.y, 100, 100);
    }else if(mouse.x > 2 * barMargin + barWidth && mouse.x < 2 * (barMargin + barWidth) && mouse.y > 3 * barMargin && mouse.y < canvas.height - 3 * barMargin){
        context.drawImage(textures["trade-button"], mouse.x, mouse.y, 270 * pixelSize, 120 * pixelSize);
        context.fillText((Math.round(player.stamina * 10) / 10) + "/" + maxStamina, mouse.x + 135 * pixelSize, mouse.y + 60 * pixelSize);
        //context.fillRect(mouse.x, mouse.y, 100, 100);
    }
    context.textAlign = "start";
}

// Generate chests
function generateChests(){
    for(var i = 0; i < chestCount; i++){
        while(true){
            var x = rnd(layout.x * (roomMaxSize.x + 2 * roomMargin));
            var y = rnd(layout.y * (roomMaxSize.y + 2 * roomMargin));
            var location = x + ":" + y;
            if(tiles[location] != undefined){
                if(tiles[location].type == "floor" && tiles[location].walkable && !(x == player.position.x && y == player.position.y)){
                    tiles[location] = new tile(false, tiles[location].seen, "chest", true);
                    break;
                }
            }
        }
    }
}

// Open chest
function openChest(){
    var loot = [];
    for(var i = 0; i < player.luck; i++){
        loot.push(rnd(50 + 25 * level, 100 + 50 * level))
    }
    player.gold += Math.max(...loot);
    player.score += Math.max(...loot);
    tileInFront().type = "openChest";
}

// Generate hole
function generateHole(){
    while(true){
        var x = rnd(layout.x * (roomMaxSize.x + 2 * roomMargin));
        var y = rnd(layout.y * (roomMaxSize.y + 2 * roomMargin));
        var location = x + ":" + y;
        if(tiles[location] != undefined){
            if(tiles[location].type == "floor" && tiles[location].walkable && !(x == player.position.x && y == player.position.y)){
                tiles[location] = new tile(false, tiles[location].seen, "hole", true);
                break;
            }
        }
    }
}

// Progresses player to next level
function nextLevel(){
    level++;
    generateMap();
}

// Spawns a merchant who sells player upgrades
function generateMerchant(){
    NPCs = [];
    while(true){
        var x = rnd(layout.x * (roomMaxSize.x + 2 * roomMargin));
        var y = rnd(layout.y * (roomMaxSize.y + 2 * roomMargin));
        var location = x + ":" + y;
        if(tiles[location] != undefined){
            if(tiles[location].type == "floor" && tiles[location].walkable && !(x == player.position.x && y == player.position.y)){
                tiles[location].walkable = false;
                if(tiles[(x+1)+":"+y].type != "floor"){
                    tiles[x+":"+y].type = "merchant-right";
                    tiles[x+":"+y].walkable = false;
                }else if(tiles[(x-1)+":"+y].type != "floor"){
                    tiles[x+":"+y].type = "merchant-left";
                    tiles[x+":"+y].walkable = false;
                }else if(tiles[x+":"+(y+1)].type != "floor"){
                    tiles[x+":"+y].type = "merchant-up";
                    tiles[x+":"+y].walkable = false;
                }else{
                    tiles[x+":"+y].type = "merchant-down";
                    tiles[x+":"+y].walkable = false;
                }
                break;
            }
        }
    }
}

// Renders NPCs
function renderNPC(){
    NPCs.forEach(NPC =>{
        if(tiles[NPC.position.x+":"+NPC.position.y] != undefined){  
            if(tiles[NPC.position.x+":"+NPC.position.y].seen || seeAll){
                if(NPC.position.x > player.position.x - renderDistance && NPC.position.x < player.position.x + renderDistance && NPC.position.y > player.position.y - renderDistance && NPC.position.y < player.position.y + renderDistance){
                    context.drawImage(textures[NPC.type + "-" + NPC.rotation], xOffset.x + tileSize * (renderDistance - player.position.x + NPC.position.x), tileSize * (renderDistance - player.position.y + NPC.position.y), tileSize, tileSize);
                }
            }
        }
    })
}

// Checks if any input is held down
function buttonDown(button){
    var i = false;
    if(button == "upKey"){
        upKey.forEach(key =>{
            if(input[key]){i=true}
        });
    }else if(button == "leftKey"){
        leftKey.forEach(key =>{
            if(input[key]){i=true}
        });
    }else if(button == "downKey"){
        downKey.forEach(key =>{
            if(input[key]){i=true}
        });
    }else if(button == "rightKey"){
        rightKey.forEach(key =>{
            if(input[key]){i=true}
        });
    }else if(button == "attackKey"){
        attackKey.forEach(key =>{
            if(input[key]){i=true}
        });
    }else if(button == "interactKey"){
        interactKey.forEach(key =>{
            if(input[key]){i=true}
        });
    }else if(button == "sprintKey"){
        sprintKey.forEach(key =>{
            if(input[key]){i=true}
        });
    }
    return i;
}

// Renders the Main Menu
function renderMainMenu(){
    var buttonSize = new Vector2(270, 120);
    buttons = [];

    context.drawImage(textures["mainMenu-title"], (canvas.width - buttonSize.x * 1.5 * pixelSize) / 2, buttonSize.y * 0.5 * pixelSize, buttonSize.x * 1.5 * pixelSize, buttonSize.y * 1.5    * pixelSize);

    context.drawImage(textures["mainMenu-newGame"], (canvas.width - buttonSize.x * pixelSize) / 2, (60 + buttonSize.y * 2) * pixelSize, buttonSize.x * pixelSize, buttonSize.y * pixelSize);
    buttons.push(new Button(new Vector2((canvas.width - buttonSize.x * pixelSize) / 2, (60 + buttonSize.y * 2) * pixelSize), new Vector2((canvas.width - buttonSize.x * pixelSize) / 2 + buttonSize.x * pixelSize, (60 + 3 * buttonSize.y) * pixelSize), "newGame"));

    if(localStorage["savedGame"] != undefined){
        if(JSON.parse(localStorage["savedGame"])){
            context.drawImage(textures["mainMenu-loadGame"], (canvas.width - buttonSize.x * pixelSize) / 2, (70 + buttonSize.y * 3) * pixelSize, buttonSize.x * pixelSize, buttonSize.y * pixelSize);
            buttons.push(new Button(new Vector2((canvas.width - buttonSize.x * pixelSize) / 2, (70 + buttonSize.y * 3) * pixelSize), new Vector2((canvas.width - buttonSize.x * pixelSize) / 2 + buttonSize.x * pixelSize, (70 + 4 * buttonSize.y) * pixelSize), "loadGame"));
        }
    }else{
        context.drawImage(textures["mainMenu-loadGameUnavailable"], (canvas.width - buttonSize.x * pixelSize) / 2, (70 + buttonSize.y * 3) * pixelSize, buttonSize.x * pixelSize, buttonSize.y * pixelSize);
    }
    /*
    context.drawImage(textures["mainMenu-settings"], (canvas.width - buttonSize.x * pixelSize) / 2, (70 + buttonSize.y * 3) * pixelSize, buttonSize.x * pixelSize, buttonSize.y * pixelSize);
    buttons.push(new Button(new Vector2((canvas.width - buttonSize.x * pixelSize) / 2, (70 + buttonSize.y * 3) * pixelSize), new Vector2((canvas.width - buttonSize.x * pixelSize) / 2 + buttonSize.x * pixelSize, (70 + 4 * buttonSize.y) * pixelSize), "screenSwitch", "settings"));

    context.drawImage(textures["mainMenu-credits"], (canvas.width - buttonSize.x * pixelSize) / 2, (80 + buttonSize.y * 4) * pixelSize, buttonSize.x * pixelSize, buttonSize.y * pixelSize);
    buttons.push(new Button(new Vector2((canvas.width - buttonSize.x * pixelSize) / 2, (80 + buttonSize.y * 4) * pixelSize), new Vector2((canvas.width - buttonSize.x * pixelSize) / 2 + buttonSize.x * pixelSize, (80 + 5 * buttonSize.y) * pixelSize), "screenSwitch", "credits"));
    */
}

// Class to define button
class Button{
    constructor(corner1, corner2, type, target){
        this.corner1 = corner1;
        this.corner2 = corner2;
        this.type = type;
        this.target = target;
    }
}

// Main Menu button storage
var buttons = [];


// Loads game data from local storage
function loadGame(){
    player = loadPlayerData();
    loadTiles();
    loadMiscVariables();
    loadEnemies();
}

// Loads player data from local storarge
function loadPlayerData(){
    var player = [];
    var rawData = localStorage["playerData"];
    var dataList = []
    var data = "";
    for(var i = 0; i < rawData.length; i++){
        if(rawData[i] == ':'){
            if(numOnly(data)){
                dataList.push(Math.floor(data));
            }else{
                dataList.push(data);
            }
            data = "";
        }else if(rawData[i] == '#'){
            dataList.push(data);
            if(dataList[0] == "Vector2"){
                player.push(new Vector2(Math.floor(dataList[1]), Math.floor(dataList[2])));
            }else if(dataList[0] == "undefined"){
                player.push(undefined)
            }else{
                if(numOnly(data)){
                    player.push(Math.floor(data));
                }else{
                    player.push(data);
                }
            }
            dataList = [];
            data = "";
        }else{
            data += rawData[i];
        }
    }
    return new Player(player[0], player[1], player[2], player[3], player[4], player[5], player[6], player[7], player[8], player[9], player[10], player[11]);
}

// Saves tiles to localStorage
function saveTiles(){
    //localStorage["tiles"] = JSON.stringify(tiles);
    
    localStorage["tiles"] = "";
    for(var y = 0; y < layout.y * (2 * roomMargin + roomMaxSize.y); y++){
        for(var x = 0; x < layout.x * (2 * roomMargin + roomMaxSize.x); x++){
            if(tiles[x+":"+y] != undefined){
                localStorage["tiles"] += tiles[x+":"+y].toString();
            }else{
                localStorage["tiles"] += ".#"
            }
        }
    }
}

// Loads tiles from local storage
function loadTiles(){
    
    //tiles = JSON.parse(localStorage["tiles"]);
    
    tiles = new class tiles{};
    var x = 0;
    var y = 0;
    var data = "";
    var dataList = [];
    var rawData = localStorage["tiles"];
    for(var i = 0; i < rawData.length; i++){
        if(rawData[i] == ":" || rawData[i] == "#"){
            if(data == "-"){
                dataList.push(true);
            }else if(data == "_"){
                dataList.push(false);
            }else if(data == "."){
                dataList.push(undefined);
            }else{
                dataList.push(data);
            }
            data = "";
            if(rawData[i] == "#"){
                dataList.push(data);
                if(dataList[0] != undefined){
                    tiles[x+":"+y] = new tile(dataList[0], dataList[1], dataList[2], dataList[3]);
                }else{
                    tiles[x+":"+y] = undefined;
                }
                x++;
                if(x == layout.x * (2 * roomMargin + roomMaxSize.x)){
                    x = 0;
                    y++;
                }
                dataList = [];
            }
        }else{
            data += rawData[i];
        }
    }
}

// Saves all game data to local storage
function saveGame(){
    localStorage.clear()
    localStorage["savedGame"] = "true";
    localStorage["playerData"] = player.toString();
    saveControls();
    saveTiles();
    //saveNPCData();
    saveMiscVariables();
    saveEnemies();
}

// Saves NPC data
function saveNPCData(){
    var a = [];
    NPCs.forEach(NPC=>{
        a.push(NPC.toString());
    })
    localStorage["NPCData"] = JSON.stringify(a);
}

// Loads NPC data
function loadNPCData(){
    var a = JSON.parse(localStorage["NPCData"]);
    NPCs = [];
    var data = "";
    var dataList = [];
    a.forEach(npc=>{
        var returnData = []
        for(var i = 0; i < npc.length; i++){
            if(npc[i] == "#" || npc[i] == ":"){
                if(numOnly(data)){
                    dataList.push(Math.floor(data))
                }else{
                    dataList.push(data);
                }
                if(npc[i] == "#"){
                    if(dataList[0] == "Vector2"){
                        returnData.push(new Vector2(dataList[1], dataList[2]));
                    }else if(dataList[0] == "undefined"){
                        returnData.push(undefined);
                    }else{
                        console.log(dataList[i])
                        if(numOnly(dataList[i])){
                            returnData.push(Math.floor(dataList[i]))
                        }else{
                            returnData.push(dataList[i]);
                        }
                    }
                    dataList = [];
                    data = "";
                }
            }else{
                data += npc[i]; 
            }
        }
        NPCs.push(new NPC(returnData[0], returnData[1], returnData[2], returnData[3], returnData[4]));
    })
}

// Saves player keybinds
function saveControls(){
    localStorage.setItem("interactKey", JSON.stringify(interactKey));
    localStorage.setItem("attackKey", JSON.stringify(attackKey));
    localStorage.setItem("upKey", JSON.stringify(upKey));
    localStorage.setItem("leftKey", JSON.stringify(leftKey));
    localStorage.setItem("downKey", JSON.stringify(downKey));
    localStorage.setItem("rightKey", JSON.stringify(rightKey));
    localStorage.setItem("sprintKey", JSON.stringify(sprintKey));
}

// Loads player keybinds
function loadControls(){
    interactKey = JSON.parse(localStorage.getItem("interactKey"));
    attackKey = JSON.parse(localStorage.getItem("attackKey"));
    upKey = JSON.parse(localStorage.getItem("upKey"));
    leftKey = JSON.parse(localStorage.getItem("leftKey"));
    downKey = JSON.parse(localStorage.getItem("downKey"));
    rightKey = JSON.parse(localStorage.getItem("rightKey"));
    sprintKey = JSON.parse(localStorage.getItem("sprintKey"));
}

function renderSettings(){
    buttons = [];

    if(JSON.stringify(interactKey) != localStorage["interactKey"] || JSON.stringify(attackKey) != localStorage["attackKey"] || JSON.stringify(upKey) != localStorage["upKey"] || JSON.stringify(leftKey) != localStorage["leftKey"] || JSON.stringify(downKey) != localStorage["downKey"] || JSON.stringify(rightKey) != localStorage["rightKey"] || JSON.stringify(sprintKey) != localStorage["sprintKey"]){
        context.drawImage(textures["settings-saveButton"], (canvas.width - 280) * pixelSize, (canvas.height - 130) * pixelSize, 270 * pixelSize, 120 * pixelSize);
        buttons.push(new Button(new Vector2((canvas.width - 280) * pixelSize, (canvas.height - 130) * pixelSize), new Vector2((canvas.width - 10) * pixelSize, (canvas.height - 10) * pixelSize), "saveSettings", "mainMenu"));
    }else{
        context.drawImage(textures["settings-saveUnavailable"], (canvas.width - 280) * pixelSize, (canvas.height - 130) * pixelSize, 270 * pixelSize, 120 * pixelSize);
    }

    context.drawImage(textures["settings-cancel"], (canvas.width - 280 * 2) * pixelSize, (canvas.height - 130) * pixelSize, 270 * pixelSize, 120 * pixelSize);
    buttons.push(new Button(new Vector2((canvas.width - 280 * 2) * pixelSize, (canvas.height - 130) * pixelSize), new Vector2((canvas.width - 290) * pixelSize, (canvas.height - 10) * pixelSize), "cancelSettings", "mainMenu"));

    context.drawImage(textures["settings-reset"], (canvas.width - 280 * 3) * pixelSize, (canvas.height - 130) * pixelSize, 270 * pixelSize, 120 * pixelSize);
    buttons.push(new Button(new Vector2((canvas.width - 280 * 3) * pixelSize, (canvas.height - 130) * pixelSize), new Vector2((canvas.width - 290) * pixelSize, (canvas.height - 10) * pixelSize), "resetSettings", "settings"));
}

// Binds a key to a certain action
function bindKey(key){
    if(setKey == "interactKey"){
        interactKey.push(key);
    }else if(setKey == "attackKey"){
        attackKey.push(key);
    }else if(setKey == "upKey"){
        upKey.push(key);
    }else if(setKey == "leftKey"){
        leftKey.push(key);
    }else if(setKey == "downKey"){
        downKey.push(key);
    }else if(setKey == "rightKey"){
        rightKey.push(key);
    }else if(setKey == "sprintKey"){
        sprintKey.push(key);
    }
    saveInput = false;
}

var roastPos = new Vector2(10,10);
var roastVelocity = new Vector2(5, 5);
function gameOver(){
    buttons = [];
    buttons.push(new Button(new Vector2(0, 0), new Vector2(canvas.width, canvas.height), "screenSwitch", "mainMenu"));
    
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
    context.fillText("Your score was: " + player.score, roastPos.x, roastPos.y + 30);
    context.textBaseline = "alphabetic";
}

let textures = {};
function loadTextures(){
    var texturesToLoad = {
        "wall": "Textures/wall.png",
        "undefined": "Textures/undefined.png",
        "floor": "Textures/floor.png",
        "door": "Textures/door.png",
        "chest": "Textures/chest.png",
        "openChest": "Textures/openChest.png",
        "hole": "Textures/hole.png",

        "zombie-down": "Textures/Enemies/zombie/down.png",
        "zombie-up": "Textures/Enemies/zombie/up.png",
        "zombie-left": "Textures/Enemies/zombie/left.png",
        "zombie-right": "Textures/Enemies/zombie/right.png",

        "zombie-downHurt": "Textures/Enemies/zombie/downHurt.png",
        "zombie-upHurt": "Textures/Enemies/zombie/upHurt.png",
        "zombie-leftHurt": "Textures/Enemies/zombie/leftHurt.png",
        "zombie-rightHurt": "Textures/Enemies/zombie/rightHurt.png",

        "player-down": "Textures/player/down.png",
        "player-up": "Textures/player/up.png",
        "player-left": "Textures/player/left.png",
        "player-right": "Textures/player/right.png",

        "playerHurt-down": "Textures/player/downHurt.png",
        "playerHurt-up": "Textures/player/upHurt.png",
        "playerHurt-left": "Textures/player/leftHurt.png",
        "playerHurt-right": "Textures/player/rightHurt.png",

        "merchant-down": "Textures/NPC/merchant/down.png",
        "merchant-up": "Textures/NPC/merchant/up.png",
        "merchant-left": "Textures/NPC/merchant/left.png",
        "merchant-right": "Textures/NPC/merchant/right.png",

        "health-top": "Textures/game/healthTop.png",
        "health-middle": "Textures/game/healthMiddle.png",
        "health-bottom": "Textures/game/healthBottom.png",
        "stamina-top": "Textures/game/staminaTop.png",
        "stamina-middle": "Textures/game/staminaMiddle.png",
        "stamina-bottom": "Textures/game/staminaBottom.png",
        "empty-top": "Textures/game/emptyBarTop.png",
        "empty-middle": "Textures/game/emptyBarMiddle.png",
        "empty-bottom": "Textures/game/emptyBarBottom.png",

        "mainMenu-title": "Textures/mainMenu/title.png",
        "mainMenu-newGame": "Textures/mainMenu/newGame.png",
        "mainMenu-settings": "Textures/mainMenu/settings.png",
        "mainMenu-credits": "Textures/mainMenu/credits.png",
        "mainMenu-loadGame": "Textures/mainMenu/loadGame.png",
        "mainMenu-loadGameUnavailable": "Textures/mainMenu/loadGameUnavailable.png",

        "game-save": "Textures/game/saveButton.png",
        "game-mainMenu": "Textures/game/mainMenuButton.png",

        "settings-save": "Textures/settings/saveButton.png",
        "settings-saveUnavailable": "Textures/settings/saveButtonUnavailable.png",
        "settings-reset": "Textures/settings/resetButton.png",
        "settings-cancel": "Textures/settings/cancelButton.png",

        "trade-button": "Textures/trade/tradeButton.png",
        "trade-buttonExpensive": "Textures/trade/tradeButtonExpensive.png",
        "trade-closeButton": "Textures/trade/closeButton.png",
    }
    for (var i in texturesToLoad) {
        textures[i] = new Image();
        textures[i].src = texturesToLoad[i];
    }
    return;
}

let tradeItemsCost = {
    "maxHealth": 100,
    "maxStamina": 100,
    "damage": 100,
    "heal": 500,
    "armour": 250,
    "luck": 1000,
}

// Renders trade menu
function renderTradeMenu(){
    clearCanvas();
    buttons = [];
    var buttonSize = new Vector2(425, 189);
    var buttonMargin = 25;
    context.textBaseline = "top";
    context.textAlign = "center";
    context.fillStyle = "#000";

    if(player.gold >= tradeItemsCost["maxHealth"]){
        context.drawImage(textures["trade-button"], buttonMargin * pixelSize, buttonMargin * pixelSize, buttonSize.x * pixelSize, buttonSize.y * pixelSize);
        buttons.push(new Button(new Vector2(buttonMargin * pixelSize, buttonMargin * pixelSize), new Vector2((buttonMargin + buttonSize.x) * pixelSize, (buttonMargin + buttonSize.y) * pixelSize), "trade", "maxHealth"));
    }else{
        context.drawImage(textures["trade-buttonExpensive"], buttonMargin * pixelSize, buttonMargin * pixelSize, buttonSize.x * pixelSize, buttonSize.y * pixelSize);
    }

    context.font = 45 * pixelSize + "px Arial";
    context.fillText("+20 Max Health", (buttonSize.x / 2 + buttonMargin) * pixelSize, 2.5 * buttonMargin * pixelSize);
    context.font = 30 * pixelSize + "px Arial";
    context.fillText(tradeItemsCost["maxHealth"] + " Gold", (buttonSize.x / 2 + buttonMargin) * pixelSize, 5 * buttonMargin * pixelSize);
    context.fillText(maxHealth, (buttonSize.x / 2 + buttonMargin) * pixelSize, 6.5 * buttonMargin * pixelSize);

    if(player.gold >= tradeItemsCost["maxStamina"]){
        context.drawImage(textures["trade-button"], (canvas.width - buttonSize.x * pixelSize) / 2, buttonMargin * pixelSize, buttonSize.x * pixelSize, buttonSize.y * pixelSize);
        buttons.push(new Button(new Vector2((canvas.width - buttonSize.x * pixelSize) / 2, buttonMargin * pixelSize), new Vector2((canvas.width - buttonSize.x * pixelSize) / 2 + buttonSize.x * pixelSize, (buttonMargin + buttonSize.y) * pixelSize), "trade", "maxStamina"));
    }else{
        context.drawImage(textures["trade-buttonExpensive"], (canvas.width - buttonSize.x * pixelSize) / 2, buttonMargin * pixelSize, buttonSize.x * pixelSize, buttonSize.y * pixelSize);
    }

    context.font = 45 * pixelSize + "px Arial";
    context.fillText("+2 Max Stamina", canvas.width / 2, 2.5 * buttonMargin * pixelSize);
    context.font = 30 * pixelSize + "px Arial";
    context.fillText(tradeItemsCost["maxStamina"] + " Gold", canvas.width / 2, 5 * buttonMargin * pixelSize);
    context.fillText(maxStamina, canvas.width / 2, 6.5 * buttonMargin * pixelSize);

    if(player.gold >= tradeItemsCost["damage"]){
        context.drawImage(textures["trade-button"], canvas.width - (buttonSize.x + buttonMargin) * pixelSize, buttonMargin * pixelSize, buttonSize.x * pixelSize, buttonSize.y * pixelSize);
        buttons.push(new Button(new Vector2(canvas.width - (buttonSize.x + buttonMargin) * pixelSize, buttonMargin * pixelSize), new Vector2(canvas.width - buttonMargin * pixelSize, (buttonMargin + buttonSize.y) * pixelSize), "trade", "damage"));
    }else{
        context.drawImage(textures["trade-buttonExpensive"], canvas.width - (buttonSize.x + buttonMargin) * pixelSize, buttonMargin * pixelSize, buttonSize.x * pixelSize, buttonSize.y * pixelSize);
    }

    context.font = 45 * pixelSize + "px Arial";
    context.fillText("+15 Damage", canvas.width - (buttonSize.x / 2 + buttonMargin) * pixelSize, 2.5 * buttonMargin * pixelSize);
    context.font = 30 * pixelSize + "px Arial";
    context.fillText(tradeItemsCost["damage"] + " Gold", canvas.width - (buttonSize.x / 2 + buttonMargin) * pixelSize, 5 * buttonMargin * pixelSize);
    context.fillText(player.damage, canvas.width - (buttonSize.x / 2 + buttonMargin) * pixelSize, 6.5 * buttonMargin * pixelSize);

    if(player.gold >= tradeItemsCost["heal"]){
        context.drawImage(textures["trade-button"], buttonMargin * pixelSize, (buttonMargin * 2 + buttonSize.y) * pixelSize, buttonSize.x * pixelSize, buttonSize.y * pixelSize);
        buttons.push(new Button(new Vector2(buttonMargin * pixelSize, (buttonMargin * 2 + buttonSize.y) * pixelSize), new Vector2((buttonMargin + buttonSize.x) * pixelSize, ((buttonMargin * 2 + buttonSize.y) + buttonSize.y) * pixelSize), "trade", "heal"));
    }else{
        context.drawImage(textures["trade-buttonExpensive"], buttonMargin * pixelSize, (buttonMargin * 2 + buttonSize.y) * pixelSize, buttonSize.x * pixelSize, buttonSize.y * pixelSize);
    }

    context.font = 45 * pixelSize + "px Arial";
    context.fillText("Heal", (buttonSize.x / 2 + buttonMargin) * pixelSize, (3.5 * buttonMargin + buttonSize.y) * pixelSize);
    context.font = 30 * pixelSize + "px Arial";
    context.fillText(tradeItemsCost["heal"] + " Gold", (buttonSize.x / 2 + buttonMargin) * pixelSize, (6 * buttonMargin + buttonSize.y) * pixelSize);
    context.fillText(player.health + "/"+ maxHealth, (buttonSize.x / 2 + buttonMargin) * pixelSize, (7.5 * buttonMargin + buttonSize.y) * pixelSize);

    if(player.gold >= tradeItemsCost["armour"]){
        context.drawImage(textures["trade-button"], (canvas.width - buttonSize.x * pixelSize) / 2, (buttonMargin * 2 + buttonSize.y) * pixelSize, buttonSize.x * pixelSize, buttonSize.y * pixelSize);
        buttons.push(new Button(new Vector2((canvas.width - buttonSize.x * pixelSize) / 2, (buttonMargin * 2 + buttonSize.y) * pixelSize), new Vector2((canvas.width - buttonSize.x * pixelSize) / 2 + buttonSize.x * pixelSize, ((buttonMargin * 2 + buttonSize.y) + buttonSize.y) * pixelSize), "trade", "armour"));
    }else{
        context.drawImage(textures["trade-buttonExpensive"], (canvas.width - buttonSize.x * pixelSize) / 2, (buttonMargin * 2 + buttonSize.y) * pixelSize, buttonSize.x * pixelSize, buttonSize.y * pixelSize);
    }

    context.font = 45 * pixelSize + "px Arial";
    context.fillText("+1 Armour", canvas.width / 2, (3.5 * buttonMargin + buttonSize.y) * pixelSize);
    context.font = 30 * pixelSize + "px Arial";
    context.fillText(tradeItemsCost["armour"] + " Gold", canvas.width / 2, (6 * buttonMargin + buttonSize.y) * pixelSize);
    context.fillText(player.armour, canvas.width / 2, (7.5 * buttonMargin + buttonSize.y) * pixelSize);

    if(player.gold >= tradeItemsCost["luck"]){
        context.drawImage(textures["trade-button"], canvas.width - (buttonSize.x + buttonMargin) * pixelSize, (buttonMargin * 2 + buttonSize.y) * pixelSize, buttonSize.x * pixelSize, buttonSize.y * pixelSize);
        buttons.push(new Button(new Vector2(canvas.width - (buttonSize.x + buttonMargin) * pixelSize, (buttonMargin * 2 + buttonSize.y) * pixelSize), new Vector2(canvas.width - buttonMargin * pixelSize, ((buttonMargin * 2 + buttonSize.y) + buttonSize.y) * pixelSize), "trade", "luck"));
    }else{
        context.drawImage(textures["trade-buttonExpensive"], canvas.width - (buttonSize.x + buttonMargin) * pixelSize, (buttonMargin * 2 + buttonSize.y) * pixelSize, buttonSize.x * pixelSize, buttonSize.y * pixelSize);
    }

    context.font = 45 * pixelSize + "px Arial";
    context.fillText("+1 Luck", canvas.width - (buttonSize.x / 2 + buttonMargin) * pixelSize, (3.5 * buttonMargin + buttonSize.y) * pixelSize);
    context.font = 30 * pixelSize + "px Arial";
    context.fillText(tradeItemsCost["luck"] + " Gold", canvas.width - (buttonSize.x / 2 + buttonMargin) * pixelSize, (6 * buttonMargin + buttonSize.y) * pixelSize);
    context.fillText(player.luck, canvas.width - (buttonSize.x / 2 + buttonMargin) * pixelSize, (7.5 * buttonMargin + buttonSize.y) * pixelSize);

    context.drawImage(textures["trade-closeButton"], canvas.width - (buttonSize.x + buttonMargin) * pixelSize, canvas.height - (buttonSize.y + buttonMargin) * pixelSize, buttonSize.x * pixelSize, buttonSize.y * pixelSize);
    buttons.push(new Button(new Vector2(canvas.width - (buttonSize.x + buttonMargin) * pixelSize, canvas.height - (buttonSize.y + buttonMargin) * pixelSize), new Vector2(canvas.width - buttonMargin * pixelSize, canvas.height - buttonMargin * pixelSize), "screenSwitch", "game"));

    //context.textBaseline = "middle";
    context.font = 60 * pixelSize + "px Arial";
    context.drawImage(textures["trade-button"], buttonMargin, canvas.height - (buttonMargin + buttonSize.y) * pixelSize, buttonSize.x * pixelSize, buttonSize.y * pixelSize);
    context.fillText(player.gold + " Gold", (buttonMargin + buttonSize.x / 2) * pixelSize, canvas.height - pixelSize * (buttonSize.y / 2 + buttonMargin * 2));

    context.textAlign = "start";
}

// Trades with player
function trade(item){
    player.gold -= tradeItemsCost[item];
    if(item == "maxHealth"){
        maxHealth += 20;
        player.health += 20;
        tradeItemsCost["maxHealth"] += 100;
    }else if(item == "maxStamina"){
        maxStamina += 2;
        player.stamina += 2;
        tradeItemsCost["maxStamina"] += 100;
    }else if(item == "damage"){
        player.damage += 15;
        tradeItemsCost["damage"] += 100;
    }else if(item == "heal"){
        player.health = maxHealth;
        tradeItemsCost["heal"] += 500;
    }else if(item == "armour"){
        player.armour += 1;
        tradeItemsCost["armour"] += 250;
    }else if(item == "luck"){
        player.luck += 1;
        tradeItemsCost["luck"] += 1000;
    }
}

// Saves all the miscellaneous variables that are required for the game to function
function saveMiscVariables(){
    localStorage["level"] = level;
    localStorage["maxHealth"] = maxHealth;
    localStorage["maxStamina"] = maxStamina;
    localStorage["screen"] = screen;
    localStorage["tradeItemCosts"] = JSON.stringify(tradeItemsCost);
}

// Loads all the miscellaneous variables that are required for the game to function
function loadMiscVariables(){
    level = JSON.parse(localStorage["level"]);
    maxHealth = JSON.parse(localStorage["maxHealth"]);
    maxStamina = JSON.parse(localStorage["maxStamina"]);
    screen = localStorage["screen"];
    tradeItemsCost = JSON.parse(localStorage["tradeItemCosts"]);
}

// Saves enemies
function saveEnemies(){
    for(var i = 0; i < enemies.length; i++){
        localStorage["enemy" + i] = JSON.stringify(enemies[i]);
    }
}

// Loads enemies
function loadEnemies(){
    var i = 0;
    enemies = [];
    while(localStorage["enemy" + i] != undefined){
        enemies.push(JSON.parse(localStorage["enemy" + i]));
        i++;
    }
}

// Tracks mouse position
var mouse = new Vector2(0, 0);
function trackMouse(e){
    mouse.x = e.clientX;
    mouse.y = e.clientY;
}

/*[--- Make enemies more visible on map ---]*/

/*[--- Add Trapped Chests ---]*/
/*[--- Add Multiple Playable Character's With Different Starting Stats + Unlock At Certain Levels ---]*/