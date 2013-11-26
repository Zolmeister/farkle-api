# Farkle API - v0.0.1
#### By Zolmeister
http://farkle.zolmeister.com
## Objects
```
    Game
      {
      id: id,
      players: [ Players ],
      turn: -1,
      roll: [ ],
      currentScore : 0,
      started: false,
      maxPlayers: 99999999999999999
    }
  
    Player
    {
      username: username,
      score: 0
    }
```

## create game
/create -> Game  
optional: maxPlayers - int
    
## get game state
/:gameid/state -> Game
  
## join game
/:gameid/join -> {game: Game, token: secret_token}  
required: username - string
  
## make move
/:gameid/play -> Game  
required: token - secret_token  
required: keep - comma separated list of numbers  
optional: stop - bool
