require('dotenv').config();
const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const User = require('./models/UserModal');

const PORT = 8000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

//For deploy only
// app.use(express.static(path.join('public')));

app.use('/user', require('./routes/user'));

//Database connection
mongoose.connect(process.env.DATABASE);
mongoose.connection.on('error', error => {
    console.err('Mongoose Connection Error: ' + error.message);
})
mongoose.connection.once('open', ()=> {
    console.log('Mongodb connected!');
})

//for deploy only

// app.use((req, res, next) => {
//     res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
// })

server.listen(process.env.PORT || PORT, () => {
    console.log('server is running on port ' + PORT)
});

// --- Only ONE initialization of io, with CORS ---
const io = require("socket.io")(server, {
    cors: {
        origin: "*", // your frontend URL 
        methods: ["GET", "POST"]
    }
});

const usersInRoom = {}; //all user(socket id) connected to a chatroom
const socketToRoom = {}; //roomId in which a socket id is connected

//verifying token
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.query.token;
        const payload = await jwt.verify(token, process.env.SECRET);
        socket.userId = payload;
        const user = await User.findOne({ _id: socket.userId }).select('-password');
        socket.username = user.username;
        socket.name = user.name; 
        next();
    } catch (error) {
        console.log(error);
    }
});

io.on('connection', socket => {
    console.log('Some one joined socketId: ' + socket.id);
    socket.on("joinRoom", roomId=> {
        if (usersInRoom[roomId]) {
            usersInRoom[roomId].push(socket.id);
        } else {
            usersInRoom[roomId] = [socket.id];
        }
        socketToRoom[socket.id] = roomId;
        const usersInThisRoom = usersInRoom[roomId].filter(id => id !== socket.id);
        socket.join(roomId); //for message
        socket.emit("usersInRoom", usersInThisRoom); //sending all socket id already joined user in this room
    });

    socket.on("sendingSignal", payload => {
        console.log('console.log before sending userJoined', payload.callerId);
        io.to(payload.userIdToSendSignal).emit('userJoined', { signal: payload.signal, callerId: payload.callerId });
    });

    socket.on("returningSignal", payload => {
        io.to(payload.callerId).emit('takingReturnedSignal', { signal: payload.signal, id: socket.id });
    });

    socket.on('sendMessage', payload => {
        io.to(payload.roomId).emit('receiveMessage', { message: payload.message, name:socket.name, username: socket.username });
    });

    socket.on('disconnect', () => {
        const roomId = socketToRoom[socket.id];
        let socketsIdConnectedToRoom = usersInRoom[roomId];
        if (socketsIdConnectedToRoom) {
            socketsIdConnectedToRoom = socketsIdConnectedToRoom.filter(id => id !== socket.id);
            usersInRoom[roomId] = socketsIdConnectedToRoom;
        }
        socket.leave(roomId); //for message group(socket)
        if (roomId) {
            socket.to(roomId).emit("userLeft", socket.id); // Only to the room
        }
    });
});