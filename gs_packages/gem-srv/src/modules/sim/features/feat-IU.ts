/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\


For testing new featureees ...

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import UR from '@gemstep/ursys/client';
import SM_Feature from 'lib/class-sm-feature';
import { RegisterFeature } from 'modules/datacore/dc-sim-data';
import {
  SM_Boolean,
  SM_Number,
  SM_String,
  SM_Array
} from 'script/vars/_all_vars';
import SM_Agent from 'lib/class-sm-agent';
import { IsRunning } from 'modules/sim/api-sim';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const FEATID = 'IU';
const PR = UR.PrefixUtil('IUFEATURE');
const DBG = true;
const LOG_ID = 'SCRIPT_LOG';

const CLICK_AGENTS = new Map();
const CLICK_FUNCTIONS = new Map();

// FUNCTIONS
const FUNCTIONS = new Map();

/// CLASS HELPERS /////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

/// FEATURE CLASS /////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class IUPack extends SM_Feature {
  constructor(name) {
    super(name);
    this.featAddMethod('logString', this.logString);
    this.featAddMethod('logProperty', this.logProperty);

    this.featAddMethod('forceNext', this.forceNext);

    this.HandleSimInstanceClick = this.HandleSimInstanceClick.bind(this);
    UR.HandleMessage('SIM_INSTANCE_CLICK', this.HandleSimInstanceClick);

    this.featAddMethod('handleClick', this.handleClick);
    this.featAddMethod('setupFunction', this.setupFunction);
    this.featAddMethod('callFunction', this.callFunction);

    // Add methods from SM_Array
    this.addArrayMethods();
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  decorate(agent) {
    super.decorate(agent);
    this.featAddProp(agent, 'joyceArray', new SM_Array());
    this.featAddProp(agent, 'logStringText', new SM_String('INIT'));
    agent.prop.IU.logStringText.setTo('INIT');
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  reset() {
    CLICK_AGENTS.clear();
    CLICK_FUNCTIONS.clear();
  }

  /// Array Feature Methods ///////////////////////////////////////////////////

  addArrayMethods() {
    const arrayMethods = [
      'add',
      'remove',
      'get',
      'clear',
      'contains',
      'indexOf',
      'set',
      'sort',
      'filter',
      'clone',
      'print',
      'size',
      'sortNumericAscending',
      'sortNumericDescending',
      'sortStringAscending',
      'sortStringDescending',
      'filterByPosition'
    ];

    arrayMethods.forEach(methodName => {
      this.featAddMethod(methodName, (agent, ...args) => {
        const joyceArray = agent.prop.IU.joyceArray;
        if (
          joyceArray instanceof SM_Array &&
          typeof joyceArray[methodName] === 'function'
        ) {
          return joyceArray[methodName](...args);
        }
        console.error(`Invalid method or SM_Array: ${methodName}`);
        return null;
      });
    });
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// IU FEATURE METHODS
  logProperty(agent: IAgent) {
    this.logString(agent, agent.prop.IU.logStringText.value);
  }

  logString(agent: IAgent, text: string) {
    if (DBG) console.log('Logging character(' + agent.id + '): ' + text);
    let logString = ' character ' + agent.id + '\t' + text;
    // put into the server logs
    UR.LogEvent(LOG_ID, [logString]);
    // send around so viewers can do something with this
    UR.RaiseMessage('NET:LOG_EVENT', { logString: logString });
  }

  // For some sequences of rounds it is irritating to have to press "prep"
  // So this lets us skip it using a call from endScript
  // Be careful in using this! Ideally we might move this to a round property
  forceNext(agent: IAgent) {
    UR.LogEvent('SimEvent', ['Next Round']);
    UR.RaiseMessage('NET:HACK_SIM_NEXTROUND');
  }

  handleClick(agent: IAgent, program: TSMCProgram) {
    CLICK_AGENTS.set(agent.id, agent);
    CLICK_FUNCTIONS.set(agent.id, program);
  }

  setupFunction(agent: IAgent, functionName: string, program: TSMCProgram) {
    // combine the id + function name so that we can have similar sounding ones
    // TODO - make unique to the blueprint?
    let index = agent.id + functionName;
    FUNCTIONS.set(index, program);
  }

  callFunction(agent: IAgent, functionName: string) {
    let index = agent.id + functionName;
    let functionToCall = FUNCTIONS.get(index);
    if (!functionToCall) return;

    agent.exec(functionToCall, { agent: agent });
  }

  HandleSimInstanceClick(data) {
    if (IsRunning()) {
      const agent = CLICK_AGENTS.get(data.agentId);
      if (!agent) return;

      if (!agent.isInert) {
        const clickProgram = CLICK_FUNCTIONS.get(agent.id);
        if (!clickProgram) return;

        agent.exec(clickProgram, { agent: agent });
      }
    }
  }

  /// SYMBOL DECLARATIONS /////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** static method to return symbol data */
  static Symbolize(): TSymbolData {
    return SM_Feature._SymbolizeNames(IUPack.Symbols);
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** instance method to return symbol data */ a;
  symbolize(): TSymbolData {
    return IUPack.Symbolize();
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  static _CachedSymbols: TSymbolData;
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** declaration of base symbol data; methods will be modified to include
   *  the name parameter in each methodSignature */
  static Symbols: TSymbolData = {
    props: {
      joyceArray: SM_Array.Symbolize(),
      logStringText: SM_String.SymbolizeCustom({
        setTo: ['logStringText:string']
      })
    },
    methods: {
      'logString': { args: ['text:string'] },
      'logProperty': {},
      'forceNext': {},
      'handleClick': { args: ['program:block'] },
      'setupFunction': { args: ['functionName:string', 'program:block'] },
      'callFunction': { args: ['functionName:string'] },
      // Add array methods here for symbolization
      'add': { args: ['item:identifier'] },
      'remove': { args: ['index:number'] },
      'get': { args: ['index:number'] },
      'clear': {},
      'contains': { args: ['value:identifier'] },
      'indexOf': { args: ['value:identifier'] },
      'set': { args: ['index:number', 'value:identifier'] },
      'sort': { args: ['compareFn:identifier'] },
      'filter': { args: ['predicate:identifier'] },
      'clone': {},
      'print': { returns: 'string:string' },
      'size': { returns: 'number:number' },
      'sortNumericAscending': {
        info: 'Sorts the array in numeric ascending order.'
      },
      'sortNumericDescending': {
        info: 'Sorts the array in numeric descending order.'
      },
      'sortStringAscending': {
        info: 'Sorts the array in string ascending order.'
      },
      'sortStringDescending': {
        info: 'Sorts the array in string descending order.'
      },
      'filterByPosition': {
        args: ['position:number'],
        returns: 'array:identifier'
      }
    }
  };
}

/// REGISTER FEATURE SINGLETON ////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const INSTANCE = new IUPack('IU');
RegisterFeature(INSTANCE);
