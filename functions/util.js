
//驗證資料是否為空
exports.checkEmpty = function checkEmpty(uncheckedValue) {
    if (uncheckedValue) {
        return true;
    }
    return false;
}

exports.getResponseObject=function (){
    return {
        excutionResult: 'fail',
    };
}

//取得台北時間當日上午00:00的UTCsecodes值
exports.getTaipeiMidNightUTCSeconds = function(){
     
    let midNight = Date.now();
    let date = new Date();
    midNight -= date.getUTCMilliseconds();
    midNight -= date.getUTCSeconds() * 1000;
    midNight -= date.getUTCMinutes() * 60 * 1000;
    let hour = date .getUTCHours() + 8;
    if(hour >= 24){
        hour-=24;
    }
    midNight -= hour * 60 * 60 * 1000;

    return midNight;
}

exports.tables = {
    announcement:{
        tableName:'announcement',
        columns:{
            title: 'title',
            issueTime: 'issueTime',
            detail: 'detail',
            issuer:'issuer',
        }
    },
    workTime:{
        tableName:'workTime',
        columns:{
            showName:'showName',
            startHour:'startHour',
            endHour:'endHour',
        }
    },
    workingType:{
        tableName:'workingType',
        columns:{
            showName:'showName',
        }
    },
    workAssignment: {
        tableName: 'workAssignment',
        columns: {
            team: 'team',
            workType: 'workType',
            workTime: 'worktime',
            desc: 'desc',
            worker: 'worker',
            modifyUser: 'modifyUser',
            modifyTime: 'modifyTime',
        }
    },
    leaveType: {
        tableName: 'leaveType',
        columns: {
            showName: 'showName',
        }
    },
    leaveNote: {
        tableName: 'leaveNote',
        columns: {
            issuer: "issuer",
            authorizer: "authorizer",
            issueTime: "issueTime",
            authTime: 'authTime',
            type: "type",
            desc: "description",
            startLeaveTime: "startLeaveTime",
            endLeaveTime: "endLeaveTime",
            is_approved: "is_approved",
            approve_desc: "approveDescription",
            authorized:"authorized",
        }
    },
    punchRecord: {
        tableName: "punchRecord",
        columns: {
            issuer: "isser",
            authorizer: "authorizer",
            punchTime: "punchTime",
            modifyTime: "modifyTime"
        }
    },
    //todo
    users: {
        tableName: 'users',
        columns: {
            gender: 'gender',
            phoneNumber: 'phoneNumber',
            name: 'name',
            jobTitle: 'jobTitle',
            team: 'team',
            workingType: 'workingType',
            verified: 'verified',
            permission: 'permission',
            images: 'images',
        }
    },
    gender: {
        tableName: 'gender',
        columns: {
            showName: 'showName',
        }
    },
    team: {
        tableName: 'team',
    },
    workingType: {
        tableName: 'workingType',
        columns: {
            showName: 'showName',
        }
    },
    loginRecord: {
        tableName: 'loginRecord',
        columns: {
            uid: 'uid',
            loginTime: 'loginTime',
            logoutMethod: 'logoutMethod',
            logoutTime: 'logoutTime',
            logoutIssuer: 'logoutIssuer',
        }
    },
    permission:{
        tableName:'permission',
        columns:{}
    }
}

exports.permissions = {
    normal:'一般',
    HR:'人事',
    leader:'長老',
    super:'後台',
}


