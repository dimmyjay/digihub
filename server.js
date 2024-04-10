const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');


// const  paymentRoutes = require('./paymentRuotes')
const app = express();

const PORT = process.env.PORT || 3000;
const cors = require('cors');
app.use(cors());
app.use(express.json());
// yapp.use('/payments', paymentRoutes)

// Middleware to parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true }));
mongoose.connect('mongodb+srv://ecommerce:123JONATHANola@cluster0.u9fi7zi.mongodb.net/', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000, // Set a longer server selection timeout
  socketTimeoutMS: 45000, // Set a longer socket timeout
  heartbeatFrequencyMS: 10000, // Adjust heartbeat frequency
  retryWrites: true, // Set to true to enable retryable writes
});


const db = mongoose.connection;

db.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

db.once('open', () => {
  console.log('Connected to the database');
});



// Define a Product schema
const productSchema = new mongoose.Schema({
  name: String,
  price: String,
  description: String,
  image: String,
  productLink: String,
  section: String,
});  

const Product = mongoose.model('Product', productSchema);
const User = mongoose.model('User', {
  email: String,
  password: String,
  fullName: String, // Add a field for the user's full name
  location: String, // Add a field for the user's location
  profilePicture: String,
  signupMonth: String, // Field to store the signup month
  signupYear: String, // Field to store the signup year
  cart: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
      quantity: Number,
      productName: String,
      productPrice: Number,
    },
  ],
  section: String,
  
});





// // Set up storage using multer
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, 'uploads'); // Directory where the images will be stored
//   },
//   filename: function (req, file, cb) {
//     console.log('File fieldname:', file.fieldname);
//     console.log('Date.now():', Date.now());
//     cb(null, file.fieldname + '-' + Date.now() + '.jpg');
//   },
// });


// const upload = multer({ storage: storage });



// app.post('/upload-profile-picture', upload.single('image'), async (req, res) => {
//   try {
//     if (!req.user || !req.user.id) {
//       return res.status(401).json({ error: 'User is not authenticated' });
//     }

//     const userId = req.user.id;
//     const uploadedImageUrl = `/uploads/${req.file.filename}`;
//     console.log('Uploaded image filename:', req.file.filename); 
//     // Update the user's profile picture URL in the database
//     await User.findByIdAndUpdate(userId, { profilePicture: uploadedImageUrl });

//     res.json({ url: uploadedImageUrl });
//   } catch (error) {
//     console.error('Error handling the file upload:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });



