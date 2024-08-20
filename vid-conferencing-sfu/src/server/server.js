

import express from 'express'
import http from 'http';
import { Server } from 'socket.io'
import mediasoup from 'mediasoup'
import fs from 'fs'
import path from 'path'

const app = express()
const port = 3000;  //here we will run server


app.use(express.json());


const __dirname = path.resolve()  //absolute path of the current working directory

app.use(express.static(path.join(__dirname))); //to serve static files

// app.get('/', (req, res) => {
//   res.sendFile(path.join(__dirname,'landing.html'));
// });
app.get('/sign-in', (req, res) => {
  res.sendFile(path.join(__dirname,'sign-in.html'));
});
app.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname,'home.html'));
});
app.get('/room/:roomNumber', (req, res) => {
    res.sendFile(path.join(__dirname, 'room.html'));
});



const httpsServer = http.createServer( app)
httpsServer.listen(port, () => {
  console.log('listening on port: ' + ( port))
})

const io = new Server(httpsServer) //initializing the new socket.io instance and attaching it to existing server 


const connections = io.of('/vidCalling') //using namespace "vidCalling" to connect with client and have a seperate channel to facilitate video calling with client

//<-------------------------------------code for polling -------------------------------------------------->

const pollingNamespace = io.of('/polling');
let polls = {}; // Store polls in-memory (consider using a database for persistence)
let userVotes = {}; // Store user votes globally
pollingNamespace.on('connection', (socket) => {
  console.log('A user connected to the polling namespace');

  // Send initial polls to the client
  socket.emit('initialPolls', Object.values(polls));

  // Handle creating a poll
  socket.on('createPoll', (poll) => {
    console.log('Poll created:', poll);
    polls[poll.id] = poll;
    pollingNamespace.emit('newPoll', poll);
  });

  // Handle voting
  socket.on('vote', (data) => {
    console.log('Vote received:', data);

    const poll = polls[data.pollId];
    if (!poll) return;

    // Remove user's previous vote if they had one
    if (userVotes[socket.id] && userVotes[socket.id][data.pollId]) {
      const previousOption = userVotes[socket.id][data.pollId];
      if (poll.votes[previousOption] > 0) {
        poll.votes[previousOption]--;
      }
    }

    // Update the vote
    poll.votes[data.option] = (poll.votes[data.option] || 0) + 1;

    // Track user's new vote
    if (!userVotes[socket.id]) {
      userVotes[socket.id] = {};
    }
    userVotes[socket.id][data.pollId] = data.option;

    pollingNamespace.emit('updatePoll', poll);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected from the polling namespace');
    delete userVotes[socket.id]; // Clean up user votes on disconnect
  });
});








//<----------------------------------code for sharing files------------------------------------------------->



io.of('/fileShare').on('connection', (socket) => {
  console.log("File sharing functionality is active");

  socket.on('joinRoom', (roomName) => {
    socket.join(roomName);
    console.log(`User joined room: ${roomName}`);
  });

  socket.on('file-send', ({ fileName, fileData, roomName }) => {
    // Broadcast the file to others in the room
    io.of('/fileShare').in(roomName).emit('file-receive', { fileName, fileData });
    console.log(`File ${fileName} sent to room: ${roomName}`);
  });
});




//<----------------------------------code for chat------------------------------------------->
io.of('/chat').on('connection', (socket) => {
  console.log('A user connected to chat');

  socket.on('joinRoom', (roomName) => {
    socket.join(roomName);
    console.log(`User joined room: ${roomName}`);
  });

  socket.on('chat-message', ({ message, roomName }) => {
    console.log(`Message received for room ${roomName}: ${message}`);
    io.of('/chat').to(roomName).emit('chat-message', { message, room: roomName });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected from chat');
  });
});

//<---------------------------------following mediasoup architecture--------------------------------------->

let worker
let rooms = {}          
let peers = {}           
let transports = []     
let producers = []      
let consumers = []     



// creating function to create worker
const createWorker = async () => {
  worker = await mediasoup.createWorker({
    rtcMinPort:2000,                                //defining UDP ports for transmiting media streams
    rtcMaxPort:2050,
  })
  console.log(`worker pid ${worker.pid}`)

  worker.on('died', error => {                    //handling if worker dies
  
    console.error('mediasoup worker has died')
    setTimeout(() => process.exit(1), 2000)     //giving time to cleanup or log error before terminating
  })

  return worker
}

//step1: creating worker
worker = createWorker()

