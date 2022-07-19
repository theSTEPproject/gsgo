/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  implementation of keyword "onEvent" command object

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import Keyword from 'lib/class-keyword';
import * as BUNDLER from 'script/tools/script-bundler';
import * as SIMDATA from 'modules/datacore/dc-sim-data';

/// CLASS DEFINITION //////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export class onEvent extends Keyword {
  // base properties defined in KeywordDef

  constructor() {
    super('onEvent');
    this.args = ['eventName:string', 'consq:block'];
  }

  compile(unit: TKWArguments): TOpcode[] {
    let [kw, eventName, consq] = unit;
    if (consq === undefined) consq = [];
    if (eventName === undefined) eventName = '<undefined>';
    if (!Array.isArray(consq)) {
      console.warn(`onEvent: bad consequent ${eventName}; returning []`, unit);
      consq = [];
    }
    const { bpName } = BUNDLER.BundlerState();
    // WARNING: this is setting SIMDATA state during compile, which we will
    // fix more comprehensively next
    SIMDATA.SubscribeToScriptEvent(String(eventName), bpName, consq);
    return []; // subscriptions don't need to return any compiled code
    // BETTER: this will be part of the overhaul of when, onEvent init-time programs
    // return [
    //   (agent, state) => {
    //     SIMDATA.SubscribeToScriptEvent(
    //       String(eventName),
    //       bpName,
    //       consq as TSMCProgram
    //     );
    //   }
    // ];
  }

  /** custom validation, overriding the generic validation() method of the
   *  base Keyword class  */
  validate(unit: TScriptUnit): TValidatedScriptUnit {
    const vtoks = []; // validation token array
    const [kwTok, evtTok, execTok] = unit; // get arg pattern

    vtoks.push(this.shelper.anyKeyword(kwTok));
    vtoks.push(this.shelper.anySystemEvent(evtTok));
    // vtoks.push(this.shelper.systemPlaceholder(kwTok));

    const log = this.makeValidationLog(vtoks);
    return { validationTokens: vtoks, validationLog: log };
  }
} // end of keyword definition

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// see above for keyword export
SIMDATA.RegisterKeyword(onEvent);
