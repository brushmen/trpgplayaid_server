
module.exports = function(app, socketio, helper) {
    console.log('module "Lady Blackbird" running...');

    var gamehandle = 'ladyblackbird';
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

    // shared infotext

    var infotext = {
        'Key of the Paragon': "As a noble, you're a cut above the common man. Hit your key when you demonstrate your superiority or when your noble traits overcome a problem. BUYOFF: Disown your noble heritage.",
        'Key of the Mission': "You must escape the Empire and rendezvous with your once secret lover, the Pirate King Uriah Flint, whom you haven't seen in six years. Hit your key when you take action to complete the mission. BUYOFF: Give up on your mission.",
        'Key of the Impostor': "You are in disguise, passing yourself off as commoner. Hit your key when you perform well enough to fool someone with your disguise. BUYOFF: Reveal your true identity to someone you fooled.",
        'Secret of Stormblood': "As long as you can speak, you can channel magical power and do Sorcery. You have the Master Sorcerer trait and the Stormblood tag.",
        'Secret of Inner Focus': "Once per session, you can re-roll a failure when doing Sorcery.",

        'Key of the Guardian': "You are Lady Blackbird's loyal defender. Hit your key when you make a decision influenced by Lady Blackbird or protect her from harm. BUYOFF: Sever your relationship with the Lady.",
        'Key of Vengeance': "The Empire enslaved you and made you kill for sport. You will have your revenge on them and watch their cities burn. Hit your key when you strike a blow against the Empire (especially by killing an Imperial). BUYOFF: Forgive them for what they did to you.",
        'Key of the Warrior': "You crave the crash and roar of battle, the tougher the better. Hit your key when you do battle with worthy or superior foes. BUYOFF: Pass up an opportunity for a good fight.",
        'Secret of Destruction': "You can break things with your bare hands as if you were swinging a sledgehammer. It's scary.",
        'Secret of the Bodyguard': "Once per session, you can re-roll a failure when protecting someone.",

        'Key of the Commander': "You are accustomed to giving orders and having them obeyed. Hit your trait when you come up with a plan and give orders to make it happen. BUYOFF: Acknowledge someone else as the leader.",
        'Key of Hidden Longing': "You are completely enthralled by Lady Blackbird, but you don't want her to know it. Hit your key when you make a decision based on this secret affection or when you somehow show it indirectly. BUYOFF: Give up on your secret desire or make it public.",
        'Key of the Outcast': "You got exiled from the Empire. Hit your key when your outcast status causes you trouble or is important in a scene. BUYOFF: Regain your former standing or join a new group.",
        'Secret of Leadership': "Once per session, you can give someone else a chance to re-roll a failed roll, by giving them orders, advice, or setting a good example.",
        'Secret of Warpblood': "Once per session, you can teleport yourself or someone you're touching.",

        'Key of Greed': "You like the shiny things. Hit your key when you steal something cool or score a big payoff. BUYOFF: Swear off stealing forever.",
        'Key of the Job': "You must safely deliver Lady Blackbird to the Pirate King Uriah Flint, so she can marry him. Hit your key when you take action to complete the mission. BUYOFF: Give up the mission.",
        'Key of Fraternity': "You are sworn to Captain Vance in a bond of brotherhood. Hit your key when your character is influenced by Vance or when you show how deep your bond is. BUYOFF: Sever the relationship",
        'Secret of Concealment': "No matter how thoroughly you're searched, you always have a few key items with you. You can produce any common, simple item at a moment's notice.",
        'Secret of Reflexes': "Once per session, you can re-roll a failure when doing anything involving grace, dexterity, or quick reflexes.",

        'Key of the Daredevil': "You thrive in dangerous situations. Hit your key when you do something cool that is risky or reckless (especially piloting stunts). BUYOFF: Be very very careful.",
        'Key of Conscience': "You don't like to see anyone suffer, even enemies. Hit your key when you help someone who is in trouble or when you change someone's life for the better BUYOFF: Ignore a request for help.",
        'Key of Banter': "You have a knack for snappy comments. Hit your key when Snargle says something that makes the other players laugh or when you explain something using your pilot techno jargon. BUYOFF: Everyone groans at one of your comments.",
        'Secret of Shape Warping': "As a goblin, you can change your shape, growing shorter, taller, fatter, thinner, or changing your skin color, at will.",
        'Secret of the Lucky Break': "Once per session, you can keep your pool dice when you succeed (so go ahead and use ‘em all)."
    };

    var initial_traits = {
        'noble': {
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
        },
        'bodyguard': {
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
        },
        'outcast': {
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
        },
        'mechanic': {
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
        },
        'pilot': {
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
        }
    };

    var new_traits = {
        "Reputation":
            ["[Trustworthy]", "[Reliable]", "[Fearless]", "[Reckless]", "[Ruthless]", "[Underhanded]", "[Dangerous]", "[Deadly]", "[Cruel]", "[Unpredictable]", "[Heroic]", "[Honorable]", "[Compassionate]"],
        "Crew":
            ["[Gunnery]", "[Aim]", "[Maintenance]", "[Damage Control]", "[Observation]", "[Signals]", "[The Owl]", "[Cargo]", "[Supplies]", "[First Aid]", "[Boarding Action]"],
        "Explorer":
            ["[Curious]", "[Aware]", "[Nimble]", "[Hardy]", "[Ancient Lore]", "[Languages]", "[Ruins]", "[Monsters]", "[Myths]", "[Maps]"],
        "Investigator":
            ["[Search]", "[Deduction]", "[Perceptive]", "[Seduce]", "[Interrogate]", "[Bribe]", "[Coerce]", "[Contacts]", "[Sneak]", "[Deception]", "[Insight]", "[Logic]", "[Fisticuffs]", "[Pistol]"],
        "Miner":
            ["[Tunnels]", "[Labor]", "[Strong]", "[Pickaxe]", "[Dim Light]", "[Hold Breath]", "[Ores]", "[Resist Cold]", "[Endure]"],
        "Bold":
            ["[Brave]", "[Daring]", "[Heroic]", "[Rescue]", "[Falling]", "[Fire]", "[Reckless]", "[Explosions]", "[Escapes]", "[Outnumbered]", "[Underdog]"],
        "Sky Pirate":
            ["[Vicious]", "[Hack & Slash]", "[Cutlass]", "[Knife]", "[Shooting]", "[Boomstick]", "[Gunner]", "[Boarding Action]", "[Crew]", "[Loot]", "[Capture]", "[Drink]", "[Hardy]", "[Treacherous]", "[Intimidating]", "[Contacts]", "[Underworld]"],
        "Ghostblood":
            ["[Fly]", "[Possess]", "[Insubstantial]", "[Control Technology]", "[Electrical]", "[Dominate]", "[Terrify]", "[Sneak]", "[Overload]"],
        "Stoneblood":
            ["[Harden]", "[Make Heavy]", "[Meld Into Stone]", "[Petrify]", "[Immovable]", "[Mauler]", "[Move Through Stone]", "[Shape Rock]", "[Tough]"],
        "Voidblood":
            ["[Invisibility]", "[Vacuum]", "[Make Weightless]", "[Pass Through]", "[Erase Mind]", "[Counterspell]", "[Disintegrate]"],
        "Dreamblood":
            ["[Sedate]", "[Manipulate Dream]", "[Enter Dream]", "[Hallucination]", "[Blind Fighting]", "[Read Mind]"],
        "Bloodhunter":
            ["[Gather Information]", "[Interrogate]", "[Intimidate]", "[Incognito]", "[Recognize Blood]", "[Reflexes]", "[Authority]", "[Firefights]"]
    };

    var new_keys = {
        "The Key of the Traveler":
            "You love exploring new places. Turn this key when you share an interesting detail about things you’ve seen or when you go somewhere exciting. BUYOFF: Pass up the opportunity to see something new.",
        "The Key of the Broker":
            "You like to make deals and trade favors. Turn this key when you bargain, make a new contact, or exchange a favor. BUYOFF: Cut yourself off from your network of contacts.",
        "The Key of the Tinkerer":
            "You just can’t leave it alone. Turn this key when you modify, improve, repair, or patch some tech. BUYOFF: Pass up the opportunity to mess around with technology.",
        "The Key of the Pirate":
            "You pillage, raid, and terrorize the Wild Blue. Turn this key when you impress someone with your piratical nature or do something to add to your reputation. BUYOFF: Turn over a new leaf and go straight.",
        "The Key of the Vow":
            "You have a vow of personal behavior that you have sworn not to break. Turn this key when your vow significantly impacts your decisions. BUYOFF: Break your vow."
    };

    var new_secrets = {
        "The Secret of the True Course":
            "You know how to navigate the Remnants. REQUIRES: You need to learn the navigation codes from someone who has the secret.",
        "The Secret of the Explorer":
            "You’ve been all over the Blue, seen a lot of strange things. Once per refresh, you can re-roll a failure when you’re dealing with local customs or strange places. REQUIRES: You’ve traveled from one side of the Blue to the other.",
        "The Secret of the Sky Song":
            "You know how to call sky squid and can attempt to communicate with them when they appear. REQUIRES: You’ve trained with a master of the Sky Song or have been dream-linked to a sky squid.",
        "The Secret of the Shootist":
            "You’re deadly with a firearm (or two). Once per refresh, you can re-roll a failure when you’re shooting. REQUIRES: You’ve been in a lot of gunfights or are learning from someone who has.",
        "The Secret of Experience":
            "Once per refresh, you can use tags from more than one trait when you make a roll. REQUIRES: Experience in a wide variety of dangerous situations."
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
            let room = socket.room;
            let condition = data.condition;
            let index = data.index;
            let state = data.state;
            let number;
            let conditions;

            if (index != null) {
                conditions = gamedata[room]['profiles'][index]['conditions'];
            }
            else {
                conditions = gamedata[room]['owl']['conditions'];
            }

            let i = conditions.indexOf(condition);
            if (!state && i !== -1) { // is not checked but in the list
                // remove it
                conditions.splice(i, 1);
            }
            else if (state && i == -1) { // is checked but not in the list
                // add it
                conditions.push(condition);
            }

            if (index != null) {
                gamedata[room]['profiles'][index]['conditions'] = conditions;
                number = index + 1;
            }
            else {
                gamedata[room]['owl']['conditions'] = conditions;
                number = null;
            }
            // send to everyone else but sender
            socket.broadcast.to(room).emit('update field', {'field': condition, 'number': number, 'value': state});
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
                if (value == 'noble') {
                    p['character'] = "Natasha Syri";
                    p['traits'] = initial_traits[value];
                    p['keys'] = {}; // reset existing
                    p['keys']['Key of the Paragon'] = infotext['Key of the Paragon'];
                    p['keys']['Key of the Impostor'] = infotext['Key of the Impostor'];
                    p['keys']['Key of the Mission'] = infotext['Key of the Mission'];
                    p['secrets'] = {}; // reset existing
                    p['secrets']['Secret of Stormblood'] = infotext['Secret of Stormblood'];
                    p['secrets']['Secret of Inner Focus'] = infotext['Secret of Inner Focus'];
                }
                else if (value == 'bodyguard') {
                    p['character'] = "Naomi Bishop";
                    p['traits'] = initial_traits[value];
                    p['keys'] = {}; // reset existing
                    p['keys']['Key of the Guardian'] = infotext['Key of the Guardian'];
                    p['keys']['Key of Vengeance'] = infotext['Key of Vengeance'];
                    p['keys']['Key of the Warrior'] = infotext['Key of the Warrior'];
                    p['secrets'] = {}; // reset existing
                    p['secrets']['Secret of Destruction'] = infotext['Secret of Destruction'];
                    p['secrets']['Secret of the Bodyguard'] = infotext['Secret of the Bodyguard'];
                }
                else if (value == 'outcast') {
                    p['character'] = "Cyrus Vance";
                    p['traits'] = initial_traits[value];
                    p['keys'] = {}; // reset existing
                    p['keys']['Key of the Commander'] = infotext['Key of the Commander'];
                    p['keys']['Key of Hidden Longing'] = infotext['Key of Hidden Longing'];
                    p['keys']['Key of the Outcast'] = infotext['Key of the Outcast'];
                    p['secrets'] = {}; // reset existing
                    p['secrets']['Secret of Leadership'] = infotext['Secret of Leadership'];
                    p['secrets']['Secret of Warpblood'] = infotext['Secret of Warpblood'];
                }
                else if (value == 'mechanic') {
                    p['character'] = "Kale Arkam";
                    p['traits'] = initial_traits[value];
                    p['keys'] = {}; // reset existing
                    p['keys']['Key of the Job'] = infotext['Key of the Job'];
                    p['keys']['Key of Greed'] = infotext['Key of Greed'];
                    p['keys']['Key of Fraternity'] = infotext['Key of Fraternity'];
                    p['secrets'] = {}; // reset existing
                    p['secrets']['Secret of Concealment'] = infotext['Secret of Concealment'];
                    p['secrets']['Secret of Reflexes'] = infotext['Secret of Reflexes'];
                }
                else if (value == 'pilot') {
                    p['character'] = "Snargle";
                    p['traits'] = initial_traits[value];
                    p['keys'] = {}; // reset existing
                    p['keys']['Key of the Daredevil'] = infotext['Key of the Daredevil'];
                    p['keys']['Key of Conscience'] = infotext['Key of Conscience'];
                    p['keys']['Key of Banter'] = infotext['Key of Banter'];
                    p['secrets'] = {}; // reset existing
                    p['secrets']['Secret of Shape Warping'] = infotext['Secret of Shape Warping'];
                    p['secrets']['Secret of the Lucky Break'] = infotext['Secret of the Lucky Break'];
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
        }

        function updateUserName() {
            socket.emit('username', socket.username);
        }
        function sendUsers(room) {
            io.to(room).emit('user list', users[room]);
        }

        function initGameData(room) {
            gamedata[room]['currentimage'] = "https://raw.githubusercontent.com/brushmen/trpgplayaid_server/master/public/images/ladyblackbird_owlsquidsorrow.jpg",
            gamedata[room]['currentmap'] = "https://raw.githubusercontent.com/brushmen/trpgplayaid_server/master/public/images/ladyblackbird_wildblue.jpg",
            gamedata[room]['owl'] = {};
            gamedata[room]['owl']['conditions'] = ["needFuel"];
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
