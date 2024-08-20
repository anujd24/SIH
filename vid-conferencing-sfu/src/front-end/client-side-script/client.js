
const io = require('socket.io-client')
const mediasoupClient = require('mediasoup-client')

const roomName = window.location.pathname.split('/')[2]



const socket = io("/vidCalling") //using same namespace here to esatblish connection between socket.io and socket.io-client
//<----------------------------------------polling----------------------------------------------------------------->



//<--------------------------------------code for screen-sharing------------------------------------->
document.getElementById('screen-share-button').addEventListener('click', () => {
  console.log("clicked")
  replaceWithScreenShare();
});

async function replaceWithScreenShare() {
  try {
      // Capture the screen stream
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false // You can include audio if needed
      });
      
      // Get the video track from the screen stream
      const screenVideoTrack = screenStream.getVideoTracks()[0];
      localVideo.srcObject = screenStream
      // Replace the current video track with the screen video track
      await replaceProducerTrack(screenVideoTrack);

  } catch (err) {
      console.error("Error sharing screen: ", err);
  }
}

//replacing existing video track
async function replaceProducerTrack(newTrack) {
  if (videoProducer) { // Assuming `videoProducer` is your existing producer for the video track
    
      await videoProducer.replaceTrack({ track: newTrack });
      console.log('Video track replaced with screen sharing track.');
  } else {
      console.error('No existing video producer found.');
  }
}




//<----------------------------------------code for file sharing in rooms-------------------------------->
const fileShare = io('/fileShare'); // using fileShare namespace 

fileShare.on('connect', () => {
  fileShare.emit('joinRoom', roomName); // asking room to join the given room
});

const sendFile = (file) => {
  const reader = new FileReader();
  reader.onload = function (e) {
    const fileData = e.target.result; // Get the file data
    const fileName = file.name;
    fileShare.emit('file-send', { fileName, fileData, roomName }); // Send file data to the server
  };
  reader.readAsArrayBuffer(file); // Read the file as an ArrayBuffer
};

// Add event listener for file sending
document.getElementById('file-send-button').addEventListener('click', (e) => {
  e.preventDefault();
  const fileInput = document.getElementById('file-input');
  const file = fileInput.files[0];
  if (file) {
    sendFile(file);
    fileInput.value = ''; // Clear input field
  }
});

// Handle receiving a file and displaying it in the chat box
fileShare.on('file-receive', ({ fileName, fileData }) => {
  const chatBox = document.getElementById('chat-box');

  // Create a download link for the file
  const blob = new Blob([fileData]);
  const url = URL.createObjectURL(blob);
  
  const fileMessage = document.createElement('div');
  fileMessage.style.marginBottom = '1rem';
  fileMessage.style.backgroundColor = '#333'; // Dark background color
  fileMessage.style.color = '#fff'; // Light text color
  fileMessage.style.padding = '10px'; // Padding around the message
  fileMessage.style.borderRadius = '8px'; // Rounded corners
  fileMessage.style.border = '1px solid #555'; // Slight border to distinguish
  fileMessage.style.width = '20vw';

  const fileNameElement = document.createElement('p');
  fileNameElement.textContent = fileName;
  fileNameElement.style.margin = '0'; // Remove margin
  fileNameElement.style.fontWeight = 'bold'; // Bold font

  const downloadLink = document.createElement('a');
  downloadLink.href = url;
  downloadLink.download = fileName;
  downloadLink.textContent = 'Download';
  downloadLink.style.color = '#00ff6a'; // Green color for the download link
  downloadLink.style.textDecoration = 'none'; // Remove underline
  downloadLink.style.fontWeight = 'bold'; // Bold font
  downloadLink.style.display = 'block'; // Display on a new line
  downloadLink.style.marginTop = '5px'; // Space above the link

  fileMessage.appendChild(fileNameElement);
  fileMessage.appendChild(downloadLink);
  chatBox.appendChild(fileMessage);

  // Scroll to the bottom of the chat box
  chatBox.scrollTop = chatBox.scrollHeight;
});




//<-------------------------------------chat functionality code------------------------------------------->
const chatSocket = io('/chat'); // Namespace for chat

// Join the room after connection
chatSocket.on('connect', () => {
  chatSocket.emit('joinRoom', roomName);
});

const sendChatMessage = (message) => {
  chatSocket.emit('chat-message', { message, roomName });
};

