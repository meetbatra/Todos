const express = require('express');
const app = express()
const mongoose = require('mongoose');
const path = require('path');
const methodOverride = require('method-override');
const ejsMate = require('ejs-mate');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('./models/user.js');
const Todo = require('./models/todo.js');
const flash = require('connect-flash');
const { isLoggedIn, isOwner } = require('./middleware.js');
require('dotenv').config()
const MongoStore = require('connect-mongo');

app.engine('ejs', ejsMate);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(methodOverride('_method'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname,'public')));

const dbUrl = process.env.ATLASDB_URL;

main()
.then(() => console.log('connected'))
.catch(err => console.log(err));

async function main() {
  await mongoose.connect(dbUrl);
};

const store = MongoStore.create({
    mongoUrl: dbUrl,
    crypto: {
        secret: 'mysupersecretcode'
    },
    touchAfter: 24 * 3600
});

store.on('error', (err) => {
    console.log('ERROR IN MONGO SESSION STORE', err);
});

const sessionOptions = {
    store,
    secret: 'mysupersecretcode',
    resave: false,
    saveUninitialized: true,
    cookie: {
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true
    }
};

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    res.locals.currUser = req.user;
    next();
});

app.get('/', (req,res) => {
    if(req.user){
        return res.redirect('/todos');
    }
    res.render('users/login.ejs');
});

app.post('/', passport.authenticate('local', {failureRedirect: '/', failureFlash: true}), (req,res) => {
    req.flash('success', 'Welcome Back');
    res.redirect('/todos');
});

app.get('/signup', (req,res) => {
    res.render('users/signup.ejs');
});

app.post('/signup', async (req,res) => {
    try{
        let {email, username, password} = req.body;
        const newUser = new User({email, username});
        const registeredUser = await User.register(newUser, password);
        req.login(registeredUser, (err) => {
            if(err){
                console.log(err);
            }
            req.flash('success', 'Start creating your own Todo list');
            res.redirect('/todos');
        });
    }
    catch(e){
        req.flash('error', e.message);
        res.redirect('/signup');
    }
});

app.get('/logout', (req,res) => {
    req.logout((err) => {
        if(err){
            console.log(err);
        }
        req.flash('success', 'Logged out!');
        res.redirect('/');
    });
});

app.get('/todos', isLoggedIn, async (req,res) => {
    let user = req.user;
    let userTodos = await Todo.find({ userId: user._id});
    res.render('todos/todo.ejs', {userTodos});
});

app.post('/todos', isLoggedIn, async(req,res) => {
    let { todo } = req.body;
    let newTodo = new Todo({ message: todo, userId: req.user._id});
    await newTodo.save()

    req.flash('success', 'Todo added!')
    res.redirect('/todos')
});

app.get('/todos/:id', isLoggedIn, async(req,res) => {
    let todo = await Todo.findById(req.params.id);
    let user = await User.findById(todo.userId);
    res.render('todos/edit.ejs', {todo, user});
});

app.put('/todos/:id', isLoggedIn, isOwner, async(req,res) => {
    let message = req.body.todo;
    await Todo.findByIdAndUpdate(req.params.id, {message});
    req.flash('success', 'Todo updated');
    res.redirect('/todos');
});

app.delete('/todos/:id', isLoggedIn, isOwner, async(req,res) => {
    let id = req.params.id;
    await Todo.findByIdAndDelete(id);
    req.flash('success', 'Todo deleted!');
    res.redirect('/todos');
});

app.listen(8080, () => {
    console.log('Server is listening at port 8080');
});