import * as express from "express";
import { ExtensionState } from "../state";
import * as getPort from "get-port";
import * as cors from "cors";
import * as http from "http";
import * as io from "socket.io";
import * as multiparty from "connect-multiparty";
import { eventChannel } from "redux-saga";
import { CHILD_DEV_SERVER_STARTED, expressServerStarted } from "../actions";
import { select, fork, spawn, take, put, call } from "redux-saga/effects";

export function* expresssServerSaga() {
  yield fork(handleVisualDevConfigLoaded);
}

function* handleVisualDevConfigLoaded() {
  while(true) {
    yield take(CHILD_DEV_SERVER_STARTED);
    let server: express.Express;
    let httpServer: http.Server;
    if (httpServer) {
      httpServer.close();
    }

    const { visualDevConfig: { port } }: ExtensionState = yield select();

    server = express();
    server.use(cors());

    // TODO - dispatch express server initialized
    httpServer = server.listen(port);
    yield put(expressServerStarted(server));
    console.log(`HTTP server listening on port ${port}`);  
  }
}