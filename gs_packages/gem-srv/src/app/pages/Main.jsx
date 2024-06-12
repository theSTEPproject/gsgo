/* eslint-disable react/destructuring-assignment */
/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  Main - Teacher/Admin/Projector interface

  * Manage network devices
  * Control simulation playback

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import UR from '@gemstep/ursys/client';
import React from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { withStyles } from '@material-ui/core/styles';

import * as SIMCTRL from 'modules/msgex/mx-sim-control';
import * as PROJSERVER from './helpers/project-server';
import * as ACMetadata from 'modules/appcore/ac-metadata';
import * as ACConversationAgent from 'modules/appcore/ac-conversation-agent';
import { ERR_MGR } from 'modules/error-mgr';

/// PANELS ////////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import MissionMapEditor from './MissionMapEditor';
import MissionRun from './MissionRun';
import PanelSimulation from './components/PanelSimulation';
import PanelPlayback from './components/PanelPlayback';
import PanelInstances from './components/PanelInstances';
import DialogConfirm from './components/DialogConfirm';

import PanelTracker from './components/PanelTracker';
import FormTransform from './components/FormTransform';
import ECAManager from './components/ECAForm/ECAManager';
import PanelProjectEditor from './components/PanelProjectEditor';
import TabMenu from './components/TabMenu/TabMenu';
import TabButton from './components/TabMenu/TabButton';
import Dragger from './components/Dragger';
import 'lib/css/tracker.css';
import 'lib/css/gem-ui.css';

/// TESTS /////////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// import 'test/unit-parser'; // test parser evaluation

/// STYLES ////////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// this is where classes.* for css are defined
import { useStylesHOC } from './helpers/page-xui-styles';
import './scrollbar.css';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const PR = UR.PrefixUtil('MAIN', 'TagRed');
const DBG = false;
let DEVICE_UDID;

/// PANEL CONFIGURATIONS //////////////////////////////////////////////////////
const PANEL_CONFIG = new Map();
PANEL_CONFIG.set('run', '15% auto 250px'); // columns
PANEL_CONFIG.set('run-map', '50% auto 250px'); // columns
PANEL_CONFIG.set('edit', '40% auto 0px'); // columns
PANEL_CONFIG.set('tracker', '0px auto 400px'); // columns

/// CLASS DECLARATION /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// NOTE: STYLES ARE IMPORTED FROM COMMON-STYLES.JS

