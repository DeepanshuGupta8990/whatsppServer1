const express = require("express");
const cors = require('cors');
const mongoose = require("mongoose");
const MessageUser = require("./models/messages.js");
const socket = require("socket.io");
const getMessagesFromSender = require("./helper/helper1.js");
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require("fs");
const crypto = require('crypto');

const app = express()
app.use(cors());
app.use(express.json());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


mongoose.connect('mongodb+srv://deepanshugupta899:ZxEBEU2tZW5sI9BF@cluster0.ki6bgeh.mongodb.net/todoApp',{
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(()=>{
    console.log("DB connected");
}).catch((err)=>{
    console.log(err);
})

// Configure multer to save files to a directory
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/'); // Create an "uploads" directory to store the files
    },
    filename: (req, file, cb) => {
      const uniqueImageName = Date.now() + '_' + file.originalname;
      cb(null, uniqueImageName);
    },
  });
  const upload = multer({ storage });


app.get("/",(req,res)=>{
    res.send("sdsadsa")
})

app.get("/getAllUser",async(req,res)=>{
    const usersList = await MessageUser.find({});
    res.json(usersList);
})

app.post("/userAvatarSaved",async(req,res)=>{
    console.log('req arrived at userAvatarSaved')
    const {imageData,email} = await req.body;
   const AvatarAvaliableOrNot = await MessageUser.findOne({email});
   if(!AvatarAvaliableOrNot.avatar){
    const update = await MessageUser.updateOne({email},{$set:{avatar:imageData}});
    console.log(update);
    if(update.acknowledged){
        res.json({status:201,msg:"avatar updated"});
    }else{
        res.json({status:401,msg:"avatar not updated"});
    }
   }else{
        res.json({status:401,avatar:AvatarAvaliableOrNot.avatar,msg:"Avatar already avaliable"});
   }
})

app.post('/getAllMessages',async(req,res)=>{
    const {email,email2} = await req.body;
    const messages =await getMessagesFromSender(email2,email);
    // console.log(messages)
    // const filteredMessages = messages.messages?.filter((mez)=>{
    //     return (mez.sender===email || mez.receiver===email);
    // })
    // console.log(filteredMessages);
    // res.json({messages:filteredMessages});
    res.json({messages:messages.messages});
})

app.post('/uploadStatus',upload.single('image'),async(req,res)=>{
  console.log('req arrived')
  const imagePath = req.file.path; 
  const email = req.body.email; 
  console.log(email)
  const uniqueImageName = req.file.filename;
  const uniqueImagePath = `uploads/${uniqueImageName}`;
  const newStatusObject = {
    urL:uniqueImagePath
  }
  console.log(newStatusObject)
  if(uniqueImagePath){
      const updatedUser = await MessageUser.findOneAndUpdate(
        { email: email },
        {
         $push: {
           status: { url: uniqueImagePath }
          }
          },
          {new:true}
        ).select('-messages -avatar') // Exclude 'messages' field from the result
        .exec();
       console.log(updatedUser)
        res.json({ status: 201, message: 'Image received and stored on the server.', imagePath: uniqueImagePath,statusArr:updatedUser.status });
      }else{
      res.json({ status: 201, message: 'Image received and stored on the server.', imagePath: uniqueImagePath });
      }
})

app.post("/deleteStatus",async(req,res)=>{
  const {email,statusObjectIdToRemove,imagePath} = await req.body; 
  console.log(email,statusObjectIdToRemove)
  const deletedStatus = await MessageUser.findOneAndUpdate({ email: email },
    {
      $pull: {
        status: { _id: statusObjectIdToRemove }
      }
    },
    { new: true } )
    .select('-messages -avatar')
    .exec();
  console.log(deletedStatus);
  if(deletedStatus){
    res.status(201).json({deletedStatus:deletedStatus});
    const fullImagePath = path.join(__dirname, imagePath);
    if (fs.existsSync(fullImagePath)) {
      fs.unlink(fullImagePath, async (err) => {
        console.log(err);
      });
    } 
  }
})

