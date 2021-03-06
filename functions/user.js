const functions = require('firebase-functions');
const admin = require('firebase-admin');
const util = require('./util');
const cors = require('cors')({
    'origin': true,
});

const firestore = admin.firestore();
const auth = admin.auth();

//註冊
//前台用
exports.register = functions.https.onRequest((request, response) => {
    cors(request, response, () => {
        let resultObj = {
            excutionResult: 'fail',
        };

        //normalize
        let defaultValue = " ";
        let _name = util.checkEmpty(request.body.name) ? request.body.name : defaultValue;
        let _phoneNumber = util.checkEmpty(request.body.phoneNumber) ? request.body.phoneNumber : defaultValue;
        let _gender = util.checkEmpty(request.body.gender) ? request.body.gender : defaultValue;
        let _jobTitle = util.checkEmpty(request.body.jobTitle) ? request.body.jobTitle : defaultValue;
        let _team = util.checkEmpty(request.body.team) ? request.body.team : defaultValue;
        let _workingType = util.checkEmpty(request.body.workingType) ? request.body.workingType : defaultValue;
        let _verified = false;
        let _image = defaultValue;


        //確認firestore account 是否存在
        let firestoreAccount = firestore.collection(util.tables.users.tableName).where(util.tables.users.columns.phoneNumber, '==', _phoneNumber)
            .limit(1).get().then(snapshot => {
                if (snapshot.size === 0) {
                    return false
                }
                else {
                    return true;
                }

            });


        //確認gender存在
        let genderCheck = firestore.collection(util.tables.gender.tableName).doc(_gender).get().then(snapshot => {
            if (snapshot.exists) {
                return Promise.resolve('gender exists');
            }
            else {
                return Promise.reject('gender does not exists');
            }
        });

        //確認jobTitle存在？

        //確認team存在
        let teamCheck = firestore.collection(util.tables.team.tableName).doc(_team).get().then(snapshot => {
            if (snapshot.exists) {
                return Promise.resolve('team exists');
            }
            else {
                return Promise.reject('team does not exists');
            }
        });

        //確認workingType存在
        let workingTypeCheck = firestore.collection(util.tables.workingType.tableName).doc(_workingType).get().then(snapshot => {
            if (snapshot.exists) {
                return Promise.resolve('workingType exists');
            }
            else {
                return Promise.reject('workingType does not exists');
            }
        });

        //確認auth account 是否存在
        let accountExists = auth.getUserByPhoneNumber(_phoneNumber).then(userRecord => {
            return userRecord;
        }).catch(reason => {
            return false;
        });


        Promise.all([genderCheck, teamCheck, workingTypeCheck, accountExists, firestoreAccount]).then(value => {

            console.log(value[3]);

            //firestore 帳號已經存在
            if (value[4] === true) {
                return Promise.reject({ log: "帳號已經存在" });
            }
            //如果auth帳號已經存在
            else if (value[3] !== false) {
                let batch = firestore.batch();
                let dirRef = firestore.collection('users').doc(value[3].uid);
                batch.set(dirRef, {
                    name: _name,
                    phoneNumber: _phoneNumber,
                    gender: _gender,
                    jobTitle: _jobTitle,
                    team: _team,
                    workingType: _workingType,
                    verified: _verified,
                    permission: util.permissions.normal,
                    image: _image,
                });
                return batch.commit();
            }
            //都不存在
            else {
                return auth.createUser({
                    phoneNumber: _phoneNumber,
                }).then(userRecord => {
                    let batch = firestore.batch();
                    let dirRef = firestore.collection('users').doc(userRecord.uid);
                    batch.set(dirRef, {
                        name: _name,
                        phoneNumber: _phoneNumber,
                        gender: _gender,
                        jobTitle: _jobTitle,
                        team: _team,
                        workingType: _workingType,
                        verified: _verified,
                        permission: util.permissions.normal,
                        image: _image,
                    })
                    return batch.commit();
                });
            }


        }).then(() => {
            resultObj.excutionResult = 'success';
            response.json(resultObj);
        }).catch(reason => {
            console.log(reason)
            response.json(resultObj);
        });

    })
});

