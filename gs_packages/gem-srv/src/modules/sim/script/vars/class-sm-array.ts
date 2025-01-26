import merge from 'deepmerge';
import SM_Object from 'lib/class-sm-object';
import { RegisterPropType } from 'modules/datacore';
import { SM_Boolean } from './class-sm-boolean';

/// CLASS DEFINITION //////////////////////////////////////////////////////////
export class SM_Array extends SM_Object {
  private arrayValue: any[]; // Internal array storage

  constructor(initial?: string | any[]) {
    super();
    this.meta.type = Symbol.for('SM_Array');
    // Convert string to an array if necessary
    this.arrayValue =
      typeof initial === 'string' ? initial.split('') : initial || [];
  }

  /// Getter and Setter for `value`
  get value(): any[] {
    return this.arrayValue;
  }

  set value(newArray: any[]) {
    this.arrayValue = newArray;
  }

  /// Required Compatibility Methods //////////////////////////////////////////

  // Set the value of the array
  setTo(newArray: any[] | string): SM_Array {
    this.arrayValue =
      typeof newArray === 'string' ? newArray.split('') : newArray;
    return this;
  }

  // Check if this array equals another
  equal(compareValue: any[]): SM_Boolean {
    const isEqual =
      JSON.stringify(this.arrayValue) === JSON.stringify(compareValue);
    return new SM_Boolean(isEqual);
  }

  // Check if this array is not equal to another
  notEqual(compareValue: any[]): SM_Boolean {
    const isNotEqual =
      JSON.stringify(this.arrayValue) !== JSON.stringify(compareValue);
    return new SM_Boolean(isNotEqual);
  }
  /*
  // Stub for addOption (not applicable for arrays)
  addOption(optionLabel: string, optionValue: any[]) {
    console.warn('addOption is not implemented for SM_Array.');
  }

  // Stub for setToOption (not applicable for arrays)
  setToOption(optionLabel: string) {
    console.warn('setToOption is not implemented for SM_Array.');
  }

  // Stub for equalToOption (not applicable for arrays)
  equalToOption(optionLabel: string): SM_Boolean {
    console.warn('equalToOption is not implemented for SM_Array.');
    return new SM_Boolean(false);
  }

  // Stub for notEqualToOption (not applicable for arrays)
  notEqualToOption(optionLabel: string): SM_Boolean {
    console.warn('notEqualToOption is not implemented for SM_Array.');
    return new SM_Boolean(false);
  }
*/
  /// Array Operations ////////////////////////////////////////////////////////

  // Add an item to the array
  add(item: any): SM_Array {
    this.arrayValue.push(item);
    return this;
  }

  // Remove an item by index
  remove(index: number): SM_Array {
    if (index >= 0 && index < this.arrayValue.length) {
      this.arrayValue.splice(index, 1);
    } else {
      console.error(`Index ${index} is out of bounds.`);
    }
    return this;
  }

  // Get an item by index
  get(index: number): any {
    if (index >= 0 && index < this.arrayValue.length) {
      return this.arrayValue[index];
    }
    console.error(`Index ${index} is out of bounds.`);
    return null;
  }

  // Clear the array
  clear(): SM_Array {
    this.arrayValue = [];
    return this;
  }

  // Check if the array contains a value
  contains(value: any): boolean {
    return this.arrayValue.includes(value);
  }

  // Find the index of a value
  indexOf(value: any): number {
    return this.arrayValue.indexOf(value);
  }

  // Replace an item at a specific index
  set(index: number, value: any): SM_Array {
    if (index >= 0 && index < this.arrayValue.length) {
      this.arrayValue[index] = value;
    } else {
      console.error(`Index ${index} is out of bounds.`);
    }
    return this;
  }

  /// Additional Array Methods /////////////////////////////////////////////////

  // Get the length of the array
  size(): number {
    return this.arrayValue.length;
  }

  // Sort the array
  sort(compareFn?: (a: any, b: any) => number): SM_Array {
    this.arrayValue.sort(compareFn);
    return this;
  }

  // Numeric Ascending
  sortNumericAscending(): SM_Array {
    console.log('SORT NUMERIC ASCENDING');
    this.arrayValue.sort((a, b) => a - b);
    console.log('RESULT', this.arrayValue);
    return this;
  }

  // Numeric Descending
  sortNumericDescending(): SM_Array {
    console.log('SORT NUMERIC DESCENDING');
    this.arrayValue.sort((a, b) => b - a);
    console.log('RESULT', this.arrayValue);
    return this;
  }

