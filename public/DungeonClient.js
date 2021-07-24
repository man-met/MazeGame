/*
 * These three variables hold information about the dungeon, received from the server
 * via the "dungeon data" message. Until the first message is received, they are
 * initialised to empty objects.
 *
 * - dungeon, an object, containing the following variables:
 * -- maze: a 2D array of integers, with the following numbers:
 * --- 0: wall
 * --- 1: corridor
 * --- 2+: numbered rooms, with 2 being the first room generated, 3 being the next, etc.
 * -- h: the height of the dungeon (y dimension)
 * -- w: the width of the dungeon (x dimension)
 * -- rooms: an array of objects describing the rooms in the dungeon, each object contains:
 * --- id: the integer representing this room in the dungeon (e.g. 2 for the first room)
 * --- h: the height of the room (y dimension)
 * --- w: the width of the room (x dimension)
 * --- x: the x coordinate of the top-left corner of the room
 * --- y: the y coordinate of the top-left corner of the room
 * --- cx: the x coordinate of the centre of the room
 * --- cy: the y coordinate of the centre of the room
 * -- roomSize: the average size of the rooms (as used when generating the dungeon)
 * -- _lastRoomId: the id of the next room to be generated (so _lastRoomId-1 is the last room in the dungeon)
 *
 * - dungeonStart
 * -- x, the row at which players should start in the dungeon
 * -- y, the column at which players should start in the dungeon
 *
 * - dungeonEnd
 * -- x, the row where the goal space of the dungeon is located
 * -- y, the column where the goal space of the dungeon  is located
 */

 // Variables declared to use globally
let dungeon = {};
let dungeonStart = {};
let dungeonEnd = {};
var allPlayers = [];
let canvas;
let connectionID;
// clientPlayerImage used to store the image of the local player to draw on the dungeon
const clientPlayerImage = new Image();
clientPlayerImage.src = "clientPlayer.png";
// serverPlayerImage used to store the image of the other players to draw on the dungeon
const serverPlayerImage = new Image();
serverPlayerImage.src = "serverPlayer.png";

// load a spritesheet (dungeon_tiles.png) which holds the tiles
// we will use to draw the dungeon
// Art by MrBeast. Commissioned by OpenGameArt.org (http://opengameart.org)
const tilesImage = new Image();
tilesImage.src = "dungeon_tiles.png";

/* 
 * Establish a connection to our server
 * We will need to reuse the 'socket' variable to both send messages
 * and receive them, by way of adding event handlers for the various
 * messages we expect to receive
 *
 * Replace localhost with a specific URL or IP address if testing
 * across multiple computers
 *
 * See Real-Time Servers III: socket.io and Messaging for help understanding how
 * we set up and use socket.io
 */
//connecting to the server
const socket = io.connect("http://localhost:8081");

/*
 * This is the event handler for the 'dungeon data' message
 * When a 'dungeon data' message is received from the server, this block of code executes
 * 
 * The server is sending us either initial information about a dungeon, or,
 * updated information about a dungeon, and so we want to replace our existing
 * dungeon variables with the new information.
 *
 * We know the specification of the information we receive (from the documentation
 * and design of the server), and use this to help write this handler.
 */

 // receiveing the dungeon data from the server using the sockets
socket.on("dungeon data", function (data) 
{
    console.log(data);
    dungeon = data.dungeon;
    dungeonStart = data.startingPoint;
    dungeonEnd = data.endingPoint;
});

// receiving allplayers from the server
socket.on("allPlayers", function(data)
{
    allPlayers = data;
    console.log(allPlayers);
});

