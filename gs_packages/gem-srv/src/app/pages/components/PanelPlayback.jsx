import React from 'react';
import UR from '@gemstep/ursys/client';
import { IsRunning, SIMSTATUS } from 'modules/sim/api-sim';
import { withStyles } from '@material-ui/core/styles';
import { useStylesHOC } from '../helpers/page-xui-styles';

import PanelChrome from './PanelChrome';
import PlayButton from './PlayButton';

class PanelPlayback extends React.Component {
  constructor() {
    super();
    this.state = {
      title: 'Control'
    };
    this.OnResetClick = this.OnResetClick.bind(this);
    this.OnCostumesClick = this.OnCostumesClick.bind(this);
    this.OnNextRoundClick = this.OnNextRoundClick.bind(this);
    this.OnStartClick = this.OnStartClick.bind(this);
  }

  componentWillUnmount() {}

  OnResetClick() {
    UR.LogEvent('SimEvent', ['Reset Stage']);
    UR.RaiseMessage('NET:SIM_RESET');
  }

  OnCostumesClick() {
    UR.LogEvent('SimEvent', ['Pick Characters']);
    UR.RaiseMessage('NET:HACK_SIM_COSTUMES');
  }

  OnNextRoundClick() {
    UR.LogEvent('SimEvent', ['Next Round']);
    UR.RaiseMessage('NET:HACK_SIM_NEXTROUND');
  }

  OnStartClick(modelName) {
    if (IsRunning()) {
      UR.LogEvent('SimEvent', ['Stop Round']);
      UR.RaiseMessage('NET:HACK_SIM_STOP');
    } else {
      UR.LogEvent('SimEvent', ['Start Round']);
      UR.RaiseMessage('NET:DISPLAY_LIST', {
        logString: `Model: ${modelName}`
      });
      UR.RaiseMessage('NET:HACK_SIM_START');
    }
  }

  render() {
    const { title } = this.state;
    const isRunning = IsRunning();
    const { id, isDisabled, needsUpdate, isActive, classes, projId } = this.props;

    const onClick = () => {
      // To be implemented
      console.log('Show instance');
    };

    const showCostumes =
      SIMSTATUS.currentLoop === 'prerun' && !SIMSTATUS.completed;
    const showRun =
      (SIMSTATUS.currentLoop === 'prerun' ||
        SIMSTATUS.currentLoop === 'costumes' ||
        SIMSTATUS.currentLoop === 'run') &&
      !SIMSTATUS.completed;
    const showNextRun =
      (SIMSTATUS.currentLoop === 'staged' ||
        SIMSTATUS.currentLoop === 'postrun') &&
      !SIMSTATUS.completed;
    const timer = SIMSTATUS.timer;

    return (
      <PanelChrome id={id} title={title} isActive={isActive} onClick={onClick}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flexWrap: 'wrap',
            fontSize: '12px'
          }}
        >
          {timer !== undefined && (
            <div
              style={{
                width: '100%',
                textAlign: 'center',
                fontSize: '48px',
                fontWeight: 'bold',
                color: 'white'
              }}
            >
              {timer}
            </div>
          )}
          {needsUpdate && (
            <div
              className={classes.infoHighlightColor}
              style={{ padding: '5px' }}
            >
              Scripts Updated!
              <br />
              Reset Stage!
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {isDisabled ? (
              <p>No model loaded</p>
            ) : (
              <>
                {!isRunning && (
                  <button
                    type="button"
                    className={needsUpdate ? classes.buttonHi : classes.button}
                    onClick={this.OnResetClick}
                    style={{ width: '100%' }}
                  >
                    RESET STAGE
                  </button>
                )}
                {showCostumes && (
                  <button
                    type="button"
                    className={needsUpdate ? classes.buttonHi : classes.button}
                    onClick={this.OnCostumesClick}
                    style={{ width: '100%' }}
                  >
                    PICK CHARACTERS
                  </button>
                )}
                {showRun && (
                  <PlayButton isRunning={isRunning} onClick={() => this.OnStartClick(projId)} />
                )}
                {showNextRun && (
                  <button
                    type="button"
                    className={needsUpdate ? classes.buttonHi : classes.button}
                    onClick={this.OnNextRoundClick}
                    style={{ width: '100%' }}
                  >
                    PREP ROUND
                  </button>
                )}
              </>
            )}

            {/* <div className={clsx(classes.button, classes.buttonDisabled)}>
              PAUSE
            </div>
            <div className={clsx(classes.button, classes.buttonDisabled)}>
              STOP
            </div>
            <div className={clsx(classes.button, classes.buttonDisabled)}>
              REPLAY
            </div> */}
          </div>
        </div>
      </PanelChrome>
    );
  }
}

export default withStyles(useStylesHOC)(PanelPlayback);
