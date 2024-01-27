const express = require('express');
const app = express();
const http = require('http');
const socketIO = require('socket.io');
const mysql = require('mysql');

var bodyParser = require("body-parser") // call body parser module and make use of it
app.use(bodyParser.urlencoded({extended:true}));


const server = http.createServer(app);
const io = socketIO(server);

const db = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    port: '3306',
    password: 'Root',
    database: 'liam'
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

app.set('view engine', 'ejs');
app.use(express.static('views'));



// Socket.io integration
io.on('connection', (socket) => {
  console.log('A user connected');

  // Handle 'updateSum' event to update current total score of player on each screen
  socket.on('updateSum', ({ sumTotal }) => {
      // Broadcast the updated sum total to all connected clients
      io.emit('sumUpdated', { sumTotal });
  });

  socket.on('disconnect', () => {
      console.log('User disconnected');
  });


  socket.on('scoreUpdated', (data) => {
    // Broadcast the 'scoreUpdated' event to all connected clients
    io.emit('scoreUpdated', { textBoxId: data.textBoxId, currentValue: data.currentValue });
  });


  // handle the current user event


  // end handle the current user

// next is the logic to update the user score from the database every 5 seconds
// the game number needs to be set dynamically but for now its hardcoded at 15

 // Event to request the latest user data from the server
 socket.on('requestLatestUserData', (data) => {
  console.log("Received data: ", data);
  const { gameId } = data;
  console.log("Game ID: " + gameId);
 // let gameId = 15;
  let sql = 'SELECT uname, score FROM dusers WHERE gameNo = ?';

  db.query(sql, [gameId], (err, result) => {
    if (err) {
      console.error('Error fetching user data:', err);
      return;
    }
// console.log("Hello Liam " + result[0].score)
    // Emit the 'latestUserData' event with the latest user data to all clients
    io.emit('latestUserData', result);
  });
});



});

// Socket.io integration

app.get('/', (req, res) => {
  res.render('home');
  
});

app.get('/creategame', (req, res) => {
  res.render('creategame');
  
});

// this route is the post request to create a game and all users for that game 
app.post('/game', function(req, res) {
  // Assuming req.body.username is an array containing all the usernames
  let usernames = req.body.username;
  let gameId;

  // Insert a record into dgamess table with the first username
  let creatoruname = usernames.length > 0 ? usernames[0] : null;
  let insertGameSql = 'INSERT INTO dgamess (creatoruname) VALUES (?)';
  db.query(insertGameSql, [creatoruname], (gameErr, gameResult) => {
      if (gameErr) throw gameErr;

      // Get the generated game ID
      gameId = gameResult.insertId;
      console.log("the Made Game Id = " + gameId)

      // Use a loop to insert each username into the dusers table
      for (let i = 0; i < usernames.length; i++) {
          let insertUserSql = 'INSERT INTO dusers (uname, gameNo) VALUES (?, ?)';
          db.query(insertUserSql, [usernames[i], gameId], (userErr, userResult) => {
              if (userErr) throw userErr;

              // Emit a 'playerJoined' event when a new player joins
              

              // Redirect to the dgame page after all inserts are complete
              if (i === usernames.length - 1) {
                console.log("the redirect Game Id = " + gameId)
                  res.redirect('/dgame/' + gameId);
              }
          });
      }
  });
});
// End  this route is the post request to create a game and all users for that game 


// This route renders the game created and shows the game maker the game Id and a list of llayers 
app.get('/dgame/:id', (req, res) => {
  let gameId = req.params.id;

  // Query to get game information and users for the given game ID
  let sql = 'SELECT dusers.*, dgamess.Id AS gameId FROM dusers JOIN dgamess ON dusers.gameNo = dgamess.Id WHERE dgamess.Id = ?';
  
  let query = db.query(sql, [gameId], (err, result) => {
      if (err) throw err;
      console.log(result);

      // Render the dgame view with the result data
      res.render('dgame', { result });
  });
});

// End This route renders the game created and shows the game maker the game Id and a list of llayers 


// this route gets the game for players joining the game based on the text box on the home page 
app.get('/game/:id', (req, res) => {
  let gameId = req.params.id;

  // Query to get game information and users for the given game ID
  let sql = 'SELECT dusers.*, dgamess.Id FROM dusers JOIN dgamess ON dusers.gameNo = dgamess.Id WHERE dgamess.Id = ?';
  
  let query = db.query(sql, [gameId], (err, result) => {
      if (err) throw err;
      console.log(result);

      // Render the dgame view with the result data
      res.render('gameon', { result });
  });
});

// End this route gets the game for players joining the game based on the text box on the home page 




server.listen(3000, () => {
  console.log('Server is running on port 3000');
});