app.post('/avatarUpdated',upload.single('image'),async(req,res)=>{
    console.log('req arrived')
    const imagePath = req.file.path; 
    const email = req.body.email; 
    console.log(email)
    const uniqueImageName = req.file.filename;
    const uniqueImagePath = `uploads/${uniqueImageName}`;
    if(uniqueImagePath){
        const updatedUser = await MessageUser.findOneAndUpdate(
            { email: email },
            { avatar: uniqueImagePath },
            { new: true }
          )
          .select('-messages') // Exclude 'messages' field from the result
          .exec();
          res.json({ status: 201, message: 'Image received and stored on the server.', imagePath: uniqueImagePath,user:updatedUser });
        }else{
        res.json({ status: 201, message: 'Image received and stored on the server.', imagePath: uniqueImagePath });
        }
})

app.post("/avatarUpdated2", async (req, res) => {
    const { imagePath, email, avatarString } = req.body;

    async function updateDBWithImage(){
        try {
            const updatedUser = await MessageUser.findOneAndUpdate(
                { email: email },
                { avatar: avatarString },
                { new: true }
              )
              .select('-messages') // Exclude 'messages' field from the result
              .exec();

            if (updatedUser) {
              res.status(200).json({
                status: 200,
                message: 'Avatar updated successfully',
                user: updatedUser,
              });
            } else {
              res.status(404).json({
                status: 404,
                message: 'User not found',
              });
            }
          } catch (error) {
            res.status(500).json({
              status: 500,
              message: 'Internal server error',
              error: error.message,
            });
          }
    } 

    try {
      // Construct the full path to the image on the server
      const fullImagePath = path.join(__dirname, imagePath);

      // Check if the file exists
      if (fs.existsSync(fullImagePath)) {
        // Delete the file
        fs.unlink(fullImagePath, async (err) => {
          if (err) {
            return res.status(500).json({
              status: 500,
              message: 'Error deleting the image',
              error: err.message,
            });
          }

          // Image deleted successfully, now update the user's avatar
          updateDBWithImage(email,avatarString,imagePath);
        });
      } else {
        if(!imagePath.startsWith("PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMzEgMjMxIj48cGF0aCBkPSJNMzMuODMsMzMuODNhMTE1LjUsMTE1LjUsMCwxLDEsMCwxNjMuMzQsMTE1LjQ5LDExNS")){
            res.status(404).json({
                status: 404,
                message: 'Image not found',
            });
        }else{
            updateDBWithImage(email,avatarString,imagePath);
        }
      }
    } catch (error) {
      res.status(500).json({
        status: 500,
        message: 'Internal server error',
        error: error.message,
      });
    }
  });


  app.post('/chatImageVideoUploaded',upload.single('image'),async(req,res)=>{
    console.log('req arrived')
    const imagePath = req.file.path; 
    const email = req.body.email; 
    const senderEmail = req.body.senderEmail; 
    const recieverEmail = req.body.recieverEmail; 
    const type = req.body.type; 
    const type2 = req.body.type2; 
    console.log(email)
    const uniqueImageName = req.file.filename;
    const uniqueImagePath = `uploads/${uniqueImageName}`;
    if(uniqueImagePath){
      newMessage = {
        sender:senderEmail,
        receiver:recieverEmail,
        type:type,
        type2:type2,
        text:uniqueImagePath,
    }
      addMessageToUser(recieverEmail, newMessage);
     async function func(){
      const updatedMessages = addMessageToUser(senderEmail, {...newMessage,type2:"sent"});
      res.json({ status: 201, message: 'Image received and stored on the server.', imagePath: uniqueImagePath, updatedMessages:updatedMessages});
     }
     func()
        }else{
        res.json({ status: 401, message: "Image hasn't been recieved on the server." });
        }
})

app.post("/deleteMezForMe", async (req, res) => {
  try {
    const { email, id } = req.body;

    const updateResult = await MessageUser.findOneAndUpdate(
      { email: email, 'messages.uniqueId': id },
      { $set: { 'messages.$.text': 'Mez deleted for you',"messages.$.isDeleted":true } },
      { new: true, projection: { messages: 1 } }
    );

    if (updateResult) {
      // Successfully updated the message
      res.status(200).json({ messages: updateResult.messages });
    } else {
      // Message with the provided id not found
      res.status(404).send("Message not found or not updated.");
    }
  } catch (err) {
    console.error("Error deleting message:", err);
    res.status(500).send("Internal server error");
  }
});