//前台用
//用戶自firebase sms 登入後 需要再觸發此api 讓後端註冊用戶狀態為今日已登入 
//若狀態為今日已登入 api當日皆可使用 否則都不可用(回應 fail)
exports.checkLogin = functions.https.onRequest((request, response) => {
    cors(request, response, () => {


        let resultObj = {
            excutionResult: 'fail',
        };

        let defaultValue = "";
        let uid = util.checkEmpty(request.body.uid) ? request.body.uid : defaultValue;

        auth.getUser(uid).then(userRecord => {

            // 確認 lastSignInTime存在
            if (userRecord.metadata.lastSignInTime === null) {
                return Promise.reject({ uid: userRecord.uid, log: "last Log In Time Null" });
            }
            else {
                //確認 時間合理 十分鐘以內
                let differSecond = (Date.now() - new Date(userRecord.metadata.lastSignInTime)) / 1000;
                console.log(differSecond);
                if (differSecond > 600) {
                    return Promise.reject({ uid: userRecord.uid, log: "last Log In Time over 600 seconds" });
                }

                // 寫入 login record
                return firestore.collection(util.tables.loginRecord.tableName).add({
                    uid: userRecord.uid,
                    loginTime: new Date(),
                    logoutMethod: null,
                    logoutTime: null,
                    logoutIssuer: null
                })

            }
        }).then((loginTime) => {
            // 回傳成功
            resultObj.excutionResult = 'success';

            response.json(resultObj);
        }).catch(reason => {
            console.log(reason);
            response.json(resultObj);
        });


    });

});

//前台用
//取得自己的資料 所以可以使用 uid
exports.getUserDetail = functions.https.onRequest((request, response) => {
    cors(request, response, () => {
        let resultObj = {
            excutionResult: 'fail',
        };
        //todo 時區問題待修正
        let nowHour = new Date().getUTCHours() + 8;
        if (nowHour >= 24) {
            nowHour -= 24;
        }
        defaultValue = " ";

        let _uid = util.checkEmpty(request.body.uid) ? request.body.uid : defaultValue;
        let loginCheck = _loginCheck(_uid);

        let getLeaveNoteOfToday = firestore.collection(util.tables.leaveNote.tableName)
            .where(util.tables.leaveNote.columns.issuer, '==', _uid)
            .where(util.tables.leaveNote.columns.startLeaveTime, '>', new Date(util.getTaipeiMidNightUTCSeconds()))
            .get().then(snapshot => {
                let returnData = [];
                snapshot.forEach(a => {
                    returnData.push(a.data());
                })
                return Promise.resolve(returnData);
            })

        let getworkTime = firestore.collection(util.tables.workTime.tableName)
            .where(util.tables.workTime.columns.startHour, '<=', nowHour)
            .orderBy(util.tables.workTime.columns.startHour, 'desc')
            .limit(1)
            .get()
            .then(docs => {

                docID = ""
                docs.forEach(doc => {
                    docID = doc.id;
                })

                return Promise.resolve(docID);
            })



        Promise.all([loginCheck, getLeaveNoteOfToday, getworkTime]).then(values => {
            return firestore.collection(util.tables.users.tableName).doc(_uid).get().then(doc => {
                if (doc.exists) {
                    return Promise.resolve([doc, values[1], values[2]]);
                }
                else {
                    return Promise.reject(`${_uid} does not exists.`);
                }
            })
        }).then((values) => {
            resultObj.workAssignment = [];
            let userData = values[0].data();

            let WAColumn = util.tables.workAssignment.columns;
            let workAssignments2 = firestore.collection(util.tables.workAssignment.tableName)
                .where(WAColumn.modifyTime, '>=', new Date(util.getTaipeiMidNightUTCSeconds()))
                .where(WAColumn.workTime, '==', values[2])
                .where(WAColumn.worker, 'array-contains', userData[util.tables.users.columns.phoneNumber])
                .orderBy(WAColumn.modifyTime)
                .get()
                .then(snapshot => {
                    let returnData = [];
                    snapshot.forEach(a => {
                        returnData.push(a.data());
                    })
                    return Promise.resolve(returnData);
                });






            return Promise.all([userData, values[1], workAssignments2])

        }).then((values) => {
            let userData = values[0];
            let leaveNotes = values[1];
            let workAssignments = values[2];
            //delete userData.permission;
            resultObj.userData = userData;
            resultObj.workAssignment = [];
            resultObj.leaveNote = [];
            //console.log(leaveNotes);
            leaveNotes.forEach(result => {
                leaveNote = result;
                let newData = {};
                //newData.uid = result.id;
                newData.type = leaveNote.type;
                newData.startLeaveTime = leaveNote.startLeaveTime;
                newData.endLeaveTime = leaveNote.endLeaveTime;
                newData.issueTime = leaveNote.issueTime;
                newData.authorized = leaveNote.authorized;
                newData.is_approved = leaveNote.is_approved;
                newData.desc = leaveNote.description;
                //newData.issuerName = users[leaveNote.issuer].name;
                resultObj.leaveNote.push(newData);
            });
            //console.log(workAssignments);
            workAssignments.forEach((WA => {
                let _data = WA;
                let returnData = {};
                returnData['desc'] = _data.desc;
                // returnData['modifyTime'] = _data.modifyTime;
                // returnData['modifyUser'] = _data.modifyUser;
                // returnData['team'] = _data.team;
                // returnData['worker'] = [];
                // _data.worker.map((phoneNumber) => {
                //     returnData['worker'].push(userDic[phoneNumber]);
                // })
                resultObj.workAssignment.push(returnData);
            }));

            resultObj.excutionResult = 'success';
            response.json(resultObj);
        }).catch(reason => {
            console.log(reason)
            response.json(resultObj);
        });

    })
});

