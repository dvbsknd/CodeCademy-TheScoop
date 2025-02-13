// database is let instead of const to allow us to modify it in test.js
let database = {
  users: {},
  articles: {},
  nextArticleId: 1,
  comments: {},
  nextCommentId: 1
};

const routes = {
  '/users': {
    'POST': getOrCreateUser
  },
  '/users/:username': {
    'GET': getUser
  },
  '/articles': {
    'GET': getArticles,
    'POST': createArticle
  },
  '/articles/:id': {
    'GET': getArticle,
    'PUT': updateArticle,
    'DELETE': deleteArticle
  },
  '/articles/:id/upvote': {
    'PUT': upvoteArticle
  },
  '/articles/:id/downvote': {
    'PUT': downvoteArticle
  },
  '/comments': {
    'POST': createComment
  },
  '/comments/:id': {
    'PUT': updateComment,
    'DELETE': deleteComment
  },
  '/comments/:id/upvote': {
    'PUT': upvoteComment
  },
  '/comments/:id/downvote': {
    'PUT': downvoteComment
  }
};

function getUser(url, request) {
  const username = url.split('/').filter(segment => segment)[1];
  const user = database.users[username];
  const response = {};

  if (user) {
    const userArticles = user.articleIds.map(
        articleId => database.articles[articleId]);
    const userComments = user.commentIds.map(
        commentId => database.comments[commentId]);
    response.body = {
      user: user,
      userArticles: userArticles,
      userComments: userComments
    };
    response.status = 200;
  } else if (username) {
    response.status = 404;
  } else {
    response.status = 400;
  }

  return response;
}

function getOrCreateUser(url, request) {
  const username = request.body && request.body.username;
  const response = {};

  if (database.users[username]) {
    response.body = {user: database.users[username]};
    response.status = 200;
  } else if (username) {
    const user = {
      username: username,
      articleIds: [],
      commentIds: []
    };
    database.users[username] = user;

    response.body = {user: user};
    response.status = 201;
  } else {
    response.status = 400;
  }

  return response;
}

function getArticles(url, request) {
  const response = {};

  response.status = 200;
  response.body = {
    articles: Object.keys(database.articles)
        .map(articleId => database.articles[articleId])
        .filter(article => article)
        .sort((article1, article2) => article2.id - article1.id)
  };

  return response;
}

function getArticle(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const article = database.articles[id];
  const response = {};

  if (article) {
    article.comments = article.commentIds.map(
      commentId => database.comments[commentId]);

    response.body = {article: article};
    response.status = 200;
  } else if (id) {
    response.status = 404;
  } else {
    response.status = 400;
  }

  return response;
}

function createArticle(url, request) {
  const requestArticle = request.body && request.body.article;
  const response = {};

  if (requestArticle && requestArticle.title && requestArticle.url &&
      requestArticle.username && database.users[requestArticle.username]) {
    const article = {
      id: database.nextArticleId++,
      title: requestArticle.title,
      url: requestArticle.url,
      username: requestArticle.username,
      commentIds: [],
      upvotedBy: [],
      downvotedBy: []
    };

    database.articles[article.id] = article;
    database.users[article.username].articleIds.push(article.id);

    response.body = {article: article};
    response.status = 201;
  } else {
    response.status = 400;
  }

  return response;
}

function updateArticle(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const savedArticle = database.articles[id];
  const requestArticle = request.body && request.body.article;
  const response = {};

  if (!id || !requestArticle) {
    response.status = 400;
  } else if (!savedArticle) {
    response.status = 404;
  } else {
    savedArticle.title = requestArticle.title || savedArticle.title;
    savedArticle.url = requestArticle.url || savedArticle.url;

    response.body = {article: savedArticle};
    response.status = 200;
  }

  return response;
}

function deleteArticle(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const savedArticle = database.articles[id];
  const response = {};

  if (savedArticle) {
    database.articles[id] = null;
    savedArticle.commentIds.forEach(commentId => {
      const comment = database.comments[commentId];
      database.comments[commentId] = null;
      const userCommentIds = database.users[comment.username].commentIds;
      userCommentIds.splice(userCommentIds.indexOf(id), 1);
    });
    const userArticleIds = database.users[savedArticle.username].articleIds;
    userArticleIds.splice(userArticleIds.indexOf(id), 1);
    response.status = 204;
  } else {
    response.status = 400;
  }

  return response;
}

function upvoteArticle(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const username = request.body && request.body.username;
  let savedArticle = database.articles[id];
  const response = {};

  if (savedArticle && database.users[username]) {
    savedArticle = upvote(savedArticle, username);

    response.body = {article: savedArticle};
    response.status = 200;
  } else {
    response.status = 400;
  }

  return response;
}

