/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  The GSVar class provides uniqueIds for each variable in the system

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let m_counter = 100;
function m_VarCount() {
  return m_counter++;
}

/// CLASS DEFINITION //////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class GSVar {
  constructor(initialValue) {
    this.meta = {
      id: m_VarCount(),
      type: Symbol.for('GSVar')
    };
    this._value = initialValue;
  }
  get value() {
    return this._value;
  }
  set value(value) {
    this._value = value;
  }
  get() {
    return this._value;
  }
  serialize() {
    return ['value', this._value];
  }
}

/// STATIC METHODS ////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/**
 *  given an array of mixed gvars and literals, return an array of
 *  pure values
 */
function GetValues(gvars) {
  const values = gvars.map(gvar => {
    if (gvar instanceof GSVar) return gvar.value;
    return gvar;
  });
  return values;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/**
 *  given an array of mixed gvars and literals, return an array of
 *  types
 */
function GetTypes(gvars) {
  const types = gvars.map(gvar => {
    if (gvar instanceof GSVar) return gvar.meta.type;
    if (typeof gvar === 'string') return 'STR'; // literal string
    if (typeof gvar === 'number') return 'NUM'; // literal number
    if (typeof gvar === 'boolean') return 'BOL'; // literal boolean
    throw Error(`unknown gvar type '${gvar}'`);
  });
  return types;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function IsAgentString(str) {
  if (typeof str !== 'string') throw Error('arg must be string');
  const len = str.split('.').length;
  if (len === 1) return true; // agent = string without periods
  return false; // dot is in name
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function IsPropString(str) {
  if (typeof str !== 'string') throw Error('arg must be string');
  if (!str.startsWith('.')) return false; // not a .string
  if (str.split('.').length !== 2) return false; // more than one .
  return true;
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
GSVar.GetTypes = GetTypes;
GSVar.GetValues = GetValues;
GSVar.IsAgentString = IsAgentString;
GSVar.IsPropString = IsPropString;
export default GSVar;
