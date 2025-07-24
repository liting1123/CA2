const express = require('express');
const mysql = require('mysql2');

const session = require('express-session');
 
const flash = require('connect-flash');
 
const app = express();
 
// Database connection
const db = mysql.createConnection({
    host: 'glpfrl.h.filess.io',
    user: 'CA2_sumtopwar',
    password: '2d8a6da63a6676e514d71a0955e42fb8d4ddd4c7',
    database: 'CA2_sumtopwar',
    port: 3307
});

db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('Connected to Food Service database');
});
 
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));
 
//******** TODO: Insert code for Session Middleware below ********//
app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: true,
  // Session expires after 1 week of inactivity
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
}));

app.use(flash());
 
// Setting up EJS
app.set('view engine', 'ejs');
 
const checkAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  } else {
    req.flash('error', 'Please log in to view !!!!!');
    res.redirect('/login');
  }
};
 
const checkAdmin = (req, res, next) => {
  if (req.session.user.role === 'admin') {
    return next();
  } else {
    req.flash('error', 'Sorry ,Access denied!');
    res.redirect('/dashboard');
  }
};
 

app.get('/', (req, res) => {
    res.render('index', { user: req.session.user, messages: req.flash('success')});
});
 
app.get('/register', (req, res) => {
    res.render('register', { messages: req.flash('error'), formData: req.flash('formData')[0] });
});
 
 
const validateRegistration = (req, res, next) => {
  const { username, email, password, address, contact } = req.body;
 
  if (!username || !email || !password || !address || !contact) {
    return res.status(400).send('All fields are required.');
  }

const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]+$/;
  if (!strongPasswordRegex.test(password)) {
    req.flash('error', 'Password must include at least one uppercase letter, one lowercase letter, ' +
    'one digit, and one special character (!@#$%^&*).');
    req.flash('formData', req.body);
    return res.redirect('/register');
  }
  next();
  }
 
app.post('/register',validateRegistration, (req, res) => {
    const { username, email, password, address, contact, role} = req.body;
 
    const sql = 'INSERT INTO user (username, email, password, address, contact, role) VALUES (?, ?, SHA1(?), ?, ?, ?)';
    db.query(sql, [username, email, password, address, contact, role], (err, result) => {
        if (err) {
            throw err;
        }
        console.log(result);
        req.flash('success', 'Registration successful! Please log in.');
        res.redirect('/login');
    });
});
 
app.get('/login', (req, res) => {
  res.render('login', {
    messages: req.flash('success'), // Retrieve success messages from the session and pass them to the view
    errors: req.flash('error')      // Retrieve error messages from the session and pass them to the view
  });
});
 
app.post('/login', (req, res) => {
  const { email, password } = req.body;
 

  if (!email || !password) {
    req.flash('error', 'All fields are required.');
    return res.redirect('/login');
  }
 
  const sql = 'SELECT * FROM user WHERE email = ? AND password = SHA1(?)';
  db.query(sql, [email, password], (err, results) => {
    if (err) {
      throw err;
    }
 
    if (results.length > 0) {
      // Successful login
      req.session.user = results[0];           
      req.flash('success', 'Login successful! You can start order your food now.');
      res.redirect('/dashboard');
    } else {
      // Invalid credentials
      req.flash('error', 'Invalid email or password.');
      res.redirect('/login');
    }
  });
});
 

app.get('/dashboard', checkAuthenticated, (req, res) => {
  res.render('dashboard', { user: req.session.user });
});

app.get('/admin', checkAuthenticated, checkAdmin, (req, res) => {
  res.render('admin', { user: req.session.user });
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});
 
// Menu 
app.get('/menu', (req,res) => {
    const sql = 'SELECT idmenuItems,name,image,quantity,price,category from menuItems';
    db.query(sql, (error, results) => {
        if (error) {
            console.error('Error fetching menu items:' ,error);
            return res.status(500).send('Error fetching menu items');
            
            }
        res.render('menu', { food: results,
          user: req.session.user}
          
        )
        })
        
    });
  
  // inventory
app.get('/inventory', (req,res) => {
    const sql = 'SELECT idmenuItems,name,image,quantity,price,category from menuItems';
    db.query(sql, (error, results) => {
        if (error) {
            console.error('Error fetching menu items:' ,error);
            return res.status(500).send('Error fetching menu items');
            
            }
        res.render('inventory', { food: results,
          user: req.session.user}
          
        )
        })
        
    });
  

