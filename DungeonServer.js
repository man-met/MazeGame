// See Real-Time Servers II: File Servers for understanding 
// how we set up and use express
const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
var mysql = require("mysql");
let allPlayers = [];
let playerIdentities = [];
let timeTaken;
let startTime;
let connectionNo = 0;
let connection;
// We will use the dungeongenerator module to generate random dungeons
// Details at: https://www.npmjs.com/package/dungeongenerator
// Source at: https://github.com/nerox8664/dungeongenerator
const DungeonGenerator = require("dungeongenerator");

// all the files are served from the public directory
app.use(express.static("public"));

// variables for the dungeon
let dungeon = {};
let dungeonStart = {};
let dungeonEnd = {};
const dungeonOptions = {
    dungeon_width: 20,
    dungeon_height: 20,
    number_of_rooms: 7,
    average_room_size: 8
};

// returns the dungeon data when the data has to be emmitted
function getDungeonData() 
{
    return {
        dungeon,
        startingPoint: dungeonStart,
        endingPoint: dungeonEnd
    };
}

// a new client is connected, execute the following code
io.on("connection", function (socket) 
{

    // Print an acknowledge to the server's console to confirm a player has connected
    console.log("A player has connected - sending dungeon data...");

    // create a player object
    // playerID: a player id is given to the player to identify the player when the message is received from the client
    // x: defines the x position of the player on the dungeon
    // y: defines the y position of the player on the dungeon
    // shiftY: defines y value of the player image where the image has to start to be clipped
    // create a player identities object and store the id's to identify the player when a message is received from the client
    playerIdentities[socket.id] =
    {
        // store the connection_id fo the player
        connectionId: connectionNo,
    }

    allPlayers[connectionNo] = 
    {
        x: dungeonStart.x,
        y: dungeonStart.y,
        shiftY: 128,
    }

    // receive the movement object from the client to move the player
    socket.on("movement", function(data)
    {
        // call the movement function
        movement(data, socket.id);
    });
    
    // receive the message from the user when disconnects
    socket.on("disconnect", function()
    {
        // identify the playerID and store it into the variable
        let id = playerIdentities[socket.id].connectionId

        delete allPlayers[id];
        // update the allplayers array in all clients
        io.emit("allPlayers", allPlayers);
    });

    socket.emit("dungeon data", getDungeonData());

    // send the connection_id to the client
    socket.emit("connectionID", connectionNo);
    // send all players array to the clients
    io.emit("allPlayers", allPlayers);
    // count number of players connected
    connectionNo = connectionNo + 1;
    
});


function getCenterPositionOfSpecificRoom(roomIndex) 
{
    let position = {
        x: 0,
        y: 0
    };

    for (let i = 0; i < dungeon.rooms.length; i++) 
    {
        let room = dungeon.rooms[i];
        if (room.id === roomIndex) 
        {
            position.x = room.cx;
            position.y = room.cy;
            return position;
        }
    }
    return position;
}

// generates a new dungeon when this function is called
function generateDungeon() 
{
    // generates new dungeon and stores into the dungeon variable
    dungeon = new DungeonGenerator(
        dungeonOptions.dungeon_height,
        dungeonOptions.dungeon_width,
        dungeonOptions.number_of_rooms,
        dungeonOptions.average_room_size
    );
    console.log(dungeon);

    // the starting point is defined in the maze
    dungeonStart = getCenterPositionOfSpecificRoom(2);

    // ending point is defined in the maze
    dungeonEnd = getCenterPositionOfSpecificRoom(dungeon._lastRoomId - 1);
    // store the start time when the dungeon was generated
    startTime = (new Date).getTime();
}

/*
 * Start the server, listening on port 8081.
 * Once the server has started, output confirmation to the server's console.
 * After initial startup, generate a dungeon, ready for the first time a client connects.
 *
 */

server.listen(8081, function () 
{
    console.log("Dungeon server has started - connect to http://localhost:8081");
    // connect to the database
    createConnection();
    // create the tables
    createTables();
    // end the connection
    endConnection();
    // generate the dungeon
    generateDungeon();
    console.log("Initial dungeon generated!");
});


