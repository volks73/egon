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
 * The Original Code is Ramis.
 *
 * The Initial Developer of the Original Code is Christopher R. Field.
 * Portions created by the Initial Developer are Copyright (C) 2013
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *      Christopher R. Field <cfield2 at gmail dot com>
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

var EXPORTED_SYMBOLS = ["Ramis"];

/**
 * The possible values for the 'collate' option.
 * 
 * @typedef {String} CollateConstant
 * @readonly
 * @constant
 */
const COLLATE = {
    BINARY: 'BINARY',
    NOCASE: 'NOCASE',
    RTRIM: 'RTRIM'
};

/**
 * The possible operators for an expression used in a 'WHERE' clause.
 * 
 * @typedef {String} OperatorsConstant.
 * @readonly
 * @constant
 */
const OPERATORS = {
    CONCAT: '||',
    MULTIPLY: '*',
    DIVIDE: '/',
    MODULO: '%',
    ADD: '+',
    SUBTRACT: '-',
    LESS_THAN: '<',
    LESS_THAN_EQUALS: '<=',
    GREATER_THAN: '>',
    GREATER_THAN_EQUALS: '>=',
    EQUALS: '=',
    NOT_EQUALS: '!=',
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
    COLLATE: '~'
};

/**
 * The possible literal values for an expression.
 * 
 * @typedef {String} LiteralConstants.
 * @readonly
 * @constant
 */
const LITERAL_VALUES = {
    NULL: 'NULL',
    CURRENT_TIME: 'CURRENT_TIME',
    CURRENT_DATE: 'CURRENT_DATE',
    CURRENT_TIMESTAMP: 'CURRENT_TIMESTAMP',
};

/**
 * The possible raise function values for an expression.
 * 
 * @typedef {String} RaiseFunctionsConstant.
 * @readonly
 * @constant
 */
const RAISE_FUNCTIONS = {
    IGNORE: 'IGNORE',
    ROLLBACK: 'ROLLBACK',
    ABORT: 'ABORT',
    FAIL: 'FAIL'
};

/**
 * Creates a new bind parameter object.
 * 
 * A bind parameter has a key, or placeholder, and a value. The value replaces
 * the placeholder when binding the parameters to a SQL statement. This prevents
 * SQL injection attacks because the value is never executed as SQL.
 * 
 * If a key is not provided, then a numeric, or index, key is used.
 * 
 * @constructor
 * 
 * @param {Object}
 *            value - The literal value.
 * @param {String}
 *            [key] - The key, or placeholder, for the literal value that will
 *            be replaced on binding.
 */
function Param(value, key) {
    this.value = value;
    this.key = key;
}

/**
 * Creates a string representation.
 * 
 * @returns {String}
 */
Param.prototype = {
    value : null,
    key : null,
    toString : function () {
        var str = "{";

        if (this.key !== undefined) {
            str += this.key;
        } else {
            str += "?";
        }

        return str + ": '" + this.value + "'}";
    },
};

// TODO: Move 'CompiledStatement' to 'Spengler'.

/**
 * A bindable and SQL executable statement.
 * 
 * @constructor
 * 
 * @param {String}
 *            sql - The SQL string.
 * @param {Object}
 *            params - Each property of the object is a key/value pair where the
 *            key is the bind parameter name and the value is the value to
 *            substitute.
 */
function CompiledStatement(sql, params) {
    this.sql = sql;
    this.params = params;
}

CompiledStatement.prototype = {
    sql : null,
    params : null,
    toString : function () {
        return this.sql;
    },
};

/**
 * Creates a new clause.
 * 
 * @constructor
 */
function Clause(nodes) {
    this.nodes = nodes || [];
}

Clause.prototype = {
    nodes : [],

    /**
     * Gets all of the nodes of the tree for this clause, including all child
     * clauses.
     * 
     * @returns {Array} All nodes in order.
     */
    tree : function () {
        var tree = [],
        i;

        for (i = 0; i < this.nodes.length; i += 1) {
            if (this.nodes[i] instanceof Clause) {
                tree = tree.concat(this.nodes[i].tree());
            } else {
                tree.push(this.nodes[i]);
            }
        }

        return tree;        
    },

    /**
     * Gets the previous node in the tree.
     * 
     * @returns {Clause|String} The previous node.
     */
    previous : function () {
        return this.nodes[this.nodes.length - 1];
    },

    /**
     * Creates a string representation.
     * 
     * @returns {String}
     */
    toString : function () {
        var tree = this.tree(),
        str = '',
        i;

        for (i = 0; i < tree.length; i += 1) {
            str += tree[i].toString();
        }

        return str;
    },
};

/**
 * Generates a named parameter key based on the current number of parameters.
 * 
 * A named parameter is created using the following pattern: 'paramA', 'paramB',
 * 'paramC', ... 'paramAA', 'paramBB', ... 'paramAAA' and so on.
 * 
 * @param {Integer}
 *            paramCount - The current number of parameters.
 */
function generateParamKey(paramCount) {
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

// TODO: Move 'Statement' to Spengler. Ramis is only clause generation and should be independent of execution. A statement implements compiling and execution.

/**
 * A clause that can be compiled for excution.
 * 
 * @constructor
 */
function Statement() {
    Clause.call(this);
}

Statement.prototype = Object.create(Clause.prototype, {
    /**
     * Converts a clause into a parameter bindable and executable statement.
     * 
     * @param {Clause}
     *            clause
     * @returns {Statement}
     */
    compile : {
        value : function () {
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
                        node.key = generateParamKey(paramCount);
                        paramCount += 1;
                    }

                    sql += ":" + node.key;
                    params[node.key] = node.value;
                } else {
                    sql += node;
                }
            }

            return new CompiledStatement(sql, params);
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },
});

/**
 * Adds a binary operator and its right operand to the tree. The left operand is
 * assumed to already be attached to the tree.
 * 
 * @param {OPERATORS}
 *            operator - The operator.
 * @param {Expr|String|Number}
 *            rightOperant - The right operand
 * @return {Array} A tree.
 */
function binaryOperator(operator, rightOperand) {
    var tree = [];

    tree.push(" " + operator + " ");

    if (rightOperand !== undefined) {
        if (rightOperand instanceof Expr) {
            tree.push(rightOperand);
        } else if (rightOperand instanceof Param) {
            tree.push(rightOperand);
        } else {
            tree.push(new Param(rightOperand));
        }
    }

    return tree;
}

/**
 * Creates a new SQL expression clause.
 * 
 * @constructor
 */
function Expr() {
    Clause.call(this);
}