//目前只支援 後台登出
//後台用
exports.logout = functions.https.onRequest((request, response) => {
    let resultObj = util.getResponseObject();
    let defaultValue = "";

    let uid = util.checkEmpty(request.body.uid) ? request.body.uid : defaultValue;
    let logoutPhoneNumber = util.checkEmpty(request.body.logoutPhoneNumber) ? request.body.logoutPhoneNumber : defaultValue;
    let permisionCheck = _permissionCheck(uid, util.permissions.super);

    // console.log(logoutPhoneNumber);
    let getLogoutUser = firestore.collection(util.tables.users.tableName)
        .where(util.tables.users.columns.phoneNumber, '==', logoutPhoneNumber)
        .limit(1)
        .get().then(user => {
            let id = "";
            user.forEach(userDoc => {
                id = userDoc.id;
            })
            return id;
        })

    Promise.all([getLogoutUser, permisionCheck]).then(values => {
        let logoutUid = values[0];
        //找到今日午夜之後的所有loginRecord 並且填入註銷資訊
        return firestore.collection(util.tables.loginRecord.tableName)
            .where(util.tables.loginRecord.columns.uid, '==', logoutUid)
            .where(util.tables.loginRecord.columns.loginTime, '>=', new Date(util.getTaipeiMidNightUTCSeconds()))
            .get().then(docs => {
                console.log(util.getTaipeiMidNightUTCSeconds());
                let _loginRecords = [];
                docs.forEach(doc => {
                    _loginRecords.push(doc.id);
                    console.log(doc.data());
                })
                return _loginRecords;
            })
    }).then((loginRecords) => {
        let batch = firestore.batch();
        loginRecords.forEach((value) => {
            // console.log(value);
            let logoutInfo = {};
            logoutInfo[util.tables.loginRecord.columns.logoutTime] = new Date();
            logoutInfo[util.tables.loginRecord.columns.logoutIssuer] = uid;
            logoutInfo[util.tables.loginRecord.columns.logoutMethod] = 'super kick off'
            batch.update(firestore.collection(util.tables.loginRecord.tableName).doc(value), logoutInfo);
        })
        return batch.commit();
    }).then(() => {
        resultObj.excutionResult = "success"
        response.json(resultObj);
    })
        .catch(fail => {
            console.log(fail);
            response.json(resultObj);
        })
});