// receiving the connectionID from the server when a new user connects
socket.on("connectionID", function(data)
{
    connectionID = data;
    console.log(connectionID);
});
/*
 * The identifySpaceType function takes an x, y coordinate within the dungeon and identifies
 * which type of tile needs to be drawn, based on which directions it is possible
 * to move to from this space. For example, a tile from which a player can move up
 * or right from needs to have walls on the bottom and left.
 *
 * Once a tile type has been identified, the necessary details to draw this
 * tile are returned from this method. Those details specifically are:
 * - tilesetX: the x coordinate, in pixels, within the spritesheet (dungeon_tiles.png) of the top left of the tile
 * - tilesetY: the y coordinate, in pixels, within the spritesheet (dungeon_tiles.png) of the top left of the tile
 * - tilesizeX: the width of the tile
 * - tilesizeY: the height of the tile
 */
function identifySpaceType(x, y) 
{
    
    let returnObject = 
    {
        spaceType: "",
        tilesetX: 0,
        tilesetY: 0,
        tilesizeX: 16,
        tilesizeY: 16
    };

    let canMoveUp = false;
    let canMoveLeft = false;
    let canMoveRight = false;
    let canMoveDown = false;

    // check for out of bounds (i.e. this move would move the player off the edge,
    // which also saves us from checking out of bounds of the array) and, if not
    // out of bounds, check if the space can be moved to (i.e. contains a corridor/room)
    if (x - 1 >= 0 && dungeon.maze[y][x - 1] > 0) 
    {
        canMoveLeft = true;
    }
    if (x + 1 < dungeon.w && dungeon.maze[y][x + 1] > 0) 
    {
        canMoveRight = true;
    }
    if (y - 1 >= 0 && dungeon.maze[y - 1][x] > 0) 
    {
        canMoveUp = true;
    }
    if (y + 1 < dungeon.h && dungeon.maze[y + 1][x] > 0) 
    {
        canMoveDown = true;
    }

    if (canMoveUp && canMoveRight && canMoveDown && canMoveLeft) 
    {
        returnObject.spaceType = "all_exits";
        returnObject.tilesetX = 16;
        returnObject.tilesetY = 16;
    }
    else if (canMoveUp && canMoveRight && canMoveDown) 
    {
        returnObject.spaceType = "left_wall";
        returnObject.tilesetX = 0;
        returnObject.tilesetY = 16;
    }
    else if (canMoveRight && canMoveDown && canMoveLeft) 
    {
        returnObject.spaceType = "up_wall";
        returnObject.tilesetX = 16;
        returnObject.tilesetY = 0;
    }
    else if (canMoveDown && canMoveLeft && canMoveUp) 
    {
        returnObject.spaceType = "right_wall";
        returnObject.tilesetX = 32;
        returnObject.tilesetY = 16;
    }
    else if (canMoveLeft && canMoveUp && canMoveRight) 
    {
        returnObject.spaceType = "down_wall";
        returnObject.tilesetX = 16;
        returnObject.tilesetY = 32;
    }
    else if (canMoveUp && canMoveDown) 
    {
        returnObject.spaceType = "vertical_corridor";
        returnObject.tilesetX = 144;
        returnObject.tilesetY = 16;
    }
    else if (canMoveLeft && canMoveRight) 
    {
        returnObject.spaceType = "horizontal_corridor";
        returnObject.tilesetX = 112;
        returnObject.tilesetY = 32;
    }
    else if (canMoveUp && canMoveLeft) 
    {
        returnObject.spaceType = "bottom_right";
        returnObject.tilesetX = 32;
        returnObject.tilesetY = 32;
    }
    else if (canMoveUp && canMoveRight) 
    {
        returnObject.spaceType = "bottom_left";
        returnObject.tilesetX = 0;
        returnObject.tilesetY = 32;
    }
    else if (canMoveDown && canMoveLeft) 
    {
        returnObject.spaceType = "top_right";
        returnObject.tilesetX = 32;
        returnObject.tilesetY = 0;
    }
    else if (canMoveDown && canMoveRight) 
    {
        returnObject.spaceType = "top_left";
        returnObject.tilesetX = 0;
        returnObject.tilesetY = 0;
    }
    return returnObject;
}

