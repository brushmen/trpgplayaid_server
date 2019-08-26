var express = require('express');
var path = require('path');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);

var maxplayers = 3;
var users = [];
var connections = [];

var roles = new Array(maxplayers);
var portraits = [
    'https://proxy.duckduckgo.com/iu/?u=https%3A%2F%2Ftse3.mm.bing.net%2Fth%3Fid%3DOIP.4Ksamf5DWGXtDX-MiIjlOgHaLH%26pid%3DApi&f=1',
    'https://proxy.duckduckgo.com/iu/?u=https%3A%2F%2Ftse3.mm.bing.net%2Fth%3Fid%3DOIP.2nHuYyGjuto2EdYe8UPhnQHaLH%26pid%3DApi&f=1',
    'https://proxy.duckduckgo.com/iu/?u=https%3A%2F%2Ftse2.mm.bing.net%2Fth%3Fid%3DOIP.EZ4unkciUjvtKmMRl6FsSgHaKe%26pid%3DApi&f=1'
];
var players = new Array(maxplayers);
var characters = new Array(maxplayers);
var factions = new Array(maxplayers);
var notes = new Array(maxplayers);
var elements = ['earth','fire','metal','water','wood'];
var styles = new Array(maxplayers);
var earths = [0,0,0,0,0];
var fires = [0,0,0,0,0];
var metals = [0,0,0,0,0];
var waters = [0,0,0,0,0];
var woods = [0,0,0,0,0];
var wounds = [false,false,false];
var marked = {};
for (var i = 0; i < maxplayers; i++) {
    marked[i] = new Array(5);
}
var bonds = new Array(maxplayers);
var xp = new Array(maxplayers);
var ge = new Array(maxplayers);
var re = new Array(maxplayers);

// ======================================================

var gametitle = 'Hearts of Wulin';
var clientpage = 'heartsofwulin.html';

server.listen(process.env.PORT || 3000);
console.log('Server running "' + gametitle + '"...');

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/' + clientpage);
});

// Express Middleware for serving static files
app.use(express.static(path.join(__dirname, 'public')));

var gamehandle = 'heartsofwulin';
var datafile = __dirname + '/game_data/' + 'data_' + gamehandle + '.json';
var defaultfile = __dirname + '/game_data/' + 'default_' + gamehandle + '.json';

// read a JSON file storing custom data if it exist
var fs = require('fs');
readJSONtoGame(datafile);

function readJSONtoGame(filename) {
    fs.access(filename, fs.constants.F_OK, (err) => {
        if (err) { // file doesn't exist
            filename = defaultfile;
        }
        fs.readFile(filename, 'utf8', function (err, data) {
            if (err) throw err;
            obj = JSON.parse(data);
            // must do it here or function will finish before read finishes
            JSONtoGame(obj);
        });
    });
}

function JSONtoGame(obj) {
    if (obj && obj[gamehandle] && obj[gamehandle]['profiles']) {
        var data = obj[gamehandle]['profiles'];

        for (var i = 0; i < maxplayers; i++) {
            roles[i] = data[i]['role'];
            portraits[i] = data[i]['portrait'];
            players[i] = data[i]['player'];
            characters[i] = data[i]['character'];
            factions[i] = data[i]['faction'];
            notes[i] = data[i]['notes'];
            styles[i] = data[i]['style'];
            earths[i] = data[i]['earth'];
            fires[i] = data[i]['fire'];
            metals[i] = data[i]['metal'];
            waters[i] = data[i]['water'];
            woods[i] = data[i]['wood'];
            wounds[i] = data[i]['wounded'];
            marked[i] = data[i]['marked'];
            bonds[i] = data[i]['bonds'];
            xp[i] = data[i]['xp'];
            ge[i] = data[i]['ge'];
            re[i] = data[i]['re'];
        }
    }
}

// ==================================================

