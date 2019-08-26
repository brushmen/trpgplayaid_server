var express = require('express');
var path = require('path');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var roles = [];
var connections = [];

// game data variables

var dicepool = {blackbird: 7, bishop: 7, vance: 7, arkam: 7, snargle: 7};
var xp = {blackbird: 0, bishop: 0, vance: 0, arkam: 0, snargle: 0};
var diceformula = {action: 0, pooldice: 0, helping: 0};
var difficulty = 0;
var helpers = [];
var conditions = {};
var traits = {};
var tags = {};
var keys = {};
var secrets = {};
var tags = {};

conditions['owl'] = {fuel: true, supplies: false, repairs: false, speed: false};
traits['blackbird'] = ['Imperial Noble', 'Master Sorcerer', 'Athletic', 'Charm', 'Cunning'];
tags['blackbird'] = {
    'Imperial Noble': [
        'Etiquette', 'Dance', 'Educated', 'History', 'Science', 'Wealth', 'Connections', 'House Blackbird'
    ],
    'Master Sorcerer': [
        'Spellcaster', 'Channeling', 'Stormblood', 'Wind', 'Lightning', '[Fly]', '[Blast]', '[Sense]'
    ],
    'Athletic': [
        'Run', 'Fencing', 'Rapier', 'Duels', 'Shooting', '[Pistol]', '[Acrobatics]'
    ],
    'Charm': [
        'Charisma', 'Presence', 'Command', 'Nobles', 'Servants', '[Soldiers]'
    ],
    'Cunning': [
        'Deception', 'Misdirection', 'Disguise', 'Codes', '[Sneak]', '[Hide]'
    ]
};
keys['blackbird'] = ['Paragon', 'Mission', 'Impostor'];
secrets['blackbird'] = ['Stormblood', 'Inner Focus'];
conditions['blackbird'] = {injured: false, dead: false, tired: false, angry: false, lost: false, hunted: false, trapped: false};
traits['bishop'] = ['Pit-Fighter', 'Bodyguard', 'Ex-Slave', 'Keen'];
tags['bishop'] = {
    'Pit-Fighter': [
        'Combat Tested', 'Brutal', 'Living Weapon', 'Fast', 'Hard', '[Strong]', '[Bone-breaking]', '[Scary Look]'
    ],
    'Bodyguard': [
        'Awareness', 'Threats', 'Defend', 'Disarm', 'Restrain', 'Carry', 'Delay', '[Security]', '[First Aid]'
    ],
    'Ex-Slave': [
        'Sneak', 'Hide', 'Run', 'Tough', 'Endure', 'Scrounge', 'Nobles', '[Hatred]', '[Iron Will]'
    ],
    'Keen': [
        'Insightful', 'Aware', 'Coiled', 'Liars', 'Traps', '[Danger]', '[Sense Motives]'
    ]
};
keys['bishop'] = ['Guardian', 'Vengeance', 'Warrior'];
secrets['bishop'] = ['Destruction', 'Bodyguard'];
conditions['bishop'] = {injured: false, dead: false, tired: false, angry: false, lost: false, hunted: false, trapped: false};
traits['vance'] = ['Ex-Imperial Soldier', 'Smuggler', 'Survivor', 'Warrior'];
tags['vance'] = {
    'Ex-Imperial Soldier': [
        'Tactics', 'Command', 'Soldiers', 'Rank', 'Connections', 'Maps', 'Imperial War Ships'
    ],
    'Smuggler': [
        'Haggle', 'Deception', 'Sneak', 'Hide', 'Camouflage', 'Forgery', 'Pilot', 'Navigation', '[Repair]', '[Gunnery]'
    ],
    'Survivor': [
        'Tough', 'Run', 'Scrounge', 'Endure', 'Creepy Stare', 'Intimidate', '[Medic]'
    ],
    'Warrior': [
        'Battle-Hardened', 'Shooting', 'Two-Gun Style', 'Pistol', 'Fencing', 'Sword', '[Brawl]', '[Hail of Lead]'
    ]
};
keys['vance'] = ['Commander', 'Hidden Longing', 'Outcast'];
secrets['vance'] = ['Leadership', 'Warpblood'];
conditions['vance'] = {injured: false, dead: false, tired: false, angry: false, lost: false, hunted: false, trapped: false};
traits['arkam'] = ['Burglar', 'Tricky', 'Petty Magic', 'Mechanic'];
tags['arkam'] = {
    'Burglar': [
        'Quiet', 'Sneak', 'Hide', 'Dextrous', 'Locks', 'Perceptive', 'Traps', 'Darkness', '[Alarms]', '[Distractions]'
    ],
    'Tricky': [
        'Quick', 'Dirty Fighting', 'Tumbler', 'Escape', 'Contortionist', '[Sleight of Hand]', '[Acrobatics]', '[Dagger]'
    ],
    'Petty Magic': [
        'Light spell', 'Dark spell', 'Jump spell', 'Shatter Spell', '[Channeling]', '[Spellcaster]'
    ],
    'Mechanic': [
        'Repair', 'Engines', 'Efficiency', 'Spare Parts', 'Sabotage', '[Enhancements]', '[Ship Weapons]'
    ]
};
keys['arkam'] = ['Greed', 'Job', 'Fraternity'];
secrets['arkam'] = ['Concealment', 'Reflexes'];
conditions['arkam'] = {injured: false, dead: false, tired: false, angry: false, lost: false, hunted: false, trapped: false};
traits['snargle'] = ['Pilot', 'Sky Sailor', 'Goblin', 'Sly'];
tags['snargle'] = {
    'Pilot': [
        'Daring', 'Steady', 'Maneuvering', 'Evasion', 'Tricky Flying', 'Navigation', 'Maps', 'Atmospherics', '[The Owl]', '[Battle]', '[Ramming]'
    ],
    'Sky Sailor': [
        'Gunnery', 'Aim', 'Maintenance', 'Observation', 'Signals', 'Empire', 'Pirates', 'Free Worlds', 'Haven', '[Repair]', '[Connections]'
    ],
    'Goblin': [
        'Warp Shape', 'Glide', 'Nightvision', 'Agile', 'Quick', 'Tumbler', 'Teeth & Claws', '[Mimic Shape]', '[Reckless]', '[Connections]'
    ],
    'Sly': [
        'Crafty', 'Sneaky', 'Distractions', 'Bluff', 'Languages', 'Trade Speak', '[Sharp]', '[Disguise]'
    ]
};
keys['snargle'] = ['Daredevil', 'Conscience', 'Banter'];
secrets['snargle'] = ['Shape Warping', 'Lucky Break'];
conditions['snargle'] = {injured: false, dead: false, tired: false, angry: false, lost: false, hunted: false, trapped: false};