class MissionControl extends React.Component {
  constructor() {
    super();
    const { bpNamesList } = UR.ReadFlatStateGroups('blueprints');
    this.state = {
      selectedTab: 'control',
      panelConfiguration: 'run',
      message: '',
      projId: '', // set by project-server
      projectIsLoaded: false,
      bpNamesList,
      devices: [],
      inspectorInstances: [],
      runIsMinimized: true,
      scriptsNeedUpdate: false,
      openRedirectDialog: false,
      dialogMessage: undefined,
      showWebCam: false,
      consoleLeftWidth: 15, // as % of screen
      consoleRightWidth: 20 // as % of screen
    };

    // Initialization
    this.urStateUpdated = this.urStateUpdated.bind(this);
    this.GetUDID = this.GetUDID.bind(this);
    this.FailSimAlreadyRunning = this.FailSimAlreadyRunning.bind(this);

    // Devices
    this.UpdateDeviceList = this.UpdateDeviceList.bind(this);

    // Data Update Handlers
    this.DoScriptUpdate = this.DoScriptUpdate.bind(this);
    this.DoSimStop = this.DoSimStop.bind(this);
    this.OnSimWasReset = this.OnSimWasReset.bind(this);
    this.OnInspectorUpdate = this.OnInspectorUpdate.bind(this);
    this.PostMessage = this.PostMessage.bind(this);
    this.DoShowMessage = this.DoShowMessage.bind(this);
    this.UpdateWebCamSetting = this.UpdateWebCamSetting.bind(this);
    this.SaveWebCamSetting = this.SaveWebCamSetting.bind(this);
    this.UpdateLogSetting = this.UpdateLogSetting.bind(this);
    this.SetECAContext = this.SetECAContext.bind(this);
    UR.HandleMessage('NET:SCRIPT_UPDATED', this.DoScriptUpdate);
    UR.HandleMessage('NET:HACK_SIM_STOP', this.DoSimStop);
    UR.HandleMessage('NET:SIM_WAS_RESET', this.OnSimWasReset);
    UR.HandleMessage('NET:INSPECTOR_UPDATE', this.OnInspectorUpdate);
    UR.HandleMessage('SHOW_MESSAGE', this.DoShowMessage);
    UR.HandleMessage('WEBCAM_UPDATE', this.UpdateWebCamSetting);
    UR.HandleMessage('SET_ECA_CONTEXT', this.SetECAContext);

    // Instance Interaction Handlers
    this.HandleDragEnd = this.HandleDragEnd.bind(this);
    this.HandleSimInstanceClick = this.HandleSimInstanceClick.bind(this);
    this.HandleSimInstanceHoverOver = this.HandleSimInstanceHoverOver.bind(this);
    this.HandleSimInstanceHoverOut = this.HandleSimInstanceHoverOut.bind(this);
    UR.HandleMessage('DRAG_END', this.HandleDragEnd);
    UR.HandleMessage('SIM_INSTANCE_CLICK', this.HandleSimInstanceClick);
    UR.HandleMessage('SIM_INSTANCE_HOVEROVER', this.HandleSimInstanceHoverOver);
    UR.HandleMessage('SIM_INSTANCE_HOVEROUT', this.HandleSimInstanceHoverOut);

    // Panel UI Configuration
    this.OnToggleRunEdit = this.OnToggleRunEdit.bind(this);
    this.OnToggleNetworkMapSize = this.OnToggleNetworkMapSize.bind(this);
    this.OnPanelClick = this.OnPanelClick.bind(this);
    this.OnSelectView = this.OnSelectView.bind(this);
    this.OnToggleTracker = this.OnToggleTracker.bind(this);
    this.OnDraggerLeftUpdate = this.OnDraggerLeftUpdate.bind(this);
    this.OnDraggerRightUpdate = this.OnDraggerRightUpdate.bind(this);
    this.openECA = this.openECA.bind(this);
    this.closeECA = this.closeECA.bind(this);
    this.handleSelect = this.handleSelect.bind(this);
    this.handleECAToggleMessage = this.handleECAToggleMessage.bind(this);
    UR.HandleMessage('ECA_TOGGLE', this.handleECAToggleMessage);

    // Project Data
    this.OnExport = this.OnExport.bind(this);
  }

  componentDidMount() {
    const params = new URLSearchParams(window.location.search.substring(1));
    const projId = params.get('project');

    // Catch use of old URLs
    const oldModelParm = params.get('model');
    if (oldModelParm) {
      // eslint-disable-next-line no-alert
      alert('"model=<id>" is deprecated.  Please use "project=<id>" instead!');
      window.location = '/app/login';
      return;
    }

    // No project selected, go back to login to select project
    if (projId === null) window.location = '/app/login';

    this.setState({ projId });

    // start URSYS
    UR.SystemAppConfig({ autoRun: true });

    UR.SubscribeState('project', this.urStateUpdated);

    // Prepare project-server for db load
    // We read the currently selected projId from the URL,
    // and prep project-server to load it.
    // project-server will load on UR/APP_START
    if (ERR_MGR) {
      try {
        PROJSERVER.ProjectDataPreInit(this, projId);
      } catch (caught) {
        ERR_MGR.Dump();
      }
    } else PROJECTSERVER.ProjectDataPreInit(this, projId);
  }

  componentWillUnmount() {
    UR.UnsubscribeState('project', this.urStateUpdated);
    UR.UnhandleMessage('UR_DEVICES_CHANGED', this.UpdateDeviceList);
    UR.UnhandleMessage('NET:SCRIPT_UPDATED', this.DoScriptUpdate);
    UR.UnhandleMessage('NET:HACK_SIM_STOP', this.DoSimStop);
    UR.UnhandleMessage('NET:SIM_WAS_RESET', this.OnSimWasReset);
    UR.UnhandleMessage('NET:INSPECTOR_UPDATE', this.OnInspectorUpdate);
    UR.UnhandleMessage('DRAG_END', this.HandleDragEnd);
    UR.UnhandleMessage('SIM_INSTANCE_CLICK', this.HandleSimInstanceClick);
    UR.UnhandleMessage('SIM_INSTANCE_HOVEROVER', this.HandleSimInstanceHoverOver);
    UR.UnhandleMessage('SIM_INSTANCE_HOVEROUT', this.HandleSimInstanceHoverOut);
    UR.UnhandleMessage('SHOW_MESSAGE', this.DoShowMessage);
    UR.UnhandleMessage('ECA_TOGGLE', this.handleECAToggleMessage);
    UR.HandleMessage('SET_ECA_CONTEXT', this.SetECAContext)
  }

