import React, { useEffect, useRef } from 'react';

const Video = (props) => {
    const ref = useRef();

    useEffect(() => {
        if (props.peer && props.peer.peer) {
            const handleStream = stream => {
                ref.current.srcObject = stream;
            };
            props.peer.peer.on("stream", handleStream);

            // Cleanup on unmount
            return () => {
                props.peer.peer.off("stream", handleStream);
            };
        }
    }, [props.peer]);

    return (
        <video playsInline autoPlay ref={ref} />
    );
}

export default Video;