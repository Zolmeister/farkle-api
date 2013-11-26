
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path');

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', routes.index);

var GAMES = {}

function newGame(maxPlayers, id) {
  // TODO: replace with shorturl algo
  var id = id || Math.floor(Math.random()*100000)
  while (GAMES[id]) {
    id = Math.floor(Math.random()*100000)
  }
  return {
    id: id,
    players: [],
    turn: -1,
    roll: [],
    currentScore : 0,
    started: false,
    maxPlayers: maxPlayers || 99999999999999999
  }
}

function newUser(username, token) {
  var user = {
    username: username,
    score: 0
  }
      
  // TODO: replace with crypto hash
  var token = token || Math.floor(Math.random()*100000)
  
  // hide token from json
  user.__proto__.token = token
  return user
}
function roll(game, num) {
  num = num || 6
  game.roll = Array.apply([], new Array(num)).map(function() {
    return Math.floor(Math.random()*6)+1
  })
  if(maxScore(game.roll) === 0) {
    game.turn+=1
    game.turn%=game.players.length
    game.currentScore=0
  }
}

function isTurn(game, token) {
  var player = game.players[game.turn]
  return token === player.token
}

function applyMove(game, keep, stop) {
  keep = keep.split(',').map(function(n) {
    return parseInt(n, 10)
  })
  
  // invalid move
  if (keep.length==0 || keep.length >6) return game
  
  if(stop) {
    game.currentScore+=maxScore(keep)
    game.players[game.turn].score += game.currentScore
    game.currentScore = 0
    game.turn+=1
    game.turn%=game.players.length
    // TODO: end game - check if score >= 10,000
  } else {
    // validate move
    console.log(move.split(','))
    move = move.split(',').map(parseInt)
    console.log(move)
  }
  return game
  // check if valid move
  // modify game state
  // return game
}

//testing
var game = newGame(null, 1)
GAMES[game.id] = game
app.all('/create', function(req, res) {
  var game = newGame(req.param('maxPlayers'))
  GAMES[game.id] = game
  res.json(game)
})
var user = newUser('Zolmeister', 1)
GAMES[1].players.push(user)
if(GAMES[1].turn === -1){
  GAMES[1].turn = 0
  roll(GAMES[1])
}


app.all('/:gameid/play', function(req, res) {
  var gameid = req.param('gameid')
  if(!gameid || !GAMES[gameid]) return res.json({err: 'game does not exist'})
  var token = req.param('token')
  if (!token || !isTurn(GAMES[gameid], token)) return res.json({err:'not your turn'})
  applyMove(GAMES[gameid], req.param('keep'), req.param('stop'))
  res.json(GAMES[gameid])
})

app.all('/:gameid/state', function(req, res) {
  var gameid = req.param('gameid')
  if(!gameid || !GAMES[gameid]) return res.json({err: 'game does not exist'})
  res.json(GAMES[gameid])
})

app.all('/:gameid/join', function(req, res) {
  var username = req.param('username')
  var gameid = req.param('gameid')
  if (!username) return res.json({err: 'username not specified'})
  if(!gameid || !GAMES[gameid]) return res.json({err: 'game does not exist'})
  // TODO add duplicate username check
  if(GAMES[gameid].players.length >= GAMES[gameid].maxPlayers) return res.json({err: 'game is full'})
  if(GAMES[gameid].started) return res.json({err:'game in progress'})
  
  var user = newUser(username, 1)
  GAMES[gameid].players.push(user)
  if(GAMES[gameid].turn === -1){
    GAMES[gameid].turn = 0
    roll(GAMES[gameid])
  }
  res.json({game: GAMES[gameid], token: user.token})
})

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
