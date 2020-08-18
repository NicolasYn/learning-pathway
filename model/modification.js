const Sqlite = require('better-sqlite3');
let db = new Sqlite('db.sqlite');

var pathways = require('./pathways.js');

exports.Modification = function(text, link) {
    this.text = text;
    this.link = link;
}

exports.createModificationAdd = function(article, pathway, new_content, username){
    removeInitContent(article, pathway);
    var id_modif = getIDModif();
    var new_content = JSON.stringify(new_content); //JSON.parse to print data
    storeModificationInDB(article, pathway, id_modif, new_content, "", username);
}

exports.createModificationUpdate = function(article, pathway, new_content, id_content, username){
    var id_modif = getIDModif();
    var content = db.prepare('SELECT text, link FROM contents WHERE id=?').all(id_content);
    var previous_content = JSON.stringify(content);
    var new_content = JSON.stringify(new_content); //JSON.parse to print data
    storeModificationInDB(article, pathway, id_modif, new_content, previous_content, username);
}

exports.backUpModifications = function(article, pathway){
    var content = JSON.stringify(pathways.getContentFromPathway(article, pathway));
    db.prepare('INSERT INTO backup VALUES (?, ?, ?)').run(article, pathway, content);
}

exports.getModifications = function(article, pathway){
    var modifications = [];
    var ids = db.prepare('SELECT modification, user, date FROM pathways_modifications WHERE article=? AND pathway=?')
                    .all(article, pathway);
    for(id of ids){
        var modif = db.prepare('SELECT before,after FROM modifications WHERE id=?').get(id.modification);
        if(modif.before !== "") modif.before = JSON.parse(modif.before)[0];
        else modif.add = true; 
        modif.after = JSON.parse(modif.after);
        modif.user = id.user;
        modif.date = id.date;
        modifications.push(modif);
    }
    return modifications.reverse();
}

function getIDModif(){
    var id_modif = db.prepare('SELECT MAX(id) as max FROM modifications').get();
    return id_modif.max == undefined ? 0 : id_modif.max +1; 
}

function storeModificationInDB(article, pathway, id_modif, new_content, previous_content, username){
    db.prepare('INSERT INTO modifications VALUES (?,?,?)').run(id_modif, previous_content, new_content);
    db.prepare('INSERT INTO pathways_modifications VALUES (?,?,?,?,?)')
                    .run(article, pathway, id_modif, username, new Date().toLocaleDateString('fr-FR'));
}

function removeInitContent(article, pathway){
    if(!(db.prepare('SELECT count(content) as count FROM pathways_contents WHERE article=? AND pathway=?')
        .get(article, pathway).count > 0)) return;
    var min_id_content = getMinIDContentFromPathway(article, pathway);
    var text_init = "Ajouter du contenu en cliquant sur ce lien"
    if(db.prepare('SELECT text FROM contents WHERE id=?').get(min_id_content).text === text_init){
        db.prepare('DELETE FROM pathways_contents WHERE article=? AND pathway=? AND content=?')
            .run(article, pathway, min_id_content);
        db.prepare('DELETE FROM contents WHERE id=?').run(min_id_content);
    }
}

function getMinIDContentFromPathway(article, pathway){
    return db.prepare('SELECT MIN(content) as min FROM pathways_contents WHERE article=? AND pathway=?')
                .get(article, pathway).min;
}

exports.getAllIDModifications = function(article, name){
    return db.prepare('SELECT modification FROM pathways_modifications WHERE article=? AND pathway=?')
                .all(article,name);
}

exports.getModificationsFromUser = function(username){
    return db.prepare('SELECT article, pathway, date FROM pathways_modifications WHERE user=?').all(username)
                .map(obj=> ({ ...obj, article: obj.article.replace(/_/g, " "), category: db.prepare('SELECT category FROM articles WHERE title=?')
                        .get(obj.article).category})).reverse();
}