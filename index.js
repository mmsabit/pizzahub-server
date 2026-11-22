import express from 'express'
import cors from "cors"
import { MongoClient, ObjectId } from "mongodb";
import 'dotenv/config'
import Stripe from "stripe";
import { createRemoteJWKSet, jwtVerify } from "jose";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const app = express()
const port = process.env.PORT || 8000

app.use(cors());
app.use(express.json());

const client = new MongoClient(`${process.env.Db_URI}`);

export async function connectToMongoDB(){
    try{
        await client.connect();
        console.log("successfully connected")
        return client;
    }
    catch(err){
        console.dir();
    }
}

const connectedClient = await connectToMongoDB();
const db = connectedClient.db('pizza_hub');
const menus = db.collection('menus');
const order = db.collection('order');
const payments = db.collection('payments');
const user = db.collection('user');

const jwks = createRemoteJWKSet(
    new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
);

const VerifyToken = async (req,res,next) =>{
    const authHeader = req.headers.authorization;
    
    if(!authHeader){
        return res.status(401).send({message: "Unauthorized Access"})
    }

    const token = authHeader.split(' ')[1];

    if(!token){
        return res.status(401).send({message: "Unauthorized Access"})
    }

    try{
        const { payload } = await jwtVerify(token, jwks);
        let role = payload.role;

        if (!role && payload.sub) {
            try {
                const account = await user.findOne({ _id: new ObjectId(payload.sub) });
                role = account?.role;
            } catch {
                role = undefined;
            }
        }

        req.user = { ...payload, role };
        next();
    }
    catch(err){
        return res.status(401).send({message: "Invalid or expired token"})
    }
}

const verifyUser = async (req, res, next) => {
    if (req.user?.role !== 'user') {
        res.status(403).send({ message: 'Forbidden' });
        return;
    }
    next();
}

const verifyVendor = async (req, res, next) => {
    if (req.user?.role !== 'vendor') {
        res.status(403).send({ message: 'Forbidden' });
        return;
    }
    next();
}

const verifyAdmin = async (req, res, next) => {
    if (req.user?.role !== 'admin') {
        res.status(403).send({ message: 'Forbidden' });
        return;
    }
    next();
}

const verifyVendorOrAdmin = async (req, res, next) => {
    if (req.user.role !== 'admin'||req.user.role !== 'vendor') {
        res.status(403).send({ message: 'Forbidden' });
        return;
    }
    next();
}



app.get('/',(req,res) =>{
    res.send("Ready with your pizza")
})

//All API

app.get('/menus/search', async (req, res) => {
    try {
      const search = req.query.search;

      const result = await menus.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { category: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { 'vendor.name': { $regex: search, $options: 'i' } }
        ]
      }).toArray();

      res.send(result);
    } catch (error) {
      res.status(500).send({ message: 'Search failed' });
    }
});

app.get('/order/:id',VerifyToken, async(req, res) => {
  const id = req.params.id;
  const result = await order.findOne({_id: new ObjectId(id)});
  res.send(result);
})

app.get('/menu/:id',VerifyToken, async(req, res) => {
  const id = req.params.id;
  const result = await menus.findOne({_id: new ObjectId(id)});
  res.send(result);
})


 
// Open API
app.get('/menu',async(req,res) =>{
  const menuItem = await menus.find({status: "approved"}).toArray();
  res.send(menuItem);
})

app.get('/available-menu', async(req, res)=>{
  const availMenu = await menus.find({available: true, status: "approved"}).toArray();
  res.send(availMenu);
})

app. get('/featured_menu', async(req, res)=>{
  const data = await menus.find({ featured: true }).toArray();
  res.send(data)
})
//Vendor API
app.get('/menus/:vendorId',VerifyToken,verifyVendor, async (req, res) => {
  const vendorId = req.params.vendorId;
  const menu = await menus.find({'vendor.id': vendorId, status: { $ne: "rejected" }},{
      projection: {
        description: 0,
        vendor: 0,
      },
    }
    ).toArray();
  res.send(menu)
})

app.post('/menus',VerifyToken,verifyVendor,async(req,res) =>{
  const newData = req.body;
  const vendorId = newData.vendor.id;
  const vendorUser = await user.findOne({ _id: new ObjectId(vendorId) });
  const premium = vendorUser.premium;
  
  if(!premium){
    const menuCount = await menus.countDocuments({'vendor.id': vendorId});
    if(menuCount >= 3){
      return res.status(403).send({
          message: "You reached your free limit. Upgrade your plan."
        });
    }
  }
   const result = await menus.insertOne(newData);
   res.send(result);
})

app.patch('/order/:id',VerifyToken, async(req,res)=>{
  const id = req.params.id;
    const updateData = req.body;
    const filter = {_id: new ObjectId(id)};
    const options = { upsert: true };
    const updateDoc = {
        $set: updateData,
    };
    const result = await order.updateOne(filter, updateDoc, options);
    res.send(result);
})

// Vendor and Admin


