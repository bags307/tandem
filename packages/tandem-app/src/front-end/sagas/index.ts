import { delay } from "redux-saga";
import { Kernel } from "aerial-common";
import { createQueue } from "mesh";
import { shortcutsService } from "./shortcuts";
import { mainWorkspaceSaga } from "./workspace";
import { fork, call, select } from "redux-saga/effects";
import { syntheticBrowserSaga } from "aerial-browser-sandbox";
import { Dispatcher } from "aerial-common2";
import { createUrlProxyProtocolSaga } from "./protocol";
import { frontEndSyntheticBrowserSaga } from "./synthetic-browser";
import { persistStateSaga } from "./persist-state";
import { apiSaga } from "./api";

export function* mainSaga() {
  yield fork(yield call(createUrlProxyProtocolSaga));
  yield fork(syntheticBrowserSaga);
  yield fork(mainWorkspaceSaga);
  yield fork(shortcutsService);
  yield fork(frontEndSyntheticBrowserSaga);
  yield fork(persistStateSaga);
  yield fork(apiSaga);
}