  GetUDID() {
    return DEVICE_UDID;
  }

  urStateUpdated(stateObj, cb) {
    const { project, bpNamesList } = stateObj;
    if (project) this.setState({ projectIsLoaded: true });
    if (bpNamesList) this.setState({ bpNamesList });
    if (typeof cb === 'function') cb();
  }

  FailSimAlreadyRunning() {
    const { projId } = this.state;
    this.setState({ openRedirectDialog: true });
    // redirect to project view
    window.location = `/app/project?project=${projId}&redirect`;
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// DEVICE HANDLERS
  ///
  UpdateDeviceList(devices = []) {
    if (Array.isArray(devices)) {
      const UDID = this.GetUDID();
      const filtered = devices.filter(d => d.udid !== UDID); // remove self
      this.setState({ devices: filtered });
      return;
    }
    console.error(...PR('UDL error, got', devices));
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// DATA UPDATE HANDLERS
  ///
  /**
   * User has submitted a new script, just update message
   * project-server handles script editing and instance creation
   * @param {object} data { script }
   */
  DoScriptUpdate(data) {
    const firstline = data.script.match(/.*/)[0];
    this.PostMessage(`Received script ${firstline}`);
    // HandleSimDataUpdate will set scriptNeedsUpdate flag
  }
  DoSimStop() {
    // Give it extra time after the "HACK_SIM_STOP" message is raised as the sim does not stop  immediately
    setTimeout(() => this.forceUpdate(), 250);
  }
  OnSimWasReset() {
    this.PostMessage('Simulation Reset!');
    this.setState({
      inspectorInstances: [],
      scriptsNeedUpdate: false
    });
  }
  /**
   * Handler for `NET:INSPECTOR_UPDATE`
   * NET:INSPECTOR_UPDATE is sent by PanelSimulation on every sim loop
   * with agent information for every registered instance.
   * In order to keep data to a minimum, we don't pass the full data
   * for instances that haven't ben registered, just the bare minimum.
   * @param {Object} data { agents: [...agents]}
   *                 wHere `agents` are gagents
   */
  OnInspectorUpdate(data) {
    const { panelConfiguration } = this.state;
    // Don't do updates if we're editing the map
    // This triggers state changes, which causes InstanceEditor
    // and prop.tsx to re-render AMD text input fields to lose focus
    if (panelConfiguration === 'edit') return;

    if (!data || data.agents === undefined) {
      console.error('OnInspectorUpdate got bad data', data);
      return;
    }
    this.setState({ inspectorInstances: data.agents });
  }

  PostMessage(text) {
    this.setState(state => ({
      message: `${state.message}${new Date().toLocaleTimeString()} :: ${text}\n`
    }));
  }

  /// Displays GEM-SCRIPT scripted message on dialog
  DoShowMessage(data) {
    this.setState(state => {
      const messages = state.dialogMessage || [];
      messages.push(data.message);
      return { dialogMessage: messages };
    });
  }

  /// Triggered by WEBCAM_UPDATE
  UpdateWebCamSetting() {
    const metadata = ACMetadata.GetMetadata();
    this.setState({ showWebCam: metadata.showWebCam });
  }

  SaveWebCamSetting(e) {
    const metadata = ACMetadata.GetMetadata();
    metadata.showWebCam = e.target.checked;
    this.setState({ showWebCam: e.target.checked });
    PROJSERVER.UpdateMetadata({ metadata });
    // Force WebCam to update
    UR.CallMessage('WEBCAM_UPDATE');
  }

  UpdateLogSetting(e) {
    const logState = e.target.checked;
    UR.LogEnabled(logState); // client-side: local
    UR.SendMessage('NET:LOG_ENABLE', { enabled: logState }); // viewers and controllers
    UR.SendMessage('NET:SRV_LOG_ENABLE', { enabled: logState }); // server-side
  }

  SetECAContext(context){
    ACConversationAgent.SetECAContext(context);
    console.log(`ECA Context from message: ${context}`);
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// INSTANCE INTERACTION HANDLERS
  ///
  HandleDragEnd(data) {
    const { panelConfiguration } = this.state;
    // Only update init if we're in edit mode
    if (panelConfiguration === 'edit') {
      const agent = data.agent;
      const { projId } = this.state;
      const x = Number.parseFloat(agent.prop.x.value).toFixed(2);
      const y = Number.parseFloat(agent.prop.y.value).toFixed(2);
      PROJSERVER.InstanceUpdatePosition({
        projId,
        instanceId: agent.id,
        updatedData: { x, y }
      });
    }
  }
  /**
   * User clicked on agent instance in simulation view
   * or User clicked on instance in MapEditor
   * If Map Editor is open, then when the user clicks
   * on an instance in the simulation view, we want to
   * select it for editing.
   * @param {object} data { agentId }
   */
  HandleSimInstanceClick(data) {
    const { panelConfiguration, projId } = this.state;
    // Only request instance edit in edit mode
    if (panelConfiguration === 'edit') {
      PROJSERVER.InstanceRequestEdit({
        projId,
        agentId: data.agentId,
        source: data.source
      });
    } else {
      UR.RaiseMessage('INSPECTOR_CLICK', { id: data.agentId });
    }
  }
  HandleSimInstanceHoverOver(data) {
    const { projId } = this.state;
    PROJSERVER.InstanceHoverOver({ projId, agentId: data.agentId });
  }
  HandleSimInstanceHoverOut(data) {
    const { projId } = this.state;
    PROJSERVER.InstanceHoverOut({ projId, agentId: data.agentId });
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// PANEL UI CONFIGURATION
  ///
  OnToggleRunEdit(e) {
    // Automatically trigger reset when changing modes.
    // This is necessary because blueprints are not recompiled
    // if scripts are submitted while the sim is running.
    // If the user then switches to edit the map, they may
    // inadvertently select newly defined properties that
    // the old instances do not support.  A reset will
    // cause the instances to be recompiled.
    // Always reset!  Otherwise, scale commands get re-applied?
    UR.RaiseMessage('NET:SIM_RESET');
    this.setState(state => {
      if (state.panelConfiguration === 'edit') {
        UR.LogEvent('ProjSetup', ['Project Save']);
      } else {
        UR.LogEvent('ProjSetup', ['Project Setup']);
      }
      return {
        panelConfiguration: state.panelConfiguration === 'edit' ? 'run' : 'edit'
      };
    });
    // Trigger Window Resize so that PanelSimulation will resize
    window.dispatchEvent(new Event('resize'));
  }
  OnToggleNetworkMapSize() {
    this.setState(state => ({
      panelConfiguration: state.panelConfiguration === 'run' ? 'run-map' : 'run',
      runIsMinimized: !state.runIsMinimized
    }));
  }
  OnPanelClick(id) {
    this.setState({
      panelConfiguration: id
    });
  }
  OnSelectView() {
    const { projId } = this.state;
    window.location = `/app/project?project=${projId}`;
  }
  OnToggleTracker() {
    this.setState(state => ({
      panelConfiguration:
        state.panelConfiguration !== 'tracker' ? 'tracker' : 'run'
    }));
    // Trigger Window Resize so that PanelSimulation will resize
    window.dispatchEvent(new Event('resize'));
  }

  handleSelect(selectedButton) {
    // selectedButton => 'messages', 'control'
    if (selectedButton === 'messages') {
      this.openECA();
      // log file
      UR.LogEvent('ECA Panel Opened', ['by button click']);
      // log viewer
      UR.RaiseMessage('NET:LOG_EVENT', {
        logString: 'ECA Panel Opened by button click'
      });
    } else {
      this.closeECA();
      // log file
      UR.LogEvent('ECA Panel Closed', ['by button click']);
      // log viewer
      UR.RaiseMessage('NET:LOG_EVENT', {
        logString: 'ECA Panel Closed by button click'
      });
    }
    this.setState({ selectedTab: selectedButton });
  }

  // Created this specifically to be the handler for a message
  // when using just this.handleSelect('messages') as the handler
  // got an error.
  handleECAToggleMessage() {
    this.openECA();
  }

  openECA() {
    this.setState({
      selectedTab: 'messages'
    });
  }

  closeECA() {
    this.setState({
      selectedTab: 'control'
    });
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  OnDraggerLeftUpdate(ratio) {
    this.setState({ consoleLeftWidth: ratio * 100 });
    // Trigger Window Resize so that PanelSimulation will resize
    window.dispatchEvent(new Event('resize'));
  }
  OnDraggerRightUpdate(ratio) {
    const { consoleLeftWidth } = this.state; // we have to account for left console too
    this.setState({ consoleRightWidth: (1 - ratio) * 100 });
    // Trigger Window Resize so that PanelSimulation will resize
    window.dispatchEvent(new Event('resize'));
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  OnExport() {
    const { projId } = this.state;
    PROJSERVER.ExportProject(projId);
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// RENDER
  ///
  /*  Renders 2-col, 3-row grid with TOP and BOTTOM spanning both columns.
   *  The base styles from page-styles are overidden with inline styles to
   *  make this happen.
   */
  render() {
    const {
      selectedTab,
      panelConfiguration,
      message,
      projId,
      projectIsLoaded,
      bpNamesList,
      devices,
      inspectorInstances,
      runIsMinimized,
      scriptsNeedUpdate,
      openRedirectDialog,
      dialogMessage,
      showWebCam,
      consoleLeftWidth,
      consoleRightWidth
    } = this.state;
    const { classes } = this.props;
    const { width, height, bgcolor } = PROJSERVER.GetBoundary();

    document.title = `GEMSTEP MAIN ${projId}`;

    const stageBtn = (
      <>
        <div className={classes.colorData} style={{ fontSize: '18px' }}>
          STAGE:{' '}
        </div>
        <button
          type="button"
          className={classes.button}
          onClick={this.OnToggleRunEdit}
          disabled={SIMCTRL.IsRunning()}
        >
          {panelConfiguration === 'edit' ? 'SAVE' : 'SETUP'}
        </button>
      </>
    );

    const jsxNavToolBar = (
      <div
        style={{
          display: 'flex',
          flexGrow: '1',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div style={{ display: 'inline-block', padding: '3px' }}>
          <Link to={{ pathname: `/app/login` }}>
            <img
              src="/static/logo_GEMSTEP_vector.svg"
              width="40px"
              style={{ paddingTop: '5px', verticalAlign: 'top' }}
            />
          </Link>
          <span style={{ paddingLeft: '10px', fontSize: '32px' }}>
            {projId} <span style={{ fontSize: '14px' }}>⇆</span> {UR.HostString()}
          </span>
        </div>
        <span style={{ opacity: 0.5 }}>
          MAIN -- <span style={{ fontStyle: 'italic' }}>{UR.BranchString()}</span>
        </span>
        <button
          role="button"
          className={classes.buttonSmall}
          onClick={this.OnToggleTracker}
        >
          tracker
        </button>
        <button
          role="button"
          className={classes.buttonSmall}
          onClick={this.OnExport}
        >
          export
        </button>
        <label>
          WebCam:
          <input
            type="checkbox"
            checked={showWebCam}
            onChange={this.SaveWebCamSetting}
          />
        </label>
        <label>
          Log:
          <input type="checkbox" onChange={this.UpdateLogSetting} />
        </label>
        &emsp;
      </div>
    );

    const jsxRunOrEdit = (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'baseline',
          height: '70px',
          width: '100%',
          marginBottom: '10px'
        }}
      >
        {stageBtn}
      </div>
    );

    const jsxLeft =
      panelConfiguration === 'edit' ? (
        <>
          <PanelProjectEditor />
          <MissionMapEditor projId={projId} bpNamesList={bpNamesList} />
        </>
      ) : (
        <MissionRun
          projId={projId}
          bpNamesList={bpNamesList}
          devices={devices}
          toggleMinimized={this.OnToggleNetworkMapSize}
          minimized={runIsMinimized}
        />
      );

    const DialogMainRedirect = openRedirectDialog ? (
      <DialogConfirm
        open={openRedirectDialog}
        message={'A "Main" window is already open.  Redirecting...'}
        yesMessage=""
        noMessage=""
      />
    ) : (
      ''
    );

    // set zindex to show script message on top of system message
    const DialogMessage = dialogMessage ? (
      <DialogConfirm
        open={dialogMessage !== undefined}
        message={dialogMessage}
        onClose={() => this.setState({ dialogMessage: undefined })}
        yesMessage="OK"
        noMessage=""
      />
    ) : (
      ''
    );

    // Overrides PANEL_CONFIG's previously defined column proportions via Dragger
    // PANEL_CONFIG is still being used to keep track of view state
    let GRID_COLUMNS;
    if (panelConfiguration === 'run') {
      GRID_COLUMNS = `${consoleLeftWidth}% auto ${consoleRightWidth}%`;
    } else {
      GRID_COLUMNS = PANEL_CONFIG.get(panelConfiguration);
    }

    return (
      <div
        className={classes.root}
        style={{
          gridTemplateColumns: GRID_COLUMNS,
          gridTemplateRows: '50px auto 0' // use '50px auto 100px' to show MESSAGES, to hide use '50px auto 0'
        }}
      >
        <div
          id="console-top"
          className={clsx(classes.cell, classes.top)}
          style={{ gridColumnEnd: 'span 3', display: 'flex' }}
        >
          {jsxNavToolBar}
          <Link
            to={{ pathname: `/app/project?project=${projId}` }}
            className={classes.navButton}
          >
            Back to Project
          </Link>
        </div>
        <div
          id="console-left"
          className={classes.left} // commented out b/c adding a padding
          style={{ backgroundColor: 'transparent' }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateRows:
                panelConfiguration === 'edit' ? '70px auto' : '70px auto auto',
              overflow: 'hidden'
            }}
          >
            {jsxRunOrEdit}
            {jsxLeft}
          </div>
        </div>
        <div
          id="console-main"
          className={classes.main}
          style={{ overflow: 'hidden', display: 'flex' }}
        >
          <Dragger color="#064848" onDragUpdate={this.OnDraggerLeftUpdate} />
          <PanelSimulation
            id="sim"
            width={width}
            height={height}
            bgcolor={bgcolor}
            onClick={this.OnPanelClick}
          />
          <Dragger color="#064848" onDragUpdate={this.OnDraggerRightUpdate} />
        </div>
        <div id="console-right" className={classes.right}>
          <div
            // Use fit-content for the first row to accomodate the tab menu
            style={{
              display: 'grid',
              gridTemplateRows: 'fit-content(5%) auto',
              overflow: 'hidden'
            }}
          >
            <TabMenu style={{ display: 'flex', justifyContent: 'center' }}>
              <TabButton
                isSelected={this.state.selectedTab === 'control'}
                onSelect={() => this.handleSelect('control')}
              >
                Control
              </TabButton>
              <TabButton
                isSelected={this.state.selectedTab === 'messages'}
                onSelect={() => this.handleSelect('messages')}
              >
                Messages
              </TabButton>
            </TabMenu>
            <ECAManager showECAChat={selectedTab === 'messages' ? true : false} />
            {panelConfiguration === 'tracker' && (
              <>
                <div className={classes.ioTransform}>
                  <FormTransform />
                </div>
                <PanelTracker />
              </>
            )}
            {panelConfiguration !== 'edit' &&
              panelConfiguration !== 'tracker' &&
              selectedTab === 'control' && (
                <>
                  <PanelPlayback
                    id="playback"
                    isDisabled={!projectIsLoaded}
                    needsUpdate={scriptsNeedUpdate}
                    projId={projId}
                  />
                  <PanelInstances
                    id="instances"
                    instances={inspectorInstances}
                    disallowDeRegister={false}
                  />
                </>
              )}
          </div>
        </div>
        <div
          id="console-bottom"
          className={classes.bottom}
          style={{ gridColumnEnd: 'span 3' }}
        >
          {/* Hide MESSAGES <PanelMessage message={message} /> */}
          {DialogMainRedirect}
          {DialogMessage}
        </div>
      </div>
    );
  }
}

/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// include MaterialUI styles
export default withStyles(useStylesHOC)(MissionControl);
