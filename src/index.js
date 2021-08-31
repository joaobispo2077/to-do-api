const express = require('express');
const cors = require('cors');

const { v4: uuidv4 } = require('uuid');

const app = express();

app.use(cors());
app.use(express.json());

const users = [];

function checksExistsUserAccount(request, response, next) {
  const { username } = request.headers;

  const user = users.find(user => user.username === username);
  if (!user) {
    return response.status(404).json({ error: 'User not found' });
  }

  request.user = user;
  return next();
}

function checksCreateTodosUserAvailability(request, response, next) {
  const { user } = request;

  const isPro = user.pro;
  const hasMaxTodos = user.todos.length >= 10;
  const hasExceedFreePlan = !isPro && hasMaxTodos;

  const isAllowedToCreateTodo = !hasExceedFreePlan || isPro;
  if (isAllowedToCreateTodo) {
    return next();
  }

  return response.status(403).json({ error: 'Has exceeded free plan, check pro plan.' })
}

function checksTodoExists(request, response, next) {
  const { username } = request.headers;
  const { id } = request.params;

  const user = users.find(user => user.username === username);
  if (!user) {
    return response.status(404).json({ error: 'User not found' });
  }

  const matchUuidV4 = /^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
  if (!id || !matchUuidV4.test(id)) {
    return response.status(400).json({ error: 'Invalid id' });
  }

  const todo = user.todos.find(todo => todo.id === id);
  if (!todo) {
    return response.status(404).json({ error: 'Todo not found' });
  }

  request.todo = todo;
  request.user = user;

  return next();
}

app.post('/users', (request, response) => {
  const { username, name } = request.body;

  const isUserAlreadyExists = users.find(user => user.username === username);

  if (isUserAlreadyExists) {
    return response.status(400).json({ error: 'Username already exists.' });
  }

  const newUser = {
    id: uuidv4(),
    name,
    username,
    pro: false,
    todos: []
  };

  users.push(newUser);

  return response.status(201).json(newUser);
});

app.get('/users/:id', findUserById, (request, response) => {
  const { user } = request;

  return response.json(user);
});

app.patch('/users/:id/pro', findUserById, (request, response) => {
  const { user } = request;

  if (user.pro) {
    return response.status(400).json({ error: 'Pro plan is already activated.' });
  }

  user.pro = true;

  return response.json(user);
});

app.get('/todos', checksExistsUserAccount, (request, response) => {
  const { user } = request;

  return response.json(user.todos);
});

app.post('/todos', checksExistsUserAccount, checksCreateTodosUserAvailability, (request, response) => {
  const { title, deadline } = request.body;
  const { user } = request;

  const newTodo = {
    id: uuidv4(),
    title,
    done: false,
    deadline: new Date(deadline),
    created_at: new Date(),
  };

  user.todos.push(newTodo);

  return response.status(201).json(newTodo);
});

app.put('/todos/:id', checksExistsUserAccount, checksTodoExists, (request, response) => {
  const { title, deadline } = request.body;
  const { id } = request.params;
  const { user } = request;

  const todo = user.todos.find(todo => todo.id === id);
  if (!todo) {
    return response.status(404).json({ error: 'Todo not found' });
  }

  todo.title = title || todo.title;
  todo.deadline = deadline || todo.deadline;

  return response.status(200).json(todo);
});

app.patch('/todos/:id/done', checksExistsUserAccount, checksTodoExists, (request, response) => {
  const { id } = request.params;
  const { user } = request;

  const todo = user.todos.find(todo => todo.id === id);

  todo.done = true;

  return response.status(201).json(todo);
});

app.delete('/todos/:id', checksExistsUserAccount, checksTodoExists, (request, response) => {
  const { id } = request.params;
  const { user } = request;

  const todo = user.todos.find(todo => todo.id === id);

  user.todos.splice(todo, 1);

  return response.status(204).send();
});

module.exports = {
  app,
  users,
  checksExistsUserAccount,
  checksCreateTodosUserAvailability,
  checksTodoExists,
  findUserById
};