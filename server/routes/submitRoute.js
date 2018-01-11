require('dotenv').config()
var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var AWS = require('aws-sdk');
var fs = require('fs');
var shortid = require('shortid');
// https://github.com/eheikes/aws-tts
var textchunk = require('textchunk');

var key = process.env.key
var secret = process.env.secret
var RateLimiter = require('limiter').RateLimiter;
//init rate limiter according to AWS Polly Standards
var limiter = new RateLimiter('80', 'second');

const Polly = new AWS.Polly({
    signatureVersion: 'v4',
    region: 'us-east-1',
    secretAccessKey: secret,
    accessKeyId: key
})

//init queue
var queue = [];

router.post('/', function(req, res){
//init array of id's that will later be combined into one audio file and sent to the user.
var idArray = [];
//split the body of text into an array of strings less that 1500 characters long.
var parts = textchunk.chunk(req.body.text, 1500);
var newParts = parts.map(str => {
      // Compress whitespace.
        return str.replace(/\s+/g, ' ');
      }).map(str => {
      // Trim whitespace from the ends.
        return str.trim();
      });
//push our array of strings to our queue
queue.push(newParts);

//this function takes an array, and for each string in it calls the limiter, with an exponential backoff if too many requests hit the api.
function _convertToAudio(arr) {
 arr.forEach((a) => {

  limiter.removeTokens(1, (err, remainingRequests) => {

   _exponentialBackoff(req, a, _callPolly, remainingRequests, 100, 1000);

 });
});





}

//this calls Polly and saves a piece of text to the disk.
function _callPolly(req, text, remainingRequests) {
   if(remainingRequests < 5) {
    return new Error();
   }
    var params = {
    'Text': text,
    'OutputFormat': 'mp3',
    'VoiceId': req.body.voice
}
//generate id for the name of the audio file
var id = shortid.generate()
Polly.synthesizeSpeech(params, (err, data) => {
   // the fs writeFile changes based on the mocha call vs working on the server. File writing is different, pay attention.
   if (err) {
    return err;
   } else if (data) {
        if (data.AudioStream instanceof Buffer) {
            fs.writeFile("./audio/" + id+ '.mp3', data.AudioStream, function(err) {
                if (err) {
                  return err;
                }
               //successful save of file.
              //and push id to array of id's for later audioconcat
                idArray.push(id);
            })
        }
    }
})

}


//exponential backoff for rate limiting api calls. This exponentially backs off when rate limiter is hit. Function a is limiter.removetoken if (remainingRequests < 1) return err else callPolly
function _exponentialBackoff(req, text, a, remainingRequests, max, delay){
  //check for err
  var result = a(req, text, remainingRequests);
  if(result instanceof Error){
    //adjust delay for jitter
    var delay = delay * Math.random() * max;
    if(max > 0){
      setTimeout(function(){
        _exponentialBackoff(req, text, a, --max, delay * 2)
      }, delay)
    }
    else {
      //can do logging and specific error handling here, as this is only hit when all 'max' tries have been hit.
    }
  }
  else {
    //this is hit when the function call is successful. IE Result is not an Error.
  }
}


res.send(200)

});





module.exports = router;
