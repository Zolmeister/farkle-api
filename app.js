
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path')
  , _ = require('lodash');

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
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
function maxScore(roll) {
  return 1
}
function applyMove(game, keep, stop) {
  keep = keep && keep.split(',').map(function(n) {
    return parseInt(n, 10)
  })
  
  // invalid move
  if (!keep || (keep.length==0 && game.roll.length>0) || keep.length > 6) return game
  
  // validate if move is possible
  var countKeep = _.countBy(keep)
  var countRoll = _.countBy(game.roll)
  for(var key in countKeep) {
    if (countKeep[key] > countRoll[key]) return game
  }
  
  if(stop) {
    game.currentScore+=maxScore(keep)
    game.players[game.turn].score += game.currentScore
    game.currentScore = 0
    game.turn+=1
    game.turn%=game.players.length
    roll(game, 6)
    // TODO: end game - check if score >= 10,000
  } else {
    game.currentScore += maxScore(keep)
    // remove kept from roll
    // if roll.length==0, roll 6 dice, else roll the dice left
    var cheat = false
    _.forEach(keep, function(n) {
      var index = game.roll.indexOf(n)
      if (index === -1) cheat = true
      else game.roll.pop(index)
    })
    
    if(cheat) {
      game.currentScore = 0
      game.turn+=1
      game.turn%=game.players.length
      roll(game, 6)
      return game
    }
    
    if(game.roll.length === 0) {
      roll(game, 6)
    } else {
      roll(game, game.roll.length)
    }
  }
  return game
  // check if valid move
  // modify game state
  // return game
}
Array.prototype.count = function(n) {
  var cnt = 0
  _.forEach(this, function(e) {
    if (e===n){
      cnt+=1
    }
  })
  return cnt
}
function len(arr){
  return arr.length
}
function set(arr) {
  return _.uniq(arr)
}
function maxScore(dice){
      if (!dice.length)
        return 0
      
      // six of a kind - 3000
      if (dice.count(dice[0]) == 6)
        return 3000
      
      // two triplets - 2500
      if (len(dice) == 6)
        if (len(set(dice)) == 2 && dice.count(list(set(dice))[0]) == 3)
          return 2500
      
      // 5 of a kind - 2000
      _.forEach(set(dice), function(d){
        if (dice.count(d) == 5)
          return maxScore(_.filter(dice, function(x){
            return x != d
          })) + 2000
      })
      
      // straight - 1500
      if (len(set(dice)) == 6)
        return 1500
      
      // three pairs - 1500
      if (len(dice) == 6){
        var threePairs = true
        _.forEach(set(dice), function(d){
          if (dice.count(d) != 2)
            threePairs = false
        })
        if (threePairs)
          return 1500
      }
      
      // 4 of a kind - 1000
      _.forEach(set(dice), function(d){
        if (dice.count(d) == 4)
          return maxScore(_.filter(dice, function(x){
            return x != d
          })) + 1000
      })
      /* 3x
        # 6 - 600
        # 5 - 500
        # 4 - 400
        # 3 - 300
        # 2 - 200
        */
      _.forEach(set(dice), function(d){
        if (d != 1 && dice.count(d) == 3)
          return maxScore(_.filter(dice, function(x){
            return x != d
          })) + d * 100
      })
      // 1 - 100
      if (set(dice).indexOf(1)!==-1)
        return maxScore(_.filter(dice, function(x){
            return x != 1
          })) + dice.count(1) * 100
      
      // 5 - 50
      if (set(dice).indexOf(5)!==-1)
        return maxScore(_.filter(dice, function(x){
            return x != 5
          })) + dice.count(5) * 50
      
      return 0
}

//testing
/*var game = newGame(null, 1)
GAMES[game.id] = game
var user = newUser('Zolmeister', 1)
GAMES[1].players.push(user)
if(GAMES[1].turn === -1){
  GAMES[1].turn = 0
  roll(GAMES[1])
}

*/


app.all('/create', function(req, res) {
  var game = newGame(req.param('maxPlayers'))
  GAMES[game.id] = game
  res.json(game)
})

app.all('/:gameid/play', function(req, res) {
  var gameid = req.param('gameid')
  if(!gameid || !GAMES[gameid]) return res.json({err: 'game does not exist'})
  var token = req.param('token')
  if (!token || !isTurn(GAMES[gameid], token)) return res.json({err:'not your turn'})
  applyMove(GAMES[gameid], req.param('keep'), req.param('stop'))
  if(!GAMES[gameid].started){
    GAMES[gameid].started = true
  }
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

app.all('/:gameid/addbot', function(req, res) {
  res.json({err: 'TODO'})
})

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
