import React, { useEffect, useRef, useState, createRef } from "react";
import { useHistory } from "react-router-dom";
import M from "materialize-css";

import Video from '../../components/Video';
import useAuthenticated from "../../hooks/useAuthentication";
import "./RoomScreen.css";
import RoomService from "./RoomService";
import { muteOrUnmuteAudio, playOrStopVideo, sendMessage, shareScreen } from "./RoomUtils";

const RoomScreen = (props) => {
    const isAuthenticated = useAuthenticated();
    const [peers, setPeers] = useState([]);
    const socketRef = useRef();
    const userVideoRef = useRef();
    const messageRef = createRef();
    const peersRef = useRef([]);
    const screenCaptureStream = useRef();
    const roomId = props.match.params.roomId;
    const [isVideoMuted, setIsVideoMuted] = useState(false);
    const [isAudioMuted, setIsAudioMuted] = useState(false);
    const [webcamStream, setWebCamStream] = useState(null);
    const [messages, setMessages] = useState([]);
    const history = useHistory();
    const currentPeers = useRef([]);

    useEffect(() => {
        if (!isAuthenticated) {
            M.toast({ html: 'Login first', classes: 'red' });
            props.history.push('/login');
        }
        //eslint-disable-next-line
    }, [isAuthenticated]);

    useEffect(() => {
        RoomService.connectToSocketAndWebcamStream(localStorage.getItem('Token'))
            .then(({ socket, webcamStream }) => {
                socketRef.current = socket;
                setWebCamStream(webcamStream);
                userVideoRef.current.srcObject = webcamStream;
                RoomService.setupSocketListeners(
                    socketRef.current,
                    webcamStream,
                    setPeers,
                    screenCaptureStream,
                    currentPeers,
                    setMessages,
                    roomId
                );
            });

        return async () => {
            if (socketRef.current) socketRef.current.disconnect();
            await stopAllVideoAudioMedia();
        }
        //eslint-disable-next-line
    }, []);

    //Stopping webcam and screen media and audio also
    const stopAllVideoAudioMedia = async () => {
        //destroying previous stream(screen capture stream)
        const previousScreenCaptureStream = screenCaptureStream.current;
        if (previousScreenCaptureStream) {
            const previousScreenCaptureStreamTracks = previousScreenCaptureStream.getTracks();
            previousScreenCaptureStreamTracks.forEach(track => {
                track.stop();
            });
        }

        //destroying previous stream(webcam stream)
        const previousWebcamStream = webcamStream;
        if (previousWebcamStream) {
            const previousWebcamStreamTracks = previousWebcamStream.getTracks();
            previousWebcamStreamTracks.forEach(track => {
                track.stop();
            });
        }
    }

    const handleOnClickAudioToggle = () => {
        muteOrUnmuteAudio(webcamStream, isAudioMuted, setIsAudioMuted);
    }

    const handlePlayOrStopVideo = () => {
        playOrStopVideo(webcamStream, isVideoMuted, setIsVideoMuted);
    }

    const handleShareScreen = async () => {
        await shareScreen(peers, screenCaptureStream, webcamStream, peers, userVideoRef.current, setIsAudioMuted, setIsVideoMuted);
    }

    const handleSendMessage = (e) => {
        sendMessage(e, socketRef.current, roomId, messageRef.current);
    }

    const leaveMeeting = () => {
        history.push('/');
    };

    return (
        <div className="room row">
            <div className="videos col s10 p0">
                <div className="videos__users-video">
                    <div id="video-grid">
                        <video muted ref={userVideoRef} autoPlay playsInline />
                        {console.log('peers', peers)}
                        {peers.map((peer) => (
                            <Video controls key={peer.peerId} peer={peer} />
                        ))}
                    </div>
                </div>

                <div className="videos__controls">
                    <div className="control">
                        <div onClick={handleOnClickAudioToggle} className="control__btn-container">
                            {isAudioMuted
                                ? <i className="unmute fas fa-microphone-slash" />
                                : <i className="fas fa-microphone" />
                            }
                            {isAudioMuted
                                ? <span>Unmute</span>
                                : <span>Mute</span>
                            }
                        </div>
                        <div onClick={handlePlayOrStopVideo} className="control__btn-container">
                            {isVideoMuted
                                ? <i className="stop fas fa-video-slash" />
                                : <i className="fas fa-video" />
                            }
                            {isVideoMuted
                                ? <span>Play Video</span>
                                : <span>Stop Video</span>
                            }
                        </div>
                    </div>
                    <div onClick={handleShareScreen} className="control">
                        <div className="control__btn-container">
                            <i className="fas fa-shield-alt" />
                            <span>Share Screen</span>
                        </div>
                    </div>
                    <div onClick={leaveMeeting} className="control">
                        <div className="control__btn-container">
                            <span className="leave_meeting">Leave Meeting</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="chat col s2 p0">
                <div className="chat__header">
                    <h6>Chat</h6>
                </div>
                <div className="chat__msg-container">
                    <ul className="messages">
                        {messages.map((message, index) => (
                            <p key={index}>{message.name}({message.username}):{message.message}</p>
                        ))}
                    </ul>
                </div>
                <form onSubmit={handleSendMessage} className="chat__msg-send-container">
                    <input ref={messageRef} type="text" placeholder="Type message here..." />
                    <i onClick={handleSendMessage} className="fa fa-paper-plane" />
                </form>
            </div>
        </div>
    );
};

export default RoomScreen;