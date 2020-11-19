/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  implementation of keyword onCondition command object
  What is this supposed to do? Implement expression conditionals
  on an agent. These are run during the CONDITIONALS part of the
  simulation lifecycle

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import React from 'react';
import { Keyword } from 'lib/class-keyword';
import { IAgent, IState, ISMCBundle, TScriptUnit } from 'lib/t-script';
import { RegisterKeyword } from 'modules/runtime-datacore';
import { SingleAgentConditional } from 'script/conditions';

/// CLASS DEFINITION //////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export class OnCondition extends Keyword {
  // base properties defined in KeywordDef

  constructor() {
    super('onCondition');
    this.args = ['testExpr:string', 'consequent:smc', 'alternate:smc'];
  }
  /* NOTE THIS IS NONFUNCTIONAL */
  /** create smc blueprint code objects */
  compile(parms: any[]): ISMCBundle {
    const testExpr = parms[0]; // {{ expr }}
    const consq = parms[1];
    const alter = parms[2];
    const cout = [];
    cout.push();
    return {
      define: [],
      defaults: [],
      conditions: cout
    };
  }

  /** return a state object that turn react state back into source */
  serialize(state: any): TScriptUnit {
    const { min, max, floor } = state;
    return [this.keyword, min, max, floor];
  }

  /** return rendered component representation */
  jsx(index: number, srcLine: any[], children?: any[]): any {
    const testName = srcLine[1];
    const conseq = srcLine[2];
    const alter = srcLine[3];
    return super.jsx(
      index,
      srcLine,
      <>
        on {testName} TRUE {conseq}, ELSE {alter}
      </>
    );
  }
} // end of UseFeature

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// see above for keyword export
RegisterKeyword(OnCondition);