app.post("/deleteMezForEverOne", async (req, res) => {
  try {
    const { senderEmail, recieverEmail, id } = await req.body;
    console.log(senderEmail,recieverEmail,id)
    const updateResult1 = await MessageUser.findOneAndUpdate(
      { email: senderEmail, 'messages.uniqueId': id },
      { $set: { 'messages.$.text': 'Mez deleted ',"messages.$.isDeleted":true } },
      { new: true, projection: { messages: 1 } }
    );
    const updateResult2 = await MessageUser.findOneAndUpdate(
      { email: recieverEmail, 'messages.uniqueId': id },
      { $set: { 'messages.$.text': 'Mez deleted' , "messages.$.isDeleted":true} },
    );

    if (updateResult1) {
      // Successfully updated the message
      res.status(200).json({ messages: updateResult1.messages });
    } else {
      // Message with the provided id not found
      res.status(401).send("Message not found or not updated.");
    }
  } catch (err) {
    console.error("Error deleting message:", err);
    res.status(500).send("Internal server error");
  }
});

const server = app.listen((process.env.PORT || 9001),()=>{
    console.log("The server is running on 4500 port")
}) 

global.onlineUsers = new Map();
global.onlineUsers2 = new Map();

const addMessageToUser = async (email1, message) => {
    try {
      const updatedDocument = await MessageUser.findOneAndUpdate(
        { email: email1 },
        { $push: { messages: message } },
        { new: true,select: 'messages'}
      );
      // console.log("Message added:", updatedDocument);
      return updatedDocument.messages
    } catch (err) {
      console.error("Error adding message:", err);
    }
  };

