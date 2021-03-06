import { Request, Response } from "express";
import * as request from "request";
import { ExtensionState } from "../state";
import * as HttpProxy from "http-proxy";
import * as express from "express";
import * as fs from "fs";
import * as path from "path";
import { CHILD_DEV_SERVER_STARTED, startDevServerRequest, openFileRequested, ExpressServerStarted, EXPRESS_SERVER_STARTED, expressServerStarted } from "../actions";
import { take, fork, call, select, put, spawn } from "redux-saga/effects";
import { eventChannel } from "redux-saga";
import { routeHTTPRequest } from "../utils";

const FILES_PATTERN = /^\/edit$/;

export function* apiSaga() {
  yield fork(handleExpressServerStarted);
}

function* handleExpressServerStarted() {
  while(true) {
    const { server }: ExpressServerStarted = yield take(EXPRESS_SERVER_STARTED);
    yield addRoutes(server);
  }
}

export function* addRoutes(server: express.Express) {
  const proxy = HttpProxy.createProxyServer();
  proxy.on("error", (err, req, res) => {
    res.writeHead(500, {
      'Content-Type': 'text/plain'
    });
    res.end(err.message);
  });

  server.post("/open", yield wrapRoute(handleOpenFile));
  server.use("/tandem", express.static(getTandemDirectory(yield select())));
  server.get("/index.html", yield wrapRoute(getIndex));
  server.all(/.*/, yield wrapRoute(proxyToDevServer(proxy)));
}
function* getPostData (req) {
  
    const chan = eventChannel((emit) => {
      let buffer = [];
      req.on("data", chunk => buffer.push(chunk));
      req.on("end", () => emit(JSON.parse(buffer.join(""))));
      return () => { };
    });
  
    return yield take(chan);
  }

function proxyToDevServer(proxy: HttpProxy, onRequest: (req: Request) => any = () => {}) {
  return function*(req: Request, res: Response) {
    const state: ExtensionState = yield select();
    const devPort = state.childDevServerInfo.port;
    const host = `http://127.0.0.1:${devPort}`;
    proxy.web(req, res, { target: host });
    yield call(onRequest, req);
  };
}

const getTandemDirectory = (state: ExtensionState) => path.dirname(require.resolve(state.visualDevConfig.vscode.tandemcodeDirectory || "tandemcode"));

function* getIndex(req: Request, res: Response) {
  let state: ExtensionState = yield select();

  if (!state.childDevServerInfo) {
    yield put(startDevServerRequest());
    yield take(CHILD_DEV_SERVER_STARTED);
    state = yield select();
  }

  const { getEntryHTML } = require(getTandemDirectory(state));

  res.send(getEntryHTML({
    apiHost: `http://localhost:${state.visualDevConfig.port}`,
    proxy: `http://localhost:${state.visualDevConfig.port}/proxy/`,
    localStorageNamespace: state.rootPath,
    filePrefix: "/tandem"
  }));
}

function* getTandemFile(req: Request, res: Response) {
  const filePath = req.path.match(/tandem(.*)/)[1]
  fs.createReadStream(getTandemDirectory(yield select()) + filePath).pipe(res);
}

function* handleOpenFile(req: Request, res: Response) {
  const body = yield getPostData(req);
  res.send(`"ok"`);
  yield put(openFileRequested(body));
}


function* wrapRoute(route) {
  
    let handle;
  
    const chan = eventChannel((emit) => {
      handle = (req, res, next) => {
        emit([req, res, next]);
      }
  
      return () => {};
    });
  
    yield spawn(function*() {
      while(true) {
        yield route(...(yield take(chan)));
      }
    });
  
    return function(req: express.Request, res: express.Response, next) {
      handle(req, res, next);
    }
  }
  