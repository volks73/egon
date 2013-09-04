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
 * The Original Code is Spengler.
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
var EXPORTED_SYMBOLS = [ "Spengler" ];

Components.utils.import("resource://Egon/Ramis.js");

/**
 * @namespace
 */
var Spengler = {};

(function () {
    var dbConn, metadata = {};

    // TODO: Add functions for formatting and returning values appropriate for
    // interaction with the database.
    // SQLite3 supported types: NULL, INTEGER, REAL, TEXT, and BLOB. Boolean
    // values are handled as integers 0 = false, 1 = true
    // Date and Time are handled as either TEXT using the ISO8601 string:
    // YYYY-MM-DD HH:MM:SS.SSS, REAL as Julian day numbers,
    // and INTEGERs as Unix Time, the number of seconds since 1970-01-01
    // 00:00:00 UTC. See column affinity documentation with SQLite3.
    /**
     * A mapping of known JavaScript variable types to SQLite column types.
     * 
     * @typedef {Object} TypeConstant
     * @readonly
     * @constant
     */
    Spengler.TYPES = {
        NULL : {
            display : 'null',
            dbType : 'NULL',
            jsType : null
        },
        TEXT : {
            display : 'text',
            dbType : 'TEXT',
            jsType : ''
        },
        INTEGER : {
            display : 'integer',
            dbType : 'INTEGER',
            jsType : 0
        },
        BOOLEAN : {
            display : 'boolean',
            dbType : 'INTEGER',
            jsType : false
        },
        DECIMAL : {
            display : 'decimal',
            dbType : 'REAL',
            jsType : 0.0
        },
        DATE : {
            display : 'date',
            dbType : 'INTEGER',
            jsType : new Date()
        },
    };

    /**
     * The column options. These are the possible properties for the 'option'
     * object of the Column constructor.
     * 
     * @typedef {String} OptionsConstant
     * @readonly
     * @constant
     */
    Spengler.OPTIONS = {
        PRIMARY_KEY : 'primaryKey',
        AUTO_INCREMENT : 'autoIncrement',
        NOT_NULL : 'notNull',
        UNIQUE : 'unique',
        DEFAULT_VALUE : 'defaultValue',
        COLLATE : 'collate',
        FOREIGN_KEY : 'foreignKey',
    };

    /**
     * The possible values for the 'conflict' option.
     * 
     * @typedef {String} ConflictConstant
     * @readonly
     * @constant
     */
    Spengler.CONFLICT = {
        ROLLBACK : 'ROLLBACK',
        ABORT : 'ABORT',
        FAIL : 'FAIL',
        IGNORE : 'IGNORE',
        REPLACE : 'REPLACE',
    };

    /**
     * The possible values for the 'ON DELETE' and 'ON UPDATE' clauses of a
     * Foreign Key SQL definition.
     * 
     * @typedef {String} ActionsConstant
     * @readonly
     * @constant
     */
    Spengler.ACTIONS = {
        SET_NULL : 'SET NULL',
        SET_DEFAULT : 'SET DEFAULT',
        CASCADE : 'CASCADE',
        RESTRICT : 'RESTRICT',
        NO_ACTION : 'NO ACTION',
    };

    /**
     * The possible values for the 'DEFERRABLE' clause of a Foreign Key SQL
     * definition.
     * 
     * @typedef {String} DefersConstant
     * @readonly
     * @constant
     */
    Spengler.DEFERS = {
        DEFERRED : 'INITIALLY DEFERRED',
        IMMEDIATE : 'INITIALLY IMMEDIATE',
    };

    /**
     * Initializes the object relational mapper.
     * 
     * @param {mozIStorageConnection}
     *            aDBConn - A connection to a database.
     */
    Spengler.init = function (aDBConn) {
        dbConn = aDBConn;
    };

    /**
     * Creates the metadata and/or schema for the database.
     */
    Spengler.createAll = function () {
        var table, stmt;

        for (table in metadata) {
            stmt = dbConn.createAsyncStatement(metadata[table].toString());
            stmt.executeAsync();
        }
    };

    /**
     * Executes a SQL statement. Calls the 'compile' function of the statement,
     * binds the parameters, and asynchronously executes.
     * 
     * @param {Statement}
     *            statement - A SQL statement.
     * @param {mozIStorageStatementCallback}
     *            [callback] - A callback.
     */
    Spengler.execute = function (statement, callback) {
        var compiled = statement.compile(), stmtParams, bindings, stmt, key;

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
     * Creates a compiled statement.
     * 
     * @constructor
     * 
     * @param {String}
     *            sql - The SQL string ready for parameter binding and
     *            execution.
     * @param {Object}
     *            params - A literal with the properties as the keys for the
     *            named bind parameters and the property values as the binding
     *            values.
     */
    function Compiled (sql, params) {
        this.sql = sql;
        this.params = params;
    }

    /**
     * The SQL string ready for parameter binding and execution.
     * 
     * @return {String} The SQL string.
     */
    Compiled.prototype.toString = function () {
        return this.sql;
    };

    function Statement (clause) {
        this.clause = clause;
    }

    Statement.prototype.compile = function () {
        var sql = '', tree = this.clause.tree(), params = {}, paramCount = 0, node, i;

        for (i = 0; i < tree.length; i += 1) {
            node = tree[i];

            if (node instanceof Param) {
                if (!node.key) {
                    node.key = generateParamKey(paramCount);
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
     * Generates a named parameter key based on the current number of
     * parameters.
     * 
     * A named parameter is created using the following pattern: 'paramA',
     * 'paramB', 'paramC', ... 'paramAA', 'paramBB', ... 'paramAAA' and so on.
     * 
     * @param {Integer}
     *            paramCount - The current number of parameters.
     */
    function generateParamKey (paramCount) {
        var DEFAULT_PARAM = "param", charCode = 65 + (paramCount % 26), repeat = paramCount / 26, suffix, i;

        suffix = String.fromCharCode(charCode);

        for (i = 1; i < repeat; i += 1) {
            suffix = String.fromCharCode(charCode);
        }

        return DEFAULT_PARAM + suffix;
    }

    /**
     * Creates a SQL database table.
     * 
     * @constructor
     * 
     * @param {String}
     *            name - The name of this table.
     * @param {Object}
     *            [schema] - An object literal the values of the properties
     *            should be Column objects and the keys will be added as
     *            properties to this table.
     */
    function Table (name, schema) {
        var that = this, keys, i;

        this._name = name;

        if (typeof schema !== 'undefined') {
            keys = Object.keys(schema);

            for (i = 0; i < keys.length; i += 1) {
                (function () {
                    Object.defineProperty(that, keys[i], {
                        value : schema[key],
                        writable : true,
                        enumerable : true,
                        configurable : true,
                    });
                }());
            }
        }

        metadata[this._name] = this;
    }

    /**
     * Gets the name of this table.
     * 
     * @returns {String} The table name.
     */
    Table.prototype.name = function () {
        return this._name;
    };

    /**
     * Gets an array of the columns for this table.
     * 
     * @returns {Array} - An array of table columns.
     */
    Table.prototype.columns = function () {
        var columns = [], that = this, key;

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
    Table.prototype.foreignKeys = function () {
        var foreignKeys = [], that = this, key;

        for (key in that) {
            if (that[key] instanceof ForeignKey) {
                foriegnKeys.push(that[key]);
            }
        }

        return foreignKeys;
    };

    /**
     * Creates a SQL string to create this table in a database. The 'IF NOT
     * EXISTS' clause is used to prevent corrupting the database or overwriting
     * data.
     * 
     * @returns {String} A SQL string.
     */
    Table.prototype.toString = function () {
        var sql = "CREATE TABLE IF NOT EXISTS " + this._name + " (\n", columns = this
        .columns(), foreignKeys = this.foreignKeys(), i;

        for (i = 0; i < columns.length; i += 1) {
            sql += columns[i] + ", \n";
        }

        for (i = 0; i < foreignKeys.length; i += 1) {
            sql += "CONSTRAINT " + foreignKeys[i].name + " FOREIGN KEY ("
            + foreignKeys[i].column.name + ") " + foreignKeys[i]
            + ", \n";
        }

        // Remove trailing newline character, comma, and space.
        sql = sql.slice(0, -3) + ")";

        return sql;
    };

    /**
     * Creates a SQL {Insert} statement to insert values into this table.
     * 
     * @param {Object}
     *            values - An object literal with the keys as the property name
     *            for this table pointing to the columns.
     * @returns {Statement} An 'INSERT' statement.
     */
    Table.prototype.insert = function (values) {
        var columnNames = [], insertValues = [], that = this, columnKey;

        for (columnKey in values) {
            columnNames.push(that[columnKey].name);
            insertValues.push(values[columnKey]);
        }

        return new Statement(Spengler.insert(this._name).columns(columnNames)
                .values(insertValues));
    };

    /**
     * Creates a SQL {Update} statement to update values in this table.
     * 
     * @param {Object}
     *            values - An object literal with the keys as the property name
     *            for this table pointing to the columns.
     * @returns {Update} A SQL 'UPDATE' statement.
     */
    Table.prototype.update = function (values) {
        var that = this, columns = [], column, columnKey;

        for (columnKey in values) {
            column = Object.create({});
            column[that[columnKey].name] = values[columnKey];
            columns.push(column);
        }

        return Spengler.update(this._name).set(columns);
    };

    /**
     * Creates a SQL {DELETE} statement to delete values from this table.
     * 
     * @returns {Delete} A SQL 'DELETE' statement.
     */
    Table.prototype.remove = function () {

    };

    /**
     * Creates a SQL {SELECT} statement to select values from this table.
     * 
     * @param {Array}
     *            columns - Either an array of {String} or an array of {Object}.
     *            If {Array} of {String}, then elements are the column names. If
     *            {Array} of {Object}, then elements are objects with one
     *            property where the key is an alias and the value is the column
     *            name.
     * @returns {Select} A SQL 'SELECT' statement.
     */
    Table.prototype.select = function (columns) {

    };

    // TODO: Add support for creating indices for a table on a column.

    /**
     * Creates a SQL database column.
     * 
     * The <code>options</code> parameter for this constructor can have any or
     * all of the following properties: primaryKey, autoIncrement, notNull,
     * unique, defaultValue, collate, foreignKey. A default value is set if the
     * property is <code>undefined</code> in the option object.
     * 
     * The <code>primaryKey</code> option is a boolean value indicating if the
     * column is the primary key for the table. The <code>autoIncrement</code>
     * option is a boolean value indicating if the ID should be auto
     * incremented. The <code>notNull</code> option is a boolean value
     * indicating if the NULL value is not acceptable. The <code>unique</code>
     * option is a boolean value indicating if the rows must have a unqiue value
     * for this column. The <code>defaultValue</code> option is the default
     * value used on 'insert' commands. The <code>collate</code> option is a
     * string from the <code>Column.collate</code> constants. The
     * <code>foreignKey</code> option is a <code>ForeignKey</code> object.
     * 
     * @constructor
     * 
     * @param {String}
     *            name - The column name.
     * @param {TypeConstant}
     *            type - The column type.
     * @param {OptionsConstant}
     *            [options] - An object literal with keys from the
     *            {ColumnOptions} constants.
     */
    function Column (name, type, options) {
        this.name = name;
        this.type = type;

        // TODO: Add support for conflict-clause

        if (options) {
            this.primaryKey = options[Spengler.OPTIONS.PRIMARY_KEY] || false;
            this.autoIncrement = options[Spengler.OPTIONS.AUTO_INCREMENT] || false;

            // TODO: Add support for conflict-clause
            this.notNull = options[Spengler.OPTIONS.NOT_NULL] || false;

            // TODO: Add support for conflict-clause
            this.unique = options[Spengler.OPTIONS.UNIQUE] || false;

            // TODO: Add expression support
            this.defaultValue = options[Spengler.OPTIONS.DEFAULT_VALUE] || 'NULL';
            this.collate = options[Spengler.OPTIONS.COLLATE] || null;

            this.foreignKey = options[Spengler.OPTIONS.FOREIGN_KEY] || null;
        } else {
            this.primaryKey = false;
            this.autoIncrement = false;
            this.notNull = false;
            this.unique = false;
            this.defaultValue = 'NULL';
            this.collate = null;
            this.foreignKey = null;
        }
    }

    /**
     * Returns a SQL expression with this column's name as the left operand for
     * the equals operator and a literal value for the right operand.
     * 
     * @param {String|Number}
     *            rightOperand - The right operand value.
     * @returns {Expr} A SQL expression that can be used for a 'WHERE' clause or
     *          chained together with other expressions.
     */
    Column.prototype.equals = function (rightOperand) {
        return Spengler.expr().column(this.name).equals(rightOperand);
    };

    /**
     * Returns a SQL expression with this column's name as the left operand for
     * the not equals operator and a literal value for the right operand.
     * 
     * @param {String|Number}
     *            rightOperand - The right operand value.
     * @returns {Expr} A SQL expression that can be used for a 'WHERE' clause or
     *          chained together with other expressions.
     */
    Column.prototype.notEquals = function (rightOperand) {
        return Spengler.expr().column(this.name).notEquals(value);
    };

    /**
     * Returns a SQL expression with this column's name as the left operand for
     * the less than operator and a literal value for the right operand.
     * 
     * @param {String|Number}
     *            rightOperand - The right operand value.
     * @returns {Expr} A SQL expression that can be used for a 'WHERE' clause or
     *          chained together with other expressions.
     */
    Column.prototype.lessThan = function (rightOperand) {
        return Spengler.expr().column(this.name).lessThan(rightOperand);
    };

    /**
     * Returns a SQL expression with this column's name as the left operand for
     * the greater than operator and a literal value for the right operand.
     * 
     * @param {String|Number}
     *            rightOperand - The right operand value.
     * @returns {Expr} A SQL expression that can be used for a 'WHERE' clause or
     *          chained together with other expressions.
     */
    Column.prototype.greaterThan = function (rightOperand) {
        return Spengler.expr().column(this.name).greaterThan(rightOperand);
    };

    /**
     * Returns a SQL expression with this column's name as the left operand for
     * the less than equals operator and a literal value for the right operand.
     * 
     * @param {String|Number}
     *            rightOperand - The right operand value.
     * @returns {Expr} A SQL expression that can be used for a 'WHERE' clause or
     *          chained together with other expressions.
     */
    Column.prototype.lessThanEquals = function (rightOperand) {
        return Spengler.expr().column(this.name).lessThanEquals(rightOperand);
    };

    /**
     * Returns a SQL expression with this column's name as the left operand for
     * the greater than equals operator and a literal value for the right
     * operand.
     * 
     * @param {String|Number}
     *            rightOperand - The right operand value.
     * @returns {Expr} A SQL expression that can be used for a 'WHERE' clause or
     *          chained together with other expressions.
     */
    Column.prototype.greaterThanEquals = function (rightOperand) {
        return Spengler.expr().column(this.name)
        .greaterThanEquals(rightOperand);
    };

    /**
     * Creates an SQL string to create the column for a table.
     * 
     * @returns {String} A SQL string.
     */
    Column.prototype.toString = function () {
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
     * Creates a SQL foreign key.
     * 
     * @constructor
     * 
     * @param {String}
     *            name - The name of the constraint.
     * @param {Table}
     *            parent - The parent or foreign table.
     * @param {Array}
     *            parentColumns - The columns in the parent, or foreign, table.
     * @param {String}
     *            [onDelete] - A {ForeignKeyAction} constants.
     * @param {String}
     *            [onUpdate] - A {ForeignKeyAction} constants.
     */
    function ForeignKey (name, parent, parentColumns, onDelete, onUpdate) {
        this.name = name;
        this.parent = parent;
        this.columns = parentColumns;
        this.onDelete = onDelete || false;
        this.onUpdate = onUpdate || false;

        // TODO: Add support for 'MATCH' clause
        // TODO: Add support for 'DEFERRABLE' clause
    }

    ForeignKey.prototype.toString = function () {
        var sql = " REFERENCES " + this.parent._name + " (", i;

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
     * Factory method for creating a table. If table by the supplied name
     * already exists in the metadata, or schema, then the existing table is
     * return; otherwise, a new table is created.
     * 
     * @param {String}
     *            name - The table name.
     * @param {Object}
     *            [schema] - An object literal the values of the properties
     *            should be Column objects and the keys will be added as
     *            properties to this table.
     * @see {Table}
     */
    Spengler.table = function (name, schema) {
        if (metadata[name] !== undefined) {
            return metadata[name];
        } else {
            return new Table(name, schema);
        }
    };

    /**
     * Factory method for creating a column.
     * 
     * @param {String}
     *            name - The column name.
     * @param {TypeConstant}
     *            type - The column type.
     * @param {OptionsConstant}
     *            [options] - An object literal with keys from the
     *            {ColumnOptions} constants.
     * @see {Column}
     */
    Spengler.column = function (name, type, options) {
        return new Column(name, type, options);
    };

    /**
     * Factory method for creating a foreign key.
     * 
     * @param {String}
     *            name - The name of the constraint.
     * @param {Table}
     *            parent - The parent or foreign table.
     * @param {Array}
     *            parentColumns - The columns in the parent, or foreign, table.
     * @param {String}
     *            [onDelete] - A {ForeignKeyAction} constants.
     * @param {String}
     *            [onUpdate] - A {ForeignKeyAction} constants.
     * @see {ForeignKey}
     */
    Spengler.foreignKey = function (name, parent, parentColumns, onDelete, onUpdate) {
        return new ForeignKey(name, parent, parentColumns, onDelete, onUpdate);
    };
}());