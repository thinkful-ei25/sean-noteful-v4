'use strict';

const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport'); 

const Note = require('../models/note');
const User = require('../models/user'); 
const Folder = require('../models/folder'); 
const Tag = require('../models/tag'); 

const router = express.Router();

router.use('/', passport.authenticate('jwt', { session: false, failWithError: true }));

function validateFolderId(userId, folderId){
  return Folder
    .findOne({ _id : folderId, userId})
    .then(result => { 
      if (!result){ 
        const err = new Error('This `folder` does not belong to the current `user`'); 
        err.status = 400; 
        return Promise.reject(err); 
      }
      return Promise.resolve(); 
    }); 
}

function validateTagId(userId, tags) { 
  return Tag
    .find({ _id : {$in : tags}, userId})
    .then(results => { 

      if (results.length !== tags.length){
        let errorString = 'The `tag(s)` with these `id(s)` do not belong to the current user: '; 

        const convertedResultsToString = results.map(result => result._id.toString() );
        const notInResults = (tag) =>  !convertedResultsToString.includes(tag); 
        const filteredTags = tags.filter(notInResults); 

        filteredTags.forEach(nonMatchingTag => { 
          errorString = errorString.concat(nonMatchingTag + ': '); 
        }); 
      
        const err = new Error(errorString); 
        err.status = 400; 
        return Promise.reject(err); 
      }
      
      return Promise.resolve(); 
    }); 
}
/* ========== GET/READ ALL ITEMS ========== */
router.get('/', (req, res, next) => {
  const { searchTerm, folderId, tagId } = req.query;
  const { id : userId } = req.user; 

  let filter = {userId};

  if (searchTerm) {
    const re = new RegExp(searchTerm, 'i');
    filter.$or = [{ 'title': re }, { 'content': re }];
  }

  if (folderId) {
    filter.folderId = folderId;
  }

  if (tagId) {
    filter.tags = tagId;
  }
  
  Note.find(filter)
    .populate('tags')
    .sort({ updatedAt: 'desc' })
    .then(results => {
      res.json(results);
    })
    .catch(err => {
      next(err);
    });
});

/* ========== GET/READ A SINGLE ITEM ========== */
router.get('/:id', (req, res, next) => {
  const { id } = req.params;
  const { id : userId } = req.user; 

  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  Note.findById({_id: id, userId})
    .populate('tags')
    .then(result => {
      if (result) {
        res.json(result);
      } else {
        next();
      }
    })
    .catch(err => {
      next(err);
    });
});

/* ========== POST/CREATE AN ITEM ========== */
router.post('/', (req, res, next) => {
  const { title, content, folderId, tags } = req.body;
  const { id : userId } = req.user; 

  /***** Never trust users - validate input *****/
  if (!title) {
    const err = new Error('Missing `title` in request body');
    err.status = 400;
    return next(err);
  }

  //DO TAGS EXIST?
  if (tags) {
    //ARE TAGS AN ARRAY?
    if (!Array.isArray(tags)){ 
      console.log('HIIIII');
      const err = new Error('`tags` are not an array'); 
      err.status = 400; 
      return next(err); 
    }
    //DOES EACH TAG HAVE A VALID MONGOOSE ID?
    const badIds = tags.filter((tag) => !mongoose.Types.ObjectId.isValid(tag));
    if (badIds.length) {
      const err = new Error('The `tags` array contains an invalid `id`');
      err.status = 400;
      return next(err);
    }
  }
  //DOES THE FOLDER HAVE A VALID MONGOOSE ID?
  if (!mongoose.Types.ObjectId.isValid(folderId)) {
    const err = new Error('The `folderId` is not valid');
    err.status = 400;
    return Promise.reject(err); 
  }

  const newNote = { title, content, folderId, tags, userId };
  if (newNote.folderId === '') {
    delete newNote.folderId;
  }

  Promise.all([
    validateFolderId(userId, folderId), 
    validateTagId(userId, tags)
  ])
    .then(() => { 
      return Note.create(newNote); 
    })
    .then(result => {
      res.location(`${req.originalUrl}/${result.id}`).status(201).json(result);
    })
    .catch(err => {
      next(err);
    });
});

/* ========== PUT/UPDATE A SINGLE ITEM ========== */
router.put('/:id', (req, res, next) => {
  const { id } = req.params;
  const { id : userId} = req.user; 
  const { folderId } = req.body; 

  const filter = { _id : id, userId }; 

  const toUpdate = {};
  const updateableFields = ['title', 'content', 'folderId', 'tags'];

  updateableFields.forEach(field => {
    if (field in req.body) {
      toUpdate[field] = req.body[field];
    }
  });

  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `note id` is not valid');
    err.status = 400;
    return next(err);
  }

  if(!mongoose.Types.ObjectId.isValid(folderId)) { 
    const err = new Error('The `folder id` is not valid'); 
    err.status = 400; 
    return next(err); 
  }

  if (toUpdate.title === '') {
    const err = new Error('Missing `title` in request body');
    err.status = 400;
    return next(err);
  }

  if (toUpdate.folderId && !mongoose.Types.ObjectId.isValid(toUpdate.folderId)) {
    const err = new Error('The `folderId` is not valid');
    err.status = 400;
    return next(err);
  }

  if (toUpdate.tags) {
    const badIds = toUpdate.tags.filter((tag) => !mongoose.Types.ObjectId.isValid(tag));
    if (badIds.length) {
      const err = new Error('The `tags` array contains an invalid `id`');
      err.status = 400;
      return next(err);
    }
  }

  if (toUpdate.folderId === '') {
    delete toUpdate.folderId;
    toUpdate.$unset = {folderId : 1};
  }
  Promise.all([validateFolderId, validateTagId])
    .then(() => { 
      return Note
        .findOneAndUpdate(filter, toUpdate, { new : true}); 
    })
    .then(result => {
      if (result) {
        res.json(result);
      } else {
        next();
      }
    })
    .catch(err => {
      next(err);
    });
});

/* ========== DELETE/REMOVE A SINGLE ITEM ========== */
router.delete('/:id', (req, res, next) => {
  const { id } = req.params;
  const { id : userId } = req.user;
  const filter = { _id : id, userId}; 

  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  Note.findOneAndDelete(filter)
    .then(() => {
      res.sendStatus(204);
    })
    .catch(err => {
      next(err);
    });
});

module.exports = router;