/*
 * Once our page is fully loaded and ready, we call startAnimating
 * to kick off our animation loop.
 * We pass in a value - our fps - to control the speed of our animation.
 */
$(document).ready(function () 
{
    // call the animation function
    startAnimating(10);
    // store the canvas into the canvas variable for reference
    canvas = $("canvas").get(0);

    // call the function when a user presses a keyboard key
    $("body").keydown(function(event)
    {
        // call the movebox function
		movePlayer(event, false, false);
    });

    // check if it is a touch device
    if("ontouchstart" in $(document.documentElement) == true)
    {
        // detect the touch on the screen to run this function
        Hammer(canvas).on("tap", function(event)
        {
            // call the movePlayer function
            movePlayer(event, false, true);
        });
    }
    else
    {
        $("canvas").click(function(event)
        {
            // Call the movePlayer function
            
            console.log("I am running");
            movePlayer(event, true, false);
        });
    }
    

});

let fpsInterval;
let then;

/*
 * The startAnimating function kicks off our animation (see Games on the Web I - HTML5 Graphics and Animations).
 */
function startAnimating(fps) {
    fpsInterval = 1000 / fps;
    then = Date.now();
    // call the animate function
    animate();
}

/*
 * The animate function is called repeatedly using requestAnimationFrame (see Games on the Web I - HTML5 Graphics and Animations).
 */
var shiftX = 0;
var shiftY = 128;
var frameWidth = 64;
var frameHeight = 64;
const totalFrames = 8;
var currentFrame = 0;

function animate() {
    requestAnimationFrame(animate);

    let now = Date.now();
    let elapsed = now - then;

    if (elapsed > fpsInterval) {
        then = now - (elapsed % fpsInterval);
        // Acquire both a canvas (using jQuery) and its associated context
        //canvas = $("canvas").get(0);
        let context = canvas.getContext("2d");

        // Calculate the width and height of each cell in our dungeon
        // by diving the pixel width/height of the canvas by the number of
        // cells in the dungeon
        let cellWidth = canvas.width / dungeon.w;
        let cellHeight = canvas.height / dungeon.h;
        

        // Clear the drawing area each animation cycle
        context.clearRect(0, 0, canvas.width, canvas.height);

        /* We check each one of our tiles within the dungeon using a nested for loop
         * which runs from 0 to the width of the dungeon in the x dimension
         * and from 0 to the height of the dungeon in the y dimension
         *
         * For each space in the dungeon, we check whether it is a space that can be
         * moved into (i.e. it isn't a 0 in the 2D array), and if so, we use the identifySpaceType
         * method to check which tile needs to be drawn.
         *
         * This returns an object containing the information required to draw a subset of the
         * tilesImage as appropriate for that tile.
         * See: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
         * to remind yourself how the drawImage method works.
         */
        for (let x = 0; x < dungeon.w; x++) 
        {
            for (let y = 0; y < dungeon.h; y++) 
            {
                if (dungeon.maze[y][x] > 0) 
                {
                    let tileInformation = identifySpaceType(x, y);
                    context.drawImage(tilesImage,
                        tileInformation.tilesetX,
                        tileInformation.tilesetY,
                        tileInformation.tilesizeX,
                        tileInformation.tilesizeY,
                        x * cellWidth,
                        y * cellHeight,
                        cellWidth,
                        cellHeight);
                } 
                else 
                {
                    context.fillStyle = "Black";
                    context.fillRect(
                        x * cellWidth,
                        y * cellHeight,
                        cellWidth,
                        cellHeight
                    );
                }
            }
        }

        // The start point is calculated by multiplying the cell location (dungeonStart.x, dungeonStart.y)
        // by the cellWidth and cellHeight respectively
        // Refer to: Games on the Web I - HTML5 Graphics and Animations, Lab Exercise 2
        context.drawImage(tilesImage,
            16, 80, 16, 16,
            dungeonStart.x * cellWidth,
            dungeonStart.y * cellHeight,
            cellWidth,
            cellHeight);

        // The goal is calculated by multiplying the cell location (dungeonEnd.x, dungeonEnd.y)
        // by the cellWidth and cellHeight respectively
        // Refer to: Games on the Web I - HTML5 Graphics and Animations, Lab Exercise 2
        context.drawImage(tilesImage,
            224, 80, 16, 16,
            dungeonEnd.x * cellWidth,
            dungeonEnd.y * cellHeight,
            cellWidth,
            cellHeight);
        
        // set the colour to fill on the canvas to draw touch areas
        context.fillStyle = 'rgba(51, 255, 51, 0.4)';
        // draw the touch areas on the canvas
        // top rect
        context.fillRect(125, 0, 250, 75);
        // left rect
        context.fillRect(0, 125, 75, 250);
        // down rect
        context.fillRect(125, 425, 250, 500);
        // right rect
        context.fillRect(425, 125, 500, 250);

        // loop through the players to draw them on the canvas
        for(let socketID in allPlayers)
        { 
            // check if the player is null
            if(allPlayers[socketID] != null)
            {
                // check if the connection id of the client matches to the socketID to draw a specific image
                if(connectionID == socketID)
                {
                    // draw the image on the maze
                    context.drawImage(clientPlayerImage, shiftX, allPlayers[socketID].shiftY, frameWidth, frameHeight, allPlayers[socketID].x * 25, allPlayers[socketID].y * 25, cellWidth, cellHeight);
                }
                else
                {
                    // draw the image on the maze
                    context.drawImage(serverPlayerImage, shiftX, allPlayers[socketID].shiftY, frameWidth, frameHeight, allPlayers[socketID].x * 25, allPlayers[socketID].y * 25, cellWidth, cellHeight);
                }
            }
        }

        // check if the currentframe of the spritesheet is smaller than total number of frames
        if(currentFrame < totalFrames)
        {
            // move to the next frame
            shiftX = shiftX + frameWidth;
            // count the number of frame
            currentFrame++
        }
        else
        {
            // reset the values
            currentFrame = 0;
            shiftX = 0;
        }

    }
}


