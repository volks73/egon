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
"use strict";

var EXPORTED_SYMBOLS = [ "Spengler" ];

Components.utils.import("resource://Egon/Ramis.js");

var dbConn, metadata = {};

//TODO: Add functions for formatting and returning values appropriate for
//interaction with the database.
//SQLite3 supported types: NULL, INTEGER, REAL, TEXT, and BLOB. Boolean
//values are handled as integers 0 = false, 1 = true
//Date and Time are handled as either TEXT using the ISO8601 string:
//YYYY-MM-DD HH:MM:SS.SSS, REAL as Julian day numbers,
//and INTEGERs as Unix Time, the number of seconds since 1970-01-01
//00:00:00 UTC. See column affinity documentation with SQLite3.

/**
 * A mapping of known JavaScript variable types to SQLite column types.
 * 
 * @typedef {Object} TypeConstant
 * @readonly
 * @constant
 */
const TYPES = {
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
 * The column options. These are the possible properties for the 'option' object
 * of the Column constructor.
 * 
 * @typedef {String} OptionsConstant
 * @readonly
 * @constant
 */
const OPTIONS = {
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
const CONFLICT = {
    ROLLBACK : 'ROLLBACK',
    ABORT : 'ABORT',
    FAIL : 'FAIL',
    IGNORE : 'IGNORE',
    REPLACE : 'REPLACE',
};

/**
 * The possible values for the 'ON DELETE' and 'ON UPDATE' clauses of a Foreign
 * Key SQL definition.
 * 
 * @typedef {String} ActionsConstant
 * @readonly
 * @constant
 */
const ACTIONS = {
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
const DEFERS = {
    DEFERRED : 'INITIALLY DEFERRED',
    IMMEDIATE : 'INITIALLY IMMEDIATE',
};

// TODO: Add JSDocs to prototypes and constructors.

function Statement(clause) {
    this.clause = clause;
}

Statement.prototype = {
    clause : null,
    compile : function () {
        // TODO: Move 'compile' function from Ramis library to here.
        // TODO: Remove 'Statement' prototype from Ramis Library.
    },
};

function InsertStatement(table, values) {   
    var columnNames = [], 
        insertValues = [], 
        columnKey;

    Statement.call(this);
    
    for (columnKey in values) {
        columnNames.push(that[columnKey].name);
        insertValues.push(Ramis.param(columnKey, values[columnKey]));
    }

    this.clause = Ramis.insert(table.name()).columns(columnNames).values(insertValues);
}

InsertStatement.prototype = Object.create(Statement.prototype);

function UpdateStatement(table, values) {
    var columns = [],
        column,
        columnKey;
    
    Statement.call(this);
    
    for (columnKey in values) {
        column = {};
        column[that[columnKey].name] = Ramis.param(columnKey,
                values[columnKey]);
        columns.push(column);
    }
    
    this.clause = Ramis.update(table.name()).set(columns);
}

UpdateStatement.prototype = Object.create(Statement.prototype, {
    where : {
        value : function (expr) {
            this.clause.where(expr);
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },
});

function SelectStatement(table, columns) {
    var columnNames = [], 
        columnName = {},
        column,
        i;

    Statement.call(this);
    
    for (i = 0; i < columns.length; i += 1) {
        column = columns[i];

        if (column.alias) {
            columnName = {};
            columnName[column.alias] = column.name;
            columnNames.push(columnName);
        } else {
            columnNames.push(column.name);
        }
    }  
    
    this.clause = Ramis.select(columns).from(table.name());
}

SelectStatement.prototype = Object.create(Statement.prototype, {
    join : {
        value : function (table) {
            // TODO: Find foreign keys and automatically add appropriate join clauses to this clause.
            this.clause.join(table.name());
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },
    
    where : {
        value : function (expr) {
            this.clause.where(expr);
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },
});

/**
 * Creates a SQL database table.
 * 
 * @constructor
 * 
 * @param {String}
 *            name - The name of this table.
 * @param {Object}
 *            [schema] - An object literal the values of the properties should
 *            be Column objects and the keys will be added as properties to this
 *            table.
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

Table.prototype = {
    _name : null,
    
    /**
     * Gets the name.
     * 
     * @returns {String}
     */
    name : function () {
        return _name;
    },

    /**
     * Gets an array of the columns for this table.
     * 
     * @returns {Array} - An array of table columns.
     */
    columns : function () {
        var columns = [], that = this, key;

        for (key in that) {
            if (that[key] instanceof Column) {
                columns.push(that[key]);
            }
        }

        return columns;
    },

    /**
     * Gets an array of foreign keys for this table.
     * 
     * @returns {Array} - An array of foreign keys.
     */
    foreignKeys : function () {
        var foreignKeys = [], that = this, key;

        for (key in that) {
            if (that[key] instanceof ForeignKey) {
                foriegnKeys.push(that[key]);
            }
        }

        return foreignKeys;
    },

    /**
     * Creates a SQL string to create this table in a database. The 'IF NOT
     * EXISTS' clause is used to prevent corrupting the database or overwriting
     * data.
     * 
     * @returns {String} A SQL string.
     */
    toString : function () {
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
    },

    /**
     * Creates a SQL {Insert} statement to insert values into this table.
     * 
     * @param {Object}
     *            values - The keys for each property is the property name of
     *            the column in the table.
     * @returns {Statement} An 'INSERT' statement.
     */
    insert : function (values) {
        return new InsertStatement(this, values);
    },

    /**
     * Creates a SQL {Update} statement to update values in this table.
     * 
     * @param {Object}
     *            values - The keys for each property is the property name of
     *            the column in the table.
     * @returns {Update} An 'UPDATE' statement.
     */
    update : function (values) {
        return new UpdateStatement(this, values);
    },

    /**
     * Creates a SQL {SELECT} statement to select values from this table.
     * 
     * @param {Array}
     *            columns - Elements are {Column}. If the 'alias' property is
     *            not null, then an 'AS alias' clause will be added for the
     *            column name.
     * @returns {Select} A 'SELECT' statement.
     */
    select : function (columns) {
        return new SelectStatement(this, columns);
    },
};

//TODO: Add support for creating indices for a table on a column.

/**
 * Creates a SQL database column.
 * 
 * The <code>options</code> parameter for this constructor can have any or all
 * of the following properties: primaryKey, autoIncrement, notNull, unique,
 * defaultValue, collate, foreignKey. A default value is set if the property is
 * <code>undefined</code> in the option object.
 * 
 * The <code>primaryKey</code> option is a boolean value indicating if the
 * column is the primary key for the table. The <code>autoIncrement</code>
 * option is a boolean value indicating if the ID should be auto incremented.
 * The <code>notNull</code> option is a boolean value indicating if the NULL
 * value is not acceptable. The <code>unique</code> option is a boolean value
 * indicating if the rows must have a unqiue value for this column. The
 * <code>defaultValue</code> option is the default value used on 'insert'
 * commands. The <code>collate</code> option is a string from the
 * <code>Column.collate</code> constants. The <code>foreignKey</code> option
 * is a <code>ForeignKey</code> object.
 * 
 * @constructor
 * 
 * @param {String}
 *            name - The column name.
 * @param {TypeConstant}
 *            type - The column type.
 * @param {OptionsConstant}
 *            [options] - An object literal with keys from the {ColumnOptions}
 *            constants.
 */
function Column (name, type, options) {
    this.name = name;
    this.type = type;

    // TODO: Add support for conflict-clause

    if (options) {
        this.primaryKey = options[OPTIONS.PRIMARY_KEY] || false;
        this.autoIncrement = options[OPTIONS.AUTO_INCREMENT] || false;

        // TODO: Add support for conflict-clause
        this.notNull = options[OPTIONS.NOT_NULL] || false;

        // TODO: Add support for conflict-clause
        this.unique = options[OPTIONS.UNIQUE] || false;

        // TODO: Add expression support
        this.defaultValue = options[OPTIONS.DEFAULT_VALUE] || 'NULL';
        this.collate = options[OPTIONS.COLLATE] || null;

        this.foreignKey = options[OPTIONS.FOREIGN_KEY] || null;
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

Column.prototype = {
    name : null,
    type : null,
    primaryKey : false,
    autoIncrement : false,
    notNull : false,
    unique : false,
    defaultValue : 'NULL',
    collate : null,
    foreignKey : null,
    alias : null,

    /**
     * Returns a SQL expression with this column's name as the left operand for
     * the equals operator and a literal value for the right operand.
     * 
     * @param {String|Number}
     *            rightOperand - The right operand value.
     * @returns {Expr} A SQL expression that can be used for a 'WHERE' clause or
     *          chained together with other expressions.
     */
    equals : function (rightOperand) {
        return Ramis.expr().column(this.name).equals(rightOperand);
    },

    /**
     * Returns a SQL expression with this column's name as the left operand for
     * the not equals operator and a literal value for the right operand.
     * 
     * @param {String|Number}
     *            rightOperand - The right operand value.
     * @returns {Expr} A SQL expression that can be used for a 'WHERE' clause or
     *          chained together with other expressions.
     */
    notEquals : function (rightOperand) {
        return Ramis.expr().column(this.name).notEquals(value);
    },

    /**
     * Returns a SQL expression with this column's name as the left operand for
     * the less than operator and a literal value for the right operand.
     * 
     * @param {String|Number}
     *            rightOperand - The right operand value.
     * @returns {Expr} A SQL expression that can be used for a 'WHERE' clause or
     *          chained together with other expressions.
     */
    lessThan : function (rightOperand) {
        return Ramis.expr().column(this.name).lessThan(rightOperand);
    },

    /**
     * Returns a SQL expression with this column's name as the left operand for
     * the greater than operator and a literal value for the right operand.
     * 
     * @param {String|Number}
     *            rightOperand - The right operand value.
     * @returns {Expr} A SQL expression that can be used for a 'WHERE' clause or
     *          chained together with other expressions.
     */
    greaterThan : function (rightOperand) {
        return Ramis.expr().column(this.name).greaterThan(rightOperand);
    },

    /**
     * Returns a SQL expression with this column's name as the left operand for
     * the less than equals operator and a literal value for the right operand.
     * 
     * @param {String|Number}
     *            rightOperand - The right operand value.
     * @returns {Expr} A SQL expression that can be used for a 'WHERE' clause or
     *          chained together with other expressions.
     */
    lessThanEquals : function (rightOperand) {
        return Ramis.expr().column(this.name).lessThanEquals(rightOperand);
    },

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
    greaterThanEquals : function (rightOperand) {
        return Ramis.expr().column(this.name).greaterThanEquals(rightOperand);
    },

    /**
     * Creates an SQL string to create the column for a table.
     * 
     * @returns {String} A SQL string.
     */
    toString : function () {
        // TODO: Add column-constraint support.
        var sql = this.name + " " + this.type.dbType;

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
    },
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

ForeignKey.prototype = {
    name : null,
    parent : null,
    columns : null,
    onDelete : false,
    onUpdate : false,
    toString : function () {
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
    },
};

/**
 * @namespace
 */
var Spengler = {
    TYPES : TYPES,
    
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
    table : function (name, schema) {
        if (metadata[name] !== undefined) {
            return metadata[name];
        } else {
            return new Table(name, schema);
        }
    },

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
    column : function (name, type, options) {
        return new Column(name, type, options);
    },

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
    foreignKey : function (name, parent, parentColumns, onDelete, onUpdate) {
        return new ForeignKey(name, parent, parentColumns, onDelete, onUpdate);
    },

    /**
     * Initializes the object relational mapper.
     * 
     * @param {mozIStorageConnection}
     *            aDBConn - A connection to a database.
     */
    init : function (aDBConn) {
        dbConn = aDBConn;
    },

    /**
     * Creates the metadata and/or schema for the database.
     */
    createAll : function () {
        var table, stmt;

        for (table in metadata) {
            stmt = dbConn.createAsyncStatement(metadata[table].toString());
            stmt.executeAsync();
        }
    },

    /**
     * Executes a SQL statement. Calls the 'compile' function of the statement,
     * binds the parameters, and asynchronously executes.
     * 
     * @param {Statement}
     *            clause
     * @param {mozIStorageStatementCallback}
     *            [callback] - A callback.
     */
    execute : function (statement, callback) {
        var compiledStatement = statement.compile(), stmtParams, bindings, stmt, key;

        dump("statement: " + compiledStatement);

        stmt = dbConn.createAsyncStatement(compiledStatement.toString());
        stmtParams = stmt.newBindingParamsArray();
        bindings = stmtParams.newBindingParams();

        for (key in compiledStatement.params) {
            bindings.bindByName(key, compiledStatement.params[key]);
        }

        stmtParams.addParams(bindings);
        stmt.bindParameters(stmtParams);

        stmt.executeAsync(callback);
    },
};