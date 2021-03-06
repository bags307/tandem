import { fork, take, select, call, put, spawn } from "redux-saga/effects";
import { kebabCase } from "lodash";
import { eventChannel } from "redux-saga";
import * as request from "request";
import { PCRemoveChildNodeMutation, createPCRemoveChildNodeMutation, createPCRemoveNodeMutation } from "paperclip";

import { ApplicationState, RegisteredComponent, getFileCacheContent } from "../state";
import { flatten } from "lodash";
import { loadModuleAST, parseModuleSource, loadModuleDependencyGraph, DependencyGraph, Module, Component, getAllChildElementNames, getComponentMetadataItem, editPaperclipSource } from "paperclip";
import { PAPERCLIP_FILE_PATTERN, PAPERCLIP_FILE_EXTENSION } from "../constants";
import { getModuleFilePaths, getModuleId, getPublicFilePath, getReadFile, getAvailableComponents, getComponentsFromSourceContent, getPublicSrcPath, getPreviewComponentEntries, getAllModules } from "../utils";
import { watchUrisRequested, expressServerStarted, EXPRESS_SERVER_STARTED, ExpressServerStarted, fileContentChanged } from "../actions";
import * as express from "express";
import * as path from "path";
import * as fs from "fs";
import * as ts from "typescript";
import * as glob from "glob";
import { editString, StringMutation } from "source-mutation";
import { weakMemo } from "aerial-common2";
import { expresssServerSaga } from "./express-server";
import { PUBLIC_SRC_DIR_PATH, DEFAULT_COMPONENT_PREVIEW_SIZE } from "../constants";

export function* routesSaga() {
  yield fork(handleExpressServerStarted);
}

function* handleExpressServerStarted() {
  while(true) {
    const { server }: ExpressServerStarted = yield take(EXPRESS_SERVER_STARTED);
    yield addRoutes(server);
  }
}

function* addRoutes(server: express.Express) {

  const state: ApplicationState = yield select();

  server.use(PUBLIC_SRC_DIR_PATH, yield wrapRoute(getFile));
  server.use(express.static(path.join(path.dirname(require.resolve("paperclip")), "dist")));
  console.log("serving paperclip dist/ folder");

  server.all(/^\/proxy\/.*/, yield wrapRoute(proxy));
  server.post(PUBLIC_SRC_DIR_PATH, yield wrapRoute(setFile));

  // return all components
  server.get("/components", yield wrapRoute(getComponents));

  // return all components
  server.get("/screenshots/:screenshotId", yield wrapRoute(getComponentsScreenshot));

  // return a module preview
  // all is OKAY since it's not a valid tag name
  server.get("/components/all/preview", yield wrapRoute(getAllComponentsPreview));

  // return a module preview
  server.get("/components/:componentId/preview", yield wrapRoute(getComponentPreview));

  // create a new component (creates a new module with a single component)
  server.post("/components", yield wrapRoute(createComponent));

  
  // create a new component (creates a new module with a single component)
  server.delete("/components/:componentId", yield wrapRoute(deleteComponent));
  
  // 
  server.post("/watch", yield wrapRoute(watchUris));

  // edits a file
  server.post("/edit", yield wrapRoute(editFiles));

  // edits a file
  server.post("/file", yield wrapRoute(setFileContent));
  
}

