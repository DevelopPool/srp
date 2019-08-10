
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const team = require('./team');
const util = require('./util');
const user = require('./user');
const announcement = require('./announcement');
const leaveNote = require('./leaveNote');
const work = require('./work');
const firestore = admin.firestore();
const auth = admin.auth();

exports.register = user.register;
exports.checkLogin = user.checkLogin;
// exports.logout = user.logout;
exports.updateUser = user.updateUser;
exports.getUserDetail = user.getUserDetail;
exports.getUserList = user.getUserList;

exports.addWork = work.addWork;
exports.getWork = work.getWork;
//exports.deleteWork = work.deleteWork;
exports.punch = work.punch;
exports.getMonthlyAttendanceRecord = work.getMonthlyAttendanceRecord;


//todo permision check

exports.getMyLeaveNoteList = leaveNote.getMyLeaveNoteList;
exports.getLeaveNoteList = leaveNote.getLeaveNoteList;
exports.askLeave = leaveNote.askLeave;
exports.authorizeAbsentNote = leaveNote.authorizeAbsentNote;
exports.deleteMyLeaveNote = leaveNote.deleteMyLeaveNote;



exports.addTeam = team.addTeam;
exports.deleteTeam = team.deleteTeam;
exports.getTeamList = team.getTeamList;

exports.addAnnouncement = announcement.addAnnouncement;
exports.getAnnouncement = announcement.getAnnouncement;


exports.init = functions.https.onRequest((request, response)=>{

    function deleteCollection(db, collectionPath, batchSize) {
        var collectionRef = db.collection(collectionPath);
        var query = collectionRef.orderBy('__name__').limit(batchSize);
      
        return new Promise((resolve, reject) => {
          deleteQueryBatch(db, query, batchSize, resolve, reject);
        });
      }
      
      function deleteQueryBatch(db, query, batchSize, resolve, reject) {
        query.get()
          .then((snapshot) => {
            // When there are no documents left, we are done
            if (snapshot.size == 0) {
              return 0;
            }
      
            // Delete documents in a batch
            var batch = db.batch();
            snapshot.docs.forEach((doc) => {
              batch.delete(doc.ref);
            });
      
            return batch.commit().then(() => {
              return snapshot.size;
            });
          }).then((numDeleted) => {
            if (numDeleted === 0) {
              resolve();
              return;
            }
      
            // Recurse on the next process tick, to avoid
            // exploding the stack.
            process.nextTick(() => {
              deleteQueryBatch(db, query, batchSize, resolve, reject);
            });
          })
          .catch(reject);
      }

      Object.keys(util.tables).map(function (objectKey, index){
        console.log(objectKey);
      })
    
})


  