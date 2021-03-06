export * from "./grid";

import "./index.scss";
import React =  require("react");
import { pure, compose } from "recompose";
import { Workspace } from "front-end/state";
import { Dispatcher, Translate } from "aerial-common2";
import { SyntheticBrowser } from "aerial-browser-sandbox";
import { EditTextTool } from "./edit-text";
import { GridStageTool } from "./grid";
import { WindowsStageTool } from "./windows";
import { NodeOverlaysTool } from "./overlay";
import { AffectedNodesTool } from "./affected-nodes";
import { SelectionStageTool } from "./selection";
import { BoxModelStageTool } from "./box-model";
import { StaticPositionStageTool } from "./static-position";

export type ToolsProps = {
  translate: Translate;
  workspace: Workspace;
  browser: SyntheticBrowser;
  dispatch: Dispatcher<any>;
};

export const ToolsLayerBase = ({ workspace, browser, dispatch, translate }: ToolsProps) => {
  const showTools = workspace.stage.showTools !== false;

  const windowElement = <WindowsStageTool workspace={workspace} browser={browser} dispatch={dispatch} translate={translate} />;

  if (showTools === false) {
    return <div className="m-stage-tools">
      { windowElement }
    </div>;
  }
  return <div className="m-stage-tools">
    <GridStageTool translate={translate} />
    <NodeOverlaysTool zoom={translate.zoom} workspace={workspace} browser={browser} dispatch={dispatch} />
    <BoxModelStageTool zoom={translate.zoom} workspace={workspace} browser={browser} />
    <SelectionStageTool zoom={translate.zoom} workspace={workspace} browser={browser} dispatch={dispatch} />

    { windowElement }
    <StaticPositionStageTool zoom={translate.zoom} workspace={workspace} browser={browser} />
    <EditTextTool zoom={translate.zoom} workspace={workspace}  browser={browser} dispatch={dispatch} />
    <AffectedNodesTool zoom={translate.zoom} workspace={workspace} browser={browser} />
  </div>;
}

export const ToolsLayer = compose<ToolsProps, ToolsProps>(
  pure
)(ToolsLayerBase);
