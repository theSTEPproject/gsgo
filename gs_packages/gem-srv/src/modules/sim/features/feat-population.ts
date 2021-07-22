/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  Population Class

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

/*/ required libraries /*/
import UR from '@gemstep/ursys/client';
import GFeature from 'lib/class-gfeature';
import { Register } from 'modules/datacore/dc-features';
import { IAgent, TSMCProgram } from 'lib/t-script';
import { GVarBoolean, GVarNumber, GVarString } from 'modules/sim/vars/_all_vars';
import {
  CopyAgentProps,
  DeleteAgent,
  GetAgentsByType,
  GetAllAgents,
  DefineInstance,
  GetAgentById
} from 'modules/datacore/dc-agents';
import * as TRANSPILER from 'modules/sim/script/transpiler';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// these are debug utilities
const PR = UR.PrefixUtil('PopulationPack');
const DBG = false;

let COUNT = 0;

const AGENTS_TO_REMOVE = []; // string[]
const AGENTS_TO_CREATE = []; // InstanceDef[]

/// CREATE LOOP //////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function m_Delete(frame) {
  while (AGENTS_TO_REMOVE.length > 0) {
    const id = AGENTS_TO_REMOVE.pop();
    const agent = GetAgentById(id);
    if (agent) {
      DeleteAgent({
        id: agent.id,
        blueprint: agent.blueprint.name
      });
    }
  }
}
function m_Create(frame) {
  while (AGENTS_TO_CREATE.length > 0) {
    const def = AGENTS_TO_CREATE.pop();

    DefineInstance(def);
    let agent = TRANSPILER.MakeAgent(def);
    const parent = GetAgentById(def.parentId);
    if (parent) CopyAgentProps(parent, agent);

    // but reset inert!
    agent.prop.isInert.setTo(false);

    const initScript = def.initScript; // spawnscript
    agent.exec(initScript, { agent }); // run spawnscript
  }
}