app.post('/add-to-cart', verifyToken, async (req, res) => {
  const { productId, quantity } = req.body;
  console.log('Received request with productId:', productId, 'and quantity:', quantity);

  try {
    // Find the product with the given productId
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Get the user ID from the token
    const userId = req.user.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Find or create the user's cart
    let user = await User.findOne({ _id: userId });

    if (!user) {
      user = new User({ _id: userId, cart: [] });
    }

    // Check if the product is already in the user's cart
    const cartItem = user.cart.find((item) => item.productId.toString() === productId);

    if (cartItem) {
      // Update the quantity if the product is already in the cart
      cartItem.quantity += quantity;
    } else {
      // Add the product to the user's cart
      user.cart.push({
        productId: productId,
        quantity: quantity,
        productName: product.name,
        productPrice: product.price,
      });
    }

    // Save the user document with the updated cart
    await user.save();

    res.status(200).json({ message: 'Product added to cart successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});



// Define a route to create a Payment Intent and return the client secret
app.post('/create-payment-intent', async (req, res) => {
  try {
    // Create a Payment Intent with the required payment data
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 1000, // Replace with the actual payment amount in cents
      currency: 'usd', // Replace with the desired currency
      // Other Payment Intent options
    });

    // Send the Payment Intent client secret to your client
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Error creating Payment Intent:', error);
    res.status(500).send({ error: 'Could not create Payment Intent' });
  }
});

// Increase quantity route for user's cart
app.post('/increase-quantity', async (req, res) => {
  const { productId } = req.body;

  try {
    // Find the user by ID
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find the cart item for the specified product ID
    const cartItem = user.cart.find((item) => item.productId.toString() === productId);

    if (!cartItem) {
      return res.status(404).json({ message: 'Product not found in cart' });
    }

    // Increase the quantity
    cartItem.quantity += 1;

    // Save the user document with the updated cart
    await user.save();

    return res.status(200).json({ message: 'Quantity increased successfully', cartItem });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});
app.get('/get-cart-items', async (req, res) => {
  try {
    // Fetch cart items from the database
    const cartItems = await CartItem.find(); // Replace with your specific query or filter criteria if needed

    res.status(200).json({ cartItems });
  } catch (error) {
    console.error('Error fetching cart items:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
// Decrease quantity route
// Decrease quantity route for user's cart
app.post('/decrease-quantity', async (req, res) => {
  const { productId } = req.body;

  try {
    // Find the user by ID
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find the cart item for the specified product ID
    const cartItem = user.cart.find((item) => item.productId.toString() === productId);

    if (!cartItem) {
      return res.status(404).json({ message: 'Product not found in cart' });
    }

    // Decrease the quantity, ensuring it doesn't go below 1
    if (cartItem.quantity > 1) {
      cartItem.quantity -= 1;
    }

    // Save the user document with the updated cart
    await user.save();

    return res.status(200).json({ message: 'Quantity decreased successfully', cartItem });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});
const router = express.Router();
// Assuming you have a User model
// const auth = require('../middleware/auth');

// // Remove a product from the user's cart
// router.post('/remove-from-cart', auth, async (req, res) => {
//   try {
//     const { productId } = req.body;
//     const userId = req.user.id;

//     // Find the user by ID
//     const user = await User.findById(userId);

//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     // Find the cart item for the specified product ID and remove it
//     const updatedCart = user.cart.filter((item) => item.productId.toString() !== productId);

//     // Update the user document with the modified cart
//     user.cart = updatedCart;
//     await user.save();

//     return res.status(200).json({ message: 'Product removed from the cart', updatedCart });
//   } catch (error) {
//     console.error('Error:', error);
//     return res.status(500).json({ message: 'Internal server error' });
//   }
// });

module.exports = router;

app.get('/api/user-info', verifyToken, async (req, res) => {
  // Log incoming request details
  console.log('Received a request to /api/user-info');
  console.log('User ID from token:', req.user.id);

  // The user's information can be obtained from req.user
  const userId = req.user.id;

  // Log the user ID you're about to use to fetch user information
  console.log('Fetching user information for user ID:', userId);

  try {
    // Query the database to get the user's information
    const user = await User.findById(userId).exec();

    if (!user) {
      // Log when a user is not found
      console.log('User not found for user ID:', userId);
      return res.status(404).json({ message: 'User not found' });
    }

    // Log the retrieved user's information
    console.log('User information retrieved successfully:', user);

    // Return the user's information
    res.status(200).json({ user });
  } catch (error) {
    // Log any errors that occur during the fetch
    console.error('Error fetching user information:', error);
    res.status(500).json({ message: 'Error fetching user information' });
  }
});




// Define an API endpoint to add a product


// Define an API endpoint to add a product
// Define the route to add a product
app.post('/add-product', async (req, res) => {
  const { name, price, description, image, productLink, section, userId } = req.body;

  try {
    // Create a new product based on your Product model
    const product = new Product({
      name,
      price,
      description,
      image,
      productLink,
      section,
      userId, // Include the user ID
    });

    // Save the product to the database
    await product.save();

    res.status(201).json({ message: 'Product added successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to add the product' });
  }
});


app.get('/get-products', async (req, res) => {
  try {
    const { search } = req.query;
    console.log('Search Query:', search);
    let products;

    if (search) {
      products = await Product.find({
        name: { $regex: search, $options: 'i' }, // Perform a case-insensitive search on the 'name' field
      });
    } else {
      products = await Product.find();
    }

    res.status(200).json({ products });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch products' });
  }
});

app.use(bodyParser.json());


app.use('/uploads/profile-images', express.static('uploads/profile-images'));
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/profile-images'); // Set the destination folder for profile images
  },
  filename: function (req, file, cb) {
    const extname = path.extname(file.originalname);
    cb(null, Date.now() + extname); // Rename the uploaded file to include a timestamp
  },
});

const upload = multer({ storage: storage });

app.post('/api/register', upload.single('profilePicture'), async (req, res) => {
  try {
    const { email, password, section, fullName, location } = req.body;
    const profilePicture = req.file ? req.file.path : '';

    // Check if a user with the same email already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      // Return a response indicating that the email is already in use
      return res.status(400).json({ message: 'Email already in use' });
    }
    const normalizedProfilePicturePath = path.normalize(profilePicture);

    // If the email is unique, proceed with user registration
    const hashedPassword = await bcrypt.hash(password, 10);

    // Get the current date for signup month and year
    const currentDate = new Date();
    const signupMonth = currentDate.getMonth() + 1;
    const signupYear = currentDate.getFullYear();

    const user = new User({
      email,
      password: hashedPassword,
      section,
      profilePicture: normalizedProfilePicturePath,
      fullName,
      location,
      signupMonth,
      signupYear,
    });

    // Save the user to the database
    await user.save();

    // Generate a JWT token and send it in the response for authentication
    const token = generateAuthToken(user);

    // Return a response with the token and user information
    res.status(201).json({ token, user });
  } catch (error) {
    console.error(error);
    res.status(500).send('Registration failed');
  }
});

const secretKey = 'your_secret_key_here';

// Function to generate an authentication token (JWT)
function generateAuthToken(user) {
  const payload = {
    userId: user._id,
    email: user.email,
    // You can add more user information to the payload as needed
  };

  const options = {
    expiresIn: '1h', // Set the token expiration time
  };

  return jwt.sign(payload, secretKey, options);
}
// Example for user profile update
app.put('/api/update-profile/:userId', verifyToken, async (req, res) => {
  try {
    const userId = req.params.userId;
    const { section } = req.body;

    // Find the user by userId
    const user = await User.findByIdAndUpdate(userId, { section }, { new: true });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).send('Profile update failed');
  }
});


app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    res.status(401).send('User not found');
  } else {
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (passwordMatch) {
      const token = jwt.sign({ email: user.email, id: user.id }, 'your-secret-key');

      const userInformation = {
        id: user.id,
        email: user.email,
        profilePicture: user.profilePicture, // Include the profile picture URL
        fullName: user.fullName, // Include the full name
        location: user.location, // Include the location
        signupMonth: user.signupMonth, // Include the signup month
        signupYear: user.signupYear, // Include the signup year
      };

      res.status(200).json({ token, user: userInformation });
    } else {
      res.status(401).send('Authentication failed');
    }
  }
});


//Middleware to verify the token for protected routes
function verifyToken(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ message: 'Access denied' });

  jwt.verify(token, 'your-secret-key', (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Invalid token' });
    const { id } = decoded;
    // Now you have the user's ID
    req.user = { id };
    next();
  });
}

