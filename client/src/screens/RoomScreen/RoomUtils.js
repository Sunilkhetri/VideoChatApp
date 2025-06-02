import Peer from "simple-peer";

export const addPeer = (incomingSignal, callerId, stream, socket) => {
  const peer = new Peer({
    initiator: false,
    trickle: false,
    stream // must be a MediaStream, not a ref
  });

  peer.on("signal", signal => {
    socket.emit("returningSignal", { signal, callerId });
  });
  peer.signal(incomingSignal);
  return peer;
};

export const startWebCamVideo = async (peers, userVideo, webcamStream, screenCaptureStream) => {
  const newWebcamStream = await getWebcamStream();
  const videoStreamTrack = newWebcamStream.getVideoTracks()[0];
  const audioStreamTrack = newWebcamStream.getAudioTracks()[0];
  peers.forEach(peer => {
    peer.peer.replaceTrack(
      peer.peer.streams[0].getVideoTracks()[0],
      videoStreamTrack,
      peer.peer.streams[0]
    );
    peer.peer.replaceTrack(
      peer.peer.streams[0].getAudioTracks()[0],
      audioStreamTrack,
      peer.peer.streams[0]
    );
  });
  userVideo.srcObject = newWebcamStream;
  webcamStream = newWebcamStream;
  screenCaptureStream = null;
};

export const shareScreen = async (peers, screenCaptureStream, webcamStream, currentPeers, userVideo, setIsAudioMuted, setIsVideoMuted) => {
  screenCaptureStream.current = await navigator.mediaDevices.getDisplayMedia({ cursor: true });
  const screenCaptureVideoStreamTrack = screenCaptureStream.current.getVideoTracks()[0];
  currentPeers.forEach(peer => {
    peer.peer.replaceTrack(
      peer.peer.streams[0].getVideoTracks()[0],
      screenCaptureVideoStreamTrack,
      peer.peer.streams[0]
    );
  });
  const previousWebcamStream = userVideo.srcObject;
  const previousWebcamStreamTracks = previousWebcamStream.getTracks();
  previousWebcamStreamTracks.forEach(function(track) {
    if (track.kind === 'video') track.stop();
  });
  userVideo.srcObject = screenCaptureStream.current;

  screenCaptureStream.current.getVideoTracks()[0].addEventListener('ended', () => {
    startWebCamVideo(peers, userVideo, webcamStream, screenCaptureStream);
    setIsAudioMuted(false);
    setIsVideoMuted(false);
  });
};

export const muteOrUnmuteAudio = (webcamStream, isAudioMuted, setIsAudioMuted) => {
  if (!webcamStream) return;

  if (!isAudioMuted) {
    webcamStream.getAudioTracks()[0].enabled = false;
    setIsAudioMuted(true);
  } else {
    webcamStream.getAudioTracks()[0].enabled = true;
    setIsAudioMuted(false);
  }
};

export const playOrStopVideo = (userVideo, isVideoMuted, setIsVideoMuted) => {
  if (!userVideo) return;

  if (!isVideoMuted) {
    userVideo.getVideoTracks()[0].enabled = false;
    setIsVideoMuted(true);
  } else {
    userVideo.getVideoTracks()[0].enabled = true;
    setIsVideoMuted(false);
  }
};

export const sendMessage = (e, socket, roomId, message) => {
  e.preventDefault();
  if (socket) {
    socket.emit('sendMessage', {
      roomId,
      message: message.value
    });
    message.value = "";
  }
};

export const createPeer = (userIdToSendSignal, mySocketId, stream, socket) => {
  // Build ICE servers array only with defined values
  const iceServers = [];
  if (process.env.REACT_APP_GOOGLE_STUN_SERVER) {
    iceServers.push({ urls: process.env.REACT_APP_GOOGLE_STUN_SERVER });
  }
  if (
    process.env.REACT_APP_TURN_SERVER1_NAME &&
    process.env.REACT_APP_TURN_SERVER1_USERNAME &&
    process.env.REACT_APP_TURN_SERVER1_PASSWORD
  ) {
    iceServers.push({
      urls: process.env.REACT_APP_TURN_SERVER1_NAME.split(','),
      username: process.env.REACT_APP_TURN_SERVER1_USERNAME,
      credential: process.env.REACT_APP_TURN_SERVER1_PASSWORD
    });
  }
  if (
    process.env.REACT_APP_TURN_SERVER2_NAME &&
    process.env.REACT_APP_TURN_SERVER2_USERNAME &&
    process.env.REACT_APP_TURN_SERVER2_PASSWORD
  ) {
    iceServers.push({
      urls: process.env.REACT_APP_TURN_SERVER2_NAME.split(','),
      username: process.env.REACT_APP_TURN_SERVER2_USERNAME,
      credential: process.env.REACT_APP_TURN_SERVER2_PASSWORD
    });
  }

  const peer = new Peer({
    initiator: true,
    trickle: false,
    config: {
      iceServers
    },
    stream // must be a MediaStream, not a ref
  });

  peer.on("signal", signal => {
    socket.emit("sendingSignal", { userIdToSendSignal, callerId: mySocketId, signal });
  });
  return peer;
};

export const getWebcamStream = async () => {
  return await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
};