var initPack = {player:[],bullet:[]};
var removePack = {player:[],bullet:[]};
var WIDTH_MAP = 5120;
var HEIGHT_MAP = 2560;
Entity = function(param){
	var self = {
		x:320,
		y:320,
		spdX:0,
		spdY:0,
		id:"",
	}
	if(param){
		if(param.x)
			self.x = param.x;
		if(param.y)
			self.y = param.y;
		if(param.map)
			self.map = param.map;
		if(param.id)
			self.id = param.id;		
	}
	
	self.update = function(){
		self.updatePosition();
	}
	self.updatePosition = function(){
		self.x += self.spdX;
		self.y += self.spdY;

		if(self.x > WIDTH_MAP - 13 || self.x < 13) {
			if(self.angle) self.toRemove = true;
			self.x -= self.spdX;
        }	

		if(self.y > HEIGHT_MAP - 38 || self.y < 38) {
            if(self.angle) self.toRemove = true;
			self.y -= self.spdY;
        }
	}
	self.getDistance = function(pt){
		return Math.sqrt(Math.pow(self.x-pt.x,2) + Math.pow(self.y-pt.y,2));
	}
	return self;
}

Entity.getFrameUpdateData = function(){
	var pack = {
		initPack:{
			player:initPack.player,
			bullet:initPack.bullet,
		},
		removePack:{
			player:removePack.player,
			bullet:removePack.bullet,
		},
		updatePack:{
			player:Player.update(),
			bullet:Bullet.update(),
		}
	};
	initPack.player = [];
	initPack.bullet = [];
	removePack.player = [];
	removePack.bullet = [];
	return pack;
}

Player = function(param){
	var self = Entity(param);
	self.number = "" + Math.floor(10 * Math.random());
	self.username = param.username;
	self.pressingRight = false;
	self.pressingLeft = false;
	self.pressingUp = false;
	self.pressingDown = false;
	self.pressingAttack = false;
	self.attackCounter = 0;
	self.atkSpd = 5;
	self.mouseAngle = 0;
	self.maxSpd = 10;
	self.hp = 10;
	self.hpMax = 10;
	self.score = 0;
	//self.inventory = new Inventory(param.socket,true);
	
	var super_update = self.update;
	self.update = function(){
		self.updateSpd();
		
		super_update();
		self.attackCounter += self.atkSpd;
		
		if(self.pressingAttack){
			if(self.attackCounter > 25) {
				self.attackCounter = 0;
				self.shootBullet(self.mouseAngle);
			}
		}
	}
	self.shootBullet = function(angle){
		// if(Math.random() < 0.1)
		// 	self.inventory.addItem("potion",1);
		Bullet({
			parent:self.id,
			angle:angle,
			x:self.x,
			y:self.y,
		});
	}
	
	self.updateSpd = function(){
		if(self.pressingRight)
			self.spdX = self.maxSpd;
		else if(self.pressingLeft)
			self.spdX = -self.maxSpd;
		else
			self.spdX = 0;
		
		if(self.pressingUp)
			self.spdY = -self.maxSpd;
		else if(self.pressingDown)
			self.spdY = self.maxSpd;
		else
			self.spdY = 0;		
	}
	
	self.getInitPack = function(){
		return {
			id:self.id,
			x:self.x,
			y:self.y,	
			number:self.number,	
			hp:self.hp,
			hpMax:self.hpMax,
			score:self.score,
		};
	}
	self.getUpdatePack = function(){
		return {
			id:self.id,
			x:self.x,
			y:self.y,
			hp:self.hp,
			score:self.score,
			mouseAngle:self.mouseAngle,
            pressingRight:self.pressingRight,
            pressingLeft:self.pressingLeft,
            pressingUp:self.pressingUp,
            pressingDown:self.pressingDown,
		}	
	}
	
	Player.list[self.id] = self;
	
	initPack.player.push(self.getInitPack());
	return self;
}