app.delete('/menu/:id',VerifyToken,verifyVendorOrAdmin, async(req,res)=>{
  const id = req.params.id;
  const query = {_id: new ObjectId(id)};
  const result = await menus.deleteOne(query);
  res.send(result);
})

app.patch('/menu/:id',VerifyToken,verifyVendorOrAdmin, async(req,res)=>{
  const id = req.params.id;
  const updateData = req.body;
  const menuId = new ObjectId(id);

  if (updateData.featured === true) {
    const menuItem = await menus.findOne({ _id: menuId });
    if (!menuItem) {
      return res.status(404).send({ message: 'Menu item not found' });
    }
    if (menuItem.status !== 'approved') {
      return res.status(422).send({ message: 'Only approved menu items can be featured' });
    }

    const vendorId = menuItem.vendor?.id;
    if (!vendorId || !ObjectId.isValid(vendorId)) {
      return res.status(403).send({ message: 'Only Premium vendors can feature menu items' });
    }

    const vendorUser = await user.findOne(
      { _id: new ObjectId(vendorId) },
      { projection: { premium: 1 } },
    );
    if (vendorUser?.premium !== true) {
      return res.status(403).send({ message: 'Only Premium vendors can feature menu items' });
    }

  }

  const filter = { _id: menuId };
  const options = { upsert: true };
  const updateDoc = { $set: updateData };
  const result = await menus.updateOne(filter, updateDoc, options);
  res.send(result);
})

app.get('/vendor_order/:vendorid',VerifyToken,verifyVendor, async(req, res) => {
  const id = req.params.vendorid;
  const result = await order.find({"vendor.id": id}).toArray();
  res.send(result);
})

//ADMIN API

app.get('/adminmenu/',VerifyToken,verifyAdmin,async(req,res) =>{
  const menuItem = await menus.find({}).toArray();
  res.send(menuItem);
})

app.patch('/adminmenu/:id',VerifyToken,verifyAdmin, async (req, res) => {
  const id = req.params.id;
  const updatedData = req.body;

  if (Object.prototype.hasOwnProperty.call(updatedData, 'featured')) {
    return res.status(403).send({
      message: 'Featured status is managed by Premium vendors',
    });
  }

  const menuId = new ObjectId(id);
  const result = await menus.updateOne({ _id: menuId }, { $set: updatedData });
  res.send(result);
});

app.get('/order',VerifyToken,verifyAdmin, async(req, res)=>{
  const result = await order.find().toArray();
  res.send(result);
})

app.get('/payment',VerifyToken,verifyAdmin, async(req, res)=>{
  const result = await payments.find().toArray();
  res.send(result);
})

app.get('/vendor-data/:id',VerifyToken,verifyAdmin, async(req, res) =>{
  const id = req.params.id;
  const result = await user.findOne({_id: new ObjectId(id)});
  res.send(result);
})

app.get('/vendor',VerifyToken,verifyAdmin,async(req, res) =>{
  const result = await user.find({role:"vendor"}).toArray();
  res.send(result);
} )

app.get('/user',VerifyToken,verifyAdmin,async(req, res) =>{
  const result = await user.find({role:"user"}).toArray();
  res.send(result);
} )

//USER API

app.post('/order',VerifyToken,verifyUser, async (req, res) =>{
  const newData = req.body;
  const uid = newData.customer.id;
  const deliverdate = newData.deliveryDate;

  const deliveryVerify = await order.findOne({"customer.id": uid, deliveryDate:deliverdate});
  if(deliveryVerify){
    return res.status(403).send({
          message: "You already order same item in same date"
        });
  }

  const result = await order.insertOne(newData);
  res.send(result);
})

app.get('/customer_order/:userid',VerifyToken,verifyUser, async(req, res) => {
  const id = req.params.userid;
  const result = await order.find({"customer.id": id}).toArray();
  res.send(result);
})

app.post('/payments/checkout-verify',VerifyToken,verifyVendor, async (req, res)=>{
  const {sessionId} = req.body

  if (!sessionId) {
        return res.send({ success: false, message: 'Session ID is required' });
    }

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const {
    client_reference_id,
    status,
    payment_status,
    customer_email,
    metadata,
    payment_intent,
  } = session;


  if(status === 'complete' && payment_status === 'paid'){

    const sessionQuery = { sessionId };
    const existingPayment = await payments.findOne(sessionQuery);
    if (existingPayment) {
            return res.send({ success: false, message: 'Payment already verified' });
        }
    const paymentData = {
    client_reference_id,
    sessionId,
    status,
    payment_status,
    customer_email,
    metadata,
    payment_intent,
  };
  const result = await payments.insertOne(paymentData);

  const query = { _id: new ObjectId(client_reference_id) };

        const updatedDoc = {
            $set: {
                premium: true,
            }
        }
        const updateResult = await user.updateOne(
            query,
            updatedDoc
        );
        res.send({ success: true, result, updateResult });
  }

  res.send({ success: false, message: 'Payment verification failed' });
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})