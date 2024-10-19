import http from 'http';
import express, { Express, Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import routes from './routers/routes';

const app: Express = express();

//**Logging*/
app.use(morgan('dev'));

//** Parse the request */
app.use(express.urlencoded({ extended:false }));

//** Takes care of JSON data */
app.use(express.json());

app.get('/test', async (req, res) => {
  console.log("Hi running successfully");
  return res.send({"message" : "running Successfully"});
});

//** Routes */
app.use('/', routes);

const PORT: any = process.env.PORT ?? 5000;
const httpServer = http.createServer(app);
httpServer.listen(PORT, () => console.log(`The server is running on port ${PORT}`));
