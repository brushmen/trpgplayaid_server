var express = require('express');
var path = require('path');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
users = [];
connections = [];

var gametitle = 'Dice Chat';

server.listen(process.env.PORT || 3000);
console.log('Server running "' + gametitle + '"...');
var clientpage = 'dicechat.html';

// Express Middleware for serving static files
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/' + clientpage);
});

io.on('connection', function(socket) {
    connections.push(socket);
    console.log('Connected: %s sockets connected', connections.length);
    io.emit('total users', {msg: connections.length});

    // disconnect
    socket.on('disconnect', function(data) {
        users.splice(users.indexOf(socket.username), 1);
        updateUsernames();
        connections.splice(connections.indexOf(socket), 1);
        console.log('Disconnected: %s sockets connected', connections.length);
        io.emit('total users', {msg: connections.length});
    });

    // send message
    socket.on('send message', function(data) {
        data = data.trim();
        // only deal with non-empty data
        if (data) {
            console.log(data);
            // assume input is dice command, otherwise return original input
            data = diceRoller(data);
            io.emit('new message', {msg: data, user: socket.username});
        }
    });

    // new user
    socket.on('new user', function(data, callback) {
        callback(true);

        // generate random username if it's empty or a duplicate
        data = checkUserName(data, users);

        socket.username = data;
        users.push(socket.username);
        socket.emit('username', socket.username); // send back the valid username

        updateUsernames();
    });

    function updateUsernames() {
        io.emit('get users', users);
    }

    function diceRoller(str) {
        var output = str;
        var matches;

        if (str.match(/^lb[1-9]\d?/i)) {
            // lady blackbird style dice rolls
            matches = str.match(/(\d+)/);
            output = lbDice(parseInt(matches[0]));
        }
        else if (str.match(/^aw-?\d/i)) {
            // apocalypse world style dice rolls
            matches = str.match(/(-?\d+)/);
            output = awDice(parseInt(matches[0]));
        }
        else if (str.match(/^da-?\d/i)) {
            // dragon age style dice rolls
            matches = str.match(/(-?\d+)/);
            output = daDice(parseInt(matches[0]));
        }

        else if (str.match(/^d[1-9]\d{0,4}$/i)) {
            // just a single x-sided die, between 1 and 19999
            matches = str.match(/(\d+)/);
            // ignore a possibly matched 0-sided die
            if (parseInt(matches[0]) != 0) {
                output = dx(parseInt(matches[0]));
            }
        }
        else if (str.match(/^\d{1,2}d\d{1,2}(([\+\-][1-9])|([\+\-][1-9]\d))?$/i)) {
            // general-purpose x number of x-sided dice, x between 0 to 99
            matches = str.match(/(-?\d+)/g);
            var num = parseInt(matches[0]);
            var sides = parseInt(matches[1]);
            var bonus = 0;
            if (matches.length > 2) {
                // has a bonus value
                bonus = parseInt(matches[2]);
            }
            if (num == 0 || sides == 0) {
                // ignore the roll, only return bonus if any
                if (bonus > 0) {
                    output = bonus + '';
                }
            } else {
                output = xdx(num, sides, bonus);
            }
        }
        else if (str.match(/^dd-?\di?/i)) {
            // d&d style dice rolls
            matches = str.match(/(-?\d+)/g);
            var i_matches = str.match(/i$/i);
            if (i_matches) {
                output = ddDice(parseInt(matches[0]), true);
            } else {
                output = ddDice(parseInt(matches[0]));
            }
        }

        return output;
    }

    function lbDice(n) {
        var hits = 0;
        var result = 0;
        var results = new Array();
        var expanded = '';
        var output = '';

        for (var i = 0; i < n; i++) {
            result = Math.floor((Math.random() * 6) + 1);
            results.push(result);
            if (result > 3) {
                hits++;
            }
        }

        expanded = '( ' + results.join('+') + ' ) = ' + results.reduce(function(a,b) {
            return a + b;
        });
        output += '<span title="' + expanded + '">' +
            hits + ' hit';

        if (hits > 1) {
             output += 's';
        }

        output += '</span>';

        return output;
    }

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
        output += '<span title="' + expanded + '">' + total;
        if (total > 9) {
            output += ', a success!';
        } else if (total > 6) {
            output += ', a partial success';
        } else {
            output += ', a miss!';
        }
        output += '</span>';

        return output;
    }

    function daDice(n) {
        var results = new Array();
        var total = 0;
        var expanded = '';
        var result = 0;
        var dragondie = 0;
        var output = '';

        for (var i = 0; i < 3; i++) {
            // roll 3d6
            result = Math.floor((Math.random() * 6) + 1);
            if (i == 2) {
                // last die represents dragon die
                dragondie = result;
            }
            results.push(result);
        }

        total = results.reduce(function(a,b) {
            return a + b;
        });
        total += n;

        expanded = '( ' + results.join('+') + ' ) + ' + n;
        output += '<span title="' + expanded + '">' + total + ' (Dragon Die: ' + dragondie + ')';
        output += '</span>';

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

    function xdx(num,sides,bonus) {
        var output = '';
        var results = new Array();
        var total = 0;

        for (var i = 0; i < num; i++) {
            results.push(Math.floor((Math.random() * sides) + 1));
        }

        total = results.reduce(function(a,b) {
            return a + b;
        });
        total += bonus;

        expanded = '( ' + results.join('+') + ' ) + ' + bonus;
        output += '<span title="' + expanded + '">' + total;
        output += '</span>';

        return output;
    }

    function ddDice(n, inspiration=false) {
        var result = 0;
        var results = new Array();
        var output = '';
        var rolls = 1;

        if (inspiration) {
            rolls = 2;
        }

        for (var i = 0; i < rolls; i++) {
            results.push(Math.floor((Math.random() * 20) + 1));
        }

        if (inspiration) {
            // choose the higher value
            if (results[0] > results[1]) {
                result = results[0];
            } else {
                result = results[1];
            }
        }
        else {
            result = results[0];
        }

        output += '<span title="( ' + results[0] + ' ) + ' + n;
        if (inspiration) {
            output += ' and ( ' + results[1] + ' ) + ' + n;
        }
        output += '">' + (result + n);

        if (inspiration) {
            output += ' (the higher result)';
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
            name = 'u1';
        }

        var v = 1;
        while (namelist.indexOf(name) !== -1) {
            // if username already exist, generate a new one
            v++;
            name = 'u' + v;
        }

        return name;
    }
});
