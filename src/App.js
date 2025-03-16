// src/App.js

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { firestore } from './firebaseConfig';  // Ensure firestore is imported correctly
import { collection, doc, setDoc } from 'firebase/firestore';  // Modular SDK functions
import './App.css'; // Make sure to import the CSS

function App() {
  const [meetingId, setMeetingId] = useState('');
  const navigate = useNavigate();

  // Generate random meeting ID
  const generateMeetingId = () => {
    return Math.random().toString(36).substr(2, 9);
  };

  const createMeeting = async () => {
    const newMeetingId = generateMeetingId();
    localStorage.setItem('meetingId', newMeetingId);
    alert(`Meeting created with ID: ${newMeetingId}`);

    // Create a new document in Firestore for the meeting
    const callDocRef = doc(firestore, 'calls', newMeetingId); // Use doc() for document reference
    await setDoc(callDocRef, {});  // Create a new empty document in the 'calls' collection

    // Redirect to the meeting page
    navigate(`/meeting/${newMeetingId}`);
  };

  const joinMeeting = () => {
    if (meetingId) {
      localStorage.setItem('meetingId', meetingId);
      navigate(`/meeting/${meetingId}`);
    } else {
      alert('Please enter a valid meeting ID.');
    }
  };

  return (
    <div className="container">
      <h2>WebRTC Demo</h2>

      <h3>1. Create a new Meeting</h3>
      <button className="button" onClick={createMeeting}>Create Meeting</button>

      <h3>2. Join a Meeting</h3>
      <input
        type="text"
        value={meetingId}
        onChange={(e) => setMeetingId(e.target.value)}
        className="input"
        placeholder="Enter Meeting ID"
      />
      <div className="join-button-container">
        <button className="button" onClick={joinMeeting}>Join</button>
      </div>
    </div>
  );
}

export default App;
