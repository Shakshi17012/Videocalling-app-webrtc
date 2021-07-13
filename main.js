import './style.css';
//firebase setup
import firebase from 'firebase/app';
import 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCVQfjQmP40T9SPAXGZSm48lpSmM0ayKfc",
    authDomain: "myapp-ac6bd.firebaseapp.com",
    projectId: "myapp-ac6bd",
    storageBucket: "myapp-ac6bd.appspot.com",
    messagingSenderId: "1051256747459",
    appId: "1:1051256747459:web:8db0d2e785a0ce0bbb7976",
    measurementId: "G-4P6LR2SX7V"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const firestore = firebase.firestore();
'use strict';

//servers
const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302', 'stun:stun3.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

// Global State
const pc = new RTCPeerConnection(servers);
let localStream = null;
let remoteStream = null;
let localStreamSender = null;
let remoteStreamSender = null;
let localScreenShare = null;
let remoteScreenShare = null;
const senders=[];
//screenshare functions
function handleSuccess(stream) {

  const video = document.querySelector('#screenVideo');
  video.srcObject = stream;
  localScreenShare = stream;
  document.querySelector('#remotescreenVideo').srcObject = remoteScreeenShare;
  // demonstrates how to detect that the user has stopped
  // sharing the screen via the browser UI.
  stream.getVideoTracks()[0].addEventListener('ended', () => {
    document.querySelector('#screenshare').disabled= false;
  });
}
/*startButton.onclick = async () => {
  const localscreenshare= await navigator.mediaDevices.getDisplayMedia({video: true});
  senders.find(sender => sender.track.kind =='video').replaceTrack(localscreenshare.getTracks()[0]);
  document.querySelector('#localVideo').srcObject = localscreenshare;
};*/

// HTML elements
const webcamButton = document.getElementById('webcamButton');
const webcamVideo = document.getElementById('webcamVideo');
const callButton = document.getElementById('callButton');
const callInput = document.getElementById('callInput');
const answerButton = document.getElementById('answerButton');
const remoteVideo = document.getElementById('remoteVideo');
const hangupButton = document.getElementById('hangupButton');
const startButton = document.getElementById('startButton');
const cameraButton = document.getElementById('cameraButton');
// 1. Setup media sources

webcamButton.onclick = async () => {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  remoteStream = new MediaStream();

  // Push tracks from local stream to peer connection
  localStream.getTracks().forEach((track) => {
    localStreamSender=pc.addTrack(track, localStream);
    senders.push(localStreamSender);
  });

  // Pull tracks from remote stream, add to video stream
  pc.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  };

  webcamVideo.srcObject = localStream;
  remoteVideo.srcObject = remoteStream;

  callButton.disabled = false;
  answerButton.disabled = false;
  webcamButton.disabled = true;
};
cameraButton.onclick = async () => {
  if (localStream == null) {
    console.log("no stream found")
    return;
  }
  var videoTracks = localStream.getVideoTracks();
  console.log("video change");
  for (var i = 0; i < videoTracks.length; ++i) {
      videoTracks[i].enabled = !videoTracks[i].enabled;
      if (!videoTracks[i].enabled) {
          document.getElementById("camImg").src = "img/cameraoff.png";
          // document.getElementById("cameraBtn").classList.add("blue");
      } else {
          document.getElementById("camImg").src = "img/cam.png";
          //document.getElementById("cameraBtn").classList.remove("blue");
      }
  }
}
// 2. Create an offer

callButton.onclick = async () => {
  const callDoc = firestore.collection('calls').doc();
  const offerCandidates = callDoc.collection('offerCandidates');
  const answerCandidates = callDoc.collection('answerCandidates');

  callInput.value = callDoc.id;

  // Get candidates for caller, save to db
  pc.onicecandidate = (event) => {
    event.candidate && offerCandidates.add(event.candidate.toJSON());
  };

  // Create offer
  const offerDescription = await pc.createOffer();
  await pc.setLocalDescription(offerDescription);

  const offer = {
    sdp: offerDescription.sdp,
    type: offerDescription.type,
  };

  await callDoc.set({ offer });

  // Listen for remote answer
  callDoc.onSnapshot((snapshot) => {
    const data = snapshot.data();
    if (!pc.currentRemoteDescription && data?.answer) {
      const answerDescription = new RTCSessionDescription(data.answer);
      pc.setRemoteDescription(answerDescription);
    }
  });

  // When answered, add candidate to peer connection
  answerCandidates.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const candidate = new RTCIceCandidate(change.doc.data());
        pc.addIceCandidate(candidate);
      }
    });
  });

  hangupButton.disabled = false;
};

// 3. Answer the call with the unique ID

answerButton.onclick = async () => {
  const callId = callInput.value;
  const callDoc = firestore.collection('calls').doc(callId);
  const answerCandidates = callDoc.collection('answerCandidates');
  const offerCandidates = callDoc.collection('offerCandidates');

  pc.onicecandidate = (event) => {
    event.candidate && answerCandidates.add(event.candidate.toJSON());
  };

  const callData = (await callDoc.get()).data();

  const offerDescription = callData.offer;
  await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

  const answerDescription = await pc.createAnswer();
  await pc.setLocalDescription(answerDescription);

  const answer = {
    type: answerDescription.type,
    sdp: answerDescription.sdp,
  };

  await callDoc.update({ answer });

  offerCandidates.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      console.log(change);
      if (change.type === 'added') {
        let data = change.doc.data();
        pc.addIceCandidate(new RTCIceCandidate(data));
      }
    });
  });
};

//4. screenshare

/*startButton.addEventListener('click', () => {
  navigator.mediaDevices.getDisplayMedia({video: true})
      .then(handleSuccess, handleError);
});

if ((navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices)) {
  startButton.disabled = false;
} else {
  errorMsg('getDisplayMedia is not supported');
}*/
startButton.onclick = async () => {
  const localscreenshare= await navigator.mediaDevices.getDisplayMedia({video: true});
  senders.find(sender => sender.track.kind =='video').replaceTrack(localscreenshare.getTracks()[0]);
  document.querySelector('webcamVideo').srcObject = localscreenshare;
};