chatSocket.on('chat-message', ({ message, room, sender }) => {
  if (room === roomName) {
      console.log("Received chat message:", message);
      const chatBox = document.getElementById('chat-box');

      const chatMessage = document.createElement('div');
      chatMessage.className = 'chat-message';

      // Create the message bubble
      const messageBubble = document.createElement('div');
      messageBubble.className = sender === 'me' ? 'sender-message' : 'receiver-message';
      messageBubble.textContent = message;

      // Add a triangle for message bubble
      const triangle = document.createElement('div');
      triangle.className = 'message-triangle';
      messageBubble.appendChild(triangle);

      chatMessage.appendChild(messageBubble);

      // Optionally add a timestamp
      const timestamp = document.createElement('div');
      timestamp.className = 'message-timestamp';
      timestamp.textContent = new Date().toLocaleTimeString();
      chatMessage.appendChild(timestamp);

      chatBox.appendChild(chatMessage);

      // Scroll to the bottom of the chat box
      chatBox.scrollTop = chatBox.scrollHeight;
  }
});



document.getElementById('chat-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const messageInput = document.getElementById('chat-input');
  const message = messageInput.value;
  sendChatMessage(message);
  messageInput.value = ''; // Clear input field
});


document.getElementById('chat-input').setAttribute('autocomplete', 'off');


//<----------------------------------------mediasoup code------------------------------------------>
socket.on('connection-success', ({ socketId }) => {     //client will react when server send connection-success
  console.log(socketId)                   
  getLocalStream()                                      //client will start getting its local stream
})


let device
let rtpCapabilities
let producerTransport
let consumerTransports = []
let audioProducer
let videoProducer
let consumer
let isProducer = false


let params = {

  encodings: [
    {
      rid: 'r0',
      maxBitrate: 100000,
      scalabilityMode: 'S1T3',
    },
    {
      rid: 'r1',
      maxBitrate: 300000,
      scalabilityMode: 'S1T3',
    },
    {
      rid: 'r2',
      maxBitrate: 900000,
      scalabilityMode: 'S1T3',
    },
  ],
  
  codecOptions: {
    videoGoogleStartBitrate: 1000
  }
}

let audioParams;
let videoParams = { params };
let consumingTransports = [];

const streamSuccess = (stream) => {
  localVideo.srcObject = stream                   //just putting streaming in the video src

  audioParams = { track: stream.getAudioTracks()[0], ...audioParams };
  videoParams = { track: stream.getVideoTracks()[0], ...videoParams };

  joinRoom()                                        //joining the room
}

const joinRoom = () => {
  socket.emit('joinRoom', { roomName }, (data) => {                     //client is asking server to join in room
    console.log(`Router RTP Capabilities... ${data.rtpCapabilities}`)   //server sends room number and rtp cap.
    
    rtpCapabilities = data.rtpCapabilities

    createDevice()                               //creating device--> this will check whether our stream is suitable for transmission or not
  })
}

const getLocalStream = () => {
  navigator.mediaDevices.getUserMedia({       //getting access from browser for audio and video
    audio: true,
    video: {
      width: {
        min: 640,
        max: 1920,
      },
      height: {
        min: 400,
        max: 1080,
      }
    }
  })
  .then(streamSuccess)                    //if permission is granted, then streamSuccess function will be called
  .catch(error => {
    console.log(error.message)
  })
}

const createDevice = async () => {          
  try {
    device = new mediasoupClient.Device()         //using mediasoup lib to create device


    await device.load({
     
      routerRtpCapabilities: rtpCapabilities        //loading device with rtpc cap. which earlier we got from server on joining room
    })

    console.log('Device RTP Capabilities', device.rtpCapabilities)

  
    createSendTransport()                   //initiating sendTransport

  } catch (error) {
    console.log(error)
    if (error.name === 'UnsupportedError')
      console.warn('browser not supported')
  }
}

