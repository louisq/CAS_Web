/**
 * New node file
 */
var test = 0;
var sys = require('sys');
var exec = require('child_process').exec;
var moment = require('moment');
function puts(error, stdout, stderr) { sys.puts(stdout); }

var genUUID = function() {
    var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split(''), uuid = new Array(36), rnd=0, r;
    for (var i = 0; i < 36; i++) {
      if (i==8 || i==13 ||  i==18 || i==23) {
        uuid[i] = '-';
      } else if (i==14) {
        uuid[i] = '4';
      } else {
        if (rnd <= 0x02) rnd = 0x2000000 + (Math.random()*0x1000000)|0;
        r = rnd & 0xf;
        rnd = rnd >> 4;
        uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
      }
    }
    return uuid.join('');
  };


var RepositoryController = {
    index: function(req, res) {
    	if(req['headers']['x-request-origin'] == 'app') {
    		res.view('repository/index', {layout: null});
    		console.log('Serving with no layout');
    	} else {
    		res.view('repository/index');
    		console.log('Serving with layout');
    	}
    },
    create: function(req, res) {
    	/*var result = false;
    	var url = req.param('url').replace(/"|'|\\/g, '').replace("\\","\\\\"); //Sanitize input
    	exec("C:/Python33/python.exe C:/Users/Ben/Projects/CAS_Reader/readRepo.py \""+url+"\"",
    	function( error, stdout, stderr) {
    		console.log(stderr);
    		result = JSON.parse(stdout);
    		res.json({id:'u3i2yw349o8ayt7', result: result,success:true});
    	});*/
    	var url = req.param('url').replace(/"|'|\\/g, '').replace("\\","\\\\");
    	var urlParts = url.split('/');
    	var nameParts = urlParts[urlParts.length - 1];
    	var name = nameParts.split('.')[0];
    	var now = moment().format('YYYY-MM-DD HH:mm:ss');
    	Repository.create({
    		id:genUUID(),
    		name:name,
    		url:url,
    		creation_date: now
    	}).done(function(err, repo) {
    		  if (err) {
    		    return console.log(err);
    		  }else {
    		    console.log("Repo created:", repo);
    		    res.json({repo: repo, success:true});
    		  }
    		  /*Repository.subscribe(req.socket, [repo]);
    		  setInterval(function() { 
    			  Repository.findOne(repo.id).done(function(err, repo){
    				  if(!err) {
    					  console.log(repo);
    					  if(typeof repo !== "undefined") {
    						  Repository.publish(req, [{id: repo.id}], {repo: repo, success:true});
    					  }
    				  } else console.log(error)
    			  });
    		  }, 5000);*/
    	});
    },
    find: function(req, res) {
    	var repo_name = req.param('id');
    	//var fs = require('fs');
    	//var file = process.cwd() + '/files/'+repo_id+'.json';
    	/*
    	fs.readFile(file, 'utf8', function (err, data) {
    		if (err) {
    			console.log('Error: ' + err);
    			res.json({error:'Repo does not exist.', file: file, success: false});
    			return;
    		}
    		//data = JSON.parse(data)
    		res.view({layout: null, repo: data});
    	});
    	*/
    	// Get the repository
    	Repository.findOne({name:repo_name}).done(function(err, repo){
    		if(!err) {
    			if(typeof repo !== "undefined") {
    				// Repository found, get the metrics
    				Metric.findOne({repo:repo_name}).done(function(err, metrics){
    					if(!err && typeof metrics != 'undefined') {
	    					repo.metrics = metrics;
				    		Commit.find({repository_id:repo.id}).sort('author_date_unix_timestamp DESC').done(function(err, commits){
				    			// Loop through each commit's keys to determine if in between metric threshold
				    			for(var i in commits) {
				    				for(var key in commits[i]) {
				    					var value = parseFloat(commits[i][key]);
				    					// Is key a metric?
				    					if(metrics.hasOwnProperty(key+'nonbuggy')) {
				    						commits[i][key] = {value: value, threshold:0}
	
				    						var nonbuggy = key + 'nonbuggy',
				    						buggy = key + 'buggy';
				    						if(key == 'entrophy') {
				    							buggy = key;
				    						}
				    						if(value <= metrics[nonbuggy]) {
				    							commits[i][key].threshold = -1;
				    						} else if(value >= metrics[buggy]) {
				    							commits[i][key].threshold = 1;
				    						} else {
				    							commits[i][key].threshold = 0;
				    						}
				    					}
				    				}
				    			}
				    			repo.commits = commits;
				        		res.json({success: true, repo: repo,  repoStatus:'analyzed'});
				        	});
    					} else {
    						repo.commits = [];
    						repo.metrics = [];
    						
    						Commit.find()
    						.where({repository_id:repo.id})
    						.limit(1)
    						.exec(function(err, commits) {
    							if(commits.length > 1) {
    	    						res.json({success: true, repo: repo, repoStatus:'ingested'});
    							} else {
    								res.json({success: true, repo: repo, repoStatus:'uningested'});
    							}
    						});
    					}
    				});
    			} else {
    				// TODO: Send 404 and have it work correctly on client side.
	    			res.json({success:false, error:'Nothing Found', repoStatus:'notfound'});
	    		}
    		} else console.log(err);
    	});
    }
}

module.exports = RepositoryController;