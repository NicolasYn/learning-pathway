const Sqlite = require('better-sqlite3');

let db = new Sqlite('db.sqlite');

exports.dropAllTables = function(){
    db.prepare('DROP TABLE IF EXISTS users').run();
    db.prepare('DROP TABLE IF EXISTS roles').run();
    db.prepare('DROP TABLE IF EXISTS pathways_contents').run();
    db.prepare('DROP TABLE IF EXISTS pathways_modifications').run();
    db.prepare('DROP TABLE IF EXISTS modifications').run();
    db.prepare('DROP TABLE IF EXISTS pathways').run();
    db.prepare('DROP TABLE IF EXISTS contents').run();
    db.prepare('DROP TABLE IF EXISTS articles').run();
    db.prepare('DROP TABLE IF EXISTS categories').run();
    db.prepare('DROP TABLE IF EXISTS backup').run();
}

exports.createAllTables = function(){
    db.prepare('CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, password TEXT, role TEXT,\
        FOREIGN KEY (role) REFERENCES roles(role) )').run();

    db.prepare('CREATE TABLE IF NOT EXISTS roles (role TEXT PRIMARY KEY)').run();

    db.prepare('CREATE TABLE IF NOT EXISTS articles (title TEXT PRIMARY KEY, category TEXT,\
        FOREIGN KEY (category) REFERENCES categories (name))').run();
    
    db.prepare('CREATE TABLE IF NOT EXISTS categories (name TEXT PRIMARY KEY)').run();
    
    db.prepare('CREATE TABLE IF NOT EXISTS modifications (id INTEGER PRIMARY KEY, before TEXT, after TEXT)').run();
    
    db.prepare('CREATE TABLE IF NOT EXISTS contents (id NUMBER PRIMARY KEY, text TEXT, link TEXT)').run();
    
    db.prepare('CREATE TABLE IF NOT EXISTS pathways (article TEXT, name TEXT,\
        PRIMARY KEY (article, name), FOREIGN KEY (article) REFERENCES articles(title) ON UPDATE CASCADE )').run();
    
    db.prepare('CREATE TABLE IF NOT EXISTS pathways_contents (article TEXT, pathway TEXT, content NUMBER, \
        PRIMARY KEY (article, pathway, content),\
        FOREIGN KEY (article, pathway) REFERENCES pathways(article, name) ON UPDATE CASCADE, \
        FOREIGN KEY (content) REFERENCES contents(id) ON DELETE CASCADE)').run();

    db.prepare('CREATE TABLE IF NOT EXISTS pathways_modifications (article TEXT, pathway TEXT, modification NUMBER, \
                                                                        user TEXT, date TEXT, \
        PRIMARY KEY (article, pathway, modification),\
        FOREIGN KEY (article, pathway) REFERENCES pathways(article, name) ON UPDATE CASCADE, \
        FOREIGN KEY (modification) REFERENCES modifications(id) ON DELETE CASCADE)').run();

    db.prepare('CREATE TABLE IF NOT EXISTS backup (article TEXT, pathway TEXT, content TEXT)').run();

    insertCategories();
    insertRoles();
}

function insertCategories(){
    if(db.prepare('SELECT * FROM categories').all().length !== 0) return;
    var categories = ['Informatique', 'Mathématiques', 'Physique', 'Biologie', 'Chimie', 
    'Mécanique', 'Électronique', 'Économie', 'Histoire', 'Sociologie', 'Géographie',
    'Géologie', 'Langues', 'Juridique', 'Psychologie', 'Arts', 'Médecine'];
    
    for(var index = 0; index < categories.length; index++){
        db.prepare('INSERT INTO categories VALUES (?)').run(categories[index]);
    }
}

function insertRoles(){
    if(db.prepare('SELECT * FROM roles').all().length !== 0) return;
    db.prepare('INSERT INTO roles VALUES (?)').run("admin")
    db.prepare('INSERT INTO roles VALUES (?)').run("moderator");
    db.prepare('INSERT INTO roles VALUES (?)').run("member");
}
