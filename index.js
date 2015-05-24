/**
 * Created by igor on 5/23/2015.
 */

var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var sessions = require('client-sessions');
var bcrypt = require('bcryptjs');


var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/test');

app.set('view engine','ejs');

var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;


//User Model
var User = mongoose.model('User',new Schema({
	id: ObjectId,
	username: {type:String,unique:true},
	password: {type:String}
}));




// Middleware
app.use(express.static(__dirname + '/public'));
app.use( bodyParser.json() );   
app.use(bodyParser.urlencoded({ 
  extended: true
}));

app.use(sessions({
	cookieName: 'session',
	secret: "ThisIsSecretStringToHashTheCookie",
	duration: 10 * 6000,
	activeDuration: 2 * 6000
}));




//Routes

//Signup Route GET
app.get('/signup',function(request,response){

	//response.send('asd');
	response.render('signup');
});

//Signup Route POST
app.post('/signup',function(req,res){

	var pass = bcrypt.hashSync(req.body.password,bcrypt.genSaltSync(10));

	var user = new User({
		username : req.body.username,
		password: pass
	});

	user.save(function(err){
		if(err){
			if(err.code == 11000){
			var errs = 'Username is being used';
			res.render('signup',{error:errs});
			}
		}else
		{
			res.redirect('/chat');
		}
		

		

	});
});

//Login Route GET & POST
app.get('/login',function(req,res){

	res.render('login');
});

app.post('/login',function(req,res){

	User.findOne({username:req.body.username},function(err,user){
		
		if(user){
			if(bcrypt.compareSync(req.body.password,user.password)){
				req.session.user = user;
				res.redirect('/chat');
			}
			}else{
				req.session.reset();
				res.render('login');
			}
			
	});
	
});




//Chat Route GET & POST
app.get('/chat',function(req,res){

	if(req.session && req.session.user){
		User.findOne({username:req.session.user.username},function(err,user){
			if(!user){
				req.session.reset();
				res.redirect('/login');
			}else
			{
				User.findOne({username:'foo2'},function(err,user){
					res.json(user);
				})
			}
		});
	}else{
		res.redirect('/login');
	}
	
	
});

app.post('/chat',function(req,res){

	//TODO chat module
});

app.get('/logout',function(req,res){

	if(req.session && req.session.user){
		req.session.reset();
	}

	res.redirect('/login');
});

//add listener
var server = app.listen(3000,function(){
    console.log("Started On Port# 3000");
})