//更新使用者資料 
//更新自己時不得修改permission
//後台用 更新其他人
//前台用 更新自己
exports.updateUser = functions.https.onRequest((request, response) => {
    cors(request, response, () => {
        let resultObj = {
            excutionResult: 'fail',
        };

        //normalize
        let defaultValue = " ";
        let _uid = util.checkEmpty(request.body.uid) ? request.body.uid : defaultValue; //動作帳號
        let _modifiedAccountPhoneNumber = util.checkEmpty(request.body.modifiedAccountPhoneNumber) ? request.body.modifiedAccountPhoneNumber : defaultValue;
        let _name = util.checkEmpty(request.body.name) ? request.body.name : defaultValue;
        let _gender = util.checkEmpty(request.body.gender) ? request.body.gender : defaultValue;
        let _jobTitle = util.checkEmpty(request.body.jobTitle) ? request.body.jobTitle : defaultValue;
        let _team = util.checkEmpty(request.body.team) ? request.body.team : defaultValue;
        let _workingType = util.checkEmpty(request.body.workingType) ? request.body.workingType : defaultValue;
        let _permission = util.checkEmpty(request.body.permission) ? request.body.permission : defaultValue;
        // console.log(_permission);
        let _verified = true;

        let loginCheck = _loginCheck(uid);

        // //確認gender存在
        let genderCheck = firestore.collection(util.tables.gender.tableName).doc(_gender).get().then(snapshot => {
            if (snapshot.exists) {
                return Promise.resolve('gender exists');
            }
            else {
                return Promise.reject('gender does not exists');
            }
        });

        // //確認team存在
        let teamCheck = firestore.collection(util.tables.team.tableName).doc(_team).get().then(snapshot => {
            if (snapshot.exists) {
                return Promise.resolve('team exists');
            }
            else {
                return Promise.reject('team does not exists');
            }
        });

        // //確認workingType存在
        let workingTypeCheck = firestore.collection(util.tables.workingType.tableName).doc(_workingType).get().then(snapshot => {
            if (snapshot.exists) {
                return Promise.resolve('workingType exists');
            }
            else {
                return Promise.reject('workingType does not exists');
            }
        });

        let permisionExistCheck = firestore.collection(util.tables.permission.tableName).doc(_permission).get().then(data => {
            // console.log(data.exists);
            return data.exists;
        })

        // // 確認permision 可以update
        let permisionCheck = _permissionCheck(_uid, util.permissions.super);

        //取得欲修改帳號uid
        let _modifiedAccount = _getUserByPhoneNumber(_modifiedAccountPhoneNumber);

        _modifiedAccount.then(account => {
            // console.log(account.uid);
            // console.log(_uid);
            //改自己
            if (account.uid == _uid) {
                console.log('改自己');
                Promise.all([genderCheck, teamCheck, workingTypeCheck, loginCheck]).then(value => {
                    return firestore.collection(util.tables.users.tableName).doc(_uid).update({
                        name: _name,
                        gender: _gender,
                        jobTitle: _jobTitle,
                        team: _team,
                        workingType: _workingType,
                        verified: _verified,
                    });
                }).then(() => {
                    resultObj.excutionResult = 'success';
                    response.json(resultObj);
                }).catch(reason => {
                    console.log(reason)
                    response.json(resultObj);
                });
            }
            //改別人
            else {
                console.log('改別人');
                let userCheck = _uidCheck(_uid);
                Promise.all([genderCheck, teamCheck, workingTypeCheck, userCheck, permisionCheck, permisionExistCheck, loginCheck]).then(value => {
                    if (!value[5]) {
                        return Promise.reject(_permission + ' does not exist');
                    }
                    return firestore.collection(util.tables.users.tableName).doc(account.uid).update({
                        name: _name,
                        gender: _gender,
                        jobTitle: _jobTitle,
                        team: _team,
                        workingType: _workingType,
                        permission: _permission,
                        verified: _verified,
                    });
                }).then(() => {
                    resultObj.excutionResult = 'success';
                    response.json(resultObj);
                }).catch(reason => {
                    console.log(reason)
                    response.json(resultObj);
                });
            }
        })
    })
});


