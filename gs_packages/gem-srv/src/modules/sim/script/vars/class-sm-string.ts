/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  The SM_String Prop Type contains a string and supports strict equality
  comparisons only

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import merge from 'deepmerge';
import SM_Object from 'lib/class-sm-object';
// uses types defined in t-script.d
import { RegisterPropType } from 'modules/datacore';
import { SM_Boolean } from './class-sm-boolean';
import { SM_Number } from './class-sm-number';

/// CLASS DEFINITION //////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export class SM_String extends SM_Object {
  constructor(initial?: string) {
    super();
    this.meta.type = Symbol.for('SM_String');
    this.value = initial;
    this.map = new Map();
  }
  setTo(str: string): SM_String {
    this.value = str;
    return this;
  }
  // REVIEW: Rename it to 'concatenate'?
  add(str: string): SM_String {
    this.value += str;
    return this;
  }
  equal(str: string) {
    return new SM_Boolean(this.value === str);
  }
  notEqual(str: string) {
    return new SM_Boolean(this.value !== str);
  }
  clear() {
    this.value = '';
  }
  // OPTIONS
  addOption(optionLabel: string, optionValue: string) {
    const val = optionValue || optionLabel; // if `optionValue` is not defined, use the optionLabel
    this.map.set(optionLabel, val);
  }
  setToOption(optionLabel: string) {
    // set this.value to the value associated with the option label
    this.value = this.map.get(optionLabel);
  }
  equalToOption(optionLabel: string) {
    return new SM_Boolean(this.value === this.map.get(optionLabel));
  }
  notEqualToOption(optionLabel: string) {
    return new SM_Boolean(this.value !== this.map.get(optionLabel));
  }
  localeCompare(compareStr: string): SM_Number {
    if (typeof this.value !== 'string') {
      throw new Error('localeCompare requires a string value');
    }
    const result = this.value.localeCompare(compareStr);
    return new SM_Number(result);
  }

  /// SYMBOL DECLARATIONS /////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** static method to return symbol data */
  static Symbolize(): TSymbolData {
    if (!SM_String._CachedSymbols)
      SM_String._CachedSymbols = SM_Object._SymbolizeNames(SM_String.Symbols);
    return SM_String._CachedSymbols;
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   * Override generic 'SM_String' method args with custom args
   * @param {object} methodsArgs { <method>: <argstring> }
   *                    e.g. { setTo: ['movementTypeString:string']}
   */
  static SymbolizeCustom(methodsArgs): TSymbolData {
    const symbols: TSymbolData = merge.all([SM_String.Symbolize()]);
    Object.entries(methodsArgs).forEach(([mKey, mVal]: [string, any]) => {
      symbols.methods[mKey].args = mVal;
    });
    return symbols;
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** instance method to return symbol data */
  symbolize(): TSymbolData {
    return SM_String.Symbolize();
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  static _CachedSymbols: TSymbolData;
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  static Symbols: TSymbolData = {
    methods: {
      setTo: { args: [`string:string`], info: 'Sets the property to a value' },
      add: {
        args: [`string:string`],
        info: 'Adds a new string to the current string (concatenates)'
      },
      equal: {
        args: ['comparison string:string'],
        info: 'Returns whether this property is equal to the passed value',
        returns: 'isEqual:boolean'
      },
      notEqual: {
        args: ['comparison string:string'],
        info: 'Returns whether this property is not equal to the passed value',
        returns: 'isNotEqual:boolean'
      },
      clear: { info: 'Clears the current property value' },
      // OPTIONS
      addOption: {
        args: ['label:string', 'value:string'],
        info: 'Defines a new option "label"-"value" pair, e.g. label "healthy" can be set to the string value "is healthy"'
      },
      setToOption: {
        args: ['option:string'],
        // args: ['option:identifier'],
        info: 'Sets the property to the value of the selected option'
      },
      equalToOption: {
        args: [`option:string`],
        info: 'Returns whether this property is equal to the referenced option value',
        returns: 'isEqual:boolean'
      },
      notEqualToOption: {
        args: [`option:string`],
        info: 'Returns whether this property is not equal to the referenced option value',
        returns: 'isNotEqual:boolean'
      },
      localeCompare: {
        args: [`compareStr:string`],
        info: 'Compares this string to another string using locale-specific ordering',
        returns: 'comparisonResult:number'
      }
    }
  };
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// see class export above
RegisterPropType('string', SM_String);