const io = socket(server, {
    cors: {
      origin: '*',
    },
    pingInterval: 2000,
    pingTimeout: 5000,
  });


  io.on('connection', (socket) => {

    socket.on('initiatingSocket', (data) => {
        console.log('Data received from the client: ' , data.senderEmail);
        onlineUsers.set(data.senderEmail, socket.id);
        onlineUsers2.set(socket.id, data.senderEmail);

        async function func(){
          const updatedMessages = await MessageUser.updateMany(
            {
              email: data.recieverEmail,
              'messages': {
                $elemMatch: {
                  'receiver': data.senderEmail,
                  'sender': data.recieverEmail
                }
              }
            },
            {
              $set: {
                'messages.$[element].isMezRead': true,
                'messages.$[element].isSent': true
              }
            },
            {
              arrayFilters: [
                { 'element.receiver': data.senderEmail, 'element.sender': data.recieverEmail }
              ]
            }
          );

          const updatedMessages2 = await MessageUser.updateMany(
            {
              'messages.receiver': data.senderEmail
            },
            {
              $set: {
                'messages.$[element].isSent': true
              }
            },
            {
              arrayFilters: [
                { 'element.receiver': data.senderEmail }
              ]
            }
          );


          // console.log(updatedMessages,'1')
          const socketIdOfReciever = onlineUsers.get(data.recieverEmail);
          if(updatedMessages.modifiedCount>0 && socketIdOfReciever){
            io.to(socketIdOfReciever).emit("userMezSeen1",{succes:true});
          }
        }
        func();
        socket.broadcast.emit("userComesOnline",{email:data.senderEmail})
    });

    socket.on("mezRecievingAtBackendAndSendingFromFrontend",(data)=>{
        const keyTofindSocketIdOfReciever = {username:data.recieverUsername,email:data.recieverEmail};
        const socketIdOfReciever = onlineUsers.get(data.recieverEmail);
        const socketIdOfRecieverForUnreadMEz = onlineUsers.get(data.recieverEmail+1);
        const socketIdOfsender = onlineUsers.get(data.senderEmail);
        const uniqueId = crypto.randomBytes(16).toString('hex');

        io.to(socketIdOfReciever).emit("recievingdataFromBackendAtFronend",{...data,uniqueId});
        io.to(socketIdOfRecieverForUnreadMEz).emit("recievingdataFromBackendAtFronendforUseList",data);

        // console.log(uniqueId);
        // console.log(data)
        newMessage = {
            sender:data.senderEmail,
            receiver:data.recieverEmail,
            type:data.type,
            type2:data.type2,
            text:data.mez,
            uniqueId:uniqueId
        }
        addMessageToUser(data.recieverEmail, newMessage);
       async function func(){
        const updatedChats = await addMessageToUser(data.senderEmail, {...newMessage,type2:"sent"});

        if(socketIdOfReciever){
          async function func(){
            console.log(data.senderEmail,data.recieverEmail)
            const updatedMessages2 = await MessageUser.updateMany(
              {
                email: data.senderEmail,
                'messages': {
                  $elemMatch: {
                    'receiver': data.recieverEmail,
                    'sender': data.senderEmail
                  }
                }
              },
              {
                $set: {
                  'messages.$[element].isSent': true
                }
              },
              {
                arrayFilters: [
                  { 'element.receiver': data.recieverEmail, 'element.sender': data.senderEmail }
                ],
                new: true // This option returns the updated document
              }
            );

            console.log(updatedMessages2,'2')
            if(updatedMessages2.modifiedCount>0){
             const updatedMez = await MessageUser.findOne({
                email: data.senderEmail,
                'messages': {
                  $elemMatch: {
                    'receiver': data.recieverEmail,
                    'sender': data.senderEmail
                  }
                }
              });
              // console.log(updatedMez);
              io.to(socketIdOfsender).emit("userMezSeen",{succes:true,messages:updatedMez.messages});
            }
          }
            func();
        }else{
          io.to(socketIdOfsender).emit('updatedChats',{sucess:true,messages:updatedChats})
        }
       }
       func()

    })

    socket.on('deleteMezForALl',(data)=>{
      const socketIdOfReciever = onlineUsers.get(data.recieverEmail);
      io.to(socketIdOfReciever).emit("deleteMezForALlEventHappened",data);
    })

    socket.on("imageOrVideo", (data) => {
        // Handle the received image or video data
        // You can save it to a file on your server or broadcast it to other connected clients
        const socketIdOfReciever = onlineUsers.get(data.recieverEmail);
        io.to(socketIdOfReciever).emit("receivedImageOrVideo", data);
      });

    socket.on("IsUserOnline",(data)=>{
      const socketIdOfReciever = onlineUsers.get(data.recieverEmail);
      const socketIdOfsender = onlineUsers.get(data.senderEmail);
      if(socketIdOfReciever){
        io.to(socket.id).emit("userOnline", data);
      }
    })

    socket.on("seenMez",(data)=>{
      const socketIdOfSeener = onlineUsers.get(data.seenerEmail);
      const socketIdOfsender = onlineUsers.get(data.senderEmail);
      async function func(){
        const updatedMessages = await MessageUser.updateMany(
          {
            email: data.senderEmail,
            'messages': {
              $elemMatch: {
                'receiver': data.seenerEmail,
                'sender': data.senderEmail
              }
            }
          },
          {
            $set: {
              'messages.$[element].isMezRead': true
            }
          },
          {
            arrayFilters: [
              { 'element.receiver': data.seenerEmail, 'element.sender': data.senderEmail }
            ]
          }
        );

        console.log(updatedMessages,'3')
        if(updatedMessages.modifiedCount>0){
          io.to(socketIdOfsender).emit("userMezSeen",{succes:true});
        }
      }
        func();
    })

    socket.on("likedMessage",(data)=>{
      const socketIdOfReciever = onlineUsers.get(data.recieverEmail);
      const socketIdOfsender = onlineUsers.get(data.senderEmail);
       console.log(data);
       async function func(){
        const update1 = await MessageUser.updateMany(
          {$and:[{$or:[{email:data.senderEmail},{email:data.recieverEmail}]},{'messages.uniqueId':data.uniqueId}]},
          {$set:{'messages.$.isLiked':true}},
          {
            arrayFilters: [
              { 'elem.uniqueId': data.uniqueId }
            ]
          }
          )
          if(update1.modifiedCount>1){
            io.to(socketIdOfReciever).emit("recievedLiked", data);
            io.to(socketIdOfsender).emit("likeSent",{uniqueId:data.uniqueId})
          }
       }
       func();
    })

    socket.on('disconnect', () => {
        console.log('user disconnected')
        console.log(onlineUsers.size,onlineUsers2.size)
        const userToDelete = onlineUsers2.get(socket.id)
        console.log('user to deletes',userToDelete)
        // socket.broadcast.emit("userDisconnected",userToDelete)
        const disconnectedUserEmail = userToDelete;
        io.emit('userGoesOffline',{email:disconnectedUserEmail});
        onlineUsers2.delete(socket.id);
        onlineUsers.delete(userToDelete);
      })
  })