//defining format of media in which steam will be decoded or encoded by mediasoup
const mediaCodecs = [
  {
    kind: 'audio',
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 2,
  },
  {
    kind: 'video',
    mimeType: 'video/VP8',
    clockRate: 90000,
    parameters: {
      'x-google-start-bitrate': 1000,   //increasing bitrate can increase quality of video but can hamper the overall performance
    },
  },
]


//here connections is namespace that we declared earlier will be used to take care of vidCalling channel
//connection is a event of socket, it will be emitted when a new client joins with same namespace as server

connections.on('connection', async socket => {
  console.log(socket.id)
  socket.emit('connection-success', {               //now emitting or telling client that the connection was successful
    socketId: socket.id,                            //giving socket id of connection to client
  })

  const removeItems = (items, socketId, type) => {      //creating function which will help us to remove items of client when it gets disconnected
    items.forEach(item => {
      if (item.socketId === socket.id) {
        item[type].close()                        //closing resources for that peer
      }
    })
    items = items.filter(item => item.socketId !== socket.id)

    return items
  }


  socket.on('disconnect', () => {                           //if client gets disconnected from server
    console.log('peer disconnected');
  
   
    const peer = peers[socket.id];
    if (peer) {
      consumers = removeItems(consumers, socket.id, 'consumer');      //removing consumers of that peer
      producers = removeItems(producers, socket.id, 'producer');    //removing producers of that peer
      transports = removeItems(transports, socket.id, 'transport');   //removing transports of that peer
  
      const { roomName } = peer;                    //getting room number in which that peer was residing
  
      rooms[roomName] = {
        router: rooms[roomName].router,
        peers: rooms[roomName].peers.filter(socketId => socketId !== socket.id)   //removing that peer from room
      };
  
      delete peers[socket.id];                         //deleting that peer from peers
    } else {
      console.log('Socket ID not found in peers');    //for getting aware of some unexpected error
    }
  });
  

  socket.on('joinRoom', async ({ roomName }, callback) => {     //when client will ask for joining the rooom
      
    const router1 = await createRoom(roomName, socket.id)     // using routers to create rooms

    peers[socket.id] = {
      socket,
      roomName,           
      transports: [],
      producers: [],
      consumers: [],
      peerDetails: {
        name: '',
        isAdmin: false,
      }
    }

   
    const rtpCapabilities = router1.rtpCapabilities

    
    callback({ rtpCapabilities })                                 //giving media capabilities to client
  })

  const createRoom = async (roomName, socketId) => {
   
    let router1
    let peers = []
    if (rooms[roomName]) {                      //if that room is already present 
      router1 = rooms[roomName].router            //get that router
      peers = rooms[roomName].peers || []             //and get peers
    } else {
      router1 = await worker.createRouter({ mediaCodecs, })       //if not, then create a new router
    }
    
    console.log(`Router ID: ${router1.id}`, peers.length)       

    rooms[roomName] = {                       
      router: router1,                          //set router of that client
      peers: [...peers, socketId],              //and set its socketID in list of peer i.e make in a peer in that room
    }

    return router1                              //return with router or room
  }

  


  socket.on('createWebRtcTransport', async ({ consumer }, callback) => {  //received event from client and info about consumer 
    
    const roomName = peers[socket.id].roomName  //getting room from socket id of peer

    const router = rooms[roomName].router       //getting router from rooms this will help us to handle streams in particular room


    createWebRtcTransport(router).then(
      transport => {
        callback({
          params: {
            id: transport.id,                     //unique id of each transport
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
          }
        })

      
        addTransport(transport, roomName, consumer) //adding info about newly created transport to the server's data with its room name and whether it is being used for consumer or not
      },
      error => {
        console.log(error)
      })
  })


  //defining a function to add all details about a newly created transport in server
  const addTransport = (transport, roomName, consumer) => {

    transports = [
      ...transports,
      { socketId: socket.id, transport, roomName, consumer, }
    ]

    peers[socket.id] = {
      ...peers[socket.id],
      transports: [
        ...peers[socket.id].transports,
        transport.id,
      ]
    }
  }

  const addProducer = (producer, roomName) => {
    producers = [
      ...producers,
      { socketId: socket.id, producer, roomName, }
    ]

    peers[socket.id] = {
      ...peers[socket.id],
      producers: [
        ...peers[socket.id].producers,
        producer.id,
      ]
    }
  }

  const addConsumer = (consumer, roomName) => {
    
    consumers = [
      ...consumers,
      { socketId: socket.id, consumer, roomName, }
    ]

   
    peers[socket.id] = {
      ...peers[socket.id],
      consumers: [
        ...peers[socket.id].consumers,
        consumer.id,
      ]
    }
  }

  socket.on('getProducers', callback => {
   
    const { roomName } = peers[socket.id]

    let producerList = []
    producers.forEach(producerData => {
      if (producerData.socketId !== socket.id && producerData.roomName === roomName) {
        producerList = [...producerList, producerData.producer.id]
      }
    })

    
    callback(producerList)
  })

  const informConsumers = (roomName, socketId, id) => {
    console.log(`just joined, id ${id} ${roomName}, ${socketId}`)
   
    producers.forEach(producerData => {
      if (producerData.socketId !== socketId && producerData.roomName === roomName) {
        const producerSocket = peers[producerData.socketId].socket
        
        producerSocket.emit('new-producer', { producerId: id })
      }
    })
  }

  ////gets the transport object ass. with the socket id
  const getTransport = (socketId) => {
    const [producerTransport] = transports.filter(transport => transport.socketId === socketId && !transport.consumer)
    return producerTransport.transport
  }


  socket.on('transport-connect', ({ dtlsParameters }) => {
    console.log('DTLS PARAMS... ', { dtlsParameters })
    
    getTransport(socket.id).connect({ dtlsParameters })  //gets the transport object ass. with the socket id and then complete the connection process of WebRTC using coonect method of mediasoup
  })


  socket.on('transport-produce', async ({ kind, rtpParameters, appData }, callback) => {
 
    const producer = await getTransport(socket.id).produce({
      kind,
      rtpParameters,
    })

   
    const { roomName } = peers[socket.id]

    addProducer(producer, roomName)

    informConsumers(roomName, socket.id, producer.id)

    console.log('Producer ID: ', producer.id, producer.kind)

    producer.on('transportclose', () => {
      console.log('transport for this producer closed ')
      producer.close()
    })

   
    callback({
      id: producer.id,
      producersExist: producers.length>1 ? true : false
    })
  })

  socket.on('transport-recv-connect', async ({ dtlsParameters, serverConsumerTransportId }) => {
    console.log(`DTLS PARAMS: ${dtlsParameters}`)
    const consumerTransport = transports.find(transportData => (
      transportData.consumer && transportData.transport.id == serverConsumerTransportId
    )).transport
    await consumerTransport.connect({ dtlsParameters })
  })

  socket.on('consume', async ({ rtpCapabilities, remoteProducerId, serverConsumerTransportId }, callback) => {
    try {

      const { roomName } = peers[socket.id]
      const router = rooms[roomName].router
      let consumerTransport = transports.find(transportData => (
        transportData.consumer && transportData.transport.id == serverConsumerTransportId
      )).transport

      
      if (router.canConsume({
        producerId: remoteProducerId,
        rtpCapabilities
      })) {
       
        const consumer = await consumerTransport.consume({
          producerId: remoteProducerId,
          rtpCapabilities,
          paused: true,
        })

        consumer.on('transportclose', () => {
          console.log('transport close from consumer')
        })

        consumer.on('producerclose', () => {
          console.log('producer of consumer closed')
          socket.emit('producer-closed', { remoteProducerId })

          consumerTransport.close([])
          transports = transports.filter(transportData => transportData.transport.id !== consumerTransport.id)
          consumer.close()
          consumers = consumers.filter(consumerData => consumerData.consumer.id !== consumer.id)
        })

        addConsumer(consumer, roomName)

       
        const params = {
          id: consumer.id,
          producerId: remoteProducerId,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters,
          serverConsumerId: consumer.id,
        }

      
        callback({ params })
      }
    } catch (error) {
      console.log(error.message)
      callback({
        params: {
          error: error
        }
      })
    }
  })

  socket.on('consumer-resume', async ({ serverConsumerId }) => {
    console.log('consumer resume')
    const { consumer } = consumers.find(consumerData => consumerData.consumer.id === serverConsumerId)
    await consumer.resume()
  })
})

const createWebRtcTransport = async (router) => {
  return new Promise(async (resolve, reject) => {
    try {
      
      const webRtcTransport_options = {
        listenIps: [
          {
            ip: '0.0.0.0',
             announcedIp: '192.168.1.8',
          }
        ],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
      }

      let transport = await router.createWebRtcTransport(webRtcTransport_options)
      console.log(`transport id: ${transport.id}`)

      transport.on('dtlsstatechange', dtlsState => {
        if (dtlsState === 'closed') {
          transport.close()
        }
      })

      transport.on('close', () => {
        console.log('transport closed')
      })

      resolve(transport)

    } catch (error) {
      reject(error)
    }
  })
}