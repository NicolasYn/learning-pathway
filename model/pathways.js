const Sqlite = require('better-sqlite3');
let db = new Sqlite('db.sqlite');

var modifications = require('./modification.js');

exports.create = function(article, name){
    var nameFormat = formatNamePathWayDB(name);
    db.prepare('INSERT INTO pathways VALUES (?, ?)').run(article, nameFormat);
    var id_content = createContent(article, nameFormat);
    db.prepare('INSERT INTO pathways_contents VALUES (?, ?, ?)')
        .run(article, nameFormat, id_content);
}

function createContent(article, name){
    var id = getIDContent();
    var textDefault = "Ajouter du contenu en cliquant sur ce lien";
    var textFormat = formatTextPathWayDB(textDefault);
    var link = "/update/"+article+"/"+name.replace(/ /g, "%20");
    db.prepare('INSERT INTO contents VALUES (?, ?, ?)').run(id, textFormat, link);
    modifications.createModificationAdd(article, name, 
            new modifications.Modification(textFormat, link), "bot");
    return id;
}

exports.getPathways = function(title){
    var pathway = {
        name: '',
        content: ''
    };
    var pathways = [];
    var length = getNumberOfPathways(title);
    for(var i=0; i < length; i++){
        var currentPathway = Object.create(pathway);
        name = getName(title, i);
        currentPathway.content = getCurrentContents(title, name);
        currentPathway.name = formatPathwayPrint(name);
        pathways.push(currentPathway);
    }
    return pathways;
}

exports.updateContent = function(article, pathway, precedent_content, text, link, user){
    var id_content = getAllIDContents(article, pathway);
    var id_update;
    for(id of id_content){
        if(db.prepare('SELECT text FROM contents WHERE id=?').get(id.content)
                    .text === precedent_content){
            id_update = id.content;
            break;
        }
    }
    var textFormat = formatTextPathWayDB(text);
    modifications.createModificationUpdate(article, pathway, new modifications.Modification(textFormat, link), 
                                            id_update, user.username);
    db.prepare('UPDATE contents SET text=?, link=? WHERE id=?').run(textFormat, link, id_update);
}

exports.remove = function(article, name){
    modifications.backUpModifications(article, name);
    var id_content = getAllIDContents(article, name);
    for(id of id_content) db.prepare("DELETE FROM contents WHERE id=?").run(id.content);
    var id_modification = modifications.getAllIDModifications(article, name);
    for(id of id_modification) db.prepare("DELETE FROM modifications WHERE id=?").run(id.modification);
    db.prepare('DELETE FROM pathways WHERE article=? AND name=?').run(article, name);
}

function getCurrentContents(article, name){
    var contents = [];
    var id_content = getAllIDContents(article, name);
    for(id of id_content){
        var content = db.prepare('SELECT text, link FROM contents WHERE id=?').get(id.content);
        content.link_format = formatLink(content.link);
        contents.push(content);
    }
    return contents;
}

function formatLink(link){
    var link = link.trim();
    var link_format = link.match(".*[.][^\/]*[\/]");
    var regex = /http.?:\/\//
    return link_format !== null ? link_format[0].substring(0, link_format[0].length-1)
                                                    .replace(regex, "") : link;
}

function getName(title, index){
    return db.prepare('SELECT name FROM pathways WHERE article=? ORDER BY rowid').all(title)[index].name;
}

exports.getContentFromPathway = function(article, name_pathway){
    return getCurrentContents(article, name_pathway);
}

function getIDContent(){
    var id_content = db.prepare('SELECT MAX(id) as max FROM contents').get();
    return id_content.max == undefined ? 0: id_content.max +1; 
}

exports.getAllPathwaysName = function(title){
    return db.prepare('SELECT name FROM pathways WHERE article=?').all(title);
}

function getAllIDContents(article, name){
    return db.prepare('SELECT content FROM pathways_contents WHERE article=? AND pathway=?')
                .all(article,name);
}

function getNumberOfPathways(title){
    return db.prepare('SELECT count(DISTINCT name) as count FROM pathways \
                        WHERE article=? ORDER BY rowid').get(title).count;
}

exports.addContent = function(article, name_pathway, title, link, user){
    var id = getIDContent();
    var titleFormat = formatTextPathWayDB(title);
    modifications.createModificationAdd(article, name_pathway, new modifications.Modification(titleFormat, link),
                                            user.username);
    db.prepare('INSERT INTO contents VALUES (?, ?, ?)').run(id, titleFormat, link);
    db.prepare('INSERT INTO pathways_contents VALUES (?, ?, ?)').run(article, name_pathway, id);
}

exports.checkIfPathwayAlreadyExists = function(article, name){
    return nameIsCorrect(name) && db.prepare('SELECT * FROM pathways WHERE article=? AND name=?')
                                        .get(article, formatNamePathWayDB(name))===undefined;
}

exports.checkIfContentAlreadyExists = function(article, pathway, text, link){
    return checkIfContentAlreadyExists(article, pathway, text, link);
}

function checkIfContentAlreadyExists(article, pathway, text, link){
    if(!nameIsCorrect(text)) return false;
    var id_content = getAllIDContents(article, pathway);
    for(id of id_content){
        if(db.prepare('SELECT id FROM contents WHERE id=? AND text=? AND link=?')
                .get(id.content, formatTextPathWayDB(text), link) !== undefined)
            return true;
    }
    return false;
}

exports.contentIsCorrect = function(text){
    return text.trim() !== "";
}

exports.formatPathwayPrint = function(title){
    return formatPathwayPrint(title);
}

function formatPathwayPrint(title){
    return title.charAt(0).toUpperCase() + title.slice(1);
}

exports.formatNamePathWayDB = function(name){
    return formatNamePathWayDB(name);
}

function formatNamePathWayDB(name){
    var nameCorrectFormat = name.trim(); //remove space before and after
    nameCorrectFormat = nameCorrectFormat.toLowerCase();
    nameCorrectFormat =  nameCorrectFormat.replace(/\s+/g, " "); //remove extra spaces
    return nameCorrectFormat;
}

function formatTextPathWayDB(text){
    var textFormat = text.trim();
    textFormat = textFormat.replace(/\s+/g, " ");
    return textFormat;
}

function nameIsCorrect(name) {
    return name !== undefined && name.trim() !== "";
}

exports.getModifications = function(article, pathway){
    return modifications.getModifications(article, pathway);
}

exports.getModificationsFromUser = function(username){
    return modifications.getModificationsFromUser(username);
}