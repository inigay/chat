/**
 * Created by igor on 5/23/2015.
 */

var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var sessions = require('client-sessions');
var bcrypt = require('bcryptjs');

var mongodb = require('mongojs');
var db = mongodb('users',['users']);

app.set('view engine','ejs');



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
app.post('/signup',function(request,response){

	var pass = bcrypt.hashSync(req.body.pasword,bcrupt.genSaltSync(10));

	db.users.insert({username : request.body.username, password : pass},function(err,user){
		if(err){
			response.render('signup',{error:'Something Went wrong Username is not created'});
		}
		response.redirect('chat');
	});
});

//Login Route GET & POST
app.get('/login',function(req,res){

	res.render('login', {error:'asd'});
});

app.post('/login',function(req,res){

	db.users.findOne({username:req.body.username},function(err,user){
		
		if(user){
			if(bcrypt.compareSync(req.body.password,user.password)){
				req.session.user = user;
				res.redirect('/chat');
			}
			else{
				res.render('login',{error : 'Password is incorrect'});
			}
		}else{
			res.render('login', {error : 'Username does not exist'});
		}
			
	});
	
});




//Chat Route GET & POST
app.get('/chat',function(req,res){

	res.render('chat');
});

app.post('/chat',function(req,res){

	//TODO chat module
});



//add listener
var server = app.listen(3000,function(){
    console.log("Started On Port# 3000");
})

