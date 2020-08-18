const Sqlite = require('better-sqlite3');
let db = new Sqlite('db.sqlite');

var pathways = require('./pathways.js');

exports.create = function(title, category){
    title = formatTitleDB(title);
    db.prepare('INSERT INTO articles VALUES (?, ?)').run(title, category);
}

exports.checkIfArticleAlreadyExist = function(title){
    correctTitle = formatTitleDB(title);
    var articleTitleRequest = db.prepare('SELECT title FROM articles WHERE title = ?').get(correctTitle);
    return articleTitleRequest !== undefined;
}

exports.formatTitlePrint = function(title){
    var title = title.replace(/_/g, " ");
    return title.charAt(0).toUpperCase() + title.slice(1);
}

exports.getCategory = function(title){
    return db.prepare('SELECT category FROM articles WHERE title=?').get(title).category;
}

exports.formatTitleDB = function(title){
    return formatTitleDB(title);
}

exports.remove = function(title){
    var all_pathways = pathways.getAllPathwaysName(title);
    for(name of all_pathways) pathways.remove(title, name.name);
    db.prepare('DELETE FROM articles WHERE title=?').run(title);
}

exports.updateTitle = function(title, new_title){
    db.prepare('UPDATE articles SET title=? WHERE title=?').run(new_title, title);
}

exports.random = function(){
    return db.prepare('SELECT title FROM articles ORDER BY RANDOM()').get().title;
}

exports.getLastArticles = function(){
    return db.prepare('SELECT title FROM articles ORDER BY rowid DESC LIMIT 5').all()
                .map(elt => elt.title.replace(/_/g, " "));
}

exports.getCategories = function(){
    return db.prepare('SELECT * FROM categories').all();
}

exports.getArticlesFromCategory = function(category){
    return db.prepare('SELECT title FROM articles WHERE category=? ORDER BY RANDOM()').all(category)
                .map(elt => elt.title.replace(/_/g, " "));
}

exports.randomCategory = function(){
    return db.prepare('SELECT name FROM categories ORDER BY RANDOM()').get().name;
}

function formatTitleDB(title){
    var titleCorrectFormat = title.trim(); //remove space before and after
    titleCorrectFormat = titleCorrectFormat.toLowerCase();
    titleCorrectFormat =  titleCorrectFormat.replace(/\s+/g, " "); //remove extra spaces
    titleCorrectFormat = titleCorrectFormat.replace(/\s+/g, '_'); //replace one space by underscore
    return titleCorrectFormat;
}