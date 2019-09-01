var express = require('express');
var app = express();
var path = require('path');
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);

var clientpages = {
    'index': 'index.html',
    'archipelago': 'archipelago.html',
    'bellsongs': 'bellsongs.html',
    'heartsofwulin': 'heartsofwulin.html',
    'omsl': 'omsl.html',
    'dicechat': 'dicechat.html'
};
var game_ui_path = 'game_uis';

// app name spaces

// Express Middleware for serving static files
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/' + clientpages['index']);
});

// individual game HTML pages

app.get('/archipelago', function(req, res) {
    res.sendFile(__dirname + '/' + game_ui_path + '/' + clientpages['archipelago']);
});
// app.get('/bellsongs', function(req, res) {
//     res.sendFile(__dirname + '/' + game_ui_path + '/' + clientpages['bellsongs']);
// });
app.get('/heartsofwulin', function(req, res) {
    res.sendFile(__dirname + '/' + game_ui_path + '/' + clientpages['heartsofwulin']);
});
app.get('/omsl', function(req, res) {
    res.sendFile(__dirname + '/' + game_ui_path + '/' + clientpages['omsl']);
});
app.get('/dicechat', function(req, res) {
    res.sendFile(__dirname + '/' + game_ui_path + '/' + clientpages['dicechat']);
});

// shared JS functions

var helper = require('./helper.js');

// game JS modules

var archipelago = require('./game_modules/archipelago.js');
// var bellsongs = require('./game_modules/bellsongs.js');
var heartsofwulin = require('./game_modules/heartsofwulin.js');
var omsl = require('./game_modules/omsl.js');
var dicechat = require('./game_modules/dicechat.js');

// start server

server.listen(process.env.PORT || 3000);
console.log('Server "tRPG Playaids" running...');

// main server code

archipelago(app, io, helper);
// bellsongs(app, io, helper);
heartsofwulin(app, io, helper);
omsl(app, io, helper);
dicechat(app, io, helper);
