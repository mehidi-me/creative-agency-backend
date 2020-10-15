const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const { ObjectID } = require("mongodb");
const dotenv = require('dotenv');
const fileUpload = require('express-fileupload')
dotenv.config();
const {PORT,USER,PASSWORD,DBNAME,} = process.env;

app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.json({ limit: "1mb" }));
app.use(cors());
app.use(express.static('upload-images'))
app.use(fileUpload())


const MongoClient = require("mongodb").MongoClient;
const uri =
 `mongodb+srv://${USER}:${PASSWORD}@cluster0.lh9qm.mongodb.net/${DBNAME}?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
client.connect((err) => {
  const userlistCollection = client.db("volunteer-network").collection("userlist");
  const clientReviewCollection = client.db("volunteer-network").collection("clientreview");
  const serviceCollection = client.db("volunteer-network").collection("services");
  const orderCollection = client.db("volunteer-network").collection("order");

  
  app.post("/userlist", (req, res) => {

    if (req.body !== {}) {
      userlistCollection.find({email:req.body.email}).toArray()
        .then((result) => {
          if(result.length > 0){
           
            result[0].role ? res.send({role:1}) : res.send({role:0})
          }else {
            userlistCollection.insertOne({email:req.body.email,role:req.body.role})
            .then(ress => {
              ress.insertedCount && res.send({role:ress.ops[0].role})
            })
            .catch((err) => res.send({ error: err }));
          }
        })
        .catch((err) => res.send({ error: err }));
    } else {
      res.send({ msg: "Error: Body Not Set" });
    }

  });


  app.post("/addreview", (req, res) => {

    if (req.body !== {}) {
      const {uname, cname, description, image} = req.body
            clientReviewCollection.insertOne({uname, cname, description, image})
            .then(ress => {
              ress.insertedCount && res.send({ msg: "Review Send successfully" })
            })
            .catch((err) => res.send({ error: err }));
    } else {
      res.send({ msg: "Error: Body Not Set" });
    }

  });


  app.post("/addservice", (req, res) => {

    if (req.body !== {} && req.files) {
     
      const {title, description} = req.body
      const file = req.files.file
      const currentDate = new Date()
      const fileName = currentDate.getTime() + file.name

      file.mv(`${__dirname}/upload-images/${fileName}`, error => {
        if(error){
          return res.send({msg:'file not upload'})
        }else{
          const path = `${fileName}`
         
          serviceCollection.insertOne({title, description, path})
            .then(ress => {
              ress.insertedCount && res.send({ msg: "Service Added successfully" })
            })
            .catch((err) => res.send({ error: err }));
        }
      })
            
    } else {
      res.send({ msg: "Error: Body Not Set" });
    }

  });


  app.get("/getreview", (req, res) => {
    clientReviewCollection.find({}).toArray()
      .then((data) => res.send(data))
      .catch(err => res.send({error: err}))
  })


  app.get("/getservice", (req, res) => {
    serviceCollection.find({}).toArray()
      .then((data) => res.send(data))
      .catch(err => res.send({error: err}))
  })


  app.get('/allorder',(req,res) => {
  
      orderCollection.aggregate([

        { $lookup:
          {
            from: 'services',
            localField: 'id',
            foreignField: '_id',
            as: 'service'
          }
        }

      ]).toArray()
      .then(result => res.send(result))
      .catch(err => res.send({error:err}))
  })


  app.post("/order", (req, res) => {

    if (req.body !== {}) {
   const ObjectId = require('mongodb').ObjectID 
          let id = new ObjectId(req.body.id)
          req.body.id = id
          orderCollection.insertOne(req.body)
        .then(() => res.send({ msg: "Order send successfully" }))
        .catch((err) => res.send({ error: err }));
    } else {
      res.send({ msg: "Error: Body Not Set" });
    }

  });


  app.get('/order/:email',(req,res) => {
    let userEmail = req.params.email
      orderCollection.aggregate([

        {$match: {userEmail}},

        { $lookup:
          {
            from: 'services',
            localField: 'id',
            foreignField: '_id',
            as: 'service'
          }
        }

      ]).toArray()
      .then(result => res.send(result))
      .catch(err => res.send({error:err}))
  })


  app.put('/updateorder',(req, res) => {
    let id = new ObjectID(req.body.id)
    const action = req.body.action
    orderCollection.updateOne(
      {_id:id},
      {$set:{action}},()=>{
        res.send({msg:'Action have been update successfully'})
      }
    )
  })



});


app.listen(PORT);
