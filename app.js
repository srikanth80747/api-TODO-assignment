const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const addDays = require("date-fns/addDays");
const format = require("date-fns/format");
const isValid = require("date-fns/isValid");

const app = express();
const dbPath = path.join(__dirname, "todoApplication.db");
app.use(express.json());
let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000");
    });
  } catch (error) {
    console.log(`Db Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const queryStatusCheck = (request, response, next) => {
  const { status } = request.query;
  const statusArray = ["TO DO", "IN PROGRESS", "DONE"];
  if (statusArray.includes(status) || status === undefined) {
    next();
  } else {
    response.status(400);
    response.send("Invalid Todo Status");
  }
};

const queryPriorityCheck = (request, response, next) => {
  const { priority } = request.query;
  const priorityArray = ["HIGH", "MEDIUM", "LOW"];
  if (priorityArray.includes(priority) || priority === undefined) {
    next();
  } else {
    response.status(400);
    response.send("Invalid Todo Priority");
  }
};

const queryCategoryCheck = (request, response, next) => {
  const { category } = request.query;
  const categoryArray = ["WORK", "HOME", "LEARNING"];
  if (categoryArray.includes(category) || category === undefined) {
    next();
  } else {
    response.status(400);
    response.send("Invalid Todo Category");
  }
};

const queryDueDateCheck = (request, response, next) => {
  let { date } = request.query;
  if (isValid(new Date(date)) || date === undefined) {
    next();
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
};

const convertDbObjectToResponseObject = (dbObject) => {
  return {
    id: dbObject.id,
    todo: dbObject.todo,
    priority: dbObject.priority,
    status: dbObject.status,
    category: dbObject.category,
    dueDate: dbObject.due_date,
  };
};

app.get(
  "/todos/",
  queryStatusCheck,
  queryPriorityCheck,
  queryCategoryCheck,
  queryDueDateCheck,
  async (request, response) => {
    let {
      status = "",
      priority = "",
      category = "",
      date = "",
      search_q = "",
    } = request.query;
    if (date !== "") {
      date = format(new Date(date), "yyyy-MM-dd");
    }
    const getAllTodoQuery = `
      SELECT *
      FROM todo
      WHERE status LIKE "%${status}%"
      AND priority LIKE "%${priority}%"
      AND category LIKE "%${category}%"
      AND due_date LIKE "%${date}%"
      AND todo LIKE "%${search_q}%";`;
    const allTodos = await db.all(getAllTodoQuery);
    response.send(
      allTodos.map((eachObject) => convertDbObjectToResponseObject(eachObject))
    );
  }
);

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `SELECT * FROM todo WHERE id = ${todoId};`;
  const todo = await db.get(getTodoQuery);
  response.send(convertDbObjectToResponseObject(todo));
});

app.get("/agenda/", queryDueDateCheck, async (request, response) => {
  let { date } = request.query;
  if (date !== "") {
    date = format(new Date(date), "yyyy-MM-dd");
  }
  const getTodoQuery = `SELECT * FROM todo WHERE due_date LIKE "%${date}%";`;
  const todo = await db.all(getTodoQuery);
  response.send(
    todo.map((eachObject) => convertDbObjectToResponseObject(eachObject))
  );
});

const postOrUpdateStatusCheck = (request, response, next) => {
  const { status } = request.body;
  const statusArray = ["TO DO", "IN PROGRESS", "DONE"];
  if (statusArray.includes(status) || status === undefined) {
    next();
  } else {
    response.status(400);
    response.send("Invalid Todo Status");
  }
};

const postOrUpdatePriorityCheck = (request, response, next) => {
  const { priority } = request.body;
  const priorityArray = ["HIGH", "MEDIUM", "LOW"];
  if (priorityArray.includes(priority) || priority === undefined) {
    next();
  } else {
    response.status(400);
    response.send("Invalid Todo Priority");
  }
};

const postOrUpdateCategoryCheck = (request, response, next) => {
  const { category } = request.body;
  const categoryArray = ["WORK", "HOME", "LEARNING"];
  if (categoryArray.includes(category) || category === undefined) {
    next();
  } else {
    response.status(400);
    response.send("Invalid Todo Category");
  }
};

const postOrUpdateDueDateCheck = (request, response, next) => {
  let { dueDate } = request.body;
  if (isValid(new Date(dueDate)) || dueDate === undefined) {
    next();
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
};

app.post(
  "/todos/",
  postOrUpdateStatusCheck,
  postOrUpdatePriorityCheck,
  postOrUpdateCategoryCheck,
  postOrUpdateDueDateCheck,
  async (request, response) => {
    let { id, todo, priority, status, category, dueDate } = request.body;
    if (dueDate !== "") {
      dueDate = format(new Date(dueDate), "yyyy-MM-dd");
    }
    const postTodoQuery = `
  INSERT INTO
  todo (id, todo, priority, status, category, due_date)
  VALUES
  (${id}, "${todo}", "${priority}", "${status}", "${category}", "${dueDate}");`;
    await db.run(postTodoQuery);
    response.send("Todo Successfully Added");
  }
);

app.put(
  "/todos/:todoId/",
  postOrUpdateStatusCheck,
  postOrUpdatePriorityCheck,
  postOrUpdateCategoryCheck,
  postOrUpdateDueDateCheck,
  async (request, response) => {
    const { todoId } = request.params;
    const getPreviousTodo = `SELECT * FROM todo WHERE id = ${todoId};`;
    const previousTodo = await db.get(getPreviousTodo);
    let element;
    switch (true) {
      case request.body.todo !== undefined:
        element = "Todo";
        break;
      case request.body.priority !== undefined:
        element = "Priority";
        break;
      case request.body.status !== undefined:
        element = "Status";
        break;
      case request.body.category !== undefined:
        element = "Category";
        break;
      case request.body.dueDate !== undefined:
        element = "Due Date";
        break;
    }
    let {
      todo = previousTodo.todo,
      priority = previousTodo.priority,
      status = previousTodo.status,
      category = previousTodo.category,
      dueDate = previousTodo.due_date,
    } = request.body;
    if (dueDate !== "") {
      dueDate = format(new Date(dueDate), "yyyy-MM-dd");
    }
    const updateTodoQuery = `
    UPDATE todo
    SET
    todo = "${todo}",
    priority = "${priority}",
    status = "${status}",
    category = "${category}",
    due_date = "${dueDate}"
    WHERE id = ${todoId};`;
    await db.run(updateTodoQuery);
    response.send(`${element} Updated`);
  }
);

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
    DELETE FROM todo WHERE id = ${todoId};`;
  await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
