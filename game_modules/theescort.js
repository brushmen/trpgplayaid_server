
module.exports = function(app, socketio, helper) {
    console.log('module "The Escort" running...');

    var gamehandle = 'theescort';
    var io = socketio.of('/' + gamehandle); // custom namespace
    var fs = require('fs'); // file stream
    var users = {}; // users in rooms
    var connections = []; // all connections to this namespace
    var datafiles = []; // data json filenames for each room
    var defaultroom = 'test';
    var defaultdatapath = '/../game_default/';
    var datapath = '/../game_data/';
    var defaultfile = __dirname + defaultdatapath + 'default_' + gamehandle + '.json';
    var gamedata = {}; // includes data for each individual rooms
    var locked = {}; // local locked profiles, not to be saved with save file

    // shared infotext

    var infotext = {
        'Key of the Righteous': 'Hit your key when you stand up against injustice, for the sake of someone else who is innocent or is less fortunate than you. BUYOFF: Ignore the plight of an innocent.',
        'Key of Dignity': 'Hit your key when you refuse to admit weakness, defeat, or wrong doing. BUYOFF: show vulnerability or apologize for a mistake',
        'Key of the Loner': "Hit your key when rejecting someone's attempt to befriend you. BUYOFF: graciously accept someone's companionship",
        'Secret of the Miracle Worker': 'Once per session, you can re-roll a failure when working with medicine.',
        'Secret of the Genius': 'Once per session, you can describe a solution to a puzzle narratively without rolling dice.',

        'Key of the Lawful': 'Hit your key when you uphold the law to the letter. BUYOFF: Turn a blind-eye to an unlawful deed.',
        'Key of Mercy': 'Hit your key when you show mercy to an opponent, a criminal, or give alms to the poor. BUYOFF: Use excessive force.',
        'Key of the Overthinker': 'Hit your key when you over-analyze a situation for the sake of coming up with the perfect solution. BUYOFF: Act decisively.',
        'Secret of Trust': "Once per session, you can re-roll a failure when trying to gain an NPC's trust.",
        'Secret of Capture': 'Once per session, you can restrain an NPC without rolling dice.',

        'Key of the Mission': 'Hit your key when you take action to escort the Charge to the final execution ground. BUYOFF: give up the mission.',
        'Key of Curiosity': 'Hit your key when you learn something new from your companions. BUYOFF: show no interest in getting to know your companions.',
        'Key of the Romantic': 'Hit your key when you speak highly of love, in poetry, lyrics, or a short story. BUYOFF: express disdain or mistrust of love.',
        'Secret of Shock and Awe': 'Once per session, you can impress or intimidate someone or a group of mooks without rolling dice.',
        'Secret of Leadership': 'Once per session, you can give someone else a chance to re-roll a failed roll by giving them orders, advice, or setting a good example.',

        'Key of the Warrior': 'Hit your key when you do battle with worthy or superior foes. BUYOFF: Pass up an opportunity for a good fight.',
        'Key of Hidden Longing': 'Hit your key when you make a decision based on your secret affection for someone in the group without showing it directly. BUYOFF: Give up on your secret desire or make it public.',
        'Secret of Deception': 'Once per session, you can re-roll a failure when trying to deceive someone.',
        'Secret of Faking Death': 'First "resurrection" is free. Second time requires a narrative explanation that is convincing to the group. On the third death, you can narrate a short epilogue of what happened to your character, but you can no longer contribute to an ongoing story with this identity (play as support characters or discuss with group).'
    };

    var initial_traits = {
        'thecharge': {
            'Influence': ['Etiquette', 'Wealth', 'Connections', 'Clan'],
            'Learned': ['Instrument', 'Game', 'Calligraphy', 'Art', 'Methods of War', 'Geography', 'History', 'Medicine', '[Astronomy]', '[Craft]', '[Geomancy]'],
            'Charm': ['Charisma', 'Presence', 'Influence', '[Command]'],
            'Strategy': ['Deception', 'Misdirection', 'Disguise', 'Code', '[Sneak]', '[Hide]', '[Rumors]']
        },
        'theconstable': {
            'The Law': ['Regulations', 'Authority', 'Command', 'Defend', 'Restrain', 'Fairness'],
            'Warrior': ['Weapons Master', 'Unarmed Techniques', 'Seasoned', 'Fast', 'Lightfoot', 'Pressure Points', 'Internal Strength', '[Hard]', '[Strong]'],
            'Compassion': ['Empathy', 'Disarming', 'Peacekeeper', '[Trust]'],
            'Keen': ['Insightful', 'Aware', 'Danger', '[Sense Motives]']
        },
        'theentrusted': {
            'Escort Agency': ['Regulations', 'Code', 'Connections', 'Reputation', 'Loyalty'],
            'Warrior': ['Weapon Master', 'Blades', 'Glaives', 'Staff', 'Improvising', 'Horsemanship', '[Lightfoot]', '[Pressure Points]', '[Hidden Weapon]'],
            'Jianghu': ['Rules', 'Code', 'Favors', 'Reputation', 'Righteousness'],
            'Passions': ['Singing', 'Poetry', 'Tutoring', '[Alchemist]', '[Geomancy]', '[Storytelling]']
        },
        'themercenary': {
            'Job': ['Hard', 'Endure', 'Practical', 'Negotiate', 'First-Aid'],
            'Warrior': ['Weapon Master', 'Archery', 'Marksmanship', 'Horsemanship', 'Hidden Weapon', '[Triple-shot]', '[Trick-shot]'],
            'Jianghu': ['Rules', 'Code', 'Connections', '[Vigilantism]'],
            'Methods': ['Deception', 'Poison', 'Intimidate', 'Rumors', '[Seduction]', '[Silver Tongue]']
        }
    };

    var new_traits = {
        'Bodyguard':
            ['[First-Aid]', '[Threats]', '[Unarmed]', '[Heavy-Load]', '[Delay]', '[Endure]', '[Fearless]', '[Cautious]', '[Pressure Points]'],
        'Sailor':
            ['[Dive]', '[Swim]', '[Helms]', '[Sails]', '[Raft]', '[Float]', '[Navigation]', '[Hardy]', '[Shallows]', '[Drink]'],
        'Wanderer':
            ['[Camping]', '[Secretive]', '[Generous]', '[Tough]', '[Guide]', '[Weapon Master]', '[Forthright]', '[Reputation]', '[Connections]', '[Sentimental]', '[Drink]'],
        'Buddhism':
            ['[Kind]', '[Devout]', '[Tolerant]', '[Reform]', '[Insight]', '[Enlightenment]', '[Persistent]', '[Scripture]'],
        'Herdsman':
            ['[Plains]', '[Scout]', '[Horse-taming]', '[Horsemanship]', '[Wrestle]', '[Sturdy]', '[Husbandry]', '[Sandstorm]', '[Vocal Tricks]'],
        'Detective':
            ['[Perceptive]', '[Keen]', '[Learned]', '[Handy]', '[Eloquent]', '[Imitation]', '[Fearless]', '[Patient]', '[Determined]'],
        'Merchant':
            ['[Generous]', '[Wise]', '[Wealth]', '[Connections]', '[Reputation]', '[Influential Clans]', '[Favors]', '[Deal]', '[Patient]', '[Audacious]', '[Meticulous]', '[Cunning]'],
        'Prodigy':
            ['[Photographic Memory]', '[Focused]', '[Calculator]', '[Strategy]', '[Unorthodox]', '[Unscrupulous]', '[Learned]', '[Speechcraft]', '[Miracle Worker]', '[Geomancy]'],
        'Military':
            ['[Command]', '[Horsemanship]', '[Methods of War]', '[Strategy]', '[Authority]', '[Loyalty]', '[Formations]', '[Negotiation]', '[Ceremony]', '[Military Law]', '[Merciless]'],
        'Assassin':
            ['[Cruel]', '[Endure]', '[Persistent]', '[Hidden Weapons]', '[Weapon Master]', '[Improvise]', '[Lightfoot]', '[Song and Dance]', '[Seduction]', '[Poison]', '[Hidden]', '[Deception]']
    };

    var new_keys = {
        'Key of the Traveler': 'Turn this key when you share an interesting detail about a person, place, or thing. BUYOFF: Pass up the opportunity to see something new.',
        'Key of the Negotiator': 'Turn this key when you bargain or exchange a favor. BUYOFF: Cut yourself off from your network of contacts.',
        'Key of the Vow': 'Turn this key when your vow significantly impacts your decisions. BUYOFF: Break your vow.'
    };

    var new_secrets = {
        'Secret of Experience': 'Once per session, you can use tags from more than one trait when you make a roll. REQUIRES: Experience in a wide variety of challenges.'
    };

    // when client connects
    io.on('connection', function(socket) {

        // socket receive

        socket.on("join room", function(room) {

            var room = helper.sanitize(room, 'alphanumeric');
            if (room == '' || room.length > 20) {
                room = defaultroom;
            }

            if (socket.room) { // if already in a room
                // leave that room first
                socket.leave(socket.room);
                console.log('user left room ' + socket.room);
            }

            if (!users[room]) {
                users[room] = [];
            }
            var name = helper.checkUserName('', users[room]); // get a username

            socket.username = name;
            socket.room = room;
            socket.join(room);
            users[room].push(name);
            console.log('user ' + name + ' joined room ' + room);
            socket.emit('username', socket.username); // send back the valid username

            // prepare filenames for save files

            if (!datafiles[room]) {
                datafiles[room] = __dirname + datapath + 'data_' + gamehandle + '_' + room + '.json';
            }

            // initialize local game room data

            if (!gamedata[room]) {
                gamedata[room] = {};
            }

            initGameData(room);

            // misc local data not for saving

            if (!locked[room]) {
                locked[room] = [];
            }

            readJSONtoGame(datafiles[room], room);
        });

        connections.push(socket);
        console.log('%s sockets connected', connections.length);

        socket.on('disconnect', function(data) {
            var room = socket.room;
            if (!room) {
                room = defaultroom; // default room
            }

            if (users[room]) {
                users[room].splice(users[room].indexOf(socket.username), 1);
            }
            connections.splice(connections.indexOf(socket), 1);
            console.log('disconnected: ' + socket.username);
            console.log('%s sockets connected', connections.length);
            sendUsers(room);
        });

        socket.on('chat message', function(data) {
            var type = 'chat';
            var output = '';
            var room = socket.room;
            var s = io.to(room);
            var message = data.trim();
            //console.log('message ' + message);
            // only deal with non-empty data
            if (message) {
                // user wants to change username
                if (message.match(/^\/n\s([\w\d]*)$/)) {
                    var matches = message.match(/n\s([\w\d]*)$/);
                    var oldname = socket.username;
                    var newname = helper.sanitize(matches[1], 'alphanumeric');
                    if (newname) { // if name is not empty after sanitization
                        socket.username = newname;
                        output = oldname + '|' + newname;
                        // update user's name on server
                        var i = users[room].indexOf(oldname);
                        if (i !== -1) {
                            users[room][i] = newname;
                        }
                    } else { // no change on an empty update
                        output = oldname + '|' + oldname;
                    }
                    type = 'updateusername';
                    updateUserName();
                    sendUsers(room);
                }
                else if (message.match(/^\/save$/)) {
                    type = "savegame";
                    output = GametoJSON(room);
                    helper.writeJSONFile(datafiles[room], output); // save to a JSON file

                    s = socket; // only send to sender
                }
                else if (message.match(/^\/load$/)) {
                    type = "loadgame";
                    s = socket;
                }
                else if (message.match(/^\/newgame$/)) {
                    type = "newgame";
                    newGame(room);
                }
                else {
                    // assume input is dice command, otherwise return original input
                    output = helper.diceRoller(message);
                    // if chat message was a dice command
                    if (output.match(/^<span title=/i)) {
                        type = "rollresult";
                    }
                }
            }
            s.emit('chat message', {'message': output, 'user': socket.username, 'type': type});
        });

        socket.on('roll dice', function(data) {
            let room = socket.room;
            let index = data.index;
            let command = data.command;
            let dice = data.dice;
            let result = helper.diceRoller(command);
            let name = gamedata[room]['profiles'][index]['character'];
            if (!name) {
                name = gamedata[room]['profiles'][index]['role'];
            }
            io.to(room).emit('roll result', {'character': name, 'dice': dice, 'result': result});
        });

        socket.on('update condition', function(data) {
            var room = socket.room;
            var condition = data.condition;
            var index = data.index;
            var state = data.state;
            var conditions = gamedata[room]['profiles'][index]['conditions'];

            var i = conditions.indexOf(condition);
            if (!state && i !== -1) { // is not checked but in the list
                // remove it
                conditions.splice(i, 1);
            }
            else if (state && i == -1) { // is checked but not in the list
                // add it
                conditions.push(condition);
            }

            gamedata[room]['profiles'][index]['conditions'] = conditions;
            // send to everyone else but sender
            socket.broadcast.to(room).emit('update field', {'field': condition, 'number': (index+1), 'value': state});
        });

        socket.on('update field', function(data) {
            var room = socket.room;
            var field = data.field;
            var index = data.index;
            var value = data.value;
            var p = gamedata[room]['profiles'][index];

            p[field] = value;
            if (field == 'role') {
                // update name, traits, keys, and secrets
                if (value == 'thecharge') {
                    p['character'] = "Liang, Xin";
                    p['traits'] = initial_traits[value];
                    p['keys'] = {}; // remove existing
                    p['keys']['Key of the Righteous'] = infotext['Key of the Righteous'];
                    p['keys']['Key of Dignity'] = infotext['Key of Dignity'];
                    p['keys']['Key of the Loner'] = infotext['Key of the Loner'];
                    p['secrets'] = {}; // remove existing
                    p['secrets']['Secret of the Miracle Worker'] = infotext['Secret of the Miracle Worker'];
                    p['secrets']['Secret of the Genius'] = infotext['Secret of the Genius'];
                }
                else if (value == 'theconstable') {
                    p['character'] = "Zheng, Dao";
                    p['traits'] = initial_traits[value];
                    p['keys'] = {}; // remove existing
                    p['keys']['Key of the Lawful'] = infotext['Key of the Lawful'];
                    p['keys']['Key of Mercy'] = infotext['Key of Mercy'];
                    p['keys']['Key of the Overthinker'] = infotext['Key of the Overthinker'];
                    p['secrets'] = {}; // remove existing
                    p['secrets']['Secret of Trust'] = infotext['Secret of Trust'];
                    p['secrets']['Secret of Capture'] = infotext['Secret of Capture'];
                }
                else if (value == 'theentrusted') {
                    p['character'] = "Sheng, Yu";
                    p['traits'] = initial_traits[value];
                    p['keys'] = {}; // remove existing
                    p['keys']['Key of the Mission'] = infotext['Key of the Mission'];
                    p['keys']['Key of Curiosity'] = infotext['Key of Curiosity'];
                    p['keys']['Key of the Romantic'] = infotext['Key of the Romantic'];
                    p['secrets'] = {}; // remove existing
                    p['secrets']['Secret of Shock and Awe'] = infotext['Secret of Shock and Awe'];
                    p['secrets']['Secret of Leadership'] = infotext['Secret of Leadership'];
                }
                else if (value == 'themercenary') {
                    p['character'] = "Cheng, Gong";
                    p['traits'] = initial_traits[value];
                    p['keys'] = {}; // remove existing
                    p['keys']['Key of the Mission'] = infotext['Key of the Mission'];
                    p['keys']['Key of the Warrior'] = infotext['Key of the Warrior'];
                    p['keys']['Key of Hidden Longing'] = infotext['Key of Hidden Longing'];
                    p['secrets'] = {}; // remove existing
                    p['secrets']['Secret of Deception'] = infotext['Secret of Deception'];
                    p['secrets']['Secret of Faking Death'] = infotext['Secret of Faking Death'];
                }

                gamedata[room]['profiles'][index] = p;
                updateClients(room); // force update everything
            }
            else {
                gamedata[room]['profiles'][index] = p;
                io.to(room).emit('update field', {'field': field, 'number': (index+1), 'value': value});
            }
        });

        socket.on('update dicepool', function(data) {
            let room = socket.room;
            let field = data.field;
            let index = data.index;
            let value = data.value;
            if (value == "max") {
                gamedata[room]['profiles'][index][field] = gamedata[room]['profiles'][index]['dicepoolmax'];
            }
            else {
                gamedata[room]['profiles'][index][field] = value;
            }
            updateClients(room);
        });
        socket.on('increase dicepoolmax', function(index) {
            let room = socket.room;
            // costs 5 XP
            if (gamedata[room]['profiles'][index]['xp'] > 4) {
                gamedata[room]['profiles'][index]['dicepoolmax'] += 1;
                gamedata[room]['profiles'][index]['xp'] -= 5;
                updateClients(room);
            }
        });

        socket.on('buy tag', function(data) {
            var room = socket.room;
            var tag = data.tag;
            var trait = data.trait;
            var index = data.index;
            var p = gamedata[room]['profiles'][index];

            var tags = p['traits'][trait];
            for (var i = 0; i < tags.length; i++) {
                if (tags[i] == tag && p['xp'] > 2) {
                    tag = tag.substring(1); // remove beginning bracket
                    tags[i] = tag.substring(0, tag.length - 1); // remove end bracket
                    // take 3 XP
                    p['xp'] -= 3;
                    socket.emit('update traits', {'number': (index+1), 'traits': p['traits']});
                }
            }

            gamedata[room]['profiles'][index] = p;
            updateClients(room);
        });

        socket.on('buy trait', function(data) {
            var room = socket.room;
            var trait = data.trait;
            var index = data.index;
            var p = gamedata[room]['profiles'][index];

            if (new_traits[trait] && !p['traits'][trait] && p['xp'] > 4) {
                p['traits'][trait] = new_traits[trait];
                // take 5 XP
                p['xp'] -= 5;
                socket.emit('update traits', {'number': (index+1), 'traits': p['traits']});
            }

            gamedata[room]['profiles'][index] = p;
            updateClients(room);
        });

        socket.on('buy key', function(data) {
            var room = socket.room;
            var key = data.key;
            var index = data.index;
            var p = gamedata[room]['profiles'][index];

            if (new_keys[key] && !p['keys'][key] && p['xp'] > 4) {
                p['keys'][key] = new_keys[key];
                // take 5 XP
                p['xp'] -= 5;
                socket.emit('update keys', {'number': (index+1), 'keys': p['keys']});
            }

            gamedata[room]['profiles'][index] = p;
            updateClients(room);
        });

        socket.on('buyoff key', function(data) {
            var room = socket.room;
            var key = data.key;
            var index = data.index;
            var p = gamedata[room]['profiles'][index];

            if (p['keys'][key]) {
                // delete key
                delete p['keys'][key];
                // reward 5 XP
                p['xp'] += 5;
                socket.emit('update keys', {'number': (index+1), 'keys': p['keys']});
            }

            gamedata[room]['profiles'][index] = p;
            updateClients(room);
        });

        socket.on('buy secret', function(data) {
            var room = socket.room;
            var secret = data.secret;
            var index = data.index;
            var p = gamedata[room]['profiles'][index];

            if (new_secrets[secret] && !p['secrets'][secret] && p['xp'] > 4) {
                p['secrets'][secret] = new_secrets[secret];
                // take 5 XP
                p['xp'] -= 5;
                socket.emit('update secrets', {'number': (index+1), 'secrets': p['secrets']});
            }

            gamedata[room]['profiles'][index] = p;
            updateClients(room);
        });

        socket.on('save', function() {
            // save to a JSON file
            helper.writeJSONFile(datafiles[socket.room], GametoJSON(socket.room));
        });

        socket.on('save game', function() {
            socket.emit('save game', GametoJSON(socket.room));
        });

        socket.on('update image', function(data) {
            let room = socket.room;
            let field = data.field;
            let url = data.url;
            gamedata[room][field] = url;
            // send to everyone else but sender
            socket.broadcast.to(room).emit('update image', {'field': field, 'url': url});
        });

        socket.on('update portrait', function(data) {
            var room = socket.room;
            gamedata[room]['profiles'][data.index]['portrait'] = data.url;
            io.to(room).emit('update portrait', {'index': data.index, 'url': data.url});
        });

        socket.on('load json', function(data) {
            var room = socket.room;
            // parse JSON data, make sure it's valid
            if (helper.isJSON(data)) {
                JSONtoGame(JSON.parse(data), room);
                console.log('JSON accepted');
                updateClients(room);
            }
            else {
                console.log('JSON refused');
            }
        });

        socket.on('togglelock profile', function(data) {
            var room = socket.room;
            var id = data.profileid;
            var lockit = data.lockit;

            var i = locked[room].indexOf(id);

            if (lockit && i == -1) {
                locked[room].push(id); // add to lock list if not there
            }
            else if (!lockit && i !== -1) {
                locked[room].splice(i, 1); // remove from lock list if there
            }
            // send to everyone else but sender
            socket.broadcast.to(room).emit('togglelock profile', {'profileid': id, 'lockit': lockit});
        });

        socket.on('sketchpad', function(data) {
            var room = socket.room;
            socket.broadcast.to(room).emit('sketchpad', data);
        });

        socket.on('x-card', function(data) {
            var room = socket.room;
            io.to(room).emit('x-card', data);
        });

        socket.on('handgesture', function(data) {
            var room = socket.room;
            var user = socket.username;
            io.to(room).emit('handgesture', {'type': data, 'user': user});
        });

        // socket send

        function updateClients(room) {
            var data = gamedata[room];
            if (data) {
                io.to(room).emit('update client', {'users': users[room], 'info': data});
            }
            sendLockedProfiles(room);
        }

        function updateUserName() {
            socket.emit('username', socket.username);
        }
        function sendUsers(room) {
            io.to(room).emit('user list', users[room]);
        }

        function sendLockedProfiles(room) {
            io.to(room).emit('locked profiles', locked[room]);
        }

        function initGameData(room) {
            gamedata[room]['profiles'] = [
                {
                    'role': null,
                    'portrait': null,
                    'player': null,
                    'character': null,
                    'notes': null,
                    'traits': {},
                    'keys': {},
                    'secrets': {},
                    'dicepool': 7,
                    'dicepoolmax': 7,
                    'xp': 0,
                    'conditions': []
                },

                {
                    'role': null,
                    'portrait': null,
                    'player': null,
                    'character': null,
                    'notes': null,
                    'traits': {},
                    'keys': {},
                    'secrets': {},
                    'dicepool': 7,
                    'dicepoolmax': 7,
                    'xp': 0,
                    'conditions': []
                },

                {
                    'role': null,
                    'portrait': null,
                    'player': null,
                    'character': null,
                    'notes': null,
                    'traits': {},
                    'keys': {},
                    'secrets': {},
                    'dicepool': 7,
                    'dicepoolmax': 7,
                    'xp': 0,
                    'conditions': []
                },

                {
                    'role': null,
                    'portrait': null,
                    'player': null,
                    'character': null,
                    'notes': null,
                    'traits': {},
                    'keys': {},
                    'secrets': {},
                    'dicepool': 7,
                    'dicepoolmax': 7,
                    'xp': 0,
                    'conditions': []
                }
            ];
        }

        socket.on('new game', function() {
            var room = socket.room;
            newGame(room);
            io.to(room).emit('chat message', {'message': '', 'user': socket.username, 'type': 'newgame'});
        });
        function newGame(room) {
            readJSONtoGame(defaultfile, room);
            locked[room] = []; // clear locked inputs
            sendLockedProfiles(room);
        }

        function readJSONtoGame(filename, room) {
            //console.log('readfile ' + filename);
            fs.access(filename, fs.constants.F_OK, (err) => {
                if (err) { // file doesn't exist
                    filename = defaultfile;
                }
                fs.readFile(filename, 'utf8', function (err, data) {
                    if (err) throw err;
                    // must do it here or function will finish before read finishes
                    JSONtoGame(JSON.parse(data), room);
                    updateClients(room);
                });
            });
        }

        function JSONtoGame(obj, room=defaultroom) {
            if (obj && obj[gamehandle]) {
                gamedata[room] = obj[gamehandle];
            }
        }

        function GametoJSON(room=defaultroom) {
            var gameJSON = {};
            if (gamedata[room]) {
                gameJSON[gamehandle] = gamedata[room];
                gameJSON = JSON.stringify(gameJSON, null, "\t");
            }
            return gameJSON;
        }

    });

};
