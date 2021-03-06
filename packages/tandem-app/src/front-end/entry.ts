import { noop } from "lodash";
import { Kernel } from "aerial-common";
import { LogLevel } from "aerial-common2";

import { 
  initApplication, 
  createWorkspace,
  addWorkspace,
  selectWorkspace,
  addSyntheticBrowser,
  createSyntheticBrowser,
  createApplicationState, 
} from "./index";

const baseConfig = Object.assign({}, {
  localStorageNamespace: "tandem",
  apiHost: ((location.hash || "").match(/api=([^&]+)/) ||[null, `http://localhost:8082`])[1],
}, window["config"] || {});

let state = createApplicationState({
  ...baseConfig,
  element: typeof document !== "undefined" ? document.getElementById("application") : undefined,
  log: {
    level: LogLevel.VERBOSE
  }
});

const browser = createSyntheticBrowser();
state = addSyntheticBrowser(state, browser);
const workspace = createWorkspace({ 
  browserId: browser.$id,
  stage: {
    panning: false,
    translate: { left: 0, top: 0, zoom: 1 },
    showLeftGutter: false,
    showRightGutter: false,
    showTextEditor: false
  }
});

state = addWorkspace(state, workspace);
state = selectWorkspace(state, workspace.$id);
initApplication(state);