function downvoteArticle(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const username = request.body && request.body.username;
  let savedArticle = database.articles[id];
  const response = {};

  if (savedArticle && database.users[username]) {
    savedArticle = downvote(savedArticle, username);

    response.body = {article: savedArticle};
    response.status = 200;
  } else {
    response.status = 400;
  }

  return response;
}

function upvote(item, username) {
  if (item.downvotedBy.includes(username)) {
    item.downvotedBy.splice(item.downvotedBy.indexOf(username), 1);
  }
  if (!item.upvotedBy.includes(username)) {
    item.upvotedBy.push(username);
  }
  return item;
}

function downvote(item, username) {
  if (item.upvotedBy.includes(username)) {
    item.upvotedBy.splice(item.upvotedBy.indexOf(username), 1);
  }
  if (!item.downvotedBy.includes(username)) {
    item.downvotedBy.push(username);
  }
  return item;
}

function createComment(url, request) {
  const requestComment = request.body && request.body.comment;
  const response = {};

  if (
    request.body &&
    request.body.comment &&
    requestComment.body && 
    requestComment.username && 
    requestComment.articleId &&
    database.users[requestComment.username] &&
    database.articles[requestComment.articleId]
    ) {

      const comment = {
        id: database.nextCommentId++,
        body: requestComment.body, 
        username: requestComment.username,
        articleId: requestComment.articleId,
        upvotedBy: [],
        downvotedBy: []
      };

    database.comments[comment.id] = comment;
    database.users[comment.username].commentIds.push(comment.id);
    database.articles[comment.articleId].commentIds.push(comment.id);

    response.body = {comment: comment};
    response.status = 201;

  } else {
    response.status = 400;
 }

  return response;
}

function updateComment(url, request) {
  const requestComment = request.body && request.body.comment;
  const response = {};

  // Comment supplied in response body will have .id, .body, .username, .articleID

  // If an equivalent comment doesn't exist, abort
  if (!database.comments[url.split('/')[2]]) {
    response.status = 404;
    return response; 
  }

  // Validate supplied data, then update
  if ( 
    requestComment && // Comment body supplied
    url.split('/')[2] == requestComment.id && // Endpoint matches ID in supplied body
    requestComment.username == database.comments[requestComment.id].username && // User matches
    requestComment.articleId == database.comments[requestComment.id].articleId && // Article matches
    requestComment.body != '' // Comment isn't blank
    ) {

    database.comments[requestComment.id].body = requestComment.body;
    response.status = 200;

  } else {
    response.status = 400;
  }

  return response;

}

function deleteComment(url, request) {

  // Receives comment ID from URL parameter, prepares response
  const commentId = url.split('/')[2];
  response = {};

  // If no ID is supplied or comment with supplied ID doesn’t exist, returns 404 response
  if (!commentId || !database.comments[commentId]) {
    response.status = 404;
    return response;
  }

  // Gets the user & artice IDs from the comment in the database
  const commentUser = database.comments[commentId].username;
  const articleId = database.comments[commentId].articleId;

  // removes all references to its ID from corresponding user model
  let userCommentIndex = database.users[commentUser].commentIds.indexOf(Number(commentId));
  database.users[commentUser].commentIds.splice(userCommentIndex, 1);
  
  // removes all references to its ID from corresponding article model
  let articleCommentIndex = database.articles[articleId].commentIds.indexOf(Number(commentId));
  database.articles[articleId].commentIds.splice(articleCommentIndex, 1);

  // Deletes comment from database
  database.comments[commentId] = null; 
  
  // returns 204 response
  response.status = 204;
  return response;

}

function voteOnComment(direction, url, request) {

  // Receives comment ID from URL parameter and username from username property of request body
  const commentId = url.split('/').filter(segment => segment)[1];
  const user = request.body && request.body.username;
  let increasingArray;
  let decreasingArray;

  // Initialise the repsonse object
  response = {};
  
  // If no ID is supplied, 
  // OR comment with supplied ID doesn’t exist, 
  // OR user with supplied username doesn’t exist, 
  // return a 400 response
  if (!commentId || !database.comments[commentId] || !database.users[user]) {
    response.status = 400;
    return response;
  }

  // Set the working arrays depending on the direction of the vote
  if (direction == 'Up') {
    increasingArray = database.comments[commentId].upvotedBy;
    decreasingArray = database.comments[commentId].downvotedBy;
  } else if (direction == 'Down') {
    increasingArray = database.comments[commentId].downvotedBy;
    decreasingArray = database.comments[commentId].upvotedBy;
  } else {
    throw new Error('Invalid vote type');
  }

  // Check if username exists in the increasingArray array, and if not, add it
  if (!increasingArray.find(voter => voter == user)) {
    increasingArray.push(user);
  }

  // Check if username exists in the decreasingArray array, and if so, remove it
  if (decreasingArray.find(voter => voter == user)) {
    const i = decreasingArray.indexOf(user);
    decreasingArray.splice(i, 1);
  }

  // Return 200 response with comment on comment property of response body
  response.body = { comment: database.comments[commentId] };
  response.status = 200;
  return response;

}

