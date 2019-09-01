# tRPG Playaid Server
server-client interface used for playing tRPG without account registrations

main NodeJS modules used: socket.io, express, path, fs
main JS libraries used: Bootstrap, JQuery, P5

# Demo
https://trpgplayaids-demo.herokuapp.com/

# Do NOT use this demo for actual game session!
It's in a sandbox environment that routinely refreshes and deletes "saved" game state and this will happen at least once during a game session. You will need to change the code to use a dedicated database system, or put the code in an account that will keep dynamically-created files.
