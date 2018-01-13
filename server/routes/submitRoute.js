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
var audioconcat = require('audioconcat');
const Polly = new AWS.Polly({
    signatureVersion: 'v4',
    region: 'us-east-1',
    secretAccessKey: secret,
    accessKeyId: key
})

//init queue
var queue = [];

router.post('/', function(req, res){
//split the body of text into an array of strings less than 1500 characters long.
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

//TODO: create a job queue to keep async calls to the server conflicting?
//calls our conversion to audio.
_convertToAudio(queue[0]);

res.send(200);
//combines all the files in the idArray
function _concatAudioFiles(idArray){
  //create the paths for our audio files
  var songs = idArray.map((s) => { return {id: './audio/'+ s.id + '.mp3', index: s.index} });
  //this merge sorts the indices of the song id's
  songs = mergeSort(songs);
  finalSongs = [];
  songs.forEach((s) => { finalSongs.push(s.id) });

  var newId = shortid.generate();
  console.log(finalSongs);
  audioconcat(finalSongs)
   .concat('./audio/' + newId + '.mp3')
   .on('end',(output) => {
    console.log('job done')
    finalSongs.forEach((s)=> {

      fs.unlink(s)
    });

    return newId;

   });

 function mergeSort (arr) {
  if (arr.length === 1) {
    // return once we hit an array with a single item
    return arr
  }

  const middle = Math.floor(arr.length / 2) // get the middle item of the array rounded down
  const left = arr.slice(0, middle) // items on the left side
  const right = arr.slice(middle) // items on the right side

  return merge(
    mergeSort(left),
    mergeSort(right)
  )
}

// compare the arrays item by item and return the concatenated result
function merge (left, right) {
  let result = []
  let indexLeft = 0
  let indexRight = 0

  while (indexLeft < left.length && indexRight < right.length) {
    if (left[indexLeft].index < right[indexRight].index) {
      result.push(left[indexLeft])
      indexLeft++
    } else {
      result.push(right[indexRight])
      indexRight++
    }
  }

  return result.concat(left.slice(indexLeft)).concat(right.slice(indexRight))
}



}
//this function takes an array, and for each string in it calls the limiter, with an exponential backoff if too many requests hit the api.
function _convertToAudio(arr) {

var waiting = arr.length
var idArray = [];

//this function is called every time a file is saved because we're saving files asynchronously. Once we've saved as many files as are in our array, we
// then concatenate them.
function finish(id, index){
  //pushes the written file and it's index (where it is in the passage) to an array of objects.
  idArray.push({id: id, index: index});

  waiting--

  if(waiting  == 0){

  //sends the array of filenames and indices to the function that stiches all the audio together.
  _concatAudioFiles(idArray);
  }

}

arr.forEach((s, index, array) => {

  s = {text: s, index: index}
  limiter.removeTokens(1, (err, remainingRequests) => {

    _exponentialBackoff(req, s, _callPolly, finish, remainingRequests, 100, 1000);

 });

});



}



//this calls Polly and saves a piece of text to the disk.
function _callPolly(req, text, finish, remainingRequests) {

   if(remainingRequests < 5) {
    return new Error();
   }
    var params = {
    'Text': text.text,
    'OutputFormat': 'mp3',
    'VoiceId': req.body.voice
}

Polly.synthesizeSpeech(params, (err, data) => {
   // the fs writeFile changes based on the mocha call vs working on the server. File writing is different, pay attention.
   if (err) {

    return err;
   } else if (data) {
        if (data.AudioStream instanceof Buffer) {

var id = shortid.generate();
            fs.writeFile("./audio/" + id+ '.mp3', data.AudioStream, function(err) {
                if (err) {
                  return err;
                }

               //successful save of file.
              console.log('file saved');

              //pass the index of the string and the text in an object {text: string, index: integer}
              //reconstruct array of id's for sorting and then use in audioconcat
              finish(id, text.index);
              //and push id to array of id's for later audioconconcat

            });

        }
    }
})

}


//exponential backoff for rate limiting api calls. This exponentially backs off when rate limiter is hit. Function a is limiter.removetoken if (remainingRequests < 1) return err else callPolly
function _exponentialBackoff(req, text, a, finish, remainingRequests, max, delay){
  //check for err
  var result = a(req, text, finish, remainingRequests);

  if(result instanceof Error){
    //adjust delay for jitter
    var delay = delay * Math.random() * max;
    if(max > 0){
      setTimeout(function(){
        _exponentialBackoff(req, text, a, finish, --max, delay * 2)
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


});





module.exports = router;