app.get('/api/protected-data', verifyToken, (req, res) => {
  // This route is protected, and only authenticated users can access it
  // You can implement logic to fetch the user's data from the database here
  res.status(200).json({ message: 'This is protected data.' });
});

// const stripe = require('stripe')('sk_test_4eC39HqLyjWDarjtT1zdp7dc');
// This example sets up an endpoint using the Express framework.
// Watch this video to get started: https://youtu.be/rPR2aJ6XnAc.
const stripe = require('stripe')('sk_test_51O3KjODqXMY9mqekYdQ1PyKg032DXRd4W9BdWHZAXky3pLXBo0WbyEQpPDVdWXMkFo9n5aHGRJiAhCjxzpAyaCas00vnk7u9Fb');

app.post('/payment-sheet', async (req, res) => {
  try {
    // Use an existing Customer ID if this is a returning customer.
    const customer = await stripe.customers.create();
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer.id },
      { apiVersion: '2023-10-16' }
    );

    // Calculate the total amount from the request (you may want to pass the total amount from the frontend)
    const totalAmount = req.body.amount || 1099; // Use 1099 as a default if not provided

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount, // Use the calculated total amount
      currency: 'usd', // Use USD as the currency
      customer: customer.id,
      // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.json({
      paymentIntent: paymentIntent.client_secret,
      ephemeralKey: ephemeralKey.secret,
      customer: customer.id,
      publishableKey: 'pk_test_51O3KjODqXMY9mqekPnDyRt1gX8jreyrYqs6FctzL8YOi8HSEdezMsxauO80jxfaUDHdesZA0u5P2OVTwof8XTfb700YHWLB2x4', // Replace with your actual publishable key
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: 'Server error' });
  }
});
app.post("/pay", async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ message: "Invalid amount" });

    // Create a payment intent with the provided amount
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount ), // Convert the amount to cents
      currency: "usd",
      payment_method_types: ["card"],
    });

    const clientSecret = paymentIntent.client_secret;
    res.json({ message: "Payment initiated", clientSecret });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});
const purchaseHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  productImage: String,
  productName: String,
  price: String,
  // Add more fields as needed
});

const PurchaseHistory = mongoose.model('PurchaseHistory', purchaseHistorySchema);

// Route to get purchase history for a user
app.get('/api/purchase-history', verifyToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const purchaseHistory = await PurchaseHistory.find({ userId });

    res.status(200).json(purchaseHistory);
  } catch (error) {
    console.error('Error fetching purchase history:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Route to add an item to purchase history
app.post('/api/add-to-history', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const { productImage, productName, price } = req.body;

  try {
    const purchase = new PurchaseHistory({
      userId,
      productImage,
      productName,
      price,
    });

    await purchase.save();

    res.status(201).json({ message: 'Item added to purchase history' });
  } catch (error) {
    console.error('Error adding item to purchase history:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Route to delete an item from purchase history
app.delete('/api/delete-from-history/:purchaseId', verifyToken, async (req, res) => {
  const purchaseId = req.params.purchaseId;

  try {
    const purchase = await PurchaseHistory.findById(purchaseId);

    if (!purchase) {
      return res.status(404).json({ message: 'Purchase not found' });
    }

    await purchase.remove();

    res.status(200).json({ message: 'Item deleted from purchase history' });
  } catch (error) {
    console.error('Error deleting item from purchase history:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

//upload slider
app.use('/uploads', express.static('uploads'));


let File;
try {
  // If the model exists, use it; otherwise, define it
  File = mongoose.model('File') || mongoose.model('File', { filePath: String });
} catch (error) {
  File = mongoose.model('File', { filePath: String });
}

const storage2 = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueFilename = `${Date.now()}-${Math.round(Math.random() * 1E9)}-${file.originalname}`;
    cb(null, uniqueFilename);
  },
});

const upload2 = multer({
  storage: storage2,
  fileFilter: function (req, file, cb) {
    if (file.fieldname === 'file') {
      cb(null, true);
    } else {
      cb(new Error('Unexpected field'));
    }
  },
});

app.post('/upload', upload2.single('file'), async (req, res) => {
  try {
    const uploadedFilePath = req.file ? path.normalize(req.file.path) : '';

    // Create a new instance of the 'File' model
    const newFile = new File({ filePath: uploadedFilePath });
    await newFile.save();

    res.json({ message: 'File uploaded successfully!', filePath: uploadedFilePath });
  } catch (error) {
    console.error('Error handling the file upload:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

app.get('/get-uploaded-images', async (req, res) => {
  try {
    const images = await File.find({}, 'filePath');
    const imageUrls = images.map((image) => path.normalize(image.filePath));

    console.log('Requested Image URLs:', imageUrls);

    res.json({ images: imageUrls });
  } catch (error) {
    console.error('Error fetching uploaded images:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
app.get('/get-all-users', async (req, res) => {
  try {
    // Log that the endpoint is being called
    console.log('Fetching all users');

    // Extract pagination parameters from the request query or use default values
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Fetch users from the database with pagination
    const users = await User.find().skip(skip).limit(limit);

    // Log the number of users retrieved
    console.log(`Fetched ${users.length} users for page ${page}`);

    // Send the users as JSON response
    res.json(users);
  } catch (error) {
    // Log any errors that occur during fetching
    console.error('Error fetching users:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(3000, '192.168.43.178', () => {
  console.log('Server is running on http://192.168.43.178:3000');
});


