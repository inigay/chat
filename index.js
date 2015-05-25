/**
 * Created by igor on 5/23/2015.
 */

var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var sessions = require('client-sessions');
var bcrypt = require('bcryptjs');

var server = require('http').createServer(app);
io = require('socket.io').listen(server);

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/test');

app.set('view engine','ejs');

var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;


//User Model


var User = mongoose.model('User',new Schema({
	id: ObjectId,
	username: {type:String,unique:true},
	password: {type:String},
	contacts:[{
		contactName:String,
		notifications: {type:Number,default:0},
		threadId:ObjectId
	}]
}));


var Thread = mongoose.model('Thread',new Schema({
	id:ObjectId,
	participants:[String],
	messages:[{
		sender:String,
		message:String,
		sent:Date
	}]
}));


var Socket = mongoose.model('Socket',new Schema({
	id:ObjectId,
	socketId:String,
	username:String
}));



// Middleware
app.use(express.static(__dirname + '/public'));
app.use( bodyParser.json() );   
app.use(bodyParser.urlencoded({ 
  extended: true
}));


var sessionClient = sessions({
	cookieName: 'session',
	secret: "ThisIsSecretStringToHashTheCookie",
	duration: 100 * 6000,
	activeDuration: 20 * 6000
});



app.use(sessionClient);
app.use(sessionMid);





function sessionMid(req,res,next){

	if(req.session && req.session.user){
		User.findOne({username:req.session.user.username},function(err,user){
			if(user){
				req.user = user;
				delete req.user.password;
				req.session.user = user;
				res.locals.user = user;
			}
			delete req.session;
			//delete req.user;
			next();
		});
	}else{
		next();
	}
	
}


function authenticate(req,res,next){
	if(!req.user){
		res.redirect('/login');
	}else
	{
		next();
	}

}

io.use(function(socket, next) {
	sessionClient(socket.request, socket.request.res, next);
});


//just for comparison
function compare(a,b) {
	if (a.sent < b.sent)
	  return -1;
	else if (a.sent > b.sent)
	  return 1;
	else
	  return 0;
}


//Routes

//Signup Route GET
app.get('/signup',function(request,response){


	//response.send('asd');
	response.render('signup');
});

