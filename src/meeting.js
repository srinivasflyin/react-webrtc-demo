// src/Meeting.js

import React, { useEffect, useRef, useState } from 'react';
import { firestore } from './firebaseConfig';  // Make sure you're importing firestore correctly
import { collection, doc, addDoc, onSnapshot, updateDoc } from 'firebase/firestore';  // Modular SDK functions
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
  const [peerConnection, setPeerConnection] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const localVideoRef = useRef(null);
  const remoteVideosContainerRef = useRef(null);

  useEffect(() => {
    startLocalStream();
    listenForRemoteCandidates();
    listenForIncomingOffers();

    return () => {
      if (peerConnection) peerConnection.close();
      localStream?.getTracks().forEach((track) => track.stop());
    };
  }, [meetingId]);

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

  const startPeerConnection = async (remoteId) => {
    const pc = new RTCPeerConnection(servers);

    // Add local stream tracks to the peer connection
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

  const listenForRemoteCandidates = () => {
    const callDocRef = doc(firestore, 'calls', meetingId);
    const answerCandidatesRef = collection(callDocRef, 'answerCandidates');
    
    // Listen for changes to answer candidates
    onSnapshot(answerCandidatesRef, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const candidate = new RTCIceCandidate(change.doc.data());
          peerConnection.addIceCandidate(candidate);
        }
      });
    });
  };

  const listenForIncomingOffers = () => {
    const callDocRef = doc(firestore, 'calls', meetingId);

    onSnapshot(callDocRef, async (snapshot) => {
      const data = snapshot.data();
      if (data?.offer && !peerConnection) {
        const remoteId = 'remote-peer-id'; // Replace with real participant ID
        const pc = await startPeerConnection(remoteId);
        setPeerConnection(pc);

        const offerDescription = new RTCSessionDescription(data.offer);
        await pc.setRemoteDescription(offerDescription);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        // Update the call document with the answer
        await updateDoc(callDocRef, {
          answer: {
            sdp: answer.sdp,
            type: answer.type,
          },
        });
      }
    });
  };

  const hangup = () => {
    localStream.getTracks().forEach((track) => track.stop());
    peerConnection?.close();
    setPeerConnection(null);
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