portraits = {
    'blackbird': "https://proxy.duckduckgo.com/iu/?u=https%3A%2F%2Ftse4.mm.bing.net%2Fth%3Fid%3DOIP.JOx8T9S1MesQDpe-c-7_-wHaJ4%26pid%3DApi&f=1",
    'bishop': "https://proxy.duckduckgo.com/iu/?u=https%3A%2F%2Ftse3.mm.bing.net%2Fth%3Fid%3DOIP._i7WKtxvwV_cbnrK5aFs9gAAAA%26pid%3DApi&f=1",
    'vance': "https://proxy.duckduckgo.com/iu/?u=https%3A%2F%2Ftse2.mm.bing.net%2Fth%3Fid%3DOIP.QLjCw530X0si_cOdADMe1AHaJ3%26pid%3DApi&f=1",
    'arkam': "https://proxy.duckduckgo.com/iu/?u=https%3A%2F%2Ftse3.mm.bing.net%2Fth%3Fid%3DOIP.mgqLqNlWxI2n-pKEzoRwjgAAAA%26pid%3DApi&f=1",
    'snargle': "https://proxy.duckduckgo.com/iu/?u=https%3A%2F%2Ftse3.mm.bing.net%2Fth%3Fid%3DOIP.FhbnuFeB4QUkdEqddOnCngAAAA%26pid%3DApi&f=1"
};

