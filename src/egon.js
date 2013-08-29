/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Egon.
 *
 * The Initial Developer of the Original Code is Christopher R. Field.
 * Portions created by the Initial Developer are Copyright (C) 2013
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 * 		Christopher R. Field <cfield2 at gmail dot com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */
var EXPORTED_SYMBOLS = ["Egon"];

/**
 * @namespace
 */
var Egon = {};

(function() {
	var dbConn, 
		metadata = {};

	// TODO: Add functions for formatting and returning values appropriate for interaction with the database.
	// SQLite3 supported types: NULL, INTEGER, REAL, TEXT, and BLOB. Boolean values are handled as integers 0 = false, 1 = true
	// Date and Time are handled as either TEXT using the ISO8601 string: YYYY-MM-DD HH:MM:SS.SSS, REAL as Julian day numbers,
	// and INTEGERs as Unix Time, the number of seconds since 1970-01-01 00:00:00 UTC. See column affinity documentation with SQLite3.
	/**
	 * A mapping of known JavaScript variable types to SQLite column types.
	 * @typedef {Object} TypeConstant
	 * @readonly
	 * @constant
	 */
	Egon.TYPES = {
		NULL: {display: 'null', dbType: 'NULL', jsType: null},
		TEXT: {display: 'text', dbType: 'TEXT', jsType: ''},
		INTEGER: {display: 'integer', dbType: 'INTEGER', jsType: 0},
		BOOLEAN: {display: 'boolean', dbType: 'INTEGER', jsType: false},
		DECIMAL: {display: 'decimal', dbType: 'REAL', jsType: 0.0},
		DATE: {display: 'date', dbType: 'INTEGER', jsType: new Date()},
	};
	
	/**
	 * The column options. These are the possible properties for the 'option' object of the Column constructor.
	 * 
	 * @typedef {String} OptionsConstant
	 * @readonly
	 * @constant
	 */
	Egon.OPTIONS = {
		PRIMARY_KEY: 'primaryKey',
		AUTO_INCREMENT: 'autoIncrement',
		NOT_NULL: 'notNull',
		UNIQUE: 'unique',
		DEFAULT_VALUE: 'defaultValue',
		COLLATE: 'collate',
		FOREIGN_KEY: 'foreignKey',
	};
	
	/**
	 * The possible values for the 'collate' option.
	 * 
	 * @typedef {String} CollateConstant
	 * @readonly
	 * @constant
	 */
	Egon.COLLATE = {
		BINARY: 'BINARY',
		NOCASE: 'NOCASE',
		RTRIM: 'RTRIM',	
	};
	
	/**
	 * The possible values for the 'conflict' option.
	 * 
	 * @typedef {String} ConflictConstant
	 * @readonly
	 * @constant
	 */
	Egon.CONFLICT = {
		ROLLBACK: 'ROLLBACK',
		ABORT: 'ABORT',
		FAIL: 'FAIL',
		IGNORE: 'IGNORE',
		REPLACE: 'REPLACE',
	};
	
	/**
	 * The possible values for the 'ON DELETE' and 'ON UPDATE' clauses of a Foreign Key SQL definition.
	 * 
	 * @typedef {String} ActionsConstant
	 * @readonly
	 * @constant
	 */
	Egon.ACTIONS = {
		SET_NULL: 'SET NULL',
		SET_DEFAULT: 'SET DEFAULT',
		CASCADE: 'CASCADE',
		RESTRICT: 'RESTRICT',
		NO_ACTION: 'NO ACTION',
	};
	
	/**
	 * The possible values for the 'DEFERRABLE' clause of a Foreign Key SQL definition.
	 * 
	 * @typedef {String} DefersConstant
	 * @readonly
	 * @constant
	 */
	Egon.DEFERS = {
		DEFERRED: 'INITIALLY DEFERRED',
		IMMEDIATE: 'INITIALLY IMMEDIATE',
	};
	
	/**
	 * The possible operators for an expression used in a 'WHERE' clause.
	 * 
	 * @typedef {String} OperatorsConstant.
	 * @readonly
	 * @constant
	 */
	Egon.OPERATORS = {
		EQUALS: '=',
		NOT_EQUALS: '!=',
		LESS_THAN: '<',
		GREATER_THAN: '>',
		LESS_THAN_EQUALS: '<=',
		GREATER_THAN_EQUALS: '>=',
		TIMES: '*',
		DIVIDED_BY: '/',
		MODULO: '%',
		IS: 'IS',
		IS_NOT: 'IS NOT',
		IN: 'IN',
		LIKE: 'LIKE',
		GLOB: 'GLOB',
		MATCH: 'MATCH',
		REGEXP: 'REGEXP',
		AND: 'AND',
		OR: 'OR',
		NOT: 'NOT',
	};
	
	/**
	 * Initializes the library.
	 * 
	 * @param {mozIStorageConnection} aDBConn - A connection to a database. 
	 */
	Egon.init = function(aDBConn) {
		dbConn = aDBConn;
	};
	
	/**
	 * Creates all of the metadata, or database tables. The "IF NOT EXIST" clause is used, so the
	 * tables will not be deleted or overwritten if they already exist.
	 */
	Egon.createAll = function() {
		var key, 
			stmt;
		
		for (key in metadata) {
			if (metadata.hasOwnProperty(key)) {
				// TODO: Change dbConn to universal interface. Right now it uses the Mozilla-specific Storage interface to 
				// interact with a SQLite database. This should be abstracted to be used for any database in any environment.
				stmt = dbConn.createAsyncStatement(metadata[key].toString());
				stmt.executeAsync();
			}
		}
	};
		
	/**
	 * Executes a SQL expression. Calls the 'compile' function of the expression,
	 * binds the parameters, and asynchronously executes.
	 * 
	 * @param {Clause} clause - A SQL clause.
	 * @param {mozIStorageStatementCallback} [callback] - A callback.
	 */
	// TODO: Update documentation with description of callback.
	Egon.execute = function(clause, callback) {
		var compiled = clause.compile(),
			stmtParams,
			bindings,
			stmt,
			key;
			
		dump(compiled + "\n");
		
		stmt = dbConn.createAsyncStatement(compiled.toString());
		stmtParams = stmt.newBindingParamsArray();		
		bindings = stmtParams.newBindingParams();
		
		for (key in compiled.params) {
			bindings.bindByName(key, compiled.params[key]);
		}
		
		stmtParams.addParams(bindings);
		stmt.bindParameters(stmtParams);
		
		stmt.executeAsync(callback);		
	};
	
	/**
	 * Factory method for creating tables.
	 * 
	 * @param {String} name - The table name.
	 * @param {Object} [schema] - An object literal the values of the properties should be Column objects and the keys will be added as properties to this table.
	 * @see {Table}
	 */
	Egon.table = function(name, schema) {
		return new Table(name, schema);
	};
	
	/**
	 * Constructor for a SQL database table.
	 * 
	 * @constructor
	 * 
	 * @param {String} name - The name of this table.
	 * @param {Object} [schema] - An object literal the values of the properties should be Column objects and the keys will be added as properties to this table. 
	 */
	function Table(name, schema) {
		var that = this,
			keys,
			i;

		this._name = name;
		
		if (typeof schema !== 'undefined') {
			keys = Object.keys(schema);
			
			for (i = 0; i < keys.length; i += 1) {
				(function() {
					Object.defineProperty(that, keys[i], {
						value: schema[key],
						writable: true,
						enumerable: true,
						configurable: true,
					});
				}());
			}
		}
		
		metadata[this._name] = this;
	};
	
	/**
	 * Gets the name of this table.
	 * 
	 * @returns {String} The table name.
	 */
	Table.prototype.name = function() {
		return this._name;
	};
	
	/**
	 * Gets an array of the columns for this table.
	 * 
	 * @returns {Array} - An array of table columns.
	 */
	Table.prototype.columns = function() {
		var columns = [], 
			that = this, 
			key;
		
		for (key in that) {
			if (that[key] instanceof Column) {
				columns.push(that[key]);
			}
		}
		
		return columns;
	};
	
	/**
	 * Gets an array of foreign keys for this table.
	 * 
	 * @returns {Array} - An array of foreign keys.
	 */
	Table.prototype.foreignKeys = function() {
		var foreignKeys = [],
			that = this,
			key;
		
		for (key in that) {
			if (that[key] instanceof ForeignKey) {
				foriegnKeys.push(that[key]);
			}
		}
		
		return foreignKeys;
	};
		
	/**
	 * Creates a SQL string to create this table in a database. The 'IF NOT EXISTS' clause is
	 * used to prevent corrupting the database or overwriting data.
	 * 
	 * @returns {String} A SQL string.
	 */
	Table.prototype.toString = function() {
		var sql = "CREATE TABLE IF NOT EXISTS " + this._name + " (\n",
			columns = this.columns(),
			foreignKeys = this.foreignKeys(),
			i;
		
		for (i = 0; i < columns.length; i += 1) {
			sql += columns[i] + ", \n";
		}
		
		for (i = 0; i < foreignKeys.length; i += 1) {
			sql += "CONSTRAINT " + foreignKeys[i].name + " FOREIGN KEY (" + foreignKeys[i].column.name + ") " + foreignKeys[i] + ", \n";
		}
		
		// Remove trailing newline character, comma, and space.
		sql = sql.slice(0, -3) + ")";
		
		return sql;
	};

	/**
	 * Creates an {Insert} SQL clause to insert values into this table.
	 * 
	 * @param {Object} values - An object literal with the keys as the property name for this table pointing to the columns.
	 * @returns {Insert} An 'INSERT' SQL clause.
	 */
	Table.prototype.insert = function(values) {
		var insert = new Insert(),
			columnNames = [],
			that = this,
			columnKey;
		
		for (columnKey in values) {
			columnNames.push(that[columnKey].name);
		}
		
		insert.into(this._name).columns(columnNames).values(values);
		
		return insert;
	};
	
	/**
	 * Creates an {Update} SQL clause to update values in this table.
	 * 
	 * @param {Object} values - An object literal with the keys as the property name for this table pointing to the columns.
	 * @returns {Update} A 'UPDATE' SQL clause.
	 */
	Table.prototype.update = function(values) {
		var update = new Update(this._name),
			that = this,
			columns = {},
			columnKey;
			
		for (columnKey in values) {
			columns[that[columnKey].name] = values[columnKey];
		}
		
		update.set(columns);
		
		return update;
	};
	
	/**
	 * Creates a {Delete} SQL clause to delete values from this table.
	 * 
	 * @returns {Delete} A 'DELETE' SQL clause.
	 */
	Table.prototype.remove = function() {
		var _delete = new Delete();
		
		_delete.from(this._name);
		
		return _delete;
	};
	
	// TODO: Add support for creating indices for a table on a column.
	
	/**
	 * Factory method for creating columns.
	 * 
	 * @param {String} name - The column name.
	 * @param {TypeConstant} type - The column type.
	 * @param {OptionsConstant} [options] - An object literal with keys from the {ColumnOptions} constants.
	 * @see {Column}
	 */
	Egon.column = function(name, type, options) {
		return new Column(name, type, options);
	};
	
	/**
	 * Constructor for a SQL database column.
	 * 
	 * The <code>options</code> parameter for this constructor can have any or all of the following
	 * properties: primaryKey, autoIncrement, notNull, unique, defaultValue, collate, foreignKey. A
	 * default value is set if the property is <code>undefined</code> in the option object.
	 *
	 * The <code>primaryKey</code> option is a boolean value indicating if the column is the primary key for the table.
	 * The <code>autoIncrement</code> option is a boolean value indicating if the ID should be auto incremented.
	 * The <code>notNull</code> option is a boolean value indicating if the NULL value is not acceptable.
	 * The <code>unique</code> option is a boolean value indicating if the rows must have a unqiue value for this column.
	 * The <code>defaultValue</code> option is the default value used on 'insert' commands.
	 * The <code>collate</code> option is a string from the <code>Column.collate</code> constants.
	 * The <code>foreignKey</code> option is a <code>ForeignKey</code> object.
	 * 
	 * @constructor
	 * 
	 * @param {String} name - The column name.
	 * @param {TypeConstant} type - The column type.
	 * @param {OptionsConstant} [options] - An object literal with keys from the {ColumnOptions} constants.
	 */
	function Column(name, type, options) {
		this.name = name;
		this._type = type;
		
		// TODO: Add support for conflict-clause
		
		if (options) {
			this.primaryKey = options[Egon.OPTIONS.PRIMARY_KEY] || false;
			this.autoIncrement = options[Egon.OPTIONS.AUTO_INCREMENT] || false;
			
			// TODO: Add support for conflict-clause
			this.notNull = options[Egon.OPTIONS.NOT_NULL] || false;
			
			// TODO: Add support for conflict-clause
			this.unique = options[Egon.OPTIONS.UNIQUE] || false;
			
			// TODO: Add expression support
			this.defaultValue = options[Egon.OPTIONS.DEFAULT_VALUE] || 'NULL';
			this.collate = options[Egon.OPTIONS.COLLATE] || null;

			this.foreignKey = options[Egon.OPTIONS.FOREIGN_KEY] || null;	
		} else {
			this.primaryKey = false;
			this.autoIncrement = false;
			this.notNull = false;
			this.unique = false;
			this.defaultValue = 'NULL';
			this.collate = null;
			this.foreignKey = null;
		}
	};
	
	/**
	 * Returns a SQL expression with this column's name as the left operand for the
	 * equals operator and a value as a literal value for the right operand.
	 * 
	 * @param {String|Number} value - The right operand value.
	 * @returns {Expr} A SQL expression that can be used for a 'WHERE' clause or chained together with other expressions.
	 */
	Column.prototype.equals = function(value) {
		var expr = new Expr();
		
		expr = expr.column(this.name).equals(value);
		
		return expr;
	};
	
	/**
	 * Returns a SQL expression with this column's name as the left operand for the
	 * not equals operator and a value as a literal value for the right operand.
	 * 
	 * @param {String|Number} value - The right operand value.
	 * @returns {Expr} A SQL expression that can be used for a 'WHERE' clause or chained together with other expressions.
	 */
	Column.prototype.notEquals = function(value) {
		var expr = new Expr();
		
		expr = expr.column(this.name).notEquals(value);
		
		return expr;
	};
	
	/**
	 * Returns a SQL expression with this column's name as the left operand for the
	 * less than operator and a value as a literal value for the right operand.
	 * 
	 * @param {String|Number} value - The right operand value.
	 * @returns {Expr} A SQL expression that can be used for a 'WHERE' clause or chained together with other expressions.
	 */
	Column.prototype.lessThan = function(value) {
		var expr = new Expr();
		
		expr = expr.column(this.name).lessThan(value);
		
		return expr;
	};
	
	/**
	 * Returns a SQL expression with this column's name as the left operand for the
	 * greater than operator and a value as a literal value for the right operand.
	 * 
	 * @param {String|Number} value - The right operand value.
	 * @returns {Expr} A SQL expression that can be used for a 'WHERE' clause or chained together with other expressions.
	 */
	Column.prototype.greaterThan = function(value) {
		var expr = new Expr();
		
		expr = expr.column(this.name).greaterThan(value);
		
		return expr;
	};
	
	/**
	 * Returns a SQL expression with this column's name as the left operand for the
	 * less than equals operator and a value as a literal value for the right operand.
	 * 
	 * @param {String|Number} value - The right operand value.
	 * @returns {Expr} A SQL expression that can be used for a 'WHERE' clause or chained together with other expressions.
	 */
	Column.prototype.lessThanEquals = function(value) {
		var expr = new Expr();
		
		expr = expr.column(this.name).lessThanEquals(value);
		
		return expr;
	};
	
	/**
	 * Returns a SQL expression with this column's name as the left operand for the
	 * greater than equals operator and a value as a literal value for the right operand.
	 * 
	 * @param {String|Number} value - The right operand value.
	 * @returns {Expr} A SQL expression that can be used for a 'WHERE' clause or chained together with other expressions.
	 */
	Column.prototype.greaterThanEquals = function(value) {
		var expr = new Expr();
		
		expr = expr.column(this.name).greaterThanEquals(value);
		
		return expr;
	};
	
	/**
	 * Creates an SQL string to create the column for a table.
	 * 
	 * @returns {String} A SQL string.
	 */
	Column.prototype.toString = function() {
		// TODO: Add column-constraint support.
		var sql = this.name + " " + this._type.dbType;
		
		if (this.primaryKey) {
			sql += " PRIMARY KEY";
		}
		
		if (this.autoIncrement) {
			sql += " AUTOINCREMENT";
		}
		
		if (this.notNull) {
			sql += " NOT NULL";
		}
		
		if (this.unique) {
			sql += " UNIQUE";
		}
		
		if (this.defaultValue) {
			sql += " DEFAULT " + this.defaultValue;
		}
		
		if (this.collate) {
			sql += " COLLATE " + this.collate;
		}
		
		if (this.foreignKey) {
			sql += " CONSTRAINT " + this.foreignKey.name + this.foreignKey;
		}
		
		return sql;
	};
	
	/**
	 * Factory method for creating foreign keys.
	 * 
	 * @param {String} name - The name of the constraint.
	 * @param {Table} parent - The parent or foreign table.
	 * @param {Array} parentColumns - The columns in the parent, or foreign, table.
	 * @param {String} [onDelete] - A {ForeignKeyAction} constants.
	 * @param {String} [onUpdate] - A {ForeignKeyAction} constants.
	 * @see {ForeignKey}
	 */
	Egon.foreignKey = function(name, parent, parentColumns, onDelete, onUpdate) {
		return new ForeignKey(name, parent, parentColumns, onDelete, onUpdate);
	};
	
	/**
	 * Constructor for a Foreign Key.
	 * 
	 * @constructor
	 * 
	 * @param {String} name - The name of the constraint.
	 * @param {Table} parent - The parent or foreign table.
	 * @param {Array} parentColumns - The columns in the parent, or foreign, table.
	 * @param {String} [onDelete] - A {ForeignKeyAction} constants.
	 * @param {String} [onUpdate] - A {ForeignKeyAction} constants. 
	 */
	function ForeignKey(name, parent, parentColumns, onDelete, onUpdate) {
		this.name = name;
		this.parent = parent;
		this.columns = parentColumns;
		this.onDelete = onDelete || false;
		this.onUpdate = onUpdate || false;
		
		// TODO: Add support for 'MATCH' clause
		// TODO: Add support for 'DEFERRABLE' clause
	};
	
	ForeignKey.prototype.toString = function() {
		var sql = " REFERENCES " + this.parent._name + " (",
			i;
		
		for (i = 0; i < this.columns.length; i += 1) {
			sql += this.columns[i].name + ",";
		}
		
		// Remove trailing comma.
		sql = sql.slice(0, -1) + ")";
		
		if (this.onDelete) {
			sql += "ON DELETE " + this.onDelete;
		}
		
		if (this.onUpdate) {
			sql += "ON UPDATE " + this.onUpdate;
		}
		
		return sql;
	};
	
	/**
	 * Creates a bind parameter object.
	 * 
	 * A bind parameter has a key, or placeholder, and a value. The value replaces the placeholder 
	 * whening binding the parameters to a SQL statement. This prevents SQL injection attacks because
	 * the value is never executed as SQL.
	 * 
	 * If a key is not provided, then a numeric, or index, key is used.
	 * 
	 * @constructor
	 * 
	 * @param {Object} value - The literal value.
	 * @param {String} [key] - The key, or placeholder, for the literal value that will be replaced on binding.
	 */
	function Param(value, key) {
		this.value = value;
		this.key = key;
	};
	
	Param.prototype.toString = function() {
		var str = "{";
		
		if (this.key !== undefined) {
			str += this.key; 
		}
		else {
			str += "?";
		}
		
		return str + ": '" + this.value + "'}";
	};
	
	/**
	 * Constructor for a compiled object. This is a compiled clause.
	 * 
	 * @constructor
	 * 
	 * @param {String} sql - The SQL string compiled from a clause.
	 * @param {Object} params - A literal with the properties as the keys for the named bind parameters and the property values as the binding values.
	 */
	function Compiled(sql, params) {
		this._sql = sql;
		this.params = params;
	};
	
	/**
	 * The SQL string ready for parameter binding and execution.
	 * 
	 * @return {String} The SQL string.
	 */
	Compiled.prototype.toString = function() {
		return this._sql;
	};
	
	
	/**
	 * Constructor for the parent object for all SQL clauses.
	 * 
	 * @constructor
	 */
	function Clause() {
		this._tree = [];
	};
	
	/**
	 * Gets the full tree. The child clauses are added to this clause's tree.
	 * 
	 * @returns {Array} The full tree with child clauses.
	 */
	Clause.prototype.tree = function() {
		var tree = [],
			i;
		
		for (i = 0; i < this._tree.length; i += 1) {
			if (this._tree[i] instanceof Clause) {
				tree = tree.concat(this._tree[i].tree());
			}
			else {
				tree.push(this._tree[i]);
			}
		}
		
		return tree;
	};
	
	/**
	 * Compiles the clause ready for parameter binding and execution.
	 * 
	 * @returns {Compiled} A compiled object that contains the SQL string and the parameters for binding.
	 */
	Clause.prototype.compile = function() {
		var sql = '',
			tree = this.tree(),
			params = {},
			paramCount = 0,
			node,
			i;
		
		for (i = 0; i < tree.length; i += 1) {
			node = tree[i];
			if (node instanceof Param) {
				if (!node.key) {
					node.key = _generateParamKey(paramCount);
					paramCount += 1;
				}
				
				sql += ":" + node.key;
				params[node.key] = node.value;
			} else {
				sql += node;
			}
		}
		
		return new Compiled(sql, params);
	};
	
	/**
	 * Generates a named parameter key based on the current number of parameters.
	 * 
	 * A named parameter is created using the following pattern: 'paramA', 'paramB', 
	 * 'paramC', ... 'paramAA', 'paramBB', ... 'paramAAA' and so on.
	 * 
	 * @param {Integer} paramCount - The current number of parameters.
	 */
	function _generateParamKey(paramCount) {
		var DEFAULT_PARAM = "param",
			charCode = 65 + (paramCount % 26),
			repeat = paramCount / 26,
			suffix,
			i;
		
		suffix = String.fromCharCode(charCode);
		
		for (i = 1; i < repeat; i += 1) {
			suffix = String.fromCharCode(charCode);
		}
		
		return DEFAULT_PARAM + suffix;
	}
	
	/**
	 * A factory method for creating expressions.
	 */
	Egon.expr = function() {
		return new Expr();
	};
	
	/**
	 * Constructor for a SQL expression clause.
	 * 
	 * @constructor
	 */
	function Expr() {
		this._tree = [];
	};
	
	Expr.prototype = new Clause();
	
	/**
	 * Begins a group expression. 
	 * 
	 * This pushes a '(' onto the tree.
	 * 
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.begin = function() {
		this._tree.push("(");
		
		return this;
	};
	
	/**
	 * Ends a group expression.
	 * 
	 * This pushes a ')' onto the tree.
	 * 
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.end = function() {
		this._tree.push(")");
		
		return this;
	};
	
	/**
	 * Adds a binary operator and its right operand to the tree. The left operand
	 * is assumed to already be attached to the tree.
	 * 
	 * @param {OPERATORS} operator - The operator.
	 * @param {Expr|String|Number} rightOperant - The right operand
	 * @return {Expr} This SQL expression clause.  
	 */
	Expr.prototype._binaryOperator = function(operator, rightOperand) {
		this._tree.push(" " + operator + " ");
		
		if (rightOperand !== undefined) {
			if (rightOperand instanceof Expr) {
				this._tree.push(rightOperand);
			} else {
				this._tree.push(new Param(rightOperand));
			}
		}
		
		return this;
	};
	
	/**
	 * Adds the '=' operator to this expression.
	 * 
	 * @param {Expr|String|Number} rightOperand - The right operand to the binary operator. 
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.equals = function(rightOperand) {
		return this._binaryOperator(Egon.OPERATORS.EQUALS, rightOperand);
	};
	
	/**
	 * Adds the '!=' operator to this expression.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.notEquals = function(rightOperand) {
		return this._binaryOperator(Egon.OPERATORS.NOT_EQUALS, rightOperand);
	};
	
	/**
	 * Adds the '<' operator to this expression.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.lessThan = function(rightOperand) {
		return this._binaryOperator(Egon.OPERATORS.LESS_THAN, rightOperand);
	};
	
	/**
	 * Adds the '>' operator to this expression.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.greaterThan = function(rightOperand) {
		return this._binaryOperator(Egon.OPERATORS.GREATER_THAN, rightOperand);
	};
	
	/**
	 * Adds the '<=' operator to this expression.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.lessThanEquals = function(rightOperand) {
		return this._binaryOperator(Egon.OPERATORS.LESS_THAN_EQUALS, rightOperand);
	};
	
	/**
	 * Adds the '>=' operator to this expression.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.greaterThanEquals = function(rightOperand) {
		return this._binaryOperator(Egon.OPERATORS.GREATER_THAN_EQUALS, rightOperand);
	};
	
	// TODO: Add 'LIKE' operator function.
	
	/**
	 * Adds the 'AND' operator to this expression.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.and = function(rightOperand) {
		return this._binaryOperator(Egon.OPERATORS.AND, rightOperand);
	};
	
	/**
	 * Adds the 'OR' operator to this expression.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.or = function(rightOperand) {
		return this._binaryOperator(Egon.OPERATORS.OR, rightOperand);
	};
	
	/**
	 * Adds the 'NOT' operator to this expression.
	 * 
	 * @param {Expr|String|Number} [operand] - The operand to the binary operator.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.not = function(operand) {
		return this._binaryOperator(Egon.OPERATORS.NOT, operand);
	};
	
	/**
	 * Adds a column name to this expression.
	 * 
	 * @param {String} columnName - A column name.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.column = function(columnName) {
		this._tree.push(columnName);
		
		return this;
	};
	
	/**
	 * Adds an expression to this expression.
	 * 
	 * @param {Expr} expr - An SQL expression clause.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.expr = function(expr) {
		this._tree.push(expr);
		
		return this;
	};
	
	/**
	 * Constructor for an Insert SQL statement.
	 * 
	 * @constructor
	 */
	function Insert() {
		this._tree = [];
		this._tree.push("INSERT");
	};
	
	Insert.prototype = new Clause();
	
	/**
	 * Adds the 'INTO' clause to this 'INSERT' SQL statement.
	 * 
	 * @param {String} tableName - The table name.
	 * @returns {Insert} This SQL 'INSERT' clause.
	 */
	Insert.prototype.into = function(tableName) {
		this._tree.push(" INTO ");
		this._tree.push(tableName);
		
		return this;
	};
	
	/**
	 * Adds the 'column-name' clause to this 'INSERT' SQL statement.
	 * 
	 * @param {Array} columnNames - The column names as {String}.
	 * @returns {Insert} This 'INSERT' SQL statement.
	 */
	Insert.prototype.columns = function(columnNames) {
		var stopCount = columnNames.length - 1,
			i;
		
		this._tree.push(" (");
				
		for (i = 0; i < stopCount; i += 1) {
			this._tree.push(columnNames[i]);
			this._tree.push(", ");
		}
		
		this._tree.push(columnNames[i]);
		this._tree.push(")");
		
		return this;
	};
	
	/**
	 * Adds the 'VALUES' clause to this 'INSERT' SQL statement.
	 * 
	 * The keys in the {Object} literal will be used as the named bind-parameters. 
	 * 
	 * @param {Object} values - An object literal with the keys as the property names for the columns in the table. Value of the property in the object literal is the value to insert in the table for the column.
	 * @returns {Insert} This SQL statement.
	 */
	Insert.prototype.values = function(values) {
		var key,
			keys,
			count,
			i;
		
		this._tree.push(" VALUES (");
		
		keys = Object.keys(values);
		count = keys.length - 1;
			
		for (i = 0; i < count; i += 1) {
			key = keys[i];
			this._tree.push(new Param(values[key], key));
			this._tree.push(", ");
		}
			
		key = keys[i];
		this._tree.push(new Param(values[key], key));
		this._tree.push(")");
		
		return this;
	};
	
	/**
	 * Constructor for the 'UPDATE' clause.
	 * 
	 * @constructor
	 * 
	 * @param {String} tableName - The name of a table to update.
	 */
	function Update(tableName) {
		this._tree = [];
		this._tree.push("UPDATE");
		this._tree.push(" " + tableName);
	};
	
	Update.prototype = new Clause();
	
	/**
	 * Adds the 'SET' clauses to this 'UPDATE' SQL clause.
	 * 
	 * The column names will be used as the named bind parameters.
	 * 
	 * @param {Object} columns - An object literal with the keys as the column names and the values as the values to update. 
	 * @returns {Update} This SQL clause.
	 */
	Update.prototype.set = function(columns) {
		var keys = Object.keys(columns),
			count = keys.length - 1,
			columnName,
			i;
		
		this._tree.push(" SET ");
		
		for (i = 0; i < count; i += 1) {
			columnName = keys[i];
			this._tree.push(columnName);
			this._tree.push(" = ");
			this._tree.push(new Param(columns[columnName], columnName));
			this._tree.push(", ");
		}
		
		columnName = keys[i];
		this._tree.push(columnName);
		this._tree.push(" = ");
		this._tree.push(new Param(columns[columnName], columnName));
		
		return this;
	};
	
	/**
	 * Adds a 'WHERE' clause to this 'UPDATE' SQL clause.
	 * 
	 * @param {Expr} expr - A SQL expression clause.
	 * @returns {Update} This SQL clause.
	 */
	Update.prototype.where = function(expr) {
		this._tree.push(" WHERE ");
		this._tree.push(expr);
		
		return this;
	};
	
	/**
	 * The constructor for the 'DELETE' SQL clause.
	 * 
	 * @constructor
	 */
	function Delete() {
		this._tree.push("DELETE");
	};
	
	Delete.prototype = new Clause();
	
	/**
	 * Adds the 'FROM' clause to this 'DELETE' SQL clause along with the table name.
	 * 
	 * @param {String} tableName - A table name.
	 * @returns {Delete} This 'DELETE' SQL clause.
	 */
	Delete.prototype.from = function(tableName) {
		this._tree.push(" FROM ");
		this._tree.push(tableName);
		
		return this;
	};
	
	/**
	 * Adds the 'WHERE' clause to this 'DELETE' SQL clause.
	 * 
	 * @param {Expr} expr - A SQL expression clause.
	 * @returns {Delete} This 'DELETE' SQL clause.
	 */
	Delete.prototype.where = function(expr) {
		this._tree.push(" WHERE ");
		this._tree.push(expr);
		
		return this;
	};
	
	// May want to change this to MappedClass as a name for the constructor
	function Class(tableName, columns) {
		function Class() {
			var that = this, keys = Object.keys(columns), i;
			
			this.id = null;
			this._table = Egon.metadata[tableName];
			this._fields = fields;
			this._data = {};
			this._listeners = [];
			
			for (i = 0; i < keys.length; i += 1) {
				/*
				 * A closure is needed in order to save the state of the 'property'
				 * variable. If a closure is not used, then the 'property' state, or
				 * value, is the last value passed to it in the loop. Creating the
				 * closure saves the state when the anonymous function that creates
				 * the closure was called in the loop.
				 */
				(function() {
					var key = keys[i];
					Object.defineProperty(that, key, {
						set : function(newValue) {
							var oldValue = that._data[key];
							that._data[key] = newValue;
							that._firePropertyChangeEvent({
								source : entity,
								property : key,
								newValue : newValue,
								oldValue : oldValue,
							});
						},
						get : function() {
							return that._data[key];
						},
					});
					
					that._data[key] = columns[key].defaultValue;
				}());
			}
			
			if (session !== undefined) {
				session.add(this);
			}
		};
		
		Class.prototype._firePropertyChangeEvent = function(event) {		
			var i;
			
			for (i = 0; i < this._listeners.length; i += 1) {
				this._listeners[i].propertyChanged(event);
			}
		};

		Class.prototype.addListener = function(listener) {
			this._listeners.push(listener);
		};

		Class.prototype.removeListener = function(listener) {
			var i;

			for (i = 0; i < this._listeners.length; i += 1) {
				if (this._listeners[i] === listener) {
					this._listeners.splice(i, 1);
				}
			}
		};

		return Class;
	};
	
	Egon.Class = Class;
}());