Expr.prototype = Object.create(Clause.prototype, {
    /**
     * Adds a literal value to the expression tree. This does not directly add
     * the value, but adds {Param} to the tree that is later bound to the value
     * just before execution. This avoids problems with Ramis injection attacks
     * and other bad things.
     * 
     * @param {Object}
     *            value - A literal value.
     * @returns {Expr} This Ramis expression clause.
     */
    literal : {
        value : function (value) {
            if (value === LITERAL_VALUE.NULL) {
                this.nodes.push(LITERAL_VALUE.NULL);
            } else if (value === LITERAL_VALUE.CURRENT_TIME) {
                this.nodes.push(LITERAL_VALUE.CURRENT_TIME);
            } else if (value === LITERAL_VALUE.CURRENT_DATE) {
                this.nodes.push(LITERAL_VALUE.CURRENT_DATE);
            } else if (value === LITERAL_VALUE.CURRENT_TIMESTAMP) {
                this.nodes.push(LITERAL_VALUE.CURRENT_TIMESTAMP);
            } else {
                this.nodes.push(new Param(value));
            }

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds a column name to the expression tree.
     * 
     * @param {String}
     *            columnName - A column name.
     * @returns {Expr} This Ramis expression clause.
     */
    column : {
        value : function (columnName) {
            this.nodes.push(columnName);

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Begins a grouping.
     * 
     * This adds a '(' onto the expression tree.
     * 
     * @returns {Expr} This Ramis expression clause.
     */
    begin : {
        value : function () {
            this.nodes.push("(");

            return this;
        },
        enumerable : true,
        configuration : true,
        writable : true,
    },

    /**
     * Ends a grouping.
     * 
     * This adds a ')' onto the expression tree.
     * 
     * @returns {Expr} This Ramis expression clause.
     */
    end : {
        value : function () {
            this.nodes.push(")");

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds the 'NOT' operator to the expression tree.
     * 
     * @param {Expr|String|Number}
     *            [operand] - The operand to the binary operator.
     * @returns {Expr} This expression clause.
     */
    not : {
        value : function (operand) {
            this.nodes = this.nodes.concat(binaryOperator(OPERATORS.NOT, operand));

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds the '||' concatenate operator to the expression tree.
     * 
     * @param {Expr|String|Number}
     *            rightOperand - The right operand to the binary operator.
     * @returns {Expr} This expression clause.
     */
    concat : {
        value : function (rightOperand) {
            this.nodes = this.nodes.concat(binaryOperator(OPERATORS.CONCAT, rightOperand));

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds the '*' multiply operator to the expression tree.
     * 
     * @param {Expr|String|Number}
     *            rightOperand - The right operand to the binary operator.
     * @returns {Expr} This Ramis expression clause.
     */
    multiply : {
        value : function (rightOperand) {
            this.nodes = this.nodes.concat(binaryOperator(OPERATORS.MULTIPLY, rightOperand));

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds the '*' multiply operator to the expression tree.
     * 
     * @param {Expr|String|Number}
     *            rightOperand - The right operand to the binary operator.
     * @returns {Expr} This Ramis expression clause.
     */
    times : {
        value : function (rightOperand) {
            this.nodes = this.nodes.concat(binaryOperator(OPERATORS.MULTIPLY, rightOperand));

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds the '/' divide operator to the expression tree.
     * 
     * @param {Expr|String|Number}
     *            rightOperand - The right operand to the binary operator.
     * @returns {Expr} This Ramis expression clause.
     */
    divide : {
        value : function (rightOperand) {
            this.nodes = this.nodes.concat(binaryOperator(OPERATORS.DIVIDE, rightOperand));

            return this;    
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds the '/' divide operator to the expression tree.
     * 
     * @param {Expr|String|Number}
     *            rightOperand - The right operand to the binary operator.
     * @returns {Expr} This Ramis expression clause.
     */
    dividedBy : {
        value : function (rightOperand) {
            this.nodes = this.nodes.concat(binaryOperator(OPERATORS.DIVIDE, rightOperand));

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds the '%' modulo operator to the expression tree.
     * 
     * @param {Expr|String|Number}
     *            rightOperand - The right operand to the binary operator.
     * @returns {Expr} This Ramis expression clause.
     */
    modulo : {
        value : function (rightOperand) {
            this.nodes = this.nodes.concat(binaryOperator(OPERATORS.MODULO, rightOperand));

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds the '%' modulo operator to the expression tree.
     * 
     * @param {Expr|String|Number}
     *            rightOperand - The right operand to the binary operator.
     * @returns {Expr} This Ramis expression clause.
     */
    remainder : {
        value : function (rightOperand) {
            this.nodes = this.nodes.concat(binaryOperator(OPERATORS.MODULO, rightOperand));

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds the '+' add operator to the expression tree.
     * 
     * @param {Expr|String|Number}
     *            rightOperand - The right operand to the binary operator.
     * @returns {Expr} This Ramis expression clause.
     */
    add : {
        value : function (rightOperand) {
            this.nodes = this.nodes.concat(binaryOperator(OPERATORS.ADD, rightOperand));

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds the '-' subtract operator to the expression tree.
     * 
     * @param {Expr|String|Number}
     *            rightOperand - The right operand to the binary operator.
     * @returns {Expr} This Ramis expression clause.
     */
    subtract : {
        value : function (rightOperand) {
            this.nodes = this.nodes.concat(binaryOperator(OPERATORS.SUBTRACT, rightOperand));

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds the '<' less than operator to the expression tree.
     * 
     * @param {Expr|String|Number}
     *            [rightOperand] - The right operand to the binary operator.
     * @returns {Expr} This Ramis expression clause.
     */
    lessThan : {
        value : function (rightOperand) {
            this.nodes = this.nodes.concat(binaryOperator(OPERATORS.MULTIPLY, rightOperand));

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds the '<=' less than equals operator to the expression tree.
     * 
     * @param {Expr|String|Number}
     *            [rightOperand] - The right operand to the binary operator.
     * @returns {Expr} This Ramis expression clause.
     */
    lessThanEquals : {
        value : function (rightOperand) {
            this.nodes = this.nodes.concat(binaryOperator(OPERATORS.LESS_THAN_EQUALS, rightOperand));

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds the '>' greater than operator to the expression tree.
     * 
     * @param {Expr|String|Number}
     *            [rightOperand] - The right operand to the binary operator.
     * @returns {Expr} This Ramis expression clause.
     */
    greaterThan : {
        value : function (rightOperand) {
            this.nodes = this.nodes.concat(binaryOperator(OPERATORS.GREATER_THAN, rightOperand));

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds the '>=' greater than equals operator to the expression tree.
     * 
     * @param {Expr|String|Number}
     *            [rightOperand] - The right operand to the binary operator.
     * @returns {Expr} This Ramis expression clause.
     */
    greaterThanEquals : {
        value : function (rightOperand) {
            this.nodes = this.nodes.concat(binaryOperator(OPERATORS.GREATER_THAN_EQUALS, rightOperand));

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds the '=' or '==' equals operator to the expression tree.
     * 
     * @param {Expr|String|Number}
     *            rightOperand - The right operand to the binary operator.
     * @returns {Expr} This Ramis expression clause.
     */
    equals : {
        value : function (rightOperand) {
            this.nodes = this.nodes.concat(binaryOperator(OPERATORS.EQUALS, rightOperand));

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds the '!=' not equals operator to the expression tree.
     * 
     * @param {Expr|String|Number}
     *            [rightOperand] - The right operand to the binary operator.
     * @returns {Expr} This Ramis expression clause.
     */
    notEquals : {
        value : function (rightOperand) {
            this.nodes = this.nodes.concat(binaryOperator(OPERATORS.NOT_EQUALS, rightOperand));

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds the 'AND' operator to the expression tree.
     * 
     * @param {Expr|String|Number}
     *            [rightOperand] - The right operand to the binary operator.
     * @returns {Expr} This Ramis expression clause.
     */
    and : {
        value : function (rightOperand) {
            this.nodes = this.nodes.concat(binaryOperator(OPERATORS.AND, rightOperand));

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds the 'OR' operator to the expression tree.
     * 
     * @param {Expr|String|Number}
     *            [rightOperand] - The right operand to the binary operator.
     * @returns {Expr} This Ramis expression clause.
     */
    or : {
        value : function (rightOperand) {
            this.nodes = this.nodes.concat(binaryOperator(OPERATORS.OR, rightOperand));

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds the 'LIKE' operator to the expression tree.
     * 
     * @param {Expr|String|Number}
     *            [rightOperand] - The right operand to the binary operator.
     * @returns {Expr} This Ramis expression clause.
     */
    like : {
        value : function (rightOperand) {
            this.nodes = this.nodes.concat(binaryOperator(OPERATORS.LIKE, rightOperand));

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds the 'GLOB' operator to the expression tree.
     * 
     * @param {Expr|String|Number}
     *            [rightOperand] - The right operand to the binary operator.
     * @returns {Expr} This Ramis expression clause.
     */
    glob : {
        value : function (rightOperand) {
            this.nodes = this.nodes.concat(binaryOperator(OPERATORS.GLOB, rightOperand));

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds the 'REGEXP' operator to the expression tree.
     * 
     * @param {Expr|String|Number}
     *            [rightOperand] - The right operand to the binary operator.
     * @returns {Expr} This Ramis expression clause.
     */
    regexp : {
        value : function (rightOperand) {
            this.nodes = this.nodes.concat(binaryOperator(OPERATORS.REGEXP, rightOperand));

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds the 'MATCH' operator to the expression tree.
     * 
     * @param {Expr|String|Number}
     *            [rightOperand] - The right operand to the binary operator.
     * @returns {Expr} This Ramis expression clause.
     */
    match : {
        value : function (rightOperand) {
            this.nodes = this.nodes.concat(binaryOperator(OPERATORS.MATCH, rightOperand));

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds the 'IS' operator to the expression tree.
     * 
     * @param {Expr|String|Number}
     *            [rightOperand] - The right operand to the binary operator.
     * @returns {Expr} This Ramis expression clause.
     */
    is : {
        value : function (rightOperand) {
            this.nodes = this.nodes.concat(binaryOperator(OPERATORS.IS, rightOperand));

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds the 'IS NOT' operator to the expression tree.
     * 
     * @param {Expr|String|Number}
     *            [rightOperand] - The right operand to the binary operator.
     * @returns {Expr} This Ramis expression clause.
     */
    isNot : {
        value : function (rightOperand) {
            this.nodes = this.nodes.concat(binaryOperator(OPERATORS.IS_NOT, rightOperand));

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds the 'IN' operator to the expression tree.
     * 
     * @param {Expr|String|Number}
     *            [rightOperand] - The right operand to the binary operator.
     * @returns {Expr} This Ramis expression clause.
     */
    in : {
        value : function (rightOperand) {
            this.nodes = this.nodes.concat(binaryOperator(OPERATORS.IN, rightOperand));

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds the 'CAST' function to the expression tree.
     * 
     * @param {Expr|String|Number}
     *            expr - The object to cast.
     * @param {TypeConstant}
     *            toType - The type to convert or cast the expr to.
     * @returns {Expr} This Ramis expression clause.
     */
    cast : {
        value : function (expr, toType) {
            this.nodes.push(" CAST ");
            this.begin();
            this.nodes.push(expr);
            this.nodes.push(" AS ");
            this.nodes.push(toType.dbType);
            this.end();

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds the 'COLLATE' function to the expression tree.
     * 
     * @param {Expr|String|Number}
     *            expr - The object to collate.
     * @param {CollateConstant}
     *            collation - The collation.
     * @returns {Expr} This Ramis expression clause.
     */
    collate : {
        value : function (expr, collation) {
            this.nodes.push(expr);
            this.nodes.push(collation);

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds the 'ISNULL' operation to the expression tree.
     * 
     * @returns {Expr} This Ramis expression clause.
     */
    isNull : {
        value : function () {
            this.nodes.push(" ISNULL");

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds the 'NOTNULL' operation to the expression tree.
     * 
     * @returns {Expr} This Ramis expression clause.
     */
    notNull : {
        value : function () {
            this.nodes.push(" NOTNULL");

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds the 'ESCAPE' operation to the expression tree.
     * 
     * @param {Expr}
     *            expr - The escape expression.
     * @returns {Expr} This Ramis expression clause.
     */
    escape : {
        value : function (expr) {
            this.nodes.push(" ESCAPE ");
            this.nodes.push(expr);

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds the 'BETWEEN' clause to the expression tree.
     * 
     * @param {Expr|String|Number}
     *            leftOperand - The left operand.
     * @param {Expr|String|Number}
     *            rightOperand - The right operand.
     * @returns {Expr} This Ramis expression clause.
     */
    between : {
        value : function (leftOperand, rightOperand) {
            this.nodes.push(" BETWEEN ");
            this.nodes.push(leftOperand);
            this.nodes.push(" AND ");
            this.nodes.push(rightOperand);

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds the 'EXISTS' clause to the expression tree.
     * 
     * @param {Clause}
     *            select - A select clause.
     * @returns {Expr} This Ramis expression clause.
     */
    exists : {
        value : function (select) {
            this.nodes.push(" EXISTS ");
            this.begin();
            this.nodes.push(select);
            this.end();

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds the 'CASE' clause to the expression tree.
     * 
     * @param {Expr}
     *            expr - The expression.
     * @param {Expr}
     *            whenExpr - The when expression.
     * @param {Expr}
     *            thenExpr - The then expression.
     * @param {Expr}
     *            elseExpr - The else expression.
     * @returns {Expr} This Ramis expression clause.
     */
    case : {
        value : function (expr, whenExpr, thenExpr, elseExpr) {
            this.nodes.push(" CASE ");
            this.nodes.push(expr);
            this.nodes.push(" WHEN ");
            this.nodes.push(whenExpr);
            this.nodes.push(" THEN ");
            this.nodes.push(thenExpr);
            this.nodes.push(" ELSE ");
            this.nodes.push(elseExpr);
            this.nodes.push(" END");

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds the 'raise-function' clause to the expression tree.
     * 
     * @param {RaiseFunctionsConstant}
     *            func - The raise function.
     * @param {String}
     *            errorMessage - The error message.
     * @returns {Expr} This Ramis expression clause.
     */
    raise : {
        value : function (func, errorMessage) {
            this.nodes.push(" RAISE ");
            this.begin();
            this.nodes.push(func);

            if (func !== Ramis.RAISE_FUNCTIONS.IGNORE) {
                this.nodes.push(", ");
                this.nodes.push(errorMessage);
            }

            this.end();

            return this;

        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds an expression to this expression clause.
     * 
     * @param {Expr}
     *            expr - An Ramis expression clause.
     * @returns {Expr} This Ramis expression clause.
     */
    expr : {
        value : function (expr) {
            this.nodes.push(expr);

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },
});

//TODO: Implement 'ORDER BY' for 'DELETE' statement.
//TODO: Implement 'LIMIT' and 'OFFSET' for 'DELETE' statement.

/**
 * Creates a new 'AS alias' clause.
 * 
 * @constructor
 * 
 * @param {String}
 *            alias - The alias for the previous value in the clause tree.
 */
function As(alias) {
    Clause.call(this);
    this.nodes.push(" AS ");
    this.nodes.push(alias);
}

As.prototype = Object.create(Clause.prototype);

/**
 * Creates a new source clause.
 * 
 * @constructor
 * 
 * @param {Source}
 *            [source] - A join source.
 */
function Source(source) {
    Clause.call(this);

    if (source !== undefined) {
        if (source instanceof Source) {
            this.nodes.push("(");
            this.nodes.push(source);
            this.nodes.push(")");
        } else {
            throw new TypeError("The 'source' argument is not valid");
        }
    }
}

Source.prototype = Object.create(Clause.prototype);

function SingleSource() {
    Source.call(this);
}

SingleSource.prototype = Object.create(Source.prototype);

/**
 * Creates a new source based on a table.
 * 
 * @constructor
 * 
 * @param {String}
 *            tableName - The table name.
 * @param {String}
 *            [databaseName] - The database name.
 */
function TableSource(tableName, databaseName) {
    SingleSource.call(this);

    if (databaseName !== undefined && databaseName) {
        this.nodes.push(databaseName);
        this.nodes.push(".");
    }

    this.nodes.push(tableName);
}

TableSource.prototype = Object.create(Clause.prototype, {
    /**
     * Adds the 'AS table-alias' clause.
     * 
     * @param {String}
     *            tableAlias - The table alias.
     * @returns {TableSource} This source clause for cascading or chaining
     *          additional clauses.
     */
    as : {
        value : function (tableAlias) {
            this.nodes.push(new As(tableAlias));

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds the 'INDEXED BY index-name' clause.
     * 
     * @param {String}
     *            indexName - The index name.
     * @returns {TableSource} This source clause for cascading or chaining
     *          additional clauses.
     */
    indexedBy : {
        value : function (indexName) {
            this.nodes.push(" INDEXED BY ");
            this.nodes.push(indexName);

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds the 'NOT INDEXED' clause.
     * 
     * @returns {TableSource} This source clause for cascading or chaining
     *          additional clauses.
     */
    notIndexed : {
        value : function () {
            this.nodes.push("NOT INDEXED");

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },
});

/**
 * Creates a new 'FROM source' clause.
 * 
 * @constructor
 * 
 * @param {String|Source}
 *            source - If {String}, then the source is assumed to be a table
 *            name and a {TableSource} is created automatically and added to the
 *            clause tree.
 */
function From(source) {
    Clause.call(this);
    this.nodes.push(" FROM ");

    if (typeof source === 'string') {
        this.nodes.push(new TableSource(source));
    } else if (source instanceof Source) {
        this.nodes.push(source);
    } else {
        throw new TypeError("The 'source' argument is not valid");
    }
}

From.prototype = Object.create(Clause.prototype);

/**
 * Creates a new 'join-constraint' clause.
 * 
 * This is the prototype for the {On} and {Using} clauses.
 * 
 * @constructor
 */
function JoinConstraint() {
    Clause.call(this);
}

JoinConstraint.prototype = Object.create(Clause.prototype);

/**
 * Creates a new 'ON expr' clause.
 * 
 * @constructor
 * 
 * @param {Expr}
 *            expr - A SQL expression clause.
 */
function On(expr) {
    JoinConstraint.call(this);
    this.nodes.push(" ON ");

    if (expr instanceof Expr) {
        this.nodes.push(expr);
    } else {
        throw new TypeError("The 'expr' argument is not valid");
    }
}

On.prototype = Object.create(JoinConstraint.prototype);

/**
 * Creates a new 'USING (column-name1, column-name2, ... , column-nameN)'
 * clause.
 * 
 * @constructor.
 * 
 * @param {Array}
 *            columnNames - Elements are {String} objects.
 */
function Using(columnNames) {
    JoinConstraint.call(this);
    this.nodes.push(" USING ");
    this.nodes.push("(");

    var count = columnNames.length - 1,
    i;

    for (i = 0; i < count; i += 1) {
        this.nodes.push(columnNames[i]);
        this.nodes.push(", ");
    }

    this.nodes.push(columnNames[i]);
    this.nodes.push(")");
}

Using.prototype = Object.create(JoinConstraint.prototype);

/**
 * Type checks the source.
 * 
 * @param {Object}
 *            source
 */
function addSource(source) {
    var joinSource;

    if (typeof source === "string") {
        joinSource = new TableSource(source);
    } else {
        joinSource = source;
    }

    return joinSource;
}

/**
 * Type checks the constraint.
 * 
 * @param {Object}
 *            constraint
 */
function addConstraint(constraint) {
    var joinConstraint;

    if (constraint instanceof JoinConstraint) {
        joinConstraint = constraint;
    } else {
        throw new TypeError("The 'constraint' argument is not valid");
    }

    return joinConstraint;
}

/**
 * Creates a new 'JOIN source join-constraint' clause.
 * 
 * @constructor
 * 
 * @param {String|SingleSource}
 *            source - The source of the join clause. If {String} is used, then
 *            the source is assumed to be table name and a {TableSource} is
 *            automatically created without an alias or database name prefix.
 * @param {On|Using}
 *            [constraint] - The join constraint.
 */
function Join(source, constraint) {
    Clause.call(this);
    this.nodes.push(" JOIN ");
    this.nodes.push(addSource(source));

    if (constraint !== undefined) {
        this.nodes.push(addConstraint(constraint));
    }
}

Join.prototype = Object.create(Clause.prototype, {
    /**
     * Adds the 'ON expr' clause.
     * 
     * @param {Expr}
     *            expr - A new {On} clause is created and added to this clause.
     * @returns {Join} This clause for cascading or chaining additional clauses.
     */
    on : {
        value : function (expr) {
            if (expr instanceof Expr) {
                this.nodes.push(new On(expr));
            } else {
                throw new TypeError("The 'expr' argument is not valid");
            }

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds the 'USING (colum-name1, column-name2, ... , column-nameN)' clause.
     * 
     * @param {Array}
     *            columnNames - {String} elements. A new {Using} clause is created
     *            and added to this clause.
     * @returns {Join} This clause for cascading or chaining additional clauses.
     */
    using : {
        value : function (columnNames) {
            if (columnNames instanceof Array) {
                this.nodes.push(new Using(columnNames));
            } else {
                throw new TypeError("The 'columnNames' argument is not valid");
            }

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },  
});

/**
 * Creates a new 'LEFT JOIN source join-constraint' clause.
 * 
 * @constructor
 * 
 * @param {String|SingleSource}
 *            source - The source of the join clause. If {String} is used, then
 *            the source is assumed to be table name and a {TableSource} is
 *            automatically created without an alias or database name prefix.
 * @param {On|Using}
 *            [constraint] - The join constraint.
 */
function LeftJoin(source, constraint) {
    Join.call(this, source, constrint);
    this.nodes.push(" LEFT JOIN ");
    this.nodes.push(addSource(source));

    if (constraint !== undefined) {
        this.nodes.push(addConstraint(constraint));
    }
}

LeftJoin.prototype = Object.create(Join.prototype);

/**
 * Creates a new 'LEFT OUTER JOIN source join-constraint' clause.
 * 
 * @constructor
 * 
 * @param {String|SingleSource}
 *            source - The source of the join clause. If {String} is used, then
 *            the source is assumed to be table name and a {TableSource} is
 *            automatically created without an alias or database name prefix.
 * @param {On|Using}
 *            [constraint] - The join constraint.
 */
function LeftOuterJoin(source, constraint) {
    Join.call(this, source, constraint);
    this.nodes.push(" LEFT OUTER JOIN ");
    this.nodes.push(addSource(source));

    if (constraint !== undefined) {
        this.nodes.push(addConstraint(constraint));
    }
}

LeftOuterJoin.prototype = Object.create(Join.prototype);

/**
 * Creates a new 'INNER JOIN source join-constraint' clause.
 * 
 * @constructor
 * 
 * @param {String|SingleSource}
 *            source - The source of the join clause. If {String} is used, then
 *            the source is assumed to be table name and a {TableSource} is
 *            automatically created without an alias or database name prefix.
 * @param {On|Using}
 *            [constraint] - The join constraint.
 */
function InnerJoin(source, constraint) {
    Join.call(this, source, constraint);
    this.nodes.push(" INNER JOIN ");
    this.nodes.push(addSource(source));

    if (constraint !== undefined) {
        this.nodes.push(addConstraint(constraint));
    }
}

InnerJoin.prototype = Object.create(Join.prototype);

/**
 * Creates a new 'CROSS JOIN source join-constraint' clause.
 * 
 * @constructor
 * 
 * @param {String|SingleSource}
 *            source - The source of the join clause. If {String} is used, then
 *            the source is assumed to be table name and a {TableSource} is
 *            automatically created without an alias or database name prefix.
 * @param {On|Using}
 *            [constraint] - The join constraint.
 */
function CrossJoin(source, constraint) {
    Join.call(this, source, constraint);
    this.nodes.push(" CROSS JOIN ");
    this.nodes.push(addSource(source));

    if (constraint !== undefined) {
        this.nodes.push(addConstraint(constraint));
    }
}

CrossJoin.prototype = Object.create(Join.prototype);

/**
 * Creates a new 'WHERE expr' clause.
 * 
 * @constructor
 * 
 * @param {Expr}
 *            expr
 */
function Where(expr) {
    Clause.call(this);
    this.nodes.push(" WHERE ");
    this.nodes.push(expr);
}

Where.prototype = Object.create(Clause.prototype);

/**
 * Either creates a named or indexed parameter. If the value is an object, the
 * property key is used as the named parameter; otherwise, an indexed parameter
 * is created.
 * 
 * @param {Object|String|Param} -
 *            The value.
 * @return {Array} A tree to be concatenated to the parent tree.
 */
function getValueTree(value) {
    var keys,
    key,
    tree = [];

    if (value instanceof Param) {
        tree.push(value);
    } else if (typeof value === "string") {
        tree.push(new Param(value));
    } else {
        keys = Object.keys(value);
        key = keys[0];
        tree.push(new Param(value[key], key));
    }

    return tree;
}

/**
 * Creates a new 'VALUES (value1, value2, ... , valueN)' clause.
 * 
 * @constructor
 * 
 * @param {Array}
 *            values - Elements are either {String} or {Object}. If {Object},
 *            the property key is used as a named parameter for the value. If
 *            {String}, a placeholder indexed parameter is created for the
 *            value.
 */
function Values(values) {
    Clause.call(this);
    this.nodes.push(" VALUES (");

    var count = values.length - 1,
    i;

    for (i = 0; i < count; i += 1) {
        this.nodes = this.nodes.concat(getValueTree(values[i]));
        this.nodes.push(", ");
    }

    this.nodes = this.nodes.concat(getValueTree(values[i]));
    this.nodes.push(")");
}

Values.prototype = Object.create(Clause.prototype);

/**
 * Creates a new '(column-name1, column-name2, ... , column-nameN)' clause.
 * 
 * @constructor
 * 
 * @param {Array}
 *            names - The elements are {String} objects. The column names.
 * @param {Values|Array}
 *            [values] - If {Array}, then a new {Values} clause is created and
 *            added.
 */
function Columns(names, values) {
    Clause.call(this);
    this.nodes.push("(");

    var stopCount = names.length - 1,
    i;

    for (i = 0; i < stopCount; i += 1) {
        this.nodes.push(names[i]);
        this.nodes.push(", ");
    }

    this.nodes.push(names[i]);
    this.nodes.push(")");

    if (values !== undefined) {
        if (values instanceof Values) {
            this.nodes.push(values);
        } else if (values instanceof Array) {
            this.nodes.push(new Values(values));
        } else {
            throw new TypeError("The 'values' argument is not valid");
        }
    }
}

Columns.prototype = Object.create(Clause.prototype);

/**
 * Creates a 'column-name = bind-parameter' clause.
 * 
 * @param {Object}
 *            column - The property key is the column name.
 * @return {Array} A tree.
 */
function set(column) {
    var keys,
    key,
    tree = [];

    keys = Object.keys(column);
    key = keys[0];

    tree.push(key);
    tree.push(" = ");

    tree = tree.concat(getValueTree(column[key]));

    return tree;
}

/**
 * Creates a new 'SET column-name1 = value1, column-name2 = value2, ... ,
 * column-name3 = value3' clause.
 * 
 * @constructor
 * 
 * @param {Array}
 *            columns - The elements are {Object} with the key as the column
 *            name and the value can be either a primitative or another {Object}
 *            with the key as the named parameter and the value to be
 *            substituted for each column to update.
 */
function Set(columns) {
    Clause.call(this);
    this.nodes.push("SET ");

    var count = columns.length - 1,
    i;

    for (i = 0; i < count; i += 1) {
        this.nodes = this.nodes.concat(set(columns[i]));
        this.nodes.push(", ");
    }

    this.nodes = this.nodes.concat(set(columns[i]));

}

Set.prototype = Object.create(Clause.prototype);

/**
 * Creates a new result column.
 * 
 * @constructor
 * 
 * @param {String}
 *            name - The column name.
 * @param {String}
 *            [alias] - The column name alias.
 * @returns
 */
function ResultColumn(name, alias) {
    Clause.call(this);
    this.nodes.push(name);

    if (alias) {
        this.nodes.push(new As(alias));
    }
}

ResultColumn.prototype = Object.create(Clause.prototype);

/**
 * Returns a 'AS' clause if the 'value' is an object with one property and the
 * key is used as the alias.
 * 
 * @param {String|Object}
 *            value - If {String}, then the value is added directly to the
 *            clause tree. If {Object}, then
 */
function getResultColumn(columnName) {
    var name,
    alias,
    keys,
    key;

    if (typeof columnName === "string") {
        name = columnName;
    } else {
        keys = Object.keys(columnName);
        key = keys[0];
        name = columnName[key];
        alias = key;
    }

    return new ResultColumn(name, alias);
}

/**
 * Creates a result columns list clause.
 * 
 * @constructor
 * 
 * @param {Array}
 *            [columnNames] - Elements are either {String} or {Object}. If
 *            {String}, literal is added. If {Object}, the property key is used
 *            as the alias and an 'AS alias' clause is created and added.
 */
function ResultColumns(columnNames) {
    var count,
    i;

    Clause.call(this);

    if (columnNames) {
        count = columnNames.length - 1;

        for (i = 0; i < count; i += 1) {
            this.nodes.push(getResultColumn(columnNames[i]));
            this.nodes.push(", ");
        }

        this.nodes.push(getResultColumn(columnNames[i]));
    } else {
        this.nodes.push("*");
    }
}

ResultColumns.prototype = Object.create(Clause.prototype);

/**
 * Creates a new 'INSERT INTO table-name' clause.
 * 
 * @constructor
 * 
 * @param {String}
 *            tableName - A table name.
 * @param {Columns|Array}
 *            [columns] - If {Array}, then a new {Columns} clause is created and
 *            added.
 * @param {Values|Array}
 *            [values] - If {Array}, then a new {Values} clause is created and
 *            added.
 */
function Insert(tableName, columns, values) {
    Statement.call(this);
    this.nodes.push("INSERT INTO ");
    this.nodes.push(tableName);
    this.nodes.push(" ");

    if (columns !== undefined) {
        if (columns instanceof Columns) {
            this.nodes.push(columns);
        } else if (columns instanceof Array) {
            this.nodes.push(new Columns(columns));
        } else {
            throw new TypeError("The 'columns' argument is not valid");
        }
    }

    if (values !== undefined) {
        if (values instanceof Values) {
            this.nodes.push(values);
        } else if (values instanceof Array) {
            this.nodes.push(new Values(values));
        } else {
            throw new TypeError("The 'values' argument is not valid");
        }
    }
}

Insert.prototype = Object.create(Statement.prototype, {
    /**
     * Adds the 'column-name' clause to this 'INSERT' Ramis statement.
     * 
     * @param {Array}
     *            names - The elements are {String} objects. The names of columns.
     * @param {Values|Array}
     *            [values] - If {Array}, then a new {Values} clause is created and
     *            added.
     * @returns {Insert} This clause for cascading or chaining additional clauses.
     */
    columns : {
        value : function (names, values) {
            this.nodes.push(new Columns(names, values));

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds the 'VALUES (value1, value2, ... , valueN)' clause to the 'INSERT'
     * clause tree.
     * 
     * @param {Array}
     *            values - The elements are either a {String} or an {Object}. An
     *            {Object} will have one property where the key will be used as the
     *            named parameter.
     * @returns {Insert} This Ramis 'INSERT' clause.
     */
    values : {
        value : function (values) {
            if (this.previous() instanceof Columns) {
                this.nodes.push(new Values(values));
            } else {
                throw new SyntaxError("A 'Values' clause should only come after a 'Columns' clause");
            }

            return this; 
        },
        enumerable : true,
        configurable : true,
        writable : true,
    }
});

/**
 * Creates a new 'UPDATE table-name' clause.
 * 
 * @constructor
 * 
 * @param {String}
 *            tableName - The name of a table to update.
 */
function Update(tableName) {
    Statement.call(this);
    this.nodes.push("UPDATE ");
    this.nodes.push(tableName);
    this.nodes.push(" ");
}

Update.prototype = Object.create(Statement.prototype, {
    /**
     * Adds the 'SET column-name1 = value1, column-name2 = value2, ... ,
     * column-nameN = valueN' clauses to this 'UPDATE' clause tree.
     * 
     * @param {Array}
     *            columns - The elements are objects with one property for each
     *            object where the key is the column name and the value is the value
     *            to substitute.
     * @returns {Update} The 'UPDATE' clause.
     */
    set : {
        value : function (columns) {
            this.nodes.push(new Set(columns));

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds the 'WHERE expr' clause to this 'UPDATE' clause tree.
     * 
     * @param {Expr}
     *            expr
     * @returns {Update} The 'UPDATE' clause.
     */
    where : {
        value : function (expr) {
            if (this.previous() instanceof Set) {
                this.nodes.push(new Where(expr));
            } else {
                throw new SyntaxError("The 'Where' clause should only come after a 'Set' clause");
            }

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    }
});

/**
 * Creates a new 'DELETE FROM table-name' clause.
 * 
 * @constructor
 * 
 * @param {String}
 *            tableName - A table name.
 */
function Delete(tableName) {
    Statement.call(this);
    this.nodes.push("DELETE FROM ");
    this.nodes.push(tableName);
}

Delete.prototype = Object.create(Statement.prototype, {
    /**
     * Adds the 'WHERE expr' clause.
     * 
     * @param {Expr}
     *            expr - A SQL expression.
     * @returns {Delete} This clause for cascading or chaining additional clauses.
     */
    where : {
        value : function (expr) {
            if (expr instanceof Expr) {
                this.nodes.push(new Where(expr));
            } else {
                throw new TypeError("The 'expr' argument is not valid");
            }

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },
});

/**
 * Creates a new 'SELECT' clause.
 * 
 * @constructor
 * 
 * @param {ResultColumns|Array}
 *            [resultColumns] - Either a {ResultColumns} or an {Array}. If an
 *            {Array}, then the elements are either {String} or {Object}. If the
 *            element is an {Object}, the key to the property is the alias name
 *            and the property value is the column name. The {Object} element
 *            should only have one property.
 * @param {From}
 *            [from] - A 'FROM' clause.
 * @param {Where}
 *            [where] - A 'WHERE' clause.
 */
function Select(resultColumns, from, where) {
    Statement.call(this);
    this.nodes.push("SELECT ");

    if (resultColumns !== undefined) {
        if (resultColumns instanceof Array) {
            this.nodes.push(new ResultColumns(resultColumns));
        } else if (resultColumns instanceof ResultColumns) {
            this.nodes.push(resultColumns);
        } else {
            throw new TypeError("The 'resultColumns' argument is not valid");
        }
    }

    if (from !== undefined) {
        if (from instanceof From) {
            this.nodes.push(from);
        } else {
            throw new TypeError("The 'from' argument is not valid");
        }
    }

    if (where !== undefined) {
        if (where instanceof Where) {
            this.nodes.push(where);
        } else {
            throw new TypeError("The 'where' argument is not valid");
        }
    }
}

Select.prototype = Object.create(Statement.prototype, {
    /**
     * Adds the 'FROM' clause to the 'SELECT' clause tree.
     * 
     * @param {String|Source}
     *            source - The table name. Use an object literal with the key as the
     *            alias to implement an Ramis alias.
     * @returns {Select} This clause for cascading or chaining additional clauses.
     */
    from : {
        value : function (source) {
            if (this.previous() instanceof ResultColumns) {
                this.nodes.push(new From(source));
            } else {
                throw new SyntaxError("The 'From' clause should only come after the 'ResultColumns' clause");
            }

            return this;

        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds the 'JOIN' clause to the 'SELECT' clause tree.
     * 
     * @param {String|Source}
     *            source - If {String}, then a table name is assumed and a
     *            {TableSource} is created automatically.
     * @param {On|Using}
     *            [constraint] - The join constraint.
     * @returns {Select} This clause for cascading or chaining additional clauses.
     */
    join : {
        value : function (source, constraint) {
            if (this.previous() instanceof From) {
                this.nodes.push(new Join(source, constraint));
            } else {
                throw new SyntaxError("The 'Join' clause should only come after a 'From' clause");
            }

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds the 'LEFT JOIN' clause to the 'SELECT' clause tree.
     * 
     * @param {String|Source}
     *            source - If {String}, then a table name is assumed and a
     *            {TableSource} is created automatically.
     * @param {On|Using}
     *            [constraint] - The join constraint.
     * @returns {Select} This clause for cascading or chaining additional clauses.
     */
    leftJoin : {
        value : function (source, constraint) {
            if (this.previous() instanceof From) {
                this.nodes.push(new LeftJoin(source, constraint));
            } else {
                throw new SyntaxError("The 'Left Join' clause should only come after a 'From' clause");
            }

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds the 'LEFT OUTER JOIN' clause to the 'SELECT' clause tree.
     * 
     * @param {String|Source}
     *            source - If {String}, then a table name is assumed and a
     *            {TableSource} is created automatically.
     * @param {On|Using}
     *            [constraint] - The join constraint.
     * @returns {Select} This clause for cascading or chaining additional clauses.
     */
    leftOuterJoin : {
        value : function (source, constraint) {
            if (this.previous() instanceof From) {
                this.nodes.push(new LeftOuterJoin(source, constraint));
            } else {
                throw new SyntaxError("The 'Left Outer Join' clause should only come after a 'From' clause");
            }

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds the 'INNER JOIN join-source' clause to the 'SELECT' clause tree.
     * 
     * @param {String|Source}
     *            source - If {String}, then a table name is assumed and a
     *            {TableSource} is created automatically.
     * @param {On|Using}
     *            [constraint] - The join constraint.
     * @returns {Select} This clause for cascading or chaining additional clauses.
     */
    innerJoin : {
        value : function (source, constraint) {
            if (this.previous() instanceof From) {
                this.nodes.push(new InnerJoin(source, constraint));
            } else {
                throw new SyntaxError("The 'Inner Join' clause should only come after a 'From' clause");
            }

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds the 'CROSS JOIN join-source' clause to the 'SELECT' clause tree.
     * 
     * @param {String|Source}
     *            source - If {String}, then a table name is assumed and a
     *            {TableSource} is created automatically.
     * @param {On|Using}
     *            [constraint] - The join constraint.
     * @returns {Select} This clause for cascading or chaining additional clauses.
     */
    crossJoin : {
        value : function (source, constraint) {
            if (this.previous() instanceof From) {
                this.nodes.push(new CrossJoin(source, constraint));
            } else {
                throw new SyntaxError("The 'Cross Join' clause should only come after a 'From' clause");
            }

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds the 'ON expr' clause to the 'SELECT' clause.
     * 
     * @param {Expr}
     *            expr - A SQL expression.
     * @returns {Select} This clause for cascading or chaining additional clauses.
     */
    on : {
        value : function (expr) {
            if (this.previous() instanceof Join) {
                this.nodes.push(new On(expr));
            } else {
                throw new SyntaxError("The 'On' clause should only come after a 'Join' clause");
            }

            return this;
        }
    },

    /**
     * Adds the 'USING (column-name1, column-name2, ... , column-nameN)' clause.
     * 
     * @param {Array}
     *            columnNames - {String} elements.
     * @returns {Select} This clause for cascading or chaining additional clauses.
     */
    using : {
        value : function (columnNames) {
            if (this.previous() instanceof Join) {
                this.nodes.push(new Using(columnNames));
            } else {
                throw new SyntaxError("The 'Using' clause should only come after a 'Join' clause");
            }

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },

    /**
     * Adds the 'WHERE expr' clause to the 'SELECT' clause tree.
     * 
     * @param {Expr}
     *            expr - A SQL expression.
     * @returns {Select} This clause for cascading or chaining additional clauses.
     */
    where : {
        value : function (expr) {
            if (this.previous() instanceof From || this.pervious() instanceof Join || this.previous() || JoinConstraint) {
                this.nodes.push(new Where(expr));
            } else {
                throw new SyntaxError("The 'Where' clause should follow a 'From', 'Join', or 'JoinConstraint' clause");
            }

            return this;    
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },
});

//TODO: Implement "GROUP BY" construction.
//TODO: Add 'ORDER BY' construction.
//TODO: Add 'LIMIT' construction.

/**
 * Creates a new source based on a select clause.
 * 
 * @constructor
 * 
 * @param {Select}
 *            select - A select clause.
 */
function SelectSource(select) {
    SingleSource.call(this);

    if (select instanceof Select) {
        this.nodes.push("(");
        this.nodes.push(select);
        this.nodes.push(")");
    } else {
        throw new TypeError("The 'select' is not valid");
    }
}

SelectSource.prototype = Object.create(SingleSource.prototype, {
    /**
     * Adds the 'AS table-alias' clause.
     * 
     * @param {String}
     *            tableAlias - The table alias.
     * @returns {SelectSource} This clause for cascading or chaining additional
     *          clauses.
     */
    as : {
        value : function (tableAlias) {
            this.nodes.push(new As(tableAlias));

            return this;
        },
        enumerable : true,
        configurable : true,
        writable : true,
    },
});

/**
 * @namespace
 */
var Ramis = {
    /**
     * Factory method for creating a new 'AS alias' clause.
     * 
     * @param {String}
     *            alias - An alias.
     * @returns {As} An 'AS alias' clause.
     */
    as : function (alias) {
        return new As(alias); 
    },

    /**
     * Factory method for creating a new '(column-name1, column-name2, ... ,
     * column-nameN)' clause. The columns clause comes directly after the
     * 'INSERT INTO table-name' clause.
     * 
     * @param {Array}
     *            columnNames
     * @returns {Columns}
     */    
    columns : function (columnNames) {
        return new Columns(columnNames);
    },

    /**
     * Factory method for creating a new 'CROSS JOIN single-source' clause.
     * 
     * @param {String|Source}
     *            source - The source of the join clause. If {String} is used,
     *            then the source is assumed to be table name and a
     *            {TableSource} is automatically created without an alias or
     *            database name prefix.
     * @param {On|Using}
     *            [constraint] - The join constraint.
     * @returns {CrossJoin} A new 'CROSS JOIN single-source' clause.
     */
    crossJoin : function (source, constraint) {
        return new CrossJoin(source, constraint);
    },

    /**
     * Factory method for creating a new expression.
     * 
     * @returns {Expr} A new expression.
     */
    expr : function () {
        return new Expr();
    },

    /**
     * Factory method for creating a new 'FROM join-source' clause.
     * 
     * @param {String|Source}
     *            source
     * @returns {From} A new 'FROM join-source' clause.
     */
    from : function (source) {
        return new From(source);
    },

    /**
     * Factory method for creating a new 'INNER JOIN single-source' clause.
     * 
     * @param {String|Source}
     *            source - The source of the join clause. If {String} is used,
     *            then the source is assumed to be table name and a
     *            {TableSource} is automatically created without an alias or
     *            database name prefix.
     * @param {On|Using}
     *            [constraint] - The join constraint.
     * @returns {InnerJoin} A new 'INNER JOIN single-source' clause.
     */
    innerJoin : function (source, constraint) {
        return new InnerJoin(source, constraint);
    },

    /**
     * Factory method for creating a new 'INSERT INTO' clause.
     * 
     * @param {String}
     *            tableName - The table name.
     * @param {Columns|Array}
     *            columns
     * @param {Values|Array}
     *            values
     * @returns {Insert} A new 'INSERT INTO' clause.
     */
    insert : function (tableName, columns, values) {
        return new Insert(tableName, columns, values);
    },

    /**
     * Factory method for creating a new 'JOIN single-source' clause.
     * 
     * @param {String|Source}
     *            source - The source of the join clause. If {String} is used,
     *            then the source is assumed to be table name and a
     *            {TableSource} is automatically created without an alias or
     *            database name prefix.
     * @param {On|Using}
     *            [constraint] - The join constraint.
     * @returns {Join} A new 'JOIN single-source' clause.
     */
    join : function (source, constraint) {
        return new Join(source, constraint);
    },

    /**
     * Factory method for creating a new 'LEFT JOIN single-source' clause.
     * 
     * @param {String|Source}
     *            source - The source of the join clause. If {String} is used,
     *            then the source is assumed to be table name and a
     *            {TableSource} is automatically created without an alias or
     *            database name prefix.
     * @param {On|Using}
     *            [constraint] - The join constraint.
     * @returns {LeftJoin} A new 'LEFT JOIN single-source' clause.
     */
    leftJoin : function (source, constraint) {
        return new LeftJoin(source, constraint);
    },

    /**
     * Factory method for creating a new 'LEFT OUTER JOIN single-source' clause.
     * 
     * @param {String|Source}
     *            source - The source of the join clause. If {String} is used,
     *            then the source is assumed to be table name and a
     *            {TableSource} is automatically created without an alias or
     *            database name prefix.
     * @param {On|Using}
     *            [constraint] - The join constraint.
     * @returns {LeftOuterJoin} A new 'LEFT OUTER JOIN single-source' clause.
     */
    leftOuterJoin : function (source, constraint) {
        return new LeftOuterJoin(source, constraint);
    },

    /**
     * Factory method for creating a new 'ON expr' clause.
     * 
     * @param {Expr}
     *            expr
     * @returns {On} A new 'ON expr' clause.
     */
    on : function (expr) {
        return new On(expr);
    },

    /**
     * Factory method for creating a new 'DELETE FROM table-name' clause.
     * 
     * @param {String}
     *            tableName - The table name.
     * @returns {Delete} A new 'DELETE' clause.
     */
    delete : function (tableName) {
        return new Delete(tableName);
    },

    /**
     * Factory method for creating a new 'Param'.
     * 
     * @param {String}
     *            name - The named parameter.
     * @param {Object}
     *            value - The value to substitute.
     */
    param : function (name, value) {
        return new Param(value, name);
    },

    /**
     * Factory method for creating a 'SELECT column1, column2, ... , columnN'
     * clause.
     * 
     * @param {Array}
     *            resultColumns - An array of strings and/or object literals
     *            with the keys as the alias for column names.
     * @returns {Select} A new 'SELECT column1, column2, ... , columnN' clause.
     */
    select : function (resultColumns) {
        return new Select(resultColumns);
    },

    /**
     * Factory method for creating a new 'SET column-name1 = value1,
     * column-name2 = value2, ... , column-nameN = valueN' clause.
     * 
     * @param {Array}
     *            columns
     * @returns {Set}
     */
    set : function (columns) {
        return new Set(columns);
    },

    /**
     * Factory method for creating a new 'UPDATE table-name' clause.
     * 
     * @param {String}
     *            tableName - The table name.
     * @returns {Update} A new 'UPDATE' clause.
     */
    update : function (tableName) {
        return new Update(tableName);
    },

    /**
     * Factory method for creating a new 'VALUES (value1, value 2, ... ,
     * valueN)' clause. The values clause comes directly after the columns
     * clause.
     * 
     * @param {Array}
     *            values
     * @returns {Values}
     */
    values : function (values) {
        return new Values(values);
    },

    /**
     * Factory method for creating a new 'where expr' clause.
     * 
     * @param {Expr}
     *            expr
     * @returns {Where}
     */
    where : function (expr) {
        return new Where(expr);
    },
};