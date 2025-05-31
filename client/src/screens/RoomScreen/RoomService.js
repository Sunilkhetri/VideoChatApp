import io from "socket.io-client";
import Peer from "simple-peer";
import { addPeer, createPeer } from "./RoomUtils";

const BASE_URL = process.env.REACT_APP_BASE_URL;

const RoomService = {
  connectToSocketAndWebcamStream: async (token) => {
    const socket = io.connect(BASE_URL, {
      query: {
        token: token
      }
    });

    const webcamStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

    return { socket, webcamStream };
  },

  setupSocketListeners: (socket, webcamStream, setPeers, screenCaptureStream, currentPeers, setMessages, roomId) => {
    socket.emit("joinRoom", roomId);

    socket.on("usersInRoom", users => {
      const tempPeers = [];
      console.log('usersInRoom', users, webcamStream);
      users.forEach(otherUserSocketId => {
        // Prevent duplicate peers
        if (!currentPeers.current.find(p => p.peerId === otherUserSocketId)) {
          const peer = createPeer(otherUserSocketId, socket.id, webcamStream, socket);
          currentPeers.current.push({
            peerId: otherUserSocketId,
            peer
          });
          tempPeers.push({
            peerId: otherUserSocketId,
            peer
          });
        }
      });
      setPeers(tempPeers);
    });

    socket.on("userJoined", payload => {
      // Prevent duplicate peers
      if (!currentPeers.current.find(p => p.peerId === payload.callerId)) {
        let peer;
        if (screenCaptureStream.current) {
          peer = addPeer(payload.signal, payload.callerId, screenCaptureStream.current, socket);
        } else {
          peer = addPeer(payload.signal, payload.callerId, webcamStream, socket);
        }
        currentPeers.current.push({
          peerId: payload.callerId,
          peer
        });
        const peerObj = {
          peer,
          peerId: payload.callerId,
        };

        setPeers(users => [...users, peerObj]);
      }
    });

    socket.on("takingReturnedSignal", payload => {
      const item = currentPeers.current.find(p => p.peerId === payload.id);
      if (item) item.peer.signal(payload.signal);
    });

    socket.on('receiveMessage', payload => {
      setMessages(messages => [...messages, payload]);
    });

    socket.on('userLeft', id => {
      const peerObj = currentPeers.current.find(p => p.peerId === id);
      if (peerObj?.peer) peerObj.peer.destroy();
      const peers = currentPeers.current.filter(p => p.peerId !== id);
      currentPeers.current = peers;
      setPeers(peers);
    });

    socket.on('disconnect', () => {
      //destroying previous stream(webcam stream)
      const previousWebcamStream = webcamStream;
      const previousWebcamStreamTracks = previousWebcamStream.getTracks();
      previousWebcamStreamTracks.forEach(track => {
        track.stop();
      });

      //destroying previous stream(screen capture stream)
      const previousScreenCaptureStream = screenCaptureStream.current;
      if (previousScreenCaptureStream) {
        const previousScreenCaptureStreamTracks = previousScreenCaptureStream.getTracks();
        previousScreenCaptureStreamTracks.forEach(track => {
          track.stop();
        });
      }
    });
  },
};

export default RoomService;