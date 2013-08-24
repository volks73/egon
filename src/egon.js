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

var egon = {};

(function() {
	var dbConn, metadata = {};

	// TODO: Add functions for formatting and returning values appropriate for interaction with the database.
	// SQLite3 supported types: NULL, INTEGER, REAL, TEXT, and BLOB. Boolean values are handled as integers 0 = false, 1 = true
	// Date and Time are handled as either TEXT using the ISO8601 string: YYYY-MM-DD HH:MM:SS.SSS, REAL as Julian day numbers,
	// and INTEGERs as Unix Time, the number of seconds since 1970-01-01 00:00:00 UTC. See column affinity documentation with SQLite3.
	egon.types = {
		NULL: {display: 'null', dbType: 'NULL', jsType: null},
		TEXT: {display: 'text', dbType: 'TEXT', jsType: ''},
		INTEGER: {display: 'integer', dbType: 'INTEGER', jsType: 0},
		BOOLEAN: {display: 'boolean', dbType: 'INTEGER', jsType: false},
		DECIMAL: {display: 'decimal', dbType: 'REAL', jsType: 0.0},
		DATE: {display: 'date', dbType: 'TEXT', jsType: new Date()},
	};
	
	/**
	 * Converts the metadata, database tables, into a string.
	 */
	// TODO: Change to a more universal function where keywords are passed to the function and string is assembled based on keywords.
	// For example, passing 'metadata' as a keyword, would create a string based on the metadata.
	egon.toString = function() {
		var key, str = "";
		
		for (key in metadata) {
			if (metadata.hasOwnProperty(key)) {
				str += metadata[key] + "\n";
			}
		}
		
		return str;
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
		var key, stmt;
		
		for (key in metadata) {
			if (metadata.hasOwnProperty(key)) {
				// TODO: Change dbConn to universal interface. Right now it uses the Mozilla-specific Storage interface to 
				// interact with a SQLite database. This should be abstracted to be used for any database in any environment.
				stmt = dbConn.createAsyncStatement(metadata[key].toSQL());
				stmt.executeAsync();
			}
		}
	};
	
	/**
	 * Constructor for a SQL database table.
	 * 
	 * @param name The name of this table.
	 * @param schema The columns and constraints for this table.
	 */
	function Table(name, schema) {
		var that = this,
			keys,
			i;

		this._name = name;
		
		if (typeof columns !== 'undefined') {
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
	
	Table.prototype.toString = function() {
		var str = "table: " + this._name + "\n", 
			that = this,
			key;
		
		for (key in that) {
			if (that[key] instanceof Column) {
				str += "\t" + that[key] + "\n";
			}
		}
		
		return str;
	};
	
	/**
	 * Creates a SQL string to create this table in a database. The 'IF NOT EXISTS' clause is
	 * used to prevent corrupting the database or overwriting data.
	 * 
	 * @returns {String}
	 */
	Table.prototype.toSQL = function() {
		// CREATE TABLE IF NOT EXISTS tableName (column-name type-name column-constraint, table-constraint)
		var sql = "CREATE TABLE IF NOT EXISTS " + this._name + " (\n",
			that = this,
			key;
		
		for (key in that) {
			if (that[key] instanceof Column) {
				sql += that[key].toSQL() + ", \n";
			}
		}
		
		// Remove trailing comma and space.
		sql = sql.slice(0, -3);
		
		sql += ")";
		
		return sql;
	};

	egon.Table = Table;
	
	/**
	 * Constructor for a SQL database column.
	 * 
	 * Options: primaryKey, autoIncrement, notNull, unique, defaultValue, and collate.
	 * 
	 * @param name The column name.
	 * @param type The column type.
	 * @param options (Optional) An object with keys for column options.
	 */
	function Column(name, type, options) {
		this.name = name;
		this._type = type;
		
		// TODO: Add support for conflict-clause
		this._primaryKey = options.primaryKey || false;
		this._autoIncrement = options.autoIncrement || false;
		
		// TODO: Add conflict-clause
		this._notNull = options.notNull || false;
		
		// TODO: Add support for conflict-clause
		this._unique = options.unique || false;
		
		// TODO: Add expression support
		this._default = options.defaultValue || 'NULL';
		this._collate = options.collate || null;

		// TODO: Add foreign key support.
		this._foreignKey = options.foreignKey || null;
	};
	
	Column.prototype.collate = {
		BINARY: 'BINARY',
		NOCASE: 'NOCASE',
		RTRIM: 'RTRIM',	
	};
	
	Column.prototype.conflict = {
		ROLLBACK: 'ROLLBACK',
		ABORT: 'ABORT',
		FAIL: 'FAIL',
		IGNORE: 'IGNORE',
		REPLACE: 'REPLACE',
	};
	
	Column.prototype.toString = function() {
		return "column: " + this.name + " " + this._type.display; 
	};
	
	/**
	 * Creates an SQL string to create the column for a table.
	 * 
	 * @returns {String}
	 */
	Column.prototype.toSQL = function() {
		// TODO: Add column-constraint support.
		var sql = this.name + " " + this._type.dbType;
		
		if (this._primaryKey) {
			sql += " PRIMARY KEY";
		}
		
		if (this._autoIncrement) {
			sql += " AUTOINCREMENT";
		}
		
		if (this._notNull) {
			sql += " NOT NULL";
		}
		
		if (this._unique) {
			sql += " UNIQUE";
		}
		
		if (this._default) {
			sql += " DEFAULT " + this._default;
		}
		
		if (this._collate) {
			sql += " COLLATE " + this._collate;
		}
		
		if (this._foreignKey) {
			sql += " " + this._foreignKey.toSQL();
		}
		
		return sql;
	};

	egon.Column = Column;
	
	function ForeignKey(name, parent, parentColumns, onDelete, onUpdate) {
		this._name = name;
		this._parent = parent;
		this._columns = parentColumns;
		this._onDelete = onDelete || false;
		this._onUpdate = onUpdate || false;
		
		// TODO: Add support for 'MATCH' clause
		// TODO: Add support for 'DEFERRABLE' clause
	};
	
	ForeignKey.prototype.actions = {
		SET_NULL: 'SET NULL',
		SET_DEFAULT: 'SET DEFAULT',
		CASCADE: 'CASCADE',
		RESTRICT: 'RESTRICT',
		NO_ACTION: 'NO ACTION',
	};
		
	ForeignKey.prototype.defers = {
		DEFERRED: 'INITIALLY DEFERRED',
		IMMEDIATE: 'INITIALLY IMMEDIATE',
	};
	
	ForeignKey.prototype.toString = function() {
		var str = this._name + " parent: " + this._parent + "\n columns: \n",
			i;
		
		for (i = 0; i < this._columns.length; i += 1) {
			str += this._columns[i] + "\n";
		}
		
		return str;
	};
	
	ForeignKey.prototype.toSQL = function() {
		var sql = "CONSTRAINT " + this._name + " REFERENCES " + this._parent._name + " (",
			i;
		
		for (i = 0; i < this._columns.length; i += 1) {
			sql += this._columns[i].name + ",";
		}
		
		// Remove trailing comma.
		sql = sql.slice(0, -1) + ")";
		
		if (this._onDelete) {
			sql += "ON DELETE " + this._onDelete;
		}
		
		if (this._onUpdate) {
			sql += "ON UPDATE " + this._onUpdate;
		}
		
		return sql;
	};
	
	egon.ForeignKey = ForeignKey;
	
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