/// FEATURE CLASS /////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class PopulationPack extends GFeature {
  constructor(name) {
    super(name);
    // Population Management
    this.featAddMethod('createAgent', this.createAgent);
    this.featAddMethod('spawnChild', this.spawnChild);
    this.featAddMethod('removeAgent', this.removeAgent);
    // Global Population Management
    this.featAddMethod('releaseInertAgents', this.releaseInertAgents);
    this.featAddMethod('hideInertAgents', this.hideInertAgents);
    this.featAddMethod('removeInertAgents', this.removeInertAgents);
    this.featAddMethod('agentsReproduce', this.agentsReproduce);
    // Statistics
    this.featAddMethod('getActiveAgentsCount', this.getActiveAgentsCount);
    this.featAddMethod('countAgents', this.countAgents);
    this.featAddMethod('countAgentProp', this.countAgentProp);
    this.featAddMethod('minAgentProp', this.minAgentProp);

    UR.HookPhase('SIM/DELETE', m_Delete);
    UR.HookPhase('SIM/CREATE', m_Create);
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // /** This runs once to initialize the feature for all agents */
  // initialize(simloop) {
  //   super.initialize(simloop);
  //   simloop.hook('INPUT', frame => console.log(frame));
  // }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** Add population-specific properties to the agent. The feature methods
   *  are defined inside the featurepack instance, not the agent instance
   *  as props are.
   */
  decorate(agent) {
    super.decorate(agent);
    this.featAddProp(agent, 'count', new GVarString());
    this.featAddProp(agent, 'sum', new GVarString());
    this.featAddProp(agent, 'avg', new GVarString());
    this.featAddProp(agent, 'min', new GVarString());
    this.featAddProp(agent, 'max', new GVarString());
  }

  /// POPULATION METHODS /////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  /**
   * Create agent of arbitrary blueprintName type via script
   * @param agent
   * @param blueprintName
   * @param initScript
   */
  createAgent(agent: IAgent, blueprintName: string, initScript: string) {
    const name = `${blueprintName}${COUNT++}`;
    // Queue Instance Defs
    const def = {
      name,
      blueprint: blueprintName,
      initScript,
      parentId: agent.id // save for positioning
    };
    AGENTS_TO_CREATE.push(def);
  }
  /**
   * Create child agent via script, duplicating properties of parent
   * and running special spawn script
   * @param agent
   * @param blueprintName
   * @param initScript
   */
  spawnChild(agent: IAgent, spawnScript: string) {
    const bpname = agent.blueprint.name;
    const name = `${bpname}${COUNT++}`;
    // Queue Instance Defs
    const def = {
      name,
      blueprint: bpname,
      initScript: spawnScript,
      parentId: agent.id // save for positioning
    };
    AGENTS_TO_CREATE.push(def);
  }
  /**
   * Removes self
   */
  removeAgent(agent: IAgent) {
    AGENTS_TO_REMOVE.push(agent.id);
  }

  /// GLOBAL METHODS /////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   * Release cursors for ALL inert agents globally
   */
  releaseInertAgents(agent: IAgent) {
    const agents = GetAllAgents();
    agents.forEach(a => {
      if (a.isInert && a.hasFeature('Cursor'))
        a.callFeatMethod('Cursor', 'releaseCursor');
    });
  }
  /**
   * Release cursors for ALL inert agents globally
   */
  hideInertAgents(agent: IAgent) {
    const agents = GetAllAgents();
    agents.forEach(a => {
      if (a.isInert) {
        console.error('hiding', a.id);
        a.visible = false;
      }
    });
  }
  /**
   * Remove ALL inert agents globally
   */
  removeInertAgents(agent: IAgent) {
    const agents = GetAllAgents();
    agents.forEach(a => {
      if (a.isInert) this.removeAgent(a);
    });
  }

  /**
   * For all agents of type bpname, call SpawnChild if not inert
   */
  agentsReproduce(agent: IAgent, bpname: string, spawnScript: string) {
    const agents = GetAgentsByType(bpname);
    agents.forEach(a => {
      if (!a.isInert) a.callFeatMethod('Population', 'spawnChild', spawnScript);
    });
  }
  /**
   * For all agents of type bpname, call program if not inert
   */
  agentsForEachActive(agent: IAgent, bpname: string, program: TSMCProgram) {
    const agents = GetAgentsByType(bpname);
    agents.forEach(a => {
      if (!a.isInert) a.exec(program, { agent: a });
    });
  }
  /**
   * For all agents of type bpname, call program regardless of inert state
   */
  agentsForEach(agent: IAgent, bpname: string, program: TSMCProgram) {
    const agents = GetAgentsByType(bpname);
    agents.forEach(a => a.exec(program, { agent: a }));
  }

  /// STATISTICS METHODS /////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  /** Invoked through featureCall script command. To invoke via script:
   *  featCall Population setRadius value
   */

  getActiveAgentsCount(agent: IAgent, blueprintName: string) {
    const agents = GetAgentsByType(blueprintName);
    let count = 0;
    agents.forEach(a => {
      if (!a.isInert) count++;
    });
    return count;
  }

  countAgents(agent: IAgent, blueprintName: string) {
    const agents = GetAgentsByType(blueprintName);
    agent.getFeatProp(this.name, 'count').setTo(agents.length);
  }
  /**
   *
   * @param agent
   * @param blueprintName
   * @param prop
   * @returns Sets three feature propertie: count, sum, avg
   */
  countAgentProp(agent: IAgent, blueprintName: string, prop: string) {
    const agents = GetAgentsByType(blueprintName);
    if (agents.length < 1) return;
    const sum = agents
      .map(a => a.getProp(prop).value)
      .reduce((acc, cur) => acc + cur);
    agent.getFeatProp(this.name, 'count').setTo(agents.length);
    agent.getFeatProp(this.name, 'sum').setTo(sum);
    agent
      .getFeatProp(this.name, 'avg')
      .setTo(Number(sum / agents.length).toFixed(2));
  }
  minAgentProp(agent: IAgent, blueprintName: string, prop: string) {
    const agents = GetAgentsByType(blueprintName);
    if (agents.length < 1) return;
    const minimizer = (min, cur) => Math.min(min, cur);
    const min = agents
      .map(a => a.getProp(prop).value)
      .reduce(minimizer, Infinity);
    agent.getFeatProp(this.name, 'min').setTo(min);
  }
  maxAgentProp(agent: IAgent, blueprintName: string, prop: string) {
    const agents = GetAgentsByType(blueprintName);
    if (agents.length < 1) return;
    const maximizer = (max, cur) => Math.max(max, cur);
    const max = agents
      .map(a => a.getProp(prop).value)
      .reduce(maximizer, -Infinity);
    agent.getFeatProp(this.name, 'max').setTo(max);
  }
} // end of feature class

/// CLASS HELPERS /////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

/// REGISTER FEATURE SINGLETON ////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const INSTANCE = new PopulationPack('Population');
Register(INSTANCE);
