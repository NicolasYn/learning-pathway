var express = require("express");
var mustache = require('mustache-express');

var app = express();

app.engine('html', mustache());
app.set('view engine', 'html');
app.set('views', './views');

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));

const cookieSession = require('cookie-session');
app.use(cookieSession({
  secret: 'cookie_mdp_private',
  name: 'lp-cookie'
}));

app.disable('x-powered-by'); //security

var db = require('./create-db.js');
var users = require('./model/users.js');
var articles = require('./model/article.js');
var pathways = require('./model/pathways.js');

function is_authenticated(req, res, next) {
  if(req.session.user !== undefined) {
    res.locals.authenticated = true;
    if(users.isModerator(req.session.user)) req.session.moderator = true;
    return next();
  }
  req.session.last_page = req.url;
  res.status(401).render('login', {auth_required: true});
}

function is_admin(req, res, next){
  if(req.session.user !== undefined && users.isAdmin(req.session.user)){
    return next();
  }
  res.status(401).send("Vous n'avez pas les permissions nécessaires");
}

function is_moderator(req, res, next){
  if(req.session.user !== undefined && users.isModerator(req.session.user)){
    return next();
  }
  res.status(401).send("Vous n'avez pas les permissions nécessaires");
}

//db.dropAllTables()
db.createAllTables();