Player.list = {};
Player.onConnect = function(socket,username){
	var player = Player({
		username:username,
		id:socket.id,
		socket:socket,
	});
	socket.on('keyPress',function(data){
		if(data.inputId === 'left')
            player.pressingLeft = data.state;
		if(data.inputId === 'right')
			player.pressingRight = data.state;
		if(data.inputId === 'up')
			player.pressingUp = data.state;
		if(data.inputId === 'down')
			player.pressingDown = data.state;
		if(data.inputId === 'attack')
			player.pressingAttack = data.state;
		if(data.inputId === 'mouseAngle')
			player.mouseAngle = data.state;
	});
	
	socket.on('changeMap',function(data){
		if(player.map === 'field')
			player.map = 'forest';
		else
			player.map = 'field';
	});
	
	socket.on('sendMsgToServer',function(data){
		for(var i in SOCKET_LIST){
			SOCKET_LIST[i].emit('addToChat',player.username + ': ' + data);
		}
	});
	socket.on('sendPmToServer',function(data){ //data:{username,message}
		var recipientSocket = null;
		for(var i in Player.list)
			if(Player.list[i].username === data.username)
				recipientSocket = SOCKET_LIST[i];
		if(recipientSocket === null){
			socket.emit('addToChat','The player ' + data.username + ' is not online.');
		} else {
			recipientSocket.emit('addToChat','From ' + player.username + ':' + data.message);
			socket.emit('addToChat','To ' + data.username + ':' + data.message);
		}
	});
	
	socket.emit('init',{
		selfId:socket.id,
		player:Player.getAllInitPack(),
		bullet:Bullet.getAllInitPack(),
	})
}
Player.getAllInitPack = function(){
	var players = [];
	for(var i in Player.list)
		players.push(Player.list[i].getInitPack());
	return players;
}

Player.onDisconnect = function(socket){
	delete Player.list[socket.id];
	removePack.player.push(socket.id);
}
Player.update = function(){
	var pack = [];
	for(var i in Player.list){
		var player = Player.list[i];
		player.update();
		pack.push(player.getUpdatePack());		
	}
	return pack;
}


Bullet = function(param){
	var self = Entity(param);
	self.id = Math.random();
	self.angle = param.angle;
	self.spdX = Math.cos(param.angle/180*Math.PI) * 20;
	self.spdY = Math.sin(param.angle/180*Math.PI) * 20;
	self.parent = param.parent;
	
	self.timer = 0;
	self.toRemove = false;
	var super_update = self.update;
	self.update = function(){
		if(self.timer++ > 50)
			self.toRemove = true;
		super_update();
		
		for(var i in Player.list){
			var p = Player.list[i];
			if(self.map === p.map && self.getDistance(p) < 32 && self.parent !== p.id){
				p.hp -= 1;
								
				if(p.hp <= 0){
					var shooter = Player.list[self.parent];
					if(shooter)
						shooter.score += 1;
					p.hp = p.hpMax;
					p.x = Math.random() * 500;
					p.y = Math.random() * 500;					
				}
				self.toRemove = true;
			}
		}
	}
	self.getInitPack = function(){
		return {
			id:self.id,
			x:self.x,
			y:self.y,
			map:self.map,
		};
	}
	self.getUpdatePack = function(){
		return {
			id:self.id,
			x:self.x,
			y:self.y,		
		};
	}
	
	Bullet.list[self.id] = self;
	initPack.bullet.push(self.getInitPack());
	return self;
}
Bullet.list = {};

Bullet.update = function(){
	var pack = [];
	for(var i in Bullet.list){
		var bullet = Bullet.list[i];
		bullet.update();
		if(bullet.toRemove){
			delete Bullet.list[i];
			removePack.bullet.push(bullet.id);
		} else
			pack.push(bullet.getUpdatePack());		
	}
	return pack;
}

Bullet.getAllInitPack = function(){
	var bullets = [];
	for(var i in Bullet.list)
		bullets.push(Bullet.list[i].getInitPack());
	return bullets;
}


Upgrade = function (id,x,y,width,height,category,img){
    var self = Entity('upgrade',id,x,y,width,height,img);

    self.category = category;
    Upgrade.list[id] = self;
}

Upgrade.list = {};

Upgrade.update = function(){
    if(frameCount % 75 === 0)	//every 3 sec
        Upgrade.randomlyGenerate();
    for(var key in Upgrade.list){
        Upgrade.list[key].update();
        var isColliding = player.testCollision(Upgrade.list[key]);
        if(isColliding){
            if(Upgrade.list[key].category === 'score')
                score += 1000;
            if(Upgrade.list[key].category === 'atkSpd')
                player.atkSpd += 3;
            delete Upgrade.list[key];
        }
    }
}

Upgrade.randomlyGenerate = function(){
    //Math.random() returns a number between 0 and 1
    var x = Math.random()*Maps.current.width;
    var y = Math.random()*Maps.current.height;
    var height = 32;
    var width = 32;
    var id = Math.random();

    if(Math.random()<0.5){
        var category = 'score';
        var img = Img.upgrade1;
    } else {
        var category = 'atkSpd';
        var img = Img.upgrade2;
    }

    Upgrade(id,x,y,width,height,category,img);
}
