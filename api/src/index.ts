import express from "express";
import cors from "cors";
import { createYoga } from "graphql-yoga";
import { schema } from "./interfaces/graphql/schema";

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const yoga = createYoga({
  schema,
  graphqlEndpoint: "/graphql",
});

app.use(yoga.graphqlEndpoint, yoga);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}/graphql`);
});