const createSendTransport = () => {

  socket.emit('createWebRtcTransport', { consumer: false }, ({ params }) => { //emiitng event createWebRtcTransport to server wiht consumer being false info and asking for params from server
   
    if (params.error) {
      console.log(params.error)
      return
    }

    console.log(params)

    producerTransport = device.createSendTransport(params) // Using Mediasoup device instance to create a send transport using the parameters provided by the server.

    //sending dtls paramns back to the the server for establishing the transport connection 
    producerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {

        await socket.emit('transport-connect', {
          dtlsParameters,                           //sending dtls to sever
        })

        callback()                    //for signalling connection process was successful

      } catch (error) {
        errback(error)
      }
    })

    producerTransport.on('produce', async (parameters, callback, errback) => {
      console.log(parameters)

      try {
        
        await socket.emit('transport-produce', {
          kind: parameters.kind,
          rtpParameters: parameters.rtpParameters,
          appData: parameters.appData,
        }, ({ id, producersExist }) => {      //callback function to handle server's response
       
          callback({ id })            //calls the callback with producer id to confirm media prod req was sucess
          if (producersExist) getProducers()
        })
      } catch (error) {
        errback(error)
      }
    })

    connectSendTransport()
  })
}

const connectSendTransport = async () => {

  //creaating audio and video transfer using params
  audioProducer = await producerTransport.produce(audioParams);
  videoProducer = await producerTransport.produce(videoParams);

  audioProducer.on('trackended', () => {
    console.log('audio track ended')

z
  })

  audioProducer.on('transportclose', () => {
    console.log('audio transport ended')


  })
  
  videoProducer.on('trackended', () => {
    console.log('video track ended')

  })

  videoProducer.on('transportclose', () => {
    console.log('video transport ended')

  })
}

const signalNewConsumerTransport = async (remoteProducerId) => {

  if (consumingTransports.includes(remoteProducerId)) return;
  consumingTransports.push(remoteProducerId);

  await socket.emit('createWebRtcTransport', { consumer: true }, ({ params }) => {
   
    if (params.error) {
      console.log(params.error)
      return
    }
    console.log(`PARAMS... ${params}`)

    let consumerTransport
    try {
      consumerTransport = device.createRecvTransport(params)
    } catch (error) {
     
      console.log(error)
      return
    }

    consumerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
  
        await socket.emit('transport-recv-connect', {
          dtlsParameters,
          serverConsumerTransportId: params.id,
        })

        callback()
      } catch (error) {
    
        errback(error)
      }
    })

    connectRecvTransport(consumerTransport, remoteProducerId, params.id)
  })
}

socket.on('new-producer', ({ producerId }) => signalNewConsumerTransport(producerId))

const getProducers = () => {
  socket.emit('getProducers', producerIds => {
    console.log(producerIds)
  
    producerIds.forEach(signalNewConsumerTransport)
  })
}

const connectRecvTransport = async (consumerTransport, remoteProducerId, serverConsumerTransportId) => {

  await socket.emit('consume', {
    rtpCapabilities: device.rtpCapabilities,
    remoteProducerId,
    serverConsumerTransportId,
  }, async ({ params }) => {
    if (params.error) {
      console.log('Cannot Consume')
      return
    }

    console.log(`Consumer Params ${params}`)
    const consumer = await consumerTransport.consume({
      id: params.id,
      producerId: params.producerId,
      kind: params.kind,
      rtpParameters: params.rtpParameters
    })

    consumerTransports = [
      ...consumerTransports,
      {
        consumerTransport,
        serverConsumerTransportId: params.id,
        producerId: remoteProducerId,
        consumer,
      },
    ]

    const newElem = document.createElement('div')
    newElem.setAttribute('id', `td-${remoteProducerId}`)

    if (params.kind == 'audio') {

      newElem.innerHTML = '<audio id="' + remoteProducerId + '" autoplay></audio>'
    } else {
      
      newElem.setAttribute('class', 'remoteVideo')
      newElem.innerHTML = '<video id="' + remoteProducerId + '" autoplay class="video" ></video>'
    }

    videoContainer.appendChild(newElem)

    const { track } = consumer

    document.getElementById(remoteProducerId).srcObject = new MediaStream([track])

  
    socket.emit('consumer-resume', { serverConsumerId: params.serverConsumerId })
  })
}

socket.on('producer-closed', ({ remoteProducerId }) => {
  
  const producerToClose = consumerTransports.find(transportData => transportData.producerId === remoteProducerId)
  producerToClose.consumerTransport.close()
  producerToClose.consumer.close()

  consumerTransports = consumerTransports.filter(transportData => transportData.producerId !== remoteProducerId)

  videoContainer.removeChild(document.getElementById(`td-${remoteProducerId}`))
})