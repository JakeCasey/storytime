var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var AWS = require('aws-sdk');
var fs = require('fs');
var shortid = require('shortid');
// https://github.com/eheikes/aws-tts
var textchunk = require('textchunk');


  const Polly = new AWS.Polly({
    signatureVersion: 'v4',
    region: 'us-east-1',
    secretAccessKey: process.env.key,
    accessKeyId: process.env.secret
})

var queue = [];




router.post('/', function(req, res){
                           console.log(req.body.text);

var id = shortid.generate()
                                //just use chunker here. It'll be easier and smarter. No need to reinvent the wheel.


var parts = textchunk.chunk(req.body.text, 1500);

var newParts = parts.map(str => {
      // Compress whitespace.
        return str.replace(/\s+/g, ' ');
      }).map(str => {
      // Trim whitespace from the ends.
        return str.trim();
      });

console.log(req.body.voice);
  //TODO: split and modify text here then recombine and save as one .mp3
   let params = {
    'Text': newParts[0],
    'OutputFormat': 'mp3',
    'VoiceId': req.body.voice
}


Polly.synthesizeSpeech(params, (err, data) => {
   if (err) {
        console.log(err.code)
    } else if (data) {
        if (data.AudioStream instanceof Buffer) {
            fs.writeFile("./audio/" + id+ '.mp3', data.AudioStream, function(err) {
                if (err) {
                    return console.log(err)
                }
                console.log("The file was saved!")

                var data = {id: id}
                res.send(data);

            })
        }
    }
})




});





module.exports = router;