// movement function
function movement(data, socketID)
{
    // players id is stored into the id variable
    let id = playerIdentities[socketID].connectionId;

    // retrieve player from the array and store it into the player variable
    var player = allPlayers[id] || {};

    // when the left button is pressed, execute the following code
    if (data.left) {
        // check if the player can move to the left
        if(player.x - 1 >= 0 && dungeon.maze[player.y][player.x - 1] > 0)
        {
            // move the player to the left
            player.x -= 1;
            player.shiftY = 64;
        }
    }
    // when the up button is pressed, execute the following code
    if (data.up) {
        // check if the player can move upwards
        if(player.y - 1 >= 0 && dungeon.maze[player.y - 1][player.x] > 0)
        {
            // move upward by one block
            player.y -= 1;
            player.shiftY = 0;
        }
            
    }
    // when the right button is pressed, execute the following code
    if (data.right) {
        // check if the player can move right
        if(player.x + 1 < dungeon.w && dungeon.maze[player.y][player.x + 1] > 0)
        {
            // move to the right by one block
            player.x += 1;
            player.shiftY = 196;
        }
    }
    // when down button is pressed, execute the following code
    if (data.down) 
    {
        // check if the player can move down
        if(player.y + 1 < dungeon.h && dungeon.maze[player.y + 1][player.x] > 0)
        {
            // move the player down by one bloc
            player.y += 1;
            player.shiftY = 128
        }
    }

    if(player.x == dungeonEnd.x && player.y == dungeonEnd.y)
    {
        // store the timetaken to complete the dungeon
        timeTaken = parseInt(((new Date).getTime() - startTime) / 1000);
        // connect to the database
        createConnection();
        // select the database to connect
        selectDatabase();
        // insert the data into the tables
        insertData();
        // end the connection
        endConnection();
        // generate the dungeon
        generateDungeon();

        // send the dungeon data to all clients
        io.emit("dungeon data", getDungeonData());

        // reset the x and y values of all the players
        for(let socketID in allPlayers)
        {
            // set the player position to the dungeonstart position
            allPlayers[socketID].x = dungeonStart.x;
            allPlayers[socketID].y = dungeonStart.y;
        }
    }
    // send allplayers data to all clients
    io.emit("allPlayers", allPlayers);
}

// function to create the connection
function createConnection()
{
    // store the values to connect to the database
    connection = mysql.createConnection({
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: ''
    });

    // connect to the database
    connection.connect();
}

// create tables function
function createTables()
{
    // create a database if it does not exist
    connection.query("CREATE DATABASE IF NOT EXISTS dungeon;", function(error, result, fields) {
        if (error) {
            console.log("Error creating database: " + error.code);
        }
        else if (result) {
            console.log("Database created successfully.");
        }
    });

    // call the select database function
    selectDatabase();

    // drop tables if exists in the selected database
    connection.query("DROP TABLE IF EXISTS gameInfo", function(error, result, fields) {
        if (error) { 
            // for a deployment app, we'd be more likely to use error.stack
            // which gives us a full stack trace
            console.log("Problem dropping gameInfo table: " + error.code);
        }
        else if (result) { 
            console.log("gameInfo table dropped successfully.");
        }
    });

    // store the query to create the table
    var createGameInfoTableQuery = "CREATE TABLE gameInfo(";
	createGameInfoTableQuery += "mazeNo 		INT(3) PRIMARY KEY AUTO_INCREMENT,";
	createGameInfoTableQuery += "numberOfPlayers 	INT(3)	,";
	createGameInfoTableQuery += "timeTaken 			INT(5)	";
    createGameInfoTableQuery += ")";
    
    // create the tables by connecting to the database
    connection.query(createGameInfoTableQuery, function(error, result, fields){
        if (error) { 
            console.log("Error creating gameInfo table: " + error.code); 
        }
        else if (result) {
            console.log("gameInfo table created successfully.");
        }
    });
}

// end the connection to the database
function endConnection()
{
    connection.end(function(){
        console.log("Script has finished executing.");
    });
}

// select database connection
function selectDatabase()
{
    // select the database
    connection.query("USE dungeon;", function(error, result, fields) {
        if (error) {
            console.log("Error setting database: " + error.code);
        }
        else if (result) {
            console.log("Database successfully set.");
        }
    });
}

// insert the data into the table
function insertData()
{
    // store the query into the variable
    let query = "INSERT INTO gameInfo (numberOfPlayers, timeTaken) VALUES ('" + connectionNo +"', '" + timeTaken + "');";

    // run the query on  the database
    connection.query(query, function(error, results, fields)
    {
        if(error)
        {
            throw error;
            console.log(results.insertId);
        }
    });
}