//後台用
//get userlist
exports.getUserList = functions.https.onRequest((request, response) => {
    cors(request, response, () => {
        let resultObj = {
            excutionResult: 'fail',
        };

        //normalize
        let defaultValue = " ";
        let _uid = util.checkEmpty(request.body.uid) ? request.body.uid : defaultValue;
        let loginCheck = _loginCheck(_uid)

        //todo permisionCheck
        let permisionCheck = true;

        let getLeaveNotesOfToday = firestore.collection(util.tables.leaveNote.tableName)
            .where(util.tables.leaveNote.columns.startLeaveTime, '>=', new Date(util.getTaipeiMidNightUTCSeconds()))
            .get()
            .then(snapshot => {
                let returnData = [];
                snapshot.forEach(a => {
                    let data = a.data();
                    if (returnData[data.issuer] === undefined) {
                        returnData[data.issuer] = [];
                    }
                    returnData[data.issuer].push(data);
                })
                return Promise.resolve(returnData);
            })


        let workAssignments = firestore.collection(util.tables.workAssignment.tableName)
            .where(util.tables.workAssignment.columns.modifyTime, '>=', new Date(util.getTaipeiMidNightUTCSeconds()))
            .orderBy(util.tables.workAssignment.columns.modifyTime)
            .get()
            .then(snapshot => {
                let returnData = {};
                snapshot.forEach(a => {
                    let data = a.data();
                    data.worker.forEach(b => {
                        if (returnData[b] === undefined) {
                            returnData[b] = [];
                        }
                        returnData[b].push(data);
                    })
                })
                return Promise.resolve(returnData);
            });

        let getUsers = firestore.collection(util.tables.users.tableName).get()
            .then(snapshot => {
                let returnData = [{}, {}]
                snapshot.forEach(user => {
                    let userData = user.data();
                    returnData[0][user.id] = userData; // 用 userid 找 userData
                    returnData[1][userData.phoneNumber] = user.id; // 用 phoneNumber 找 userID
                })
                return Promise.resolve(returnData);
            });

        Promise.all([loginCheck, permisionCheck, getUsers, getLeaveNotesOfToday, workAssignments])
            .then((values) => {
                //console.log(values[2]);
                //console.log(util.getMidNightUTCSeconds());
                //console.log(values[3]);
                // console.log(values[4]);
                let userData = {};
                for (userid in values[2][0]) {
                    userData[userid] = {};
                    userData[userid] = values[2][0][userid];
                    userData[userid]['leaveNotes'] = values[3][userid] == undefined ? [] : values[3][userid];
                    let _wa = values[4][userData[userid]['phoneNumber']] == undefined ? [] : values[4][userData[userid]['phoneNumber']];
                    userData[userid]['workAssignments'] = _wa;
                }
                return Promise.resolve(userData);
                //console.log(userData);
            })
            .then((users) => {
                let returnData = []
                for (a in users) {

                    returnData.push(users[a]);
                }
                resultObj.excutionResult = 'success';
                resultObj.userList = returnData;
                response.json(resultObj);
            }).catch(reason => {
                console.log(reason)
                response.json(resultObj);
            });
    });
});


//登入確認
exports.loginCheck = _loginCheck;


function _loginCheck(userID) {

    let loginCheck = firestore.collection(util.tables.loginRecord.tableName)
        .where(util.tables.loginRecord.columns.uid, '==', userID)
        .where(util.tables.loginRecord.columns.loginTime, '>', new Date(util.getTaipeiMidNightUTCSeconds()))
        .orderBy(util.tables.loginRecord.columns.loginTime, 'desc')
        .get()
        .then(snapshot => {
            let count = 0;
            snapshot.forEach(records => {
                records = records.data();
                if (records[util.tables.loginRecord.columns.logoutTime] === null) {
                    count = count + 1;
                }
            })
            if (count === 0) {
                return Promise.reject(`${userID} login check fail`);
            }
            else {
                return Promise.resolve(`${userID} login check pass`);
            }
        });
    return loginCheck;
}

exports.uidCheck = _uidCheck;

function _uidCheck(uid) {
    return firestore.collection(util.tables.users.tableName).doc(uid).get().then(doc => {
        if (!doc.exists) {
            return Promise.reject(`${uid} does not exists`)
        }
        else {
            return Promise.resolve(doc);
        }
    })
}

exports.permissionCheck = _permissionCheck;
function _permissionCheck(uid, expected) {
    return firestore.collection(util.tables.users.tableName).doc(uid).get().then(doc => {
        var user = doc.data();
        var result = Promise.reject('unknow')
        // expected.forEach(value=>{
        //     if(ser.permission == value){

        //     }
        // })
        console.log('permission check')
        console.log(typeof (expected));
        if (typeof (expected) === 'string') {
            if (user.permission !== expected) {
                result = Promise.reject(`${uid} does not have ${expected} permission`)
            }
            else {
                result = Promise.resolve(doc);
            }
        }
        else if (Array.isArray(expected)) {
            console.log('array');
            result = Promise.reject(`${uid} does not have ${expected} permission`)
            expected.forEach(value=>{
                if(value === user.permission){
                    result = result = Promise.resolve(doc);
                }
            })
        }

        return result;
    })
}
exports.getUserByPhoneNumber = _getUserByPhoneNumber;
function _getUserByPhoneNumber(phoneNumber) {

    return firestore.collection(util.tables.users.tableName).where(util.tables.users.columns.phoneNumber, '==', phoneNumber).get().then(docs => {
        let user = {};
        docs.forEach(doc => {
            user = doc.data();
            user.uid = doc.id;
        })
        return user;
    })
}
