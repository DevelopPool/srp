
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
//const auth = admin.auth();

exports.register = user.register;
exports.checkLogin = user.checkLogin;
exports.logout = user.logout;
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


exports.init = functions.https.onRequest((request, response) => {


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



  var deleteActions = [];

  Object.keys(util.tables).map(function (objectKey, index) {
    deleteActions.push(deleteCollection(firestore, objectKey, 100).then((data) => {
      console.log(objectKey + ' deleted');
    }))
  })

  Promise.all(deleteActions).then((values => {
    console.log('prepare commit')
    var batch = firestore.batch();
    var docRef = firestore.doc('workingType/casualWork');
    batch.set(docRef, { showName: '打工' });
    docRef = firestore.doc('workingType/fullTime');
    batch.set(docRef, { showName: '全職' });
    docRef = firestore.doc('workingType/partTime');
    batch.set(docRef, { showName: '兼職' });

    docRef = firestore.doc('workTime/上午');
    batch.set(docRef,{startHout:8, endHour:12 ,showName:'上午'});
    docRef = firestore.doc('workTime/中午');
    batch.set(docRef,{startHout:12, endHour:13 ,showName:'上午'});
    docRef = firestore.doc('workTime/下午');
    batch.set(docRef,{startHout:13, endHour:17 ,showName:'上午'});
    docRef = firestore.doc('workTime/晚上');
    batch.set(docRef,{startHout:17, endHour:20 ,showName:'上午'});

    docRef=firestore.doc('team/交管組');
    batch.set(docRef,{});
    docRef=firestore.doc('team/修繕組');
    batch.set(docRef,{});
    docRef=firestore.doc('team/工程組');
    batch.set(docRef,{});
    docRef=firestore.doc('team/房務組');
    batch.set(docRef,{});
    docRef=firestore.doc('team/生態組');
    batch.set(docRef,{});
    docRef=firestore.doc('team/農業組');
    batch.set(docRef,{});
    docRef=firestore.doc('team/餐廳組');
    batch.set(docRef,{});

    docRef=firestore.doc('permision/一般');
    batch.set(docRef,{});
    docRef=firestore.doc('permision/人事');
    batch.set(docRef,{});
    docRef=firestore.doc('permision/後台');
    batch.set(docRef,{});
    docRef=firestore.doc('permision/長老');
    batch.set(docRef,{});

    docRef=firestore.doc('leaveType/事假');
    batch.set(docRef,{showName:'事假'});
    docRef=firestore.doc('leaveType/公假');
    batch.set(docRef,{showName:'公假'});
    docRef=firestore.doc('leaveType/其他');
    batch.set(docRef,{showName:'其他'});
    docRef=firestore.doc('leaveType/喪假');
    batch.set(docRef,{showName:'喪假'});
    docRef=firestore.doc('leaveType/婚假');
    batch.set(docRef,{showName:'婚假'});
    docRef=firestore.doc('leaveType/生理假');
    batch.set(docRef,{showName:'生理假'});
    docRef=firestore.doc('leaveType/產假');
    batch.set(docRef,{showName:'產假'});
    docRef=firestore.doc('leaveType/病假');
    batch.set(docRef,{showName:'病假'});
    docRef=firestore.doc('leaveType/育嬰假');
    batch.set(docRef,{showName:'育嬰假'});
   
    docRef=firestore.doc('gender/male');
    batch.set(docRef,{showName:'男性'});
    docRef=firestore.doc('gender/female');
    batch.set(docRef,{showName:'女性'});
    
    batch.commit().then(() => {
      console.log('commited')
    }).then(() => {
      response.send('done');

    }).catch(fail => {
      response.json(fail);
    });
  })).catch(fail => {
    response.json(fail);
  });



})


