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
var EXPORTED_SYMBOLS = ["Ramis"];

/**
 * @namespace
 */
var Ramis = {};

(function () {
	"use strict";
	
	/**
	 * The possible values for the 'collate' option.
	 * 
	 * @typedef {String} CollateConstant
	 * @readonly
	 * @constant
	 */
	Ramis.COLLATE = {
        BINARY: 'BINARY',
		NOCASE: 'NOCASE',
		RTRIM: 'RTRIM',	
	};
	
	/**
	 * The possible operators for an expression used in a 'WHERE' clause.
	 * 
	 * @typedef {String} OperatorsConstant.
	 * @readonly
	 * @constant
	 */
	Ramis.OPERATORS = {
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
		COLLATE: '~',
	};
	
	/**
	 * The possible literal values for an expression.
	 * 
	 * @typedef {String} LiteralConstants.
	 * @readonly
	 * @constant
	 */
	Ramis.LITERAL_VALUES = {
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
	Ramis.RAISE_FUNCTIONS = {
		IGNORE: 'IGNORE',
		ROLLBACK: 'ROLLBACK',
		ABORT: 'ABORT',
		FAIL: 'FAIL',
	}; 
	
	// TODO: List constructors alphabetically.
	
	/**
	 * Creates a new bind parameter object.
	 * 
	 * A bind parameter has a key, or placeholder, and a value. The value replaces the placeholder 
	 * when binding the parameters to a SQL statement. This prevents SQL injection attacks because
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
	}
	
	/**
	 * Creates a string representation.
	 * 
	 * @returns {String}
	 */
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
	 * Creates a new clause.
	 * 
	 * @constructor
	 */
	function Clause() {
		this.tree = [];
	}
	
	/**
	 * Gets all of the nodes of the tree for this clause, including all child clauses.
	 * 
	 * @returns {Array} All nodes in order.
	 */
	Clause.prototype.nodes = function() {
		var tree = [],
			i;
		
		for (i = 0; i < this.tree.length; i += 1) {
			if (this.tree[i] instanceof Clause) {
				tree = tree.concat(this.tree[i].nodes());
			}
			else {
				tree.push(this.tree[i]);
			}
		}
		
		return tree;
	};
	
	/**
	 * Gets the previous node in the tree.
	 * 
	 * @returns {Clause|String} The previous node.
	 */
	Clause.prototype.previous = function() {
		return this.tree[this.tree.length - 1];
	};
	
	/**
	 * Creates a string representation.
	 * 
	 * @returns {String}
	 */
	Clause.prototype.toString = function() {
		var tree = this.nodes(),
			str = '',
			i;
		
		for (i = 0; i < tree.length; i += 1) {
			str += tree[i].toString();
		}
		
		return str;
	};
	
	/**
	 * Creates a new SQL expression clause.
	 * 
	 * @constructor
	 */
	function Expr() {
		this.tree = [];
	}
	
	Expr.prototype = new Clause();
	
	/**
	 * Adds a binary operator and its right operand to the tree. The left operand
	 * is assumed to already be attached to the tree.
	 * 
	 * @param {OPERATORS} operator - The operator.
	 * @param {Expr|String|Number} rightOperant - The right operand
	 * @return {Array} A tree.  
	 */
	function binaryOperator(operator, rightOperand) {
		var tree = [];
		
		tree.push(" " + operator + " ");
		
		if (rightOperand !== undefined) {
			if (rightOperand instanceof Expr) {
				tree.push(rightOperand);
			} else {
				tree.push(new Param(rightOperand));
			}
		}
		
		return tree;
	}
	
	/**
	 * Adds a literal value to the expression tree. This does not directly add the value, but adds
	 * {Param} to the tree that is later bound to the value just before execution. This
	 * avoids problems with Ramis injection attacks and other bad things.
	 * 
	 * @param {Object} value - A literal value.
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.literal = function(value) {
		if (value === Ramis.LITERAL_VALUE.NULL) {
			this.tree.push(Ramis.LITERAL_VALUE.NULL);
		} else if (value === Ramis.LITERAL_VALUE.CURRENT_TIME) {
			this.tree.push(Ramis.LITERAL_VALUE.CURRENT_TIME);
		}
		else if (value === Ramis.LITERAL_VALUE.CURRENT_DATE) {
			this.tree.push(Ramis.LITERAL_VALUE.CURRENT_DATE);
		}
		else if (value === Ramis.LITERAL_VALUE.CURRENT_TIMESTAMP) {
			this.tree.push(Ramis.LITERAL_VALUE.CURRENT_TIMESTAMP);
		} else {
			this.tree.push(new Param(value));	
		}
		
		return this;
	};
	
	/**
	 * Adds a column name to the expression tree.
	 * 
	 * @param {String} columnName - A column name.
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.column = function(columnName) {
		this.tree.push(columnName);
		
		return this;
	};
	
	/**
	 * Begins a grouping. 
	 * 
	 * This adds a '(' onto the expression tree.
	 * 
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.begin = function() {
		this.tree.push("(");
		
		return this;
	};
	
	/**
	 * Ends a grouping.
	 * 
	 * This adds a ')' onto the expression tree.
	 * 
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.end = function() {
		this.tree.push(")");
		
		return this;
	};
	
	/**
	 * Adds the 'NOT' operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [operand] - The operand to the binary operator.
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.not = function(operand) {
		this.tree = this.tree.concat(binaryOperator(Ramis.OPERATORS.NOT, operand));
		
		return this;
	};
	
	/**
	 * Adds the '||' concatenate operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} rightOperand - The right operand to the binary operator. 
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.concat = function(rightOperand) {
		this.tree = this.tree.concat(binaryOperator(Ramis.OPERATORS.CONCAT, rightOperand));
		
		return this;
	};
	
	/**
	 * Adds the '*' multiply operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} rightOperand - The right operand to the binary operator. 
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.multiply = function(rightOperand) {
		this.tree = this.tree.concat(binaryOperator(Ramis.OPERATORS.MULTIPLY, rightOperand));
		
		return this;
	};
	
	/**
	 * Adds the '*' multiply operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} rightOperand - The right operand to the binary operator. 
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.times = function(rightOperand) {
		this.tree = this.tree.concat(binaryOperator(Ramis.OPERATORS.MULTIPLY, rightOperand));
		
		return this;
	};
	
	/**
	 * Adds the '/' divide operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} rightOperand - The right operand to the binary operator. 
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.divide = function(rightOperand) {
		this.tree = this.tree.concat(binaryOperator(Ramis.OPERATORS.DIVIDE, rightOperand));
		
		return this;
	};
	
	/**
	 * Adds the '/' divide operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} rightOperand - The right operand to the binary operator. 
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.dividedBy = function(rightOperand) {
		this.tree = this.tree.concat(binaryOperator(Ramis.OPERATORS.DIVIDE, rightOperand));
		
		return this;
	};
	
	/**
	 * Adds the '%' modulo operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} rightOperand - The right operand to the binary operator. 
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.modulo = function(rightOperand) {
		this.tree = this.tree.concat(binaryOperator(Ramis.OPERATORS.MODULO, rightOperand));
		
		return this;
	};
	
	/**
	 * Adds the '%' modulo operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} rightOperand - The right operand to the binary operator. 
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.remainder = function(rightOperand) {
		this.tree = this.tree.concat(binaryOperator(Ramis.OPERATORS.MODULO, rightOperand));
		
		return this;
	};
	
	/**
	 * Adds the '+' add operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} rightOperand - The right operand to the binary operator. 
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.add = function(rightOperand) {
		this.tree = this.tree.concat(binaryOperator(Ramis.OPERATORS.ADD, rightOperand));
		
		return this;
	};
	
	/**
	 * Adds the '-' subtract operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} rightOperand - The right operand to the binary operator. 
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.subtract = function(rightOperand) {
		this.tree = this.tree.concat(binaryOperator(Ramis.OPERATORS.SUBTRACT, rightOperand));
		
		return this;
	};
	
	/**
	 * Adds the '<' less than operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.lessThan = function(rightOperand) {
		this.tree = this.tree.concat(binaryOperator(Ramis.OPERATORS.MULTIPLY, rightOperand));
		
		return this;
	};
	
	/**
	 * Adds the '<=' less than equals operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.lessThanEquals = function(rightOperand) {
		this.tree = this.tree.concat(binaryOperator(Ramis.OPERATORS.LESS_THAN_EQUALS, rightOperand));
		
		return this;
	};
	
	/**
	 * Adds the '>' greater than operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.greaterThan = function(rightOperand) {
		this.tree = this.tree.concat(binaryOperator(Ramis.OPERATORS.GREATER_THAN, rightOperand));
		
		return this;
	};
	
	/**
	 * Adds the '>=' greater than equals operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.greaterThanEquals = function(rightOperand) {
		this.tree = this.tree.concat(binaryOperator(Ramis.OPERATORS.GREATER_THAN_EQUALS, rightOperand));
		
		return this;
	};
	
	/**
	 * Adds the '=' or '==' equals operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} rightOperand - The right operand to the binary operator. 
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.equals = function(rightOperand) {
		this.tree = this.tree.concat(binaryOperator(Ramis.OPERATORS.EQUALS, rightOperand));
		
		return this;
	};
	
	/**
	 * Adds the '!=' not equals operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.notEquals = function(rightOperand) {
		this.tree = this.tree.concat(binaryOperator(Ramis.OPERATORS.NOT_EQUALS, rightOperand));
		
		return this;
	};
	
	/**
	 * Adds the 'AND' operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.and = function(rightOperand) {
		this.tree = this.tree.concat(binaryOperator(Ramis.OPERATORS.AND, rightOperand));
		
		return this;
	};
	
	/**
	 * Adds the 'OR' operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.or = function(rightOperand) {
		this.tree = this.tree.concat(binaryOperator(Ramis.OPERATORS.OR, rightOperand));
		
		return this;
	};
	
	/**
	 * Adds the 'LIKE' operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.like = function(rightOperand) {
		this.tree = this.tree.concat(binaryOperator(Ramis.OPERATORS.LIKE, rightOperand));
		
		return this;
	};
	
	/**
	 * Adds the 'GLOB' operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.glob = function(rightOperand) {
		this.tree = this.tree.concat(binaryOperator(Ramis.OPERATORS.GLOB, rightOperand));
		
		return this;
	};
		
	/**
	 * Adds the 'REGEXP' operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.regexp = function(rightOperand) {
		this.tree = this.tree.concat(binaryOperator(Ramis.OPERATORS.REGEXP, rightOperand));
		
		return this;
	};
	
	/**
	 * Adds the 'MATCH' operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.match = function(rightOperand) {
		this.tree = this.tree.concat(binaryOperator(Ramis.OPERATORS.MATCH, rightOperand));
		
		return this;
	};
	
	/**
	 * Adds the 'IS' operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.is = function(rightOperand) {
		this.tree = this.tree.concat(binaryOperator(Ramis.OPERATORS.IS, rightOperand));
		
		return this;
	};
	
	/**
	 * Adds the 'IS NOT' operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.isNot = function(rightOperand) {
		this.tree = this.tree.concat(binaryOperator(Ramis.OPERATORS.IS_NOT, rightOperand));
		
		return this;
	};
	
	/**
	 * Adds the 'IN' operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.in = function(rightOperand) {
		this.tree = this.tree.concat(binaryOperator(Ramis.OPERATORS.IN, rightOperand));
		
		return this;
	};
	
	/**
	 * Adds the 'CAST' function to the expression tree.
	 * 
	 * @param {Expr|String|Number} expr - The object to cast.
	 * @param {TypeConstant} toType - The type to convert or cast the expr to.
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.cast = function(expr, toType) {
		this.tree.push(" CAST ");
		this.begin();
		this.tree.push(expr);
		this.tree.push(" AS ");
		this.tree.push(toType.dbType);
		this.end();
		
		return this;
	};
	
	/**
	 * Adds the 'COLLATE' function to the expression tree.
	 * 
	 * @param {Expr|String|Number} expr - The object to collate.
	 * @param {CollateConstant} collation - The collation.
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.collate = function(expr, collation) {
		this.tree.push(expr);
		this.tree.push(collation);
		
		return this;
	};
	
	/**
	 * Adds the 'ISNULL' operation to the expression tree.
	 * 
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.isNull = function() {
		this.tree.push(" ISNULL");
		
		return this;
	};
	
	/**
	 * Adds the 'NOTNULL' operation to the expression tree.
	 * 
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.notNull = function() {
		this.tree.push(" NOTNULL");
		
		return this;
	};
		
	/**
	 * Adds the 'ESCAPE' operation to the expression tree.
	 * 
	 * @param {Expr} expr - The escape expression.
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.escape = function(expr) {
		this.tree.push(" ESCAPE ");
		this.tree.push(expr);
		
		return this;
	};
	
	/**
	 * Adds the 'BETWEEN' clause to the expression tree.
	 * 
	 * @param {Expr|String|Number} leftOperand - The left operand.
	 * @param {Expr|String|Number} rightOperand - The right operand.
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.between = function(leftOperand, rightOperand) {
		this.tree.push(" BETWEEN ");
		this.tree.push(leftOperand);
		this.tree.push(" AND ");
		this.tree.push(rightOperand);
		
		return this;
	};
	
	/**
	 * Adds the 'EXISTS' clause to the expression tree.
	 * 
	 * @param {Clause} select - A select clause.
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.exists = function(select) {
		this.tree.push(" EXISTS ");
		this.begin();
		this.tree.push(select);
		this.end();
		
		return this;
	};
	
	/**
	 * Adds the 'CASE' clause to the expression tree.
	 * 
	 * @param {Expr} expr - The expression.
	 * @param {Expr} whenExpr - The when expression.
	 * @param {Expr} thenExpr - The then expression.
	 * @param {Expr} elseExpr - The else expression.
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.case = function(expr, whenExpr, thenExpr, elseExpr) {
		this.tree.push(" CASE ");
		this.tree.push(expr);
		this.tree.push(" WHEN ");
		this.tree.push(whenExpr);
		this.tree.push(" THEN ");
		this.tree.push(thenExpr);
		this.tree.push(" ELSE ");
		this.tree.push(elseExpr);
		this.tree.push(" END");
		
		return this;
	}; 
	
	/**
	 * Adds the 'raise-function' clause to the expression tree.
	 * 
	 * @param {RaiseFunctionsConstant} func - The raise function.
	 * @param {String} errorMessage - The error message.
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.raise = function(func, errorMessage) {
		this.tree.push(" RAISE ");
		this.begin();
		this.tree.push(func);
		
		if (func !== Ramis.RAISE_FUNCTIONS.IGNORE) {
			this.tree.push(", ");
			this.tree.push(errorMessage);
		}
		
		this.end();
		
		return this;
	};
	
	/**
	 * Adds an expression to this expression clause.
	 * 
	 * @param {Expr} expr - An Ramis expression clause.
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.expr = function(expr) {
		this.tree.push(expr);
		
		return this;
	};
	
	// TODO: Implement 'ORDER BY' for 'DELETE' statement.
	// TODO: Implement 'LIMIT' and 'OFFSET' for 'DELETE' statement.	
	
	/**
	 * Creates a new 'AS alias' clause.
	 * 
	 * @constructor
	 * 
	 * @param {String} alias - The alias for the previous value in the clause tree.
	 */
	function As(alias) {
		this.tree = [];
		this.tree.push(" AS ");
		this.tree.push(alias);
	}
	
	As.prototype = new Clause();
	
	/**
	 * Creates a new source clause.
	 * 
	 * @constructor
	 * 
	 * @param {Source} [source] - A join source.
	 */
	function Source(source) {
		this.tree = [];
		
		if (source !== undefined) {
			if (source instanceof Source) {
				this.tree.push("(");
				this.tree.push(source);
				this.tree.push(")");
			} else {
				throw new TypeError("The 'source' argument is not valid");
			}
		}
	}
	
	Source.prototype = new Clause();
	
	function SingleSource() {
		this.tree = [];
	}
	
	SingleSource.prototype = new Clause();
	
	/**
	 * Creates a new source based on a table.
	 * 
	 * @constructor
	 * 
	 * @param {String} tableName - The table name.
	 * @param {String} [databaseName] - The database name.
	 */
	function TableSource(tableName, databaseName) {
		this.tree = [];
		
		if (databaseName !== undefined && databaseName) {
			this.tree.push(databaseName);
			this.tree.push(".");
		}
		
		this.tree.push(tableName);
	}
	
	TableSource.prototype = new SingleSource();
	
	/**
	 * Adds the 'AS table-alias' clause.
	 * 
	 * @param {String} tableAlias - The table alias.
	 * @returns {TableSource} This source clause for cascading or chaining additional clauses.
	 */
	TableSource.prototype.as = function(tableAlias) {
		this.tree.push(new As(tableAlias));
		
		return this;
	};
	
	/**
	 * Adds the 'INDEXED BY index-name' clause.
	 * 
	 * @param {String} indexName - The index name.
	 * @returns {TableSource} This source clause for cascading or chaining additional clauses.
	 */
	TableSource.prototype.indexedBy = function(indexName) {
		this.tree.push(" INDEXED BY ");
		this.tree.push(indexName);
		
		return this;
	};
	
	/**
	 * Adds the 'NOT INDEXED' clause.
	 * 
	 * @returns {TableSource} This source clause for cascading or chaining additional clauses.
	 */
	TableSource.prototype.notIndexed = function() {
		this.tree.push("NOT INDEXED");
		
		return this;
	};
	
	/**
	 * Creates a new 'FROM source' clause.
	 * 
	 * @constructor
	 * 
	 * @param {String|Source} source - If {String}, then the source is assumed to be a table name and a {TableSource} is created automatically and added to the clause tree.
	 */
	function From(source) {
		this.tree = [];
		this.tree.push(" FROM ");
		
		if (typeof source === 'string') {
			this.tree.push(new TableSource(source));
		} else if (source instanceof Source) {
			this.tree.push(source);
		} else {
			throw new TypeError("The 'source' argument is not valid");
		}
	}
	
	From.prototype = new Clause();
	
	/**
	 * Creates a new 'join-constraint' clause.
	 * 
	 * This is the prototype for the {On} and {Using} clauses.
	 * 
	 * @constructor
	 */
	function JoinConstraint() {
		this.tree = [];
	}
	
	JoinConstraint.prototype = new Clause();
	
	/**
	 * Creates a new 'ON expr' clause.
	 * 
	 * @constructor
	 * 
	 * @param {Expr} expr - A SQL expression clause.
	 */
	function On(expr) {
		this.tree = [];
		this.tree.push(" ON ");
		
		if (expr instanceof Expr) {
			this.tree.push(expr);
		} else {
			throw new TypeError("The 'expr' argument is not valid");
		}
	}
	
	On.prototype = new JoinConstraint();
	
	/**
	 * Creates a new 'USING (column-name1, column-name2, ... , column-nameN)' clause.
	 * 
	 * @constructor.
	 * 
	 * @param {Array} columnNames - Elements are {String} objects.
	 */
	function Using(columnNames) {
		this.tree = [];
		this.tree.push(" USING ");
		this.tree.push("(");
		
		var count = columnNames.length - 1,
			i;
		
		for (i = 0; i < count; i += 1) {
			this.tree.push(columnNames[i]);
			this.tree.push(", ");
		}
		
		this.tree.push(columnNames[i]);
		this.tree.push(")");
	}
	
	Using.prototype = new JoinConstraint();
	
	/**
	 * Type checks the source.
	 * 
	 * @param {Object} source
	 */
	function addSource(source) {
		var joinSource;
		
		if (typeof source === "string") {
			joinSource = new TableSource(source);
		} else if (source instanceof SingleSource) {
			joinSource = source;
		} else {
//			throw new TypeError("The 'source' argument type of: '" + (typeof source) + "' is not recongized");
		}
		
		return joinSource;
	}
	
	/**
	 * Type checks the constraint.
	 * 
	 * @param {Object} constraint
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
	 * @param {String|SingleSource} source - The source of the join clause. If {String} is used, then the source is assumed to be table name and a {TableSource} is automatically created without an alias or database name prefix.
	 * @param {On|Using} [constraint] - The join constraint.
	 */
	function Join(source, constraint) {
		this.tree = [];
		this.tree.push(" JOIN ");
		this.tree.push(addSource(source));
				
		if (constraint !== undefined) {
			this.tree.push(addConstraint(constraint));
		}
	}
	
	Join.prototype = new Clause();
	
	/**
	 * Adds the 'ON expr' clause.
	 * 
	 * @param {Expr} expr - A new {On} clause is created and added to this clause.
	 * @returns {Join} This clause for cascading or chaining additional clauses.
	 */
	Join.prototype.on = function(expr) {
		if (expr instanceof Expr) {
			this.tree.push(new On(expr));
		} else {
			throw new TypeError("The 'expr' argument is not valid");
		}
		
		return this;
	};
	
	/**
	 * Adds the 'USING (colum-name1, column-name2, ... , column-nameN)' clause.
	 * 
	 * @param {Array} columnNames - {String} elements. A new {Using} clause is created and added to this clause.
	 * @returns {Join} This clause for cascading or chaining additional clauses.
	 */
	Join.prototype.using = function(columnNames) {
		if (columnNames instanceof Array) {
			this.tree.push(new Using(columnNames));
		} else {
			throw new TypeError("The 'columnNames' argument is not valid");
		}
		
		return this;
	};
	
	/**
	 * Creates a new 'LEFT JOIN source join-constraint' clause.
	 * 
	 * @constructor
	 * 
	 * @param {String|SingleSource} source - The source of the join clause. If {String} is used, then the source is assumed to be table name and a {TableSource} is automatically created without an alias or database name prefix.
	 * @param {On|Using} [constraint] - The join constraint.
	 */
	function LeftJoin(source, constraint) {
		this.tree = [];
		this.tree.push(" LEFT JOIN ");
		this.tree.push(addSource(source));
		
		if (constraint !== undefined) {
			this.tree.push(addConstraint(constraint));
		}
	}
	
	LeftJoin.prototype = new Join();
	
	/**
	 * Creates a new 'LEFT OUTER JOIN source join-constraint' clause.
	 * 
	 * @constructor
	 * 
	 * @param {String|SingleSource} source - The source of the join clause. If {String} is used, then the source is assumed to be table name and a {TableSource} is automatically created without an alias or database name prefix.
	 * @param {On|Using} [constraint] - The join constraint.
	 */
	function LeftOuterJoin(source, constraint) {
		this.tree = [];
		this.tree.push(" LEFT OUTER JOIN ");
		this.tree.push(addSource(source));
		
		if (constraint !== undefined) {
			this.tree.push(addConstraint(constraint));
		}
	}
	
	LeftOuterJoin.prototype = new Clause();
	
	/**
	 * Creates a new 'INNER JOIN source join-constraint' clause.
	 * 
	 * @constructor
	 * 
	 * @param {String|SingleSource} source - The source of the join clause. If {String} is used, then the source is assumed to be table name and a {TableSource} is automatically created without an alias or database name prefix.
	 * @param {On|Using} [constraint] - The join constraint.
	 */
	function InnerJoin(source, constraint) {
		this.tree = [];
		this.tree.push(" INNER JOIN ");
		this.tree.push(addSource(source));
		
		if (constraint !== undefined) {
			this.tree.push(addConstraint(constraint));
		}
	}
	
	InnerJoin.prototype = new Clause();
	
	/**
	 * Creates a new 'CROSS JOIN source join-constraint' clause.
	 * 
	 * @constructor
	 * 
	 * @param {String|SingleSource} source - The source of the join clause. If {String} is used, then the source is assumed to be table name and a {TableSource} is automatically created without an alias or database name prefix.
	 * @param {On|Using} [constraint] - The join constraint.
	 */
	function CrossJoin(source, constraint) {
		this.tree = [];
		this.tree.push(" CROSS JOIN ");
		this.tree.push(addSource(source));
		
		if (constraint !== undefined) {
			this.tree.push(addConstraint(constraint));
		}
	}
	
	CrossJoin.prototype = new Clause();
	
	/**
	 * Creates a new 'WHERE expr' clause.
	 * 
	 * @constructor
	 * 
	 * @param {Expr} expr
	 */
	function Where(expr) {
		this.tree = [];
		this.tree.push(" WHERE ");
		this.tree.push(expr);
	}
	
	Where.prototype = new Clause();
	
	/**
	 * Either creates a named or indexed parameter. If the value is an object, the property key is used as the named parameter; otherwise,
	 * an indexed parameter is created.
	 * 
	 * @param {Object|String|Param} - The value.
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
		} else if (value instanceof Object) {
			keys = Object.keys(value);
			key = keys[0];
			
			tree.push(new Param(value[key], key));	
		} else {
			throw new TypeError("The 'value' argument is not valid");
		}
		
		return tree;
	}
	
	/**
	 * Creates a new 'VALUES (value1, value2, ... , valueN)' clause.
	 * 
	 * @constructor
	 * 
	 * @param {Array} values - Elements are either {String} or {Object}. If {Object}, the property key is used as a named parameter for the value. If {String}, a placeholder indexed parameter is created for the value.
	 */
	function Values(values) {
		this.tree = [];
		this.tree.push(" VALUES (");
		
		var count = values.length - 1,
			i;
		
		for (i = 0; i < count; i += 1) {
			this.tree = this.tree.concat(getValueTree(values[i]));
			this.tree.push(", ");
		}
		
		this.tree = this.tree.concat(getValueTree(values[i]));
		this.tree.push(")");
	}
	
	Values.prototype = new Clause();
	
	/**
	 * Creates a new '(column-name1, column-name2, ... , column-nameN)' clause.
	 * 
	 * @constructor
	 * 
	 * @param {Array} names - The elements are {String} objects. The column names.
	 * @param {Values|Array} [values] - If {Array}, then a new {Values} clause is created and added.
	 */
	function Columns(names, values) {
		this.tree = [];
		this.tree.push("(");
		
		var stopCount = names.length - 1,
			i;
		
		for (i = 0; i < stopCount; i += 1) {
			this.tree.push(names[i]);
			this.tree.push(", ");
		}
		
		this.tree.push(names[i]);
		this.tree.push(")");
		
		if (values !== undefined) {
			if (values instanceof Values) {
				this.tree.push(values);
			} else if (values instanceof Array) {
				this.tree.push(new Values(values));
			} else {
				throw new TypeError("The 'values' argument is not valid");
			}
		}
	}
	
	Columns.prototype = new Clause();
	
	/**
	 * Creates a 'column-name = bind-parameter' clause.
	 * 
	 * @param {Object} column - The property key is the column name.
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
	 * Creates a new 'SET column-name1 = value1, column-name2 = value2, ... , column-name3 = value3' clause.
	 * 
	 * @constructor
	 * 
	 * @param {Array} columns
	 */
	function Set(columns) {
		this.tree = [];
		this.tree.push("SET ");
		
		var count = columns.length - 1,
			i;
		
		for (i = 0; i < count; i += 1) {
			this.tree = this.tree.concat(set(columns[i]));
			this.tree.push(", ");
		}
		
		this.tree = this.tree.concat(set(columns[i]));

	}
	
	Set.prototype = new Clause();
	
	function ResultColumn(name, alias) {
		this.tree = [];
		this.tree.push(name);
		
		if (alias) {
			this.tree.push(new As(alias));
		}
	}
	
	ResultColumn.prototype = new Clause();
	
	/**
	 * Returns a 'AS' clause if the 'value' is an object with one property and the key is used as the alias.
	 * 
	 * @param {String|Object} value - If {String}, then the value is added directly to the clause tree. If {Object}, then 
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
	 * @param {Array} [columnNames] - Elements are either {String} or {Object}. If {String}, 'AS alias' clause is created and added. If {Object}, the property key is used as the alias and an 'AS alias' clause is created and added.
	 */
	function ResultColumns(columnNames) {
		this.tree = [];
		
		var count,
			i;
	
		if (columnNames) {
			count = columnNames.length - 1;
			
			for (i = 0; i < count; i += 1) {
				this.tree.push(getResultColumn(columnNames[i]));
				this.tree.push(", ");
			}
			
			this.tree.push(getResultColumn(columnNames[i]));
		} else {
			this.tree.push("*");	
		}
	}
	
	ResultColumns.prototype = new Clause();
	
	/**
	 * Creates a new 'INSERT INTO table-name' clause.
	 * 
	 * @constructor
	 * 
	 * @param {String} tableName - A table name.
	 * @param {Columns|Array} [columns] - If {Array}, then a new {Columns} clause is created and added.
	 * @param {Values|Array} [values] - If {Array}, then a new {Values} clause is created and added.
	 */
	function Insert(tableName, columns, values) {
		this.tree = [];
		this.tree.push("INSERT INTO ");
		this.tree.push(tableName);
		this.tree.push(" ");
		
		if (columns !== undefined) {
			if (columns instanceof Columns) {
				this.tree.push(columns);
			} else if (columns instanceof Array) {
				this.tree.push(new Columns(columns));
			} else {
				throw new TypeError("The 'columns' argument is not valid");
			}
		}
		
		if (values !== undefined) {
			if (values instanceof Values) {
				this.tree.push(values);
			} else if (values instanceof Array) {
				this.tree.push(new Values(values));
			} else {
				throw new TypeError("The 'values' argument is not valid");
			}
		}
	}
	
	Insert.prototype = new Clause();
	
	/**
	 * Adds the 'column-name' clause to this 'INSERT' Ramis statement.
	 * 
	 * @param {Array} names - The elements are {String} objects. The names of columns.
	 * @param {Values|Array} [values] - If {Array}, then a new {Values} clause is created and added.
	 * @returns {Insert} This clause for cascading or chaining additional clauses.
	 */
	Insert.prototype.columns = function(names, values) {
		this.tree.push(new Columns(names, values));
		
		return this;
	};
	
	/**
	 * Adds the 'VALUES (value1, value2, ... , valueN)' clause to the 'INSERT' clause tree.
	 * 
	 * @param {Array} values - The elements are either a {String} or an {Object}. An {Object} will have one property where the key will be used as the named parameter.
	 * @returns {Insert} This Ramis 'INSERT' clause.
	 */
	Insert.prototype.values = function(values) {
		if (this.previous() instanceof Columns) {
			this.tree.push(new Values(values));
		} else {
			throw new SyntaxError("A 'Values' clause should only come after a 'Columns' clause");
		}
		
		return this;
	};
	
	/**
	 * Creates a new 'UPDATE table-name' clause.
	 * 
	 * @constructor
	 * 
	 * @param {String} tableName - The name of a table to update.
	 */
	function Update(tableName) {
		this.tree = [];
		this.tree.push("UPDATE ");
		this.tree.push(tableName);
		this.tree.push(" ");
	}
	
	Update.prototype = new Clause();
	
	/**
	 * Adds the 'SET column-name1 = value1, column-name2 = value2, ... , column-nameN = valueN' clauses to this 'UPDATE' clause tree.
	 * 
	 * @param {Array} columns - An object literal with the keys as the column names and the values as the values to update. 
	 * @returns {Update} The 'UPDATE' clause.
	 */
	Update.prototype.set = function(columns) {
		this.tree.push(new Set(columns));
		
		return this;
	};
	
	/**
	 * Adds the 'WHERE expr' clause to this 'UPDATE' clause tree.
	 * 
	 * @param {Expr} expr
	 * @returns {Update} The 'UPDATE' clause.
	 */
	Update.prototype.where = function(expr) {
		if (this.previous() instanceof Set) {
			this.tree.push(new Where(expr));
		} else {
			throw new SyntaxError("The 'Where' clause should only come after a 'Set' clause");
		}
		
		return this;
	};
	
	/**
	 * Creates a new 'DELETE FROM table-name' clause.
	 * 
	 * @constructor
	 * 
	 * @param {String} tableName - A table name.
	 */
	function Delete(tableName) {
		this.tree = [];
		this.tree.push("DELETE FROM ");
		this.tree.push(tableName);
	}
	
	Delete.prototype = new Clause();
	
	/**
	 * Adds the 'WHERE expr' clause.
	 * 
	 * @param {Expr} expr - A SQL expression.
	 * @returns {Delete} This clause for cascading or chaining additional clauses.
	 */
	Delete.prototype.where = function(expr) {
		if (expr instanceof Expr) {
			this.tree.push(new Where(expr));	
		} else {
			throw new TypeError("The 'expr' argument is not valid");
		}
				
		return this;
	};
	
	/**
	 * Creates a new 'SELECT' clause.
	 * 
	 * @constructor
	 * 
	 * @param {ResultColumns|Array} [resultColumns] - An array of strings and/or object literals with the keys as the alias for column names.
	 * @param {From} [from] - A 'FROM' clause.
	 * @param {Where} [where] - A 'WHERE' clause.
	 */
	function Select(resultColumns, from, where) {
		this.tree = [];
		this.tree.push("SELECT ");
		
		if (resultColumns !== undefined) {
			if (resultColumns instanceof Array) {
				this.tree.push(new ResultColumns(resultColumns));
			} else if (resultColumns instanceof ResultColumns) {
				this.tree.push(resultColumns);
			} else {
				throw new TypeError("The 'resultColumns' argument is not valid");
			}
		}
		
		if (from !== undefined) {
			if (from instanceof From) {
				this.tree.push(from);	
			} else {
				throw new TypeError("The 'from' argument is not valid");
			}
		}
		
		if (where !== undefined) {
			if (where instanceof Where) {
				this.tree.push(where);
			} else {
				throw new TypeError("The 'where' argument is not valid");
			}
		}
	}
	
	Select.prototype = new Clause();
	
	/**
	 * Adds the 'FROM' clause to the 'SELECT' clause tree.
	 * 
	 * @param {String|Source} source - The table name. Use an object literal with the key as the alias to implement an Ramis alias.
	 * @returns {Select} This clause for cascading or chaining additional clauses.
	 */
	Select.prototype.from = function(source) {
		if (this.previous() instanceof ResultColumns) {
			this.tree.push(new From(source));	
		} else {
			throw new SyntaxError("The 'From' clause should only come after the 'ResultColumns' clause");
		}
		
		return this;
	};
	
	/**
	 * Adds the 'JOIN' clause to the 'SELECT' clause tree.
	 * 
	 * @param {String|Source} source - If {String}, then a table name is assumed and a {TableSource} is created automatically.
	 * @param {On|Using} [constraint] - The join constraint.
	 * @returns {Select} This clause for cascading or chaining additional clauses.
	 */
	Select.prototype.join = function(source, constraint) {
		if (this.previous() instanceof From) {
			this.tree.push(new Join(source, constraint));
		} else {
			throw new SyntaxError("The 'Join' clause should only come after a 'From' clause");
		}
		
		return this;
	};
	
	/**
	 * Adds the 'LEFT JOIN' clause to the 'SELECT' clause tree.
	 * 
	 * @param {String|Source} source - If {String}, then a table name is assumed and a {TableSource} is created automatically.
	 * @param {On|Using} [constraint] - The join constraint.
	 * @returns {Select} This clause for cascading or chaining additional clauses.
	 */
	Select.prototype.leftJoin = function(source, constraint) {
		if (this.previous() instanceof From) {
			this.tree.push(new LeftJoin(source, constraint));
		} else {
			throw new SyntaxError("The 'Left Join' clause should only come after a 'From' clause");
		}
		
		return this;
	};
	
	/**
	 * Adds the 'LEFT OUTER JOIN' clause to the 'SELECT' clause tree.
	 * 
	 * @param {String|Source} source - If {String}, then a table name is assumed and a {TableSource} is created automatically.
	 * @param {On|Using} [constraint] - The join constraint.
	 * @returns {Select} This clause for cascading or chaining additional clauses.
	 */
	Select.prototype.leftOuterJoin = function(source, constraint) {
		if (this.previous() instanceof From) {
			this.tree.push(new LeftOuterJoin(source, constraint));
		} else {
			throw new SyntaxError("The 'Left Outer Join' clause should only come after a 'From' clause");
		}
		
		return this;
	};
	
	/**
	 * Adds the 'INNER JOIN join-source' clause to the 'SELECT' clause tree.
	 * 
	 * @param {String|Source} source - If {String}, then a table name is assumed and a {TableSource} is created automatically.
	 * @param {On|Using} [constraint] - The join constraint.
	 * @returns {Select} This clause for cascading or chaining additional clauses.
	 */
	Select.prototype.innerJoin = function(source, constraint) {
		if (this.previous() instanceof From) {
			this.tree.push(new InnerJoin(source, constraint));
		} else {
			throw new SyntaxError("The 'Inner Join' clause should only come after a 'From' clause");
		}
		
		return this;
	};
	
	/**
	 * Adds the 'CROSS JOIN join-source' clause to the 'SELECT' clause tree.
	 * 
	 * @param {String|Source} source - If {String}, then a table name is assumed and a {TableSource} is created automatically.
	 * @param {On|Using} [constraint] - The join constraint.
	 * @returns {Select} This clause for cascading or chaining additional clauses.
	 */
	Select.prototype.crossJoin = function(source, constraint) {
		if (this.previous() instanceof From) {
			this.tree.push(new CrossJoin(source, constraint));
		} else {
			throw new SyntaxError("The 'Cross Join' clause should only come after a 'From' clause");
		}
		
		return this;
	};
	
	/**
	 * Adds the 'ON expr' clause to the 'SELECT' clause.
	 * 
	 * @param {Expr} expr - A SQL expression.
	 * @returns {Select} This clause for cascading or chaining additional clauses.
	 */
	Select.prototype.on = function(expr) {
		if (this.previous() instanceof Join) {
			this.tree.push(new On(expr));
		} else {
			throw new SyntaxError("The 'On' clause should only come after a 'Join' clause");
		}
		
		return this;
	};
	
	/**
	 * Adds the 'USING (column-name1, column-name2, ... , column-nameN)' clause.
	 * 
	 * @param {Array} columnNames - {String} elements.
	 * @returns {Select} This clause for cascading or chaining additional clauses.
	 */
	Select.prototype.using = function(columnNames) {
		if (this.previous() instanceof Join) {
			this.tree.push(new Using(columnNames));
		} else {
			throw new SyntaxError("The 'Using' clause should only come after a 'Join' clause");
		}
		
		return this;
	};
	
	/**
	 * Adds the 'WHERE expr' clause to the 'SELECT' clause tree.
	 * 
	 * @param {Expr} expr - A SQL expression.
	 * @returns {Select} This clause for cascading or chaining additional clauses.
	 */
	Select.prototype.where = function(expr) {
		if (this.previous() instanceof From || this.pervious() instanceof Join || this.previous() || JoinConstraint) {
			this.tree.push(new Where(expr));
		} else {
			throw new SyntaxError("The 'Where' clause should follow a 'From', 'Join', or 'JoinConstraint' clause");
		}
		
		return this;
	};
	
	// TODO: Implement "GROUP BY" construction.
	// TODO: Add 'ORDER BY' construction.
	// TODO: Add 'LIMIT' construction.
	
	/**
	 * Creates a new source based on a select clause.
	 * 
	 * @constructor
	 * 
	 * @param {Select} select - A select clause.
	 */
	function SelectSource(select) {
		this.tree = [];
		
		if (select instanceof Select) {
			this.tree.push("(");
			this.tree.push(select);
			this.tree.push(")");
		} else {
			throw new TypeError("The 'select' is not valid");
		}
	}
	
	SelectSource.prototype = new SingleSource();
	
	/**
	 * Adds the 'AS table-alias' clause.
	 * 
	 * @param {String} tableAlias - The table alias.
	 * @returns {SelectSource} This clause for cascading or chaining additional clauses.
	 */
	SelectSource.prototype.as = function(tableAlias) {
		this.tree.push(new As(tableAlias));
		
		return this;
	};
	
	/**
	 * Factory method for creating a new 'AS alias' clause.
	 * 
	 * @param {String} alias - An alias.
	 * @returns {As} An 'AS alias' clause.
	 */
	Ramis.as = function(alias) {
		return new As(alias);
	};
	
	/**
	 * Factory method for creating a new '(column-name1, column-name2, ... , column-nameN)' clause. The columns clause comes directly after the 'INSERT INTO table-name' clause.
	 * 
	 * @param {Array} columnNames
	 * @returns {Columns}
	 */
	Ramis.columns = function(columnNames) {
		return new Columns(columnNames);
	};
	
	/**
	 * Factory method for creating a new 'CROSS JOIN single-source' clause.
	 * 
	 * @param {String|Source} source - The source of the join clause. If {String} is used, then the source is assumed to be table name and a {TableSource} is automatically created without an alias or database name prefix.
	 * @param {On|Using} [constraint] - The join constraint.
	 * @returns {CrossJoin} A new 'CROSS JOIN single-source' clause.
	 */
	Ramis.crossJoin = function(source, constraint) {
		return new CrossJoin(source, constraint);
	};
	
	/**
	 * Factory method for creating a new expression.
	 * 
	 * @returns {Expr} A new expression.
	 */
	Ramis.expr = function() {
		return new Expr();
	};
	
	/**
	 * Factory method for creating a new 'FROM join-source' clause.
	 * 
	 * @param {String|Source} source
	 * @returns {From} A new 'FROM join-source' clause.
	 */
	Ramis.from = function(source) {
		return new From(source);
	};
	
	/**
	 * Factory method for creating a new 'INNER JOIN single-source' clause.
	 * 
	 * @param {String|Source} source - The source of the join clause. If {String} is used, then the source is assumed to be table name and a {TableSource} is automatically created without an alias or database name prefix.
	 * @param {On|Using} [constraint] - The join constraint.
	 * @returns {InnerJoin} A new 'INNER JOIN single-source' clause.
	 */
	Ramis.innerJoin = function(source, constraint) {
		return new InnerJoin(source, constraint);
	};
	
	/**
	 * Factory method for creating a new 'INSERT INTO' clause.
	 * 
	 * @param {String} tableName - The table name.
	 * @param {Columns|Array} columns
	 * @param {Values|Array} values 
	 * @returns {Insert} A new 'INSERT INTO' clause.
	 */
	Ramis.insert = function(tableName, columns, values) {
		return new Insert(tableName, columns, values);
	};
	
	/**
	 * Factory method for creating a new 'JOIN single-source' clause.
	 * 
	 * @param {String|Source} source - The source of the join clause. If {String} is used, then the source is assumed to be table name and a {TableSource} is automatically created without an alias or database name prefix.
	 * @param {On|Using} [constraint] - The join constraint.
	 * @returns {Join} A new 'JOIN single-source' clause.
	 */
	Ramis.join = function(source, constraint) {
		return new Join(source, constraint);
	};
	
	/**
	 * Factory method for creating a new 'LEFT JOIN single-source' clause.
	 * 
	 * @param {String|Source} source - The source of the join clause. If {String} is used, then the source is assumed to be table name and a {TableSource} is automatically created without an alias or database name prefix.
	 * @param {On|Using} [constraint] - The join constraint.
	 * @returns {LeftJoin} A new 'LEFT JOIN single-source' clause.
	 */
	Ramis.leftJoin = function(source, constraint) {
		return new LeftJoin(source, constraint);
	};
	
	/**
	 * Factory method for creating a new 'LEFT OUTER JOIN single-source' clause.
	 * 
	 * @param {String|Source} source - The source of the join clause. If {String} is used, then the source is assumed to be table name and a {TableSource} is automatically created without an alias or database name prefix.
	 * @param {On|Using} [constraint] - The join constraint.
	 * @returns {LeftOuterJoin} A new 'LEFT OUTER JOIN single-source' clause.
	 */
	Ramis.leftOuterJoin = function(source, constraint) {
		return new LeftOuterJoin(source, constraint);
	};
	
	/**
	 * Factory method for creating a new 'ON expr' clause.
	 * 
	 * @param {Expr} expr
	 * @returns {On} A new 'ON expr' clause.
	 */
	Ramis.on = function(expr) {
		return new On(expr);
	};
	
	/**
	 * Factory method for creating a new 'DELETE FROM table-name' clause.
	 * 
	 * @param {String} tableName - The table name.
	 * @returns {Delete} A new 'DELETE' clause.
	 */
	Ramis.remove = function(tableName) {
		return new Delete(tableName);
	};
	
	/**
	 * Factory method for creating a 'SELECT column1, column2, ... , columnN' clause.
	 * 
	 * @param {Array} resultColumns - An array of strings and/or object literals with the keys as the alias for column names.
	 * @returns {Select} A new 'SELECT column1, column2, ... , columnN' clause.
	 */
	Ramis.select = function(resultColumns) {
		return new Select(resultColumns);
	};
	
	/**
	 * Factory method for creating a new 'SET column-name1 = value1, column-name2 = value2, ... , column-nameN = valueN' clause.
	 * 
	 * @param {Array} columns
	 * @returns {Set}
	 */
	Ramis.set = function(columns) {
		return new Set(columns);
	};
	
	/**
	 * Factory method for creating a new 'UPDATE table-name' clause.
	 * 
	 * @param {String} tableName - The table name.
	 * @returns {Update} A new 'UPDATE' clause.
	 */
	Ramis.update = function(tableName) {
		return new Update(tableName);
	};
	
	/**
	 * Factory method for creating a new 'VALUES (value1, value 2, ... , valueN)' clause. The values clause comes directly after the columns clause.
	 * 
	 * @param {Array} values
	 * @returns {Values}
	 */
	Ramis.values = function(values) {
		return new Values(values);
	};
	
	/**
	 * Factory method for creating a new 'where expr' clause.
	 * 
	 * @param {Expr} expr
	 * @returns {Where}
	 */
	Ramis.where = function(expr) {
		return new Where(expr);
	};
}());