io.on('connection', function(socket) {

    var name = checkUserName('', users); // get a username

    socket.username = name;
    users.push(name);

    socket.emit('username', socket.username); // send back the valid username
    updateClients();

    connections.push(socket);
    console.log('Connected: %s sockets connected', connections.length);

    // disconnect
    socket.on('disconnect', function(data) {
        users.splice(users.indexOf(socket.username), 1);
        updateClients();
        connections.splice(connections.indexOf(socket), 1);
        console.log('Disconnected: %s sockets connected', connections.length);
    });

    // send message
    socket.on('send message', function(data) {
        var s = io;
        var type = 'chat';

        data = data.trim();
        // only deal with non-empty data
        if (data) {
            console.log('message ' + data);

            // user wants to change username
            if (data.match(/^\/n\s([\w\d]*)$/)) {
                matches = data.match(/n\s([\w\d]*)$/);
                var oldname = socket.username;
                var newname = sanitize(matches[1], 'username');
                if (newname) { // if name is not empty after sanitization
                    socket.username = newname;
                    data = oldname + '|' + newname;
                    // update user's name on server
                    var i = users.indexOf(oldname);
                    if (i !== -1) {
                        users[i] = newname;
                    }
                } else { // no change on an empty update
                    data = oldname + '|' + oldname;
                }
                type = 'updateusername';
            }
            else if (data.match(/^\/save$/)) {
                type = "savegame";
                data = saveGame(); // save to a JSON file

                s = socket; // only send to sender
            }
            else if (data.match(/^\/load$/)) {
                type = "loadgame";

                s = socket; // only send to sender
            }
            else if (data.match(/^\/newgame$/)) {
                type = "newgame";
                readJSONtoGame(defaultfile);
            }
            else {
                // assume input is dice command, otherwise return original input
                data = commands(data);
                var s;

                if (data.match(/^<span title=/i)) {
                    type = "rollresult";
                }
            }

            s.emit('new message', {'message': data, 'user': socket.username, 'type': type});
            updateClients();
        }
    });

    socket.on('save current', function() {
        // var room = socket.room;
        //
        // var filename = gamedata[room]['datafile'];
        // // console.log('write to ' + filename);
        // writeJSON(filename, GametoJSON(room)); // save to a JSON file
        writeJSON(datafile, GametoJSON());
    });

    function updateClients() {
        var data = {};

        data['maxplayers'] = maxplayers;

        data['roles'] = roles;
        data['players'] = players;
        data['characters'] = characters;
        data['factions'] = factions;
        data['notes'] = notes;

        data['earths'] = earths;
        data['fires'] = fires;
        data['metals'] = metals;
        data['waters'] = waters;
        data['woods'] = woods;
        data['wounds'] = wounds;
        data['styles'] = styles;
        data['marked'] = marked;

        data['bonds'] = bonds;
        data['xp'] = xp;

        data['ge'] = ge;
        data['re'] = re;

        data['portraits'] = portraits;
        io.emit('update client', {'users': users, 'info': data});
    }

    // send dice roll
    socket.on('roll dice', function(data) {
        var outcome = commands(data.c);
        io.emit('roll result', {user: data.user, result: outcome});
        updateClients();
    });

    // update elements info
    socket.on('update elements', function(data) {
        var index = data.i;
        var list = data.elements;
        var info = data.info;
        for (var i in list) {
            // make all input a number, empty input are interpreted as 0
            list[i] = sanitize(list[i], 'statvalue');
            if (list[i]) {
                if (parseInt(list[i]) < -5) {
                    list[i] = -5; // stat value should be no less than -5
                }
            }
        }
        earths[index] = list['earth'];
        fires[index] = list['fire'];
        metals[index] = list['metal'];
        waters[index] = list['water'];
        woods[index] = list['wood'];
        styles[index] = info['style'];
        marked[index] = info['marked'];

        updateClients();
    });

    // update wounded info
    socket.on('update wounded', function(data) {
        wounds[data.i] = data.wounded;
        // apply penalty or reverse it to all stats as applicable
        if (wounds[data.i]) {
            // -2 penalty
            earths[data.i] -= 2;
            fires[data.i] -= 2;
            metals[data.i] -= 2;
            waters[data.i] -= 2;
            woods[data.i] -= 2;
        }
        else {
            // reverse penalty
            earths[data.i] += 2;
            fires[data.i] += 2;
            metals[data.i] += 2;
            waters[data.i] += 2;
            woods[data.i] += 2;
        }
        updateClients();
    });

    socket.on('update bond', function(data) {
        bonds[data.i] = data.bond;
        updateClients();
    });

    socket.on('update xp', function(data) {
        xp[data.i] = data.xp;
        updateClients();
    });

    socket.on('update role', function(data) {
        roles[data.i] = data.role;
        updateClients();
    });

    socket.on('update profile', function(data) {
        players[data.i] = data.info['player'];
        characters[data.i] = data.info['character'];
        factions[data.i] = data.info['faction'];
        updateClients();
    });

    socket.on('update notes', function(data) {
        notes[data.i] = data.notes;
        updateClients();
    });

    socket.on('update entanglement', function(data) {
        if (data.type == "general") {
            ge[data.i] = data.ent;
        } else if (data.type == "romantic") {
            re[data.i] = data.ent;
        }
        updateClients();
    });

    // update portrait url
    socket.on('portrait url', function(data) {
        portraits[data.number-1] = data.url;
        io.emit('portrait url', portraits);
    });

    // load JSON content
    socket.on('load json', function(data) {
        // parse JSON data, make sure it's valid
        if (isJSON(data)) {
            var obj = JSON.parse(data);
            JSONtoGame(obj);
            console.log('JSON accepted');
            updateClients();
        }
        else {
            console.log('JSON refused');
        }
    });

    function isJSON(str) {
        if( typeof( str ) !== 'string' ) {
            return false;
        }
        try {
            JSON.parse(str);
            return true;
        } catch (e) {
            return false;
        }
    }

    function commands(str) {
        var output = str;
        var matches;

        if (str.match(/^how-?\d/i)) {
            // apocalypse world style dice rolls
            matches = str.match(/(-?\d+)/);
            output = awDice(parseInt(matches[0]));
        } else if (str.match(/^d[1-9]\d{0,4}$/i)) {
            // just a single x-sided die, between 1 and 19999
            matches = str.match(/(\d+)/);
            // ignore a possibly matched 0-sided die
            if (parseInt(matches[0]) != 0) {
                output = dx(parseInt(matches[0]));
            }
        } else if (str.match(/^\/save$/)) {
            output = GametoJSON();
            writeJSON(filename, output);
            output = 'JSON:' + output;
        } else if (str.match(/^\/load$/)) {
            output = "loadJSON";
            // send signal to client to open a textfield to paste in JSON content
        }

        return output;
    }

    function GametoJSON() {
        var gameJSON = {};
        gameJSON[gamehandle] = { 'profiles': [] };

        for (var i = 0; i < maxplayers; i++) {
            gameJSON[gamehandle]['profiles'].push({
                'role': roles[i], 'portrait': portraits[i],
                'player': players[i], 'character': characters[i],
                'faction': factions[i], 'notes': notes[i],
                'style': styles[i], 'earth': earths[i], 'fire': fires[i],
                'metal': metals[i], 'water': waters[i], 'wood': woods[i],
                'wounded': wounds[i], 'marked': marked[i],
                'bonds': bonds[i], 'xp': xp[i], 'ge': ge[i], 're': re[i]
            });
        }

        gameJSON = JSON.stringify(gameJSON, null, "\t");
        console.log(JSON.parse(gameJSON));

        return gameJSON;
    }

    function writeJSON(filename, content) {
        // create new file if it doesn't exist, overwrite it if it does
        // use flag 'wx' if it should not create new file if it doesn't exist
        fs.writeFile(filename, content, { flag: 'w', encoding: 'utf8' }, function (err) {
            if (err) {
                console.log("An error occured while writing JSON Object to File.");
                return console.log(err);
            }
            console.log("JSON file has been saved.");
        });
        // writeFile can't pass back a string for confirmation
    }

    // dice roll calculations

    function awDice(n) {
        var results = new Array();
        var total = 0;
        var expanded = '';
        var output = '';

        for (var i = 0; i < 2; i++) {
            // roll 2d6
            results.push(Math.floor((Math.random() * 6) + 1));
        }

        total = results.reduce(function(a,b) {
            return a + b;
        });
        total += n;

        expanded = '( ' + results.join('+') + ' ) + ' + n;
        output += '<span title="' + expanded + '">' + total + '</span>';
        if (total > 9) {
            output += ', <span class="text-success">success!</span>';
        } else if (total > 6) {
            output += ', <span class="text-secondary">???</span>';
        } else {
            output += ', <span class="text-danger">miss!</span>';
        }

        return output;
    }

    function dx(n) {
        // n-sided dice without bonus
        var output = '';
        var result = 0;

        result = Math.floor((Math.random() * n) + 1);
        output += '<span title="(' + result + ')">';
        if (n == 2) {
            if (result == 1) {
                output += 'coin flip: head';
            } else {
                output += 'coin flip: tail';
            }
        }
        else {
            output += 'd' + n + ' roll: ' + result;
        }
        output += '</span>';

        return output;
    }

    // input validation checks

    function sanitize(str, type='statvalue') {
        var result = str ? str : '';

        if (type == 'statvalue') {
            result = result.replace(/[^0-9\-]/gi, ''); // replace non-digits
            result = parseInt(result);
            if (parseInt(result) == null) {
                result = '';
            }
        }
        else if (type == 'name') {
            result = result.replace(/[^a-zA-Z\s]/g, ''); // replace non-word and extra spaces
            result = result.trim();
        }
        else if (type == 'username') {
            result = result.replace(/[^a-zA-Z0-9\s]/g, ''); // replace non-word and extra spaces
            result = result.trim();
        }

        console.log('sanitize ' + str + ' to ' + result);

        return result;
    }

    function checkUserName(str, namelist) {
        var name = sanitize(str, 'username');
        if (!name) {
            // if name is empty
            name = 'player1';
        }

        var v = 1;
        if (!namelist) {
            namelist = [];
        }
        while (namelist.indexOf(name) !== -1) {
            // if username already exist, generate a new one
            v++;
            name = 'player' + v;
        }

        return name;
    }
});