// ======================================================

var gametitle = 'Lady Blackbird';
var clientpage = 'ladyblackbird.html';

server.listen(process.env.PORT || 3000);
console.log('Server running "' + gametitle + '"...');

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/' + clientpage);
});

var datafile = __dirname + '/game_data/' + 'data_ladyblackbird.json';
var defaultfile = __dirname + '/game_data/' + 'default_ladyblackbird.json';

// read a JSON file storing custom data if it exist
var fs = require('fs');
var obj;

readJSON(datafile);

function readJSON(filename) {
    if (fs.existsSync(filename)) {
        console.log('readfile ' + filename);
        fs.readFile(filename, 'utf8', function (err, data) {
          if (err) throw err;
          obj = JSON.parse(data);
          JSONtoGame(obj);
      });
    }
}

function JSONtoGame(obj) {
    var data = obj['data']['roles'];

    for (var r in data) {
        if (r != "gm") {
            dicepool[r] = data[r]['dicepool'];
            xp[r] = data[r]['xp'];
            portraits[r] = data[r]['portrait'];
            keys[r] = data[r]['keys'];
            secrets[r] = data[r]['secrets'];
            traits[r] = data[r]['traits'];
            tags[r] = data[r]['tags'];
            conditions[r] = data[r]['conditions'];
        }
    }
    conditions['owl'] = obj['data']['owl']['conditions'];
}

// ==================================================

