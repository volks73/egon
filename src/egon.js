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
	 */
	egon.ACTIONS = {
		SET_NULL: 'SET NULL',
		SET_DEFAULT: 'SET DEFAULT',
		CASCADE: 'CASCADE',
		RESTRICT: 'RESTRICT',
		NO_ACTION: 'NO ACTION',
	};
	
	/**
	 * The possible values for the 'DEFERRABLE' clause of a Foreign Key SQL defintion.
	 * 
	 * @typedef {String} DefersConstant
	 */
	egon.DEFERS = {
		DEFERRED: 'INITIALLY DEFERRED',
		IMMEDIATE: 'INITIALLY IMMEDIATE',
	};
	
	/**
	 * Initializes the library.
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
				stmt = dbConn.createAsyncStatement(metadata[key].compile());
				stmt.executeAsync();
			}
		}
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
	 * Gets an array of the columns for this table.
	 * 
	 * @returns {Array}
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
	 * @returns {Array}
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
	Table.prototype.compile = function() {
		// CREATE TABLE IF NOT EXISTS tableName (column-name type-name column-constraint, table-constraint)
		var sql = "CREATE TABLE IF NOT EXISTS " + this._name + " (\n",
			columns = this.columns(),
			foreignKeys = this.foreignKeys(),
			i;
		
		for (i = 0; i < columns.length; i += 1) {
			sql += columns[i].compile() + ", \n";
		}
		
		for (i = 0; i < foreignKeys.length; i += 1) {
			sql += "CONSTRAINT " + foreignKeys[i].name + " FOREIGN KEY (" + foreignKeys[i].column.name + ") " + foreignKeys[i].compile() + ", \n";
		}
		
		// Remove trailing newline character, comma, and space.
		sql = sql.slice(0, -3) + ")";
		
		return sql;
	};

	// TODO: Replace with SQL expression language-based creation.
	Table.prototype.insert = function(values) {
		var sql = "INSERT INTO " + this._name + " (",
			that = this,
			columnSQL = '',
			valueSQL = '',
			key,
			stmt,
			params,
			bindParam;
			
		for (key in values) {
			if (that[key] instanceof Column) {
				columnSQL += that[key].name + ", ";
				valueSQL += ":" + key + ", ";
			}
		}
	
		// Remove trailing comma and space.
		sql += columnSQL.slice(0, -2) + ") VALUES (" + valueSQL.slice(0, -2) + ")";
		
		// TODO: Move following code somewhere else not specific to the table object. This is reusable code and can be used for
		// and SQL string.
		stmt = dbConn.createAsyncStatement(sql);
		params = stmt.newBindingParamsArray();
		
		for (key in values) {
			bindParam = params.newBindingParams();
			bindParam.bindByName(key, values[key]);
			params.addParams(bindParam);
		}
		
		stmt.bindParameters(params);
		stmt.executeAsync();
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
	};
	
	Column.prototype.toString = function() {
		return "column: " + this.name + " " + this._type.display; 
	};
	
	/**
	 * Creates an SQL string to create the column for a table.
	 * 
	 * @returns {String} A SQL expression.
	 */
	Column.prototype.compile = function() {
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
			sql += " CONSTRAINT " + this.foreignKey.name + this.foreignKey.compile();
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
	
	ForeignKey.prototype.compile = function() {
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
	
	// TODO: Create SQL Expression super object for Insert, Select, Update, and Delete.
	
	function Insert(table) {
		this._table = table;
	};
	
	Insert.prototype.values = function(values) {
		return this;
	};
	
	Insert.prototype.compile = function() {
		// TODO: Return SQL string ready for parameter binding and execution.
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