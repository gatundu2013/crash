import express from "express";

const app = express();

async function startServer() {
  try {
    //TODO: connect database

    app.listen(4000, () => {
      console.log("The server is running on port 4000");
    });
  } catch (err) {
    console.error(err);
  }
}

export { startServer };