app.get('/',  (req, res) => {
  req.session.last_page = null;
  res.render('index');
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.get('/login', (req, res) => {
  if(req.session.user !== undefined) res.redirect('/profile');
  else res.render('login');
});

app.get('/profile', (req, res) => {
  var username = req.session.user.username;
  res.render('profile', {username: username, contributions: pathways.getModificationsFromUser(username)});
});

app.get('/logout', is_authenticated, (req, res) => {
    req.session = null;
    res.redirect('/');
});

app.get('/delete/confirm', is_authenticated, (req, res) => {
  users.delete(req.session.user.username);
  req.session = null;
  res.redirect('/');
});

app.get('/delete', is_authenticated, (req, res) => {
  var username = req.session.user.username;
  res.render('profile', {delete: true, username: username, contributions: pathways.getModificationsFromUser(username)});
});

app.get('/create', is_authenticated, (req, res) => {
  if(req.session.title !== undefined && !articles.checkIfArticleAlreadyExist(req.session.title)){
    var titleFormatPrint = articles.formatTitlePrint(req.session.title);
    res.render('create', {title: titleFormatPrint, category: articles.getCategories()});
  }
  else{
    req.session.title = undefined;
    res.render('create');
  }
});

app.get('/learn/:title', (req, res) => {
  title = articles.formatTitlePrint(req.params.title);
  if(articles.checkIfArticleAlreadyExist(title)){
    var title_format = articles.formatTitleDB(title);
    var pathway = pathways.getPathways(title_format);
    var category = articles.getCategory(title_format);
    res.render('article', {title: title, authenticated: req.session.user, category: category,
            pathways: pathway, title_format: articles.formatTitleDB(title)});
  }
  else{
    req.session.title = articles.formatTitleDB(title);
    res.redirect('/create');
  }
});

app.get('/learn', (req, res) => {
  if(req.query.title !== undefined && req.query.title !== ""){
    var title = articles.formatTitlePrint(req.query.title);
    res.redirect('/learn/'+title);
  } else res.redirect('/learn/'+articles.random());
});

app.get('/update/:title/:pathway', is_authenticated, (req, res) => {
  if(articles.checkIfArticleAlreadyExist(articles.formatTitleDB(req.params.title))){
    req.session.title = articles.formatTitleDB(req.params.title);
    req.session.pathway_name = pathways.formatNamePathWayDB(req.params.pathway);
    var pathwayFormat = pathways.formatPathwayPrint(req.params.pathway);
    res.render("update", {pathway: true, name_pathway: pathwayFormat, moderator: req.session.moderator,
      pathway_content: pathways.getContentFromPathway(req.session.title, req.session.pathway_name)});
  } else res.redirect('/learn/'+ req.params.title);
});

app.get('/update/:title', is_authenticated, (req, res) => {
  if(articles.checkIfArticleAlreadyExist(articles.formatTitleDB(req.params.title))){
    req.session.title = articles.formatTitleDB(req.params.title);
    res.render("update", {first: true, moderator: req.session.moderator});
  } else res.redirect('/learn/'+ req.params.title);
});

app.get('/update', (req, res) =>{
  res.render("rules");
});

app.get('/remove', is_moderator, (req, res) => {
  res.render("update", {first: true, moderator: req.session.moderator, delete: true,
    title: req.session.title});
});

app.get('/remove-pathway', is_moderator, (req, res) => {
  res.render("update", {delete_pathway: true, pathway: true, name_pathway: req.session.pathway_name, moderator: req.session.moderator,
    pathway_content: pathways.getContentFromPathway(req.session.title, req.session.pathway_name), title: req.session.title});
});

app.get('/remove/confirm', is_moderator, (req, res) => {
  articles.remove(req.session.title);
  req.session.title = null;
  res.redirect('/');
});

app.get('/remove-pathway/confirm', is_moderator, (req, res) => {
  pathways.remove(req.session.title, req.session.pathway_name);
  req.session.pathway_name = null;
  res.redirect('/learn/'+req.session.title);
});

app.get('/history/:title/:pathway', (req, res) => {
  var pathway_format = pathways.formatNamePathWayDB(req.params.pathway);
  res.render("history", {all: true, history: pathways.getModifications(req.params.title, pathway_format)});
});

app.get('/admin', is_admin, (req, res) => {
  res.render("admin", {users: users.getLastUsers(), articles: articles.getLastArticles()});
});

app.get('/rules', (req, res) => {
  res.render("rules");
});

app.get('/category', (req, res) => {
  res.redirect('/category/'+articles.randomCategory());
});

app.get('/category/:name', (req, res) => {
  var format = articles.formatTitlePrint(req.params.name);
  res.render('category', {name: format, articles: articles.getArticlesFromCategory(format)});
});

app.post('/register', (req, res) => {
    const user = users.register(req.body.username, req.body.password);
    if(user === -1) {
      res.render('register', {invalid: true}); //invalid
    } else if(user === -2) {
        res.render('register', {alreadyTaken: true});//username already taken
    } 
    else {
        req.session.user = user;
        res.redirect('/');
    }
  });

app.post('/login', (req, res) => {
  const user = users.login(req.body.username, req.body.password);
  if(user != -1) {
    req.session.user = user;
    if(req.session.last_page !== null && req.session.last_page !== undefined){
      var last_page = req.session.last_page;
      req.session.last_page = null;
      res.redirect(last_page);
    } else res.redirect('/');
  } else {
    res.render('login', {error: true}); //error login
  }
});

app.post('/create', (req, res) => {
  if(articles.checkIfArticleAlreadyExist(req.body.title)){
    req.session.title = undefined;
    titleExists = articles.formatTitlePrint(req.body.title);
    res.render('create', {titleExists}); //link to article already exists
  } else if(req.body.category !== undefined){
      if(req.session.title.length < 31){
        var titleArticle = req.session.title;
        req.session.title = null;
        articles.create(titleArticle, req.body.category);
        res.redirect('/update/'+titleArticle);
      } else res.render('create', {too_long: true});
  } 
  else{
    req.session.title = articles.formatTitleDB(req.body.title);
    res.redirect('/create');
  }
});

app.post('/modify', (req, res) => {
  if(pathways.checkIfPathwayAlreadyExists(req.session.title, req.body.title_pathway)){
    pathways.create(req.session.title, req.body.title_pathway);
    res.redirect('/learn/'+req.session.title);
  } else res.render('update', {error_name: true});
});

app.post('/modify-title', (req, res) => {
  var new_title = articles.formatTitleDB(req.body.new_title);
  if(!articles.checkIfArticleAlreadyExist(new_title)){
    articles.updateTitle(req.session.title, new_title);
    req.session.title = new_title;
    res.redirect('/learn/'+req.session.title);
  } else res.render('update', {error_name: true});
});

app.post('/modify-pathway', (req, res) => {
  if(pathways.contentIsCorrect(req.body.text)){ 
    if(!pathways.checkIfContentAlreadyExists(req.session.title, req.session.pathway_name, 
      req.body.text, req.body.link)){
      pathways.addContent(req.session.title, req.session.pathway_name, 
                            req.body.text, req.body.link, req.session.user);
      res.redirect('/learn/'+req.session.title);
      } else contentAlreadyExists(req, res);
  } else res.render("update", {error_content: true})
});

app.post('/modify-content', (req, res) => {
  if(!pathways.checkIfContentAlreadyExists(req.session.title, req.session.pathway_name, 
                                              req.body.text, req.body.link)){
    precedent_content = req.body.precedent_content;
    pathways.updateContent(req.session.title, req.session.pathway_name, precedent_content,
      req.body.text, req.body.link, req.session.user);
    res.redirect('/learn/'+req.session.title);
  } else contentAlreadyExists(req, res); 
});

app.post('/modify-password', (req, res) => {
  var username = req.session.user.username;
  if(users.login(username, req.body.current_password) !== -1){
    if(req.body.new_password === req.body.repeat_password){
      req.session.user = users.updatePassword(username, req.body.new_password);
      res.redirect('/profile');
    } else res.render("profile", {different_passwords: true, username: username, 
                contributions: pathways.getModificationsFromUser(username)});
  }else res.render("profile", {invalid_password: true, username: username, 
                contributions: pathways.getModificationsFromUser(username)});
});

app.post('/admin-ban', (req, res) => {
  if(users.isExists(req.body.username)){
    users.delete(req.body.username);
    res.render("admin", {users: users.getLastUsers(), articles: articles.getLastArticles()});
  } else res.render("admin", {user_not_exists: true, users: users.getLastUsers(), 
                                articles: articles.getLastArticles()})
});

function contentAlreadyExists(req, res){
  var pathwayFormat = pathways.formatPathwayPrint(req.session.pathway_name);
  var pathway_content = pathways.getContentFromPathway(req.session.title, req.session.pathway_name);
  res.render("update", {pathway: true, name_pathway: pathwayFormat, 
    pathway_content: pathway_content, error_content_exists: true });
}

app.use(function(req, res, next) {
  res.status(404).send('Erreur 404, Page non trouvée !');
});

app.listen(3000, () => console.log('http://localhost:3000'));