  // String Ascending
  sortStringAscending(): SM_Array {
    console.log('SORT STRING ASCENDING');
    this.arrayValue.sort((a, b) => a.localeCompare(b));
    console.log('RESULT', this.arrayValue);
    return this;
  }

  // String Descending
  sortStringDescending(): SM_Array {
    console.log('SORT STRING DESCENDING');
    this.arrayValue.sort((a, b) => b.localeCompare(a));
    console.log('RESULT', this.arrayValue);
    return this;
  }

  // Filter the array based on a condition
  filter(
    predicate: (item: any, index: number, array: any[]) => boolean
  ): SM_Array {
    this.arrayValue = this.arrayValue.filter(predicate);
    return this;
  }

  filterByPosition(startIndex: number, offset: number): SM_Array {
    console.log('FILTER BY POSITION startIndex:', startIndex, 'offset:', offset);
    if (startIndex < 0 || startIndex >= this.arrayValue.length || offset <= 0) {
      console.error(
        'Invalid startIndex or offset. startIndex must be within array bounds, and offset must be positive.'
      );
      return this;
    }

    const filtered = this.arrayValue.filter(
      (_, index) => (index - startIndex) % offset === 0 && index >= startIndex
    );

    this.arrayValue = filtered;
    console.log('RESULT', this.arrayValue);
    return this;
  }

  // Clone the array
  clone(): SM_Array {
    return new SM_Array([...this.arrayValue]);
  }

  // Print the array as a string
  print(): string {
    console.log(`JOYCE [${this.arrayValue.join(', ')}]`);
    return `JOYCE2 [${this.arrayValue.join(', ')}]`;
  }

  /// Symbolization and Metadata //////////////////////////////////////////////

  /** Static method to return symbol data */
  static Symbolize(): TSymbolData {
    if (!SM_Array._CachedSymbols)
      SM_Array._CachedSymbols = SM_Object._SymbolizeNames(SM_Array.Symbols);
    return SM_Array._CachedSymbols;
  }

  /**
   * Override generic 'SM_Array' method args with custom args
   * @param {object} methodsArgs { <method>: <argstring> }
   *                    e.g. { add: ['item:any']}
   */
  static SymbolizeCustom(methodsArgs): TSymbolData {
    const symbols: TSymbolData = merge.all([SM_Array.Symbolize()]);
    Object.entries(methodsArgs).forEach(([mKey, mVal]: [string, any]) => {
      symbols.methods[mKey].args = mVal;
    });
    return symbols;
  }

  /** Instance method to return symbol data */
  symbolize(): TSymbolData {
    return SM_Array.Symbolize();
  }

  static _CachedSymbols: TSymbolData;

  static Symbols: TSymbolData = {
    methods: {
      add: {
        args: ['item:identifier'],
        info: 'Adds an item to the list.'
      },
      remove: {
        args: ['index:number'],
        info: 'Removes the item at the specified index.'
      },
      get: {
        args: ['index:number'],
        info: 'Returns the item at the specified index.',
        returns: 'item:identifier'
      },
      clear: {
        info: 'Clears the list.'
      },
      contains: {
        args: ['value:identifier'],
        info: 'Checks if the list contains the specified value.',
        returns: 'isContained:boolean'
      },
      indexOf: {
        args: ['value:identifier'],
        info: 'Returns the index of the specified value.',
        returns: 'index:number'
      },
      set: {
        args: ['index:number', 'value:identifier'],
        info: 'Replaces the item at the specified index with a new value.'
      },
      sort: {
        args: ['compareFn:identifier'],
        info: 'Sorts the list based on the optional compare function.'
      },
      sortNumericAscending: {
        info: 'Sorts the list in numeric ascending order.'
      },
      sortNumericDescending: {
        info: 'Sorts the list in numeric descending order.'
      },
      sortStringAscending: {
        info: 'Sorts the list in string ascending order.'
      },
      sortStringDescending: {
        info: 'Sorts the list in string descending order.'
      },
      filter: {
        args: ['predicate:identifier'],
        info: 'Filters the list based on the provided condition.'
      },
      filterByPosition: {
        args: ['startIndex:number', 'offset:number'],
        info: 'Filters the array to keep elements starting at the specified index and including every nth element based on the offset.'
      },
      clone: {
        info: 'Returns a new list that is a copy of the current list.'
      },
      print: {
        info: 'Prints the list as a formatted string.',
        returns: 'string:string'
      },
      size: {
        info: 'Returns the number of items in the list.',
        returns: 'size:number'
      }
    }
  };
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
RegisterPropType('{list}', SM_Array);
