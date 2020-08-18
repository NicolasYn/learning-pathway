const Sqlite = require('better-sqlite3');
let db = new Sqlite('db.sqlite');

const bcrypt = require('bcrypt');

exports.register = function(username, password){
    if(userInfoNotCorrect(username, password)) return -1;
    if(checkUsernameIsAlreadyTaken(username)) return -2;
    var crypt_pass = crypt_password(password);
    db.prepare('INSERT INTO users VALUES (?, ?, ?)').run(username.toLowerCase(), crypt_pass, "member");
    return {username: username.toLowerCase(), password: crypt_pass};
}

exports.login = function(username, password){
    var loginRequest = db.prepare('SELECT password FROM users WHERE username = ?').get(username.toLowerCase());
    return (loginRequest !== undefined 
            && check_password(password, loginRequest.password)) ? {username: username.toLowerCase(), password: password} : -1;
}

exports.delete = function(username){
    db.prepare('DELETE FROM users WHERE username=?').run(username.toLowerCase());
}

exports.isAdmin = function(user){
    //db.prepare('UPDATE users SET role=? WHERE username=?').run("admin", user.username.toLowerCase());
    var role = db.prepare('SELECT role FROM users WHERE username=?').get(user.username);
    return role!== undefined && role.role === "admin";
}

exports.isModerator = function(user){
    var role = db.prepare('SELECT role FROM users WHERE username=?').get(user.username.toLowerCase());
    return role!== undefined && (role.role === "moderator" || role.role === "admin");
}

exports.getLastUsers = function(){
    return db.prepare('SELECT username FROM users ORDER BY rowid DESC LIMIT 5').all();
}

exports.isExists = function(username){
    return checkUsernameIsAlreadyTaken(username);
}

exports.updatePassword = function(username, password){
    var crypt_pass = crypt_password(password);
    db.prepare('UPDATE users SET password=? WHERE username=?').run(crypt_pass, username.toLowerCase());
    return {username: username.toLowerCase(), password: crypt_pass};
}

function userInfoNotCorrect(username, password){
    return username===undefined || password === undefined || /\s/.test(username) 
            || username.length > 15;
}

function checkUsernameIsAlreadyTaken(username){
    var usernameRequest = db.prepare('SELECT * FROM users WHERE username = ?').get(username.toLowerCase());
    return usernameRequest !== undefined;
}

function crypt_password(password) {
    var hash_pass = bcrypt.hashSync(password, 10);
    return hash_pass;
}

function check_password(password, hash) {
    return bcrypt.compareSync(password, hash) == true;
};
