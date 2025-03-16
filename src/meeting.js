// src/Meeting.js

import React, { useEffect, useRef, useState } from 'react';
import { firestore } from './firebaseConfig';  // Ensure firestore is imported correctly
import { collection, doc, onSnapshot, addDoc } from 'firebase/firestore';  // Modular SDK functions
import { useParams, useNavigate } from 'react-router-dom';

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

function Meeting() {
  const navigate = useNavigate();
  const { meetingId } = useParams(); // Get meetingId from the URL using the useParams hook
  const [localStream, setLocalStream] = useState(null);
  const [peerConnections, setPeerConnections] = useState({});  // Store peer connections by participant ID
  const [remoteStreams, setRemoteStreams] = useState({});  // Store remote streams by participant ID
  const localVideoRef = useRef(null);
  const remoteVideosContainerRef = useRef(null);

  useEffect(() => {
    startLocalStream();
    listenForParticipants();

    return () => {
      // Cleanup peer connections and media tracks
      Object.values(peerConnections).forEach((pc) => pc.close());
      localStream?.getTracks().forEach((track) => track.stop());
    };
  }, [meetingId, peerConnections]);

  // Start the local stream
  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing local media devices:', error);
    }
  };

  // Start peer connection with a remote participant
  const startPeerConnection = async (remoteId) => {
    const pc = new RTCPeerConnection(servers);
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    pc.ontrack = (event) => {
      if (!remoteStreams[remoteId]) {
        const remoteVideo = document.createElement('video');
        remoteVideo.srcObject = event.streams[0];
        remoteVideo.autoplay = true;
        remoteVideo.playsinline = true;
        remoteVideosContainerRef.current.appendChild(remoteVideo);
        setRemoteStreams((prev) => ({ ...prev, [remoteId]: remoteVideo }));
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const callDocRef = doc(firestore, 'calls', meetingId);
        const offerCandidatesRef = collection(callDocRef, 'offerCandidates');
        addDoc(offerCandidatesRef, event.candidate.toJSON());
      }
    };

    return pc;
  };

  // Listen for participants joining the meeting and initiate connections
  const listenForParticipants = () => {
    const callDocRef = doc(firestore, 'calls', meetingId);
    const participantsRef = collection(callDocRef, 'participants');

    // Listen for changes to the participants list
    onSnapshot(participantsRef, async (snapshot) => {
      snapshot.docChanges().forEach(async(change) => {
        if (change.type === 'added') {
          const remoteId = change.doc.id;  // Use the participant ID as the remoteId
          if (!peerConnections[remoteId]) {
            const pc = await startPeerConnection(remoteId);
            setPeerConnections((prev) => ({ ...prev, [remoteId]: pc }));
          }
        }
      });
    });
  };

  const hangup = () => {
    localStream.getTracks().forEach((track) => track.stop());
    Object.values(peerConnections).forEach((pc) => pc.close());
    setPeerConnections({});
    setRemoteStreams({});
    navigate('/');
  };

  return (
    <div className="meeting-container">
      <h2>WebRTC Demo - Meeting</h2>
      <div className="video-container">
        <video ref={localVideoRef} autoPlay playsInline className="local-video" />
      </div>
      <div>
        <h3>Remote Streams</h3>
        <div ref={remoteVideosContainerRef} className="remote-videos-container"></div>
      </div>
      <button onClick={hangup} className="hangup-button">End Call</button>
    </div>
  );
}

export default Meeting;