// View each menu item by id
app.get('/food/:id', (req, res) => {
    const id = req.params.id;
    const sql = 'SELECT * from menuItems WHERE idmenuItems = ?';
           db.query(sql, [id],(error, results) => {
        if (error) {
            console.error('Error fetching menu items:' ,error);
            return res.status(500).send('Error fetching menu items');
            
            }
        res.render('food', { food: results[0],
          user: req.session.user}
          
        )
        })
        
    });

  app.post('/add-to-cart/:id', checkAuthenticated, (req, res) => {
      const idmenuItems = parseInt(req.params.id);
      const quantity = parseInt(req.body.quantity) || 1;

      db.query('SELECT * FROM menuItems WHERE idmenuItems = ?', [idmenuItems], (error, results) => {
          if (error) throw error;

          if (results.length > 0) {
              const menuItems = results[0];

              // Initialize cart in session if not exists
              if (!req.session.cart) {
                  req.session.cart = [];
              }

              // Check if food already in cart
              const existingItem = req.session.cart.find(item => item.idmenuItems === idmenuItems);
              if (existingItem) {
                  existingItem.quantity += quantity;
              } else {
                  req.session.cart.push({
                      idmenuItems: menuItems.idmenuItems,
                      name: menuItems.name,
                      price: menuItems.price,
                      quantity: quantity,
                      image: menuItems.image
                  });
              }

            res.redirect('/cart');
        } else {
            res.status(404).send("Product not found");
        }
    });
});

app.get('/cart', checkAuthenticated, (req, res) => {
    const cart = req.session.cart || [];
    res.render('cart', { cart, user: req.session.user });
});
app.post('/placeOrder', checkAuthenticated, async (req, res) => {
    const iduser = req.session.id; 
    const totalAmount = parseFloat(req.body.totalAmount);
    const cartItems = req.body.cartItems;

    if (!iduser) { // Check for iduser
        req.flash('error_msg', 'You must be logged in to place an order.');
        return res.redirect('/login');
    }

    if (!cartItems || cartItems.length === 0) {
        req.flash('error_msg', 'Your cart is empty. Please add items before placing an order.');
        return res.redirect('/cart');
    }

    else{
      return res.redirect('/orderConfirmation');
    }

    try {
        await db.beginTransaction();

        // 1. Insert into the `order` table
        const orderQuery = 'INSERT INTO order (iduser, orderDate, totalPrice, status) VALUES (?, NOW(), ?, ?)';
        const [orderResult] = await db.promise().execute(orderQuery, [iduser, totalAmount, 'pending']);
        const idorder = orderResult.insertId; 

        // 2. Insert into the `order_items` table for each item in the cart
        const orderItemQuery = 'INSERT INTO orderItems (idorder, idmenuItems, name, image, quantity) VALUES (?, ?, ?, ?, ?)';

        const itemsToProcess = Array.isArray(cartItems) ? cartItems : [cartItems];

        for (const itemString of itemsToProcess) {
            const item = JSON.parse(itemString);
            // Use idorder here
            await db.promise().execute(orderItemQuery, [idorder, item.idmenuItems, item.name, item.image, item.quantity]);
        }

        await db.promise().commit();

        req.session.cart = []; // Clear the cart from the session
        req.flash('success_msg', `Order #${idorder} placed successfully!`); // Use idorder
        res.redirect('/orderConfirmation/' + idorder); // Use idorder and correct route name

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('Error placing order:', error);
        req.flash('error_msg', 'There was an error placing your order. Please try again.');
        res.redirect('/cart');
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

//OrderConfirmatiom
app.get('/orderConfirmation/:idorder', checkAuthenticated, async (req, res) => {
    const idorder = req.params.idorder;
    const iduser = req.session.iduser; 

    try {
        // Fetch order details for the logged-in user
        const [orderRows] = await connection.execute('SELECT * FROM order WHERE idorder = ? AND iduser = ?', [idorder, iduser]);
        const order = orderRows[0];

        if (!order) {
            req.flash('error_msg', 'Order not found or you do not have permission to view it.');
            return res.redirect('/dashboard');
        }

        // Fetch items for this order and JOIN with menuItems to get current prices
        const [itemRows] = await connection.execute(
            'SELECT oi.idorderItems, oi.idorder, oi.idmenuItems, oi.name, oi.image, oi.quantity, m.price ' +
            'FROM order_items oi JOIN menuItems m ON oi.idmenuItems = m.idmenuItems ' + // Corrected JOIN condition to oi.idmenuItems = m.idmenuItems
            'WHERE oi.idorder = ?',
            [idorder] // Use idorder here
        );
        order.items = itemRows;res.render('orderConfirmation', { user: req.session.user, order: order });
    } catch (error) {
        console.error('Error fetching order confirmation:', error);
        req.flash('error_msg', 'Could not retrieve order details.');
        res.redirect('/menu');
    } finally {
        if (connection) connection.release();
    }
});

app.get('/editInventory/:id',(req,res) => {
    const idmenuItems = req.params.id;
    const sql = 'SELECT * FROM menu WHERE idmenuItems = ?';

    connection.query( sql , [idmenuItems], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error retrieving product by ID');
        }

        if (results.length > 0 ) {
            res.render('editInventory', { menu: results[0] });
        } else {
            res.status(404).send('Order not found');
        }
    });
});



// Starting the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Foodiess is running on http://localhost:${PORT}`);
});
