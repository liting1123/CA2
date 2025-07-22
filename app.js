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
    req.flash('error', 'Please log in to food menu');
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

 
const strongPasswordRegex = /^(?=.{6,12}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{6,}$/;
  if (!strongPasswordRegex.test(password)) {
    req.flash('error', 'Password must be 6–12 characters long and include at least one uppercase letter and one lowercase letter' +
      'and one special character (!@#$%^&*).');
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
 
 
// Starting the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Foodiess is running on http://localhost:${PORT}`);
});