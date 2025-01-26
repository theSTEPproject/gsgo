/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  DATACORE NON-AGENT SIMULATION RESOURCES

  Contains dictionaries of the active entities available to the simulation
  engine that determine its runtime state. Prior to this module, the
  dictionaries were scattered across separate datacore modules which made
  it hard to see the distinct systems we support in addition o the simulator

  note: AGENT dictionaries and methods are handled in a separate module,
        dc-sim-agents

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import SM_Feature from 'lib/class-sm-feature';
import {
  SM_Boolean,
  SM_Number,
  SM_String,
  SM_Array
} from 'script/vars/_all_vars';
import SM_Bundle from 'lib/class-sm-bundle';
import { EBundleType, EBundleTag } from 'modules/../types/t-script.d'; // workaround to import as obj
import * as CHECK from './dc-sim-data-utils';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = false;
//
// NOTE: AGENTS resources are in their own module, dc-sim-agents
//
const PRAGMAS: Map<string, Function> = new Map();
const FEATURES: Map<string, SM_Feature> = new Map();
const BLUEPRINTS: Map<string, SM_Bundle> = new Map();
const KEYWORDS: Map<string, IKeyword> = new Map();
const VARS: Map<string, TPropType> = new Map();
const EVENT_SCRIPTS: Map<string, Map<string, TSMCProgram>> = new Map();
const TEST_SCRIPTS: Map<string, TSMCProgram> = new Map();
const NAMED_SCRIPTS: Map<string, TSMCProgram> = new Map();
const WHEN_TESTS: Map<string, Function> = new Map();
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
type TPropType =
  | typeof SM_String
  | typeof SM_Number
  | typeof SM_Boolean
  | typeof SM_Array;

/// HELPER METHODS ////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_EnsureLowerCase(s: string, p?: string) {
  p = typeof p === 'string' ? p : '';
  if (typeof s !== 'string') return undefined;
  return s.toLowerCase();
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_EnsureUpperCase(s: string, p?: string) {
  p = typeof p === 'string' ? p : '';
  if (typeof s !== 'string') return undefined;
  return s.toUpperCase();
}