//Signup Route POST
app.post('/signup',function(req,res){

	var pass = bcrypt.hashSync(req.body.password,bcrypt.genSaltSync(10));

	//var contact = new Contact();

	var user = new User({
		username : req.body.username,
		password : pass
	});

	user.save(function(err,user){
		if(!err){

			req.session.user = user;
			res.redirect('/chat');
			
		}else
		{
			console.log(err);
			if(err.code == 11000){
				var errs = 'Username is being used';
				res.render('signup');
			}
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



app.post('/chat',function(req,res){


	//TODO chat module
});

app.get('/logout',function(req,res){

	if(req.session && req.session){
		req.session.reset();
	}

	res.redirect('/login');
});



app.get('/chat/contacts',function(req,res){
	
	User.findOne({username: req.query.username},function(err,user){
		if(err){
			res.json({found:'error'});
		}else{
			if(user){
				res.json({found:true,username:user.username});
			}else
			{
				res.json({found:false});
			}
		}
		
	});
});

app.post('/chat/contacts',authenticate,function(req,res){

	User.findOne({username:req.session.user.username},function(err,user){
		
		if(user){
			if(user.contacts.length > 0){
				for(var i in user.contacts){
					if(req.body.username == user.contacts[i].contactName){
						res.json({found:true,username:req.body.username,threadId:user.contacts[i].threadId,notifications:user.contacts[i].notifications});
				}
			}
			}else{
				User.findOne({username: req.body.username},function(err,userToAdd){
				if(err){
					res.json({found:false});
				}else{
					if(!userToAdd){
						res.json({found:false});
					}else{


						User.findOne({username:req.session.user.username},function(err,user){

							if(user){

								if(user.contacts){
									for(var i in user.contacts){
										if(user.contacts[i].contactName == userToAdd.username){
											res.json({found:false});
										}
									}
								}
								

								var participants = [userToAdd.username,user.username];
								var thread = new Thread();
								thread.participants = participants;
								thread.save(function(err,thread){
									if(err){
										console.log(err);
									}else{

										User.findByIdAndUpdate(
											user._id,
											{$push:{"contacts" : {contactName:userToAdd.username,threadId:thread._id}}},
											{safe:true,upsert:true},
											function(err){
												//Add Requesting User
											User.findByIdAndUpdate(
														userToAdd._id,
														{$push:{"contacts" : {contactName:user.username,threadId:thread._id}}},
														{safe:true,upsert:true},
														function(err){
															
															console.log("added to Requesting User");
														}
											);
												res.json({found:true,username:userToAdd.username,threadId:thread._id,notifications:userToAdd.notifications});
											}
										);
									}
								});
							}else{
								res.json({found:false});
							}
						});
					}
				}
				
			});

			}


			
		}
		
	});


	
});


app.get('/chat',authenticate,function(req,res){
	
	res.render('chat');

});


app.get('/chat/thread',authenticate,function(req,res){
	
	var threadId = '';
	
	if(req.query.threadId){
		threadId = req.query.threadId;
	}else{
		
		res.send(401);
		res.end();
	}

	User.findOne({username:req.session.user.username},function(err,user){
		if(user){
			
					Thread.findOne({_id:threadId},function(err,thread){

						if(thread.messages.length > 0)
							
							res.json({found:true, messages:thread.messages.sort(compare)});
							res.end();
						
					});
		}else{
			res.json({found:false});
			res.end();
		}
		
	});

	
});


app.post('/chat/notifications',authenticate,function(req,res){

	if(req.body.contactName){
		User.findOne({username: req.session.user.username},function(err,user){
			for(var i in user.contacts){
				if(user.contacts[i].contactName == req.body.contactName){
					user.contacts[i].notifications = 0;
					user.save(function(err){
						if(!err)
							res.json({status:true,notifications:0});
					});
					
				}
			}
			
		});
	}
});

//Chat Implementation
io.sockets.on('connection',function(socket){
	console.log(socket.id);
	if(socket.request.session && socket.request.session.user){
		User.findOne({username:socket.request.session.user.username},function(err,user){
			if(!user){
				
			}else{
				socket.username = user.username;
				var tempSocket = new Socket({
					socketId: socket.id,
					username: user.username
				});

				tempSocket.save(function(err){
					if(err){
						console.log(err);
					}
				});

				io.sockets.emit('status',{username:socket.username,status:true});
			}
		});

	}

	socket.on('message',function(data){
		console.log(data);
		User.findOne({username:socket.username},function(err,user){
			if(user){


				var i = 0;
				var found = false;
				for(i; i < user.contacts.length;i++){
					if(user.contacts && user.contacts[i].contactName === data.username){
						found = true;
						Thread.findByIdAndUpdate(
									user.contacts[i].threadId,
									{$push:{"messages" : {
										sender:socket.username,
										message:data.message,
										sent:Date.now()}}},
									{safe:true,upsert:true},
									function(err,thread){
										Socket.findOne({username:data.username},function(err,s){

											if(!s || err){
												
												
													User.findOne({username:data.username},function(err,user){

														if(user){

															for(var i = 0; i < user.contacts.length;i++){
																if(user.contacts[i].contactName == socket.username){
																	console.log('letting Know about NOtificaitons');
																	user.contacts[i].notifications++;
																	
																	user.save(function(err){
																		if(!err){
																			console.log('gotcha');
																			io.sockets.emit('local','notified');
																		}
																	});
																}
															}
														}
													});
												
												
											}else{
													if(typeof io.sockets.connected[s.socketId] !== 'undefined'){
															io.sockets.connected[s.socketId].emit('message',{threadId:thread._id,username: socket.request.session.user.username, message:data.message});
													}
													
												}
											
										});
									}
								);

					}
				}
			}else{
				console.log('No User found');
				res.json({status:'user not found'});
			}
		});

		
		
	});

	socket.on('disconnect',function(){
		console.log('global disconnect');
		Socket.find({socketId:socket.id}).remove(function(err,socket){
			if(socket && !err)
			{
				console.log('removed');
				io.sockets.emit('status',{username: socket.username,status:false});
			}
		})
		
	});
});




server.listen(3000,function(){
		console.log('Server and IO 4000 started');
	});


//add listener
// var serve = app.listen(3000,function(){
//     console.log("Started On Port# 3000");
// })