// movement function
function movePlayer(event, mouseClick, tap)
{
    // declare variables to store the locations of click and tap on the screen
    let clickX;
    let clickY;
    // create a movement object
    var movement =
    {
        up: false,
        down: false,
        left: false,
        right: false
    }
    console.log(movement);
    console.log(event.which);
    console.log("mouseclick = " + mouseClick);
    console.log("tap = " + tap);
    // check what type of event was
    if (mouseClick == true)
    {
        // store the location of mouse click into the variables
        clickX = event.pageX;
        clickY = event.pageY;
    }
    else if(tap == true)
    {
        // store the location of tap on the touchscreen into the variables
        clickX = event.changedPointers[0].pageX;
        clickY = event.changedPointers[0].pageY;
    }
    // check which button was pressed
    if(event.which == 37 || clickX >= 0 && clickX <= 75+10 && clickY >= 125 + 10 && clickY <= 250 + 125 + 10)
    {
        // set left movement to true
        movement.left = true;
    }
    else if(event.which == 38 || clickX >= 125 + 10 && clickX <= 375 + 10 && clickY >= 0 && clickY <= 75 + 10)
    {
        // set up movement to true
        movement.up = true;
    }
    else if(event.which == 39 || clickX >= 425 + 10 && clickX <= 500+10 && clickY >= 125 + 10 && clickY <= 375 + 10)
    {
        // set the right movement to true
        movement.right = true;
    }
    else if(event.which == 40 || clickX >= 125 + 10 && clickX <= 375 + 10 && clickY >= 425 + 10 && clickY <= 500 + 10)
    {
        // set the down member of the movement to true
        movement.down = true;
    }
    // send the movement object to the server to move the player
    socket.emit("movement", movement);
}