function upvoteComment(url, request) {

// Receives comment ID from URL parameter and username from username property of request body
// Adds supplied username to upvotedBy of corresponding comment if user hasn’t already upvoted 
// the comment, removes username from downvotedBy if that user had previously downvoted the 
// comment, returns 200 response with comment on comment property of response body
// If no ID is supplied, comment with supplied ID doesn’t exist, or user with supplied username 
// doesn’t exist, returns 400 response

  return voteOnComment('Up', url, request);

}

function downvoteComment(url, request) {

// Receives comment ID from URL parameter and username from username property of request body
// Adds supplied username to downvotedBy of corresponding comment if user hasn’t already 
// downvoted the comment, remove username from upvotedBy if that user had previously upvoted 
// the comment, returns 200 response with comment on comment property of response body
// If no ID is supplied, comment with supplied ID doesn’t exist, or user with supplied 
// username doesn’t exist, returns 400 response
  
  return voteOnComment('Down', url, request);

}

// include Figg to read/write YAML as a static database

const Figg = require('figg');
const fileStore = new Figg({
  name: 'database',
  extension: '.yaml'
})

function loadDatabase() {

  // Reads a YAML file containing the database and returns a JavaScript object 
  // representing the database
  // Called once on server start-up

  database = fileStore.load();

}

function saveDatabase() {

  // Writes the current value of database to a YAML file
  // Called on every call to a GET or POST method

  fileStore.set(database);
  fileStore.save();

}

// Write all code above this line.

const http = require('http');
const url = require('url');

const port = process.env.PORT || 4000;
const isTestMode = process.env.IS_TEST_MODE;

const requestHandler = (request, response) => {
  const url = request.url;
  const method = request.method;
  const route = getRequestRoute(url);

  if (method === 'OPTIONS') {
    var headers = {};
    headers["Access-Control-Allow-Origin"] = "*";
    headers["Access-Control-Allow-Methods"] = "POST, GET, PUT, DELETE, OPTIONS";
    headers["Access-Control-Allow-Credentials"] = false;
    headers["Access-Control-Max-Age"] = '86400'; // 24 hours
    headers["Access-Control-Allow-Headers"] = "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept";
    response.writeHead(200, headers);
    return response.end();
  }

  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.setHeader(
      'Access-Control-Allow-Headers', 'X-Requested-With,content-type');

  if (!routes[route] || !routes[route][method]) {
    response.statusCode = 400;
    return response.end();
  }

  if (method === 'GET' || method === 'DELETE') {
    const methodResponse = routes[route][method].call(null, url);
    !isTestMode && (typeof saveDatabase === 'function') && saveDatabase();

    response.statusCode = methodResponse.status;
    response.end(JSON.stringify(methodResponse.body) || '');
  } else {
    let body = [];
    request.on('data', (chunk) => {
      body.push(chunk);
    }).on('end', () => {
      body = JSON.parse(Buffer.concat(body).toString());
      const jsonRequest = {body: body};
      const methodResponse = routes[route][method].call(null, url, jsonRequest);
      !isTestMode && (typeof saveDatabase === 'function') && saveDatabase();

      response.statusCode = methodResponse.status;
      response.end(JSON.stringify(methodResponse.body) || '');
    });
  }
};

const getRequestRoute = (url) => {
  const pathSegments = url.split('/').filter(segment => segment);

  if (pathSegments.length === 1) {
    return `/${pathSegments[0]}`;
  } else if (pathSegments[2] === 'upvote' || pathSegments[2] === 'downvote') {
    return `/${pathSegments[0]}/:id/${pathSegments[2]}`;
  } else if (pathSegments[0] === 'users') {
    return `/${pathSegments[0]}/:username`;
  } else {
    return `/${pathSegments[0]}/:id`;
  }
}

if (typeof loadDatabase === 'function' && !isTestMode) {
  const savedDatabase = loadDatabase();
  if (savedDatabase) {
    for (key in database) {
      database[key] = savedDatabase[key] || database[key];
    }
  }
}

const server = http.createServer(requestHandler);

server.listen(port, (err) => {
  if (err) {
    return console.log('Server did not start succesfully: ', err);
  }

  console.log(`Server is listening on ${port}`);
});