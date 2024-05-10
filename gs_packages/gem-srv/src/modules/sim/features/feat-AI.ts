/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\


For testing new featureees ...

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import UR from '@gemstep/ursys/client';
import SM_Feature from 'lib/class-sm-feature';
import { RegisterFeature } from 'modules/datacore/dc-sim-data';
import { SM_Boolean, SM_Number, SM_String } from 'script/vars/_all_vars';
import { IsRunning } from 'modules/sim/api-sim';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const FEATID = 'AI';
const PR = UR.PrefixUtil('AIFEATURE');
const DBG = true;

/// CLASS HELPERS /////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

/// FEATURE CLASS /////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class AIPack extends SM_Feature {
  constructor(name) {
    super(name);

    this.featAddMethod('toggleECA', this.toggleECA);
    this.featAddMethod('setEcaStatus', this.setEcaStatus);
    this.featAddMethod('updateECAStatus', this.updateECAStatus);
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  decorate(agent) {
    super.decorate(agent);

    this.featAddProp(agent, 'ecaStatusString', new SM_String(''));
    agent.prop.AI.ecaStatusString.setTo('');
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  reset() {}

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// AI FEATURE METHODS

  toggleECA(agent: IAgent) {
    // log file
    UR.LogEvent('ECA Panel Opened', ['by simulation']);
    // log viewer
    UR.RaiseMessage('NET:LOG_EVENT', {
      logString: 'ECA Panel Opened by simulation'
    });
    UR.RaiseMessage('ECA_TOGGLE');
  }

  setEcaStatus(agent: IAgent, text: string) {
    agent.prop.AI.ecaStatusString.setTo(text);
    this.updateECAStatus(agent);

    if (DBG)
      console.log(
        'Setting ECA status string to: ' + agent.prop.AI.ecaStatusString.value
      );
  }

  updateECAStatus(agent: IAgent) {
    // raise a message of the new value so it can be used in the next ECA call
    UR.RaiseMessage('SET_ECA_CONTEXT', agent.prop.AI.ecaStatusString.value);

    if (DBG) console.log('Raising SET_ECA_CONTEXT');
  }

  /// SYMBOL DECLARATIONS /////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** static method to return symbol data */
  static Symbolize(): TSymbolData {
    return SM_Feature._SymbolizeNames(AIPack.Symbols);
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** instance method to return symbol data */ a;
  symbolize(): TSymbolData {
    return AIPack.Symbolize();
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  static _CachedSymbols: TSymbolData;
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** declaration of base symbol data; methods will be modified to include
   *  the name parameter in each methodSignature */
  static Symbols: TSymbolData = {
    props: {
      ecaStatusString: SM_String.SymbolizeCustom({
        setTo: ['ecaStatusString:string']
      })
    },
    methods: {
      'toggleECA': {},
      'setEcaStatus': { args: ['text:string'] },
      'updateECAStatus': {}
    }
  };
}

/// REGISTER FEATURE SINGLETON ////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const INSTANCE = new AIPack('AI');
RegisterFeature(INSTANCE);
