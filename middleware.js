const Todo = require('./models/todo.js');

module.exports.isLoggedIn = (req,res,next) => {
    if(!req.isAuthenticated()){
        req.flash('error', 'You must be logged in!');
        return res.redirect('/');
    }
    next();
}

module.exports.isOwner = async (req,res,next) => {
    let id = req.params.id;
    let todo = await Todo.findById(id);
    if(!todo.userId.equals(res.locals.currUser._id)){
        req.flash('error', 'This is not your todo!');
        return res.redirect('/todos');
    }
    next()
}