/// DIRECTIVES ////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function DefinePragma(pName: string, pFunc: TPragmaHandler) {
  const fn = 'DefinePragma:';
  const pragma = pName.toUpperCase();
  PRAGMAS.set(pragma, pFunc);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function GetPragma(pName: string) {
  const fn = 'GetPragma:';
  return PRAGMAS.get(pName.toUpperCase());
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** return hardcoded symbol data, derived from _pragma.tsx */
function GetPragmaMethodSymbols() {
  return {
    BLUEPRINT: {
      name: 'BLUEPRINT',
      args: ['bpName:blueprint', 'bpBaseName:blueprint']
    },
    PROGRAM: { name: 'PROGRAM', args: ['bundleOut:bdlOut'] },
    TAG: { name: 'TAG', args: ['tagName:string', 'tagValue:{any}'] }
  };
}

/// BLUEPRINT /////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// Blueprints are an object containing the elements of a 'transpiled'
/// blueprint scriptText, and are used to instantiate characters in the
/// simulation engine
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: saves the blueprint, using bp.name property as the key */
function SaveBlueprintBundle(bdl: SM_Bundle) {
  const fn = 'SaveBlueprintBundle:';
  if (bdl.type === EBundleType.INIT) {
    return undefined;
  }
  const { name } = bdl;
  // just overwrite it
  BLUEPRINTS.set(name, bdl);
  return bdl;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: return whether a blueprint bundle exists */
function HasBlueprintBundle(bpName: string): boolean {
  return BLUEPRINTS.has(bpName);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: return a blueprint bundle by bpName */
function GetBlueprintBundle(bpName: string): SM_Bundle {
  const fn = 'GetBlueprintBundle:';
  bpName = bpName || '<CreatedBundle>';
  let bdl = BLUEPRINTS.get(bpName);
  if (bdl === undefined) {
    if (DBG) console.log(`${fn} creating '${bpName}' bundle on request`);
    bdl = new SM_Bundle(bpName, EBundleType.BLUEPRINT);
    // save the new bundle in dictionary
    BLUEPRINTS.set(bpName, bdl);
  }
  return bdl;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: return a blueprint bundle by bpName. It creates a blueprint bundle
 *  and always returns one, because this is used by symbolize to create
 *  blueprint bundles as needed instead of checking if there is one */
function GetOrCreateBlueprintBundle(bpName: string): SM_Bundle {
  const fn = 'GetOrCreateBlueprintBundle:';
  bpName = bpName || '<CreatedBundle>';
  let bdl = BLUEPRINTS.get(bpName);
  if (bdl === undefined) {
    if (DBG) console.log(`${fn} creating '${bpName}' bundle on request`);
    bdl = new SM_Bundle(bpName, EBundleType.BLUEPRINT);
    // save the new bundle in dictionary
    BLUEPRINTS.set(bpName, bdl);
  }
  return bdl;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: return an array of all the blueprint bundles in the engine */
function GetAllBlueprintBundles(): SM_Bundle[] {
  const arr = [];
  const maps = [...BLUEPRINTS.values()];
  maps.forEach(map => {
    arr.push(map);
  });
  return arr;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: return an array of blueprint names string */
function GetBlueprintBundleList(): string[] {
  return [...BLUEPRINTS.keys()];
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: delete blueprint bundle by name */
function DeleteBlueprintBundle(bpName: string): void {
  if (!BLUEPRINTS.has(bpName)) {
    console.warn(`trying to delete non-existent blueprint '${bpName}'`);
  }
  BLUEPRINTS.delete(bpName);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: delete all blueprint bundles. Used when clearing sim engine state. */
function DeleteAllBlueprintBundles(): void {
  BLUEPRINTS.clear();
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function GetBlueprintSymbolsFor(bpName: string): TSymbolData {
  const { symbols } = GetBlueprintBundle(bpName);
  if (DBG) if (symbols !== undefined) console.log('found', bpName, 'blueprint');
  return symbols;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function GetBlueprintSymbols(): TSymbolData {
  const symbols: TSymbolData = {};
  GetBlueprintBundleList().forEach(bpName => {
    symbols[bpName] = GetBlueprintSymbolsFor(bpName);
  });
  return symbols;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** return hardcoded bundle program types */
function GetBundleOutSymbols() {
  // technically  'THINK', 'EXEC' are also available, but GS1.0 scripts don't
  // use them
  return CHECK.GetUserProgramNames();
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** return symbols for tag pragma */
function GetBundleTagSymbols() {
  return {
    IsCharControllable: 'enable:boolean' as TGSArg,
    IsPozyxControllable: 'enable:boolean' as TGSArg,
    IsPtrackControllable: 'enable:boolean' as TGSArg
  };
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** return pascal-case tagname if there is a case-insensitive match */
function IsBundleTagName(tagName: string): string {
  tagName = tagName.toUpperCase();
  const tags = GetBundleTagSymbols();
  const tagNames = Object.keys(tags);
  const tagCheck = tagNames.map(key => key.toUpperCase());
  let found = tagCheck.indexOf(tagName);
  return found >= 0 ? tagNames[found] : undefined;
}

/// KEYWORDS //////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// The GEMSTEP transpiler script language is built from 'keyword' modules
/// that can compile a 'decoded script tokens' into a compiled output,
/// symbols, or validated against syntax rules. See class-keyword.ts and
/// transpiler.ts for examples of use
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: variable types (e.g. gvar-number.ts is the type of a 'number' prop
 *  have to be declared and registered to be available to the transpiler */
function RegisterKeyword(Ctor: IKeywordCtor, alias?: string): void {
  const fn = 'RegisterKeyword:';
  const kobj = new Ctor();
  if (!CHECK.AreValidArgs(kobj.args as TGSArg[]))
    throw Error(`${fn} invalid argDef in keyword '${kobj.keyword}'`);
  KEYWORDS.set(alias || kobj.keyword, kobj);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: return a registered keyword module */
function GetKeyword(name: string): IKeyword {
  name = name;
  return KEYWORDS.get(name);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: return the list of all registered keywords */
function GetAllKeywords(): string[] {
  const arr = [];
  KEYWORDS.forEach((value, key) => {
    arr.push(key);
  });
  return arr;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API UTILITY: return the keyword module associated with the keyword.
 *  Keywords are case sensitive. */
function GetKeywordModuleByToken(kwTok: IToken): IKeyword {
  try {
    const kw = CHECK.KeywordFromToken(kwTok);
    const kwp = GetKeyword(kw);
    return kwp;
  } catch (caught) {
    console.warn(caught);
    return undefined;
  }
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: retrieve unwrapped symbols for keywords  */
function GetKeywordSymbols() {
  const keywords = GetAllKeywords();
  return keywords;
}

/// VALUE TYPE UTILITIES //////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** given a SMObject, store in VARS dict */
function RegisterPropType(propType: TGSType, ctor: TPropType) {
  propType = m_EnsureLowerCase(propType) as TGSType;
  if (VARS.has(propType)) throw Error(`RegisterPropType: ${propType} exists`);
  VARS.set(propType, ctor);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: get the registered SMObject constructor by name */
function GetPropTypeCtor(propType: TSLit): TPropType {
  propType = m_EnsureLowerCase(propType) as TSLit;
  return VARS.get(propType);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: return the VAR ctor dictionary */
function GetPropTypeCtorDict(): Map<string, TPropType> {
  return VARS;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function GetAllPropTypeCtors() {
  const fn = 'GetAllPropTypeCtors:';
  const list = [...VARS.entries()];
  return list;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** return unwrapped symbols for a PropType (ctors for prop vars) */
function GetPropTypeSymbolsFor(propType: string): TSymbolData {
  const fn = 'GetPropTypeSymbolsFor:';
  const { Symbols } = VARS.get(propType);
  return Symbols;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** return unwrapped symbols for ALL proptypes */
function GetPropTypeSymbols(): TSymbolData {
  const pts = [...VARS.entries()];
  const symbols = {};
  pts.forEach(([propType, ctor]) => {
    symbols[propType] = ctor.Symbols;
  });
  return symbols;
}

/// FEATURES ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Retrieve a feature module by its name and return its instance */
function GetFeature(fName: string): SM_Feature {
  return FEATURES.get(fName);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function GetAllFeatures() {
  return FEATURES;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** retrieve a method from a feature instance */
function GetFeatureMethod(fName: string, mName: string) {
  return GetFeature(fName)[mName];
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Register a feature module by name (as defined in the feature class */
function RegisterFeature(fpack: IFeature) {
  FEATURES.set(fpack.name, fpack);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function ResetAllFeatures() {
  FEATURES.forEach(f => f.reset());
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function DeleteAllFeatures() {
  FEATURES.clear();
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** return unwrapped 'features' symbols */
function GetFeatureSymbolsFor(fName: string): TSymbolData {
  const symbols = GetFeature(fName).symbolize();
  return symbols;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** return unwrapped 'features' symbols */
function GetFeatureSymbols(): TSymbolData {
  const symbols: TSymbolData = {};
  [...FEATURES.keys()].forEach(fName => {
    symbols[fName] = GetFeatureSymbolsFor(fName);
  });
  return symbols;
}

/// TEST DICTIONARIES /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// named tests are TSMCPrograms that expect to receive parameters on the
/// stack
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** returns true if test was saved for the first time, false otherwise */
function RegisterTest(
  name: string,
  program: TSMCProgram,
  symbols?: TSymbolData // future GEMSTEP
): boolean {
  name = m_EnsureLowerCase(name);
  const newRegistration = !TEST_SCRIPTS.has(name);
  TEST_SCRIPTS.set(name, program);
  return newRegistration;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function GetTest(name: string): TSMCProgram {
  name = m_EnsureLowerCase(name);
  return TEST_SCRIPTS.get(name);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** return array of [testName,TSMCProgram] */
function GetAllTests() {
  const list = [...TEST_SCRIPTS.entries()];
  return list;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function DeleteAllTests() {
  TEST_SCRIPTS.clear();
}

/// NAMED PROGRAM DICTIONARIES ////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function RegisterProgram(
  name: string,
  program: TSMCProgram,
  symbols?: TSymbolData // future GEMSTEP
) {
  name = m_EnsureLowerCase(name);
  if (NAMED_SCRIPTS.has(name)) throw Error(`RegisterProgram: ${name} exists`);
  NAMED_SCRIPTS.set(name, program);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function GetProgram(name: string): TSMCProgram {
  name = m_EnsureLowerCase(name);
  return NAMED_SCRIPTS.get(name);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function GetAllPrograms() {
  const list = [...NAMED_SCRIPTS.entries()];
  return list;
}

/// WHEN TEST DICTIONARY //////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// named javascript functions are used when you need to invoke it with
/// parameters during a function call. currently, these are only used for
/// 'when tests' and the symbol-interpreter assumes that's what they are
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function RegisterWhenTest(
  name: string,
  func: Function,
  symbols?: TSymbolData // future GEMSTEP
): boolean {
  name = m_EnsureLowerCase(name);
  const newRegistration = !WHEN_TESTS.has(name);
  WHEN_TESTS.set(name, func);
  return newRegistration;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function GetWhenTest(name: string): Function {
  name = m_EnsureLowerCase(name);
  let f = WHEN_TESTS.get(name);
  // return always random results if the test doesn't exist
  if (!f) f = () => Math.random() > 0.5;
  return f;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function GetAllWhenTests() {
  const whenTests = [...WHEN_TESTS.entries()];
  return whenTests;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** note: when tests can accept arguments but they are javascript function
 *  args that have to be passed from GEMSCRIPT. Currently no when tests in
 *  GS1.0 pass arguments, so we can return dummy structures that will still
 *  accurately validate for now */
function GetWhenTestSymbols() {
  const symbols = {};
  WHEN_TESTS.forEach((value, name) => {
    symbols[name] = {
      name,
      args: [],
      returns: 'boolean',
      info: `${name} whenTest`
    };
  });
  return symbols;
}

/// SCRIPT EVENTS /////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** RUNTIME MODULE INITIALIZATION CHEESE: make sure the event scripts dictionary
 *  has all the legal system event names, initializing with empty map so all the
 *  keys for system events are available to the validator system */
CHECK.SystemEventList().forEach(evtName => {
  if (!EVENT_SCRIPTS.has(evtName)) EVENT_SCRIPTS.set(evtName, new Map());
});
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Register an agentset to a particular handler. It's a TSMCProgram[] (an
 *  array of program arrays consisting of a stack of functions) that will
 *  get run when the EventHandler receives it.
 *  SCRIPT_EVENTS: Map<string, Map<string,TSMCProgram[]>> = new Map();
 *                eventName->Map(blueprintName)->TSMCProgram[]              */
function SubscribeToScriptEvent(
  evtName: string,
  bpName: string,
  consq: TSMCProgram
) {
  evtName = m_EnsureUpperCase(evtName);
  if (!EVENT_SCRIPTS.has(evtName)) EVENT_SCRIPTS.set(evtName, new Map());
  const subbedBPs = EVENT_SCRIPTS.get(evtName); // event->blueprint codearr
  if (!subbedBPs.has(bpName)) subbedBPs.set(bpName, []);
  // get the blueprint array for bpName, created if necessary
  const codearr = subbedBPs.get(bpName);
  if (typeof consq === 'function') codearr.push(consq);
  else codearr.push(...consq);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function GetHandlersForScriptEvent(evtName: string) {
  evtName = m_EnsureUpperCase(evtName);
  if (!EVENT_SCRIPTS.has(evtName)) EVENT_SCRIPTS.set(evtName, new Map());
  const subbedBPs = EVENT_SCRIPTS.get(evtName); // event->blueprint codearr
  const handlers = [];
  subbedBPs.forEach((handler, agentType) => {
    handlers.push({ agentType, handler });
  });
  return handlers;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function DeleteAllScriptEvents() {
  EVENT_SCRIPTS.clear();
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function GetAllScriptEvents() {
  const list = [...EVENT_SCRIPTS.entries()];
  return list;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function GetAllScriptEventNames() {
  return [...EVENT_SCRIPTS.keys()];
}

/// MODULE EXPORTS ////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// pragmas are used by the _pragma keyword
export { DefinePragma, GetPragma, GetPragmaMethodSymbols };
/// blueprints are stored as "bundles" by their name
export {
  SaveBlueprintBundle,
  HasBlueprintBundle,
  GetBlueprintBundle,
  GetOrCreateBlueprintBundle,
  GetAllBlueprintBundles,
  GetBlueprintBundleList,
  DeleteBlueprintBundle,
  DeleteAllBlueprintBundles,
  GetBlueprintSymbolsFor,
  GetBlueprintSymbols,
  GetBundleOutSymbols,
  GetBundleTagSymbols,
  IsBundleTagName
};
/// the transpiler is extendable using "keyword' modules that implement
/// symbolize, validate, and compile
export {
  RegisterKeyword,
  GetKeyword,
  GetAllKeywords,
  GetKeywordModuleByToken,
  GetKeywordSymbols
};
/// scriptable properties are called "gvars" and have constructors for each type
export {
  RegisterPropType,
  GetPropTypeCtor,
  GetPropTypeCtorDict,
  GetAllPropTypeCtors,
  GetPropTypeSymbolsFor,
  GetPropTypeSymbols
};
/// extensions to the script engine capabilities are handled with "feature" modules
export {
  GetFeature,
  GetAllFeatures,
  GetFeatureMethod,
  RegisterFeature,
  ResetAllFeatures,
  DeleteAllFeatures,
  GetFeatureSymbolsFor,
  GetFeatureSymbols
};
/// engine maintains dicts of named Javascript functions
export { RegisterWhenTest, GetWhenTest, GetAllWhenTests, GetWhenTestSymbols };
/// engine maintain dicts of compiler script code (TSMCProgram)
export { RegisterProgram, GetProgram, GetAllPrograms };
/// "when" conditions use programs that expect a certain input
export { RegisterTest, GetTest, GetAllTests, DeleteAllTests };
/// simulation triggers are managed through "script event" dicts
export {
  SubscribeToScriptEvent,
  GetHandlersForScriptEvent,
  DeleteAllScriptEvents,
  GetAllScriptEvents,
  GetAllScriptEventNames
};
