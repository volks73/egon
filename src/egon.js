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
var EXPORTED_SYMBOLS = ["egon"];

/**
 * @namespace
 */
var egon = {};

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
	 */
	egon.TYPES = {
		NULL: {display: 'null', dbType: 'NULL', jsType: null},
		TEXT: {display: 'text', dbType: 'TEXT', jsType: ''},
		INTEGER: {display: 'integer', dbType: 'INTEGER', jsType: 0},
		BOOLEAN: {display: 'boolean', dbType: 'INTEGER', jsType: false},
		DECIMAL: {display: 'decimal', dbType: 'REAL', jsType: 0.0},
		DATE: {display: 'date', dbType: 'TEXT', jsType: new Date()},
	};
	
	/**
	 * The column options. These are the possible properties for the 'option' object of the Column constructor.
	 * 
	 * @typedef {String} OptionsConstant
	 * @readonly
	 */
	egon.OPTIONS = {
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
	 */
	egon.COLLATE = {
		BINARY: 'BINARY',
		NOCASE: 'NOCASE',
		RTRIM: 'RTRIM',	
	};
	
	/**
	 * The possible values for the 'conflict' option.
	 * 
	 * @typedef {String} ConflictConstant
	 * @readonly
	 */
	egon.CONFLICT = {
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
	 */
	egon.ACTIONS = {
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
	 */
	egon.DEFERS = {
		DEFERRED: 'INITIALLY DEFERRED',
		IMMEDIATE: 'INITIALLY IMMEDIATE',
	};
	
	/**
	 * The possible operators for an expression used in a 'WHERE' clause.
	 * 
	 * @typedef {String} OperatorsConstant.
	 * @readonly
	 */
	egon.OPERATORS = {
		EQUALS: '==',
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
	egon.init = function(aDBConn) {
		dbConn = aDBConn;
	};
	
	/**
	 * Creates all of the metadata, or database tables. The "IF NOT EXIST" clause is used, so the
	 * tables will not be deleted or overwritten if they already exist.
	 */
	egon.createAll = function() {
		var key, 
			stmt;
		
		for (key in metadata) {
			if (metadata.hasOwnProperty(key)) {
				// TODO: Change dbConn to universal interface. Right now it uses the Mozilla-specific Storage interface to 
				// interact with a SQLite database. This should be abstracted to be used for any database in any environment.
				stmt = dbConn.createAsyncStatement(metadata[key].sql());
				stmt.executeAsync();
			}
		}
	};
	
	/**
	 * Executes a SQL expression. Calls the 'compile' function of the expression,
	 * binds the parameters, and asynchronously executes.
	 * 
	 * @param {Insert} expression - A SQL expression.
	 * @param {mozIStorageStatementCallback} [callback] - A callback.
	 */
	// TODO: Update documentation with description of callback.
	egon.execute = function(expr, callback) {
		var exprParams = expr.parameters();
			stmt,
			stmtParams,
			key,
			bindParam;
		
		stmt = dbConn.createAsyncStatement(expression.compile());
		stmtParams = stmt.newBindingParamsArray();
		bindParam = stmtParams.newBindingParams();
		
		for (key in exprParams) {
			bindParam.bindByName(key, exprParams[key]);
		}
		
		stmtParams.addParams(bindParam);
		stmt.bindParameters(stmtParams);
		
		stmt.executeAsync(callback);		
	};
	
	/**
	 * Creates an {Expr} object.
	 */
	egon.expr = function() {
		return new Expr();
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
	
	Table.prototype.toString = function() {
		var str = "table: " + this._name + "\n",
			columns = this.columns(),
			i;
			 
		for (i = 0; i < columns.length; i += 1) {
			str += "\t" + columns[i] + "\n";
		}
		
		return str;
	};
	
	/**
	 * Creates a SQL string to create this table in a database. The 'IF NOT EXISTS' clause is
	 * used to prevent corrupting the database or overwriting data.
	 * 
	 * @returns {String} A SQL expression.
	 */
	Table.prototype.sql = function() {
		var sql = "CREATE TABLE IF NOT EXISTS " + this._name + " (\n",
			columns = this.columns(),
			foreignKeys = this.foreignKeys(),
			i;
		
		for (i = 0; i < columns.length; i += 1) {
			sql += columns[i].sql() + ", \n";
		}
		
		for (i = 0; i < foreignKeys.length; i += 1) {
			sql += "CONSTRAINT " + foreignKeys[i].name + " FOREIGN KEY (" + foreignKeys[i].column.name + ") " + foreignKeys[i].sql() + ", \n";
		}
		
		// Remove trailing newline character, comma, and space.
		sql = sql.slice(0, -3) + ")";
		
		return sql;
	};

	/**
	 * Creates an {Insert} SQL statement to insert values into this table.
	 * 
	 * @param {Object} values - An object literal with the keys as the property name for this table pointing to the columns.
	 * @returns {Insert} An 'INSERT' SQL statement.
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
		
		// TODO: Execute, or push the SQL statement into an array to executed upon 'commit'.
		
		return insert;
	};
	
	/**
	 * Creates an {Update} SQL statement to update values in this table.
	 * 
	 * @param {Object} values - An object literal with the keys as the property name for this table pointing to the columns.
	 * @returns {Update} An Update SQL expression object.
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
	
	egon.Table = Table;
	
	// TODO: Add support for creating indices for a table on a column.
	
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
			this.primaryKey = options[egon.OPTIONS.PRIMARY_KEY] || false;
			this.autoIncrement = options[egon.OPTIONS.AUTO_INCREMENT] || false;
			
			// TODO: Add support for conflict-clause
			this.notNull = options[egon.OPTIONS.NOT_NULL] || false;
			
			// TODO: Add support for conflict-clause
			this.unique = options[egon.OPTIONS.UNIQUE] || false;
			
			// TODO: Add expression support
			this.defaultValue = options[egon.OPTIONS.DEFAULT_VALUE] || 'NULL';
			this.collate = options[egon.OPTIONS.COLLATE] || null;

			this.foreignKey = options[egon.OPTIONS.FOREIGN_KEY] || null;	
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
	
	Column.prototype.toString = function() {
		return "column: " + this.name + " " + this._type.display; 
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
		
		expr = expr.column(this.name).equals().value(value);
		
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
		
		expr = expr.column(this.name).notEquals().value(value);
		
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
		
		expr = expr.column(this.name).lessThan().value(value);
		
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
		
		expr = expr.column(this.name).greaterThan().value(value);
		
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
		
		expr = expr.column(this.name).lessThanEquals().value(value);
		
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
		
		expr = expr.column(this.name).greaterThanEquals().value(value);
		
		return expr;
	};
	
	/**
	 * Creates an SQL string to create the column for a table.
	 * 
	 * @returns {String} A SQL clause.
	 */
	Column.prototype.sql = function() {
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
			sql += " CONSTRAINT " + this.foreignKey.name + this.foreignKey.sql();
		}
		
		return sql;
	};
	
	egon.Column = Column;
	
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
		var str = this.name + " parent: " + this.parent + "\n columns: \n",
			i;
		
		for (i = 0; i < this.columns.length; i += 1) {
			str += this._columns[i] + "\n";
		}
		
		return str;
	};
	
	/**
	 * Creates a SQL string for creating the foreign key in a table.
	 * 
	 * @returns {String} A SQL clause.
	 */
	ForeignKey.prototype.sql = function() {
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
		
	egon.ForeignKey = ForeignKey;
	
	/**
	 * Constructor for a SQL expression.
	 * 
	 * @constructor
	 */
	function Expr() {
		this._tree = [];
		this._params = {};
	};
	
	/**
	 * Begins a group expression. 
	 * 
	 * This pushes a '(' onto the tree.
	 * 
	 * @returns {Expr} This expression.
	 */
	Expr.prototype.begin = function() {
		this._tree.push('(');
		
		return this;
	};
	
	/**
	 * Ends a group expression.
	 * 
	 * This pushes a ')' onto the tree.
	 * 
	 * @returns {Expr} This expression.
	 */
	Expr.prototype.end = function() {
		this._tree.push(')');
		
		return this;
	};
	
	/**
	 * Adds a literal value to this expression.
	 * 
	 * @param {String|Number} literal - The literal value. 
	 * @returns {Expr} This expression.
	 */
	Expr.prototype.value = function(literal) {
		this._tree.push("'" + literal + "'");
		
		return this;
	};
	
	/**
	 * Adds the '==' operator to this expression.
	 * 
	 * @returns {Expr} This expression.
	 */
	Expr.prototype.equals = function() {
		this._tree.push(' ' + egon.OPERATORS.EQUALS + ' ');
		
		return this;
	};
	
	/**
	 * Adds the '!=' operator to this expression.
	 * 
	 * @returns {Expr} This expression.
	 */
	Expr.prototype.notEquals = function() {
		this._tree.push(' ' + egon.OPERATORS.NOT_EQUALS + ' ');
		
		return this;
	};
	
	/**
	 * Adds the '<' operator to this expression.
	 * 
	 * @returns {Expr} This expression.
	 */
	Expr.prototype.lessThan = function() {
		this._tree.push(' ' + egon.OPERATORS.LESS_THAN + ' ');
		
		return this;
	};
	
	/**
	 * Adds the '>' operator to this expression.
	 * 
	 * @returns {Expr} This expression.
	 */
	Expr.prototype.greaterThan = function() {
		this._tree.push(' ' + egon.OPERATORS.GREATER_THAN + ' ');
		
		return this;
	};
	
	/**
	 * Adds the '<=' operator to this expression.
	 * 
	 * @returns {Expr} This expression.
	 */
	Expr.prototype.lessThanEquals = function() {
		this._tree.push(' ' + egon.OPERATORS.LESS_THAN_EQUALS + ' ');
		
		return this;
	};
	
	/**
	 * Adds the '>=' operator to this expression.
	 * 
	 * @returns {Expr} This expression.
	 */
	Expr.prototype.greaterThanEquals = function() {
		this._tree.push(' ' + egon.OPERATORS.GREATER_THAN_EQUALS + ' ');
		
		return this;
	};
	
	// TODO: Add 'LIKE' operator function.
	
	/**
	 * Adds the 'AND' operator to this expression.
	 * 
	 * @returns {Expr} This expression.
	 */
	Expr.prototype.and = function() {
		this._tree.push(' ' + egon.OPERATORS.AND + ' ');
		
		return this;
	};
	
	/**
	 * Adds the 'OR' operator to this expression.
	 * 
	 * @returns {Expr} This expression.
	 */
	Expr.prototype.or = function() {
		this._tree.push(' ' + egon.OPERATOR.OR + ' ');
		
		return this;
	};
	
	/**
	 * Adds the 'NOT' operator to this expression.
	 * 
	 * @returns {Expr} This expression.
	 */
	Expr.prototype.not = function() {
		this._tree.push(egon.OPERATORS.NOT);
		
		return this;
	};
	
	/**
	 * Adds a column name to this expression.
	 * 
	 * @param {String} columnName - The column name.
	 * @returns {Expr} This expression.
	 */
	Expr.prototype.column = function(columnName) {
		this._tree.push(columnName);
		
		return this;
	};
	
	/**
	 * Creates a SQL string ready for binding parameters and execution.
	 * 
	 * @returns {String} The SQL string.
	 */
	Expr.prototype.compile = function() {
		var sql = '',
			i;
		
		for (i = 0; i < this._tree.length; i += 1) {
			sql += this._tree[i];
		}
		
		return sql;
	};
	
	/**
	 * Constructor for an Insert SQL statement.
	 * 
	 * @constructor
	 */
	function Insert() {
		this._tree = [];
		this._tree.push("INSERT");
		this._params = {};
	};
	
	/**
	 * Adds the 'INTO' clause to this 'INSERT' SQL statement.
	 * 
	 * @param {String} tableName - The table name.
	 * @returns {Insert} This 'INSERT' SQL statement.
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
			this._tree.push(columnNames[i] + ", ");
		}
		
		this._tree.push(columnNames[i] + ")");
		
		return this;
	};
	
	/**
	 * Adds the 'VALUES' clause to this 'INSERT' SQL statement.
	 * 
	 * Named bind-parameters will be created if the 'values' parameter is an {Array}; otherwise, the keys in the {Object} literal will be used as the named bind-parameters if the 'values' parameter is an {Object} literal. 
	 * 
	 * @param {Object|Array} values - An object literal with the keys as the property names for the columns in the table. Value of the property in the object literal is the value to insert in the table for the column.
	 * @returns {Insert} This SQL statement.
	 */
	Insert.prototype.values = function(values) {
		var paramCount = Object.keys(this._params).length,
			key,
			keys,
			count,
			i;
		
		this._tree.push(" VALUES (");
		
		if (values instanceof Array) {
			count = values.length - 1;
			
			for (i = 0; i < count; i += 1) {
				key = "value" + (paramCount + i);
				this._tree.push(":" + key);
				this._tree.push(", ");
				this._params[key] = values[i];
			}
			
			key = "value" + i;
			this._tree.push(":" + key);
			this._params[key] = values[i];
		} else {
			keys = Object.keys(values);
			count = keys.length - 1;
			
			for (i = 0; i < count; i += 1) {
				key = keys[i];
				this._tree.push(":" + key);
				this._tree.push(", ");
				this._params[key] = values[key];
			}
			
			key = keys[i];
			this._tree.push(":" + key);
			this._params[key] = values[key];
		}

		this._tree.push(")");
		
		return this;
	};
	
	/**
	 * Creates a SQL string ready for binding parameters and execution.
	 * 
	 * @returns {String} A SQL string.
	 */
	Insert.prototype.compile = function() {
		var sql = '',
		i;
	
		for (i = 0; i < this._tree.length; i += 1) {
			if (this._tree[i] instanceof Expr) {
				sql += this._tree[i].compile();
			} else {
				sql += this._tree[i];
			}
		}
		
		return sql;
	};
	
	/**
	 * Constructor for the 'UPDATE' SQL statement.
	 * 
	 * @constructor
	 * 
	 * @param {String} tableName - The name of the table to update.
	 */
	function Update(tableName) {
		this._tree = [];
		this._params = {};
		
		this._tree.push("UPDATE");
		this._tree.push(" " + tableName);
	};
	
	/**
	 * Adds the 'SET' and column clauses to this 'UPDATE' SQL statement.
	 * 
	 * @param {Object} columns - An object literal with the keys as the column names and the values as the values to update. 
	 * @returns {Update} This SQL statement.
	 */
	Update.prototype.set = function(columns) {
		var keys = Object.keys(columns),
			paramCount = Object.keys(this._params).length,
			count = keys.length - 1,
			columnName,
			i,
			param;
		
		this._tree.push(" SET ");
		
		for (i = 0; i < count; i += 1) {
			columnName = keys[i];
			this._tree.push(columnName);
			this._tree.push(" = ");
			param = "value" + (paramCount + i);
			this._tree.push(":" + param);
			this._tree.push(", ");
			this._params[param] = columns[columnName];
		}
		
		columnName = keys[i];
		this._tree.push(columnName);
		this._tree.push(" = ");
		param = ":value" + (paramCount + i);
		this._tree.push(param);
		this._params[param] = columns[columnName];
		
		return this;
	};
	
	/**
	 * Adds a 'WHERE' clause to this 'UPDATE' SQL statement.
	 * 
	 * @param {Expr} expr - A SQL expression.
	 * @returns {Update} This SQL statement.
	 */
	Update.prototype.where = function(expr) {
		this._tree.push(" WHERE ");
		this._tree.push(expr);
		
		return this;
	};
	
	/**
	 * Creates a SQL string ready for binding parameters and execution.
	 * 
	 * @returns {String} A SQL string.
	 */
	Update.prototype.compile = function() {
		var sql = '',
		i;
	
		for (i = 0; i < this._tree.length; i += 1) {
			if (this._tree[i] instanceof Expr) {
				sql += this._tree[i].compile();
			} else {
				sql += this._tree[i];
			}
		}
		
		return sql;
	};
	
	// May want to change this to MappedClass as a name for the constructor
	function Class(tableName, columns) {
		function Class() {
			var that = this, keys = Object.keys(columns), i;
			
			this.id = null;
			this._table = egon.metadata[tableName];
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
	
	egon.Class = Class;
}());