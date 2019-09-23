var express = require('express');
var app = express();
var path = require('path');
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
// trying to keep connection alive by sending ping message to server
io.set('heartbeat timeout', 5000);
io.set('heartbeat interval', 2000);

var clientpages = {
    'archipelago': 'archipelago.html',
    'bellsongs': 'bellsongs.html',
    'dicechat': 'dicechat.html',
    'heartsofwulin': 'heartsofwulin.html',
    'omsl': 'omsl.html',
    'theescort': 'theescort.html'
};
var game_ui_path = 'game_uis';

// app name spaces

// Express Middleware for serving static files
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

// individual game HTML pages

app.get('/archipelago', function(req, res) {
    res.sendFile(__dirname + '/' + game_ui_path + '/' + clientpages['archipelago']);
});
app.get('/bellsongs', function(req, res) {
    res.sendFile(__dirname + '/' + game_ui_path + '/' + clientpages['bellsongs']);
});
app.get('/dicechat', function(req, res) {
    res.sendFile(__dirname + '/' + game_ui_path + '/' + clientpages['dicechat']);
});
app.get('/heartsofwulin', function(req, res) {
    res.sendFile(__dirname + '/' + game_ui_path + '/' + clientpages['heartsofwulin']);
});
app.get('/omsl', function(req, res) {
    res.sendFile(__dirname + '/' + game_ui_path + '/' + clientpages['omsl']);
});
app.get('/theescort', function(req, res) {
    res.sendFile(__dirname + '/' + game_ui_path + '/' + clientpages['theescort']);
});

// shared JS functions

var helper = require('./helper.js');

// main server code

// start server

server.listen(process.env.PORT || 3000);
console.log('Server "tRPG Playaids" running...');

// start game modules

var archipelago = require('./game_modules/archipelago.js')(app, io, helper);
var bellsongs = require('./game_modules/bellsongs.js')(app, io, helper);
var dicechat = require('./game_modules/dicechat.js')(app, io, helper);
var heartsofwulin = require('./game_modules/heartsofwulin.js')(app, io, helper);
var omsl = require('./game_modules/omsl.js')(app, io, helper);
var theescort = require('./game_modules/theescort.js')(app, io, helper);