function* getFile(req: express.Request, res: express.Response) {
  const state: ApplicationState = yield select();
  const filePath = path.join(state.config.sourceDirectory, req.path);

  const content = getFileCacheContent(filePath, state);
  
  return content ? res.send(content) : res.sendFile(filePath);
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

function getCapabilities() {
  return [
    "CREATE_COMPONENTS",
    "GET_COMPONENTS"
  ];
}

function* getModuleFileContent(req: express.Request, res: express.Response, next) {
  const { moduleId } = req.params;
  const state: ApplicationState = yield select();
  const targetModuleFilePath = getModuleFilePaths(state).find((filePath) => getModuleId(filePath) === moduleId);
  if (!targetModuleFilePath) next();
  res.sendFile(targetModuleFilePath);
}

function* getAllComponentsPreview(req: express.Request, res: express.Response, next) {  
  const state: ApplicationState = yield select();

  const entries = getPreviewComponentEntries(state);

  const html = `
  <html>
    <head>
      <title>All components</title>

      <!-- paperclip used to compile templates in the browser -- primarily to reduce latency of 
      sending bundled files over a network, especially when there are many canvases. -->
      <script type="text/javascript" src="/paperclip.min.js"></script>
    </head>
    <body>
      <script>
        const entries = ${JSON.stringify(entries)};
        const _cache = {};

        const onPreviewBundle = ({ previewComponentId, bounds }, { code }) => {
          const { entry, modules } = new Function("window", "with (window) { return " + code + "}")(window);

          const container = document.createElement("div");
          container.appendChild(document.createElement(previewComponentId));

          Object.assign(container.style, { 
            position: "absolute", 
            overflow: "hidden",
            left: bounds.left, 
            top: bounds.top, 
            width: bounds.right - bounds.left, 
            height: bounds.bottom - bounds.top 
          });
          
          document.body.appendChild(container);
        };
        
        const loadNext = (entries, index, graph) => {

          if (index >= entries.length) {
            return Promise.resolve();
          }


          const entry = entries[index];

          paperclip.bundleVanilla(entry.relativeFilePath, {
            io: {
              readFile(uri) {

                return _cache[uri] ? _cache[uri] : _cache[uri] = fetch(uri)
                .then((response) => response.text())
                .then(text => _cache[uri] = Promise.resolve(text))
              }
            }
          })
          .then(onPreviewBundle.bind(this, entry))
          .then(loadNext.bind(this, entries, index + 1, graph));
        };

        loadNext(entries, 0, {});
      </script>
    </body>
  </html>
  `;

  res.send(html);
}

function* createComponent(req: express.Request, res: express.Response) {
  const { name } = yield getPostData(req);

  const state: ApplicationState = yield select();
  const componentId = kebabCase(name);

  const content = `` +
  `<component id="${componentId}">\n` + 
  `  <style>\n` + 
  `  </style>\n` +
  `  <template>\n` + 
  `  </template>\n` +
  `</component>\n\n` +

  `<component id="${componentId}-preview">\n` +
  `  <meta name="preview" content="of=${componentId}, width=400, height=400"></meta>\n` +
  `  <template>\n` +
  `    <${componentId} />\n` +
  `  </template>\n` +
  `</component>\n`;

  const filePath = path.join(state.config.sourceDirectory, componentId + "." + PAPERCLIP_FILE_EXTENSION);

  if (fs.existsSync(filePath)) {
    res.statusCode = 500;
    return res.send({
      message: "Component exists"
    });
  }

  fs.writeFileSync(
    filePath,
    content
  );

  res.send({ componentId: componentId });

  // TODO - create global style if it doesn"t already exist
  // check if component name is already taken (must be unique)
  // create style based on component name
  // create component based on WPC spec (or something like that), basically this:
  /*
  <template name="test">
    
    <style scoped>
      .container {

      }
    </style>
    <div className="container">
    </div>
  </template>

  <preview>
    
    <test />
  </preview>
  */
}

function* deleteComponent(req: express.Request, res: express.Response, next) {
  const state: ApplicationState = yield select();
  const componentId = req.params.componentId;
  const readFile = getReadFile(state);
  const allModules = getAllModules(state) as Module[];

  // scan for dependencies of component

  const dependents: Module[] = [];
  let targetModule: Module;
  let targetComponent: Component;
  let previewComponent: Component;

  for (const module of allModules) {
    for (const component of module.components) {
      if (!targetModule && component.id === componentId) {
        targetModule = module;
        targetComponent = component;
        continue;
      }
      const pmeta = getComponentMetadataItem(component, "preview");
      if (pmeta && pmeta.params.of === componentId) {
        previewComponent = component;
        continue;
      }
      const childElementNames = getAllChildElementNames(component.template);

      if (childElementNames.indexOf(componentId) !== -1) {
        dependents.push(module);
      }
    }
  }

  if (!targetModule) {
    res.statusCode = 404;
    return res.send({
      message: "Could not find component"
    });
  };

  if (dependents.length) {
    res.statusCode = 500;
    return res.send({
      message: `Component references in ${dependents.map(dep => dep.uri)} must be removed before deleting ${componentId}`
    });
  }

  const oldContent = readFile(targetModule.uri);

  const content = editString(oldContent, [
    ...editPaperclipSource(oldContent, createPCRemoveNodeMutation(targetComponent.source)),
    ...(previewComponent ? editPaperclipSource(oldContent, createPCRemoveNodeMutation(previewComponent.source)) : [])
  ]);

  yield put(fileContentChanged(targetModule.uri, getPublicFilePath(targetModule.uri, state), new Buffer(content), new Date()));

  res.send({});
}

function* proxy(req, res: express.Response) {
  let [match, uri] = req.path.match(/proxy\/(.+)/);
  uri = decodeURIComponent(uri);
  req.url = uri;
  req.pipe(request({
    uri: uri
  }).on("error", (err) => {
    res.statusCode = 500;
    res.send(err.stack);
  })).pipe(res);
}

function* getComponents(req: express.Request, res: express.Response) {
  const state = yield select();
  res.send(yield call(getAvailableComponents, state, getReadFile(state)));
  // TODO - scan for PC files, and ignore files with <meta name="preview" /> in it
}

function* getComponentsScreenshot(req: express.Request, res: express.Response, next) {
  const state: ApplicationState = yield select();
  const { uri } = state.componentScreenshots[Number(req.params.screenshotId)] || { uri: null };

  if (!uri) {
    return next();
  }

  res.sendFile(uri);
}

function* getPostData (req: express.Request) {

  const chan = eventChannel((emit) => {
    let buffer = [];
    req.on("data", chunk => buffer.push(chunk));
    req.on("end", () => emit(JSON.parse(buffer.join(""))));
    return () => { };
  });

  return yield take(chan);
}

function* watchUris(req: express.Request, res: express.Response) {
  const data = yield call(getPostData, req);
  yield put(watchUrisRequested(data));
  res.send([]);
}


const getTranspileOptions = weakMemo((state: ApplicationState) => ({
  assignTo: "bundle",
  readFileSync: getReadFile(state),
  extensions: state.config.extensions,
  moduleDirectories: state.config.moduleDirectories
}));

function* getComponentPreview(req: express.Request, res: express.Response) {

  // TODO - evaluate PC code IN THE BROWSER -- need to attach data information to element
  // nodes
  const state: ApplicationState = yield select();
  const { componentId } = req.params;

  const components = (yield call(getAvailableComponents, state, getReadFile(state))) as RegisteredComponent[];

  const targetComponent = components.find(component => component.tagName === componentId);


  if (!targetComponent || !targetComponent.filePath) {
    res.status(404);
    return res.send(`Component not found`);
  }

  const relativeModuleFilePath = getPublicSrcPath(targetComponent.filePath, state);

  let content: string;

  const html = `
  <html>
    <head>
      <title>${targetComponent.label}</title>

      <!-- paperclip used to compile templates in the browser -- primarily to reduce latency of 
      sending bundled files over a network, especially when there are many canvases. -->
      <script type="text/javascript" src="/paperclip.min.js"></script>
    </head>
    <body>
      <script>
        let _loadedDocument;
        const previewTargetComponentId = "${componentId}";

        // hook into synthetic document's load cycle -- ensure
        // that it doesn't emit a load event until the paperclip module
        // preview has been added to the document body
        document.interactiveLoaded = new Promise((resolve) => {
          _loadedDocument = resolve;
        });

        let _cache = {};

        paperclip.bundleVanilla("${targetComponent.filePath}", {
          io: {
            readFile(uri) {
              return _cache[uri] ? _cache[uri] : _cache[uri] = fetch(uri.replace("${state.config.sourceDirectory}", "${PUBLIC_SRC_DIR_PATH}")).then((response) => response.text()).then((text) => _cache[uri] = Promise.resolve(text));
            }
          }
        }).then(({ code, warnings, entryDependency }) => {
          const { entry, modules } = new Function("window", "with (window) { return " + code + "}")(window);

          const components = entryDependency.module.components;
          let previewComponent = components.find((component) => {
            const previewMetadata = paperclip.getComponentMetadataItem(component, "preview");
            
            return previewMetadata && previewMetadata.params.of === previewTargetComponentId;
          });

          if (!previewComponent) {
            return document.body.appendChild(document.createTextNode("Unable to find preview of component " + previewTargetComponentId));
          }
          const element = document.createElement(previewComponent.id);

          // attach source so that modules can be meta clicked
          element.source = { uri: "${targetComponent.filePath}" };
          document.body.appendChild(element);
        }).then(_loadedDocument);
      </script>
    </body>
  </html>
  `;

  res.send(html);
}

function* setFileContent(req: express.Request, res: express.Response, next) {
  const { filePath, content, timestamp } = yield getPostData(req);
  const state = yield select();
  yield put(fileContentChanged(filePath, getPublicFilePath(filePath, state), new Buffer(content), new Date(timestamp)));
}

function* editFiles(req: express.Request, res: express.Response, next) {
  // const mutationsByUri = yield call(getPostData, req);
  // const state: ApplicationState = yield select();

  // const result: any = {};

  // for (const uri in mutationsByUri) {
  //   if (uri.substr(0, 5) !== "file:") continue;
  //   const filePath = path.normalize(uri.substr(7));
  //   const fileCacheItem = state.fileCache.find((item) => item.filePath === filePath);
  //   if (!fileCacheItem) {
  //     console.warn(`${filePath} was not found in cache, cannot edit!`);
  //     continue;
  //   }

  //   // TODO - add history here
  //   const mutations = mutationsByUri[uri];
  //   const oldContent = fileCacheItem.content.toString("utf8");

  //   const stringMutations = flatten(mutations.map(editPCContent.bind(this, oldContent))) as StringMutation[];

  //   const newContent = editString(oldContent, stringMutations);

  //   result[uri] = newContent;

  //   yield put(fileContentChanged(filePath, new Buffer(newContent, "utf8"), new Date()));
  //   yield put(fileChanged(filePath)); // dispatch public change -- causes reload
  // }

  // res.send(result);

  next();
}

function* setFile(req: express.Request, res: express.Response) { 
  const { filePath, content } = yield call(getPostData, req);
  const state: ApplicationState = yield select();
  const publicPath = getPublicFilePath(filePath, state);
  yield put(fileContentChanged(filePath, publicPath, new (Buffer as any)(content, "utf8"), new Date()));
  res.send([]);
}