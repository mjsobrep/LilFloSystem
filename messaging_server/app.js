var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var fs = require('fs'); 

var cur_id = 0;

var robots = {};
var clients = {};

app.get('/',function(req,res){
    res.sendFile(__dirname + '/global/html/index.html');
    console.log('request on home');
});

app.get('/*',function(req,res){
    var filename = __dirname + req.path;
    console.log("asked for: "+filename);
    fs.stat(filename, function(err, stat){
        if(err===null){
            res.sendFile(filename);
        }else{
            res.sendFile(__dirname + '/global/html/404.html');
        }
    });
    
});

io.on('connection', function(client){
    client.id = cur_id;
    cur_id ++;

    client.on('info',function(type, name){
        client.type = type;
        client.name = name;
        if(type === 'robot'){
            if(robots.hasOwnProperty(name)){
                client.emit('err','already_logged_in');
                console.log('ERROR: a robot tried to login twice ('+name+')');
            }else{
                robots[name] = client;
                client.broadcast.emit('new_robot',name);
                client.join(name);
                client.room = name;
            }
        }else if(type === 'client'){
            if(clients.hasOwnProperty(name)){
                client.emit('err','already_logged_in');
            }else{
                clients[name] = client;
            }
        }
        console.log('client '+client.id+' is a '+client.type+' named: '+name);
    });

    client.on('join',function(robot){
        ///expect that a clinician is calling this to connect to a robot
        client.join(robot);
        client.room = robot;
        client.emit('joined',robot);
    });

    client.on('message',function(message){
        client.broadcast.to(client.room).emit('message',message);
    })

    client.on('disconnect',function(){
        console.log('client '+client.id+' disconnected');
        //TODO: remove stuff from lists.
    });
});

server.listen(8080);
console.log('listening on 8080');