io.on('connection', function(socket) {
    connections.push(socket);
    console.log('Connected: %s sockets connected', connections.length);
    io.emit('total connections', {users: connections.length, activeroles: roles.length});
    io.emit('get roles', {msg: roles});

    // disconnect
    socket.on('disconnect', function(data) {
        console.log('disconnecting role: ' + socket.role);
        if (socket.role) {
            // only remove roles that are active, not before any has been chosen
            roles.splice(roles.indexOf(socket.role), 1);
        }
        console.log('active roles: ' + roles.join(', '));
        updateRoles();
        connections.splice(connections.indexOf(socket), 1);
        console.log('Disconnected: %s sockets connected', connections.length);
        io.emit('total connections', {users: connections.length, activeroles: roles.length});
    });

    // send message
    socket.on('send message', function(data) {
        var s = io;
        var type = "chat";

        data = data.trim();
        // only deal with non-empty data
        if (data) {
            console.log('message: ' + data);

            // check if command is buying new tags
            matches = data.match(/^buy\s\[([\w\s]+)\]$/);
            if (matches && matches[1]) {
                // check through role's traits for bracketed tags
                //console.log("matched: " + matches[1]);
                buyTag(socket.role, matches[1].trim());
                type = "buytag";
            }
            // check if command is buyoff any key
            matches = data.match(/^buyoff\s([\w\s]+)$/);
            if (matches && matches[1]) {
                // check through role's keys for a match to remove
                // then reward 10 XP
                buyoffKey(socket.role, matches[1].trim());
                type = "buyoffkey";
            }
            // check if command is X-Card
            var XCard = false;
            if (data.match(/^x$/i)) {
                data = '<div class="text-danger"><strong>X-Card</strong> used, ask for clarification if needed</div>';
                XCard = true;
                type = 'x-card';
            }
            matches = data.match(/^X-Card:([\w\s]*)$/);
            if (matches) {
                matches[1] = matches[1].trim();
                if (matches[1]) { // if not empty
                    data = '<div class="text-danger"><strong>X-Card</strong> used, please remove "' + matches[1] + '"</div>';
                }
                else {
                    data = '<div class="text-danger"><strong>X-Card</strong> used, ask for clarification if needed</div>';
                }
                XCard = true;
                type = 'x-card';
            }

            // check if it's GM trying to save file
            if (data.match(/^\/save$/) && socket.role == 'gm') {
                type = "savegame";
                data = saveGame(); // save to a JSON file

                s = socket; // only send to sender
            }
            // check if GM trying to load file
            else if (data.match(/^\/load$/) && socket.role == 'gm') {
                type = "loadgame";

                s = socket; // only send to sender
            }
            else if (data.match(/^\/newgame$/) && socket.role == 'gm') {
                type = "newgame";
                readJSON(defaultfile);
            }
            else if (data.match(/^RAISE HAND$/)) {
                type = "raisehand";
            }
            else if (data.match(/^CLEAR$/)) {
                type = "clear";
            }
            else if (!XCard) {
                // assume input is dice command, otherwise return original input
                data = commands(data);
                // if chat message was a dice command
                if (data.match(/^<span title=/i)) {
                    afterDiceRoll();
                    // if user typed command in chat, helping die calculation must
                    // be done manually because the dice command doesn't know which
                    // dice belong to whom
                    type = "rollresult";
                }
            }

            s.emit('new message', {'message': data, 'role': socket.role, 'type': type});
            updateRoles();
        }
    });

    // send dice roll
    socket.on('roll dice', function(data) {
        var outcome = commands(data.c);
        io.emit('roll result', {'role': data.r, result: outcome});

        // if failed, return used pool dice +1 to roller and helpers
        var m = outcome.match(/>(\d+)\b/);
        //var success = m[0].slice(1);
        var hits = m[1];

        // assume roll will suceed, remove those pool dice used
        dicepool[data.r] -= parseInt(data.pd);

        if (parseInt(hits) < difficulty) {
            // fails to beat difficulty level, return pool dice used and one more unless pool maxes at 10
            dicepool[data.r] += parseInt(data.pd) + 1;
            if (dicepool[data.r] > 10) {
                dicepool[data.r] = 10;
            }
            // helpers get their 1 helping die back
            helpers.forEach(function(h) {
                dicepool[h] += 1;
                if (dicepool[h] > 10) {
                    dicepool[h] = 10;
                }
            });
        }

        afterDiceRoll();
    });

    function afterDiceRoll() {
        // clear helper list
        helpers = [];
        // clear formula
        diceformula['action'] = 0;
        diceformula['pooldice'] = 0;
        diceformula['helping'] = 0;
        difficulty = 0;

        updateRoles();
    }

    // new user
    socket.on('choose role', function(data, callback) {
        callback(true);
        socket.role = data;
        roles.push(socket.role);
        console.log(data + ' chosen, now active roles ' + roles.join(', '));
        updateRoles();
    });

    // update portrait url
    socket.on('portrait url', function(data) {
        portraits[data.name] = data.url;
        io.emit('portrait url', portraits);
    });

    // refresh base dice pool after refrement phase
    socket.on('refresh dice pools', function() {
        for (var name in dicepool) {
            // only update dice pool if player has less than 7
            if (dicepool[name] < 7) {
                console.log('refresh ' + name + ' dice pool');
                dicepool[name] = 7;
            }
        }
        updateRoles();
    });

    socket.on('set difficulty', function(data) {
        difficulty = data;
        updateRoles();
    });

    // dice formula related
    socket.on('action dice update', function(data) {
        diceformula['action'] = data;
        updateRoles();
    });

    socket.on('pool dice update', function(data) {
        diceformula['pooldice'] = data;
        updateRoles();
    });

    // dice pool related
    socket.on('pool die reward', function(data) {
        dicepool[data] += 1;
        updateRoles();
    });
    socket.on('pool die helping', function(data) {
        dicepool[data.r] -= 1;
        diceformula['helping'] = data.h;
        helpers.push(data.r);
        updateRoles();
    });

    // xp related
    socket.on('xp reward', function(data) {
        xp[data] += 1;
        updateRoles();
    });
    socket.on('xp advance', function(data) {
        xp[data] -= 5;
        updateRoles();
    });

    socket.on('condition update', function(data) {
        conditions[data.role] = data.conditions;
        updateRoles();
    });

    // other gm section data

    function updateRoles() {
        var activeRoleInfo = {};

        roles.forEach(function(data) {

            if (data != 'gm') {
                console.log('adding ' + data + ' info');
                activeRoleInfo['traits_' + data] = traits[data];
                activeRoleInfo['tags_' + data] = tags[data];
                activeRoleInfo['keys_' + data] = keys[data];
                activeRoleInfo['secrets_' + data] = secrets[data];
                activeRoleInfo['conditions_' + data] = conditions[data];
                activeRoleInfo['pool_' + data] = dicepool[data];
                activeRoleInfo['xp_' + data] = xp[data];
            }
            else {
                console.log('adding gm info?');
            }
        });

        activeRoleInfo['diceformula_a'] = diceformula['action'];
        activeRoleInfo['diceformula_p'] = diceformula['pooldice'];
        activeRoleInfo['diceformula_h'] = diceformula['helping'];
        activeRoleInfo['difficulty'] = difficulty;
        activeRoleInfo['owlconditions'] = conditions['owl'];
        activeRoleInfo['portraits'] = portraits;

        io.emit('get roles', {msg: roles, info: activeRoleInfo});
        saveGame();
    }

    function buyTag(role, tag) {
        var target = '[' + tag + ']';

        if (role != "gm") {
            for (var trait in tags[role]) {
                var t = tags[role][trait];
                for (var i = 0; i < t.length; i++) {
                    if (t[i] == target) {
                        // check if role has enough XP to buy the tag
                        if (xp[role] >= 5) {
                            xp[role] -= 5;
                            t[i] = tag;
                            updateRoles();
                            break;
                        }
                    }
                }
            }
        }
    }

    function buyoffKey(role, key) {
        if (role != "gm") {
            for (var i = 0; i < keys[role].length; i++) {
                if (keys[role][i] == key) {
                    keys[role].splice(i, 1);
                    xp[role] += 10;
                    updateRoles();
                    break;
                }
            }
        }
    }

    // load JSON content
    socket.on('load json', function(data) {
        // parse JSON data, make sure it's valid
        if (isJSON(data)) {
            var obj = JSON.parse(data);
            JSONtoGame(obj);
            console.log('JSON accepted');
            updateRoles();
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

        if (str.match(/^lb[1-9]\d?$/i)) {
            // lady blackbird style dice rolls
            matches = str.match(/(\d+)/);
            output = lbDice(parseInt(matches[0]));
        }
        else if (str.match(/^d[1-9]\d{0,4}$/i)) {
            // just a single x-sided die, between 1 and 19999
            matches = str.match(/(\d+)/);
            // ignore a possibly matched 0-sided die
            if (parseInt(matches[0]) != 0) {
                output = dx(parseInt(matches[0]));
            }
        }

        return output;
    }

    function saveGame(filename=datafile) {
        var gameJSON = { data: {
                'roles': {},
                'owl': {
                    'conditions': {
                        'fuel': conditions['owl']['fuel'],
                        'supplies': conditions['owl']['supplies'],
                        'repairs': conditions['owl']['repairs'],
                        'speed': conditions['owl']['speed']
                        }
                }
            }
        };

        console.log('roles ' + roles.length);
        for (var i = 0; i < roles.length; i++) {
            r = roles[i];
            if (r != "gm") {
                obj = {};
                obj['portrait'] = portraits[r];
                obj['dicepool'] = dicepool[r];
                obj['xp'] = xp[r];
                obj['conditions'] = conditions[r];
                obj['traits'] = traits[r];
                obj['tags'] = tags[r];
                obj['keys'] = keys[r];
                obj['secrets'] = secrets[r];
                gameJSON.data.roles[r] = obj;

                console.log('obj ' + obj);
            }
        }

        gameJSON = JSON.stringify(gameJSON, null, "\t");
        console.log(JSON.parse(gameJSON));

        fs.writeFile(filename, gameJSON, 'utf8', function (err) {
            if (err) {
                console.log("An error occured while writing JSON Object to File.");
                return console.log(err);
            }
            console.log("JSON file has been saved.");
        });
        // writeFile can't pass back a string for confirmation

        // send back a string for client to download locally
        return gameJSON;
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
});
