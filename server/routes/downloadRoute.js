var express = require('express');
var router = express.Router();
var fs = require('fs');


router.get('/:id', function(req, res){
  var id = req.params.id


  var file =  '../server/audio/' + id;
  //let the user download the file, and then delete it.
  res.download(file, function(err){

   fs.unlink(file);

  });



});

module.exports = router
